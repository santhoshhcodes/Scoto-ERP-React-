import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Search,
  Building2,
  Calendar,
  Hash,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Wallet,
} from 'lucide-react';
import { StatCard } from '../../../components/common';
import { useCustomerReceipts } from '../../../api/receiptApi';
import { useFinancialYear } from '../../../context/FinancialYearContext';
import ReceiptDetailsModal from './ReceiptDetailsModal';

export const CustomerReceiptsPage = () => {
  const navigate = useNavigate();
  const { selectedFinYear, setSelectedFinYear, availableYears } = useFinancialYear();
  // Filters
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Modals
  const [selectedTransNo, setSelectedTransNo] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const { data: receiptsData, isLoading, refetch } = useCustomerReceipts({
    search,
    finYear: selectedFinYear,
    limit,
    offset,
  });

  const items = receiptsData?.items || [];
  const totalCount = receiptsData?.total || 0;

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totGross = 0;
    let totTds = 0;
    let totNet = 0;

    items.forEach((item) => {
      totGross += parseFloat(item.GrossAmount) || 0;
      totTds += parseFloat(item.TDSAmount) || 0;
      totNet += parseFloat(item.NetAmount) || 0;
    });

    return {
      totGross,
      totTds,
      totNet,
      count: totalCount,
    };
  }, [items, totalCount]);

  const handleOpenDetails = (transNo) => {
    setSelectedTransNo(transNo);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Customer Receipts & Advances
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct ERP payment entry with automatic Sales Invoice settlement, TDS tracking & Customer Report sync
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/transaction/receipts/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment / Advance</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Collections (Gross)"
          value={`₹${summaryMetrics.totGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Total customer ledger credit"
          icon={TrendingUp}
          color="emerald"
        />

        <StatCard
          title="Net Bank Deposits"
          value={`₹${summaryMetrics.totNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Net money credited to bank accounts"
          icon={Wallet}
          color="indigo"
        />

        <StatCard
          title="TDS Withheld (26AS)"
          value={`₹${summaryMetrics.totTds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Tax deducted by customers"
          icon={Percent}
          color="amber"
        />

        <StatCard
          title="Total Receipts"
          value={summaryMetrics.count}
          subtitle="Vouchers recorded in ERP"
          icon={CreditCard}
          color="blue"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search voucher, customer, UTR, remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Financial Year Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">FY:</span>
            <select
              value={selectedFinYear}
              onChange={(e) => setSelectedFinYear(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg font-medium text-slate-700 focus:outline-hidden focus:bg-white cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y === 'ALL' ? 'All Financial Years' : `FY ${y}`}
                </option>
              ))}
            </select>
          </div>

          {(search || selectedFinYear !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedFinYear('ALL');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Receipt Type</th>
                <th className="py-3 px-4">Deposit Account</th>
                <th className="py-3 px-4">Mode & Ref (UTR)</th>
                <th className="py-3 px-4 text-right">Gross (₹)</th>
                <th className="py-3 px-4 text-right">TDS (₹)</th>
                <th className="py-3 px-4 text-right">Net Received (₹)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Loading customer receipts...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((r) => {
                  const isVoided = r.Status === 'Delete';
                  return (
                    <tr
                      key={r.TransNo}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isVoided ? 'opacity-60 bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Voucher No */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(r.TransNo)}
                          className="font-mono font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                        >
                          {r.TransNo}
                        </button>
                        {isVoided && (
                          <span className="block text-[10px] text-rose-600 font-bold uppercase">Voided</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{r.TransDate}</td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{r.CustomerName || 'N/A'}</span>
                        {r.Remarks && (
                          <span className="text-[11px] text-slate-400 line-clamp-1 truncate max-w-xs block">
                            {r.Remarks}
                          </span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.ReceiptType?.includes('Advance')
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {r.ReceiptType || 'Receipt'}
                        </span>
                      </td>

                      {/* Bank */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{r.BankName || 'Bank'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{r.DepositGLCode}</span>
                      </td>

                      {/* Mode & UTR */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 block">{r.PayMode || 'NEFT'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{r.RefNo || '-'}</span>
                      </td>

                      {/* Gross */}
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        ₹{(parseFloat(r.GrossAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* TDS */}
                      <td className="py-3 px-4 text-right font-medium text-amber-700">
                        {parseFloat(r.TDSAmount) > 0
                          ? `₹${parseFloat(r.TDSAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>

                      {/* Net */}
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        ₹{(parseFloat(r.NetAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(r.TransNo)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No customer receipts found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Details Modal */}
      {selectedTransNo && (
        <ReceiptDetailsModal
          isOpen={isDetailsModalOpen}
          transNo={selectedTransNo}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedTransNo(null);
          }}
          onVoidSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default CustomerReceiptsPage;

