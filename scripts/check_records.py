#!/usr/bin/env python3
"""Check M5's synthetic records against the rules posted with record_schema.csv.

    python3 scripts/check_records.py path/to/records.csv

Exits non-zero and lists every broken rule, so a bad file is caught before import.
"""
import csv
import re
import sys
from pathlib import Path

SCHEMA = Path(__file__).resolve().parent.parent / "shared" / "record_schema.csv"
DIRECTIONS = {"IMPROVED", "NO_CHANGE", "WORSE"}
NUMERIC = ["baseline_value", "duration_days", "post_value", "adoption_pct", "pilot_cost_inr"]
# "Apr-Jun 2026", "01 Apr 2026 - 30 Jun 2026", "2026-04-01 to 2026-06-30" all pass;
# "before the pilot" does not, because it has no year in it.
YEAR = re.compile(r"\b20\d\d\b")


def main(path):
    header = next(csv.reader(SCHEMA.open()))
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != header:
            sys.exit(f"Header does not match record_schema.csv.\n  expected: {header}\n  got:      {reader.fieldnames}")
        rows = list(reader)

    errors, ids = [], set()
    for n, r in enumerate(rows, start=2):
        where = f"line {n} ({r['record_id'] or 'no id'})"
        if not re.fullmatch(r"PR-2026-\d{4}", r["record_id"]):
            errors.append(f"{where}: record_id must look like PR-2026-0001")
        if r["record_id"] in ids:
            errors.append(f"{where}: duplicate record_id")
        ids.add(r["record_id"])
        if r["is_synthetic"].strip().upper() != "TRUE":
            errors.append(f"{where}: is_synthetic must be TRUE")
        if r["result_direction"] not in DIRECTIONS:
            errors.append(f"{where}: result_direction must be one of {sorted(DIRECTIONS)}")
        if not YEAR.search(r["baseline_window"]):
            errors.append(f"{where}: baseline_window must be a real date range, got {r['baseline_window']!r}")
        for col in NUMERIC:
            try:
                float(r[col])
            except ValueError:
                errors.append(f"{where}: {col} must be a number, got {r[col]!r}")
        for col in ("department", "outcome_statement", "kpi_name", "baseline_source", "verifier_role"):
            if not r[col].strip():
                errors.append(f"{where}: {col} is empty")

    negative = sum(r["result_direction"] in ("NO_CHANGE", "WORSE") for r in rows)
    adoption = [float(r["adoption_pct"]) for r in rows if _num(r["adoption_pct"])]
    low_use_wins = sum(
        r["result_direction"] == "IMPROVED" and _num(r["adoption_pct"]) and float(r["adoption_pct"]) < 20
        for r in rows
    )

    if len(rows) != 40:
        errors.append(f"expected 40 records, found {len(rows)}")
    if negative < 8:
        errors.append(f"only {negative} records are NO_CHANGE or WORSE; at least 8 are required")
    if low_use_wins < 1:
        errors.append("no record where the KPI IMPROVED but adoption_pct is under 20")
    if adoption and max(adoption) - min(adoption) < 50:
        errors.append(f"adoption_pct only spans {min(adoption):.0f}-{max(adoption):.0f}; vary it more widely")

    print(f"{len(rows)} records · {negative} NO_CHANGE/WORSE · {low_use_wins} improved-but-under-20%-adoption")
    if errors:
        print(f"\n{len(errors)} problem(s):")
        print("\n".join(f"  - {e}" for e in errors))
        sys.exit(1)
    print("OK — every rule passes.")


def _num(v):
    try:
        float(v)
        return True
    except ValueError:
        return False


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
