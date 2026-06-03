# Plum Internship Assignment — Video Demo Script

**Target Duration**: 5-7 minutes
**Equipment**: iPad + Apple Pencil (for Architecture), Laptop (for Demo)

---

## Part 1: Architecture & Technical Approach (iPad) — *~2 minutes*

*(Have the `architecture_diagram.md` mermaid graph open on your iPad, or sketch it live if you prefer)*

**[0:00 - 0:30] Introduction & Problem Statement**
"Hi everyone, I'm Ziko. For my AI Automation Engineer intern assignment, I built an intelligent system to automate OPD claim adjudication. Instead of claims teams manually reading prescriptions and checking policy terms, my system handles the entire pipeline end-to-end using OCR, AI, and a rule engine."

**[0:30 - 1:30] Technical Architecture**
*(Point to or draw the 3 main layers: Frontend, Backend, Database)*
"Here’s how the architecture works:
1. **Frontend**: I built a clean, responsive UI using Next.js and TypeScript where employees can easily submit their claims and upload their documents.
2. **Backend**: I used Python and FastAPI for the backend to handle the heavy lifting. When a document is uploaded, it passes through two phases:
   - First, **Tesseract OCR** extracts the raw text from the images.
   - Second, I send that raw text to **Groq's Llama 3.1 AI model**. I use a highly structured prompt to force the AI to return clean, structured JSON containing the diagnosis, amounts, and doctor details.
3. **Rule Engine & Database**: That structured JSON is then fed into a custom 6-step rule engine I built, which evaluates eligibility, policy exclusions, and limits based on the `policy_terms.json`. Finally, everything is logged into MongoDB."

**[1:30 - 2:00] The Rule Engine Logic**
"My rule engine strictly follows Plum's requirements. It checks for waiting periods, validates doctor registration formats, applies a ₹5000 per-claim cap, and handles edge cases like 20% network discounts and alternative medicine sub-limits. It's incredibly robust."

---

## Part 2: Live Demo (Laptop) — *~3 minutes*

*(Switch screen recording to your laptop, showing the deployed Next.js site)*

**[2:00 - 3:00] Scenario 1: A Valid, Approved Claim**
"Let's jump into the live demo. This is the dashboard. I'll submit a new claim."
*(Action: Go to `/submit`)*

* **Member ID**: `EMP001`
* **Full Name**: `Rajesh Kumar`
* **Treatment Date**: `01/11/2024` *(This is important! Needs to be past the 30-day waiting period, Rajesh joined 01/01/2024)*
* **Claim Amount**: `1500`
* **Hospital**: `Apollo Hospitals` *(Apollo is a network hospital!)*
* **Cashless**: Check the box.
* **Documents**: *(Upload a clean screenshot of a prescription for Viral Fever with Paracetamol)*

"I'm submitting a claim for Rajesh at Apollo Hospitals. Because Apollo is a network hospital and Rajesh requested cashless, the rule engine should recognize this and apply a 20% discount instead of the standard 10% copay."
*(Action: Click Submit, wait for the decision page to load)*

"As you can see, the claim was **APPROVED**. The AI successfully extracted the diagnosis and the doctor's details. The rule engine perfectly applied the 20% network discount, bringing the approved amount to ₹1200."

**[3:00 - 4:00] Scenario 2: A Rejected Claim (Exclusion)**
"Now, let's see how the system handles a policy violation."
*(Action: Submit a new claim)*

* **Member ID**: `EMP003`
* **Full Name**: `Priya Sharma`
* **Treatment Date**: `15/11/2024`
* **Claim Amount**: `8000`
* **Documents**: *(Upload a screenshot of a bill for "Cosmetic Surgery" or "Botox")*

"Here, Priya is submitting a bill for Cosmetic Surgery. According to the `policy_terms.json`, cosmetic procedures are strictly excluded."
*(Action: Click Submit, show the rejection)*

"The claim was instantly **REJECTED**. The AI extracted 'Cosmetic Surgery', and the rule engine caught it in the coverage check step, flagging it under the exact exclusion rule. The timeline cleanly shows exactly which step failed."

---

## Part 3: Future Improvements & Outro — *~1 minute*

**[4:00 - 5:00] Potential Improvements**
"To wrap up, while this system is fully functional, there are a few ways I'd improve it for production:
1. **Cloud Storage**: Currently, the system uses ephemeral local storage for the OCR processing pipeline. In production, I'd hook it up to AWS S3 to permanently host the uploaded images so admins can view them later.
2. **Confidence Scores**: I'd implement a workflow where if the AI's extraction confidence drops below 85%, the claim is automatically routed to a 'Manual Review' queue for a human to double-check.
3. **Advanced AI**: I'd upgrade from standard prompting to using multi-modal LLMs (like GPT-4o or Gemini Pro Vision) to skip the Tesseract OCR step entirely, which would massively improve accuracy on messy handwritten doctor notes."

"Thank you for watching, and I look forward to discussing the code with you in the interview!"

---

## Demo Data to Use

When recording, you can use these exact values to guarantee perfect results.

### Test Case 1 (Approved)
* **Member ID**: `EMP001`
* **Member Name**: `Rajesh Kumar`
* **Treatment Date**: `01/11/2024`
* **Claim Amount**: `1500`
* **Hospital**: `Apollo Hospitals` (Check Cashless)
* **Document Text (Write this in a note app and screenshot it to upload)**:
  ```text
  Dr. S. Sharma, MBBS
  Reg No: DL/12345/2010
  Date: 01/11/2024
  Patient: Rajesh Kumar
  Diagnosis: Viral Fever
  Rx: Paracetamol 650mg
  Bill Amount: 1500 INR
  ```

### Test Case 2 (Rejected)
* **Member ID**: `EMP003`
* **Member Name**: `Priya Sharma`
* **Treatment Date**: `15/11/2024`
* **Claim Amount**: `8000`
* **Document Text (Write this in a note app and screenshot it to upload)**:
  ```text
  Dr. K. Patel, MD Dermatology
  Reg No: MH/67890/2015
  Date: 15/11/2024
  Patient: Priya Sharma
  Diagnosis: Skin aging
  Treatment: Cosmetic Botox Injections
  Bill Amount: 8000 INR
  ```
