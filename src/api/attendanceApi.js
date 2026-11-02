import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, baseApi } from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Attendance API Service
 * Connects Scoto ERP Frontend to FastAPI Attendance & Adjustment Engines
 * Backend Reference: C:\Projects\Scoto\office\scoto-backend
 */
export const attendanceApi = {
  /**
   * Health check for FastAPI backend
   */
  getHealth: async () => {
    return await baseApi.get(API_ENDPOINTS.HEALTH);
  },

  /**
   * 1. GET /api/v1/attendance/reconciliation
   * Retrieves aggregated monthly first-in, last-out, duration logs for biometric device reconciliation.
   */
  getDailyReconciliation: async ({
    month,
    year,
    employee_code,
    limit = 5000,
    offset = 0,
  } = {}) => {
    const params = {
      month: Number(month),
      year: Number(year),
      limit: Number(limit),
      offset: Number(offset),
    };

    if (employee_code && employee_code.trim()) {
      params.employee_code = employee_code.trim();
    }

    return await apiClient.get(API_ENDPOINTS.ATTENDANCE.RECONCILIATION, {
      params,
    });
  },

  /**
   * 2. GET /api/v1/attendance/daily-summary
   * Retrieves daily attendance status (FULL_DAY, HALF_DAY, SHORT_HOURS, SINGLE_PUNCH_ANOMALY,
   * NO_CHECK_IN_REVIEW, PRESENT_CONFIRMED, ABSENT_CONFIRMED, ON_DUTY, DEVICE_ISSUE, ON_LEAVE, LOP)
   * for all active employees on a specific date.
   */
  getDailySummary: async ({
    target_date,
    employee_code,
    limit = 5000,
    offset = 0,
  } = {}) => {
    const params = {
      target_date,
      limit: Number(limit),
      offset: Number(offset),
    };

    if (employee_code && employee_code.trim()) {
      params.employee_code = employee_code.trim();
    }

    return await apiClient.get(API_ENDPOINTS.ATTENDANCE.DAILY_SUMMARY, {
      params,
    });
  },

  /**
   * 2b. GET /api/v1/attendance/monthly-report
   * Retrieves full month day-by-day structured report per employee and overall.
   */
  getMonthlyReport: async ({ month, year, employee_code } = {}) => {
    const params = {
      month: Number(month),
      year: Number(year),
    };
    if (employee_code && employee_code.trim()) {
      params.employee_code = employee_code.trim();
    }
    return await apiClient.get(API_ENDPOINTS.ATTENDANCE.MONTHLY_REPORT, {
      params,
    });
  },

  /**
   * POST /api/v1/attendance/download-logs
   * Triggers direct download of biometric punch logs from eSSL device into DB1 (etimetracklite1)
   */
  downloadDeviceLogs: async (deviceId) => {
    const params = deviceId ? { device_id: deviceId } : undefined;
    return await apiClient.post(API_ENDPOINTS.ATTENDANCE.DOWNLOAD_LOGS, null, {
      params,
    });
  },

  /**
   * 3. PUT /api/v1/attendance-adjustments/daily-review
   * Upsert manual daily attendance review record with corrected punches & review status.
   */
  saveDailyReview: async (payload) => {
    return await apiClient.put(
      API_ENDPOINTS.ATTENDANCE_ADJUSTMENTS.DAILY_REVIEW,
      payload
    );
  },

  /**
   * 4. PUT /api/v1/attendance-adjustments/late-fines
   * Upsert late fine record for an employee on a specific attendance date.
   */
  saveLateFine: async (payload) => {
    return await apiClient.put(
      API_ENDPOINTS.ATTENDANCE_ADJUSTMENTS.LATE_FINES,
      payload
    );
  },

  /**
   * 4b. GET /api/v1/attendance-adjustments/monthly-late-fines
   * Retrieves all assessed and unassessed late fines for an entire month.
   */
  getMonthlyLateFines: async ({ month, year, employee_code } = {}) => {
    const params = {
      month: Number(month),
      year: Number(year),
    };
    if (employee_code && employee_code.trim()) {
      params.employee_code = employee_code.trim();
    }
    return await apiClient.get(
      API_ENDPOINTS.ATTENDANCE_ADJUSTMENTS.MONTHLY_LATE_FINES,
      { params }
    );
  },

  /**
   * 5. POST /api/v1/attendance-adjustments/permissions
   * Submit manual employee permission request.
   */
  createPermission: async (payload) => {
    return await apiClient.post(
      API_ENDPOINTS.ATTENDANCE_ADJUSTMENTS.PERMISSIONS,
      payload
    );
  },

  /**
   * 6. PATCH /api/v1/attendance-adjustments/permissions/{id}/decision
   * Approve, Reject, or Cancel permission request.
   */
  decidePermission: async ({ permissionId, decision, approved_by }) => {
    return await apiClient.patch(
      API_ENDPOINTS.ATTENDANCE_ADJUSTMENTS.PERMISSION_DECISION(permissionId),
      { decision, approved_by }
    );
  },

  /**
   * 7. POST /api/v1/attendance-adjustments/leaves
   * Submit employee leave application.
   */
  createLeave: async (payload) => {
    return await apiClient.post(
      API_ENDPOINTS.ATTENDANCE_ADJUSTMENTS.LEAVES,
      payload
    );
  },

  /**
   * 8. PATCH /api/v1/attendance-adjustments/leaves/{id}/decision
   * Approve, Reject, or Cancel leave application.
   */
  decideLeave: async ({ leaveId, decision, approved_by }) => {
    return await apiClient.patch(
      API_ENDPOINTS.ATTENDANCE_ADJUSTMENTS.LEAVE_DECISION(leaveId),
      { decision, approved_by }
    );
  },

  /**
   * 9. GET /api/v1/attendance/holidays
   * Retrieve list of holidays for a given year.
   */
  getHolidays: async (year) => {
    const params = year ? { year: Number(year) } : undefined;
    return await apiClient.get(API_ENDPOINTS.ATTENDANCE.HOLIDAYS, { params });
  },

  /**
   * 10. POST /api/v1/attendance/holidays
   * Create new holiday record.
   */
  createHoliday: async (payload) => {
    return await apiClient.post(API_ENDPOINTS.ATTENDANCE.HOLIDAYS, payload);
  },

  /**
   * 11. PUT /api/v1/attendance/holidays/{id}
   * Update holiday record.
   */
  updateHoliday: async ({ id, ...payload }) => {
    return await apiClient.put(API_ENDPOINTS.ATTENDANCE.HOLIDAY_BY_ID(id), payload);
  },

  /**
   * 12. DELETE /api/v1/attendance/holidays/{id}
   * Delete holiday record.
   */
  deleteHoliday: async (id) => {
    return await apiClient.delete(API_ENDPOINTS.ATTENDANCE.HOLIDAY_BY_ID(id));
  },
};

