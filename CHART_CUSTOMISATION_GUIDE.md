# Chart Customisation Guide
### Financial Dashboard — Recharts Reference

Every chart in this dashboard is built with **Recharts**.  
This document covers every visual property you can change, exactly where to find it, and what to write.

---

## File Map — Which File Has Which Charts

| File | Charts Inside |
|---|---|
| `src/components/Overview.tsx` | Segment-wise Bar Chart, Monthly Revenue & Profit Line Chart |
| `src/components/CentreEconomics.tsx` | Monthly Revenue & Profit Line Chart, Monthly Expenses Bar Chart |
| `src/components/ResearchEconomics.tsx` | Monthly Revenue & Profit Line Chart, Monthly Expenses Bar Chart |
| `src/components/SchoolEconomics.tsx` | Monthly Revenue & Profit Line Chart, Monthly Expenses Bar Chart |

---

## 1. Chart Height

**Problem:** Chart is too short or too tall.

Find `height={300}` inside `<ResponsiveContainer>` and change the number.

```tsx
// Before — 300px tall
<ResponsiveContainer width="100%" height={300}>

// After — 400px tall
<ResponsiveContainer width="100%" height={400}>
```

> Applies to every chart in every file. Each chart has its own `height` value you can change independently.

---

## 2. Chart Width

Charts use `width="100%"` which means they fill their parent container automatically.  
To make a chart narrower, wrap it in a div with a max-width:

```tsx
<div style={{ maxWidth: '600px' }}>
  <ResponsiveContainer width="100%" height={300}>
    ...
  </ResponsiveContainer>
</div>
```

---

## 3. Bar Colors

**Problem:** Bar colors are wrong or you want to change them.

Find `<Bar>` and change the `fill` prop.

```tsx
// Current — blue revenue bar
<Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />

// Change to dark blue
<Bar dataKey="revenue" fill="#1d4ed8" name="Revenue" />

// Change to teal
<Bar dataKey="revenue" fill="#0d9488" name="Revenue" />
```

**All bar colors in the codebase:**

| File | Bar | Current Color | Prop to change |
|---|---|---|---|
| `Overview.tsx` | Revenue | `#3b82f6` (blue) | `fill` on first `<Bar>` |
| `Overview.tsx` | Gross Profit | `#10b981` (green) | `fill` on second `<Bar>` |
| `CentreEconomics.tsx` | Expenses | `#ef4444` (red) | `fill` on `<Bar>` |
| `ResearchEconomics.tsx` | Expenses | `#ef4444` (red) | `fill` on `<Bar>` |
| `SchoolEconomics.tsx` | Expenses | `#ef4444` (red) | `fill` on `<Bar>` |

**Useful color values:**

```
Blue:    #3b82f6   Dark Blue:  #1d4ed8   Indigo:  #6366f1
Green:   #10b981   Dark Green: #059669   Teal:    #0d9488
Red:     #ef4444   Orange:     #f97316   Amber:   #f59e0b
Purple:  #8b5cf6   Pink:       #ec4899   Gray:    #6b7280
```

---

## 4. Line Colors

**Problem:** Line colors are wrong or hard to see.

Find `<Line>` and change the `stroke` prop.

```tsx
// Current — blue revenue line
<Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />

// Change stroke color
<Line type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={2} name="Revenue" />
```

**All line colors in the codebase:**

| File | Line | Current Color | Prop to change |
|---|---|---|---|
| `Overview.tsx` | Revenue | `#3b82f6` (blue) | `stroke` on first `<Line>` |
| `Overview.tsx` | Profit | `#10b981` (green) | `stroke` on second `<Line>` |
| `CentreEconomics.tsx` | Revenue | `#3b82f6` (blue) | `stroke` on first `<Line>` |
| `CentreEconomics.tsx` | Profit | `#10b981` (green) | `stroke` on second `<Line>` |
| `ResearchEconomics.tsx` | Revenue | `#3b82f6` (blue) | `stroke` on first `<Line>` |
| `ResearchEconomics.tsx` | Profit | `#10b981` (green) | `stroke` on second `<Line>` |
| `SchoolEconomics.tsx` | Revenue | `#f97316` (orange) | `stroke` on first `<Line>` |
| `SchoolEconomics.tsx` | Profit | `#10b981` (green) | `stroke` on second `<Line>` |

