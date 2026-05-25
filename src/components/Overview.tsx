import { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Activity, Users, IndianRupee } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Bar, Line, LabelList
} from 'recharts';
import { api, PnLMeasures, SegmentData, MonthlyTrend, ImpactMetrics } from '../services/api';
import InsightsPanel from './InsightsPanel';

export const Overview = () => {
  const [pnlData, setPnlData] = useState<PnLMeasures | null>(null);
  const [segmentData, setSegmentData] = useState<SegmentData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyTrend[]>([]);
  const [impactData, setImpactData] = useState<ImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unit, setUnit] = useState('Lakhs');
  const [sourceYear, setSourceYear] = useState('FY25-26');
  const [availableYears, setAvailableYears] = useState<string[]>(['All']);

  useEffect(() => {
    loadFilters();
    fetchData(true);
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchData(false);
    }
  }, [unit, sourceYear]);

  const loadFilters = async () => {
    try {
      const filters = await api.getFilters();
      setAvailableYears(filters.years ?? ['All']);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const fetchData = async (isFirstLoad = false) => {
    if (isFirstLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [pnl, segments, monthly, impact] = await Promise.all([
        api.getPnLMeasures({ unit, source_year: sourceYear }),
        api.getSegmentData({ unit, source_year: sourceYear }),
        api.getMonthlyTrend({ unit, source_year: sourceYear }),
        api.getImpactMetrics()
      ]);
      setPnlData(pnl);
      setSegmentData(segments);
      setMonthlyData(monthly);
      setImpactData(impact);
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading || !pnlData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 px-5 py-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">

        {/* Source Year */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Year:</span>
          <select
            value={sourceYear}
            onChange={(e) => setSourceYear(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Unit */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Unit:</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="Lakhs">Lakhs</option>
            <option value="Crores">Crores</option>
          </select>
        </div>

        {refreshing && (
          <span className="text-xs text-blue-500 animate-pulse ml-auto">Updating...</span>
        )}

      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`₹${pnlData.Revenue.toFixed(2)}`}
          change={unit}
          icon={<IndianRupee className="w-6 h-6" />}
          positive={true}
        />
        <MetricCard
          title="Gross Profit %"
          value={`${pnlData['Gross Profit %'].toFixed(1)}%`}
          change="Gross Margin"
          icon={<TrendingUp className="w-6 h-6" />}
          positive={pnlData['Gross Profit %'] >= 0}
        />
        <MetricCard
          title="EBITDA %"
          value={`${pnlData['EBITDA %'].toFixed(1)}%`}
          change="EBITDA Margin"
          icon={<PieChart className="w-6 h-6" />}
          positive={pnlData['EBITDA %'] >= 0}
        />
        <MetricCard
          title="PAT"
          value={`₹${pnlData.PAT.toFixed(2)}`}
          change={`${pnlData['PAT %'].toFixed(1)}% margin`}
          icon={<Activity className="w-6 h-6" />}
          positive={pnlData.PAT >= 0}
        />
        <MetricCard
          title="Unique Students"
          value={impactData?.uniqueStudents.toLocaleString() || '0'}
          change="Students Impacted"
          icon={<Users className="w-6 h-6" />}
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

        {/* Segment-wise Performance */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Segment-wise Performance</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={segmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="segment" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                domain={[
                  (dataMin: number) => dataMin < 0 ? Math.floor(dataMin * 1.1) : 0,
                  (dataMax: number) => Math.ceil(dataMax * 1.1)
                ]}
                label={{
                  value: `₹ (${unit})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 11 }
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                domain={['auto', 'auto']}
                label={{
                  value: 'Gross Margin %',
                  angle: 90,
                  position: 'insideRight',
                  offset: 10,
                  style: { fontSize: 11 }
                }}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Gross Margin %') return [`${Number(value).toFixed(1)}%`, name];
                  return [`₹${Number(value).toFixed(2)}`, name];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue">
                <LabelList
                  dataKey="revenue"
                  position="top"
                  formatter={(v: number) => `₹${v.toFixed(1)}`}
                  style={{ fontSize: 11, fill: '#1e40af', fontWeight: 600 }}
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
                  style: { fontSize: 11, fill: '#b45309', fontWeight: 600 }
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

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
                label={{
                  value: `₹ (${unit})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 11 }
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                domain={['auto', 'auto']}
                label={{
                  value: 'Gross Margin %',
                  angle: 90,
                  position: 'insideRight',
                  offset: 10,
                  style: { fontSize: 11 }
                }}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Gross Margin %') return [`${Number(value).toFixed(1)}%`, name];
                  return [`₹${Number(value).toFixed(2)}`, name];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue">
                <LabelList
                  dataKey="revenue"
                  position="top"
                  formatter={(v: number) => `₹${v.toFixed(1)}`}
                  style={{ fontSize: 10, fill: '#1e40af', fontWeight: 600 }}
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

      </div>

      {/* ── AI Insights (replaces old Key Insights) ── */}
      <InsightsPanel sourceYear={sourceYear} segment="overview" unit={unit} />

    </div>
  );
};

// ── MetricCard ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  positive: boolean;
}

const MetricCard = ({ title, value, change, icon, positive }: MetricCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className={`text-sm mt-1 ${positive ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </p>
        </div>
        <div className={`p-3 rounded-full ${positive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
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