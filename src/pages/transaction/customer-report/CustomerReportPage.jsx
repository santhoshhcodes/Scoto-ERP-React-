import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ChevronUp,
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
  useDownloadCustomerReportExcel,
} from '../../../api/customerReportApi';
import { useFinancialYear } from '../../../context/FinancialYearContext';

export const CustomerReportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null); // { LedgerCode, LedgerName, ... }
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { selectedFinYear, setSelectedFinYear, availableYears } = useFinancialYear();
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'milestones' | 'timeline' | 'ledger' | 'raw_docs'
  const [rawDocSubTab, setRawDocSubTab] = useState('invoices'); // 'quotes' | 'proformas' | 'invoices' | 'tally'
  const [invoiceFilter, setInvoiceFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'
  const [milestoneFilter, setMilestoneFilter] = useState('ALL'); // 'ALL' | 'CLEARED' | 'PARTIAL' | 'PENDING'
  const [timelineFilter, setTimelineFilter] = useState('ALL'); // 'ALL' | 'Quotation' | 'Proforma' | 'Invoice' | 'Receipt'
  const [ledgerFilter, setLedgerFilter] = useState('ALL'); // 'ALL' | 'DEBIT' | 'CREDIT'
  const [expandedInvoiceIdx, setExpandedInvoiceIdx] = useState(null);

  // Auto-select client from URL params if present
  useEffect(() => {
    const urlCode = searchParams.get('customerCode');
    const urlName = searchParams.get('customerName');
    if (urlCode && !selectedClient) {
      setSelectedClient({
        LedgerCode: urlCode,
        LedgerName: urlName || urlCode,
      });
      setSearchTerm(urlName || urlCode);
    }
  }, [searchParams, selectedClient]);

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
  const invoicesBreakdown = dossier?.invoices_breakdown || [];
  const invoicesSummary = dossier?.invoices_summary || {};

  // TAB 0: Invoices Filter
  const filteredInvoices = useMemo(() => {
    if (invoiceFilter === 'PAID') {
      return invoicesBreakdown.filter((i) => i.payment_status === 'PAID' || Number(i.balance_due) <= 0.01);
    }
    if (invoiceFilter === 'PENDING') {
      return invoicesBreakdown.filter((i) => (i.payment_status !== 'PAID' && Number(i.balance_due) > 0.01));
    }
    if (invoiceFilter === 'OVERDUE') {
      return invoicesBreakdown.filter((i) => i.is_overdue && Number(i.balance_due) > 0.01);
    }
    return invoicesBreakdown;
  }, [invoicesBreakdown, invoiceFilter]);

  // TAB 1: Milestones Summary & Filter
  const milestonesSummary = useMemo(() => {
    let total_order_value = 0;
    let total_collected = 0;
    let total_pending = 0;
    let cleared_count = 0;
    let partial_count = 0;
    let pending_count = 0;
    let invoiced_count = 0;

    milestones.forEach((m) => {
      const val = Number(m.total_order_value) || 0;
      const adv = Number(m.advance_collected) || 0;
      const bal = Number(m.balance_pending) || 0;
      const pct = Number(m.advance_percentage_achieved) || 0;

      total_order_value += val;
      total_collected += adv;
      total_pending += bal;

      if (pct >= 100 || (bal <= 0.01 && val > 0)) {
        cleared_count += 1;
      } else if (pct > 0 || adv > 0.01) {
        partial_count += 1;
      } else {
        pending_count += 1;
      }

      if (m.sales_invoice_no) {
        invoiced_count += 1;
      }
    });

    return {
      total_order_value,
      total_collected,
      total_pending,
      cleared_count,
      partial_count,
      pending_count,
      invoiced_count,
    };
  }, [milestones]);

  const filteredMilestones = useMemo(() => {
    if (milestoneFilter === 'CLEARED') {
      return milestones.filter((m) => Number(m.advance_percentage_achieved) >= 100 || (Number(m.balance_pending) <= 0.01 && Number(m.total_order_value) > 0));
    }
    if (milestoneFilter === 'PARTIAL') {
      return milestones.filter((m) => Number(m.advance_percentage_achieved) > 0 && Number(m.advance_percentage_achieved) < 100 && Number(m.balance_pending) > 0.01);
    }
    if (milestoneFilter === 'PENDING') {
      return milestones.filter((m) => (Number(m.advance_percentage_achieved) <= 0 && Number(m.advance_collected) <= 0.01));
    }
    return milestones;
  }, [milestones, milestoneFilter]);

  // TAB 2: Timeline Summary & Filter
  const timelineSummary = useMemo(() => {
    let quote_count = 0;
    let pi_count = 0;
    let inv_count = 0;
    let receipt_count = 0;

    timeline.forEach((item) => {
      const dt = String(item.doc_type || '').toLowerCase();
      if (dt.includes('quote') || dt.includes('quotation')) quote_count += 1;
      else if (dt.includes('proforma')) pi_count += 1;
      else if (dt.includes('sales invoice') || dt.includes('invoice')) inv_count += 1;
      else receipt_count += 1;
    });

    return { quote_count, pi_count, inv_count, receipt_count };
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'ALL') return timeline;
    return timeline.filter((item) => {
      const dt = String(item.doc_type || '').toLowerCase();
      if (timelineFilter === 'Quotation') return dt.includes('quote');
      if (timelineFilter === 'Proforma') return dt.includes('proforma');
      if (timelineFilter === 'Invoice') return dt.includes('invoice') && !dt.includes('proforma');
      if (timelineFilter === 'Receipt') return dt.includes('receipt') || dt.includes('tally') || dt.includes('voucher') || dt.includes('payment');
      return true;
    });
  }, [timeline, timelineFilter]);

  // TAB 3: Running Ledger Summary & Filter
  const ledgerSummary = useMemo(() => {
    let total_debits = 0;
    let total_credits = 0;
    let debit_count = 0;
    let credit_count = 0;

    runningLedger.forEach((r) => {
      if (r.voucher_type === 'Opening') return;
      const dr = Number(r.debit) || 0;
      const cr = Number(r.credit) || 0;
      if (dr > 0) {
        total_debits += dr;
        debit_count += 1;
      }
      if (cr > 0) {
        total_credits += cr;
        credit_count += 1;
      }
    });

    const closing_balance = runningLedger.length > 0 ? (runningLedger[runningLedger.length - 1].running_balance ?? 0) : 0;
    const op_row = runningLedger.find((r) => r.voucher_type === 'Opening');
    const op_balance = op_row ? (op_row.debit > 0 ? op_row.debit : op_row.credit > 0 ? -op_row.credit : 0) : 0;

    return {
      total_debits,
      total_credits,
      debit_count,
      credit_count,
      closing_balance,
      op_balance,
    };
  }, [runningLedger]);

  const filteredLedger = useMemo(() => {
    if (ledgerFilter === 'DEBIT') return runningLedger.filter((r) => r.voucher_type === 'Opening' || Number(r.debit) > 0);
    if (ledgerFilter === 'CREDIT') return runningLedger.filter((r) => r.voucher_type === 'Opening' || Number(r.credit) > 0);
    return runningLedger;
  }, [runningLedger, ledgerFilter]);

  // TAB 4: Total Raw Documents Count
  const allDocsCount = useMemo(() => {
    return (
      (dossier?.sales_invoices || []).length +
      (dossier?.proformas || []).length +
      (dossier?.quotations || []).length +
      (dossier?.tally_vouchers || []).length
    );
  }, [dossier]);

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

  // Format Approval Status (never show raw 0 or 1)
  const formatApprovalStatus = (val) => {
    if (val === null || val === undefined) return 'Pending';
    const s = String(val).trim().toLowerCase();
    if (s === '1' || s === 'approved' || s === 'approve' || s === 'cleared') return 'Approved';
    if (s === '0' || s === 'pending' || s === 'add' || s === '' || s === 'issued') return 'Pending';
    if (s === 'rejected' || s === 'cancelled' || s === 'cancel' || s === '2') return 'Rejected';
    return String(val);
  };

  // Backend Excel Download Mutation
  const downloadExcelMutation = useDownloadCustomerReportExcel();

  // Export to Excel handler via Backend Service
  const handleExportExcel = async (tab = 'ALL') => {
    if (!selectedClient) return;

    try {
      await downloadExcelMutation.mutateAsync({
        clientCode: selectedClient.LedgerCode,
        finYear: selectedFinYear,
        tab,
      });
    } catch (err) {
      console.error('Failed to export Customer Dossier Excel:', err);
      alert('Failed to download Customer Dossier Excel: ' + (err.response?.data?.detail || err.message || 'Error'));
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
              Unified cross-document lifecycle: Quotation &rarr; Proforma &rarr; Customer Advance &rarr; Sales Invoice &rarr; Ledger
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

            {/* Export Excel Button (Backend Executive Multi-Sheet Workbook) */}
            <button
              onClick={() => handleExportExcel(activeTab)}
              disabled={!selectedClient || !dossier || downloadExcelMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Download Executive Customer Dossier in Excel (.xlsx)"
            >
              {downloadExcelMutation.isPending ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{downloadExcelMutation.isPending ? 'Generating Excel...' : 'Export Excel (.xlsx)'}</span>
            </button>

            {/* Record Payment / Advance Button */}
            <button
              onClick={() => {
                if (selectedClient) {
                  navigate(
                    `/transaction/receipts/new?customerCode=${selectedClient.LedgerCode}&customerName=${encodeURIComponent(
                      selectedClient.LedgerName
                    )}`
                  );
                } else {
                  navigate('/transaction/receipts/new');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Receipt / Advance</span>
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
            percentage-wise advance tracking, and statement of account.
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
              value={fmt(invoicesSummary.total_invoiced || kpis.total_invoiced_amount || 0)}
              icon={Receipt}
              color="blue"
              changeLabel={`${invoicesSummary.total_invoices_count || kpis.total_sales_invoices_count || 0} Sales Invoices Raised`}
            />

            <StatCard
              title="Total Collections / Receipts"
              value={fmt(invoicesSummary.total_paid || kpis.total_collections || kpis.total_tally_receipts_amount || 0)}
              icon={DollarSign}
              color="emerald"
              changeLabel={`${invoicesSummary.paid_count || 0} Paid • ${invoicesSummary.partial_count || 0} Partial`}
            />

            <StatCard
              title="Balance Due (Receivable)"
              value={fmt(invoicesSummary.total_balance_due != null ? invoicesSummary.total_balance_due : (kpis.net_outstanding || 0))}
              icon={TrendingUp}
              color={(invoicesSummary.total_balance_due || 0) > 0 ? 'rose' : 'emerald'}
              changeLabel={
                (invoicesSummary.total_balance_due || 0) > 0
                  ? `${invoicesSummary.pending_count || 0} Invoices Pending Payment`
                  : 'All Invoices Fully Cleared'
              }
            />
          </div>

          {/* 4. Tabbed Content Interface */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
            {/* Tab Bar */}
            <div className="border-b border-slate-200 px-4 pt-3 flex flex-wrap gap-2 bg-slate-50/60">
              <button
                onClick={() => setActiveTab('invoices')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
                  activeTab === 'invoices'
                    ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Invoices & Payments ({invoicesBreakdown.length})</span>
                {invoicesSummary.pending_count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    {invoicesSummary.pending_count} Due
                  </span>
                )}
                {invoicesSummary.paid_count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    {invoicesSummary.paid_count} Paid
                  </span>
                )}
              </button>

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
                <span>Statement of Account (Running Balance) ({runningLedger.length})</span>
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
                <span>All Documents View ({allDocsCount})</span>
              </button>
            </div>

            {/* TAB 0: INVOICES & PAYMENT STATUS TRACKER */}
            {activeTab === 'invoices' && (
              <div className="p-4 lg:p-6 space-y-5">
                {/* Summary banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Total Invoiced Value
                    </span>
                    <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                      {fmt(invoicesSummary.total_invoiced || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {invoicesSummary.total_invoices_count || 0} Total Sales Invoices
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                      Total Payments Collected
                    </span>
                    <span className="text-base font-black text-emerald-800 font-mono mt-0.5 block">
                      {fmt(invoicesSummary.total_paid || 0)}
                    </span>
                    <span className="text-[10px] text-emerald-600 mt-1 block">
                      {invoicesSummary.paid_count || 0} Fully Paid • {invoicesSummary.partial_count || 0} Partial
                    </span>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
                    <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                      Balance Due (Unpaid)
                    </span>
                    <span className="text-base font-black text-rose-800 font-mono mt-0.5 block">
                      {fmt(invoicesSummary.total_balance_due || 0)}
                    </span>
                    <span className="text-[10px] text-rose-600 mt-1 block">
                      {invoicesSummary.pending_count || 0} Invoices Pending Payment
                    </span>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
                    <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                      Unallocated Customer Advance
                    </span>
                    <span className="text-base font-black text-indigo-800 font-mono mt-0.5 block">
                      {fmt(invoicesSummary.unallocated_receipts_amount || 0)}
                    </span>
                    <span className="text-[10px] text-indigo-600 mt-1 block">
                      {invoicesSummary.unallocated_receipts_amount > 0 ? 'Credit available for future invoices' : 'Fully allocated to invoices'}
                    </span>
                  </div>
                </div>

                {/* Filter and Table Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Sales Invoices & Collection Status</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({filteredInvoices.length} showing)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Clear invoice-by-invoice breakdown showing paid vs pending balances, overdue age, and matched payment receipts.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setInvoiceFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        invoiceFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({invoicesBreakdown.length})
                    </button>
                    <button
                      onClick={() => setInvoiceFilter('PENDING')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        invoiceFilter === 'PENDING' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-rose-700'
                      }`}
                    >
                      Due / Pending ({invoicesSummary.pending_count + invoicesSummary.partial_count || 0})
                    </button>
                    <button
                      onClick={() => setInvoiceFilter('PAID')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        invoiceFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      Paid ({invoicesSummary.paid_count || 0})
                    </button>
                    {invoicesSummary.overdue_count > 0 && (
                      <button
                        onClick={() => setInvoiceFilter('OVERDUE')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          invoiceFilter === 'OVERDUE' ? 'bg-rose-700 text-white shadow-2xs' : 'text-rose-600 hover:text-rose-800'
                        }`}
                      >
                        Overdue ({invoicesSummary.overdue_count})
                      </button>
                    )}
                  </div>
                </div>

                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No sales invoices match the selected filter in {selectedFinYear}.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3.5 py-3">#</th>
                          <th className="px-3.5 py-3">Invoice Details</th>
                          <th className="px-3.5 py-3">Order / Proforma Ref</th>
                          <th className="px-3.5 py-3 text-right">Invoice Amount</th>
                          <th className="px-3.5 py-3 text-right">Amount Received</th>
                          <th className="px-3.5 py-3 text-right">Balance Due</th>
                          <th className="px-3.5 py-3 text-center">Payment Status</th>
                          <th className="px-3.5 py-3 text-center">Receipts / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredInvoices.map((inv, idx) => {
                          const isExpanded = expandedInvoiceIdx === idx;
                          return (
                            <React.Fragment key={idx}>
                              <tr className="hover:bg-slate-50 transition-colors">
                                <td className="px-3.5 py-3 font-mono text-slate-400">{idx + 1}</td>
                                <td className="px-3.5 py-3">
                                  <div className="font-bold text-slate-900 font-mono text-xs">
                                    {inv.TransNo || inv.InvoiceNo}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>{inv.InvoiceDate || inv.TransDate || '-'}</span>
                                  </div>
                                </td>
                                <td className="px-3.5 py-3 font-medium text-slate-700">
                                  {inv.InvoiceNo || '-'}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                                  {fmt(inv.net_amount_float)}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                                  {fmt(inv.amount_paid)}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold">
                                  <span className={inv.balance_due > 0 ? 'text-rose-600' : 'text-slate-400'}>
                                    {fmt(inv.balance_due)}
                                  </span>
                                </td>
                                <td className="px-3.5 py-3 text-center">
                                  {inv.payment_status === 'PAID' || Number(inv.balance_due) <= 0.01 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>PAID</span>
                                    </span>
                                  ) : inv.payment_status === 'PARTIAL' || (Number(inv.amount_paid) > 0 && Number(inv.balance_due) > 0.01) ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      <span>PARTIAL</span>
                                    </span>
                                  ) : inv.payment_status === 'PENDING_APPROVAL' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      <Clock className="w-3 h-3 text-blue-600" />
                                      <span>PENDING APPROVAL</span>
                                    </span>
                                  ) : (
                                    <div className="inline-flex flex-col items-center gap-0.5">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                        <AlertCircle className="w-3 h-3 text-rose-600" />
                                        <span>UNPAID</span>
                                      </span>
                                      {inv.is_overdue && (
                                        <span className="text-[9px] font-bold text-rose-600">
                                          Overdue by {inv.days_overdue}d
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3.5 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {inv.balance_due > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const params = new URLSearchParams({
                                            customerCode: selectedClient.LedgerCode,
                                            customerName: selectedClient.LedgerName,
                                            docType: 'SALES_INVOICE',
                                            docNo: inv.TransNo || inv.InvoiceNo,
                                            amount: String(inv.balance_due || inv.net_amount_float || ''),
                                          });
                                          navigate(`/transaction/receipts/new?${params.toString()}`);
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                                        title="Record Payment for this Invoice"
                                      >
                                        <CreditCard className="w-2.5 h-2.5" />
                                        <span>Pay</span>
                                      </button>
                                    )}

                                    {inv.matched_receipts && inv.matched_receipts.length > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedInvoiceIdx(isExpanded ? null : idx)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                                      >
                                        <span>{inv.matched_receipts.length} Receipt(s)</span>
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </button>
                                    ) : (
                                      inv.balance_due <= 0 && <span className="text-[10px] text-slate-400">No Receipts</span>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded matched receipts row */}
                              {isExpanded && inv.matched_receipts && (
                                <tr className="bg-slate-50/90">
                                  <td colSpan={8} className="p-3">
                                    <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Payment Receipts Clearing Invoice {inv.TransNo}:</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                        {inv.matched_receipts.map((mr, rIdx) => (
                                          <div key={rIdx} className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5">
                                            <div className="flex justify-between font-bold text-slate-900 font-mono">
                                              <span>Voucher #{mr.voucher_no}</span>
                                              <span className="text-emerald-700">{fmt(mr.allocated_amount)}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                                              <span>Date: {mr.voucher_date}</span>
                                              <span className="italic">{mr.type}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: PERCENTAGE MILESTONES & ADVANCE TRACKER */}
            {activeTab === 'milestones' && (
              <div className="p-4 lg:p-6 space-y-5">
                {/* Summary banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Total Proforma Value
                    </span>
                    <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                      {fmt(milestonesSummary.total_order_value)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {milestones.length} Proforma Invoices Issued
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                      Advance Collected
                    </span>
                    <span className="text-base font-black text-emerald-800 font-mono mt-0.5 block">
                      {fmt(milestonesSummary.total_collected)}
                    </span>
                    <span className="text-[10px] text-emerald-600 mt-1 block">
                      {milestonesSummary.cleared_count} Fully Cleared • {milestonesSummary.partial_count} Partial
                    </span>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
                    <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                      Balance Pending
                    </span>
                    <span className="text-base font-black text-rose-800 font-mono mt-0.5 block">
                      {fmt(milestonesSummary.total_pending)}
                    </span>
                    <span className="text-[10px] text-rose-600 mt-1 block">
                      {milestonesSummary.pending_count} Milestones Pending Advance
                    </span>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
                    <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                      Sales Invoice Converted
                    </span>
                    <span className="text-base font-black text-indigo-800 font-mono mt-0.5 block">
                      {milestonesSummary.invoiced_count} / {milestones.length}
                    </span>
                    <span className="text-[10px] text-indigo-600 mt-1 block">
                      {milestones.length - milestonesSummary.invoiced_count > 0
                        ? `${milestones.length - milestonesSummary.invoiced_count} Pending Invoicing`
                        : 'All Converted to Invoices'}
                    </span>
                  </div>
                </div>

                {/* Filter and Table Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Proforma Invoices & Advance Payment Matching</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({filteredMilestones.length} showing)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tracks agreed advance collections against actual receipts and links to final sales invoices.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setMilestoneFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        milestoneFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({milestones.length})
                    </button>
                    <button
                      onClick={() => setMilestoneFilter('CLEARED')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        milestoneFilter === 'CLEARED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      Fully Cleared ({milestonesSummary.cleared_count})
                    </button>
                    <button
                      onClick={() => setMilestoneFilter('PARTIAL')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        milestoneFilter === 'PARTIAL' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-amber-700'
                      }`}
                    >
                      Partial ({milestonesSummary.partial_count})
                    </button>
                    <button
                      onClick={() => setMilestoneFilter('PENDING')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        milestoneFilter === 'PENDING' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-rose-700'
                      }`}
                    >
                      Pending ({milestonesSummary.pending_count})
                    </button>
                  </div>
                </div>

                {filteredMilestones.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No Proforma Invoices or Advance Milestones match the selected filter in {selectedFinYear}.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3.5 py-3">Proforma / Quote Ref</th>
                          <th className="px-3.5 py-3 text-right">Order Total</th>
                          <th className="px-3.5 py-3 text-right">Advance Received</th>
                          <th className="px-3.5 py-3 w-48 text-center">% Progress</th>
                          <th className="px-3.5 py-3">Sales Invoice Status</th>
                          <th className="px-3.5 py-3 text-center">Milestone Status</th>
                          <th className="px-3.5 py-3 text-right">Balance Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredMilestones.map((m, idx) => {
                          const pct = m.advance_percentage_achieved || 0;
                          const isFullyCleared = pct >= 100 || (m.balance_pending <= 0.01 && m.total_order_value > 0);

                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-3">
                                <div className="font-bold text-slate-900 font-mono">{m.proforma_no}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{m.proforma_date} &bull; Quote: {m.quotation_no || '-'}</span>
                                </div>
                              </td>
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                                {fmt(m.total_order_value)}
                              </td>
                              <td className="px-3.5 py-3 text-right">
                                <div className="font-bold font-mono text-emerald-700">
                                  {fmt(m.advance_collected)}
                                </div>
                                <div className="text-[10px] text-slate-400">from Payment Receipts</div>
                              </td>
                              <td className="px-3.5 py-3">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span
                                      className={
                                        isFullyCleared
                                          ? 'text-emerald-700 font-extrabold'
                                          : pct > 0
                                          ? 'text-indigo-700'
                                          : 'text-slate-500'
                                      }
                                    >
                                      {pct}% Paid
                                    </span>
                                    {isFullyCleared ? (
                                      <span className="text-emerald-600 text-[10px] font-semibold flex items-center gap-0.5">
                                        <CheckCircle2 className="w-3 h-3" /> Fully Cleared
                                      </span>
                                    ) : pct > 0 ? (
                                      <span className="text-amber-600 text-[10px] font-semibold">Partial</span>
                                    ) : (
                                      <span className="text-slate-400 text-[10px]">Unpaid</span>
                                    )}
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        isFullyCleared
                                          ? 'bg-emerald-500'
                                          : pct > 0
                                          ? 'bg-indigo-600'
                                          : 'bg-transparent'
                                      }`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-3.5 py-3">
                                {m.sales_invoice_no ? (
                                  <div>
                                    <span className="font-semibold text-indigo-700 font-mono flex items-center gap-1">
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
                              <td className="px-3.5 py-3 text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    isFullyCleared || (m.status && (m.status.toLowerCase().includes('fully') || m.status.toLowerCase().includes('completed')))
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : pct > 0
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 text-right">
                                <div className="font-bold font-mono text-rose-600">{fmt(m.balance_pending)}</div>
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
              <div className="p-4 lg:p-6 space-y-5">
                {/* Header and Filter Pills */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Chronological Transaction Flow</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({filteredTimeline.length} showing)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Complete trace of Quotations, Proformas, Sales Invoices, and Payment Receipts.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold flex-wrap">
                    <button
                      onClick={() => setTimelineFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        timelineFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({timeline.length})
                    </button>
                    <button
                      onClick={() => setTimelineFilter('Quotation')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        timelineFilter === 'Quotation' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-indigo-700'
                      }`}
                    >
                      Quotations ({timelineSummary.quote_count})
                    </button>
                    <button
                      onClick={() => setTimelineFilter('Proforma')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        timelineFilter === 'Proforma' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-amber-700'
                      }`}
                    >
                      Proformas ({timelineSummary.pi_count})
                    </button>
                    <button
                      onClick={() => setTimelineFilter('Invoice')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        timelineFilter === 'Invoice' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-blue-700'
                      }`}
                    >
                      Invoices ({timelineSummary.inv_count})
                    </button>
                    <button
                      onClick={() => setTimelineFilter('Receipt')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        timelineFilter === 'Receipt' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      Receipts ({timelineSummary.receipt_count})
                    </button>
                  </div>
                </div>

                {filteredTimeline.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No transactions match the selected filter in {selectedFinYear}.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {filteredTimeline.map((item, idx) => {
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

                              <div className="font-black text-sm text-slate-900 font-mono">
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
              <div className="p-4 lg:p-6 space-y-5">
                {/* Summary banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Opening Balance
                    </span>
                    <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                      {fmt(Math.abs(ledgerSummary.op_balance))}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {ledgerSummary.op_balance > 0 ? 'Debit (Due from Customer)' : ledgerSummary.op_balance < 0 ? 'Credit (Advance)' : 'Nil Opening'}
                    </span>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
                    <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                      Total Debits (Billed)
                    </span>
                    <span className="text-base font-black text-rose-800 font-mono mt-0.5 block">
                      {fmt(ledgerSummary.total_debits)}
                    </span>
                    <span className="text-[10px] text-rose-600 mt-1 block">
                      {ledgerSummary.debit_count} Sales Invoices & Charges
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                      Total Credits (Received)
                    </span>
                    <span className="text-base font-black text-emerald-800 font-mono mt-0.5 block">
                      {fmt(ledgerSummary.total_credits)}
                    </span>
                    <span className="text-[10px] text-emerald-600 mt-1 block">
                      {ledgerSummary.credit_count} Receipts & Payments
                    </span>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
                    <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                      Net Closing Balance
                    </span>
                    <span className="text-base font-black text-indigo-800 font-mono mt-0.5 block">
                      {fmt(Math.abs(ledgerSummary.closing_balance))}
                      <span className="text-xs font-bold ml-1 text-indigo-600">
                        {ledgerSummary.closing_balance > 0 ? 'Dr (Due)' : ledgerSummary.closing_balance < 0 ? 'Cr (Advance)' : 'Nil'}
                      </span>
                    </span>
                    <span className="text-[10px] text-indigo-600 mt-1 block">
                      {ledgerSummary.closing_balance > 0 ? 'Outstanding amount receivable' : 'Account in credit / settled'}
                    </span>
                  </div>
                </div>

                {/* Filter and Action Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Statement of Account / Running Ledger Balance</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({filteredLedger.length} showing)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Debits represent billed Sales Invoices; Credits represent bank deposits, customer payments, and advances.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                      <button
                        onClick={() => setLedgerFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          ledgerFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All ({runningLedger.length})
                      </button>
                      <button
                        onClick={() => setLedgerFilter('DEBIT')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          ledgerFilter === 'DEBIT' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-rose-700'
                        }`}
                      >
                        Debits ({ledgerSummary.debit_count})
                      </button>
                      <button
                        onClick={() => setLedgerFilter('CREDIT')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          ledgerFilter === 'CREDIT' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
                        }`}
                      >
                        Credits ({ledgerSummary.credit_count})
                      </button>
                    </div>

                    {/* Download Ledger Button */}
                    <button
                      onClick={() => handleExportExcel('ledger')}
                      disabled={downloadExcelMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      {downloadExcelMutation.isPending ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{downloadExcelMutation.isPending ? 'Generating...' : 'Download Ledger (.xlsx)'}</span>
                    </button>
                  </div>
                </div>

                {filteredLedger.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No ledger entries match the selected filter in {selectedFinYear}.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3.5 py-3">Date</th>
                          <th className="px-3.5 py-3">Voucher Type</th>
                          <th className="px-3.5 py-3">Reference No</th>
                          <th className="px-3.5 py-3">Particulars / Narration</th>
                          <th className="px-3.5 py-3 text-right">Debit (₹)</th>
                          <th className="px-3.5 py-3 text-right">Credit (₹)</th>
                          <th className="px-3.5 py-3 text-right">Running Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-mono">
                        {filteredLedger.map((row, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 transition-colors ${
                              row.voucher_type === 'Opening' ? 'bg-slate-50 font-bold' : ''
                            }`}
                          >
                            <td className="px-3.5 py-3 font-sans text-slate-700">{row.entry_date}</td>
                            <td className="px-3.5 py-3 font-sans">
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
                            <td className="px-3.5 py-3 font-semibold text-slate-800">{row.voucher_no}</td>
                            <td className="px-3.5 py-3 font-sans text-slate-600 max-w-xs truncate">
                              {row.particulars}
                            </td>
                            <td className="px-3.5 py-3 text-right text-rose-700 font-semibold">
                              {row.debit > 0 ? fmt(row.debit) : '-'}
                            </td>
                            <td className="px-3.5 py-3 text-right text-emerald-700 font-semibold">
                              {row.credit > 0 ? fmt(row.credit) : '-'}
                            </td>
                            <td
                              className={`px-3.5 py-3 text-right font-black ${
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
                )}
              </div>
            )}

            {/* TAB 4: RAW DOCUMENTS OVERVIEW */}
            {activeTab === 'raw_docs' && (
              <div className="p-4 lg:p-6 space-y-5">
                {/* Header and Sub-tab Selector */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>All Document Registers</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({allDocsCount} total documents)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Direct view of individual transactional records across sales, quotations, and banking.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold flex-wrap">
                    {[
                      { id: 'invoices', label: `Sales Invoices (${(dossier?.sales_invoices || []).length})` },
                      { id: 'proformas', label: `Proforma Invoices (${(dossier?.proformas || []).length})` },
                      { id: 'quotes', label: `Quotations (${(dossier?.quotations || []).length})` },
                      { id: 'tally', label: `Receipts & Vouchers (${(dossier?.tally_vouchers || []).length})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setRawDocSubTab(tab.id)}
                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                          rawDocSubTab === tab.id
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  {rawDocSubTab === 'invoices' && (
                    (dossier?.sales_invoices || []).length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-500 bg-slate-50">
                        No sales invoices recorded for this client in {selectedFinYear}.
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3.5 py-3">Invoice No / Trans No</th>
                            <th className="px-3.5 py-3">Invoice Date</th>
                            <th className="px-3.5 py-3">Proforma Ref</th>
                            <th className="px-3.5 py-3">Fin Year</th>
                            <th className="px-3.5 py-3">Total Qty</th>
                            <th className="px-3.5 py-3 text-right">Net Amount</th>
                            <th className="px-3.5 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(dossier?.sales_invoices || []).map((inv, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-3 font-bold text-slate-900 font-mono">{inv.TransNo}</td>
                              <td className="px-3.5 py-3">{inv.InvoiceDate}</td>
                              <td className="px-3.5 py-3 font-mono text-indigo-600">{inv.InvoiceNo || '-'}</td>
                              <td className="px-3.5 py-3 font-mono">{inv.FinYearVal}</td>
                              <td className="px-3.5 py-3">{inv.TotalQty}</td>
                              <td className="px-3.5 py-3 text-right font-black text-slate-900 font-mono">{fmt(inv.NetAmount)}</td>
                              <td className="px-3.5 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                    formatApprovalStatus(inv.ApprovalStatus) === 'Approved'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {formatApprovalStatus(inv.ApprovalStatus)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  )}

                  {rawDocSubTab === 'proformas' && (
                    (dossier?.proformas || []).length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-500 bg-slate-50">
                        No proforma invoices recorded for this client in {selectedFinYear}.
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3.5 py-3">Proforma No</th>
                            <th className="px-3.5 py-3">Date</th>
                            <th className="px-3.5 py-3">Quote Ref</th>
                            <th className="px-3.5 py-3">Fin Year</th>
                            <th className="px-3.5 py-3">Total Qty</th>
                            <th className="px-3.5 py-3 text-right">Net Amount</th>
                            <th className="px-3.5 py-3 text-center">Approval</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(dossier?.proformas || []).map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-3 font-bold text-slate-900 font-mono">{p.TransNo}</td>
                              <td className="px-3.5 py-3">{p.TransDate}</td>
                              <td className="px-3.5 py-3 font-mono text-indigo-600">{p.QuotationNo || '-'}</td>
                              <td className="px-3.5 py-3 font-mono">{p.FinYearVal}</td>
                              <td className="px-3.5 py-3">{p.TotalQty}</td>
                              <td className="px-3.5 py-3 text-right font-black text-slate-900 font-mono">{fmt(p.NetAmount)}</td>
                              <td className="px-3.5 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                    formatApprovalStatus(p.ApprovalStatus) === 'Approved'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {formatApprovalStatus(p.ApprovalStatus)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  )}

                  {rawDocSubTab === 'quotes' && (
                    (dossier?.quotations || []).length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-500 bg-slate-50">
                        No quotations recorded for this client in {selectedFinYear}.
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3.5 py-3">Quote No</th>
                            <th className="px-3.5 py-3">Date</th>
                            <th className="px-3.5 py-3">Product / Scope</th>
                            <th className="px-3.5 py-3">Fin Year</th>
                            <th className="px-3.5 py-3 text-right">Net Amount</th>
                            <th className="px-3.5 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(dossier?.quotations || []).map((q, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-3 font-bold text-slate-900 font-mono">{q.TransNo}</td>
                              <td className="px-3.5 py-3">{q.TransDate}</td>
                              <td className="px-3.5 py-3">{q.Product || '-'}</td>
                              <td className="px-3.5 py-3 font-mono">{q.FinYearVal}</td>
                              <td className="px-3.5 py-3 text-right font-black text-slate-900 font-mono">{fmt(q.NetAmount)}</td>
                              <td className="px-3.5 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                    formatApprovalStatus(q.ApprovalStatus) === 'Approved'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {formatApprovalStatus(q.ApprovalStatus)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  )}

                  {rawDocSubTab === 'tally' && (
                    (dossier?.tally_vouchers || []).length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-500 bg-slate-50">
                        No receipts or vouchers recorded for this client in {selectedFinYear}.
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3.5 py-3">Voucher No</th>
                            <th className="px-3.5 py-3">Date</th>
                            <th className="px-3.5 py-3">Trans Type</th>
                            <th className="px-3.5 py-3">Narration / UTR</th>
                            <th className="px-3.5 py-3 text-right">Debit</th>
                            <th className="px-3.5 py-3 text-right">Credit (Advance)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-mono">
                          {(dossier?.tally_vouchers || []).map((t, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-3 font-bold text-slate-900">{t.TransNo}</td>
                              <td className="px-3.5 py-3 font-sans">{t.TransDate}</td>
                              <td className="px-3.5 py-3 font-sans">
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                                  {t.TransType}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 font-sans text-slate-600 max-w-xs truncate">
                                {t.Narration || '-'}
                              </td>
                              <td className="px-3.5 py-3 text-right text-rose-700">{t.DebitAmount > 0 ? fmt(t.DebitAmount) : '-'}</td>
                              <td className="px-3.5 py-3 text-right text-emerald-700 font-bold">{t.CreditAmount > 0 ? fmt(t.CreditAmount) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
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