---

## 5. Line Thickness

**Problem:** Lines are too thin or too thick.

Change `strokeWidth` on `<Line>`:

```tsx
// Thin
<Line strokeWidth={1} ... />

// Default
<Line strokeWidth={2} ... />

// Thick
<Line strokeWidth={4} ... />
```

---

## 6. Line Style (solid vs dashed vs dotted)

Add `strokeDasharray` to `<Line>`:

```tsx
// Solid (default)
<Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />

// Dashed
<Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Revenue" />

// Dotted
<Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} strokeDasharray="1 4" name="Revenue" />
```

---

## 7. Dots on Lines (show/hide/resize)

```tsx
// Hide dots
<Line ... dot={false} />

// Default dots (visible on hover only)
<Line ... />

// Always-visible large dots
<Line ... dot={{ r: 6 }} activeDot={{ r: 8 }} />

// Custom dot color
<Line ... dot={{ r: 4, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }} />
```

---

## 8. Line Curve Style

Change `type` on `<Line>`:

```tsx
// Smooth curve (current)
<Line type="monotone" ... />

// Straight lines between points
<Line type="linear" ... />

// Step-style
<Line type="step" ... />

// Natural curve
<Line type="natural" ... />
```

---

## 9. Y-Axis — Values Not Visible / Wrong Scale

**Problem:** Y-axis numbers are cut off, too small, or showing wrong range.

```tsx
// Current
<YAxis tick={{ fontSize: 12 }} />

// Larger font
<YAxis tick={{ fontSize: 14 }} />

// Set manual range (e.g. 0 to 200)
<YAxis tick={{ fontSize: 12 }} domain={[0, 200]} />

// Auto range with 10% padding above highest value
<YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} />

// Add ₹ prefix to Y-axis labels
<YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />

// Wider Y-axis so numbers don't get clipped
<YAxis tick={{ fontSize: 12 }} width={80} />
```

> **Most common reason Y values are invisible:** The axis `width` is too small and the numbers are clipped. Add `width={80}` to fix it.

---

## 10. X-Axis — Labels Not Visible / Overlapping

**Problem:** X-axis labels are too small, overlapping, or cut off.

```tsx
// Current
<XAxis dataKey="month" tick={{ fontSize: 12 }} />

// Larger font
<XAxis dataKey="month" tick={{ fontSize: 14 }} />

// Rotate labels 45° to prevent overlap (useful for many months)
<XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />

// Custom color
<XAxis dataKey="month" tick={{ fontSize: 12, fill: '#374151' }} />

// Hide X-axis entirely
<XAxis dataKey="month" hide />
```

> **If X labels overlap:** Add `angle={-45} textAnchor="end" height={60}` — this rotates them diagonally and adds room below the axis.

---

## 11. Axis Label (the axis title text)

To add a label to an axis (e.g. "Month" or "₹ Lakhs"):

```tsx
// Y-axis with title
<YAxis
  tick={{ fontSize: 12 }}
  label={{ value: '₹ Lakhs', angle: -90, position: 'insideLeft', offset: 10 }}
/>

// X-axis with title
<XAxis
  dataKey="month"
  tick={{ fontSize: 12 }}
  label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
/>
```

---

## 12. Legend — Not Visible / Wrong Position / Wrong Style

**Problem:** Legend is missing, in the wrong place, or too small.

```tsx
// Current — default legend (bottom, horizontal)
<Legend />

// Top of chart
<Legend verticalAlign="top" />

// Right side
<Legend layout="vertical" verticalAlign="middle" align="right" />

// Larger font
<Legend wrapperStyle={{ fontSize: '14px' }} />

// Custom icon type (circle / square / line / diamond)
<Legend iconType="circle" />

// Hide legend entirely (if you want to remove it)
// — just delete the <Legend /> line

// Full custom legend style
<Legend
  verticalAlign="bottom"
  align="center"
  iconType="circle"
  wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }}
/>
```

---

## 13. Tooltip — Values Not Formatted / Missing ₹ Symbol

**Problem:** Tooltip shows raw numbers without currency symbol or decimal places.

