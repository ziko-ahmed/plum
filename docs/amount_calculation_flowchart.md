# Co-pay & Amount Calculation Flowchart

```mermaid
flowchart TD
    subgraph "Limits & Deductions Logic"
        EA["Effective Claim Amount\n(After partial rejections)"] --> CAT{"Category Check"}
        
        CAT -->|"Dental"| DL["Set Limit = ₹10,000"]
        CAT -->|"Alt. Medicine"| AL["Set Limit = ₹8,000"]
        CAT -->|"Other"| PL["Set Limit = ₹5,000"]
        
        DL --> LC{"Amount > Limit?"}
        AL --> LC
        PL --> LC
        
        LC -->|"yes"| RJ1["REJECT:\nPER_CLAIM_EXCEEDED"]
        LC -->|"no"| YTD{"YTD Total + Amount\n> ₹50,000?"}
        
        YTD -->|"yes"| RJ2["REJECT:\nANNUAL_LIMIT_EXCEEDED"]
        YTD -->|"no"| DED{"Deductions Type"}
        
        DED -->|"Alt. Med"| AP["Approved (No deductions)"]
        DED -->|"Cashless Network"| ND["Apply 20% Network Discount"]
        DED -->|"Standard"| CP["Apply 10% Consultation Copay"]
        
        ND --> AP
        CP --> AP
    end
```

## Calculation Steps

1. **Start with the Effective Amount**: This is the total claim amount (or the reduced amount if some items were rejected).
2. **Determine the Applicable Limit**:
   - If the diagnosis or procedures involve **Dental**, the limit is **₹10,000**.
   - If it involves **Alternative Medicine** (Ayurveda, Homeopathy, Unani, Panchakarma), the limit is **₹8,000**.
   - Otherwise, the standard per-claim limit is **₹5,000**.
3. **Check Limits**:
   - Reject if the amount exceeds the applicable limit.
   - Reject if adding this amount exceeds the **₹50,000** annual limit.
4. **Calculate Deductions (Mutually Exclusive)**:
   - **Alternative Medicine**: No copays apply.
   - **Cashless at Network Hospital**: Apply a **20% network discount** on the amount (copay is skipped).
   - **Standard Consultation**: Apply a **10% copay** on the amount if a consultation fee is present.
