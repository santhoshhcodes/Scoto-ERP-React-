/**
 * Scoto ERP - Network Configuration & API Endpoints
 * Maps frontend services to FastAPI backend (Port 2015)
 * Reference: C:\\Projects\\Scoto\\office\\scoto-backend
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://192.168.1.2:2015/api/v1';

export const BASE_IP_URL =
  import.meta.env.BASE_IP_URL || 'http://192.168.1.2:2015';

export const API_ENDPOINTS = {
  HEALTH: '/health',

  AUTH: {
    LOGIN: '/auth/login',
    META: '/auth/meta',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_OTP: '/auth/verify-otp',
    RESET_PASSWORD: '/auth/reset-password',
    ACTIVATE_ACCOUNT: '/auth/activate-account',
    VERIFY_DEVICE_OTP: '/auth/verify-device-otp',
    CHANGE_PASSWORD: '/auth/change-password',
    FIRST_TIME_ACTIVATE: '/auth/first-time-activate',
  },

  ATTENDANCE: {
    RECONCILIATION: '/attendance/reconciliation',
    DAILY_SUMMARY: '/attendance/daily-summary',
    MONTHLY_REPORT: '/attendance/monthly-report',
    DOWNLOAD_LOGS: '/attendance/download-logs',
    HOLIDAYS: '/attendance/holidays',
    HOLIDAY_BY_ID: (id) => `/attendance/holidays/${id}`,
    EMPLOYEE_SHIFT_TIMING: '/attendance/employee-shift-timing',
  },

  ATTENDANCE_ADJUSTMENTS: {
    DAILY_REVIEW: '/attendance-adjustments/daily-review',
    LATE_FINES: '/attendance-adjustments/late-fines',
    MONTHLY_LATE_FINES: '/attendance-adjustments/monthly-late-fines',
    PERMISSIONS: '/attendance-adjustments/permissions',
    PERMISSION_DECISION: (permissionId) =>
      `/attendance-adjustments/permissions/${permissionId}/decision`,
    LEAVES: '/attendance-adjustments/leaves',
    LEAVE_DECISION: (leaveId) =>
      `/attendance-adjustments/leaves/${leaveId}/decision`,
  },

  MASTER: {
    ITEMS: '/master/items',
    ITEM_BY_CODE: (itemCode) => `/master/items/${encodeURIComponent(itemCode)}`,
    LEDGERS: '/master/ledgers',
    LEDGER_BY_CODE: (ledgerCode) => `/master/ledgers/${encodeURIComponent(ledgerCode)}`,
    LEDGER_HEADERS: '/master/ledgers/headers',
    NEXT_LEDGER_CODE: '/master/ledgers/next-code',
  },

  TRANSACTION: {
    QUOTATIONS: '/transaction/quotations',
    QUOTATION_NEXT_NO: '/transaction/quotations/next-trans-no',
    QUOTATION_CHECK_NO: '/transaction/quotations/check-trans-no',
    QUOTATION_BY_NO: (transNo) => `/transaction/quotations/${encodeURIComponent(transNo)}`,
    QUOTATION_REVISE: (transNo) => `/transaction/quotations/${encodeURIComponent(transNo)}/revise`,
    QUOTATION_REVISIONS: (transNo) => `/transaction/quotations/${encodeURIComponent(transNo)}/revisions`,
    QUOTATION_EXPORT_EXCEL: (transNo) => `/transaction/quotations/${encodeURIComponent(transNo)}/export-excel`,

    PROFORMA_INVOICES: '/transaction/proforma-invoices',
    PROFORMA_INVOICE_NEXT_NO: '/transaction/proforma-invoices/next-trans-no',
    PROFORMA_INVOICE_CHECK_NO: '/transaction/proforma-invoices/check-trans-no',
    PROFORMA_INVOICE_BY_NO: (transNo) => `/transaction/proforma-invoices/${encodeURIComponent(transNo)}`,
    PROFORMA_INVOICE_EXPORT_EXCEL: (transNo) => `/transaction/proforma-invoices/${encodeURIComponent(transNo)}/export-excel`,

    DELIVERY_CHALLANS: '/transaction/delivery-challans',
    DELIVERY_CHALLAN_BY_NO: (deliveryNo) => `/transaction/delivery-challans/${encodeURIComponent(deliveryNo)}`,
    SALES_INVOICES: '/transaction/sales-invoices',
    SALES_INVOICE_NEXT_NO: '/transaction/sales-invoices/next-trans-no',
    SALES_INVOICE_CHECK_NO: '/transaction/sales-invoices/check-trans-no',
    SALES_INVOICE_BY_NO: (transNo) => `/transaction/sales-invoices/${encodeURIComponent(transNo)}`,
    SALES_INVOICE_EXPORT_EXCEL: (transNo) => `/transaction/sales-invoices/${encodeURIComponent(transNo)}/export-excel`,
    SALES_INVOICE_APPROVAL: (transNo) => `/transaction/sales-invoices/${encodeURIComponent(transNo)}/approval`,
    SALES_INVOICE_PROFORMA_LIST: '/transaction/sales-invoices/meta/proforma-invoices',
    SALES_INVOICE_BULK_UPLOAD_PREVIEW: '/transaction/sales-invoices/bulk-upload-preview',
    SALES_INVOICE_BULK_UPLOAD_COMMIT: '/transaction/sales-invoices/bulk-upload-commit',
    CUSTOMER_REPORT_CLIENTS: '/transaction/customer-report/clients',
    CUSTOMER_REPORT_FINANCIAL_YEARS: '/transaction/customer-report/financial-years',
    CUSTOMER_REPORT_PORTFOLIO_SUMMARY: '/transaction/customer-report/portfolio-summary',
    CUSTOMER_REPORT_DOSSIER: (clientCode) => `/transaction/customer-report/dossier/${encodeURIComponent(clientCode)}`,
    CUSTOMER_REPORT_EXPORT_EXCEL: (clientCode) => `/transaction/customer-report/export-excel/${encodeURIComponent(clientCode)}`,

    RECEIPTS: '/transaction/receipts',
    RECEIPT_DEPOSIT_ACCOUNTS: '/transaction/receipts/deposit-accounts',
    RECEIPT_OPEN_DOCUMENTS: (clientCode) => `/transaction/receipts/open-documents/${encodeURIComponent(clientCode)}`,
    RECEIPT_BY_NO: (transNo) => `/transaction/receipts/${encodeURIComponent(transNo)}`,
  },

  EMPLOYEE: {
    LIST: '/employee/employees',
    BY_ID: (id) => `/employee/employees/${id}`,
    TOGGLE_ONSITE: (code) => `/employee/employees/by-code/${code}/toggle-onsite`,
    TOGGLE_ONFIELD: (code) => `/employee/employees/by-code/${code}/toggle-onsite`,
  },

  TALLY: {
    PREVIEW: '/transaction/tally/preview',
    UPLOAD: '/transaction/tally/upload',
    TRANSACTIONS: '/transaction/tally/transactions',
    TEMPLATE: '/transaction/tally/template',
  },
  EXPENSE: {
    BALANCE: '/office-expenses/balance',
    GET_BALANCE: (id) => (id ? `/office-expenses/funds/${id}/balance` : '/office-expenses/balance'),
    TRANSACTIONS: '/office-expenses/transactions',
    RECORD_CREDIT: '/office-expenses/transactions/credit',
    RECORD_DEBIT: '/office-expenses/transactions/debit',
    DELETE_TRANSACTION: (id) => `/office-expenses/transactions/${id}`,
    UPDATE_TRANSACTION: (id) => `/office-expenses/transactions/${id}`,
    BATCH_EXPENSES: '/office-expenses/transactions/batch',
    MONTHLY_REPORT: ({ month, year, fundId } = {}) => {
      const params = new URLSearchParams();
      if (year) params.append('year', year);
      if (month) params.append('month', month);
      if (fundId) params.append('fund_id', fundId);
      return `/office-expenses/reports/monthly?${params.toString()}`;
    },
    FUNDS: '/office-expenses/funds',
    CREATE_FUND: '/office-expenses/funds',
    // Backward compatibility aliases
    RECEIPT: '/office-expenses/transactions/credit',
    RECEIPT_ID: (fund_id) => `/office-expenses/transactions?transaction_type=CREDIT`,
    DELETE_RECEIPT: (id) => `/office-expenses/transactions/${id}`,
    UPLOAD: '/office-expenses/transactions/debit',
    GET_LIST: (fund_id) => `/office-expenses/transactions?transaction_type=DEBIT`,
    DELETE_EXPENSE: (id) => `/office-expenses/transactions/${id}`,
  },
  // Backward compatibility alias for legacy references to EXPENCE
  get EXPENCE() {
    return this.EXPENSE;
  },
  DAILY_EXPENSES: {
    GET_ITEMS: '/office-expenses/daily/items',
    POST_ITEMS: '/office-expenses/daily/items',
    UPDATE_ITEMS: (item_id) => `/office-expenses/daily/items/${item_id}`,
    GET_USAGE: (expense_date) => `/office-expenses/daily/usage/${expense_date}`,
    SAVE_USAGE: '/office-expenses/daily/usage',
    GET_REGISTER: '/office-expenses/daily/register',
    GET_VENDORS: '/office-expenses/daily/vendors',
    SETTLE_VENDOR: '/office-expenses/daily/settlements',
    SETTLEMENT_HISTORY: '/office-expenses/daily/settlements/history',
  },
  TRAVEL_EXPENSES: {
    GET_TRAVEL_EMPLOYEES: '/travel-expenses/employees',
    CLAIMS: '/travel-expenses/claims',
    CLAIM_EXPENSE: '/travel-expenses/claims',
    GET_CLAIM_ID: (claim_id) => `/travel-expenses/claims/${claim_id}`,
    UPDATE_STATUS: (claim_id) => `/travel-expenses/claims/${claim_id}/status`,
    DELETE_CLAIM: (claim_id) => `/travel-expenses/claims/${claim_id}`,
    SUMMARY: '/travel-expenses/reports/summary',
  }
};


