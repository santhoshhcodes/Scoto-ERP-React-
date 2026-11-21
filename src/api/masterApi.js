import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, baseApi } from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Master API Service
 * Connects Scoto ERP Frontend to FastAPI Master Module (Items & Ledgers)
 * Backend Reference: C:\Projects\Scoto\office\scoto-backend
 */
export const masterApi = {
  /**
   * Health check for FastAPI backend
   */
  getHealth: async () => {
    return await baseApi.get(API_ENDPOINTS.HEALTH);
  },

  // ==========================================
  // Item Master APIs
  // ==========================================

  /**
   * Fetch active items from MSSQL Mst_Item
   * GET /api/v1/master/items?search={search}&product_type={product_type}
   */
  getItems: async ({ search, product_type } = {}) => {
    const params = {};
    if (search && search.trim()) {
      params.search = search.trim();
    }
    if (product_type && product_type !== 'ALL') {
      params.product_type = product_type;
    }

    return await apiClient.get(API_ENDPOINTS.MASTER.ITEMS, { params });
  },

  /**
   * Add a new item entry
   * POST /api/v1/master/items
   */
  createItem: async (payload) => {
    const formattedPayload = {
      ProductType: payload.ProductType || payload.productType || 'ESSL',
      ItemCode: String(payload.ItemCode || payload.itemCode || '').trim(),
      ItemDescription: String(payload.ItemDescription || payload.itemDescription || '').trim(),
      ItemType: payload.ItemType || payload.itemType || 'Face Recognition Terminal',
      HSNCode: String(payload.HSNCode || payload.hsnCode || '8543').trim(),
      UOM: payload.UOM || payload.uom || 'Pcs',
      SerialNo: payload.SerialNo || payload.serialNo || 'YES',
      Status: payload.Status || payload.status || 'ACTIVE',
    };

    return await apiClient.post(API_ENDPOINTS.MASTER.ITEMS, formattedPayload);
  },

  /**
   * Update item details in MSSQL
   * PUT /api/v1/master/items/{item_code}
   */
  updateItem: async (itemCode, payload) => {
    const formattedPayload = {
      ProductType: payload.ProductType || payload.productType,
      ItemDescription: payload.ItemDescription || payload.itemDescription,
      ItemType: payload.ItemType || payload.itemType,
      HSNCode: payload.HSNCode || payload.hsnCode,
      UOM: payload.UOM || payload.uom,
      SerialNo: payload.SerialNo || payload.serialNo,
      Status: payload.Status || payload.status,
    };

    return await apiClient.put(
      API_ENDPOINTS.MASTER.ITEM_BY_CODE(itemCode),
      formattedPayload
    );
  },

  /**
   * Soft delete item (Status='Delete')
   * DELETE /api/v1/master/items/{item_code}
   */
  deleteItem: async (itemCode) => {
    return await apiClient.delete(
      API_ENDPOINTS.MASTER.ITEM_BY_CODE(itemCode)
    );
  },

  // ==========================================
  // Ledger / Supplier Master APIs
  // ==========================================

  /**
   * Fetch General Ledgers and Party Accounts
   * GET /api/v1/master/ledgers?search={search}&ledger_type={ledger_type}
   */
  getLedgers: async ({ search, ledger_type } = {}) => {
    const params = {};
    if (search && search.trim()) {
      params.search = search.trim();
    }
    if (ledger_type && ledger_type !== 'ALL') {
      params.ledger_type = ledger_type;
    }

    return await apiClient.get(API_ENDPOINTS.MASTER.LEDGERS, { params });
  },

  /**
   * Add a new Supplier / Ledger entry
   * POST /api/v1/master/ledgers
   */
  createLedger: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.MASTER.LEDGERS, payload);
  },

  /**
   * Update existing Supplier / Ledger entry
   * PUT /api/v1/master/ledgers/{ledger_code}
   */
  updateLedger: async (ledgerCode, payload) => {
    return await apiClient.put(
      API_ENDPOINTS.MASTER.LEDGER_BY_CODE(ledgerCode),
      payload
    );
  },

  /**
   * Soft delete ledger (Status='Delete')
   * DELETE /api/v1/master/ledgers/{ledger_code}
   */
  deleteLedger: async (ledgerCode) => {
    return await apiClient.delete(
      API_ENDPOINTS.MASTER.LEDGER_BY_CODE(ledgerCode)
    );
  },

  /**
   * Fetch Account Categories & Headers for dropdown menus
   * GET /api/v1/master/ledgers/headers
   */
  getLedgerHeaders: async () => {
    return await apiClient.get(API_ENDPOINTS.MASTER.LEDGER_HEADERS);
  },

  /**
   * Fetch next sequential ledger code (e.g. CUS/00029, SUP/00006, GL/00763)
   * GET /api/v1/master/ledgers/next-code?ledger_type={ledger_type}
   */
  getNextLedgerCode: async (ledgerType) => {
    return await apiClient.get(API_ENDPOINTS.MASTER.NEXT_LEDGER_CODE, {
      params: { ledger_type: ledgerType },
    });
  },
};

// ==========================================
// TanStack Query React Hooks
// ==========================================

/**
 * Hook for fetching Item Master list
 */
export const useMasterItems = ({
  search = '',
  product_type = 'ALL',
  enabled = true,
  refetchInterval = false,
} = {}) => {
  return useQuery({
    queryKey: ['master', 'items', { search, product_type }],
    queryFn: () => masterApi.getItems({ search, product_type }),
    enabled,
    staleTime: 30000,
    refetchInterval,
    retry: 1,
  });
};

/**
 * Hook for Creating a new Item
 */
export const useCreateMasterItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }) => masterApi.createItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'items'] });
    },
  });
};

/**
 * Hook for Updating an Item
 */
export const useUpdateMasterItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemCode, payload }) => masterApi.updateItem(itemCode, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'items'] });
    },
  });
};

/**
 * Hook for Deleting an Item
 */
export const useDeleteMasterItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemCode }) => masterApi.deleteItem(itemCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'items'] });
    },
  });
};

/**
 * Hook for fetching Ledger Master list
 */
export const useMasterLedgers = ({
  search = '',
  ledger_type = 'ALL',
  enabled = true,
  refetchInterval = false,
} = {}) => {
  return useQuery({
    queryKey: ['master', 'ledgers', { search, ledger_type }],
    queryFn: () => masterApi.getLedgers({ search, ledger_type }),
    enabled,
    staleTime: 30000,
    refetchInterval,
    retry: 1,
  });
};

/**
 * Hook for Creating a new Supplier / Ledger
 */
export const useCreateMasterLedger = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }) => masterApi.createLedger(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'ledgers'] });
    },
  });
};

/**
 * Hook for Updating a Supplier / Ledger
 */
export const useUpdateMasterLedger = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ledgerCode, payload }) => masterApi.updateLedger(ledgerCode, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'ledgers'] });
    },
  });
};

/**
 * Hook for Deleting a Supplier / Ledger
 */
export const useDeleteMasterLedger = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ledgerCode }) => masterApi.deleteLedger(ledgerCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'ledgers'] });
    },
  });
};

/**
 * Hook for fetching Ledger Account Headers & Categories
 */
export const useLedgerHeaders = ({ enabled = true } = {}) => {
  return useQuery({
    queryKey: ['master', 'ledger_headers'],
    queryFn: async () => {
      try {
        return await masterApi.getLedgerHeaders();
      } catch (err) {
        console.warn('Could not load ledger headers from backend, using standard categories:', err);
        return { success: false, data: [] };
      }
    },
    enabled,
    staleTime: 60000,
    retry: false,
  });
};