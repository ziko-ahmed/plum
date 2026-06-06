import { NextRequest, NextResponse } from 'next/server';
import { processUploadedFile } from "@/lib/document-processor";
import { extractDocumentData } from "@/lib/gemini"

export async function POST(request: NextRequest){
    try{
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        if(!file){
            return NextResponse.json(
                {error: "No file is uploaded"},
                {status: 400}
            )
        }
        const processContent = await processUploadedFile(file);
        const extractedData = await extractDocumentData(processContent);
        return NextResponse.json({
            success: true,
            data: extractedData
        })
    }catch(error){
        console.error("Extraction API Error:", error)
        return NextResponse.json(
            {error: "Failed to process the document"},
            {status: 500}
        )
    }
}