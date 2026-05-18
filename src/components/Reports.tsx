import { FileText, Download, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { expenseCategories, revenueCategories, keyMetrics } from '../data/mockData';
import { generateExecutiveSummaryPDF } from '../utils/pdfGenerator';

const EXPENSE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const REVENUE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export const Reports = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
            </div>
            <p className="text-gray-600">Generate comprehensive financial reports and insights</p>
          </div>
          <button
            onClick={generateExecutiveSummaryPDF}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
          >
            <Download className="w-5 h-5" />
            Generate PDF Report
          </button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportCard
          title="Executive Summary"
          description="Comprehensive overview of financial performance"
          icon={<BarChart3 className="w-6 h-6" />}
          onClick={generateExecutiveSummaryPDF}
        />
        <ReportCard
          title="Expense Analysis"
          description="Detailed breakdown of all expense categories"
          icon={<PieChartIcon className="w-6 h-6" />}
          onClick={generateExecutiveSummaryPDF}
        />
        <ReportCard
          title="Revenue Report"
          description="Revenue trends and source analysis"
          icon={<TrendingUp className="w-6 h-6" />}
          onClick={generateExecutiveSummaryPDF}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Expense Breakdown</h3>
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    label
                  >
                    {expenseCategories.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full lg:w-1/2 space-y-3">
              {expenseCategories.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: EXPENSE_COLORS[index] }}
                    />
                    <span className="text-sm text-gray-700">{category.category}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    ${category.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Revenue Sources</h3>
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={revenueCategories}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    label
                  >
                    {revenueCategories.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full lg:w-1/2 space-y-3">
              {revenueCategories.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: REVENUE_COLORS[index] }}
                    />
                    <span className="text-sm text-gray-700">{category.category}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    ${category.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Annual Summary - 2024</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricItem label="Total Revenue" value={`$${keyMetrics.totalRevenue.toLocaleString()}`} />
          <MetricItem label="Total Expenses" value={`$${keyMetrics.totalExpenses.toLocaleString()}`} />
          <MetricItem label="Net Profit" value={`$${keyMetrics.netProfit.toLocaleString()}`} />
          <MetricItem label="Profit Margin" value={`${keyMetrics.profitMargin}%`} />
          <MetricItem label="YoY Growth" value={`${keyMetrics.yearOverYearGrowth}%`} />
          <MetricItem label="Avg Monthly Revenue" value={`$${keyMetrics.averageMonthlyRevenue.toLocaleString()}`} />
          <MetricItem label="Top Centre" value={keyMetrics.topPerformingCentre} />
          <MetricItem label="Best Month" value={keyMetrics.highestRevenueMonth} />
        </div>
      </div>
    </div>
  );
};

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const ReportCard = ({ title, description, icon, onClick }: ReportCardProps) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
          <div className="mt-3 flex items-center gap-1 text-blue-600 text-sm font-medium">
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MetricItemProps {
  label: string;
  value: string;
}

const MetricItem = ({ label, value }: MetricItemProps) => {
  return (
    <div className="border-l-4 border-blue-600 pl-4">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
};
