import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import AttendancePage from '../pages/attendance/AttendancePage';
import ManualAttendancePage from '../pages/attendance/ManualAttendancePage';
import ManualLateFinePage from '../pages/attendance/ManualLateFinePage';
import UnifiedDailyAttendancePage from '../pages/attendance/UnifiedDailyAttendancePage';
import UnifiedMonthlyAttendancePage from '../pages/attendance/UnifiedMonthlyAttendancePage';
import EmployeeListPage from '../pages/employee/EmployeeListPage';
import ItemMasterPage from '../pages/master/item/ItemMasterPage';
import LedgerMasterPage from '../pages/master/ledger/LedgerMasterPage';
import QuotationPage from '../pages/transaction/quotation/QuotationPage';
import QuotationApprovalPage from '../pages/transaction/quotation/QuotationApprovalPage';
import ProformaInvoicePage from '../pages/transaction/proforma/ProformaInvoicePage';
import ProformaInvoiceApprovalPage from '../pages/transaction/proforma/ProformaInvoiceApprovalPage';
import DeliveryChallanPage from '../pages/transaction/delivery/DeliveryChallanPage';
import SalesInvoicePage from '../pages/transaction/sales-invoice/SalesInvoicePage';
import SalesInvoiceApprovalPage from '../pages/transaction/sales-invoice/SalesInvoiceApprovalPage';
import BulkInvoiceUploadPage from '../pages/transaction/sales-invoice/BulkInvoiceUploadPage';
import CustomerReceiptsPage from '../pages/transaction/receipt/CustomerReceiptsPage';
import RecordPaymentPage from '../pages/transaction/receipt/RecordPaymentPage';
import TallyUploadPage from '../pages/transaction/tally/TallyUploadPage';
import CustomerReportPage from '../pages/transaction/customer-report/CustomerReportPage';
import OfficeExpensePage from '../pages/transaction/office-expence/OfficeExpensePage';
import OfficeExpenseManagement from '../pages/transaction/office-expence/OfficeExpenseManagement';
import TravelExpensePage from '../pages/transaction/travel-expense/TravelExpensePage';


export const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route index element={<Navigate to="/auth/login" replace />} />
      </Route>

      {/* Protected Dashboard & Operations Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Attendance Module Folder Routes */}
        <Route path="attendance" element={<Navigate to="/attendance/unified-daily" replace />} />
        <Route path="attendance/unified-daily" element={<UnifiedDailyAttendancePage />} />
        <Route path="attendance/unified-monthly" element={<UnifiedMonthlyAttendancePage />} />
        <Route path="attendance/employees" element={<EmployeeListPage />} />

        {/* Legacy Attendance Routes (Unused in active flow, preserved intact) */}
        <Route path="attendance/face" element={<Navigate to="/attendance/unified-daily" replace />} />
        <Route path="attendance/manual" element={<Navigate to="/attendance/unified-daily" replace />} />
        <Route path="attendance/late-fine" element={<Navigate to="/attendance/unified-daily" replace />} />

        {/* Employee Master Dedicated Routes */}
        <Route path="employees" element={<EmployeeListPage />} />
        <Route path="employee" element={<Navigate to="/employees" replace />} />
        <Route path="employee/employees" element={<Navigate to="/employees" replace />} />

        {/* Master Module Routes */}
        <Route path="master" element={<Navigate to="/master/items" replace />} />
        <Route path="master/items" element={<ItemMasterPage />} />
        <Route path="master/item" element={<ItemMasterPage />} />
        <Route path="master/item-master" element={<ItemMasterPage />} />

        <Route path="master/ledgers" element={<LedgerMasterPage />} />
        <Route path="master/ledger" element={<LedgerMasterPage />} />
        <Route path="master/ledger-master" element={<LedgerMasterPage />} />

        {/* Transaction Module - Quotation Tree */}
        <Route path="transaction" element={<Navigate to="/transaction/quotation" replace />} />
        <Route path="transaction/quotation" element={<QuotationPage />} />
        <Route path="transaction/quotations" element={<QuotationPage />} />
        <Route path="transaction/quotation-approval" element={<QuotationApprovalPage />} />
        <Route path="transaction/proforma-invoice" element={<ProformaInvoicePage />} />
        <Route path="transaction/proforma-invoice-approval" element={<ProformaInvoiceApprovalPage />} />
        <Route path="transaction/delivery-challan" element={<DeliveryChallanPage />} />

        {/* Transaction Module - Sales Invoice Tree */}
        <Route path="transaction/sales-invoice" element={<SalesInvoicePage />} />
        <Route path="transaction/sales-invoices" element={<SalesInvoicePage />} />
        <Route path="transaction/sales-invoices/bulk-upload" element={<BulkInvoiceUploadPage />} />
        <Route path="transaction/sales-invoice/bulk-upload" element={<BulkInvoiceUploadPage />} />
        <Route path="transaction/sales-invoice-approval" element={<SalesInvoiceApprovalPage />} />

        {/* Transaction Module - Customer Receipts & Advances */}
        <Route path="transaction/receipts" element={<CustomerReceiptsPage />} />
        <Route path="transaction/receipts/new" element={<RecordPaymentPage />} />
        <Route path="transaction/receipt/new" element={<Navigate to="/transaction/receipts/new" replace />} />
        <Route path="transaction/record-payment" element={<Navigate to="/transaction/receipts/new" replace />} />
        <Route path="transaction/receipt" element={<Navigate to="/transaction/receipts" replace />} />
        <Route path="transaction/customer-receipts" element={<Navigate to="/transaction/receipts" replace />} />

        {/* Transaction Module - Tally Upload */}
        <Route path="transaction/tally-upload" element={<TallyUploadPage />} />
        <Route path="transaction/tally" element={<Navigate to="/transaction/tally-upload" replace />} />
        <Route path="tally-upload" element={<Navigate to="/transaction/tally-upload" replace />} />

        {/* Transaction Module - Customer Wise Report */}
        <Route path="transaction/customer-report" element={<CustomerReportPage />} />
        <Route path="transaction/customer-reports" element={<CustomerReportPage />} />
        <Route path="reports/customer-report" element={<CustomerReportPage />} />

        {/* Transaction Module - Office Expense & Expense Management */}
        <Route path="transaction/office-expense" element={<OfficeExpensePage />} />
        <Route path="transaction/office-expense-management" element={<OfficeExpenseManagement />} />
        <Route path="transaction/OfficeExpenseManagement" element={<Navigate to="/transaction/office-expense-management" replace />} />
        <Route path="transaction/expense-management" element={<Navigate to="/transaction/office-expense-management" replace />} />
        <Route path="transaction/office-expence" element={<Navigate to="/transaction/office-expense" replace />} />

        {/* Transaction Module - Travel Expenses */}
        <Route path="transaction/travel-expense" element={<TravelExpensePage />} />
        <Route path="transaction/travel-expenses" element={<Navigate to="/transaction/travel-expense" replace />} />
        <Route path="travel-expense" element={<Navigate to="/transaction/travel-expense" replace />} />
      </Route>
      {/* Catch-all Wildcard Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;

