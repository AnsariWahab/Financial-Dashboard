import jsPDF from 'jspdf';
import { monthlyData, centreData, expenseCategories, keyMetrics } from '../data/mockData';

export const generateExecutiveSummaryPDF = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Financial Performance Report - 2024', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 20;

  // Key Metrics Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Performance Indicators', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const metrics = [
    `Total Revenue: $${keyMetrics.totalRevenue.toLocaleString()}`,
    `Total Expenses: $${keyMetrics.totalExpenses.toLocaleString()}`,
    `Net Profit: $${keyMetrics.netProfit.toLocaleString()}`,
    `Profit Margin: ${keyMetrics.profitMargin}%`,
    `Year-over-Year Growth: ${keyMetrics.yearOverYearGrowth}%`,
    `Average Monthly Revenue: $${keyMetrics.averageMonthlyRevenue.toLocaleString()}`,
  ];

  metrics.forEach(metric => {
    doc.text(`• ${metric}`, 25, yPos);
    yPos += 7;
  });

  yPos += 10;

  // Performance Highlights
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Highlights', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const highlights = [
    `Highest Revenue Month: ${keyMetrics.highestRevenueMonth}`,
    `Most Efficient Month: ${keyMetrics.lowestExpenseMonth}`,
    `Top Performing Centre: ${keyMetrics.topPerformingCentre}`,
    'All 5 centres maintained profitability throughout the year',
    'Consistent positive growth trend across all quarters',
  ];

  highlights.forEach(highlight => {
    doc.text(`• ${highlight}`, 25, yPos);
    yPos += 7;
  });

  yPos += 10;

  // Centre Performance
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Centre Performance Summary', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Centre', 25, yPos);
  doc.text('Revenue', 80, yPos);
  doc.text('Expenses', 120, yPos);
  doc.text('Profit', 160, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  centreData.forEach(centre => {
    doc.text(centre.name, 25, yPos);
    doc.text(`$${(centre.revenue / 1000).toFixed(0)}K`, 80, yPos);
    doc.text(`$${(centre.expenses / 1000).toFixed(0)}K`, 120, yPos);
    doc.text(`$${(centre.profit / 1000).toFixed(0)}K`, 160, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Expense Breakdown
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Breakdown', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  expenseCategories.forEach(category => {
    doc.text(`• ${category.category}: $${category.amount.toLocaleString()} (${category.percentage}%)`, 25, yPos);
    yPos += 7;
  });

  yPos += 15;

  // Monthly Trend Summary
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Monthly Performance Trend', 20, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Month', 25, yPos);
  doc.text('Revenue', 65, yPos);
  doc.text('Expenses', 105, yPos);
  doc.text('Profit', 145, yPos);
  doc.text('Margin', 175, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  monthlyData.forEach(month => {
    const margin = ((month.profit / month.revenue) * 100).toFixed(1);
    doc.text(month.month, 25, yPos);
    doc.text(`$${(month.revenue / 1000).toFixed(0)}K`, 65, yPos);
    doc.text(`$${(month.expenses / 1000).toFixed(0)}K`, 105, yPos);
    doc.text(`$${(month.profit / 1000).toFixed(0)}K`, 145, yPos);
    doc.text(`${margin}%`, 175, yPos);
    yPos += 5.5;
  });

  yPos += 15;

  // Recommendations
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Strategic Recommendations', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const recommendations = [
    'Continue focusing on revenue growth initiatives - current trajectory is strong',
    'Investigate East Centre performance to identify improvement opportunities',
    'Maintain expense discipline while investing in growth',
    'Leverage Q4 momentum for strong Q1 2025 performance',
    'Consider scaling successful strategies from South Centre to other locations',
  ];

  recommendations.forEach(rec => {
    const lines = doc.splitTextToSize(`• ${rec}`, pageWidth - 50);
    lines.forEach((line: string) => {
      doc.text(line, 25, yPos);
      yPos += 7;
    });
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save('Executive-Summary-2024.pdf');
};