```tsx
// Current — shows ₹ with 2 decimal places
<Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />

// Show no decimals
<Tooltip formatter={(value) => `₹${Number(value).toFixed(0)}`} />

// Show with comma separators (e.g. ₹1,23,456)
<Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />

// Add label to each tooltip line
<Tooltip formatter={(value, name) => [`₹${Number(value).toFixed(2)}`, name]} />

// Custom tooltip title (the date/month shown at top of tooltip)
<Tooltip
  formatter={(value) => `₹${Number(value).toFixed(2)}`}
  labelFormatter={(label) => `Month: ${label}`}
/>

// Style the tooltip box itself
<Tooltip
  formatter={(value) => `₹${Number(value).toFixed(2)}`}
  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
  labelStyle={{ color: '#9ca3af' }}
/>
```

---

## 14. Grid Lines — Show / Hide / Style

```tsx
// Current — light dashed grid
<CartesianGrid strokeDasharray="3 3" />

// No dashes (solid lines)
<CartesianGrid strokeDasharray="0" />

// Hide grid entirely — delete the line or:
// (just remove <CartesianGrid /> from the chart)

// Custom color
<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

// Only horizontal lines (no vertical)
<CartesianGrid strokeDasharray="3 3" vertical={false} />

// Only vertical lines (no horizontal)
<CartesianGrid strokeDasharray="3 3" horizontal={false} />
```

---

## 15. Bar Width (how thick individual bars are)

```tsx
// Auto width (default — fills available space)
<Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />

// Fixed pixel width
<Bar dataKey="revenue" fill="#3b82f6" name="Revenue" barSize={30} />

// Thin bars
<Bar dataKey="revenue" fill="#3b82f6" name="Revenue" barSize={15} />
```

---

## 16. Bar Rounded Corners

```tsx
// Rounded top corners
<Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
// radius={[topLeft, topRight, bottomRight, bottomLeft]}

// Fully rounded (pill shape)
<Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={8} />
```

---

## 17. Value Labels ON the Bars/Lines (data labels)

To show the actual number on top of each bar:

```tsx
import { LabelList } from 'recharts';

// Inside <Bar>:
<Bar dataKey="revenue" fill="#3b82f6" name="Revenue">
  <LabelList dataKey="revenue" position="top" formatter={(v: number) => `₹${v.toFixed(1)}`} style={{ fontSize: 11, fill: '#374151' }} />
</Bar>

// Inside <Line>:
<Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue">
  <LabelList dataKey="revenue" position="top" formatter={(v: number) => `₹${v.toFixed(1)}`} style={{ fontSize: 11, fill: '#374151' }} />
</Line>
```

> **Note:** You need to add `LabelList` to your import at the top of the file:
> ```tsx
> import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
> ```

---

## 18. Chart Background Color

The chart background is controlled by the **wrapper div**, not Recharts itself.

```tsx
// Current
<div className="bg-white p-6 rounded-lg shadow-md">

// Light gray background
<div className="bg-gray-50 p-6 rounded-lg shadow-md">

// Dark background
<div className="bg-gray-900 p-6 rounded-lg shadow-md">

// Custom color with inline style
<div style={{ backgroundColor: '#f0f9ff' }} className="p-6 rounded-lg shadow-md">
```

---

## 19. Chart Title

The title is an `<h3>` tag above each `<ResponsiveContainer>`.

```tsx
// Current
<h3 className="text-lg font-semibold mb-4 text-gray-900">Monthly Revenue & Profit</h3>

// Larger title
<h3 className="text-xl font-bold mb-4 text-gray-900">Monthly Revenue & Profit</h3>

// Different color
<h3 className="text-lg font-semibold mb-4 text-blue-700">Monthly Revenue & Profit</h3>

// Change the text — just edit the string inside the tag
<h3 className="text-lg font-semibold mb-4 text-gray-900">Revenue vs Profit Trend</h3>
```

---

## 20. Swap Chart Type (Bar ↔ Line ↔ Area)

### Bar → Line

```tsx
// Remove
import { BarChart, Bar, ... } from 'recharts';
<BarChart data={monthlyData}>
  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
</BarChart>

// Replace with
import { LineChart, Line, ... } from 'recharts';
<LineChart data={monthlyData}>
  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
</LineChart>
```

