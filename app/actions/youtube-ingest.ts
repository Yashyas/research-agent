"use server";

import { generateEmbeddings } from "@/lib/embeddings"; 
import { parseAndChunkYoutube, extractVideoId } from "@/lib/youtube-parser";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const uuidv7 = (): string =>
  "018f"
    .replace(/[018]/g, (c) =>
      (
        Number(c) ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
      ).toString(16),
    )
    .concat(crypto.randomUUID().substring(4));


export async function ingestYoutubeVideo(url: string): Promise<{
  success: boolean;
  documentId: string;
  title: string;
  chunkCount: number;
}> {
  if (!url?.trim()) throw new Error("No YouTube URL provided.");

  // extractVideoId throws a clean error on bad URLs
  const videoId = extractVideoId(url);

  // Create the parent Document record
  const document = await prisma.document.create({
    data: {
      title: `YouTube: ${videoId}`,
      url,
      type: "youtube",
      status: "PROCESSING",
    },
  });

  try {
    // Fetch transcript + chunk 
    const chunks = await parseAndChunkYoutube(url, document.id);

    // Update the document title with the real video title now that we have it
    const realTitle = chunks[0]?.metadata?.title ?? `YouTube: ${videoId}`;
    await prisma.document.update({
      where: { id: document.id },
      data: { title: realTitle },
    });

    // Embed and store each chunk 
    for (const chunk of chunks) {
      const embedding = await generateEmbeddings(chunk.pageContent);

      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, "documentId", content, metadata, embedding)
        VALUES (
          ${uuidv7()}::uuid,
          ${document.id}::uuid,
          ${chunk.pageContent},
          ${JSON.stringify(chunk.metadata)}::jsonb,
          ${JSON.stringify(embedding)}::vector(1024)
        )
      `;
    }

    // Mark completed 
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "COMPLETED" },
    });

    console.log(
      `✅ Ingested YouTube video: "${realTitle}" ` +
      `(${chunks.length} chunks, documentId: ${document.id})`,
    );

    return {
      success: true,
      documentId: document.id,
      title: realTitle,
      chunkCount: chunks.length,
    };
  } catch (error) {
    // Cleanup on failure 
    await prisma.document
      .delete({ where: { id: document.id } })
      .catch(() => null); // Ignore if already gone

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to ingest YouTube video "${videoId}". ` +
      `Any partial data has been removed. Error: ${message}`,
    );
  } finally {
    revalidatePath("/");
  }
}