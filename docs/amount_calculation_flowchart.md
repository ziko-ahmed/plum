# Co-pay & Amount Calculation Flowchart

```mermaid
flowchart LR
    subgraph "Co-pay & Amount Calculation"
        CA["Claim Amount"] --> CP["Apply co-pay %\n(10% consultation,\n30% branded drugs)"]
        CP --> NW{"Network\nhospital?"}
        NW -->|"yes"| ND["Apply 20% network discount"]
        NW -->|"no"| SL["Check sub-limits"]
        ND --> SL
        SL --> PC{"Per-claim\n≤ ₹5000?"}
        PC -->|"yes"| AL{"Annual total\n≤ ₹50000?"}
        PC -->|"no"| RJ["REJECT: PER_CLAIM_EXCEEDED"]
        AL -->|"yes"| AP["Final approved amount"]
        AL -->|"no"| RJ2["REJECT: ANNUAL_LIMIT_EXCEEDED"]
    end
```

## Calculation Steps

1. **Start with the raw claim amount**
2. **Apply co-pay percentages:**
   - consultation fees → 10% co-pay (member pays 10%)
   - branded drugs → 30% co-pay
   - generic drugs → no co-pay
3. **Network discount** (if hospital is in network list): 20% off
4. **Check sub-limits** per category:
   - consultation: ₹2,000
   - diagnostic tests: ₹10,000
   - pharmacy: ₹15,000
   - dental: ₹10,000
   - vision: ₹5,000
   - alternative medicine: ₹8,000
5. **Per-claim cap**: single claim can't exceed ₹5,000
6. **Annual cap**: total claims year-to-date can't exceed ₹50,000
