// this takes care of doc -> base 64 -> pdf text extraction
// if image -> pass base 64 to gemini Vision
// if pdf, extract text with pdfjs-dist and send text to Gemini
// there is also an processUploadFile function that uses tesseract ocr just in case to check which one performs better
// just uncomment that and comment the current one to switch


// import Tesseract from 'tesseract.js'
// export async function processUploadedFile(
//   file: File
// ): Promise<{ type: "image"; base64: string; mimeType: string; ocrText?: string } | { type: "text"; text: string }> {
//   const buffer = await file.arrayBuffer();
//   const bytes = new Uint8Array(buffer);

//   // 1. Handle PDFs
//   if (file.type === "application/pdf") {
//     const text = await extractTextFromPDF(bytes);
//     return { type: "text", text };
//   }

//   // 2. Handle Images (JPG, PNG, WEBP)
//   const base64 = Buffer.from(bytes).toString("base64");
  
//   // Run Tesseract OCR on the image buffer
//   let ocrText = "";
//   try {
//     console.log(`Running Tesseract OCR on ${file.name}...`);
//     // Tesseract can read directly from a buffer in Node.js environments
//     const result = await Tesseract.recognize(Buffer.from(bytes), "eng", {
//       logger: (m) => console.log(m.status, Math.round(m.progress * 100) + "%"),
//     });
//     ocrText = result.data.text;
//   } catch (error) {
//     console.error("Tesseract OCR failed:", error);
//   }

//   return { type: "image", base64, mimeType: file.type, ocrText };
// }

export async function processUploadedFile(
    file: File
): Promise<{type: "image"; base64: string; mimeType: string} | {type: "text"; text: string}> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (file.type === "application/pdf") {
        // NOTE: Make sure your extractTextFromPDF function is defined below this!
        const text = await extractTextFromPDF(bytes);
        return { type: "text", text };
    }
    
    // if image toh convert it to base 64
    const base64 = Buffer.from(bytes).toString("base64");
    return { type: "image", base64, mimeType: file.type };
}

async function extractTextFromPDF(bytes: Uint8Array): Promise<string>{
    try{
        const pdfjsLib = await import ("pdfjs-dist/legacy/build/pdf.mjs")
        pdfjsLib.GlobalWorkerOptions.workerSrc = "";
        
        const loadingTask = pdfjsLib.getDocument({data: bytes});
        const pdf = await loadingTask.promise;
        let fullText = "";

        // loop through the pages and get the text
        for(let i=1; i<=pdf.numPages; i++){
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item:any) => item.str || "")
                .join(" ");
                fullText += pageText + "\n"
        }
        return fullText.trim() || "Unable to extract text from PDF"
    }catch(error){
        console.error("PDF extraction error", error);
        return "PDF text extraction failed";
    }
}

export function validateFileType(file: File): {valid : boolean; error?:string}{
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if(!allowed.includes(file.type)){
        return {valid: false, error: `File type ${file.type} is not supported. Try uploading JPG, PNG, WEBP or PDF formats`}
    }
    if(file.size > 10*1024*1024){ // 10 mb limit on file size
        return {valid: false, error: `File too large, upload less than 10MB`}
    }
    return {valid:true}
}

