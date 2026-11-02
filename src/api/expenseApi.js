import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Scoto ERP Office Expense & Daily Items API
 * Connects with FastAPI /api/v1/office-expenses and /api/v1/office-expenses/daily
 */
export const expenseApi = {
  // -------------------------------------------------------------
  // 1. Daily Recurring Items (/office-expenses/daily/items)
  // -------------------------------------------------------------
  getItems: async (includeInactive = false) => {
    return await apiClient.get(API_ENDPOINTS.DAILY_EXPENSES.GET_ITEMS, {
      params: { include_inactive: includeInactive },
    });
  },

  createItem: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.DAILY_EXPENSES.POST_ITEMS, payload);
  },

  updateItem: async (itemId, payload) => {
    return await apiClient.put(API_ENDPOINTS.DAILY_EXPENSES.UPDATE_ITEMS(itemId), payload);
  },

  // -------------------------------------------------------------
  // 2. Daily Usage Entries (/office-expenses/daily/usage)
  // -------------------------------------------------------------
  getDailyUsage: async (expenseDate) => {
    return await apiClient.get(API_ENDPOINTS.DAILY_EXPENSES.GET_USAGE(expenseDate));
  },

  saveDailyUsage: async (payload) => {
    return await apiClient.put(API_ENDPOINTS.DAILY_EXPENSES.SAVE_USAGE, payload);
  },

  // -------------------------------------------------------------
  // 3. Date-to-Date Period Register (/office-expenses/daily/register)
  // -------------------------------------------------------------
  getDailyRegister: async ({ fromDate, toDate, search } = {}) => {
    const params = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    if (search && search.trim()) params.search = search.trim();
    return await apiClient.get(API_ENDPOINTS.DAILY_EXPENSES.GET_REGISTER, { params });
  },

  // -------------------------------------------------------------
  // 4. Vendor Summaries & Settlements (/office-expenses/daily/...)
  // -------------------------------------------------------------
  getVendorSummary: async (periodMonth) => {
    return await apiClient.get(API_ENDPOINTS.DAILY_EXPENSES.GET_VENDORS, {
      params: { period_month: periodMonth },
    });
  },

  settleVendor: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.DAILY_EXPENSES.SETTLE_VENDOR, payload);
  },

  getSettlementHistory: async (periodMonth) => {
    return await apiClient.get(API_ENDPOINTS.DAILY_EXPENSES.SETTLEMENT_HISTORY, {
      params: { period_month: periodMonth },
    });
  },

  // -------------------------------------------------------------
  // 5. Petty Cash Ledger Integration (/office-expenses)
  // -------------------------------------------------------------
  getFunds: async () => {
    return await apiClient.get(API_ENDPOINTS.EXPENSE.FUNDS);
  },

  createFund: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.EXPENSE.CREATE_FUND, payload);
  },

  getFundBalance: async (fundId) => {
    return await apiClient.get(API_ENDPOINTS.EXPENSE.GET_BALANCE(fundId));
  },

  getTransactions: async ({ fundId, fromDate, toDate, transactionType } = {}) => {
    const params = {};
    if (fundId) params.fund_id = fundId;
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    if (transactionType && transactionType !== 'ALL') params.transaction_type = transactionType;
    return await apiClient.get(API_ENDPOINTS.EXPENSE.TRANSACTIONS, { params });
  },

  recordCredit: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.EXPENSE.RECORD_CREDIT, payload);
  },

  recordDebit: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.EXPENSE.RECORD_DEBIT, payload);
  },

  deleteTransaction: async (transactionId) => {
    return await apiClient.delete(API_ENDPOINTS.EXPENSE.DELETE_TRANSACTION(transactionId));
  },

  updateTransaction: async (transactionId, payload) => {
    return await apiClient.put(API_ENDPOINTS.EXPENSE.UPDATE_TRANSACTION(transactionId), payload);
  },

  batchAddExpenses: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.EXPENSE.BATCH_EXPENSES, payload);
  },

  getMonthlyReport: async ({ fundId, month, year } = {}) => {
    return await apiClient.get(API_ENDPOINTS.EXPENSE.MONTHLY_REPORT({ fundId, month, year }));
  },
};

