// Mock data simulating database responses
// In production, replace these with API calls to your Python backend

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  centre?: string;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface CentreData {
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

// Monthly financial data for the past 12 months
export const monthlyData: MonthlyData[] = [
  { month: 'Jan 2024', revenue: 125000, expenses: 85000, profit: 40000 },
  { month: 'Feb 2024', revenue: 132000, expenses: 78000, profit: 54000 },
  { month: 'Mar 2024', revenue: 145000, expenses: 92000, profit: 53000 },
  { month: 'Apr 2024', revenue: 138000, expenses: 88000, profit: 50000 },
  { month: 'May 2024', revenue: 152000, expenses: 95000, profit: 57000 },
  { month: 'Jun 2024', revenue: 165000, expenses: 98000, profit: 67000 },
  { month: 'Jul 2024', revenue: 158000, expenses: 89000, profit: 69000 },
  { month: 'Aug 2024', revenue: 171000, expenses: 102000, profit: 69000 },
  { month: 'Sep 2024', revenue: 163000, expenses: 96000, profit: 67000 },
  { month: 'Oct 2024', revenue: 178000, expenses: 105000, profit: 73000 },
  { month: 'Nov 2024', revenue: 185000, expenses: 108000, profit: 77000 },
  { month: 'Dec 2024', revenue: 195000, expenses: 112000, profit: 83000 },
];

// Centre/Department performance data
export const centreData: CentreData[] = [
  { name: 'North Centre', revenue: 450000, expenses: 280000, profit: 170000, profitMargin: 37.8 },
  { name: 'South Centre', revenue: 520000, expenses: 310000, profit: 210000, profitMargin: 40.4 },
  { name: 'East Centre', revenue: 380000, expenses: 245000, profit: 135000, profitMargin: 35.5 },
  { name: 'West Centre', revenue: 425000, expenses: 268000, profit: 157000, profitMargin: 36.9 },
  { name: 'Central Hub', revenue: 312000, expenses: 195000, profit: 117000, profitMargin: 37.5 },
];

// Expense breakdown by category
export const expenseCategories: CategoryBreakdown[] = [
  { category: 'Salaries & Wages', amount: 485000, percentage: 42 },
  { category: 'Rent & Utilities', amount: 230000, percentage: 20 },
  { category: 'Marketing', amount: 138000, percentage: 12 },
  { category: 'Technology', amount: 115000, percentage: 10 },
  { category: 'Operations', amount: 92000, percentage: 8 },
  { category: 'Other', amount: 92000, percentage: 8 },
];

// Revenue breakdown by source
export const revenueCategories: CategoryBreakdown[] = [
  { category: 'Product Sales', amount: 890000, percentage: 48 },
  { category: 'Services', amount: 650000, percentage: 35 },
  { category: 'Subscriptions', amount: 240000, percentage: 13 },
  { category: 'Other', amount: 74000, percentage: 4 },
];

// Recent transactions
export const recentTransactions: Transaction[] = [
  { id: '1', date: '2024-12-15', description: 'Product Sales - Q4', category: 'Revenue', amount: 45000, type: 'income', centre: 'South Centre' },
  { id: '2', date: '2024-12-14', description: 'Payroll December', category: 'Salaries', amount: -42000, type: 'expense', centre: 'All Centres' },
  { id: '3', date: '2024-12-13', description: 'Service Contract - ABC Corp', category: 'Revenue', amount: 28000, type: 'income', centre: 'North Centre' },
  { id: '4', date: '2024-12-12', description: 'Office Rent - December', category: 'Rent', amount: -18500, type: 'expense', centre: 'Central Hub' },
  { id: '5', date: '2024-12-11', description: 'Marketing Campaign', category: 'Marketing', amount: -12000, type: 'expense', centre: 'All Centres' },
  { id: '6', date: '2024-12-10', description: 'Subscription Revenue', category: 'Revenue', amount: 22000, type: 'income', centre: 'All Centres' },
  { id: '7', date: '2024-12-09', description: 'Software Licenses', category: 'Technology', amount: -8500, type: 'expense', centre: 'All Centres' },
  { id: '8', date: '2024-12-08', description: 'Utilities - November', category: 'Utilities', amount: -5200, type: 'expense', centre: 'All Centres' },
  { id: '9', date: '2024-12-07', description: 'Consulting Services', category: 'Revenue', amount: 35000, type: 'income', centre: 'East Centre' },
  { id: '10', date: '2024-12-06', description: 'Equipment Purchase', category: 'Operations', amount: -15000, type: 'expense', centre: 'West Centre' },
];

// Key metrics
export const keyMetrics = {
  totalRevenue: 1854000,
  totalExpenses: 1152000,
  netProfit: 702000,
  profitMargin: 37.9,
  yearOverYearGrowth: 18.5,
  averageMonthlyRevenue: 154500,
  topPerformingCentre: 'South Centre',
  lowestExpenseMonth: 'February 2024',
  highestRevenueMonth: 'December 2024',
};

// AI Agent context - this helps the AI understand the data structure
export const getFinancialContext = () => {
  return {
    monthlyData,
    centreData,
    expenseCategories,
    revenueCategories,
    recentTransactions,
    keyMetrics,
    summary: `Financial data spans 12 months from January 2024 to December 2024. 
    Total annual revenue is $${keyMetrics.totalRevenue.toLocaleString()} with expenses of $${keyMetrics.totalExpenses.toLocaleString()}.
    Net profit is $${keyMetrics.netProfit.toLocaleString()} with a profit margin of ${keyMetrics.profitMargin}%.
    The company operates 5 centres: North, South, East, West, and Central Hub.
    ${keyMetrics.topPerformingCentre} is the top performing centre.
    ${keyMetrics.lowestExpenseMonth} had the lowest expenses at $${monthlyData.find(m => m.month === keyMetrics.lowestExpenseMonth)?.expenses.toLocaleString()}.
    ${keyMetrics.highestRevenueMonth} had the highest revenue at $${monthlyData.find(m => m.month === keyMetrics.highestRevenueMonth)?.revenue.toLocaleString()}.`
  };
};
