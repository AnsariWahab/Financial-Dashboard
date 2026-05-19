"""
Calculator Tool — wraps measures.py to compute exact P&L metrics.
Used when user asks about Gross Profit %, EBITDA, PAT etc.
"""
from database import get_financials
from measures import get_all_pnl_measures
import json


def run_calculator_tool(question: str) -> str:
    """
    Parses basic filter intent from the question string,
    fetches data, and returns computed P&L measures.

    The orchestrator passes a JSON string like:
    {"source_year": "FY25-26", "segment": "centre", "unit": "Lakhs"}
    OR a plain English question — we handle both.
    """
    try:
        # Try to parse as JSON filters first (orchestrator may pass structured input)
        filters = {}
        try:
            filters = json.loads(question)
        except Exception:
            # Plain text — extract hints
            q_lower = question.lower()
            if "fy25" in q_lower or "25-26" in q_lower or "25_26" in q_lower:
                filters["source_year"] = "FY25-26"
            elif "fy24" in q_lower or "24-25" in q_lower or "24_25" in q_lower:
                filters["source_year"] = "FY24-25"
            elif "fy23" in q_lower or "23-24" in q_lower or "23_24" in q_lower:
                filters["source_year"] = "FY23-24"
            elif "fy22" in q_lower or "22-23" in q_lower or "22_23" in q_lower:
                filters["source_year"] = "FY22-23"

            for seg in ["centre", "research", "school", "indirect"]:
                if seg in q_lower:
                    filters["segment"] = seg
                    break

            filters["unit"] = "Crores" if "crore" in q_lower else "Lakhs"

        source_year = filters.get("source_year")
        segment = filters.get("segment")
        unit = filters.get("unit", "Lakhs")
        divisor = 10000000 if unit == "Crores" else 100000

        df = get_financials(source_year=source_year, segment=segment)

        if df.empty:
            return "No financial data found for the specified filters."

        m = get_all_pnl_measures(df, divisor)

        label = []
        if segment:
            label.append(segment.title())
        if source_year:
            label.append(source_year)
        label_str = " — ".join(label) if label else "All Segments, All Years"

        return (
            f"P&L Measures for {label_str} (in {unit}):\n"
            f"  Revenue:          ₹{m['Revenue']:.2f}\n"
            f"  Direct Expense:   ₹{m['Direct Expense']:.2f}\n"
            f"  Gross Profit:     ₹{m['Gross Profit']:.2f} ({m['Gross Profit %']:.1f}%)\n"
            f"  Indirect Expense: ₹{m['Indirect Expense']:.2f}\n"
            f"  EBITDA:           ₹{m['EBITDA']:.2f} ({m['EBITDA %']:.1f}%)\n"
            f"  Depreciation:     ₹{m['Depreciation']:.2f}\n"
            f"  EBIT:             ₹{m['EBIT']:.2f}\n"
            f"  Interest:         ₹{m['Interest']:.2f}\n"
            f"  PBT:              ₹{m['PBT']:.2f}\n"
            f"  Tax:              ₹{m['Tax']:.2f}\n"
            f"  PAT:              ₹{m['PAT']:.2f} ({m['PAT %']:.1f}%)\n"
        )

    except Exception as e:
        print(f"❌ Calculator Tool error: {e}")
        return f"Calculation failed: {str(e)}"