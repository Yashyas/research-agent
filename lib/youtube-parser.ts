import { Supadata, type Transcript } from "@supadata/js";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const supadata = new Supadata({
  apiKey: process.env.SUPADATA_API_KEY!,
});

export interface YoutubeChunkMetadata {
  source: string;       // original YouTube URL
  videoId: string;
  documentId: string;
  title: string;
  timestamp: string;    // "MM:SS" 
  timestampUrl: string; // deep-link to exact second in the video
}

export function extractVideoId(url: string): string {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /\/embed\/([^?&#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  throw new Error(`Cannot extract video ID from URL: ${url}`);
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function parseAndChunkYoutube(
  url: string,
  documentId: string,
): Promise<Document<YoutubeChunkMetadata>[]> {
  const videoId = extractVideoId(url);

  let videoTitle = `YouTube Video (${videoId})`;
  try {
    const meta = await supadata.youtube.video({ id: videoId });
    if (meta.title) videoTitle = meta.title;
  } catch {
    console.warn(`Could not fetch metadata for ${videoId}. Using default title.`);
  }

  let transcriptData: Transcript;

  const result = await supadata.transcript({ url, lang: "en", mode: "auto" });

  if ("jobId" in result) {
    // Long video: Supadata returns a job ID, poll until done (max 60s)
    const jobId = result.jobId;
    console.log(`Supadata async job started: ${jobId}`);

    const MAX_POLLS = 20;
    const POLL_MS = 3000;
    let resolved = false;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_MS));

      // Returns: JobResult<Transcript> = { status, result?: Transcript, error? }
      const job = await supadata.transcript.getJobStatus(jobId);

      if (job.status === "completed" && job.result) {
        transcriptData = job.result;
        resolved = true;
        break;
      }
      if (job.status === "failed") {
        throw new Error(
          `Supadata transcript job failed for "${videoId}": ${job.error?.message ?? "unknown error"}`,
        );
      }
      console.log(`  poll ${i + 1}/${MAX_POLLS}: ${job.status}`);
    }

    if (!resolved) {
      throw new Error(
        `Supadata transcript job timed out after ${(MAX_POLLS * POLL_MS) / 1000}s for "${videoId}".`,
      );
    }
  } else {
    transcriptData = result;
  }

  const segments = transcriptData!.content;

  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error(`Transcript is empty for video "${videoId}".`);
  }

  // Group segments into ~90-second windows 
  const WINDOW_MS = 90_000;

  interface WindowChunk {
    text: string;
    startMs: number;
  }

  const windows: WindowChunk[] = [];
  let current: WindowChunk = { text: "", startMs: segments[0].offset };

  for (const seg of segments) {
    if (seg.offset - current.startMs > WINDOW_MS) {
      if (current.text.trim()) windows.push(current);
      current = { text: seg.text + " ", startMs: seg.offset };
    } else {
      current.text += seg.text + " ";
    }
  }
  if (current.text.trim()) windows.push(current);

  // Split each window 
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 250,
  });

  const allChunks: Document<YoutubeChunkMetadata>[] = [];

  for (const window of windows) {
    const pageChunks = await splitter.splitDocuments([
      new Document({ pageContent: window.text }),
    ]);

    for (const chunk of pageChunks) {
      const content = chunk.pageContent.trim();
      if (content.length < 40) continue;

      const timestamp = formatTimestamp(window.startMs);
      const timestampUrl = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(window.startMs / 1000)}s`;

      const semanticContent =
        `Video: ${videoTitle}\nTimestamp: ${timestamp}\n\n` + content;

      allChunks.push(
        new Document<YoutubeChunkMetadata>({
          pageContent: semanticContent,
          metadata: {
            source: url,
            videoId,
            documentId,
            title: videoTitle,
            timestamp,
            timestampUrl,
          },
        }),
      );
    }
  }

  if (!allChunks.length) {
    throw new Error(`No usable chunks from transcript for "${videoId}".`);
  }

  console.log(
    `YouTube parser: "${videoTitle}" -> ${allChunks.length} chunks (${windows.length} windows)`,
  );

  return allChunks;
}