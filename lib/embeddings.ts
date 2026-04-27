import { InferenceClient } from "@huggingface/inference";

const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

export async function generateEmbeddings(text: string) {
  const response = await hf.featureExtraction({
    model: "BAAI/bge-m3",
    inputs: text,
  });

  // BGE-M3 returns a 1024-dimensional array
  return response as number[];
}