// ==========================================
// TanStack Query React Hooks
// ==========================================

/**
 * Hook for Backend Health Status
 */
export const useBackendHealth = () => {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: attendanceApi.getHealth,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook for fetching Monthly Biometric Reconciliation Logs
 * GET /api/v1/attendance/reconciliation
 */
export const useAttendanceReconciliation = ({
  month,
  year,
  employee_code = '',
  limit = 50,
  offset = 0,
  enabled = true,
} = {}) => {
  return useQuery({
    queryKey: ['attendance', 'reconciliation', { month, year, employee_code, limit, offset }],
    queryFn: () =>
      attendanceApi.getDailyReconciliation({
        month,
        year,
        employee_code,
        limit,
        offset,
      }),
    enabled: Boolean(month && year && enabled),
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook for fetching Monthly Attendance Summary Report (Day-by-Day Grid)
 * GET /api/v1/attendance/monthly-report
 */
export const useMonthlyReport = ({
  month,
  year,
  employee_code = '',
  enabled = true,
} = {}) => {
  return useQuery({
    queryKey: ['attendance', 'monthly_report', { month, year, employee_code }],
    queryFn: () =>
      attendanceApi.getMonthlyReport({
        month,
        year,
        employee_code,
      }),
    enabled: Boolean(month && year && enabled),
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook for fetching Daily Attendance Summary
 * GET /api/v1/attendance/daily-summary
 */
export const useDailySummary = ({
  target_date,
  employee_code = '',
  limit = 100,
  offset = 0,
  enabled = true,
  refetchInterval = false,
} = {}) => {
  return useQuery({
    queryKey: ['attendance', 'daily_summary', { target_date, employee_code, limit, offset }],
    queryFn: () =>
      attendanceApi.getDailySummary({
        target_date,
        employee_code,
        limit,
        offset,
      }),
    enabled: Boolean(target_date && enabled),
    staleTime: 15000,
    refetchInterval,
    retry: 1,
  });
};

/**
 * Compatibility hook for legacy references to timesheets (wraps useDailySummary)
 */
export const useTimesheets = ({ target_date } = {}) => {
  return useDailySummary({ target_date });
};

/**
 * Hook for saving Daily Review (PUT /api/v1/attendance-adjustments/daily-review)
 */
export const useSaveDailyReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.saveDailyReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'reconciliation'] });
    },
  });
};

