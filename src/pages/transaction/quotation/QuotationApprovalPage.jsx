import React, { useState } from 'react';
import {
  CheckSquare,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Filter,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useQuotations, useUpdateQuotationApproval } from '../../../api/transactionApi';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';
import { useFinancialYear } from '../../../context/FinancialYearContext';

export const QuotationApprovalPage = () => {
  const { selectedFinYear } = useFinancialYear();
  const [statusFilter, setStatusFilter] = useState('0'); // '0' (Pending) | '1' (Approved)
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  const { data: quotationRes, isLoading, isFetching, error: fetchError, refetch } = useQuotations({ search: searchQuery, finYear: selectedFinYear });
  const updateApprovalMutation = useUpdateQuotationApproval();

  const allQuotations = quotationRes?.data ?? [];
  const filteredQuotations = allQuotations.filter((q) => {
    const isApproved = String(q.ApprovalStatus).trim() === '1' || String(q.ApprovalStatus).trim().toLowerCase() === 'approved';
    return statusFilter === '1' ? isApproved : !isApproved;
  });

  const {
    sortedItems: sortedQuotations,
    sortConfig,
    requestSort,
  } = useSortableData(filteredQuotations, { key: 'TransDate', direction: 'desc' });

  const handleApprove = async (quo) => {
    // In legacy .NET: '1' is Approved, '0' is Pending
    const isCurrentlyApproved = String(quo.ApprovalStatus).trim() === '1' || String(quo.ApprovalStatus).trim().toLowerCase() === 'approved';
    const nextStatusCode = isCurrentlyApproved ? '0' : '1';
    const nextStatusLabel = nextStatusCode === '1' ? 'Approved' : 'Pending';

    try {
      await updateApprovalMutation.mutateAsync({
        transNo: quo.TransNo,
        payload: { ApprovalStatus: nextStatusCode, ApprovedBy: 'ADMIN' },
      });
      setNotification({
        type: 'success',
        message: `Quotation ${quo.TransNo} status updated to ${nextStatusLabel}.`,
      });
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to update approval status.' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Box Header */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-indigo-600" />
              <span>Quotation Approval</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve pending client quotations & estimates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Request Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">Pending</option>
              <option value="1">Approved</option>
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search TransNo, Customer..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Notification Banner */}
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
                <span className="font-bold">Connection Error:</span> {fetchError.message || 'Failed to load quotations.'}
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

        {/* Approval Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 font-bold uppercase tracking-wider text-[10px] text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">SL_No</th>
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
                  sortKey="SuppName"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  SuppName / Customer
                </SortableHeader>
                <SortableHeader
                  sortKey="NetAmount"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="right"
                  className="px-4 py-3 text-right"
                >
                  NetAmount
                </SortableHeader>
                <SortableHeader
                  sortKey="ApprovalStatus"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="center"
                  className="px-4 py-3 text-center"
                >
                  Approval Status
                </SortableHeader>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-700">Loading quotations...</p>
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
              ) : filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No quotations found with status {statusFilter === '1' ? '"Approved"' : '"Pending"'}.
                  </td>
                </tr>
              ) : (
                sortedQuotations.map((quo, index) => {
                  const isApproved = String(quo.ApprovalStatus).trim() === '1' || String(quo.ApprovalStatus).trim().toLowerCase() === 'approved';
                  return (
                    <tr key={quo.TransNo} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700">{quo.TransNo}</td>
                      <td className="px-4 py-3 text-slate-600">{quo.TransDate}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{quo.CustomerName}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(quo.FinalNetAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleApprove(quo)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                            !isApproved
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                          }`}
                          title={!isApproved ? 'Approve Quotation' : 'Revert to Pending'}
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          {!isApproved ? 'Approve' : 'Revert'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuotationApprovalPage;
