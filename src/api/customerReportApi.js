import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Customer 360 Financial & Transaction Report API
 */
export const customerReportApi = {
  /**
   * Search client ledgers for autocomplete
   * GET /api/v1/transaction/customer-report/clients
   */
  getClients: async (search = '') => {
    const params = {};
    if (search && search.trim()) {
      params.search = search.trim();
    }
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.CUSTOMER_REPORT_CLIENTS, { params });
  },

  /**
   * Get available financial years
   * GET /api/v1/transaction/customer-report/financial-years
   */
  getFinancialYears: async () => {
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.CUSTOMER_REPORT_FINANCIAL_YEARS);
  },

  /**
   * Fetch portfolio-level summary and industry-wide receivables
   * GET /api/v1/transaction/customer-report/portfolio-summary?fin_year=...
   */
  getPortfolioSummary: async (finYear = 'ALL') => {
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.CUSTOMER_REPORT_PORTFOLIO_SUMMARY, {
      params: { fin_year: finYear || 'ALL' },
    });
  },

  /**
   * Fetch complete 360 financial dossier for a customer
   * GET /api/v1/transaction/customer-report/dossier/:clientCode?fin_year=...
   */
  getDossier: async (clientCode, finYear = 'ALL') => {
    if (!clientCode) return null;
    const url = API_ENDPOINTS.TRANSACTION.CUSTOMER_REPORT_DOSSIER(clientCode);
    return await apiClient.get(url, {
      params: { fin_year: finYear || 'ALL' },
    });
  },

  /**
   * Download Executive Customer Report & Ledger Dossier Excel (.xlsx) from backend
   * GET /api/v1/transaction/customer-report/export-excel/:clientCode?fin_year=...
   */
  downloadCustomerReportExcel: async (clientCode, finYear = 'ALL', tab = 'ALL') => {
    if (!clientCode) return;
    const url = API_ENDPOINTS.TRANSACTION.CUSTOMER_REPORT_EXPORT_EXCEL(clientCode);
    const response = await apiClient.get(url, {
      params: { fin_year: finYear || 'ALL', tab },
      responseType: 'blob',
    });
    const blob =
      response instanceof Blob
        ? response
        : new Blob([response], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    const safeCode = String(clientCode).replace(/[\/\\]/g, '_').trim();
    const safeFy = String(finYear || 'ALL').replace(/[\/\\]/g, '_').trim();
    link.setAttribute('download', `Customer_Dossier_${safeCode}_${safeFy}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};

/**
 * React Query Hook: Search Clients
 */
export const useCustomerClients = (search = '') => {
  return useQuery({
    queryKey: ['customer-report', 'clients', search],
    queryFn: () => customerReportApi.getClients(search),
    staleTime: 1000 * 60 * 5, // 5 mins
  });
};

/**
 * React Query Hook: Financial Years
 */
export const useReportFinancialYears = () => {
  return useQuery({
    queryKey: ['customer-report', 'financial-years'],
    queryFn: () => customerReportApi.getFinancialYears(),
    staleTime: 1000 * 60 * 30, // 30 mins
  });
};

/**
 * React Query Hook: Customer Portfolio Overview & Industry Analytics
 */
export const useCustomerPortfolioSummary = (finYear = 'ALL') => {
  return useQuery({
    queryKey: ['customer-report', 'portfolio-summary', finYear],
    queryFn: () => customerReportApi.getPortfolioSummary(finYear),
    staleTime: 1000 * 60 * 2, // 2 mins
  });
};

/**
 * React Query Hook: Customer 360 Dossier
 */
export const useCustomerDossier = (clientCode, finYear = 'ALL') => {
  return useQuery({
    queryKey: ['customer-report', 'dossier', clientCode, finYear],
    queryFn: () => customerReportApi.getDossier(clientCode, finYear),
    enabled: Boolean(clientCode),
    staleTime: 1000 * 60 * 2, // 2 mins
  });
};

/**
 * React Mutation Hook: Download Executive Customer Dossier Excel (.xlsx) from Backend
 */
export const useDownloadCustomerReportExcel = () => {
  return useMutation({
    mutationFn: ({ clientCode, finYear = 'ALL', tab = 'ALL' }) =>
      customerReportApi.downloadCustomerReportExcel(clientCode, finYear, tab),
  });
};