/**
 * Hook for saving Late Fine (PUT /api/v1/attendance-adjustments/late-fines)
 */
export const useSaveLateFine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.saveLateFine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'daily_summary'] });
    },
  });
};

/**
 * Hook for creating Permission (POST /api/v1/attendance-adjustments/permissions)
 */
export const useCreatePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.createPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'daily_summary'] });
    },
  });
};

/**
 * Hook for deciding Permission (PATCH /api/v1/attendance-adjustments/permissions/{id}/decision)
 */
export const useDecidePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.decidePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'daily_summary'] });
    },
  });
};

/**
 * Hook for creating Leave (POST /api/v1/attendance-adjustments/leaves)
 */
export const useCreateLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.createLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'daily_summary'] });
    },
  });
};

/**
 * Hook for deciding Leave (PATCH /api/v1/attendance-adjustments/leaves/{id}/decision)
 */
export const useDecideLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.decideLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'daily_summary'] });
    },
  });
};

/**
 * Manually refresh attendance from the backend.
 * No attendance records are inserted into DB2 by this hook.
 */
export const x = ({
  target_date,
  employee_code = "",
  limit = 5000,
  offset = 0,
} = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!target_date) {
        throw new Error("Please select an attendance date.");
      }

      return attendanceApi.getDailySummary({
        target_date,
        employee_code,
        limit,
        offset,
      });
    },

    onSuccess: (data) => {
      queryClient.setQueryData(
        [
          "attendance",
          "daily_summary",
          {
            target_date,
            employee_code,
            limit,
            offset,
          },
        ],
        data
      );
    },
  });
};

/**
 * Hook to download device punch logs directly from eSSL biometric terminal into DB1
 */
export const useDownloadDeviceLogs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceId) => attendanceApi.downloadDeviceLogs(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
};

/**
 * Hook to toggle an employee's persistent On-Site staff status
 */
export const useToggleOnSite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeCode) => {
      return await apiClient.patch(API_ENDPOINTS.EMPLOYEE.TOGGLE_ONSITE(employeeCode));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

// Backwards compatibility alias
export const useToggleOnField = useToggleOnSite;

/**
 * Hook to fetch monthly late fine records across all days of a month
 * GET /api/v1/attendance-adjustments/monthly-late-fines
 */
export const useMonthlyLateFines = ({
  month,
  year,
  employee_code = '',
  enabled = true,
} = {}) => {
  return useQuery({
    queryKey: ['attendance', 'monthly_late_fines', { month, year, employee_code }],
    queryFn: () =>
      attendanceApi.getMonthlyLateFines({
        month,
        year,
        employee_code,
      }),
    enabled: Boolean(month && year && enabled),
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook to fetch holidays for a year
 */
export const useHolidays = (year = new Date().getFullYear()) => {
  return useQuery({
    queryKey: ['attendance', 'holidays', year],
    queryFn: () => attendanceApi.getHolidays(year),
    staleTime: 60000,
  });
};

/**
 * Hook to create a new holiday
 */
export const useCreateHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => attendanceApi.createHoliday(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'holidays'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'monthly_report'] });
    },
  });
};

/**
 * Hook to update a holiday
 */
export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => attendanceApi.updateHoliday(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'holidays'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'monthly_report'] });
    },
  });
};

/**
 * Hook to delete a holiday
 */
export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => attendanceApi.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'holidays'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'monthly_report'] });
    },
  });
};


































