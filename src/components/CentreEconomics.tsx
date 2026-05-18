import { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Activity, Building2, IndianRupee } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Bar, Line, LabelList
} from 'recharts';
import { api, PnLMeasures, MonthlyTrend, BranchData } from '../services/api';

export const CentreEconomics = () => {
  const [pnlData,        setPnlData]        = useState<PnLMeasures | null>(null);
  const [monthlyData,    setMonthlyData]    = useState<MonthlyTrend[]>([]);
  const [branchData,     setBranchData]     = useState<BranchData[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [unit,           setUnit]           = useState('Lakhs');
  const [sourceYear,     setSourceYear]     = useState('FY25-26');
  const [availableYears, setAvailableYears] = useState<string[]>(['All']);

  const SEGMENT = 'centre';
  const EXCLUDED_BRANCHES_FY25_26 = ['Lokhandwala', 'CNMS', 'GK Gurukul'];

  const filteredBranchData =
    sourceYear === 'FY25-26' || sourceYear === 'FY25_26'
      ? branchData.filter(b => !EXCLUDED_BRANCHES_FY25_26.includes(b.branch))
      : branchData;

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
      const [pnl, monthly, branches] = await Promise.all([
        api.getPnLMeasures({ segment: SEGMENT, unit, source_year: sourceYear }),
        api.getMonthlyTrend({ segment: SEGMENT, unit, source_year: sourceYear }),
        api.getBranchData({  segment: SEGMENT, unit, source_year: sourceYear }),
      ]);
      setPnlData(pnl);
      setMonthlyData(monthly);
      setBranchData(branches);
    } catch (e) {
      console.error('Error fetching centre data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading || !pnlData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading centre data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white px-6 py-4 rounded-lg shadow-md flex items-center gap-3">
        <Building2 className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Centre Economics</h2>
          <p className="text-sm text-gray-500">Centre segment financial performance and analysis</p>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center gap-4 bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-100">

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Year:</span>
          <select
            value={sourceYear}
            onChange={(e) => setSourceYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Unit:</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue"
          value={`₹${pnlData.Revenue.toFixed(2)}`}
          unit={unit}
          icon={<IndianRupee className="w-6 h-6" />}
          color="bg-blue-600"
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
          title="EBITDA %"
          value={`${pnlData['EBITDA %'].toFixed(1)}%`}
          icon={<PieChart className="w-6 h-6" />}
          color="bg-purple-600"
          positive={pnlData['EBITDA %'] >= 0}
        />
        <MetricCard
          title="PAT"
          value={`₹${pnlData.PAT.toFixed(2)}`}
          unit={unit}
          icon={<Activity className="w-6 h-6" />}
          color="bg-orange-600"
          positive={pnlData.PAT >= 0}
        />
      </div>

      {/* ── P&L Summary Table ── */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">P&L Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Particulars</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount ({unit})</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">%</th>
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
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Monthly Revenue & Gross Margin</h3>
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

        {/* Branch-wise Performance */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Branch-wise Performance</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={filteredBranchData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
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

      </div>{/* end charts grid */}

      {/* ── Insights ── */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">📊 Centre Segment Insights</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Revenue: <strong>₹{pnlData.Revenue.toFixed(2)} {unit}</strong></li>
          <li>✅ Gross Profit Margin: <strong>{pnlData['Gross Profit %'].toFixed(1)}%</strong></li>
          <li>✅ EBITDA Margin: <strong>{pnlData['EBITDA %'].toFixed(1)}%</strong></li>
          <li>✅ PAT Margin: <strong>{pnlData['PAT %'].toFixed(1)}%</strong></li>
          <li>✅ Active Branches: <strong>{filteredBranchData.length}</strong></li>
          <li>✅ Top Branch by Revenue: <strong>
            {filteredBranchData.length > 0
              ? filteredBranchData.reduce((a, b) => a.revenue > b.revenue ? a : b).branch
              : 'N/A'}
          </strong></li>
        </ul>
      </div>

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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${positive ? 'text-gray-900' : 'text-red-600'}`}>{value}</p>
          {unit && <p className="text-xs text-gray-500 mt-1">{unit}</p>}
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
    <tr className={`border-b border-gray-100 ${bold ? 'bg-gray-50 font-semibold' : ''}`}>
      <td className={`py-3 px-4 text-gray-900 ${indent ? 'pl-8 text-sm' : ''}`}>{label}</td>
      <td className={`text-right py-3 px-4 ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
        ₹{value.toFixed(2)}
      </td>
      <td className={`text-right py-3 px-4 ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
        {percent.toFixed(1)}%
      </td>
    </tr>
  );
};