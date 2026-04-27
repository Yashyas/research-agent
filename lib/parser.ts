import { LlamaCloud } from "@llamaindex/llama-cloud";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const client = new LlamaCloud({
  apiKey: process.env.LLAMA_CLOUD_API_KEY,
});

/**
 * Accepts a web-native File object directly from the frontend/formData
 */
export async function parseAndChunk(
  file: File, // Use the native File type here
  documentId: string,
): Promise<Document[]> {
  // 1. Upload to LlamaParse directly using the File object
  const result = await client.parsing.parse({
    tier: "cost_effective",
    version: "latest",
    upload_file: file,
    expand: ["markdown"],
  });
  if (!result.markdown) {
    throw new Error("LlamaParse returned no markdown content.");
  }

  // result.markdown.pages is an array of objects: { page: number, markdown: string }
  const pages = (result.markdown as any).pages;

  if (!pages || pages.length === 0) {
    throw new Error("No page data returned from LlamaParse");
  }

  const allChunks: Document[] = [];

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: 1200, // Smaller chunks are better when you have page context
    chunkOverlap: 250,
  });

  // Process each page individually
  for (const pageData of pages) {
    const rawMarkdown = pageData.markdown;

    // Split this specific page into chunks
    const pageChunks = await splitter.splitDocuments([
      new Document({ pageContent: rawMarkdown }),
    ]);

    for (const chunk of pageChunks) {
      const content = chunk.pageContent.trim();

      const isJustHeader = /^#+\s+.*$/.test(content);
      if (content.length < 40 || isJustHeader) continue;

      const textBeforeChunk = rawMarkdown.substring(
        0,
        rawMarkdown.indexOf(content),
      );
      const headers = [...textBeforeChunk.matchAll(/(?:^|\n)(#+\s.*)/g)];
      const lastHeader =
        headers.length > 0
          ? headers[headers.length - 1][1].replace(/#/g, "").trim()
          : "";

      // PREPEND CONTEXT: Adding the header to the text improves vector hit rate
      const semanticContent = lastHeader
        ? `Section: ${lastHeader}\n${content}`
        : content;

      allChunks.push(
        new Document({
          pageContent: pageData.markdown,
          metadata: {
            source: file.name,
            documentId: documentId,
            pageNumber: pageData.page,
            section: lastHeader, // 1-based index from LlamaParse
          },
        }),
      );
    }
  }

  return allChunks;
}
