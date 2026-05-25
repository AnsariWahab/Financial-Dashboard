"""
Insights Tool — generates AI-powered narrative insights for dashboard pages.
Uses OpenRouter LLM to turn raw financial metrics into structured insight bullets.
Returns: list[dict] with keys: text, severity ("positive"|"caution"|"warning")
"""
import json
import os
import pandas as pd
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from database import get_financials
from measures import get_all_pnl_measures

load_dotenv()

_llm = None


def _get_llm():
    global _llm
    if _llm is None:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if api_key and api_key != "sk-or-v1-your_openrouter_key_here":
            _llm = ChatOpenAI(
                model="google/gemini-2.0-flash-001",
                temperature=0.2,
                api_key=api_key,
                max_tokens=500,
                base_url="https://openrouter.ai/api/v1",
                default_headers={
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Omotec Financial Dashboard",
                },
            )
    return _llm


def _prev_year(yr: str) -> str:
    """FY25-26 → FY24-25"""
    try:
        parts = yr.replace("FY", "").split("-")
        return f"FY{int(parts[0]) - 1}-{int(parts[1]) - 1}"
    except Exception:
        return ""


def _last_3_month_margins(source_year: str, segment: str | None, divisor: int) -> list[dict]:
    """Fetch gross margin % for the last 3 distinct months."""
    df = get_financials(source_year=source_year, segment=segment)
    if df.empty or "month" not in df.columns:
        return []

    if any(c.isdigit() for c in str(df["month"].iloc[0])):
        df["month"] = pd.to_datetime(df["month"], errors="coerce")
        df["month_name"] = df["month"].dt.strftime("%B")
        df["month_num"] = df["month"].dt.month
    else:
        month_map = {
            "January": 1, "February": 2, "March": 3, "April": 4,
            "May": 5, "June": 6, "July": 7, "August": 8,
            "September": 9, "October": 10, "November": 11, "December": 12,
        }
        df["month_name"] = df["month"]
        df["month_num"] = df["month"].map(month_map)

    fy_order = {4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6, 10: 7, 11: 8, 12: 9, 1: 10, 2: 11, 3: 12}
    df["fy_sort"] = df["month_num"].map(fy_order)

    months = (
        df[["month_name", "fy_sort"]]
        .drop_duplicates()
        .sort_values("fy_sort")
    )
    last_3 = months.tail(3)

    result = []
    for _, row in last_3.iterrows():
        df_m = df[df["month_name"] == row["month_name"]]
        m = get_all_pnl_measures(df_m, divisor)
        result.append({"month": row["month_name"], "gp": m["Gross Profit %"]})

    return result


