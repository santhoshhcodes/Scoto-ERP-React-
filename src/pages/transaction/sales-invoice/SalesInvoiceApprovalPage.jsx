import React, { useState } from 'react';
import {
  CheckSquare,
  Search,
  RefreshCw,
  Filter,
  AlertCircle,
  Loader2,
  XCircle,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import {
  useSalesInvoices,
  useUpdateSalesInvoiceApproval,
  transactionApi,
} from '../../../api/transactionApi';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';

export const SalesInvoiceApprovalPage = () => {
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const {
    data: invoiceRes,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useSalesInvoices({ search: searchQuery, status: statusFilter });

  const updateApprovalMutation = useUpdateSalesInvoiceApproval();

  const invoices = invoiceRes?.data ?? [];
  const {
    sortedItems: sortedInvoices,
    sortConfig,
    requestSort,
  } = useSortableData(invoices, { key: 'TransDate', direction: 'desc' });

  const handleApprove = async (inv) => {
    const newStatus = inv.ApprovalStatus === 'Approved' ? 'Pending' : 'Approved';
    try {
      await updateApprovalMutation.mutateAsync({
        transNo: inv.TransNo,
        payload: { ApprovalStatus: newStatus, ApprovedBy: 'ADMIN' },
      });
      setNotification({
        type: 'success',
        message: `Sales Invoice ${inv.TransNo} (${inv.InvoiceNo || 'N/A'}) set to ${newStatus}.`,
      });
      if (selectedInvoice?.TransNo === inv.TransNo) {
        setSelectedInvoice(null);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update approval status.',
      });
    }
  };

  const handleInspect = async (transNo) => {
    setLoadingDetails(true);
    try {
      const res = await transactionApi.getSalesInvoiceByNo(transNo);
      setSelectedInvoice(res?.data);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to load invoice details.' });
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-emerald-600" />
              <span>Sales Invoice Approval</span>
            </h3>
            <p className="text-xs text-slate-500">Verify and authorize issued sales tax invoices</p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Request Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
            >
              <option value="Pending">Pending (Requires Approval)</option>
              <option value="Approved">Approval (Authorized)</option>
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search TransNo, InvoiceNo, Customer..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
            />
          </div>
        </div>

        {notification && (
          <div className="mx-4 my-3 p-3 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-800 text-xs font-semibold">
            {notification.message}
          </div>
        )}

        {/* API Connection Error Banner */}
        {fetchError && (
          <div className="mx-4 my-3 flex items-center justify-between p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Connection Error:</span> {fetchError.message || 'Failed to load sales invoices.'}
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold rounded-md text-xs transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 font-bold uppercase tracking-wider text-[10px] text-slate-600 border-b border-slate-200">
              <tr>
                <SortableHeader
                  sortKey="TransNo"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  TransNo
                </SortableHeader>
                <SortableHeader
                  sortKey="TransDate"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  TransDate
                </SortableHeader>
                <SortableHeader
                  sortKey="InvoiceNo"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  InvoiceNo
                </SortableHeader>
                <SortableHeader
                  sortKey="InvoiceDate"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  InvoiceDate
                </SortableHeader>
                <SortableHeader
                  sortKey="CustomerName"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  CustomerName
                </SortableHeader>
                <SortableHeader
                  sortKey="FinalNetAmount"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="right"
                  className="px-4 py-3 text-right"
                >
                  NetAmount
                </SortableHeader>
                <th className="px-4 py-3 text-center">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-emerald-600" />
                    <p className="text-sm font-semibold text-slate-700">Loading invoices...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-rose-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
                    <p className="text-sm font-bold text-rose-800">Connection Error</p>
                    <p className="text-xs text-rose-600 mt-1 max-w-md mx-auto">
                      {fetchError.message || 'Please check system connection and retry'}
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                    >
                      Retry Connection
                    </button>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No sales invoices found for status "{statusFilter}".
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((inv) => (
                  <tr key={inv.TransNo} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">{inv.TransNo}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.TransDate}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.InvoiceNo || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.InvoiceDate || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{inv.CustomerName}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(inv.FinalNetAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInspect(inv.TransNo)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                          title="Inspect Invoice Line Items"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(inv)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                            inv.ApprovalStatus !== 'Approved'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                          }`}
                          title={inv.ApprovalStatus !== 'Approved' ? 'Approve Invoice' : 'Revert to Pending'}
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          {inv.ApprovalStatus !== 'Approved' ? 'Approve' : 'Revert'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Inspection Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Sales Invoice: <span className="font-mono text-emerald-700">{selectedInvoice.TransNo}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">Customer: {selectedInvoice.CustomerName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Trans Date</span>
                  <p className="font-medium text-slate-800">{selectedInvoice.TransDate}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Proforma / Ref</span>
                  <p className="font-medium text-slate-800 font-mono">{selectedInvoice.InvoiceNo || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">GRN</span>
                  <p className="font-medium text-slate-800">{selectedInvoice.GRN || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Status</span>
                  <p className="font-bold text-emerald-700">{selectedInvoice.ApprovalStatus}</p>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-2">Item Breakdown</h5>
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">GST %</th>
                      <th className="p-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.Items?.length ? (
                      selectedInvoice.Items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium">{item.ProductType || item.ItemCode}</td>
                          <td className="p-2 text-right font-mono">{item.Qty}</td>
                          <td className="p-2 text-right font-mono">₹{Number(item.Rate || 0).toLocaleString('en-IN')}</td>
                          <td className="p-2 text-right font-mono">{item.GST}%</td>
                          <td className="p-2 text-right font-mono font-bold">₹{Number(item.NetAmount || item.ItemValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">No line items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-xl font-bold">
                <span>Final Net Payable</span>
                <span className="text-base font-mono text-emerald-400">
                  ₹{Number(selectedInvoice.FinalNetAmount || selectedInvoice.TotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleApprove(selectedInvoice)}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
              >
                {selectedInvoice.ApprovalStatus === 'Approved' ? 'Revert Authorization' : 'Authorize & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInvoiceApprovalPage;
