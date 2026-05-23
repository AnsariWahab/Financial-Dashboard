"""
Financial Dashboard API - Python Backend
Connects to your MySQL database and provides API endpoints for the React frontend
"""
print("🔄 app.py loaded - NEW VERSION")
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from database import get_financials, get_distinct_values, execute_query
from measures import (
    get_all_pnl_measures,
    get_unique_students, get_unique_schools,
    get_stem_labs, get_research_count,
    build_pnl_table_data
)
from ai_chat import ai_chat
from rag_system import rag
import pandas as pd
import os
import time

app = FastAPI(
    title="Financial Dashboard API",
    description="API for Financial Dashboard with P&L Analysis",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────
# SIMPLE IN-MEMORY CACHE
# Stores results keyed by (endpoint + filters).
# TTL = 5 minutes — after that, data is re-fetched from MySQL.
# This makes repeated page loads instant without needing Redis.
# ─────────────────────────────────────────────────────────
_cache: Dict[str, Any] = {}
_cache_ts: Dict[str, float] = {}
CACHE_TTL = 300  # seconds

def cache_get(key: str):
    if key in _cache and (time.time() - _cache_ts[key]) < CACHE_TTL:
        return _cache[key]
    return None

def cache_set(key: str, value: Any):
    _cache[key] = value
    _cache_ts[key] = time.time()

def cache_clear():
    _cache.clear()
    _cache_ts.clear()

def make_key(*args) -> str:
    return "|".join(str(a) for a in args)


# ─────────────────────────────────────────────────────────
# STARTUP: pre-warm the cache so first page load is fast
# ─────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_prewarm():
    """Fetch and cache the most common queries at startup so first load is instant."""
    print("🔥 Pre-warming cache...")
    try:
        df = get_financials()
        if not df.empty:
            divisor = 100000  # Lakhs default
            # Cache pnl-measures (no filters)
            cache_set(make_key("pnl", None, None, None, None, "Lakhs"),
                      get_all_pnl_measures(df, divisor))
            # Cache segment data
            segments_result = []
            for seg in [s for s in df['segment'].unique() if s and s.strip() != '']:
                df_rev = df[
                    (df['segment'] == seg) &
                    (df['pnl_categories'] == 'Revenue')
                ]
                revenue = round(df_rev['value'].sum() / 100000, 2)

                if revenue == 0:
                    continue

                df_seg = df[df['segment'] == seg]
                m = get_all_pnl_measures(df_seg, divisor)
                segments_result.append({
                    "segment": seg.title(),
                    "revenue": revenue,
                    "grossMargin": m['Gross Profit %']
                })
            cache_set(make_key("seg", None, None, "Lakhs"), segments_result)
            print("✅ Cache pre-warmed — first page load will be fast")
    except Exception as e:
        print(f"⚠️  Cache pre-warm failed (non-fatal): {e}")


@app.get("/")
def read_root():
    return {"message": "✅ Financial Dashboard API is running!", "status": "active", "version": "2.0.0"}


@app.get("/api/filters")
def get_filters():
    key = "filters"
    cached = cache_get(key)
    if cached:
        return cached
    try:
        raw_years = get_distinct_values('source_year')
        display_years = [y.replace('_', '-') for y in raw_years]  # FY24_25 → FY24-25
        result = {
            "years": ['All'] + sorted(display_years),
            "months": ['All', 'April', 'May', 'June', 'July', 'August', 'September',
                       'October', 'November', 'December', 'January', 'February', 'March'],
            "segments": ['All'] + [s for s in get_distinct_values('segment') if s],
            "branches": ['All'] + [b for b in get_distinct_values('branch') if b],
            "units": ['Lakhs', 'Crores']
        }
        cache_set(key, result)
        return result
    except Exception as e:
        print(f"❌ Error in get_filters: {e}")
        return {
            "years": ['All', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'],
            "months": ['All', 'April', 'May', 'June', 'July', 'August', 'September',
                      'October', 'November', 'December', 'January', 'February', 'March'],
            "segments": ['All', 'centre', 'research', 'school'],
            "branches": ['All'],
            "units": ['Lakhs', 'Crores']
        }


@app.get("/api/pnl-measures")
def get_pnl_measures(
    source_year: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    unit: str = Query('Lakhs')
):
    key = make_key("pnl", source_year, month, segment, branch, unit)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        divisor = 10000000 if unit == 'Crores' else 100000
        df = get_financials(source_year=source_year, month=month, segment=segment, branch=branch)

        if df.empty:
            return {"Revenue": 0, "Direct Expense": 0, "Gross Profit": 0, "Gross Profit %": 0,
                    "Indirect Expense": 0, "EBITDA": 0, "EBITDA %": 0, "Depreciation": 0,
                    "EBIT": 0, "Interest": 0, "PBT": 0, "Tax": 0, "PAT": 0, "PAT %": 0}

        result = get_all_pnl_measures(df, divisor)
        cache_set(key, result)
        return result

    except Exception as e:
        print(f"❌ Error in get_pnl_measures: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pnl-table")
def get_pnl_table(
    source_year: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    unit: str = Query('Lakhs')
):
    key = make_key("pnl-table", source_year, month, segment, branch, unit)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        divisor = 10000000 if unit == 'Crores' else 100000
        df = get_financials(source_year=source_year, month=month, segment=segment, branch=branch)

        if df.empty:
            return {"rows": [], "columns": [], "data": {}}

        years = sorted(df['source_year'].unique()) if 'source_year' in df.columns else ['All']
        rows_config, result, years = build_pnl_table_data(df, years, divisor)
        out = {"rows": rows_config, "columns": years, "data": result}
        cache_set(key, out)
        return out

    except Exception as e:
        print(f"❌ Error in get_pnl_table: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/segment-data")
def get_segment_data(
    source_year: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    unit: str = Query('Lakhs')
):
    print("✅ NEW get_segment_data running")
    key = make_key("seg", source_year, month, unit)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        divisor = 10000000 if unit == 'Crores' else 100000
        df = get_financials(source_year=source_year, month=month)

        if df.empty or 'segment' not in df.columns:
            return []

        result = []
        valid_segments = [s for s in df['segment'].unique() if s and s.strip() != '']

        for seg in valid_segments:
            df_seg = df[
                (df['segment'] == seg) &
                (df['pnl_categories'] == 'Revenue')
            ]
            revenue = round(df_seg['value'].sum() / divisor, 2)

            if revenue == 0:
                continue

            m = get_all_pnl_measures(df[df['segment'] == seg], divisor)
            result.append({
                "segment": seg.title(),
                "revenue": revenue,
                "grossMargin": m['Gross Profit %']
            })

        cache_set(key, result)
        return result

    except Exception as e:
        print(f"❌ Error in get_segment_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/api/branch-data")
def get_branch_data(
    source_year: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    unit: str = Query('Lakhs')
):
    key = make_key("branch", source_year, segment, unit)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        divisor = 10000000 if unit == 'Crores' else 100000
        df = get_financials(source_year=source_year, segment=segment)

        if df.empty or 'branch' not in df.columns:
            return []

        result = []
        valid_branches = [b for b in df['branch'].unique() if b and b.strip() != '' and b.upper() != 'ALL']

        for branch in valid_branches:
            df_rev = df[
                (df['branch'] == branch) &
                (df['pnl_categories'] == 'Revenue')
            ]
            revenue = round(df_rev['value'].sum() / divisor, 2)

            if revenue == 0:
                continue

            m = get_all_pnl_measures(df[df['branch'] == branch], divisor)
            result.append({
                "branch": branch,
                "revenue": revenue,
                "grossMargin": m['Gross Profit %']
            })

        cache_set(key, result)
        return result

    except Exception as e:
        print(f"❌ Error in get_branch_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/research-category-data")
def get_research_category_data(
    source_year: Optional[str] = Query(None),
    unit: str = Query('Lakhs')
):
    key = make_key("research-cat", source_year, unit)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        divisor = 10000000 if unit == 'Crores' else 100000
        df = get_financials(source_year=source_year, segment='research')

        if df.empty or 'research_category' not in df.columns:
            return []

        result = []
        valid_cats = [c for c in df['research_category'].unique() if c and str(c).strip() != '']

        for cat in valid_cats:
            df_rev = df[
                (df['research_category'] == cat) &
                (df['pnl_categories'] == 'Revenue')
            ]
            revenue = round(df_rev['value'].sum() / divisor, 2)

            if revenue == 0:
                continue

            m = get_all_pnl_measures(df[df['research_category'] == cat], divisor)
            result.append({
                "category": cat,
                "revenue": revenue,
                "grossMargin": m['Gross Profit %']
            })

        cache_set(key, result)
        return result

    except Exception as e:
        print(f"❌ Error in get_research_category_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/monthly-student-trend")
def get_monthly_student_trend(
    source_year: Optional[str] = Query(None)
):
    key = make_key("student-trend", source_year)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        df = get_financials(source_year=source_year, segment='school')

        if df.empty or 'Student_name' not in df.columns:
            return []

        import pandas as pd
        df['month'] = pd.to_datetime(df['month'])
        df['month_name'] = df['month'].dt.strftime('%B')
        fy_order = {4:1,5:2,6:3,7:4,8:5,9:6,10:7,11:8,12:9,1:10,2:11,3:12}
        df['fy_sort'] = df['month'].dt.month.map(fy_order)

        result = []
        months_sorted = (
            df[['month_name', 'fy_sort']]
            .drop_duplicates()
            .sort_values('fy_sort')
        )

        for _, row in months_sorted.iterrows():
            df_month = df[df['month_name'] == row['month_name']]
            students = int(df_month['Student_name'].nunique())
            result.append({
                "month": row['month_name'],
                "students": students
            })

        cache_set(key, result)
        return result

    except Exception as e:
        print(f"❌ Error in get_monthly_student_trend: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/top-schools")
def get_top_schools(
    source_year: Optional[str] = Query(None),
    unit: str = Query('Lakhs')
):
    key = make_key("top-schools", source_year, unit)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        divisor = 10000000 if unit == 'Crores' else 100000
        df = get_financials(source_year=source_year, segment='school')

        if df.empty or 'Student_name' not in df.columns:
            return []

        df_rev = df[df['pnl_categories'] == 'Revenue']

        if df_rev.empty:
            return []

        school_revenue = (
            df_rev.groupby('Student_name')['value']
            .sum()
            .reset_index()
            .rename(columns={'Student_name': 'school', 'value': 'revenue'})
        )
        school_revenue['revenue'] = (school_revenue['revenue'] / divisor).round(2)
        school_revenue = school_revenue[school_revenue['revenue'] > 0]
        top10 = school_revenue.nlargest(10, 'revenue').to_dict(orient='records')

        cache_set(key, top10)
        return top10

    except Exception as e:
        print(f"❌ Error in get_top_schools: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/monthly-trend")
def get_monthly_trend(
    source_year: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    unit: str = Query('Lakhs')
):
    key = make_key("monthly", source_year, segment, branch, unit)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        divisor = 10000000 if unit == 'Crores' else 100000
        df = get_financials(source_year=source_year, segment=segment, branch=branch)

        if df.empty or 'month' not in df.columns:
            return []

        import pandas as pd

        df['month'] = pd.to_datetime(df['month'])
        df['month_name'] = df['month'].dt.strftime('%B')
        df['month_num'] = df['month'].dt.month

        # Financial year sort: April=1 ... March=12
        fy_order = {4:1,5:2,6:3,7:4,8:5,9:6,10:7,11:8,12:9,1:10,2:11,3:12}
        df['fy_sort'] = df['month_num'].map(fy_order)

        result = []
        # Always group by month name only — aggregates all years together
        months_sorted = (
            df[['month_name', 'fy_sort']]
            .drop_duplicates()
            .sort_values('fy_sort')
        )

        for _, row in months_sorted.iterrows():
            df_month = df[df['month_name'] == row['month_name']]
            revenue = round(
                df_month[df_month['pnl_categories'] == 'Revenue']['value'].sum() / divisor, 2
            )
            m = get_all_pnl_measures(df_month, divisor)
            result.append({
                "month": row['month_name'],
                "revenue": revenue,
                "grossMargin": m['Gross Profit %']
            })

        cache_set(key, result)
        return result

    except Exception as e:
        print(f"❌ Error in get_monthly_trend: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/impact-metrics")
def get_impact_metrics(
    source_year: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    key = make_key("impact", source_year, month, segment, branch)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        df = get_financials(source_year=source_year, month=month, segment=segment, branch=branch)

        if df.empty:
            return {"uniqueStudents": 0, "uniqueSchools": 0, "stemLabs": 0, "researchCount": 0}

        result = {
            "uniqueStudents": get_unique_students(df),
            "uniqueSchools": get_unique_schools(df),
            "stemLabs": get_stem_labs(df),
            "researchPapers": get_research_count(df, "Research Paper"), "researchCompetitions": get_research_count(df, "Research Competition"), "researchCount": get_research_count(df, "Research Paper") + get_research_count(df, "Research Competition")
        }
        cache_set(key, result)
        return result

    except Exception as e:
        print(f"❌ Error in get_impact_metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    filters: Optional[dict] = None

@app.post("/api/ai/chat")
def chat_with_ai(request: ChatRequest):
    try:
        response = ai_chat.chat(
            user_message=request.message,
            history=request.history,
            filters=request.filters,
        )
        return response
    except Exception as e:
        print(f"❌ Error in chat: {e}")
        return {"error": True, "message": f"Sorry, I encountered an error: {str(e)}", "history": request.history}


@app.post("/api/reindex")
def reindex_rag():
    """Force re-index the RAG system and clear cache (call after data updates)."""
    try:
        rag.index_financials(force_reindex=True)
        cache_clear()
        return {"success": True, "message": "RAG reindexed and cache cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cache/clear")
def clear_cache():
    """Manually clear the in-memory cache."""
    cache_clear()
    return {"success": True, "message": "Cache cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
