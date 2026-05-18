import pandas as pd
from decimal import Decimal

 
# ─────────────────────────────────────────────────────
# ADJUSTED BRANCH VALUE
# Python equivalent of your DAX Adjusted Branch Value measure.
# Allocates 'ALL' branch expenses proportionally to real branches
# based on their share of total segment revenue.
# ─────────────────────────────────────────────────────
def apply_adjusted_branch_value(df):
    if df.empty:
        return df

    df = df.copy()

    expense_categories = [
        'Direct Expense','Indirect Expense','Depreciation','Interest','Tax'
    ]

    # -----------------------------
    # Step 1: ALL expense
    # -----------------------------
    all_expense = df[
        (df['branch'].str.upper() == 'ALL') &
        (df['pnl_categories'].isin(expense_categories))
    ]['value'].sum()

    # -----------------------------
    # Step 2: Branch revenue
    # -----------------------------
    branch_revenue = df[
        (df['pnl_categories'] == 'Revenue') &
        (df['branch'].str.upper() != 'ALL')
    ].groupby('branch')['value'].sum()

    total_revenue = branch_revenue.sum()

    # -----------------------------
    # Step 3: Allocation per branch
    # -----------------------------
    if total_revenue == 0:
        allocation_map = {}
    else:
        allocation_map = {
            b: (rev / total_revenue) * all_expense
            for b, rev in branch_revenue.items()
        }

    # -----------------------------
    # Step 4: Precompute branch expense totals (🔥 key optimization)
    # -----------------------------
    branch_expense_total = df[
        df['pnl_categories'].isin(expense_categories)
    ].groupby('branch')['value'].sum()

    # -----------------------------
    # Step 5: Vectorized calculation
    # -----------------------------
    def compute_adj(row):
        branch = row['branch']
        value = row['value']

        if str(branch).upper() == 'ALL':
            return value

        if row['pnl_categories'] in expense_categories:
            total_exp = branch_expense_total.get(branch, 0)

            if total_exp == 0:
                return value

            alloc = allocation_map.get(branch, 0)

            proportional_alloc = (value / total_exp) * alloc

            return value + proportional_alloc

        return value

    # ⚡ Still apply, but now NO heavy computation inside
    df['adj_value'] = df.apply(compute_adj, axis=1)

    return df
 
 
# ─────────────────────────────────────────────────────
# CORE P&L MEASURES
# All functions below take a DataFrame (already filtered)
# and a divisor (from Units table) and return a number.
# ─────────────────────────────────────────────────────
 
def get_revenue(df, divisor=100000):
    """Total revenue. Excludes ALL branch rows to avoid double counting."""
    val = df[
        (df['pnl_categories'] == 'Revenue') &
        (df['branch'].str.upper() != 'ALL')
    ]['value'].sum()
    return round(val / divisor, 2) if divisor else 0
 
 
def get_direct_expense(df, divisor=100000):
    """Uses adj_value if available (post-allocation), else raw value."""
    col = 'adj_value' if 'adj_value' in df.columns else 'value'
    val = df[
        (df['pnl_categories'] == 'Direct Expense') &
        (df['branch'].str.upper() != 'ALL')
    ][col].sum()
    return round(val / divisor, 2)
 
 
def get_indirect_expense(df, divisor=100000):
    col = 'adj_value' if 'adj_value' in df.columns else 'value'
    val = df[
        (df['pnl_categories'] == 'Indirect Expense') &
        (df['branch'].str.upper() != 'ALL')
    ][col].sum()
    return round(val / divisor, 2)
 
 
def get_depreciation(df, divisor=100000):
    col = 'adj_value' if 'adj_value' in df.columns else 'value'
    val = df[
        (df['pnl_categories'] == 'Depreciation') &
        (df['branch'].str.upper() != 'ALL')
    ][col].sum()
    return round(val / divisor, 2)
 
 
def get_interest(df, divisor=100000):
    col = 'adj_value' if 'adj_value' in df.columns else 'value'
    val = df[
        (df['pnl_categories'] == 'Interest') &
        (df['branch'].str.upper() != 'ALL')
    ][col].sum()
    return round(val / divisor, 2)
 
 
def get_tax(df, divisor=100000):
    col = 'adj_value' if 'adj_value' in df.columns else 'value'
    val = df[
        (df['pnl_categories'] == 'Tax') &
        (df['branch'].str.upper() != 'ALL')
    ][col].sum()
    return round(val / divisor, 2)
 
 
def get_all_pnl_measures(df, divisor=100000):
    """
    Calculates ALL P&L measures at once.
    Returns a dict with every line item.
    Call this once per page load and pass the dict to charts and KPI cards.
    """
    df = apply_adjusted_branch_value(df)
 
    rev   = get_revenue(df, divisor)
    direx = get_direct_expense(df, divisor)
    gp    = round(rev - direx, 2)
    gp_pct = round((gp / rev * 100), 2) if rev != 0 else 0
 
    indirex = get_indirect_expense(df, divisor)
    ebitda  = round(gp - indirex, 2)
    ebitda_pct = round((ebitda / rev * 100), 2) if rev != 0 else 0
 
    dep  = get_depreciation(df, divisor)
    ebit = round(ebitda - dep, 2)
 
    interest = get_interest(df, divisor)
    pbt = round(ebit - interest, 2)
 
    tax = float(get_tax(df, divisor))  # Convert to float for JSON
    pat = round(pbt - tax, 2)
    pat_pct = round((pat / rev * 100), 2) if rev != 0 else 0
 
    return {
        'Revenue':          rev,
        'Direct Expense':   direx,
        'Gross Profit':     gp,
        'Gross Profit %':   gp_pct,
        'Indirect Expense': indirex,
        'EBITDA':           ebitda,
        'EBITDA %':         ebitda_pct,
        'Depreciation':     dep,
        'EBIT':             ebit,
        'Interest':         interest,
        'PBT':              pbt,
        'Tax':              tax,
        'PAT':              pat,
        'PAT %':            pat_pct,
    }
 
 
