import {GoogleGenerativeAI} from "@google/generative-ai"
import { ExtractedDocumentData } from '../types/index';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
})

// taking output from our document parser and feeding into Gemini
export async function extractDocumentData(
  content: { type: "image"; base64: string; mimeType: string } | { type: "text"; text: string }
): Promise<ExtractedDocumentData> {

    // prompt for gemini
    const extractionPrompt = `
You are an expert medical document analyzer for an Indian health insurance company.
Analyze this medical document and extract all relevant information.

Return ONLY a valid JSON object with this exact structure (no markdown formatting, no backticks, just raw JSON):
{
  "documentType": "PRESCRIPTION" | "BILL" | "DIAGNOSTIC_REPORT" | "PHARMACY_BILL" | "OTHER",
  "patientName": "string or null",
  "treatmentDate": "YYYY-MM-DD or null",
  "doctorName": "string or null",
  "doctorRegistrationNumber": "string or null (format: XX/12345/2020)",
  "clinicName": "string or null",
  "diagnosis": "string or null (main diagnosis/condition)",
  "medicines": ["list of medicine names with dosage"],
  "procedures": ["list of procedures performed"],
  "testsOrdered": ["list of diagnostic tests ordered"],
  "lineItems": [
    {
      "description": "item name",
      "amount": 0,
      "category": "consultation" | "medicine" | "diagnostic" | "procedure" | "other"
    }
  ],
  "totalAmount": 0,
  "hasStamp": true | false,
  "hasSignature": true | false,
  "confidence": 0.0 to 1.0
}

IMPORTANT RULES:
- Extract ALL items from bills with their amounts.
- For prescriptions, list every medicine and its dosage.
- Identify the document type accurately.
- If a field is not visible, use null.
- 'confidence' should reflect how clearly you can read the document.
- 'diagnosis' should be the medical condition (e.g., Viral Fever), not the treatment.
`;

try{
    let result;
    if(content.type === "image"){
        // if image send base64 directly to Vision
        const imagePart = {
            inlineData:{
                data: content.base64,
                mimeType: content.mimeType,
            }
        }
        result = await model.generateContent([extractionPrompt,imagePart])
    } else{
        // if pdf then we give the prompt + extracted text
        const textPrompt = `${extractionPrompt}\n\nDOCUMENT TEXT:\n${content.text}`;
        result = await model.generateContent(textPrompt);
    }
    const responseText = result.response.text().trim();
    // sometimes LLMs add ```json to the start, so we do the formatting here
    const cleanedText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    return JSON.parse(cleanedText) as ExtractedDocumentData;
} catch(error){
    // if gemini fails,the app crashes
    // so to prevent that we just return a fallback object
    console.error("Gemini extraction failed", error);
    return{
        documentType: "OTHER",
        confidence: 0,
        medicines: [],
        procedures: [],
        testsOrdered: [],
        lineItems: [],
        }
    }
}


// This function checks the diagnosis vs the treatment to rule out any fraud or scams
export async function assessMedicalNecessity(
    diagnosis: string,
    medicines: string[],
    procedures: string[],
    tests: string[]
): Promise<{isNecessary: boolean; confidence: number; reasoning: string}> {
    const prompt = `
You are a medical reviewer for an Indian health insurance company.
Assess whether the following treatment is medically necessary.

Diagnosis: ${diagnosis}
Medicines prescribed: ${medicines.join(", ")}
Procedures: ${procedures.join(", ")}
Tests ordered: ${tests.join(", ")}

Return ONLY valid JSON (no markdown):
{
  "isNecessary": true | false,
  "confidence": 0.0 to 1.0,
  "reasoning": "1-2 sentence explanation"
}

Consider: Does the treatment logically follow from the diagnosis? Are the medicines/tests appropriate?
`;

try{
    const result = await model.generateContent(prompt);
    const cleanedText = result.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleanedText);
}catch{
    return {isNecessary: true, confidence:0.7, reasoning: "Unable to assess medically-defaulting to approved"}
    }
}

// now form the human readable explanation
export async function generateAdjudicationReasoning(
    claimSummary: string,
    decision: string,
    reasons: string[],
): Promise<string>{
    const prompt = `
You are an insurance adjudication assistant. Write a brief, professional explanation (2-3 sentences) 
for this claim decision to be shown to the claimant.

Claim summary: ${claimSummary}
Decision: ${decision}
Reasons: ${reasons.join(", ")}

Be concise, factual, and helpful. Tell the claimant exactly why the decision was made.
Return ONLY the explanation text, no JSON.
`;
    try{
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    }catch{
        return `Claim decision: ${decision}. ${reasons.join(" ")}`;
    }
}