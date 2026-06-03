"""
run_tests.py — runs all test cases against the backend and saves results

usage: python run_tests.py
(make sure the backend is running on port 8000 first)
"""

import json
import requests
import time
from datetime import datetime

API_URL = "http://127.0.0.1:8000/api/claims/test"
TEST_FILE = "../test_cases.json"
RESULTS_FILE = "../test_results.json"

# load test cases
with open(TEST_FILE, "r") as f:
    data = json.load(f)

test_cases = data["test_cases"]
results = []
passed = 0
failed = 0

print(f"\nrunning {len(test_cases)} test cases...\n")
print("-" * 70)

for tc in test_cases:
    case_id = tc["case_id"]
    case_name = tc["case_name"]
    expected = tc["expected_output"]

    start = time.time()

    try:
        # send the test case to the backend
        res = requests.post(API_URL, json=tc)
        elapsed = round(time.time() - start, 2)
        actual = res.json()

        # check if decision matches
        decision_match = actual.get("decision") == expected.get("decision")

        # check if approved amount matches (if applicable)
        amount_match = True
        if "approved_amount" in expected:
            amount_match = actual.get("approved_amount") == expected.get("approved_amount")

        # overall pass/fail
        test_passed = decision_match and amount_match

        if test_passed:
            passed += 1
            status = "PASS"
        else:
            failed += 1
            status = "FAIL"

        # build result entry
        result = {
            "case_id": case_id,
            "case_name": case_name,
            "status": status,
            "time_seconds": elapsed,
            "expected_decision": expected.get("decision"),
            "actual_decision": actual.get("decision"),
            "decision_match": decision_match,
            "expected_amount": expected.get("approved_amount"),
            "actual_amount": actual.get("approved_amount"),
            "amount_match": amount_match,
            "rejection_reasons": actual.get("rejection_reasons", []),
            "rejected_items": actual.get("rejected_items", []),
            "confidence_score": actual.get("confidence_score"),
            "notes": actual.get("notes", ""),
            "steps": actual.get("steps", []),
        }
        results.append(result)

        # print a one-liner
        icon = "v" if test_passed else "x"
        print(f"  [{icon}] {case_id}: {case_name}")
        print(f"      expected: {expected.get('decision')} | got: {actual.get('decision')}", end="")
        if "approved_amount" in expected:
            print(f" | amount: {expected.get('approved_amount')} vs {actual.get('approved_amount')}", end="")
        print(f" | {elapsed}s")

        if not test_passed:
            if not decision_match:
                print(f"      ^ decision mismatch")
            if not amount_match:
                print(f"      ^ amount mismatch")

    except Exception as e:
        failed += 1
        results.append({
            "case_id": case_id,
            "case_name": case_name,
            "status": "ERROR",
            "error": str(e),
        })
        print(f"  [!] {case_id}: {case_name} — error: {e}")

print("-" * 70)
print(f"\nresults: {passed} passed, {failed} failed, {len(test_cases)} total")
print(f"pass rate: {round(passed / len(test_cases) * 100)}%\n")

# save full results to file
output = {
    "run_at": datetime.now().isoformat(),
    "total": len(test_cases),
    "passed": passed,
    "failed": failed,
    "pass_rate": f"{round(passed / len(test_cases) * 100)}%",
    "results": results,
}

with open(RESULTS_FILE, "w") as f:
    json.dump(output, f, indent=2)

print(f"full results saved to {RESULTS_FILE}")
