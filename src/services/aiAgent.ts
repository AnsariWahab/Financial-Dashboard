import { monthlyData, centreData, expenseCategories, revenueCategories, keyMetrics } from '../data/mockData';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// AI Agent that analyzes financial data and answers questions
// This is a rule-based system - you can integrate with OpenAI API in production
export class FinancialAIAgent {
  analyzeQuery(query: string): string {
    const lowerQuery = query.toLowerCase();

    // Analyze query intent and provide answers
    if (this.matchesPattern(lowerQuery, ['lowest', 'minimum', 'least'], ['expense', 'cost'])) {
      return this.findLowestExpenseMonth();
    }

    if (this.matchesPattern(lowerQuery, ['highest', 'maximum', 'most'], ['expense', 'cost'])) {
      return this.findHighestExpenseMonth();
    }

    if (this.matchesPattern(lowerQuery, ['lowest', 'minimum', 'least'], ['revenue', 'income', 'sales'])) {
      return this.findLowestRevenueMonth();
    }

    if (this.matchesPattern(lowerQuery, ['highest', 'maximum', 'most'], ['revenue', 'income', 'sales'])) {
      return this.findHighestRevenueMonth();
    }

    if (this.matchesPattern(lowerQuery, ['best', 'top', 'highest'], ['performing', 'profit', 'centre', 'center'])) {
      return this.findBestPerformingCentre();
    }

    if (this.matchesPattern(lowerQuery, ['worst', 'bottom', 'lowest'], ['performing', 'profit', 'centre', 'center'])) {
      return this.findWorstPerformingCentre();
    }

    if (this.matchesPattern(lowerQuery, ['total', 'annual', 'year'], ['revenue', 'income', 'sales'])) {
      return this.getTotalRevenue();
    }

    if (this.matchesPattern(lowerQuery, ['total', 'annual', 'year'], ['expense', 'cost', 'spending'])) {
      return this.getTotalExpenses();
    }

    if (this.matchesPattern(lowerQuery, ['profit', 'net'], ['margin', 'total', 'annual'])) {
      return this.getProfitInfo();
    }

    if (this.matchesPattern(lowerQuery, ['average'], ['revenue', 'expense', 'profit'])) {
      return this.getAverages();
    }

    if (this.matchesPattern(lowerQuery, ['trend', 'growth', 'over time'])) {
      return this.analyzeTrends();
    }

    if (this.matchesPattern(lowerQuery, ['breakdown', 'category', 'categories'], ['expense', 'cost'])) {
      return this.getExpenseBreakdown();
    }

    if (this.matchesPattern(lowerQuery, ['breakdown', 'category', 'categories'], ['revenue', 'income'])) {
      return this.getRevenueBreakdown();
    }

    if (this.matchesPattern(lowerQuery, ['compare', 'comparison'], ['centre', 'center', 'department'])) {
      return this.compareCentres();
    }

    if (this.matchesPattern(lowerQuery, ['summary', 'overview', 'executive'])) {
      return this.getExecutiveSummary();
    }

    // Default response with suggestions
    return this.getDefaultResponse();
  }

  private matchesPattern(query: string, keywords1: string[], keywords2?: string[]): boolean {
    const hasKeyword1 = keywords1.some(kw => query.includes(kw));
    if (!keywords2) return hasKeyword1;
    const hasKeyword2 = keywords2.some(kw => query.includes(kw));
    return hasKeyword1 && hasKeyword2;
  }

  private findLowestExpenseMonth(): string {
    const lowest = monthlyData.reduce((min, curr) => 
      curr.expenses < min.expenses ? curr : min
    );
    return `📊 The month with the lowest expenses was **${lowest.month}** with $${lowest.expenses.toLocaleString()} in expenses. This represents a ${((1 - lowest.expenses / monthlyData.reduce((sum, m) => sum + m.expenses, 0) * 12) * 100).toFixed(1)}% difference from the monthly average.`;
  }

  private findHighestExpenseMonth(): string {
    const highest = monthlyData.reduce((max, curr) => 
      curr.expenses > max.expenses ? curr : max
    );
    return `📊 The month with the highest expenses was **${highest.month}** with $${highest.expenses.toLocaleString()} in expenses. This is ${((highest.expenses / monthlyData.reduce((sum, m) => sum + m.expenses, 0) * 12 - 1) * 100).toFixed(1)}% above the monthly average.`;
  }

  private findLowestRevenueMonth(): string {
    const lowest = monthlyData.reduce((min, curr) => 
      curr.revenue < min.revenue ? curr : min
    );
    return `📈 The month with the lowest revenue was **${lowest.month}** with $${lowest.revenue.toLocaleString()}. This was the beginning of the year, and we've seen strong growth since then.`;
  }

  private findHighestRevenueMonth(): string {
    const highest = monthlyData.reduce((max, curr) => 
      curr.revenue > max.revenue ? curr : max
    );
    const lowest = monthlyData.reduce((min, curr) => 
      curr.revenue < min.revenue ? curr : min
    );
    return `📈 The month with the highest revenue was **${highest.month}** with $${highest.revenue.toLocaleString()}. This represents a ${((highest.revenue / lowest.revenue - 1) * 100).toFixed(1)}% increase from our lowest month.`;
  }

  private findBestPerformingCentre(): string {
    const best = centreData.reduce((max, curr) => 
      curr.profit > max.profit ? curr : max
    );
    return `🏆 The best performing centre is **${best.name}** with:\n- Revenue: $${best.revenue.toLocaleString()}\n- Profit: $${best.profit.toLocaleString()}\n- Profit Margin: ${best.profitMargin}%\n\nThis centre leads in both total profit and profit margin efficiency.`;
  }

