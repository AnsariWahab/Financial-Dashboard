/**
 * API Service - Connects React Frontend to Python Backend
 * Replaces all mock data with real database calls
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export interface PnLMeasures {
  Revenue: number;
  'Direct Expense': number;
  'Gross Profit': number;
  'Gross Profit %': number;
  'Indirect Expense': number;
  EBITDA: number;
  'EBITDA %': number;
  Depreciation: number;
  EBIT: number;
  Interest: number;
  PBT: number;
  Tax: number;
  PAT: number;
  'PAT %': number;
}

export interface SegmentData {
  segment: string;
  revenue: number;
  grossMargin: number;
}

export interface BranchData {
  branch: string;
  revenue: number;
  grossMargin: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  grossMargin: number;
}

export interface ImpactMetrics {
  uniqueStudents: number;
  uniqueSchools: number;
  stemLabs: number;
  researchPapers: number;
  researchCompetitions: number;
}

export interface Filters {
  years: string[];
  months: string[];
  segments: string[];
  branches: string[];
  units: string[];
}

export interface ApiFilters {
  source_year?: string;
  month?: string;
  segment?: string;
  branch?: string;
  unit?: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Build query parameters from filters
   */
  private buildQueryString(filters?: ApiFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'All') {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Get all filter options (years, months, segments, branches, units)
   */
  async getFilters(): Promise<Filters> {
    try {
      const response = await fetch(`${this.baseUrl}/api/filters`);
      if (!response.ok) throw new Error('Failed to fetch filters');
      return await response.json();
    } catch (error) {
      console.error('Error fetching filters:', error);
      return {
        years: ['All', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'],
        months: ['All', 'April', 'May', 'June', 'July', 'August', 'September',
                 'October', 'November', 'December', 'January', 'February', 'March'],
        segments: ['All', 'centre', 'research', 'school'],
        branches: ['All'],
        units: ['Lakhs', 'Crores']
      };
    }
  }

  /**
   * Get all P&L measures (Revenue, GP, EBITDA, PAT, etc.)
   */
  async getPnLMeasures(filters?: ApiFilters): Promise<PnLMeasures> {
    try {
      const queryString = this.buildQueryString(filters);
      const response = await fetch(`${this.baseUrl}/api/pnl-measures${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch P&L measures');
      return await response.json();
    } catch (error) {
      console.error('Error fetching P&L measures:', error);
      throw error;
    }
  }

  /**
   * Get P&L table data (all years comparison)
   */
  async getPnLTable(filters?: ApiFilters): Promise<any> {
    try {
      const queryString = this.buildQueryString(filters);
      const response = await fetch(`${this.baseUrl}/api/pnl-table${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch P&L table');
      return await response.json();
    } catch (error) {
      console.error('Error fetching P&L table:', error);
      throw error;
    }
  }

  /**
   * Get segment-wise data (Revenue + Gross Margin % per segment)
   */
  async getSegmentData(filters?: ApiFilters): Promise<SegmentData[]> {
    try {
      const queryString = this.buildQueryString(filters);
      const response = await fetch(`${this.baseUrl}/api/segment-data${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch segment data');
      return await response.json();
    } catch (error) {
      console.error('Error fetching segment data:', error);
      return [];
    }
  }

  /**
   * Get branch-wise data (Revenue + Gross Margin % per branch)
   */
  async getBranchData(filters?: ApiFilters): Promise<BranchData[]> {
    try {
      const queryString = this.buildQueryString(filters);
      const response = await fetch(`${this.baseUrl}/api/branch-data${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch branch data');
      return await response.json();
    } catch (error) {
      console.error('Error fetching branch data:', error);
      return [];
    }
  }

  /**
   * Get monthly trend data (Revenue + Gross Margin % per month)
   */
  async getMonthlyTrend(filters?: ApiFilters): Promise<MonthlyTrend[]> {
    try {
      const queryString = this.buildQueryString(filters);
      const response = await fetch(`${this.baseUrl}/api/monthly-trend${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch monthly trend');
      return await response.json();
    } catch (error) {
      console.error('Error fetching monthly trend:', error);
      return [];
    }
  }

  /**
   * Get impact metrics (students, schools, research, etc.)
   */
  async getImpactMetrics(filters?: ApiFilters): Promise<ImpactMetrics> {
    try {
      const queryString = this.buildQueryString(filters);
      const response = await fetch(`${this.baseUrl}/api/impact-metrics${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch impact metrics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching impact metrics:', error);
      return {
        uniqueStudents: 0,
        uniqueSchools: 0,
        stemLabs: 0,
        researchPapers: 0,
        researchCompetitions: 0
      };
    }
  }

  /**
   * Health check — verify backend is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const api = new ApiService(API_BASE_URL);