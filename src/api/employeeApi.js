import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Employee API Service
 * Interacts with FastAPI Employee Master Endpoints
 * Backend Router: app.include_router(employee_router, prefix="/api/v1/employee")
 */
export const employeeApi = {
  /**
   * 1. GET /api/v1/employee/employees
   * Retrieves list of employees with optional filtering
   */
  getEmployees: async ({
    search = '',
    is_active = null,
    source = null,
    skip = 0,
    limit = 100,
  } = {}) => {
    const safeLimit = Math.min(Number(limit) || 100, 200);
    const params = { skip, limit: safeLimit };
    if (search && search.trim()) params.search = search.trim();
    if (is_active !== null && is_active !== undefined) params.is_active = is_active;
    if (source && source.trim() && source !== 'ALL') params.source = source.trim();

    return await apiClient.get(API_ENDPOINTS.EMPLOYEE.LIST, { params });
  },

  /**
   * 2. GET /api/v1/employee/employees/{id}
   * Retrieves single employee record by ID
   */
  getEmployeeById: async (id) => {
    return await apiClient.get(API_ENDPOINTS.EMPLOYEE.BY_ID(id));
  },

  /**
   * 3. POST /api/v1/employee/employees
   * Creates a new manual employee in Employee_Mst
   */
  createEmployee: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.EMPLOYEE.LIST, payload);
  },

  /**
   * 4. PATCH /api/v1/employee/employees/{id}
   * Updates an existing manually created employee
   */
  updateEmployee: async ({ id, payload }) => {
    return await apiClient.patch(API_ENDPOINTS.EMPLOYEE.BY_ID(id), payload);
  },

  /**
   * 5. DELETE /api/v1/employee/employees/{id}
   * Deactivates (soft-deletes) an employee in Employee_Mst
   */
  deleteEmployee: async (id) => {
    return await apiClient.delete(API_ENDPOINTS.EMPLOYEE.BY_ID(id));
  },
};

/**
 * React Query Hook: Fetch list of employees
 */
export const useEmployees = ({
  search = '',
  is_active = null,
  source = null,
  skip = 0,
  limit = 100,
  enabled = true,
} = {}) => {
  return useQuery({
    queryKey: ['employees', { search, is_active, source, skip, limit }],
    queryFn: () => employeeApi.getEmployees({ search, is_active, source, skip, limit }),
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * React Query Hook: Fetch single employee
 */
export const useEmployee = (id, { enabled = true } = {}) => {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeApi.getEmployeeById(id),
    enabled: Boolean(id) && enabled,
  });
};

/**
 * React Query Hook: Create employee
 */
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => employeeApi.createEmployee(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Invalidate attendance queries as well since employee list is shared
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};

/**
 * React Query Hook: Update employee
 */
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => employeeApi.updateEmployee({ id, payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};

/**
 * React Query Hook: Delete / Deactivate employee
 */
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => employeeApi.deleteEmployee(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};


