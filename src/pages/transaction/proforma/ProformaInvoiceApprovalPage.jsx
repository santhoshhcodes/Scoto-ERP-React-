import React, { useState } from 'react';
import {
  CheckSquare,
  Search,
  RefreshCw,
  Filter,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';
import {
  useProformaInvoices,
  useUpdateProformaApproval,
  useDownloadProformaInvoiceExcel,
} from '../../../api/transactionApi';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';

export const ProformaInvoiceApprovalPage = () => {
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  const [downloadingTransNo, setDownloadingTransNo] = useState(null);

  const { data: proformaRes, isLoading, isFetching, error: fetchError, refetch } = useProformaInvoices({ search: searchQuery });
  const updateApprovalMutation = useUpdateProformaApproval();
  const downloadProformaExcelMutation = useDownloadProformaInvoiceExcel();

  const handleDownloadExcel = async (transNo) => {
    if (!transNo) return;
    try {
      setDownloadingTransNo(transNo);
      await downloadProformaExcelMutation.mutateAsync({ transNo });
      setNotification({
        type: 'success',
        message: `Proforma Invoice ${transNo} Excel downloaded successfully.`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || `Failed to download proforma invoice ${transNo} Excel.`,
      });
    } finally {
      setDownloadingTransNo(null);
    }
  };

  const isApproved = (val) => String(val ?? '').trim() === '1' || String(val ?? '').trim().toLowerCase() === 'approved';

  const allProformas = proformaRes?.data ?? [];
  const filteredProformas = allProformas.filter((p) => {
    const isApp = isApproved(p.ApprovalStatus);
    return statusFilter === 'Pending' ? !isApp : isApp;
  });

  const {
    sortedItems: sortedProformas,
    sortConfig,
    requestSort,
  } = useSortableData(filteredProformas, { key: 'TransDate', direction: 'desc' });

  const handleApprove = async (item) => {
    const isCurrentlyApproved = isApproved(item.ApprovalStatus);
    const newStatus = isCurrentlyApproved ? 'Pending' : 'Approved';
    try {
      await updateApprovalMutation.mutateAsync({
        transNo: item.TransNo,
        payload: { ApprovalStatus: newStatus },
      });
      setNotification({
        type: 'success',
        message: `Proforma Invoice ${item.TransNo} status updated to ${newStatus}.`,
      });
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to update approval status.' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-indigo-600" />
              <span>Proforma Invoice Approval</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve proforma invoices generated from quotations
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
            >
              <option value="Pending">Pending Approval</option>
              <option value="Approved">Approved</option>
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search TransNo, Customer..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200"
            />
          </div>
        </div>

        {notification && (
          <div
            className={`mx-4 my-3 p-3 rounded-lg border text-xs font-semibold flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="cursor-pointer">&times;</button>
          </div>
        )}

        {/* API Connection Error Banner */}
        {fetchError && (
          <div className="mx-4 my-3 flex items-center justify-between p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Connection Error:</span> {fetchError.message || 'Failed to load proforma invoices.'}
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
            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">#</th>
                <SortableHeader
                  sortKey="TransNo"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Trans No
                </SortableHeader>
                <SortableHeader
                  sortKey="TransDate"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Date
                </SortableHeader>
                <SortableHeader
                  sortKey="QuotationNo"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Quotation No
                </SortableHeader>
                <SortableHeader
                  sortKey="CustomerName"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Customer Name
                </SortableHeader>
                <SortableHeader
                  sortKey="FinalNetAmount"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="right"
                  className="px-4 py-3 text-right"
                >
                  Net Amount
                </SortableHeader>
                <SortableHeader
                  sortKey="ApprovalStatus"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="center"
                  className="px-4 py-3 text-center"
                >
                  Status
                </SortableHeader>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-700">Loading proforma invoices...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-rose-500">
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
              ) : filteredProformas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No proforma invoices found with status "{statusFilter}".
                  </td>
                </tr>
              ) : (
                sortedProformas.map((item, idx) => (
                  <tr key={item.TransNo} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">{item.TransNo}</td>
                    <td className="px-4 py-3 text-slate-600">{item.TransDate}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{item.QuotationNo || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.CustomerName}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(item.FinalNetAmount || item.TotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isApproved(item.ApprovalStatus)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isApproved(item.ApprovalStatus) ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadExcel(item.TransNo)}
                          disabled={downloadingTransNo === item.TransNo}
                          className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer disabled:opacity-50"
                          title="Download Proforma Invoice Excel"
                        >
                          {downloadingTransNo === item.TransNo ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(item)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                            statusFilter === 'Pending'
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                          }`}
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          {statusFilter === 'Pending' ? 'Approve' : 'Revert'}
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
    </div>
  );
};

export default ProformaInvoiceApprovalPage;
