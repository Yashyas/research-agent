import { supabase } from "@/lib/supabase"; // Your global export
import { generateEmbeddings } from "./embeddings";

export async function semanticSearch(query: string, documentId?: string) {
  // 1. Generate the vector from your question
  const queryVector = await generateEmbeddings(query);

  // 2. Call the RPC via the Supabase client
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryVector,
    match_threshold: 0.5,
    match_count: 5,
    filter_document_id: documentId || null, // Supabase handles the null check
  });

  if (error) {
    console.error("Search Error:", error);
    throw new Error(error.message);
  }

  return data;
}