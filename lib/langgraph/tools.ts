import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TavilySearch } from "@langchain/tavily";
import { semanticSearch } from "@/lib/semanticSerch";

// Supabase Vector DB Search

export const vectorDbSearchTool = tool(
  async ({ query, document_id }) => {
    try {
      const results = await semanticSearch(query, document_id ?? undefined);

      if (!results || results.length === 0) {
        return `No relevant chunks found in the vector database for query: "${query}"`;
      }

      // Each result from Supabase RPC have a content and metadata field
      const formatted = results
        .map(
          (r: { content: string; metadata?: Record<string, unknown> }, i: number) =>
            `[VectorDB Result ${i + 1}]\n${r.content}`
        )
        .join("\n\n---\n\n");

      return formatted;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return `Vector DB search failed: ${message}`;
    }
  },
  {
    name: "vector_db_search",
    description:
      `Searches the internal Supabase vector database using semantic similarity. 
      Use this for questions about uploaded PDFs, YouTube transcripts, or any document 
      that has been ingested into the knowledge base. Optionally filter by a specific document ID.`,
    schema: z.object({
      query: z
        .string()
        .describe("The semantic search query to embed and search with"),
      document_id: z
        .string()
        .optional()
        .describe("Optional: filter results to a specific document UUID"),
    }),
  }
);

//Tavily Web Search

export const webSearchTool = new TavilySearch({
  maxResults: 5,
  searchDepth: "basic",
});

export const allTools = [vectorDbSearchTool, webSearchTool];