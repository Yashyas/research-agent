"use server"

import { prisma } from "@/lib/prisma"

// fetch all sources 
export async function fetchSources() {
    try {
        const documents = await prisma.document.findMany({
            select:{
                id:true,
                title:true,
                type:true,
            }
        })
        return {success:true,documents}
    } catch (error) {
        return {success:false,error}
    }
}

// delete document 
export async function deleteSource(documentId:string){
    try {
        const deletedDocument = await prisma.document.delete({
            where:{
                id: documentId,
            }
        })
        return {success:true,deletedDocument}
    } catch (error) {
        return{success:false,error}
    }
}