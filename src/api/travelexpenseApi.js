import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Scoto ERP Travel Expense API Service
 * Handles itemized employee travel claims (Petrol, Food, Room, Bus Ticket, Other),
 * individual/staff summaries, and seamless integration with Petty Cash.
 */
export const travelexpenseApi = {
  // 1. Get eligible active employees from dbo.Employee_Mst
  getTravelEmployees: async () => {
    return await apiClient.get(API_ENDPOINTS.TRAVEL_EXPENSES.GET_TRAVEL_EMPLOYEES);
  },

  // 2. List claims with optional filtering
  getClaims: async ({ employeeCode, status, fromDate, toDate } = {}) => {
    const params = {};
    if (employeeCode) params.employee_code = employeeCode;
    if (status && status !== 'ALL') params.status = status;
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;

    return await apiClient.get(API_ENDPOINTS.TRAVEL_EXPENSES.CLAIMS, { params });
  },

  // Backward compatibility alias for single call
  getClaim: async (claimId) => {
    if (claimId) {
      return await apiClient.get(API_ENDPOINTS.TRAVEL_EXPENSES.GET_CLAIM_ID(claimId));
    }
    return await apiClient.get(API_ENDPOINTS.TRAVEL_EXPENSES.CLAIMS);
  },

  // 3. Get single claim with all itemized lines
  getClaimById: async (claimId) => {
    return await apiClient.get(API_ENDPOINTS.TRAVEL_EXPENSES.GET_CLAIM_ID(claimId));
  },

  // 4. Create new claim with itemized expenses
  createClaim: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.TRAVEL_EXPENSES.CLAIMS, payload);
  },

  // 5. Update claim status (PENDING, APPROVED, PAID, REJECTED) + auto-debit Petty Cash if PAID
  updateStatus: async ({ claimId, status, paidDate, recordPettyCash = true }) => {
    return await apiClient.patch(API_ENDPOINTS.TRAVEL_EXPENSES.UPDATE_STATUS(claimId), {
      status,
      paid_date: paidDate || null,
      record_petty_cash: recordPettyCash,
    });
  },

  // 6. Delete claim and associated petty cash ledger debit if exists
  deleteClaim: async (claimId) => {
    return await apiClient.delete(API_ENDPOINTS.TRAVEL_EXPENSES.DELETE_CLAIM(claimId));
  },

  // 7. Get summary (overall totals, individual employee spend breakdown, category metrics)
  getSummary: async ({ fromDate, toDate, employeeCode } = {}) => {
    const params = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    if (employeeCode) params.employee_code = employeeCode;

    return await apiClient.get(API_ENDPOINTS.TRAVEL_EXPENSES.SUMMARY, { params });
  },
};

// =============================================================
// React Query Hooks
// =============================================================

export const useTravelEmployees = () => {
  return useQuery({
    queryKey: ['travel-expenses', 'employees'],
    queryFn: () => travelexpenseApi.getTravelEmployees(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTravelClaims = ({ employeeCode, status, fromDate, toDate } = {}) => {
  return useQuery({
    queryKey: ['travel-expenses', 'claims', employeeCode || 'all', status || 'all', fromDate || '', toDate || ''],
    queryFn: () => travelexpenseApi.getClaims({ employeeCode, status, fromDate, toDate }),
  });
};

export const useTravelClaim = (claimId) => {
  return useQuery({
    queryKey: ['travel-expenses', 'claim', claimId],
    queryFn: () => travelexpenseApi.getClaimById(claimId),
    enabled: Boolean(claimId),
  });
};

export const useTravelSummary = ({ fromDate, toDate, employeeCode } = {}) => {
  return useQuery({
    queryKey: ['travel-expenses', 'summary', fromDate || '', toDate || '', employeeCode || 'all'],
    queryFn: () => travelexpenseApi.getSummary({ fromDate, toDate, employeeCode }),
  });
};

export const useCreateTravelClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => travelexpenseApi.createClaim(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-expenses'] });
      // Invalidate petty cash ledger queries so balance updates automatically
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useUpdateTravelClaimStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, status, paidDate, recordPettyCash }) =>
      travelexpenseApi.updateStatus({ claimId, status, paidDate, recordPettyCash }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export const useDeleteTravelClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (claimId) => travelexpenseApi.deleteClaim(claimId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    },
  });
};

export default travelexpenseApi;