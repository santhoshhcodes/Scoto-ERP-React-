import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  Download,
  Printer,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  Filter,
  PieChart,
  ChevronDown,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Hash,
  ExternalLink,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { StatCard } from '../../../components/common';
import {
  useCustomerClients,
  useReportFinancialYears,
  useCustomerDossier,
} from '../../../api/customerReportApi';
import { exportToExcel } from '../../../utils/excelUtils';
import { useFinancialYear } from '../../../context/FinancialYearContext';

export const CustomerReportPage = () => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null); // { LedgerCode, LedgerName, ... }
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { selectedFinYear, setSelectedFinYear, availableYears } = useFinancialYear();
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'timeline' | 'ledger' | 'raw_docs'
  const [rawDocSubTab, setRawDocSubTab] = useState('invoices'); // 'quotes' | 'proformas' | 'invoices' | 'tally'

  const searchContainerRef = useRef(null);

  // Queries
  const { data: clientsRes, isLoading: isLoadingClients } = useCustomerClients(searchTerm);

  const clientList = useMemo(() => {
    return clientsRes?.data?.data || clientsRes?.data || [];
  }, [clientsRes]);

  // Dossier Query for selected client
  const {
    data: dossierRes,
    isLoading: isLoadingDossier,
    isFetching: isFetchingDossier,
    refetch: refetchDossier,
  } = useCustomerDossier(selectedClient?.LedgerCode, selectedFinYear);

  const dossier = dossierRes?.data || dossierRes;
  const kpis = dossier?.kpis || {};
  const customerInfo = dossier?.customer_info || selectedClient || {};
  const milestones = dossier?.milestones || [];
  const timeline = dossier?.timeline || [];
  const runningLedger = dossier?.running_ledger || [];

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format currency helper
  const fmt = (num) => {
    if (num === null || num === undefined) return '₹0.00';
    return `₹${Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!selectedClient) return;

    if (activeTab === 'ledger') {
      const dataToExport = runningLedger.map((row) => ({
        Date: row.entry_date,
        Particulars: row.particulars,
        'Voucher Type': row.voucher_type,
        'Voucher No': row.voucher_no,
        'Debit (₹)': row.debit,
        'Credit (₹)': row.credit,
        'Running Balance (₹)': row.running_balance,
      }));
      exportToExcel(
        dataToExport,
        `${selectedClient.LedgerName}_Statement_${selectedFinYear}`,
        'Ledger Statement'
      );
    } else {
      const dataToExport = milestones.map((m) => ({
        'Proforma No': m.proforma_no,
        'Proforma Date': m.proforma_date,
        'Quotation Ref': m.quotation_no,
        'Order Value (₹)': m.total_order_value,
        'Target Advance %': `${m.target_advance_pct}%`,
        'Required Advance (₹)': m.target_advance_amount,
        'Tally Advance Collected (₹)': m.advance_collected,
        'Percentage Achieved': `${m.advance_percentage_achieved}%`,
        'Sales Invoice No': m.sales_invoice_no || 'Pending',
        'Sales Invoice Date': m.sales_invoice_date || '-',
        'Sales Invoiced Amount (₹)': m.sales_invoice_amount || 0,
        'Balance Pending (₹)': m.balance_pending,
        Status: m.status,
      }));
      exportToExcel(
        dataToExport,
        `${selectedClient.LedgerName}_Milestones_${selectedFinYear}`,
        'Milestone Report'
      );
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-6 bg-slate-50 min-h-screen text-slate-800">
      {/* 1. Header Toolbar & Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 lg:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs tracking-wider uppercase">
              <PieChart className="w-4 h-4" />
              <span>Customer 360 Financial Analytics</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mt-1">
              Customer Wise Report & Ledger Dossier
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Unified cross-document lifecycle: Quotation &rarr; Proforma &rarr; Tally Advance &rarr; Sales Invoice &rarr; Ledger
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Financial Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 rounded-lg p-1 border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500 ml-2" />
              <span className="text-xs font-semibold text-slate-600">FY:</span>
              <select
                value={selectedFinYear}
                onChange={(e) => setSelectedFinYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 pr-3 py-1 outline-none cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr === 'ALL' ? 'All Financial Years' : `FY ${yr}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refetchDossier()}
              disabled={!selectedClient || isFetchingDossier}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingDossier ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={!selectedClient || !dossier}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Client Autocomplete Search Input */}
        <div className="mt-4 pt-4 border-t border-slate-100 relative" ref={searchContainerRef}>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Select or Search Client / Company Name
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Type customer name, client code (e.g. CUS/00010), GSTIN, or city..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
              {isLoadingClients ? (
                <div className="p-4 text-center text-xs text-slate-500">Loading client directory...</div>
              ) : clientList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No clients found matching "{searchTerm}"
                </div>
              ) : (
                clientList.map((client) => (
                  <div
                    key={client.LedgerCode}
                    onClick={() => {
                      setSelectedClient(client);
                      setSearchTerm(client.LedgerName);
                      setIsSearchOpen(false);
                    }}
                    className={`p-3 text-left hover:bg-indigo-50/70 transition-colors cursor-pointer flex items-center justify-between ${
                      selectedClient?.LedgerCode === client.LedgerCode ? 'bg-indigo-50/90 border-l-4 border-indigo-600' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{client.LedgerName}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                          {client.LedgerCode}
                        </span>
                        {client.City && <span>&bull; {client.City}</span>}
                        {client.State && <span>, {client.State}</span>}
                        {client.GSTNo && (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            GST: {client.GSTNo}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* When No Client is Selected */}
      {!selectedClient && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Customer Selected</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Search for a customer above to view their full company details, yearly transaction summary,
            percentage-wise Tally advance tracking, and statement of account.
          </p>
        </div>
      )}

      {/* When Client is Selected */}
      {selectedClient && (
        <>
          {/* 2. Customer Master Dossier Profile Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{customerInfo.LedgerName}</h2>
                    <span className="text-[11px] font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                      {customerInfo.LedgerCode}
                    </span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                      {customerInfo.LedgerGrpName || 'Sundry Debtors'}
                    </span>
                  </div>
                  {customerInfo.ChequePrintName && customerInfo.ChequePrintName !== customerInfo.LedgerName && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Legal/Trade Name: <span className="font-medium text-slate-700">{customerInfo.ChequePrintName}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-600">
                    {customerInfo.GSTNo ? (
                      <span className="flex items-center gap-1 font-mono text-emerald-800 bg-emerald-50/80 border border-emerald-200 px-2 py-0.5 rounded">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        GST: {customerInfo.GSTNo}
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Unregistered GST
                      </span>
                    )}
                    {customerInfo.PanNo && (
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        PAN: {customerInfo.PanNo}
                      </span>
                    )}
                    {(customerInfo.City || customerInfo.State) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {[customerInfo.City, customerInfo.State].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {customerInfo.MobileNo && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {customerInfo.MobileNo}
                      </span>
                    )}
                    {customerInfo.MailID && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {customerInfo.MailID}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col items-end justify-center min-w-[200px]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Net Ledger Balance
                </span>
                <span
                  className={`text-xl font-black mt-0.5 ${
                    kpis.closing_balance > 0
                      ? 'text-rose-600'
                      : kpis.closing_balance < 0
                      ? 'text-emerald-600'
                      : 'text-slate-700'
                  }`}
                >
                  {fmt(Math.abs(kpis.closing_balance || 0))}
                  <span className="text-xs font-semibold ml-1">
                    {kpis.closing_balance > 0 ? 'Dr (Due)' : kpis.closing_balance < 0 ? 'Cr (Advance)' : 'Nil'}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Opening: {fmt(customerInfo.OpeningBalance || 0)} ({customerInfo.BalanceType || 'Dr'})
                </span>
              </div>
            </div>
          </div>

          {/* 3. High-Level KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Quoted"
              value={fmt(kpis.total_quoted_amount || 0)}
              icon={FileText}
              color="indigo"
              changeLabel={`${kpis.total_quotations_count || 0} Quotations Issued`}
            />

            <StatCard
              title="Total Invoiced"
              value={fmt(kpis.total_invoiced_amount || 0)}
              icon={Receipt}
              color="blue"
              changeLabel={`${kpis.total_sales_invoices_count || 0} Sales Invoices Raised`}
            />

            <StatCard
              title="Tally Receipts / Advance"
              value={fmt(kpis.total_tally_receipts_amount || 0)}
              icon={DollarSign}
              color="emerald"
              changeLabel="Bank & Cash Received in Tally"
            />

            <StatCard
              title="Net Outstanding (FY)"
              value={fmt(kpis.net_outstanding || 0)}
              icon={TrendingUp}
              color={kpis.net_outstanding > 0 ? 'rose' : 'emerald'}
              changeLabel={
                kpis.net_outstanding > 0
                  ? 'Receivable Amount Pending'
                  : 'Account Fully Cleared'
              }
            />
          </div>

          {/* 4. Tabbed Content Interface */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
            {/* Tab Bar */}
            <div className="border-b border-slate-200 px-4 pt-3 flex flex-wrap gap-2 bg-slate-50/60">
              <button
                onClick={() => setActiveTab('milestones')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
                  activeTab === 'milestones'
                    ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Percentage Milestones & Advance ({milestones.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Document Lifecycle Timeline ({timeline.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('ledger')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
                  activeTab === 'ledger'
                    ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Statement of Account (Running Balance)</span>
              </button>

              <button
                onClick={() => setActiveTab('raw_docs')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
                  activeTab === 'raw_docs'
                    ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Documents View</span>
              </button>
            </div>

            {/* TAB 1: PERCENTAGE MILESTONES & TALLY ADVANCE TRACKER */}
            {activeTab === 'milestones' && (
              <div className="p-4 lg:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Proforma Invoices & Advance Payment Matching
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tracks agreed advance percentages against actual receipts uploaded from Tally and links to final sales invoices.
                    </p>
                  </div>
                </div>

                {milestones.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No Proforma Invoices or Advance Milestones recorded for this client in {selectedFinYear}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">Proforma / Quote Ref</th>
                          <th className="p-3">Order Total</th>
                          <th className="p-3">Target %</th>
                          <th className="p-3">Advance Required</th>
                          <th className="p-3">Tally Advance Received</th>
                          <th className="p-3 w-48">% Progress</th>
                          <th className="p-3">Sales Invoice Status</th>
                          <th className="p-3 text-right">Balance Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {milestones.map((m, idx) => {
                          const pct = m.advance_percentage_achieved || 0;
                          const isFullyCleared = pct >= 100;
                          const isTargetCleared = pct >= m.target_advance_pct;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{m.proforma_no}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Date: {m.proforma_date} &bull; Quote: {m.quotation_no || '-'}
                                </div>
                              </td>
                              <td className="p-3 font-semibold text-slate-800">
                                {fmt(m.total_order_value)}
                              </td>
                              <td className="p-3">
                                <span className="inline-block px-2 py-0.5 rounded font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  {m.target_advance_pct}%
                                </span>
                              </td>
                              <td className="p-3 font-medium text-slate-700">
                                {fmt(m.target_advance_amount)}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-emerald-700">
                                  {fmt(m.advance_collected)}
                                </div>
                                <div className="text-[10px] text-slate-400">from Tally Receipts</div>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span
                                      className={
                                        isFullyCleared
                                          ? 'text-emerald-700'
                                          : isTargetCleared
                                          ? 'text-indigo-700'
                                          : 'text-amber-700'
                                      }
                                    >
                                      {pct}% Paid
                                    </span>
                                    <span className="text-slate-400">Target {m.target_advance_pct}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        isFullyCleared
                                          ? 'bg-emerald-500'
                                          : isTargetCleared
                                          ? 'bg-indigo-600'
                                          : pct > 0
                                          ? 'bg-amber-500'
                                          : 'bg-transparent'
                                      }`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                {m.sales_invoice_no ? (
                                  <div>
                                    <span className="font-semibold text-indigo-700 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      {m.sales_invoice_no}
                                    </span>
                                    <div className="text-[10px] text-slate-500">
                                      Inv Date: {m.sales_invoice_date || '-'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                                    Sales Inv Pending
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="font-bold text-rose-600">{fmt(m.balance_pending)}</div>
                                <span className="text-[10px] text-slate-400">{m.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DOCUMENT LIFECYCLE TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="p-4 lg:p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Chronological Transaction Flow
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Complete trace of Quotations, Proformas, Sales Invoices, and Tally Vouchers.
                </p>

                {timeline.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500">
                    No transactions recorded for this client in the selected period.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {timeline.map((item, idx) => {
                      const isQuote = item.doc_type === 'Quotation';
                      const isPI = item.doc_type === 'Proforma Invoice';
                      const isInvoice = item.doc_type === 'Sales Invoice';
                      const isTally = item.doc_type.startsWith('Tally');

                      return (
                        <div key={idx} className="relative group">
                          {/* Timeline dot */}
                          <div
                            className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                              isQuote
                                ? 'bg-indigo-600'
                                : isPI
                                ? 'bg-amber-500'
                                : isInvoice
                                ? 'bg-blue-600'
                                : 'bg-emerald-600'
                            }`}
                          />

                          <div className="bg-slate-50 hover:bg-indigo-50/40 transition-colors p-4 rounded-xl border border-slate-200/80">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                    isQuote
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : isPI
                                      ? 'bg-amber-100 text-amber-800'
                                      : isInvoice
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {item.doc_type}
                                </span>
                                <span className="font-bold text-sm text-slate-900 font-mono">
                                  {item.doc_no}
                                </span>
                                <span className="text-xs text-slate-400">&bull; {item.doc_date}</span>
                              </div>

                              <div className="font-black text-sm text-slate-900">
                                {fmt(item.amount)}
                              </div>
                            </div>

                            {(item.reference || item.remarks || item.terms) && (
                              <div className="mt-2 text-xs text-slate-600 space-y-1">
                                {item.reference && (
                                  <div>
                                    <span className="font-semibold text-slate-500">Ref:</span> {item.reference}
                                  </div>
                                )}
                                {item.remarks && (
                                  <div>
                                    <span className="font-semibold text-slate-500">Remarks:</span> {item.remarks}
                                  </div>
                                )}
                                {item.terms && (
                                  <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-100 mt-1 whitespace-pre-line">
                                    {item.terms}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: STATEMENT OF ACCOUNT (RUNNING LEDGER) */}
            {activeTab === 'ledger' && (
              <div className="p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Statement of Account / Running Ledger Balance
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Debits represent billed Sales Invoices; Credits represent Tally bank receipts and customer advances.
                    </p>
                  </div>
                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-2xs self-start"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Ledger Excel</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Voucher Type</th>
                        <th className="p-3">Reference No</th>
                        <th className="p-3">Particulars / Narration</th>
                        <th className="p-3 text-right">Debit (₹)</th>
                        <th className="p-3 text-right">Credit (₹)</th>
                        <th className="p-3 text-right">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {runningLedger.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            row.voucher_type === 'Opening' ? 'bg-slate-50 font-bold' : ''
                          }`}
                        >
                          <td className="p-3 font-sans text-slate-700">{row.entry_date}</td>
                          <td className="p-3 font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                row.voucher_type === 'Sales Invoice'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : row.voucher_type === 'Opening'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {row.voucher_type}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{row.voucher_no}</td>
                          <td className="p-3 font-sans text-slate-600 max-w-xs truncate">
                            {row.particulars}
                          </td>
                          <td className="p-3 text-right text-rose-700 font-semibold">
                            {row.debit > 0 ? fmt(row.debit) : '-'}
                          </td>
                          <td className="p-3 text-right text-emerald-700 font-semibold">
                            {row.credit > 0 ? fmt(row.credit) : '-'}
                          </td>
                          <td
                            className={`p-3 text-right font-black ${
                              row.running_balance > 0
                                ? 'text-rose-600'
                                : row.running_balance < 0
                                ? 'text-emerald-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {fmt(Math.abs(row.running_balance))}
                            <span className="text-[10px] font-normal ml-1">
                              {row.running_balance > 0 ? 'Dr' : row.running_balance < 0 ? 'Cr' : ''}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: RAW DOCUMENTS OVERVIEW */}
            {activeTab === 'raw_docs' && (
              <div className="p-4 lg:p-6">
                <div className="flex items-center gap-2 mb-4">
                  {[
                    { id: 'invoices', label: `Sales Invoices (${(dossier?.sales_invoices || []).length})` },
                    { id: 'proformas', label: `Proforma Invoices (${(dossier?.proformas || []).length})` },
                    { id: 'quotes', label: `Quotations (${(dossier?.quotations || []).length})` },
                    { id: 'tally', label: `Tally Vouchers (${(dossier?.tally_vouchers || []).length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setRawDocSubTab(tab.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        rawDocSubTab === tab.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  {rawDocSubTab === 'invoices' && (
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">Invoice No / Trans No</th>
                          <th className="p-3">Invoice Date</th>
                          <th className="p-3">Proforma Ref</th>
                          <th className="p-3">Fin Year</th>
                          <th className="p-3">Total Qty</th>
                          <th className="p-3 text-right">Net Amount</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(dossier?.sales_invoices || []).map((inv, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{inv.TransNo}</td>
                            <td className="p-3">{inv.InvoiceDate}</td>
                            <td className="p-3 font-mono text-indigo-600">{inv.InvoiceNo || '-'}</td>
                            <td className="p-3 font-mono">{inv.FinYearVal}</td>
                            <td className="p-3">{inv.TotalQty}</td>
                            <td className="p-3 text-right font-black text-slate-900">{fmt(inv.NetAmount)}</td>
                            <td className="p-3 text-center">
                              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                                {inv.ApprovalStatus === '1' ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {rawDocSubTab === 'proformas' && (
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">Proforma No</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Quote Ref</th>
                          <th className="p-3">Fin Year</th>
                          <th className="p-3">Total Qty</th>
                          <th className="p-3 text-right">Net Amount</th>
                          <th className="p-3 text-center">Approval</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(dossier?.proformas || []).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{p.TransNo}</td>
                            <td className="p-3">{p.TransDate}</td>
                            <td className="p-3 font-mono text-indigo-600">{p.QuotationNo || '-'}</td>
                            <td className="p-3 font-mono">{p.FinYearVal}</td>
                            <td className="p-3">{p.TotalQty}</td>
                            <td className="p-3 text-right font-black text-slate-900">{fmt(p.NetAmount)}</td>
                            <td className="p-3 text-center">
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                                {p.ApprovalStatus || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {rawDocSubTab === 'quotes' && (
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">Quote No</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Product / Scope</th>
                          <th className="p-3">Fin Year</th>
                          <th className="p-3 text-right">Net Amount</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(dossier?.quotations || []).map((q, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{q.TransNo}</td>
                            <td className="p-3">{q.TransDate}</td>
                            <td className="p-3">{q.Product || '-'}</td>
                            <td className="p-3 font-mono">{q.FinYearVal}</td>
                            <td className="p-3 text-right font-black text-slate-900">{fmt(q.NetAmount)}</td>
                            <td className="p-3 text-center">
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                                {q.ApprovalStatus || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {rawDocSubTab === 'tally' && (
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">Voucher No</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Trans Type</th>
                          <th className="p-3">Narration / UTR</th>
                          <th className="p-3 text-right">Debit</th>
                          <th className="p-3 text-right">Credit (Advance)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {(dossier?.tally_vouchers || []).map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{t.TransNo}</td>
                            <td className="p-3 font-sans">{t.TransDate}</td>
                            <td className="p-3 font-sans">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                                {t.TransType}
                              </span>
                            </td>
                            <td className="p-3 font-sans text-slate-600 max-w-xs truncate">
                              {t.Narration || '-'}
                            </td>
                            <td className="p-3 text-right text-rose-700">{t.DebitAmount > 0 ? fmt(t.DebitAmount) : '-'}</td>
                            <td className="p-3 text-right text-emerald-700 font-bold">{t.CreditAmount > 0 ? fmt(t.CreditAmount) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerReportPage;

