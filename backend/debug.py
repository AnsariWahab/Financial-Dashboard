# paste into a debug.py file and run: python debug.py
from database import get_financials

df = get_financials()
print("Total rows:", len(df))
print("Columns:", df.columns.tolist())
print("Month unique values:", df['month'].unique().tolist())
print("Segment unique values:", df['segment'].unique().tolist())
print("Branch unique values:", df['branch'].unique().tolist())
print("Sample rows:")
print(df[['month', 'segment', 'branch', 'pnl_categories', 'value']].head(10))


# add to debug.py and run again
from database import get_financials

df = get_financials()
print("source_year unique values:", df['source_year'].unique().tolist())
print("source_year dtype:", df['source_year'].dtype)

# Also test the filter directly
df2 = get_financials(source_year='FY24-25')
print("Rows with source_year='FY24-25':", len(df2))

# And check what month looks like after pandas conversion
import pandas as pd
df['month_parsed'] = pd.to_datetime(df['month'])
print("Sample months parsed:", df['month_parsed'].dt.strftime('%B').unique().tolist()[:5])

# Add to debug.py
df2 = get_financials()
import pandas as pd
df2['month'] = pd.to_datetime(df2['month'])

# Check April FY24-25 specifically
apr = df2[(df2['source_year'] == 'FY24_25') & (df2['month'].dt.month == 4)]
print(apr.groupby('pnl_categories')['value'].sum())