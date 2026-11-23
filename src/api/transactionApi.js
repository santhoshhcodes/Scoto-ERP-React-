import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Transaction API Service
 * Integrates Quotation, Proforma Invoice, Delivery Challan, and Sales Invoice with FastAPI backend
 */
export const transactionApi = {
  // ==========================================
  // Quotation Module APIs
  // ==========================================
  getQuotations: async ({ search = '', status, finYear, page, pageSize, sortBy, sortOrder, all } = {}) => {
    const params = {};
    if (search && search.trim()) params.search = search.trim();
    if (status && status !== 'ALL') params.status = status;
    if (finYear && finYear !== 'ALL') params.fin_year = finYear;
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.page_size = pageSize;
    if (sortBy) params.sort_by = sortBy;
    if (sortOrder) params.sort_order = sortOrder;
    if (all) params.all = true;
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.QUOTATIONS, { params });
  },

  getQuotationByNo: async (transNo) => {
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.QUOTATION_BY_NO(transNo));
  },

  createQuotation: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.TRANSACTION.QUOTATIONS, payload);
  },

  updateQuotation: async (transNo, payload) => {
    return await apiClient.put(API_ENDPOINTS.TRANSACTION.QUOTATION_BY_NO(transNo), payload);
  },

  updateQuotationApproval: async (transNo, payload) => {
    return await apiClient.patch(
      `${API_ENDPOINTS.TRANSACTION.QUOTATION_BY_NO(transNo)}/approval`,
      payload
    );
  },

  reviseQuotation: async (transNo, payload) => {
    return await apiClient.post(API_ENDPOINTS.TRANSACTION.QUOTATION_REVISE(transNo), payload);
  },

  getQuotationHistory: async (transNo) => {
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.QUOTATION_REVISIONS(transNo));
  },

  deleteQuotation: async (transNo) => {
    return await apiClient.delete(API_ENDPOINTS.TRANSACTION.QUOTATION_BY_NO(transNo));
  },

  downloadQuotationExcel: async (transNo) => {
    const response = await apiClient.get(
      API_ENDPOINTS.TRANSACTION.QUOTATION_EXPORT_EXCEL(transNo),
      {
        responseType: 'blob',
      }
    );
    const blob =
      response instanceof Blob
        ? response
        : new Blob([response], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTransNo = String(transNo).replace(/[\/\\]/g, '_').trim();
    link.setAttribute('download', `quote_${safeTransNo}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ==========================================
  // Proforma Invoice Module APIs
  // ==========================================
  getProformaInvoices: async ({ search = '', status, finYear, page, pageSize, sortBy, sortOrder, all } = {}) => {
    const params = {};
    if (search && search.trim()) params.search = search.trim();
    if (status && status !== 'ALL') params.status = status;
    if (finYear && finYear !== 'ALL') params.fin_year = finYear;
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.page_size = pageSize;
    if (sortBy) params.sort_by = sortBy;
    if (sortOrder) params.sort_order = sortOrder;
    if (all) params.all = true;
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.PROFORMA_INVOICES, { params });
  },

  getProformaByNo: async (transNo) => {
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.PROFORMA_INVOICE_BY_NO(transNo));
  },

  createProformaInvoice: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.TRANSACTION.PROFORMA_INVOICES, payload);
  },

  updateProformaInvoice: async (transNo, payload) => {
    return await apiClient.put(API_ENDPOINTS.TRANSACTION.PROFORMA_INVOICE_BY_NO(transNo), payload);
  },

  updateProformaApproval: async (transNo, payload) => {
    return await apiClient.patch(
      `${API_ENDPOINTS.TRANSACTION.PROFORMA_INVOICE_BY_NO(transNo)}/approval`,
      payload
    );
  },

  deleteProformaInvoice: async (transNo) => {
    return await apiClient.delete(API_ENDPOINTS.TRANSACTION.PROFORMA_INVOICE_BY_NO(transNo));
  },

  downloadProformaInvoiceExcel: async (transNo) => {
    const response = await apiClient.get(
      API_ENDPOINTS.TRANSACTION.PROFORMA_INVOICE_EXPORT_EXCEL(transNo),
      {
        responseType: 'blob',
      }
    );
    const blob =
      response instanceof Blob
        ? response
        : new Blob([response], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTransNo = String(transNo).replace(/[\/\\]/g, '_').trim();
    link.setAttribute('download', `proforma_${safeTransNo}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ==========================================
  // Delivery Challan Module APIs
  // ==========================================
  getDeliveryChallans: async ({ search = '', returnType, finYear, page, pageSize, sortBy, sortOrder, all } = {}) => {
    const params = {};
    if (search && search.trim()) params.search = search.trim();
    if (returnType && returnType !== 'ALL') params.return_type = returnType;
    if (finYear && finYear !== 'ALL') params.fin_year = finYear;
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.page_size = pageSize;
    if (sortBy) params.sort_by = sortBy;
    if (sortOrder) params.sort_order = sortOrder;
    if (all) params.all = true;
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.DELIVERY_CHALLANS, { params });
  },

  getDeliveryChallanByNo: async (deliveryNo) => {
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.DELIVERY_CHALLAN_BY_NO(deliveryNo));
  },

  createDeliveryChallan: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.TRANSACTION.DELIVERY_CHALLANS, payload);
  },

  updateDeliveryChallan: async (deliveryNo, payload) => {
    return await apiClient.put(API_ENDPOINTS.TRANSACTION.DELIVERY_CHALLAN_BY_NO(deliveryNo), payload);
  },

  deleteDeliveryChallan: async (deliveryNo) => {
    return await apiClient.delete(API_ENDPOINTS.TRANSACTION.DELIVERY_CHALLAN_BY_NO(deliveryNo));
  },

  // ==========================================
  // Sales Invoice Module APIs
  // ==========================================
  getSalesInvoices: async ({ search = '', status, finYear, page, pageSize, sortBy, sortOrder, all } = {}) => {
    const params = {};
    if (search && search.trim()) params.search = search.trim();
    if (status && status !== 'ALL') params.status = status;
    if (finYear && finYear !== 'ALL') params.fin_year = finYear;
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.page_size = pageSize;
    if (sortBy) params.sort_by = sortBy;
    if (sortOrder) params.sort_order = sortOrder;
    if (all) params.all = true;
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.SALES_INVOICES, { params });
  },

  getSalesInvoiceByNo: async (transNo) => {
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.SALES_INVOICE_BY_NO(transNo));
  },

  getSalesInvoiceProformaMeta: async () => {
    return await apiClient.get(API_ENDPOINTS.TRANSACTION.SALES_INVOICE_PROFORMA_LIST);
  },

  createSalesInvoice: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.TRANSACTION.SALES_INVOICES, payload);
  },

  updateSalesInvoice: async (transNo, payload) => {
    return await apiClient.put(API_ENDPOINTS.TRANSACTION.SALES_INVOICE_BY_NO(transNo), payload);
  },

  updateSalesInvoiceApproval: async (transNo, payload) => {
    return await apiClient.patch(API_ENDPOINTS.TRANSACTION.SALES_INVOICE_APPROVAL(transNo), payload);
  },

  deleteSalesInvoice: async (transNo) => {
    return await apiClient.delete(API_ENDPOINTS.TRANSACTION.SALES_INVOICE_BY_NO(transNo));
  },

  downloadSalesInvoiceExcel: async (transNo) => {
    const response = await apiClient.get(
      API_ENDPOINTS.TRANSACTION.SALES_INVOICE_EXPORT_EXCEL(transNo),
      {
        responseType: 'blob',
      }
    );
    const blob =
      response instanceof Blob
        ? response
        : new Blob([response], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTransNo = String(transNo).replace(/[\/\\]/g, '_').trim();
    link.setAttribute('download', `sales_invoice_${safeTransNo}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  previewBulkSalesInvoices: async (formData) => {
    return await apiClient.post(API_ENDPOINTS.TRANSACTION.SALES_INVOICE_BULK_UPLOAD_PREVIEW, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    });
  },

  commitBulkSalesInvoices: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.TRANSACTION.SALES_INVOICE_BULK_UPLOAD_COMMIT, payload, {
      timeout: 120000,
    });
  },

  // ==========================================
  // Office Expense Module APIs (Petty Cash Ledger)
  // ==========================================
  getOfficeFunds: async () => {
    return await apiClient.get(API_ENDPOINTS.EXPENCE.FUNDS);
  },

  createOfficeFund: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.EXPENCE.CREATE_FUND, payload);
  },

  getOfficeFundBalance: async (fundId) => {
    return await apiClient.get(API_ENDPOINTS.EXPENCE.GET_BALANCE(fundId));
  },

  getOfficeTransactions: async ({ fundId, fromDate, toDate, transactionType } = {}) => {
    const params = {};
    if (fundId) params.fund_id = fundId;
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    if (transactionType && transactionType !== 'ALL') params.transaction_type = transactionType;
    return await apiClient.get(API_ENDPOINTS.EXPENCE.TRANSACTIONS, { params });
  },

  recordOfficeCredit: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.EXPENCE.RECORD_CREDIT, payload);
  },

  recordOfficeDebit: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.EXPENCE.RECORD_DEBIT, payload);
  },

  deleteOfficeTransaction: async (transactionId) => {
    return await apiClient.delete(API_ENDPOINTS.EXPENCE.DELETE_TRANSACTION(transactionId));
  },

  updateOfficeTransaction: async (transactionId, payload) => {
    return await apiClient.put(API_ENDPOINTS.EXPENCE.UPDATE_TRANSACTION(transactionId), payload);
  },

  batchAddOfficeExpenses: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.EXPENCE.BATCH_EXPENSES, payload);
  },

  getOfficeExpenseMonthlyReport: async ({ fundId, month, year } = {}) => {
    return await apiClient.get(API_ENDPOINTS.EXPENCE.MONTHLY_REPORT({ fundId, month, year }));
  },

  // Backward compatibility aliases
  getOfficeExpenses: async ({ fundId, fromDate, toDate } = {}) => {
    return await transactionApi.getOfficeTransactions({ fundId, fromDate, toDate, transactionType: 'DEBIT' });
  },
  addOfficeExpense: async (payload) => {
    return await transactionApi.recordOfficeDebit(payload);
  },
  deleteOfficeExpense: async (expenseId) => {
    return await transactionApi.deleteOfficeTransaction(expenseId);
  },
  getOfficeFundReceipts: async ({ fundId, fromDate, toDate } = {}) => {
    return await transactionApi.getOfficeTransactions({ fundId, fromDate, toDate, transactionType: 'CREDIT' });
  },
  addOfficeReceipt: async (payload) => {
    return await transactionApi.recordOfficeCredit(payload);
  },
  deleteOfficeReceipt: async (receiptId) => {
    return await transactionApi.deleteOfficeTransaction(receiptId);
  },
};

// ==========================================
// TanStack Query Hooks
// ==========================================

// Quotations
export const useQuotations = ({ search = '', status, finYear, page, pageSize, sortBy, sortOrder, all, enabled = true } = {}) => {
  const isExplicitPagination = page !== undefined || pageSize !== undefined;
  const resolvedAll = all !== undefined ? all : !isExplicitPagination;
  return useQuery({
    queryKey: ['transaction', 'quotations', { search, status, finYear, page, pageSize, sortBy, sortOrder, all: resolvedAll }],
    queryFn: () => transactionApi.getQuotations({ search, status, finYear, page, pageSize, sortBy, sortOrder, all: resolvedAll }),
    enabled,
    staleTime: 10000,
  });
};

export const useQuotationByNo = (transNo, { enabled = true } = {}) => {
  return useQuery({
    queryKey: ['transaction', 'quotation', transNo],
    queryFn: () => transactionApi.getQuotationByNo(transNo),
    enabled: Boolean(transNo && enabled),
    staleTime: 10000,
  });
};

export const useCreateQuotation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload }) => transactionApi.createQuotation(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'quotations'] }),
  });
};

export const useUpdateQuotation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transNo, payload }) => transactionApi.updateQuotation(transNo, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'quotations'] }),
  });
};

export const useUpdateQuotationApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transNo, payload }) => transactionApi.updateQuotationApproval(transNo, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'quotations'] }),
  });
};

export const useDeleteQuotation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transNo }) => transactionApi.deleteQuotation(transNo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'quotations'] }),
  });
};

export const useDownloadQuotationExcel = () => {
  return useMutation({
    mutationFn: ({ transNo }) => transactionApi.downloadQuotationExcel(transNo),
  });
};

export const useQuotationHistory = (transNo, { enabled = true } = {}) => {
  return useQuery({
    queryKey: ['transaction', 'quotation-history', transNo],
    queryFn: () => transactionApi.getQuotationHistory(transNo),
    enabled: Boolean(transNo && enabled),
    staleTime: 5000,
  });
};

export const useReviseQuotation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transNo, payload }) => transactionApi.reviseQuotation(transNo, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', 'quotations'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', 'quotation-history'] });
    },
  });
};

// Proforma Invoices
export const useProformaInvoices = ({ search = '', status, finYear, page, pageSize, sortBy, sortOrder, all, enabled = true } = {}) => {
  const isExplicitPagination = page !== undefined || pageSize !== undefined;
  const resolvedAll = all !== undefined ? all : !isExplicitPagination;
  return useQuery({
    queryKey: ['transaction', 'proforma-invoices', { search, status, finYear, page, pageSize, sortBy, sortOrder, all: resolvedAll }],
    queryFn: () => transactionApi.getProformaInvoices({ search, status, finYear, page, pageSize, sortBy, sortOrder, all: resolvedAll }),
    enabled,
    staleTime: 10000,
  });
};

export const useProformaByNo = (transNo, { enabled = true } = {}) => {
  return useQuery({
    queryKey: ['transaction', 'proforma-invoice', transNo],
    queryFn: () => transactionApi.getProformaByNo(transNo),
    enabled: Boolean(transNo && enabled),
    staleTime: 10000,
  });
};

export const useCreateProformaInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload }) => transactionApi.createProformaInvoice(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'proforma-invoices'] }),
  });
};

export const useUpdateProformaInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transNo, payload }) => transactionApi.updateProformaInvoice(transNo, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'proforma-invoices'] }),
  });
};

export const useUpdateProformaApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transNo, payload }) => transactionApi.updateProformaApproval(transNo, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'proforma-invoices'] }),
  });
};

export const useDeleteProformaInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transNo }) => transactionApi.deleteProformaInvoice(transNo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'proforma-invoices'] }),
  });
};

export const useDownloadProformaInvoiceExcel = () => {
  return useMutation({
    mutationFn: ({ transNo }) => transactionApi.downloadProformaInvoiceExcel(transNo),
  });
};

// Delivery Challans
export const useDeliveryChallans = ({ search = '', returnType, finYear, page, pageSize, sortBy, sortOrder, all, enabled = true } = {}) => {
  const isExplicitPagination = page !== undefined || pageSize !== undefined;
  const resolvedAll = all !== undefined ? all : !isExplicitPagination;
  return useQuery({
    queryKey: ['transaction', 'delivery-challans', { search, returnType, finYear, page, pageSize, sortBy, sortOrder, all: resolvedAll }],
    queryFn: () => transactionApi.getDeliveryChallans({ search, returnType, finYear, page, pageSize, sortBy, sortOrder, all: resolvedAll }),
    enabled,
    staleTime: 10000,
  });
};

export const useCreateDeliveryChallan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload }) => transactionApi.createDeliveryChallan(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'delivery-challans'] }),
  });
};

export const useUpdateDeliveryChallan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryNo, payload }) => transactionApi.updateDeliveryChallan(deliveryNo, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'delivery-challans'] }),
  });
};

export const useDeleteDeliveryChallan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryNo }) => transactionApi.deleteDeliveryChallan(deliveryNo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'delivery-challans'] }),
  });
};

// Sales Invoices
export const useSalesInvoices = ({ search = '', status, finYear, page, pageSize, sortBy, sortOrder, all, enabled = true } = {}) => {
  const isExplicitPagination = page !== undefined || pageSize !== undefined;
  const resolvedAll = all !== undefined ? all : !isExplicitPagination;
  return useQuery({
    queryKey: ['transaction', 'sales-invoices', { search, status, finYear, page, pageSize, sortBy, sortOrder, all: resolvedAll }],
    queryFn: () => transactionApi.getSalesInvoices({ search, status, finYear, page, pageSize, sortBy, sortOrder, all: resolvedAll }),
    enabled,
    staleTime: 10000,
  });
};

export const useSalesInvoiceByNo = (transNo) => {
  return useQuery({
    queryKey: ['transaction', 'sales-invoices', transNo],
    queryFn: () => transactionApi.getSalesInvoiceByNo(transNo),
    enabled: !!transNo,
  });
};

export const useSalesInvoiceProformaMeta = () => {
  return useQuery({
    queryKey: ['transaction', 'sales-invoices', 'proforma-meta'],
    queryFn: () => transactionApi.getSalesInvoiceProformaMeta(),
    staleTime: 30000,
  });
};

export const useCreateSalesInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables) => {
      const payload = variables?.payload !== undefined ? variables.payload : variables;
      return transactionApi.createSalesInvoice(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'sales-invoices'] }),
  });
};

export const useUpdateSalesInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transNo, payload }) => transactionApi.updateSalesInvoice(transNo, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'sales-invoices'] }),
  });
};

export const useUpdateSalesInvoiceApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transNo, payload }) => transactionApi.updateSalesInvoiceApproval(transNo, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'sales-invoices'] }),
  });
};

export const useDeleteSalesInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables) => {
      const transNo = typeof variables === 'string' ? variables : variables?.transNo;
      return transactionApi.deleteSalesInvoice(transNo);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction', 'sales-invoices'] }),
  });
};

export const useDownloadSalesInvoiceExcel = () => {
  return useMutation({
    mutationFn: ({ transNo }) => transactionApi.downloadSalesInvoiceExcel(transNo),
  });
};

export const usePreviewBulkSalesInvoices = () => {
  return useMutation({
    mutationFn: (formData) => transactionApi.previewBulkSalesInvoices(formData),
  });
};

export const useCommitBulkSalesInvoices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => transactionApi.commitBulkSalesInvoices(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', 'sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['master', 'ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['master', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['customer-report'] });
    },
  });
};

// ==========================================
// Office Expense Module Hooks
// ==========================================
export const useOfficeFunds = () => {
  return useQuery({
    queryKey: ['office-expenses', 'funds'],
    queryFn: () => transactionApi.getOfficeFunds(),
  });
};

export const useCreateOfficeFund = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => transactionApi.createOfficeFund(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useOfficeFundBalance = (fundId) => {
  return useQuery({
    queryKey: ['office-expenses', 'balance', fundId || 'all'],
    queryFn: () => transactionApi.getOfficeFundBalance(fundId),
  });
};

export const useOfficeTransactions = ({ fundId, fromDate, toDate, transactionType } = {}) => {
  return useQuery({
    queryKey: ['office-expenses', 'transactions', fundId || 'all', fromDate, toDate, transactionType],
    queryFn: () => transactionApi.getOfficeTransactions({ fundId, fromDate, toDate, transactionType }),
  });
};

export const useRecordOfficeCredit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => transactionApi.recordOfficeCredit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useRecordOfficeDebit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => transactionApi.recordOfficeDebit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useDeleteOfficeTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId) => transactionApi.deleteOfficeTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useUpdateOfficeTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, payload }) =>
      transactionApi.updateOfficeTransaction(transactionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useOfficeFundReceipts = ({ fundId, fromDate, toDate } = {}) => {
  return useQuery({
    queryKey: ['office-expenses', 'receipts', fundId, fromDate, toDate],
    queryFn: () => transactionApi.getOfficeFundReceipts({ fundId, fromDate, toDate }),
    enabled: !!fundId,
  });
};

export const useAddOfficeReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => transactionApi.addOfficeReceipt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useDeleteOfficeReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (receiptId) => transactionApi.deleteOfficeReceipt(receiptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useOfficeExpenses = ({ fundId, fromDate, toDate } = {}) => {
  return useQuery({
    queryKey: ['office-expenses', 'list', fundId, fromDate, toDate],
    queryFn: () => transactionApi.getOfficeExpenses({ fundId, fromDate, toDate }),
    enabled: !!fundId,
  });
};

export const useAddOfficeExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => transactionApi.addOfficeExpense(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useBatchAddOfficeExpenses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => transactionApi.batchAddOfficeExpenses(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useDeleteOfficeExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId) => transactionApi.deleteOfficeExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useOfficeExpenseMonthlyReport = ({ fundId, month, year } = {}) => {
  return useQuery({
    queryKey: ['office-expenses', 'report', fundId || 'all', month, year],
    queryFn: () => transactionApi.getOfficeExpenseMonthlyReport({ fundId, month, year }),
    enabled: !!month && !!year,
  });
};



