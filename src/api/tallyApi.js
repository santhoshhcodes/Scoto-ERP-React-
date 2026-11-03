import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Tally Upload API Service
 * Interacts with FastAPI Tally Ingestion Module
 * Replicates the business flow of .NET Rpt_Tally_Upload.aspx.cs
 */
export const tallyApi = {
  /**
   * Dry-run preview of Tally Excel file without inserting
   * POST /api/v1/transaction/tally/preview
   */
  previewTallyExcel: async (formData) => {
    return await apiClient.post(API_ENDPOINTS.TALLY.PREVIEW, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Commits Tally vouchers into dbo.Acc_Trans_All
   * POST /api/v1/transaction/tally/upload
   */
  uploadTallyExcel: async (formData) => {
    return await apiClient.post(API_ENDPOINTS.TALLY.UPLOAD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Retrieves imported Tally transactions from dbo.Acc_Trans_All
   * GET /api/v1/transaction/tally/transactions
   */
  getTransactions: async ({
    limit = 100,
    skip = 0,
    search = '',
    voucher_type = '',
    from_date = '',
    to_date = '',
    fin_year = '',
  } = {}) => {
    const params = { limit, skip };
    if (search && search.trim()) params.search = search.trim();
    if (voucher_type && voucher_type !== 'ALL') params.voucher_type = voucher_type.trim();
    if (from_date && from_date.trim()) params.from_date = from_date.trim();
    if (to_date && to_date.trim()) params.to_date = to_date.trim();
    if (fin_year && fin_year !== 'ALL') params.fin_year = fin_year.trim();

    return await apiClient.get(API_ENDPOINTS.TALLY.TRANSACTIONS, { params });
  },

  /**
   * Downloads official sample Tally Excel template (.xlsx)
   * GET /api/v1/transaction/tally/template
   */
  downloadTemplate: async () => {
    const response = await apiClient.get(API_ENDPOINTS.TALLY.TEMPLATE, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Tally_Upload_Template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

/**
 * Hook to retrieve Tally transactions log from Acc_Trans_All
 */
export const useTallyTransactions = ({
  limit = 100,
  skip = 0,
  search = '',
  voucher_type = '',
  from_date = '',
  to_date = '',
  fin_year = '',
  enabled = true,
} = {}) => {
  return useQuery({
    queryKey: ['tally-transactions', { limit, skip, search, voucher_type, from_date, to_date, fin_year }],
    queryFn: () => tallyApi.getTransactions({ limit, skip, search, voucher_type, from_date, to_date, fin_year }),
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Mutation hook for dry-run preview of Tally Excel
 */
export const usePreviewTallyExcel = () => {
  return useMutation({
    mutationFn: (formData) => tallyApi.previewTallyExcel(formData),
  });
};

/**
 * Mutation hook to ingest Tally Excel into Acc_Trans_All
 */
export const useUploadTallyExcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => tallyApi.uploadTallyExcel(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tally-transactions'] });
    },
  });
};

export default tallyApi;
