# Debugging Log — Rule Engine Test Failures

This documents the 5 test case failures from the first test run, what caused each one,
and exactly how the rule engine was fixed. Useful for understanding the adjudication logic
and explaining your debugging process in interviews.

---

## First Run Results (before fixes)

| Case | Expected | Got | Issue |
|------|----------|-----|-------|
| TC001 | APPROVED, 1350 | APPROVED, 1400 | copay amount wrong |
| TC002 | PARTIAL, 8000 | REJECTED | rejected too early, never reached partial logic |
| TC005 | REJECTED | APPROVED | diabetes waiting period not checked |
| TC006 | APPROVED, 4000 | APPROVED, 3900 | copay applied when it shouldn't be |
| TC010 | APPROVED, 3600 | APPROVED, 3450 | copay + network discount double-deducted |

---

## Bug 1: TC001 — Copay calculated on wrong base

**what happened**: claim is 1500 (1000 consultation + 500 tests). expected copay is 150 (10% of 1500).
we calculated copay as 100 (10% of 1000 consultation fee only).

**why it happened**: the rule engine was looking for line items with "consultation" in the name
and only applying copay to those items. but the policy intends 10% copay on the entire claim
when it's a consultation visit, not just the consultation fee line item.

**the fix**: apply the 10% consultation copay to the full claim amount, not just line items
that happen to have "consultation" in the name. if a claim involves a consultation visit,
the copay covers the whole visit.

**before**:
```python
# only applied copay to items labeled "consultation"
for item in doc.line_items:
    if "consultation" in item_name:
        copay_amount += amount * consultation_copay
```

**after**:
```python
# apply copay to the full claim amount for consultation visits
has_consultation = any(
    "consultation" in item.get("item", "").lower()
    for doc in documents for item in doc.line_items
)
if has_consultation:
    copay_amount = submission.claim_amount * consultation_copay
```

---

## Bug 2: TC002 — Limits checked before coverage, blocking partial approval

**what happened**: claim is 12000 (8000 root canal + 4000 whitening). whitening is cosmetic (excluded),
so only root canal should be approved = 8000. but the rule engine rejected the claim because
12000 exceeds the per-claim limit of 5000, and it never got to check what was actually covered.

**why it happened**: the adjudication steps ran in this order: eligibility -> documents -> coverage -> **limits** -> medical -> fraud.
the limits check ran BEFORE we figured out what portion of the claim was covered. so it saw the full 12000
and rejected immediately.

also, the per-claim limit (5000) is a generic cap, but specific categories like dental have their own
sub-limit (10000). for a dental claim, the dental sub-limit should apply, not the generic per-claim cap.

**the fix**: two changes:
1. check coverage BEFORE limits, so partial claims get reduced to the covered amount first
2. when a claim falls under a specific category (dental, vision, etc.), use that category's sub-limit
   instead of the generic per-claim limit. dental sub-limit is 10000, so 8000 is fine.

---

## Bug 3: TC005 — Specific ailment waiting period not checked

**what happened**: member joined 2024-09-01, treatment 2024-10-15 (45 days later).
diagnosis is type 2 diabetes, which has a 90-day waiting period. should be rejected.
but we approved it.

**why it happened**: the eligibility check only verified the initial 30-day waiting period.
45 days > 30 days, so it passed. the specific ailment check (diabetes = 90 days) existed
in the code but was buried inside the rejection path — it only triggered if the general
eligibility check already failed, which it didn't.

**the fix**: in step 1 (eligibility), proactively check if the diagnosis matches any
specific ailment with a longer waiting period. look at the documents to find the diagnosis,
then check if that condition has a special waiting period in the policy.

**before**:
```python
# only checked 30-day initial waiting
if treatment_date < join_date + timedelta(days=30):
    return rejected
# specific ailments were only checked AFTER rejection (too late)
```

**after**:
```python
# check initial 30-day waiting
if treatment_date < join_date + timedelta(days=30):
    return rejected

# also check specific ailment waiting periods
for doc in documents:
    diagnosis = doc.diagnosis.lower()
    for condition, days in specific_ailments.items():
        if condition in diagnosis:
            if treatment_date < join_date + timedelta(days=days):
                return rejected  # e.g., diabetes needs 90 days
```

---

## Bug 4: TC006 — Copay applied to alternative medicine

**what happened**: claim is 4000 for ayurvedic therapy. expected: full 4000 approved.
we deducted 100 copay (10% of 1000 consultation fee), giving 3900.

**why it happened**: the copay logic didn't distinguish between a regular consultation
and an alternative medicine consultation. the 10% copay is meant for standard allopathic
consultations, not alternative medicine visits which have their own sub-limit and no copay.

**the fix**: skip copay calculation when the claim is for alternative medicine.
detect this by checking if the diagnosis, treatment, or procedures match alternative
medicine keywords (ayurveda, homeopathy, unani, panchakarma, etc.).

---

## Bug 5: TC010 — Double deduction (copay + network discount)

**what happened**: claim is 4500 at Apollo (network hospital). expected: 4500 - 900 (20% network discount) = 3600.
we calculated: 4500 - 150 (copay) - 900 (network discount) = 3450.

**why it happened**: we applied both the 10% consultation copay AND the 20% network discount.
but for network hospital cashless claims, the network discount already covers/replaces the copay.
you don't pay copay when using cashless at a network hospital.

**the fix**: when the claim is cashless at a network hospital, skip the copay and only
apply the network discount.

---

## Key Takeaway

the root cause across all 5 failures was the same: **the rule engine was too rigid**.
it applied every rule uniformly without considering context:
- copay was applied to everything (should depend on claim type)
- limits were checked before coverage (should check coverage first to reduce the amount)
- waiting periods were too simple (should check condition-specific periods)
- deductions were stacked (should understand when one replaces another)

real insurance adjudication has lots of "it depends" scenarios, and the engine needs
to handle that nuance.

---