# ─────────────────────────────────────────────────────
# REVENUE WEIGHTAGE
# Python equivalent of your DAX Revenue Weightage measure.
# Used in Centre, Research, School Economics KPI cards.
# ─────────────────────────────────────────────────────
def get_revenue_weightage(df_filtered, df_segment_total):
    """
    df_filtered      -- DataFrame already filtered to a specific branch/category
    df_segment_total -- DataFrame for the full segment (e.g. all of 'centre')
    Returns weightage as a percentage (0–100).
    """
    branch_rev = df_filtered[df_filtered['pnl_categories'] == 'Revenue']['value'].sum()
    segment_rev = df_segment_total[df_segment_total['pnl_categories'] == 'Revenue']['value'].sum()
    if segment_rev == 0:
        return 0
    return round((branch_rev / segment_rev) * 100, 2)
 
 
# ─────────────────────────────────────────────────────
# OPERATIONAL KPIs — IMPACT METRICS PAGE
# ─────────────────────────────────────────────────────
def get_unique_schools(df):
    """COUNT DISTINCT Student_name WHERE segment = school"""
    if 'Student_name' not in df.columns:
        return 0
    return int(df[df['segment'] == 'school']['Student_name'].nunique())
 
 
def get_stem_labs(df):
    """COUNT DISTINCT Student_name WHERE segment=school AND school_type=STEM LAB"""
    if 'Student_name' not in df.columns or 'school_type' not in df.columns:
        return 0
    return int(df[
        (df['segment'] == 'school') &
        (df['school_type'].str.upper() == 'STEM LAB')
    ]['Student_name'].nunique())
 
 
def get_research_count(df, category):
    """
    COUNT DISTINCT rows where research_category matches.
    Used for Research Papers and Research Competitions.
    """
    if 'research_category' not in df.columns or 'id' not in df.columns:
        return 0
    return int(df[df['research_category'] == category]['id'].nunique())
 
 
def get_unique_students(df, segment=None):
    """
    COUNT DISTINCT Student_name for a given segment.
    If segment is None, excludes 'school' segment (Overview page).
    """
    if 'Student_name' not in df.columns:
        return 0
    if segment:
        filtered = df[df['segment'] == segment]
    else:
        filtered = df[df['segment'] != 'school']
    return int(filtered['Student_name'].nunique())
 
 
# ─────────────────────────────────────────────────────
# P&L TABLE BUILDER
# Builds the structured P&L data for the Plotly Table chart.
# Includes indentation markers and bold flags.
# ─────────────────────────────────────────────────────
def build_pnl_table_data(df, years, divisor=100000):
    """
    Builds P&L rows for each year column.
    Returns a dict of {row_label: [val_yr1, val_yr2, ...]},
    plus indent and bold metadata for formatting.
    """
    rows_config = [
        {'label': 'Revenue',          'indent': 0, 'bold': True,  'type': 'revenue'},
        {'label': '  Direct Expense', 'indent': 1, 'bold': False, 'type': 'direct_expense'},
        {'label': 'Gross Profit',     'indent': 0, 'bold': True,  'type': 'gross_profit'},
        {'label': '  Indirect Exp',   'indent': 1, 'bold': False, 'type': 'indirect_expense'},
        {'label': 'EBITDA',           'indent': 0, 'bold': True,  'type': 'ebitda'},
        {'label': '  Depreciation',   'indent': 1, 'bold': False, 'type': 'depreciation'},
        {'label': 'EBIT',             'indent': 0, 'bold': True,  'type': 'ebit'},
        {'label': '  Interest',       'indent': 1, 'bold': False, 'type': 'interest'},
        {'label': 'PBT',              'indent': 0, 'bold': True,  'type': 'pbt'},
        {'label': '  Tax',            'indent': 1, 'bold': False, 'type': 'tax'},
        {'label': 'PAT',              'indent': 0, 'bold': True,  'type': 'pat'},
    ]
 
    result = {r['label']: [] for r in rows_config}
 
    for year in years:
        df_yr = df[df['source_year'] == year] if 'source_year' in df.columns and year != 'All' else df
        m = get_all_pnl_measures(df_yr, divisor)
        mapping = {
            'revenue': m['Revenue'],           'direct_expense': m['Direct Expense'],
            'gross_profit': m['Gross Profit'],  'indirect_expense': m['Indirect Expense'],
            'ebitda': m['EBITDA'],              'depreciation': m['Depreciation'],
            'ebit': m['EBIT'],                  'interest': m['Interest'],
            'pbt': m['PBT'],                    'tax': m['Tax'],
            'pat': m['PAT'],
        }
        for r in rows_config:
            result[r['label']].append(mapping[r['type']])
 
    return rows_config, result, years