def _fetch_metrics(source_year: str, segment: str, unit: str) -> dict:
    """Gather rich financial metrics for the given segment/year."""
    divisor = 10000000 if unit == "Crores" else 100000
    seg = None if segment == "overview" else segment
    year = None if source_year == "All" else source_year

    df = get_financials(source_year=year, segment=seg)
    if df.empty:
        return {"error": "No data found for the selected filters."}

    pnl = get_all_pnl_measures(df, divisor)

    result = {
        "revenue": round(pnl.get("Revenue", 0), 2),
        "gp": round(pnl.get("Gross Profit %", 0), 1),
        "ebitda": round(pnl.get("EBITDA %", 0), 1),
        "pat": round(pnl.get("PAT %", 0), 1),
        "unit": unit,
    }

    # ── YoY comparison ──
    prev = _prev_year(source_year)
    if prev:
        df_prev = get_financials(source_year=prev, segment=seg)
        if not df_prev.empty:
            pnl_prev = get_all_pnl_measures(df_prev, divisor)
            result["yoy"] = {
                "prev_year": prev,
                "prev_revenue": round(pnl_prev.get("Revenue", 0), 2),
                "prev_gp": round(pnl_prev.get("Gross Profit %", 0), 1),
                "prev_pat": round(pnl_prev.get("PAT %", 0), 1),
                "rev_change_pct": round(
                    ((pnl.get("Revenue", 0) - pnl_prev.get("Revenue", 0)) / pnl_prev.get("Revenue", 1)) * 100,
                    1,
                ) if pnl_prev.get("Revenue", 0) else 0,
            }

    # ── Last 3 months margin trend ──
    result["monthly_trend"] = _last_3_month_margins(source_year, seg, divisor)

    # ── Overview: segment breakdown + gaps ──
    if segment == "overview":
        segments_list = []
        for s in ["centre", "research", "school"]:
            sdf = get_financials(source_year=year, segment=s)
            if not sdf.empty:
                spnl = get_all_pnl_measures(sdf, divisor)
                entry = {
                    "name": s,
                    "revenue": round(spnl.get("Revenue", 0), 2),
                    "gp": round(spnl.get("Gross Profit %", 0), 1),
                    "pat": round(spnl.get("PAT %", 0), 1),
                }
                # YoY per segment
                if prev:
                    sdf_prev = get_financials(source_year=prev, segment=s)
                    if not sdf_prev.empty:
                        spnl_prev = get_all_pnl_measures(sdf_prev, divisor)
                        entry["prev_revenue"] = round(spnl_prev.get("Revenue", 0), 2)
                        entry["rev_change_pct"] = round(
                            ((spnl.get("Revenue", 0) - spnl_prev.get("Revenue", 0)) / spnl_prev.get("Revenue", 1)) * 100,
                            1,
                        ) if spnl_prev.get("Revenue", 0) else 0
                segments_list.append(entry)
        result["segments"] = segments_list

    # ── Centre: branch-level outliers ──
    if segment == "centre":
        rev_df = df[df["pnl_categories"] == "Revenue"]
        branches = rev_df.groupby("branch")["value"].sum()
        branches = branches[branches.index.str.upper() != "ALL"]
        result["branch_count"] = len(branches)

        if not branches.empty:
            result["top_branch"] = {"name": branches.idxmax(), "rev": round(branches.max() / divisor, 2)}

            # GP% per branch
            branch_gp = {}
            for b in branches.index:
                bdf = get_financials(source_year=year, segment="centre", branch=b)
                if not bdf.empty:
                    bpnl = get_all_pnl_measures(bdf, divisor)
                    branch_gp[b] = bpnl["Gross Profit %"]
            if branch_gp:
                worst = min(branch_gp, key=branch_gp.get)
                best = max(branch_gp, key=branch_gp.get)
                result["worst_branch"] = {"name": worst, "gp": round(branch_gp[worst], 1)}
                result["best_branch"] = {"name": best, "gp": round(branch_gp[best], 1)}

    # ── School: student count + revenue/student ──
    if segment == "school":
        students = int(df["Student_name"].nunique()) if "Student_name" in df.columns else 0
        result["student_count"] = students
        result["rev_per_student"] = round(pnl.get("Revenue", 0) / students, 2) if students else 0

        if prev:
            df_prev = get_financials(source_year=prev, segment="school")
            if not df_prev.empty:
                prev_students = int(df_prev["Student_name"].nunique()) if "Student_name" in df_prev.columns else 0
                result["prev_student_count"] = prev_students
                pnl_prev = get_all_pnl_measures(df_prev, divisor)
                result["prev_rev_per_student"] = round(pnl_prev.get("Revenue", 0) / prev_students, 2) if prev_students else 0

        # Top vs bottom school gap
        rev_by_school = (
            df[df["pnl_categories"] == "Revenue"]
            .groupby("Student_name")["value"]
            .sum()
        )
        if not rev_by_school.empty and len(rev_by_school) > 1:
            top = rev_by_school.idxmax()
            bottom = rev_by_school.idxmin()
            result["top_school"] = {"name": top, "rev": round(rev_by_school.max() / divisor, 2)}
            result["bottom_school"] = {"name": bottom, "rev": round(rev_by_school.min() / divisor, 2)}
            result["school_gap_multiple"] = round(rev_by_school.max() / rev_by_school.min(), 1) if rev_by_school.min() else 0

    # ── Research: category breakdown + YoY ──
    if segment == "research" and "research_category" in df.columns:
        cats = (
            df[df["pnl_categories"] == "Revenue"]
            .groupby("research_category")["value"]
            .sum()
        )
        cats = cats[cats.index.notna() & (cats.index != "")]
        result["category_count"] = len(cats)

        cat_list = []
        for c in cats.index:
            cdf = get_financials(source_year=year, segment="research")
            cdf = cdf[cdf["research_category"] == c]
            if not cdf.empty:
                cpnl = get_all_pnl_measures(cdf, divisor)
                entry = {"name": c, "rev": round(cats[c] / divisor, 2), "gp": round(cpnl["Gross Profit %"], 1)}
                if prev:
                    cdf_prev = get_financials(source_year=prev, segment="research")
                    cdf_prev = cdf_prev[cdf_prev["research_category"] == c]
                    if not cdf_prev.empty:
                        cpnl_prev = get_all_pnl_measures(cdf_prev, divisor)
                        entry["prev_gp"] = round(cpnl_prev["Gross Profit %"], 1)
                cat_list.append(entry)

        result["categories"] = sorted(cat_list, key=lambda x: x["rev"], reverse=True)

        if cat_list:
            result["top_category"] = cat_list[0]["name"]

    return result