  private findWorstPerformingCentre(): string {
    const worst = centreData.reduce((min, curr) => 
      curr.profit < min.profit ? curr : min
    );
    return `📉 The centre with the lowest profit is **${worst.name}** with:\n- Revenue: $${worst.revenue.toLocaleString()}\n- Profit: $${worst.profit.toLocaleString()}\n- Profit Margin: ${worst.profitMargin}%\n\nHowever, it's still profitable and may require strategic investment to improve performance.`;
  }

  private getTotalRevenue(): string {
    return `💰 **Total Annual Revenue**: $${keyMetrics.totalRevenue.toLocaleString()}\n\nThis represents an ${keyMetrics.yearOverYearGrowth}% year-over-year growth. Revenue has shown consistent growth throughout the year, with monthly average of $${keyMetrics.averageMonthlyRevenue.toLocaleString()}.`;
  }

  private getTotalExpenses(): string {
    return `💵 **Total Annual Expenses**: $${keyMetrics.totalExpenses.toLocaleString()}\n\nMajor expense categories:\n${expenseCategories.slice(0, 3).map(cat => `- ${cat.category}: $${cat.amount.toLocaleString()} (${cat.percentage}%)`).join('\n')}`;
  }

  private getProfitInfo(): string {
    return `📊 **Profitability Metrics**:\n\n- Net Profit: $${keyMetrics.netProfit.toLocaleString()}\n- Profit Margin: ${keyMetrics.profitMargin}%\n- Year-over-Year Growth: ${keyMetrics.yearOverYearGrowth}%\n\nThe company maintains a healthy profit margin above industry average, with consistent profitability across all months.`;
  }

  private getAverages(): string {
    const avgRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0) / monthlyData.length;
    const avgExpense = monthlyData.reduce((sum, m) => sum + m.expenses, 0) / monthlyData.length;
    const avgProfit = monthlyData.reduce((sum, m) => sum + m.profit, 0) / monthlyData.length;
    
    return `📊 **Monthly Averages**:\n\n- Average Revenue: $${avgRevenue.toLocaleString()}\n- Average Expenses: $${avgExpense.toLocaleString()}\n- Average Profit: $${avgProfit.toLocaleString()}\n- Average Profit Margin: ${((avgProfit / avgRevenue) * 100).toFixed(1)}%`;
  }

  private analyzeTrends(): string {
    const firstHalf = monthlyData.slice(0, 6);
    const secondHalf = monthlyData.slice(6);
    const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.revenue, 0) / 6;
    const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.revenue, 0) / 6;
    const growth = ((secondHalfAvg / firstHalfAvg - 1) * 100).toFixed(1);

    return `📈 **Trend Analysis**:\n\n- Revenue growth from H1 to H2: ${growth}%\n- Consistent upward trend throughout the year\n- Strong Q4 performance with December being the highest revenue month\n- Expenses well-controlled relative to revenue growth\n- Profit margins improving over time`;
  }

  private getExpenseBreakdown(): string {
    return `💵 **Expense Breakdown by Category**:\n\n${expenseCategories.map((cat, i) => 
      `${i + 1}. ${cat.category}: $${cat.amount.toLocaleString()} (${cat.percentage}%)`
    ).join('\n')}\n\nTotal: $${expenseCategories.reduce((sum, cat) => sum + cat.amount, 0).toLocaleString()}`;
  }

  private getRevenueBreakdown(): string {
    return `💰 **Revenue Breakdown by Source**:\n\n${revenueCategories.map((cat, i) => 
      `${i + 1}. ${cat.category}: $${cat.amount.toLocaleString()} (${cat.percentage}%)`
    ).join('\n')}\n\nTotal: $${revenueCategories.reduce((sum, cat) => sum + cat.amount, 0).toLocaleString()}`;
  }

  private compareCentres(): string {
    const sorted = [...centreData].sort((a, b) => b.profit - a.profit);
    return `🏢 **Centre Performance Comparison**:\n\n${sorted.map((centre, i) => 
      `${i + 1}. **${centre.name}**\n   - Revenue: $${centre.revenue.toLocaleString()}\n   - Profit: $${centre.profit.toLocaleString()}\n   - Margin: ${centre.profitMargin}%`
    ).join('\n\n')}`;
  }

  private getExecutiveSummary(): string {
    return `📋 **Executive Summary - 2024 Financial Performance**\n\n**Key Highlights:**\n- Total Revenue: $${keyMetrics.totalRevenue.toLocaleString()}\n- Net Profit: $${keyMetrics.netProfit.toLocaleString()}\n- Profit Margin: ${keyMetrics.profitMargin}%\n- YoY Growth: ${keyMetrics.yearOverYearGrowth}%\n\n**Performance:**\n- All 5 centres are profitable\n- ${keyMetrics.topPerformingCentre} leads with highest profit\n- Consistent month-over-month growth\n- Strong Q4 finish with December at $${monthlyData[11].revenue.toLocaleString()}\n\n**Expenses:**\n- Well-controlled at 62% of revenue\n- ${keyMetrics.lowestExpenseMonth} had most efficient spend\n- Major categories: Salaries (42%), Rent (20%), Marketing (12%)`;
  }

  private getDefaultResponse(): string {
    return `🤖 I can help you analyze the financial data! Here are some questions you can ask:\n\n- "Which month had the lowest/highest expenses?"\n- "What's the total revenue for the year?"\n- "Which centre is performing best?"\n- "Show me the expense breakdown"\n- "What are the trends?"\n- "Compare the centres"\n- "Generate an executive summary"\n\nFeel free to ask any financial question!`;
  }
}

export const aiAgent = new FinancialAIAgent();
