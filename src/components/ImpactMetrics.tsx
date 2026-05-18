import { useState, useEffect } from 'react';
import { Users, School, FlaskConical, FileText, Trophy, Target, TrendingUp, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LineChart, Line
} from 'recharts';
import { api, ImpactMetrics as ImpactData } from '../services/api';

interface YoYData {
  label: string;
  current: number;
  previous: number;
  change: number;
  changePct: number;
}

interface MonthlyStudentData {
  month: string;
  students: number;
}

export const ImpactMetrics = () => {
  const [data,           setData]           = useState<ImpactData | null>(null);
  const [prevData,       setPrevData]       = useState<ImpactData | null>(null);
  const [studentTrend,   setStudentTrend]   = useState<MonthlyStudentData[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [sourceYear,     setSourceYear]     = useState('FY25-26');
  const [availableYears, setAvailableYears] = useState<string[]>(['All']);

  // Map to get the previous FY for YoY
  const PREV_YEAR_MAP: Record<string, string> = {
    'FY25-26': 'FY24-25',
    'FY24-25': 'FY23-24',
    'FY23-24': 'FY22-23',
    'FY22-23': '',
    'All': '',
  };

  useEffect(() => {
    loadFilters();
    fetchData(true);
  }, []);

  useEffect(() => {
    if (!loading) fetchData(false);
  }, [sourceYear]);

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
      const prevYear = PREV_YEAR_MAP[sourceYear] || '';

      const [current, trend] = await Promise.all([
        api.getImpactMetrics({ source_year: sourceYear }),
        fetch(`http://localhost:8000/api/monthly-student-trend${sourceYear !== 'All' ? `?source_year=${sourceYear}` : ''}`).then(r => r.ok ? r.json() : []),
      ]);
      setData(current);
      setStudentTrend(trend);

      // Fetch previous year for YoY if available
      if (prevYear) {
        const prev = await api.getImpactMetrics({ source_year: prevYear });
        setPrevData(prev);
      } else {
        setPrevData(null);
      }

    } catch (e) {
      console.error('Error fetching impact data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Build YoY comparison rows
  const yoyRows: YoYData[] = data && prevData ? [
    {
      label: 'Unique Students',
      current: data.uniqueStudents,
      previous: prevData.uniqueStudents,
      change: data.uniqueStudents - prevData.uniqueStudents,
      changePct: prevData.uniqueStudents > 0
        ? ((data.uniqueStudents - prevData.uniqueStudents) / prevData.uniqueStudents) * 100
        : 0
    },
    {
      label: 'Unique Schools',
      current: data.uniqueSchools,
      previous: prevData.uniqueSchools,
      change: data.uniqueSchools - prevData.uniqueSchools,
      changePct: prevData.uniqueSchools > 0
        ? ((data.uniqueSchools - prevData.uniqueSchools) / prevData.uniqueSchools) * 100
        : 0
    },
    {
      label: 'STEM Labs',
      current: data.stemLabs,
      previous: prevData.stemLabs,
      change: data.stemLabs - prevData.stemLabs,
      changePct: prevData.stemLabs > 0
        ? ((data.stemLabs - prevData.stemLabs) / prevData.stemLabs) * 100
        : 0
    },
    {
      label: 'Research Papers',
      current: data.researchPapers,
      previous: prevData.researchPapers,
      change: data.researchPapers - prevData.researchPapers,
      changePct: prevData.researchPapers > 0
        ? ((data.researchPapers - prevData.researchPapers) / prevData.researchPapers) * 100
        : 0
    },
    {
      label: 'Research Competitions',
      current: data.researchCompetitions,
      previous: prevData.researchCompetitions,
      change: data.researchCompetitions - prevData.researchCompetitions,
      changePct: prevData.researchCompetitions > 0
        ? ((data.researchCompetitions - prevData.researchCompetitions) / prevData.researchCompetitions) * 100
        : 0
    },
  ] : [];

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading impact metrics...</div>
      </div>
    );
  }

  const prevYear = PREV_YEAR_MAP[sourceYear];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white px-6 py-4 rounded-lg shadow-md flex items-center gap-3">
        <Target className="w-6 h-6 text-indigo-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Impact Metrics</h2>
          <p className="text-sm text-gray-500">Operational KPIs and social impact indicators</p>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center gap-4 bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Year:</span>
          <select
            value={sourceYear}
            onChange={(e) => setSourceYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {refreshing && (
          <span className="text-xs text-indigo-500 animate-pulse ml-auto">Updating...</span>
        )}
      </div>

      {/* ── Large Impact Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <LargeMetricCard
          title="Unique Students"
          value={data.uniqueStudents.toLocaleString()}
          subtitle="Students impacted across all segments"
          icon={<Users className="w-12 h-12" />}
          gradient="from-blue-500 to-blue-600"
        />
        <LargeMetricCard
          title="Unique Schools"
          value={data.uniqueSchools.toLocaleString()}
          subtitle="Schools partnered with OMOTEC"
          icon={<School className="w-12 h-12" />}
          gradient="from-purple-500 to-purple-600"
        />
        <LargeMetricCard
          title="STEM Labs"
          value={data.stemLabs.toLocaleString()}
          subtitle="STEM laboratories installed"
          icon={<FlaskConical className="w-12 h-12" />}
          gradient="from-orange-500 to-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LargeMetricCard
          title="Research Papers"
          value={data.researchPapers.toLocaleString()}
          subtitle="Published research papers and publications"
          icon={<FileText className="w-12 h-12" />}
          gradient="from-green-500 to-green-600"
        />
        <LargeMetricCard
          title="Research Competitions"
          value={data.researchCompetitions.toLocaleString()}
          subtitle="Competition participations and wins"
          icon={<Trophy className="w-12 h-12" />}
          gradient="from-pink-500 to-pink-600"
        />
      </div>

      {/* ── Year-over-Year Comparison ── */}
      {yoyRows.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Year-over-Year Comparison
            <span className="ml-2 text-sm font-normal text-gray-500">
              {sourceYear} vs {prevYear}
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Metric</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{prevYear}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{sourceYear}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Change</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">% Change</th>
                </tr>
              </thead>
              <tbody>
                {yoyRows.map((row) => (
                  <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{row.label}</td>
                    <td className="text-right py-3 px-4 text-gray-600">{row.previous.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 font-semibold text-gray-900">{row.current.toLocaleString()}</td>
                    <td className={`text-right py-3 px-4 font-medium ${row.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.change >= 0 ? '+' : ''}{row.change.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`inline-flex items-center gap-1 font-medium ${row.changePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {row.changePct >= 0
                          ? <TrendingUp className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />
                        }
                        {Math.abs(row.changePct).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Student Trend */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Monthly Student Activity</h3>
          {studentTrend.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              No monthly data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={studentTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Students']} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="students"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#6366f1' }}
                  name="Students"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* YoY Bar Chart */}
        {yoyRows.length > 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              {sourceYear} vs {prevYear}
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yoyRows} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Legend />
                <Bar dataKey="previous" fill="#94a3b8" name={prevYear} />
                <Bar dataKey="current"  fill="#6366f1" name={sourceYear} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center text-gray-400 text-sm">
            Select a specific year to see year-over-year comparison
          </div>
        )}

      </div>

      {/* ── Overall Impact Banner ── */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-lg text-white">
        <h3 className="text-2xl font-bold mb-4">OMOTEC's Total Impact</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold mb-1">{data.uniqueStudents.toLocaleString()}</p>
            <p className="text-sm opacity-90">Students</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold mb-1">{data.uniqueSchools.toLocaleString()}</p>
            <p className="text-sm opacity-90">Schools</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold mb-1">{data.stemLabs.toLocaleString()}</p>
            <p className="text-sm opacity-90">STEM Labs</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold mb-1">{(data.researchPapers + data.researchCompetitions).toLocaleString()}</p>
            <p className="text-sm opacity-90">Research Activities</p>
          </div>
        </div>
        <p className="mt-6 text-center text-sm opacity-90">
          Making a difference in education and research across India
        </p>
      </div>

    </div>
  );
};

// ── LargeMetricCard ─────────────────────────────────────────────────────────

interface LargeMetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
}

const LargeMetricCard = ({ title, value, subtitle, icon, gradient }: LargeMetricCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">{title}</p>
            <p className="text-5xl font-bold">{value}</p>
          </div>
          <div className="opacity-80">{icon}</div>
        </div>
      </div>
      <div className="p-4 bg-gray-50">
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
};

// ── ImpactItem ───────────────────────────────────────────────────────────────

interface ImpactItemProps {
  label: string;
  value: number;
  description: string;
}

const ImpactItem = ({ label, value, description }: ImpactItemProps) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-gray-900">{label}</span>
        <span className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</span>
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  );
};