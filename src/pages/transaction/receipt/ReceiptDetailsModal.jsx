import React from 'react';
import {
  X,
  CreditCard,
  Building2,
  Calendar,
  Hash,
  FileText,
  Percent,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Trash2,
} from 'lucide-react';
import { useReceiptDetails, useVoidCustomerReceipt } from '../../../api/receiptApi';

export const ReceiptDetailsModal = ({ isOpen, onClose, transNo, onVoidSuccess }) => {
  const { data, isLoading, error } = useReceiptDetails(transNo);
  const voidMutation = useVoidCustomerReceipt();

  if (!isOpen) return null;

  const header = data?.header || {};
  const allocations = data?.allocations || [];
  const ledgerEntries = data?.ledger_entries || [];

  const isVoided = header.Status === 'Delete';

  const handleVoid = async () => {
    const reason = prompt('Please enter a reason for voiding/cancelling this receipt:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await voidMutation.mutateAsync({ transNo, reason: reason.trim() });
      if (res && res.success) {
        alert(`Receipt ${transNo} has been safely voided.`);
        if (onVoidSuccess) onVoidSuccess();
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to void receipt');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl overflow-hidden text-left transition-all transform bg-white rounded-2xl shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Receipt Voucher: {transNo}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                    isVoided ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isVoided ? 'Voided / Deleted' : 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Date: {header.TransDate || 'N/A'} | Financial Year: {header.FinYearVal || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading receipt details...</div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
              Failed to load receipt details.
            </div>
          ) : (
            <>
              {/* Voucher Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer</span>
                  <span className="font-bold text-slate-900">{header.MemberName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Deposit Account</span>
                  <span className="font-semibold text-slate-800">{header.BankName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Mode</span>
                  <span className="font-semibold text-slate-800">{header.PayMode || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">UTR / Reference</span>
                  <span className="font-mono font-bold text-slate-900">{header.RefNo || 'None'}</span>
                </div>
              </div>

              {/* Amount Breakdown Box */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Gross Settlement: ₹{(parseFloat(header.TotInvAmt) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    TDS Withheld: ₹{(parseFloat(header.TotTDSAmt) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-600 block font-semibold uppercase">Net Inflow to Bank</span>
                  <span className="text-2xl font-extrabold text-emerald-900">
                    ₹{(parseFloat(header.NetAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Document Allocations Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Document Allocations</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Document No</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-right">Settled Amount (₹)</th>
                        <th className="p-2.5 text-right">TDS (₹)</th>
                        <th className="p-2.5 text-right">Line Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allocations.map((sub, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-900">{sub.InvNo || 'N/A'}</td>
                          <td className="p-2.5 text-slate-500">{sub.InvDate || 'N/A'}</td>
                          <td className="p-2.5 text-right font-medium">
                            ₹{(parseFloat(sub.InvoiceAmt) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right text-amber-700 font-medium">
                            ₹{(parseFloat(sub.TDSAmt) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">
                            ₹{(parseFloat(sub.LineTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Accounting Double-Entry Journal Breakdown */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Accounting Double-Entry Postings (Acc_Trans_All)
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Ledger / Account</th>
                        <th className="p-2.5">Head</th>
                        <th className="p-2.5 text-right text-emerald-700">Debit (₹)</th>
                        <th className="p-2.5 text-right text-indigo-700">Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {ledgerEntries.map((gl, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-sans font-medium text-slate-900">
                            {gl.LedgerName}
                            <span className="block text-[10px] text-slate-400 font-mono">{gl.LeaderCode}</span>
                          </td>
                          <td className="p-2.5 font-sans text-slate-500 text-[11px]">{gl.AccHeadName}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">
                            {parseFloat(gl.DebitAmount) > 0
                              ? `₹${parseFloat(gl.DebitAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                          <td className="p-2.5 text-right font-bold text-indigo-700">
                            {parseFloat(gl.CreditAmount) > 0
                              ? `₹${parseFloat(gl.CreditAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              {header.Remarks && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                  <span className="font-bold text-slate-700 block mb-0.5">Remarks / Narration:</span>
                  {header.Remarks}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {!isVoided && (
              <button
                type="button"
                onClick={handleVoid}
                disabled={voidMutation.isPending}
                className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Void / Reverse Receipt</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptDetailsModal;

