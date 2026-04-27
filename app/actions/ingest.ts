"use server";

import { generateEmbeddings } from "@/lib/embeddings";
import { parseAndChunk } from "@/lib/parser";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function uploadDocument(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  // 1. Generate a unique path for the file
  const fileExtension = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExtension}`;
  const filePath = `research/${fileName}`;

  // 2. Upload to Supabase Storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from("documents") // Make sure this bucket exists in Supabase
    .upload(filePath, file);

  if (storageError) throw new Error(`Storage Error: ${storageError.message}`);

  // 3. Get the Public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("documents").getPublicUrl(filePath);

  // 4. Create Parent Record in Prisma
  const document = await prisma.document.create({
    data: {
      title: file.name,
      url: publicUrl,
      type:"pdf",
      status: "PROCESSING", // Start as processing
    },
  });
  // create markdown and convert into chunks
  try {

  const chunks = await parseAndChunk(file, document.id);

  for (const chunk of chunks) {
    // create embedding of chunk
    const embedding = await generateEmbeddings(chunk.pageContent);
   
    // Generates a time-sorted UUID v7 string
    const uuidv7 = () => {
      return (
        "018f".replace(/[018]/g, (c) =>
          (
            Number(c) ^
            (crypto.getRandomValues(new Uint8Array(1))[0] &
              (15 >> (Number(c) / 4)))
          ).toString(16),
        ) + crypto.randomUUID().substring(4)
      );
    };
     // save embedding to database
    await prisma.$executeRaw`
    INSERT INTO "DocumentChunk" (id, "documentId", content, metadata, embedding)
    VALUES (
      ${uuidv7()}::uuid,
      ${document.id}::uuid, 
      ${chunk.pageContent}, 
      -- Metadata have page number 
      ${JSON.stringify(chunk.metadata)}::jsonb, 
      ${JSON.stringify(embedding)}::vector(1024)
    )
  `;
  }
  await prisma.document.update({
      where: { id: document.id },
      data: { status: "COMPLETED" },
    });
    
  } catch (error) {
    // CLEANUP: If anything fails, delete the document and its storage entry
    await prisma.document.delete({
      where: { id: document.id }
    }).catch(() => null); // Ignore error if doc was never created

    await supabase.storage.from("documents").remove([filePath]);

    throw new Error("Failed to process document. All partial data has been removed.");
  }
  revalidatePath("/"); // Refresh the UI

  return { success: true, documentId: document.id };
}