// =============================================================
// React Query Hooks: Daily Items & Usage
// =============================================================
export const useDailyItems = (includeInactive = false) => {
  return useQuery({
    queryKey: ['office-expenses', 'daily', 'items', { includeInactive }],
    queryFn: () => expenseApi.getItems(includeInactive),
    staleTime: 60000,
  });
};

export const useCreateDailyItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => expenseApi.createItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses', 'daily', 'items'] });
    },
  });
};

export const useUpdateDailyItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }) => expenseApi.updateItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses', 'daily'] });
    },
  });
};

export const useDailyUsage = (expenseDate, { enabled = true } = {}) => {
  return useQuery({
    queryKey: ['office-expenses', 'daily', 'usage', expenseDate],
    queryFn: () => expenseApi.getDailyUsage(expenseDate),
    enabled: Boolean(expenseDate && enabled),
  });
};

export const useSaveDailyUsage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => expenseApi.saveDailyUsage(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses', 'daily'] });
      if (variables?.expense_date) {
        queryClient.invalidateQueries({
          queryKey: ['office-expenses', 'daily', 'usage', variables.expense_date],
        });
      }
    },
  });
};

export const useDailyRegister = ({ fromDate, toDate, search } = {}) => {
  return useQuery({
    queryKey: ['office-expenses', 'daily', 'register', { fromDate, toDate, search }],
    queryFn: () => expenseApi.getDailyRegister({ fromDate, toDate, search }),
    enabled: Boolean(fromDate && toDate),
  });
};

export const useDailyVendorSummary = (periodMonth, { enabled = true } = {}) => {
  return useQuery({
    queryKey: ['office-expenses', 'daily', 'vendors', periodMonth],
    queryFn: () => expenseApi.getVendorSummary(periodMonth),
    enabled: Boolean(periodMonth && enabled),
  });
};

export const useSettleDailyVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => expenseApi.settleVendor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useDailySettlementHistory = (periodMonth, { enabled = true } = {}) => {
  return useQuery({
    queryKey: ['office-expenses', 'daily', 'settlements', periodMonth],
    queryFn: () => expenseApi.getSettlementHistory(periodMonth),
    enabled: Boolean(periodMonth && enabled),
  });
};

// =============================================================
// React Query Hooks: Petty Cash Ledger Integration
// =============================================================
export const useExpenseFunds = () => {
  return useQuery({
    queryKey: ['office-expenses', 'funds'],
    queryFn: () => expenseApi.getFunds(),
  });
};

export const useCreateExpenseFund = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => expenseApi.createFund(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useExpenseBalance = (fundId) => {
  return useQuery({
    queryKey: ['office-expenses', 'balance', fundId || 'all'],
    queryFn: () => expenseApi.getFundBalance(fundId),
  });
};

export const useExpenseTransactions = ({ fundId, fromDate, toDate, transactionType } = {}) => {
  return useQuery({
    queryKey: ['office-expenses', 'transactions', fundId || 'all', fromDate, toDate, transactionType],
    queryFn: () => expenseApi.getTransactions({ fundId, fromDate, toDate, transactionType }),
  });
};

export const useRecordExpenseCredit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => expenseApi.recordCredit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useRecordExpenseDebit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => expenseApi.recordDebit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useDeleteExpenseTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId) => expenseApi.deleteTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useUpdateExpenseTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, payload }) =>
      expenseApi.updateTransaction(transactionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useBatchAddExpenses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => expenseApi.batchAddExpenses(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useExpenseMonthlyReport = ({ fundId, month, year } = {}) => {
  return useQuery({
    queryKey: ['office-expenses', 'report', fundId || 'all', month, year],
    queryFn: () => expenseApi.getMonthlyReport({ fundId, month, year }),
    enabled: Boolean(month && year),
  });
};

export default expenseApi;