### Bar → Area

```tsx
import { AreaChart, Area, ... } from 'recharts';

<AreaChart data={monthlyData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
  <YAxis tick={{ fontSize: 12 }} />
  <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
  <Legend />
  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#fecaca" name="Expenses" />
</AreaChart>
```

> The `fill` on `<Area>` is the shaded area color. Use a lighter shade of the `stroke` color.

---

## 21. Add a Reference / Target Line

Useful for showing a budget target or threshold:

```tsx
import { ReferenceLine } from 'recharts';

// Inside any chart, after <CartesianGrid>:
<ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Target', fill: '#f59e0b', fontSize: 12 }} />
```

---

## 22. Add a New Data Series (extra bar or line)

In `Overview.tsx` Segment chart — add a third bar for Indirect Expense:

```tsx
<Bar dataKey="revenue"     fill="#3b82f6" name="Revenue" />
<Bar dataKey="grossProfit" fill="#10b981" name="Gross Profit" />
<Bar dataKey="indirectExpense" fill="#f59e0b" name="Indirect Expense" />  {/* ← new */}
```

> The `dataKey` must match a field name in the data returned by your API.  
> Check `src/services/api.ts` for the exact field names in each interface.

---

## 23. Which `dataKey` Names Are Available

These come from your API response types in `src/services/api.ts`:

**`MonthlyTrend`** (used in all Monthly charts):
```
month        — X-axis label (e.g. "Apr 2024")
revenue      — revenue value
expenses     — total expenses
profit       — profit value
```

**`SegmentData`** (used in Overview segment chart):
```
segment      — X-axis label ("Centre", "Research", "School")
revenue      — revenue value
grossProfit  — gross profit value
grossMargin  — gross margin percentage
```

> If a `dataKey` doesn't match a field name exactly (case-sensitive), the bar/line will be invisible with no error. Double-check spelling if a series disappears.

---

## 24. Margin / Padding Around the Chart

Add `margin` to the chart component to prevent labels from being clipped:

```tsx
<BarChart data={segmentData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
```

```tsx
<LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
```

> **Common fix:** If Y-axis numbers are clipped on the left, add `margin={{ left: 20 }}`.  
> If the top of bars or dots are cut off, add `margin={{ top: 20 }}`.

---

## 25. Responsive Behaviour (mobile)

All charts use `<ResponsiveContainer width="100%" height={300}>` which already makes them responsive. If charts look bad on mobile:

```tsx
// Use a smaller height on mobile via a JS variable
const chartHeight = window.innerWidth < 640 ? 200 : 300;

<ResponsiveContainer width="100%" height={chartHeight}>
```

Or hide the legend on mobile to save space:

```tsx
<Legend wrapperStyle={{ fontSize: window.innerWidth < 640 ? '11px' : '13px' }} />
```

---

## Quick Reference — Most Common Fixes

| Problem | What to change | Where |
|---|---|---|
| Chart is blank / empty | Check `dataKey` spelling matches API field name exactly | The `<Bar>` or `<Line>` prop |
| Y-axis numbers cut off | Add `width={80}` to `<YAxis>` | Inside the chart |
| X-axis labels overlapping | Add `angle={-45} textAnchor="end" height={60}` to `<XAxis>` | Inside the chart |
| Legend missing | Add `<Legend />` inside the chart | After `<CartesianGrid>` |
| Legend text too small | Add `wrapperStyle={{ fontSize: '14px' }}` to `<Legend>` | The `<Legend>` prop |
| Tooltip has no ₹ symbol | Set `formatter={(value) => \`₹${Number(value).toFixed(2)}\`}` | The `<Tooltip>` prop |
| Bar color wrong | Change `fill` on `<Bar>` | The `<Bar>` prop |
| Line color wrong | Change `stroke` on `<Line>` | The `<Line>` prop |
| Values on bars missing | Add `<LabelList>` inside `<Bar>` | Requires LabelList import |
| Chart too short | Increase `height={300}` on `<ResponsiveContainer>` | Wrapping the chart |
| No data in chart | API returned empty array — check backend is running | `fetchData()` in the component |
