Record schema is up: <LINK TO record_schema.csv>

Row 1 is the header. Row 2 is a filled example. @M5, copy that pattern 40 times. @M2, these are your columns.

Rules (not suggestions):
1. is_synthetic = TRUE on all 40 of M5's records. No exceptions.
2. result_direction is exactly one of IMPROVED / NO_CHANGE / WORSE.
3. At least 8 of the 40 must be NO_CHANGE or WORSE. A register that shows only successes is a brochure, and a judge will see that in ten seconds. The negative results are the point.
4. baseline_window is a real date range ("Apr-Jun 2026"). Never "before the pilot".
5. adoption_pct = whether staff actually used it. Vary it widely, from under 10 to over 90. Include a few where the KPI IMPROVED but adoption is under 20%. Those are the most interesting records we can show.
6. Keep the header exactly as-is: same column names, same order.

Before you send the file, run this. It checks every rule above:
  python3 register/scripts/check_records.py your_file.csv

Please reply 👍 once you've seen this.