def generate_insights(source_year: str = "FY25-26", segment: str = "overview", unit: str = "Lakhs") -> list[dict]:
    """Generate 3–5 structured insight bullets. Returns list of {text, severity}."""
    metrics = _fetch_metrics(source_year, segment, unit)
    if "error" in metrics:
        print(f"⚠️  Insights: {metrics['error']}")
        return []

    llm = _get_llm()
    if not llm:
        print("⚠️  Insights: OpenRouter API key not configured. Set OPENROUTER_API_KEY in backend/.env")
        return [{"text": "⚠️ AI insights unavailable — set OPENROUTER_API_KEY in backend/.env", "severity": "caution"}]

    segment_label = {"overview": "Overall", "centre": "Centre", "school": "School", "research": "Research"}.get(segment, segment)

    prompt = f"""You are a financial analyst. Generate 3-5 insight bullets for the {segment_label} segment ({source_year}, {metrics['unit']}).

Current:
- Revenue: {metrics['revenue']} {metrics['unit']}  GP: {metrics['gp']}%  EBITDA: {metrics['ebitda']}%  PAT: {metrics['pat']}%"""

    if metrics.get("yoy"):
        y = metrics["yoy"]
        prompt += f"""
YoY (vs {y['prev_year']}):
- Revenue change: {y['rev_change_pct']}%  Previous GP: {y['prev_gp']}%"""

    if metrics.get("monthly_trend"):
        trend = metrics["monthly_trend"]
        vals = [m["gp"] for m in trend]
        direction = "up" if len(vals) > 1 and vals[-1] > vals[0] else "down" if len(vals) > 1 and vals[-1] < vals[0] else "flat"
        month_names = ", ".join(m["month"] for m in trend)
        gp_vals = ", ".join(f"{m['gp']}%" for m in trend)
        prompt += f"\nLast {len(trend)} months GP trend ({month_names}): {gp_vals} — direction: {direction}"

    if segment == "overview" and metrics.get("segments"):
        prompt += "\n\nSegments:"
        for s in metrics["segments"]:
            line = f"  {s['name']}: ₹{s['revenue']} {metrics['unit']} rev, {s['gp']}% GP"
            if "rev_change_pct" in s:
                line += f" ({s['rev_change_pct']:+.1f}% YoY)"
            prompt += "\n" + line

    if segment == "centre":
        prompt += f"\nBranches: {metrics.get('branch_count', 0)} active"
        if metrics.get("top_branch"):
            prompt += f"  Top: {metrics['top_branch']['name']} (₹{metrics['top_branch']['rev']} {metrics['unit']})"
        if metrics.get("worst_branch") and metrics.get("best_branch"):
            prompt += f"  Best GP: {metrics['best_branch']['name']} ({metrics['best_branch']['gp']}%)  Worst GP: {metrics['worst_branch']['name']} ({metrics['worst_branch']['gp']}%)"

    if segment == "school":
        prompt += f"\nStudents: {metrics.get('student_count', 0)}  Rev/student: ₹{metrics.get('rev_per_student', 0)} {metrics['unit']}"
        if metrics.get("prev_student_count"):
            prompt += f"  Previous year students: {metrics['prev_student_count']}"
            prompt += f"  Previous rev/student: ₹{metrics['prev_rev_per_student']} {metrics['unit']}"
        if metrics.get("top_school"):
            prompt += f"  Top school: {metrics['top_school']['name']} (₹{metrics['top_school']['rev']} {metrics['unit']})"
        if metrics.get("school_gap_multiple"):
            prompt += f"  Gap (top vs bottom): {metrics['school_gap_multiple']}x"

    if segment == "research" and metrics.get("categories"):
        prompt += "\n\nCategories:"
        for c in metrics["categories"]:
            line = f"  {c['name']}: ₹{c['rev']} {metrics['unit']} rev, {c['gp']}% GP"
            if "prev_gp" in c:
                line += f" (prev {c['prev_gp']}%)"
            prompt += "\n" + line

    prompt += """

Return ONLY a JSON array of objects. Each object has:
- "text": the insight sentence (under 20 words, starting with an emoji)
- "severity": one of "positive", "caution", or "warning"

Rules:
- 3-5 items
- 📈📉⚠️✅🎯💡 emojis only
- Flag margin drops or gaps >5% as "warning" or "caution"
- Never repeat the same metric
- Use ₹ and mention unit
- Return ONLY the JSON array, no other text"""

    try:
        response = llm.invoke(prompt)
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        parsed = json.loads(content)
        if isinstance(parsed, list):
            return parsed
        return []
    except Exception as e:
        err_str = str(e)
        print(f"❌ Insights generation error: {err_str[:200]}")
        if "401" in err_str or "Unauthorized" in err_str or "Authentication" in err_str:
            return [{"text": "⚠️ AI insights unavailable — check your OPENROUTER_API_KEY in backend/.env", "severity": "caution"}]
        return []
