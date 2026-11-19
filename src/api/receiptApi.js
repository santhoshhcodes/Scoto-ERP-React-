import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Customer Receipts & Advances API
 */
export const receiptApi = {
  /**
   * Get Scoto bank and cash accounts for deposits
   * GET /api/v1/transaction/receipts/deposit-accounts
   */
  getDepositAccounts: async () => {
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.RECEIPT_DEPOSIT_ACCOUNTS);
  },

  /**
   * Get open documents (Invoices, Proformas, Quotations) for a customer
   * GET /api/v1/transaction/receipts/open-documents/:customerCode
   */
  getOpenDocuments: async (customerCode, customerName = '') => {
    if (!customerCode) return null;
    const url = API_ENDPOINTS.TRANSACTION.RECEIPT_OPEN_DOCUMENTS(customerCode);
    const params = customerName ? { customer_name: customerName } : {};
    return await apiClient.get(url, { params });
  },

  /**
   * Record a customer receipt or advance
   * POST /api/v1/transaction/receipts
   */
  createReceipt: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.TRANSACTION.RECEIPTS, payload);
  },

  /**
   * List customer receipts
   * GET /api/v1/transaction/receipts
   */
  getReceipts: async ({ search = '', customerCode = '', finYear = 'ALL', limit = 50, offset = 0 } = {}) => {
    const params = { limit, offset };
    if (search) params.search = search;
    if (customerCode) params.customer_code = customerCode;
    if (finYear && finYear !== 'ALL') params.fin_year = finYear;
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.RECEIPTS, { params });
  },

  /**
   * Get single receipt details
   * GET /api/v1/transaction/receipts/:transNo
   */
  getReceiptDetails: async (transNo) => {
    if (!transNo) return null;
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.RECEIPT_BY_NO(transNo));
  },

  /**
   * Void a customer receipt
   * DELETE /api/v1/transaction/receipts/:transNo
   */
  voidReceipt: async ({ transNo, reason = 'Voided by user' }) => {
    const url = API_ENDPOINTS.TRANSACTION.RECEIPT_BY_NO(transNo);
    return await apiClient.delete(url, { params: { reason } });
  },
};

/**
 * React Query Hook: Deposit Accounts
 */
export const useDepositAccounts = () => {
  return useQuery({
    queryKey: ['receipts', 'deposit-accounts'],
    queryFn: () => receiptApi.getDepositAccounts(),
    staleTime: 1000 * 60 * 15, // 15 mins
  });
};

/**
 * React Query Hook: Customer Open Documents for allocation
 */
export const useOpenDocuments = (customerCode, customerName = '') => {
  return useQuery({
    queryKey: ['receipts', 'open-documents', customerCode, customerName],
    queryFn: () => receiptApi.getOpenDocuments(customerCode, customerName),
    enabled: Boolean(customerCode),
    staleTime: 1000 * 30, // 30s
  });
};

/**
 * React Query Hook: List Receipts
 */
export const useCustomerReceipts = (params = {}) => {
  return useQuery({
    queryKey: ['receipts', 'list', params],
    queryFn: () => receiptApi.getReceipts(params),
    staleTime: 1000 * 60, // 1 min
  });
};

/**
 * React Query Hook: Single Receipt Details
 */
export const useReceiptDetails = (transNo) => {
  return useQuery({
    queryKey: ['receipts', 'details', transNo],
    queryFn: () => receiptApi.getReceiptDetails(transNo),
    enabled: Boolean(transNo),
    staleTime: 1000 * 60, // 1 min
  });
};

/**
 * React Mutation Hook: Create Customer Receipt
 */
export const useCreateCustomerReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => receiptApi.createReceipt(payload),
    onSuccess: () => {
      // Invalidate customer dossiers, sales invoices, and receipt lists
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-report'] });
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['proformas'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};

/**
 * React Mutation Hook: Void Customer Receipt
 */
export const useVoidCustomerReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transNo, reason }) => receiptApi.voidReceipt({ transNo, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-report'] });
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['proformas'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};

