import { useQuery } from '@tanstack/react-query';
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

