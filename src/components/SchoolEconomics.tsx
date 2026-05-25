import { useState, useEffect } from 'react';
import { TrendingUp, Users, School, GraduationCap, IndianRupee } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Bar, Line, LabelList,
  BarChart
} from 'recharts';
import { api, PnLMeasures, MonthlyTrend, ImpactMetrics } from '../services/api';
import InsightsPanel from './InsightsPanel';

interface TopSchool {
  school: string;
  revenue: number;
}

export const SchoolEconomics = () => {
  const [pnlData,        setPnlData]        = useState<PnLMeasures | null>(null);
  const [monthlyData,    setMonthlyData]    = useState<MonthlyTrend[]>([]);
  const [impactData,     setImpactData]     = useState<ImpactMetrics | null>(null);
  const [topSchools,     setTopSchools]     = useState<TopSchool[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [unit,           setUnit]           = useState('Lakhs');
  const [sourceYear,     setSourceYear]     = useState('FY25-26');
  const [availableYears, setAvailableYears] = useState<string[]>(['All']);

  const SEGMENT = 'school';

  useEffect(() => {
    loadFilters();
    fetchData(true);
  }, []);

  useEffect(() => {
    if (!loading) fetchData(false);
  }, [unit, sourceYear]);

  const loadFilters = async () => {
    try {
      const filters = await api.getFilters();
      setAvailableYears(filters.years ?? ['All']);
    } catch (e) {
      console.error('Error loading filters:', e);
    }
  };

  const fetchData = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    else setRefreshing(true);

    try {
      const [pnl, monthly, impact] = await Promise.all([
        api.getPnLMeasures({ segment: SEGMENT, unit, source_year: sourceYear }),
        api.getMonthlyTrend({ segment: SEGMENT, unit, source_year: sourceYear }),
        api.getImpactMetrics({ segment: SEGMENT, source_year: sourceYear }),
      ]);
      setPnlData(pnl);
      setMonthlyData(monthly);
      setImpactData(impact);

      const schoolRes = await fetch(
        `http://localhost:8000/api/top-schools?unit=${unit}${sourceYear !== 'All' ? `&source_year=${sourceYear}` : ''}`
      );
      if (schoolRes.ok) setTopSchools(await schoolRes.json());

    } catch (e) {
      console.error('Error fetching school data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading || !pnlData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading school data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-lg shadow-md flex items-center gap-3">
        <GraduationCap className="w-6 h-6 text-orange-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">School Economics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">School segment financial performance and student metrics</p>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 px-5 py-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Year:</span>
          <select
            value={sourceYear}
            onChange={(e) => setSourceYear(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Unit:</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="Lakhs">Lakhs</option>
            <option value="Crores">Crores</option>
          </select>
        </div>

        {refreshing && (
          <span className="text-xs text-orange-500 animate-pulse ml-auto">Updating...</span>
        )}

      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Revenue"
          value={`₹${pnlData.Revenue.toFixed(2)}`}
          unit={unit}
          icon={<IndianRupee className="w-6 h-6" />}
          color="bg-orange-600"
          positive={pnlData.Revenue >= 0}
        />
        <MetricCard
          title="Gross Profit %"
          value={`${pnlData['Gross Profit %'].toFixed(1)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="bg-green-600"
          positive={pnlData['Gross Profit %'] >= 0}
        />
        <MetricCard
          title="Unique Students"
          value={impactData?.uniqueStudents.toLocaleString() || '0'}
          icon={<Users className="w-6 h-6" />}
          color="bg-blue-600"
          positive={true}
        />
        <MetricCard
          title="Unique Schools"
          value={impactData?.uniqueSchools.toLocaleString() || '0'}
          icon={<School className="w-6 h-6" />}
          color="bg-purple-600"
          positive={true}
        />
        <MetricCard
          title="STEM Labs"
          value={impactData?.stemLabs.toLocaleString() || '0'}
          icon={<GraduationCap className="w-6 h-6" />}
          color="bg-pink-600"
          positive={true}
        />
      </div>

      {/* ── P&L Summary Table ── */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">P&L Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Particulars</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount ({unit})</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">%</th>
              </tr>
            </thead>
            <tbody>
              <PnLRow label="Revenue"            value={pnlData.Revenue}             percent={100}                                                        bold />
              <PnLRow label="  Direct Expense"   value={pnlData['Direct Expense']}   percent={(pnlData['Direct Expense']   / pnlData.Revenue) * 100}      indent />
              <PnLRow label="Gross Profit"        value={pnlData['Gross Profit']}     percent={pnlData['Gross Profit %']}                                  bold />
              <PnLRow label="  Indirect Expense" value={pnlData['Indirect Expense']} percent={(pnlData['Indirect Expense'] / pnlData.Revenue) * 100}      indent />
              <PnLRow label="EBITDA"              value={pnlData.EBITDA}              percent={pnlData['EBITDA %']}                                        bold />
              <PnLRow label="  Depreciation"     value={pnlData.Depreciation}        percent={(pnlData.Depreciation        / pnlData.Revenue) * 100}      indent />
              <PnLRow label="EBIT"               value={pnlData.EBIT}                percent={(pnlData.EBIT                / pnlData.Revenue) * 100}      bold />
              <PnLRow label="  Interest"         value={pnlData.Interest}            percent={(pnlData.Interest            / pnlData.Revenue) * 100}      indent />
              <PnLRow label="PBT"                value={pnlData.PBT}                 percent={(pnlData.PBT                 / pnlData.Revenue) * 100}      bold />
              <PnLRow label="  Tax"              value={pnlData.Tax}                 percent={(pnlData.Tax                 / pnlData.Revenue) * 100}      indent />
              <PnLRow label="PAT"                value={pnlData.PAT}                 percent={pnlData['PAT %']}                                           bold />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Revenue & Gross Margin */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Monthly Revenue & Gross Margin</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                domain={[
                  (dataMin: number) => dataMin < 0 ? Math.floor(dataMin * 1.1) : 0,
                  (dataMax: number) => Math.ceil(dataMax * 1.1)
                ]}
                label={{ value: `₹ (${unit})`, angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11 } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                domain={['auto', 'auto']}
                label={{ value: 'Gross Margin %', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 11 } }}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Gross Margin %') return [`${Number(value).toFixed(1)}%`, name];
                  return [`₹${Number(value).toFixed(2)}`, name];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#f97316" name="Revenue">
                <LabelList
                  dataKey="revenue"
                  position="top"
                  formatter={(v: number) => `₹${v.toFixed(1)}`}
                  style={{ fontSize: 10, fill: '#c2410c', fontWeight: 600 }}
                />
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="grossMargin"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 5, fill: '#f59e0b' }}
                name="Gross Margin %"
                label={{
                  position: 'top',
                  formatter: (v: number) => `${v.toFixed(1)}%`,
                  style: { fontSize: 10, fill: '#b45309', fontWeight: 600 }
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Top 10 Schools by Revenue */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Top 10 Schools by Revenue</h3>
          {topSchools.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
              No school data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={topSchools}
                layout="vertical"
                margin={{ left: 10, right: 60, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                <YAxis
                  type="category"
                  dataKey="school"
                  tick={{ fontSize: 10 }}
                  width={120}
                />
                <Tooltip formatter={(v: number) => [`₹${v.toFixed(2)} ${unit}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#f97316" name="Revenue">
                  <LabelList
                    dataKey="revenue"
                    position="right"
                    formatter={(v: number) => `₹${v.toFixed(1)}`}
                    style={{ fontSize: 10, fill: '#c2410c', fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* ── AI Insights (replaces old School Segment Insights) ── */}
      <InsightsPanel sourceYear={sourceYear} segment="school" unit={unit} />

    </div>
  );
};

// ── MetricCard ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  positive: boolean;
}

const MetricCard = ({ title, value, unit, icon, color, positive }: MetricCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${positive ? 'text-gray-900 dark:text-gray-100' : 'text-red-600'}`}>{value}</p>
          {unit && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{unit}</p>}
        </div>
        <div className={`p-3 rounded-full ${color} text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// ── PnLRow ──────────────────────────────────────────────────────────────────

interface PnLRowProps {
  label: string;
  value: number;
  percent: number;
  bold?: boolean;
  indent?: boolean;
}

const PnLRow = ({ label, value, percent, bold, indent }: PnLRowProps) => {
  const isNegative = value < 0;
  return (
    <tr className={`border-b border-gray-100 dark:border-gray-700 ${bold ? 'bg-gray-50 dark:bg-gray-700 font-semibold' : ''}`}>
      <td className={`py-3 px-4 text-gray-900 dark:text-gray-100 ${indent ? 'pl-8 text-sm' : ''}`}>{label}</td>
      <td className={`text-right py-3 px-4 ${isNegative ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
        ₹{value.toFixed(2)}
      </td>
      <td className={`text-right py-3 px-4 ${isNegative ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
        {percent.toFixed(1)}%
      </td>
    </tr>
  );
};