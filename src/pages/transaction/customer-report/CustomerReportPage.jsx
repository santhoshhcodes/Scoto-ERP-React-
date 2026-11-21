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
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
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
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { StatCard } from '../../../components/common';
import {
  useCustomerClients,
  useReportFinancialYears,
  useCustomerPortfolioSummary,
  useCustomerDossier,
  useDownloadCustomerReportExcel,
} from '../../../api/customerReportApi';
import { useFinancialYear } from '../../../context/FinancialYearContext';

export const CustomerReportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Search & Selected Customer State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null); // { LedgerCode, LedgerName, ... }
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { selectedFinYear, setSelectedFinYear, availableYears } = useFinancialYear();

  // Exactly TWO Clean Reports:
  // 'statement' -> Detailed Statement of Account (Running Ledger with GST & TDS Breakdown)
  // 'summary'   -> Executive Summary (KPIs & Invoice Settlement Matrix)
  const [activeTab, setActiveTab] = useState('statement');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'PENDING'
  const [ledgerFilter, setLedgerFilter] = useState('ALL');   // 'ALL' | 'DEBIT' | 'CREDIT'
  const [expandedInvoiceIdx, setExpandedInvoiceIdx] = useState(null);
  const [portfolioTableSearch, setPortfolioTableSearch] = useState('');

  const searchContainerRef = useRef(null);

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

  // 1. Portfolio-level Financial Analytics Query (Industry Overview)
  const {
    data: portfolioRes,
    isLoading: isLoadingPortfolio,
    refetch: refetchPortfolio,
  } = useCustomerPortfolioSummary(selectedFinYear);

  const portfolioSummary = useMemo(() => {
    return portfolioRes?.data?.data || portfolioRes?.data || {};
  }, [portfolioRes]);

  const topOutstandingClients = useMemo(() => {
    const clients = portfolioSummary?.top_outstanding_clients || [];
    if (!portfolioTableSearch.trim()) return clients;
    const term = portfolioTableSearch.trim().toLowerCase();
    return clients.filter(
      (c) =>
        (c.client_name || '').toLowerCase().includes(term) ||
        (c.client_code || '').toLowerCase().includes(term) ||
        (c.city || '').toLowerCase().includes(term) ||
        (c.state || '').toLowerCase().includes(term)
    );
  }, [portfolioSummary, portfolioTableSearch]);

  // 2. Client Autocomplete Query
  const { data: clientsRes, isLoading: isLoadingClients } = useCustomerClients(searchTerm);

  const clientList = useMemo(() => {
    return clientsRes?.data?.data || clientsRes?.data || [];
  }, [clientsRes]);

  // 3. Customer 360 Dossier Query for selected client
  const {
    data: dossierRes,
    isLoading: isLoadingDossier,
    isFetching: isFetchingDossier,
    refetch: refetchDossier,
  } = useCustomerDossier(selectedClient?.LedgerCode, selectedFinYear);

  const dossier = dossierRes?.data || dossierRes;
  const kpis = dossier?.kpis || {};
  const customerInfo = dossier?.customer_info || selectedClient || {};
  const runningLedger = dossier?.running_ledger || [];
  const invoicesBreakdown = dossier?.invoices_breakdown || [];
  const invoicesSummary = dossier?.invoices_summary || {};

  // Filtered Invoices (for Executive Summary Report)
  const filteredInvoices = useMemo(() => {
    if (invoiceFilter === 'PAID') {
      return invoicesBreakdown.filter(
        (i) => i.payment_status === 'PAID' || Number(i.balance_due) <= 0.01
      );
    }
    if (invoiceFilter === 'PENDING') {
      return invoicesBreakdown.filter(
        (i) => i.payment_status !== 'PAID' && Number(i.balance_due) > 0.01
      );
    }
    return invoicesBreakdown;
  }, [invoicesBreakdown, invoiceFilter]);

  // Running Ledger Summary & Filter (for Statement of Account Report)
  const ledgerSummary = useMemo(() => {
    let total_debits = 0;
    let total_credits = 0;
    let total_taxable = 0;
    let total_cgst = 0;
    let total_sgst = 0;
    let total_igst = 0;
    let total_gst = 0;
    let total_tds = 0;
    let total_net_received = 0;
    let debit_count = 0;
    let credit_count = 0;

    runningLedger.forEach((r) => {
      if (r.voucher_type === 'Opening') return;
      const dr = Number(r.debit) || 0;
      const cr = Number(r.credit) || 0;
      const tax = Number(r.taxable_amt) || 0;
      const cgst = Number(r.cgst_amt) || 0;
      const sgst = Number(r.sgst_amt) || 0;
      const igst = Number(r.igst_amt) || 0;
      const gst = Number(r.total_gst) || 0;
      const tds = Number(r.tds_amt) || 0;
      const net_rcvd = Number(r.net_received) || 0;

      if (dr > 0) {
        total_debits += dr;
        debit_count += 1;
        total_taxable += tax;
        total_cgst += cgst;
        total_sgst += sgst;
        total_igst += igst;
        total_gst += gst;
      }
      if (cr > 0) {
        total_credits += cr;
        credit_count += 1;
        total_tds += tds;
        total_net_received += net_rcvd;
      }
    });

    const closing_balance =
      runningLedger.length > 0
        ? runningLedger[runningLedger.length - 1].running_balance ?? 0
        : 0;
    const op_row = runningLedger.find((r) => r.voucher_type === 'Opening');
    const op_balance = op_row
      ? op_row.debit > 0
        ? op_row.debit
        : op_row.credit > 0
        ? -op_row.credit
        : 0
      : 0;

    return {
      total_debits,
      total_credits,
      total_taxable,
      total_cgst,
      total_sgst,
      total_igst,
      total_gst,
      total_tds,
      total_net_received,
      debit_count,
      credit_count,
      closing_balance,
      op_balance,
    };
  }, [runningLedger]);

  const filteredLedger = useMemo(() => {
    if (ledgerFilter === 'DEBIT')
      return runningLedger.filter(
        (r) => r.voucher_type === 'Opening' || Number(r.debit) > 0
      );
    if (ledgerFilter === 'CREDIT')
      return runningLedger.filter(
        (r) => r.voucher_type === 'Opening' || Number(r.credit) > 0
      );
    return runningLedger;
  }, [runningLedger, ledgerFilter]);

  // Backend Excel Download Mutation
  const downloadExcelMutation = useDownloadCustomerReportExcel();

  const handleExportExcel = async () => {
    if (!selectedClient) return;
    try {
      await downloadExcelMutation.mutateAsync({
        clientCode: selectedClient.LedgerCode,
        finYear: selectedFinYear,
        tab: 'ALL',
      });
    } catch (err) {
      console.error('Failed to export Customer Dossier Excel:', err);
      alert(
        'Failed to download Customer Dossier Excel: ' +
          (err.response?.data?.detail || err.message || 'Error')
      );
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-6 bg-slate-50 min-h-screen text-slate-800">
      {/* 1. TOP HEADER TOOLBAR */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 lg:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs tracking-wider uppercase">
              <PieChart className="w-4 h-4" />
              <span>Customer 360 Financial Analytics</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mt-1">
              Customer Wise Report & Financial Dossier
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Two clean official accounting reports: Statement of Account &amp; Executive Settlement Summary
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Back to Portfolio Overview Button (when customer selected) */}
            {selectedClient && (
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setSearchTerm('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Portfolio Overview</span>
              </button>
            )}

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
              onClick={() => {
                if (selectedClient) refetchDossier();
                else refetchPortfolio();
              }}
              disabled={isFetchingDossier || isLoadingPortfolio}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isFetchingDossier || isLoadingPortfolio ? 'animate-spin text-indigo-600' : ''
                }`}
              />
              <span>Refresh</span>
            </button>

            {/* Export 2-Report Excel Button (When Client is Selected) */}
            {selectedClient && (
              <button
                onClick={handleExportExcel}
                disabled={!dossier || downloadExcelMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                title="Download 2-Report Executive Excel Workbook (.xlsx)"
              >
                {downloadExcelMutation.isPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>
                  {downloadExcelMutation.isPending ? 'Generating Excel...' : 'Export Excel (.xlsx)'}
                </span>
              </button>
            )}

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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Receipt</span>
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
              placeholder="Search customer name, client code (e.g. CUS/00010), GSTIN, or city..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
              {isLoadingClients ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Loading client directory...
                </div>
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
                      selectedClient?.LedgerCode === client.LedgerCode
                        ? 'bg-indigo-50/90 border-l-4 border-indigo-600'
                        : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900">
                        {client.LedgerName}
                      </div>
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

      {/* ========================================================================= */}
      {/* 2. PORTFOLIO & INDUSTRY OVERVIEW DASHBOARD (WHEN NO CLIENT IS SELECTED) */}
      {/* ========================================================================= */}
      {!selectedClient && (
        <div className="space-y-6">
          {/* Top KPI Cards for Industry / Portfolio Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Active Clients"
              value={portfolioSummary?.total_clients_count || 0}
              icon={Building2}
              color="indigo"
              subtitle={`Registered in ${selectedFinYear === 'ALL' ? 'All FYs' : `FY ${selectedFinYear}`}`}
            />
            <StatCard
              title="Total Invoiced / Turnover"
              value={fmt(portfolioSummary?.total_portfolio_invoiced || 0)}
              icon={TrendingUp}
              color="blue"
              trend={fmt(portfolioSummary?.total_portfolio_gst || 0)}
              trendType="up"
              changeLabel="GST Billed"
              subtitle="Gross sales invoices billed"
            />
            <StatCard
              title="Total Collections"
              value={fmt(portfolioSummary?.total_portfolio_collections || 0)}
              icon={CheckCircle2}
              color="emerald"
              subtitle="Received via Bank & Cash"
            />
            <StatCard
              title="Total TDS Withheld"
              value={fmt(portfolioSummary?.total_portfolio_tds || 0)}
              icon={Receipt}
              color="amber"
              subtitle="Tax credit in 26AS"
            />
            <StatCard
              title="Overall Portfolio Outstanding"
              value={fmt(portfolioSummary?.total_portfolio_outstanding || 0)}
              icon={AlertCircle}
              color="rose"
              trend={`${portfolioSummary?.top_outstanding_clients?.length || 0}`}
              trendType="down"
              changeLabel="Debtors with Balance"
              className="border-rose-300 bg-gradient-to-br from-white to-rose-50/30"
              subtitle="Net uncollected balance"
            />
          </div>

          {/* Top Outstanding Clients / Debtors Portfolio Table */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Top Outstanding Clients &amp; Receivables Exposure</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    {topOutstandingClients.length} clients
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click on "View 360 Dossier" on any client to view their detailed 2-report statement and export Excel.
                </p>
              </div>

              {/* Quick filter within portfolio table */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={portfolioTableSearch}
                  onChange={(e) => setPortfolioTableSearch(e.target.value)}
                  placeholder="Filter client or city..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {topOutstandingClients.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No outstanding clients match your filter in {selectedFinYear}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3.5 py-3">Client Code</th>
                      <th className="px-3.5 py-3">Customer / Company Name</th>
                      <th className="px-3.5 py-3">City / State</th>
                      <th className="px-3.5 py-3">GSTIN</th>
                      <th className="px-3.5 py-3 text-right">Total Invoiced (₹)</th>
                      <th className="px-3.5 py-3 text-right">Total Collections (₹)</th>
                      <th className="px-3.5 py-3 text-right">TDS Deducted (₹)</th>
                      <th className="px-3.5 py-3 text-right">Net Outstanding (₹)</th>
                      <th className="px-3.5 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {topOutstandingClients.map((client) => (
                      <tr key={client.client_code} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-700">
                          {client.client_code}
                        </td>
                        <td className="px-3.5 py-3 font-semibold text-slate-900">
                          {client.client_name}
                        </td>
                        <td className="px-3.5 py-3 text-slate-600">
                          {[client.city, client.state].filter(Boolean).join(', ') || '-'}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-600">
                          {client.gst_no || 'UR'}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-semibold text-slate-800">
                          {fmt(client.total_invoiced)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-semibold text-emerald-700">
                          {fmt(client.total_collections)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-amber-700">
                          {fmt(client.total_tds)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-rose-700">
                          {fmt(client.net_outstanding)}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedClient({
                                LedgerCode: client.client_code,
                                LedgerName: client.client_name,
                              });
                              setSearchTerm(client.client_name);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View 360</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CUSTOMER 360 DOSSIER & THE TWO REPORTS (WHEN CLIENT IS SELECTED)       */}
      {/* ========================================================================= */}
      {selectedClient && (
        <div className="space-y-6">
          {/* Customer Master Dossier Profile Card (Client KYC Only - Issuing company removed from screen) */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{customerInfo.LedgerName}</h2>
                    <span className="text-[11px] font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full">
                      {customerInfo.LedgerCode}
                    </span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                      {customerInfo.LedgerGrpName || 'Sundry Debtors'}
                    </span>
                  </div>
                  {customerInfo.ChequePrintName && customerInfo.ChequePrintName !== customerInfo.LedgerName && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Legal / Trade Name: <span className="font-medium text-slate-700">{customerInfo.ChequePrintName}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-600">
                    {customerInfo.GSTNo ? (
                      <span className="flex items-center gap-1 font-mono text-emerald-800 bg-emerald-50/80 border border-emerald-200 px-2 py-0.5 rounded">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        GSTIN: {customerInfo.GSTNo}
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
                    {(customerInfo.Add1 || customerInfo.City || customerInfo.State) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {[customerInfo.Add1, customerInfo.Add2, customerInfo.City, customerInfo.State]
                          .filter(Boolean)
                          .join(', ')}
                        {customerInfo.PinCode ? ` - ${customerInfo.PinCode}` : ''}
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

              {/* Net Ledger Balance Box */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex flex-col items-end justify-center min-w-[210px]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Net Balance Due
                </span>
                <span
                  className={`text-xl font-black font-mono mt-0.5 ${
                    kpis.closing_balance > 0
                      ? 'text-rose-600'
                      : kpis.closing_balance < 0
                      ? 'text-emerald-600'
                      : 'text-slate-700'
                  }`}
                >
                  {fmt(Math.abs(kpis.closing_balance || 0))}
                  <span className="text-xs font-semibold ml-1 font-sans">
                    {kpis.closing_balance > 0 ? 'Dr (Due)' : kpis.closing_balance < 0 ? 'Cr (Advance)' : 'Nil'}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Opening: {fmt(customerInfo.OpeningBalance || 0)} ({customerInfo.BalanceType || 'Dr'})
                </span>
              </div>
            </div>
          </div>

          {/* TWO REPORT TABS NAVIGATION */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-3 gap-2">
              <button
                onClick={() => setActiveTab('statement')}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
                  activeTab === 'statement'
                    ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Statement of Account (Running Ledger)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono">
                  {runningLedger.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Invoices &amp; Payments (Settlement Matrix)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-mono">
                  {invoicesBreakdown.length}
                </span>
                {invoicesSummary.pending_count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    {invoicesSummary.pending_count} Due
                  </span>
                )}
              </button>
            </div>

            {/* =================================================================== */}
            {/* REPORT 1: STATEMENT OF ACCOUNT (DETAILED LEDGER WITH GST & TDS)    */}
            {/* =================================================================== */}
            {activeTab === 'statement' && (
              <div className="p-4 lg:p-6 space-y-5">
                {/* 4 Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Opening Balance
                    </span>
                    <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                      {fmt(Math.abs(ledgerSummary.op_balance))}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {ledgerSummary.op_balance > 0
                        ? 'Debit (Due from Customer)'
                        : ledgerSummary.op_balance < 0
                        ? 'Credit (Advance)'
                        : 'Nil Opening'}
                    </span>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5">
                    <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                      Total Invoiced (Debits)
                    </span>
                    <span className="text-base font-black text-rose-800 font-mono mt-0.5 block">
                      {fmt(ledgerSummary.total_debits)}
                    </span>
                    <span className="text-[10px] text-rose-600 mt-1 block">
                      Taxable: {fmt(ledgerSummary.total_taxable)} | GST: {fmt(ledgerSummary.total_gst)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                      Total Settled (Credits)
                    </span>
                    <span className="text-base font-black text-emerald-800 font-mono mt-0.5 block">
                      {fmt(ledgerSummary.total_credits)}
                    </span>
                    <span className="text-[10px] text-emerald-600 mt-1 block">
                      Bank: {fmt(ledgerSummary.total_net_received)} | TDS: {fmt(ledgerSummary.total_tds)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5">
                    <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                      Net Closing Balance
                    </span>
                    <span className="text-base font-black text-indigo-900 font-mono mt-0.5 block">
                      {fmt(Math.abs(ledgerSummary.closing_balance))}
                      <span className="text-xs font-bold ml-1 text-indigo-700">
                        {ledgerSummary.closing_balance > 0
                          ? 'Dr (Due)'
                          : ledgerSummary.closing_balance < 0
                          ? 'Cr (Advance)'
                          : 'Nil'}
                      </span>
                    </span>
                    <span className="text-[10px] text-indigo-600 mt-1 block">
                      {ledgerSummary.closing_balance > 0
                        ? 'Receivable from customer'
                        : 'Settled / In Advance'}
                    </span>
                  </div>
                </div>

                {/* Filter and Table Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Statement of Account (Sales Invoices &amp; Receipts Ledger)</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({filteredLedger.length} entries)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Debits represent billed Sales Invoices; Credits represent Bank receipts and TDS deductions.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                      <button
                        onClick={() => setLedgerFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          ledgerFilter === 'ALL'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All ({runningLedger.length})
                      </button>
                      <button
                        onClick={() => setLedgerFilter('DEBIT')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          ledgerFilter === 'DEBIT'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-rose-700'
                        }`}
                      >
                        Invoices Only ({ledgerSummary.debit_count})
                      </button>
                      <button
                        onClick={() => setLedgerFilter('CREDIT')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          ledgerFilter === 'CREDIT'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-emerald-700'
                        }`}
                      >
                        Receipts Only ({ledgerSummary.credit_count})
                      </button>
                    </div>
                  </div>
                </div>

                {filteredLedger.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No ledger transactions found in {selectedFinYear}.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3 py-3 text-center">Date</th>
                          <th className="px-3 py-3 text-center">Voucher Type</th>
                          <th className="px-3 py-3 text-center">Doc / Ref No</th>
                          <th className="px-3 py-3">Particulars / Narration</th>
                          <th className="px-3 py-3 text-right">Taxable (₹)</th>
                          <th className="px-3 py-3 text-right">CGST (₹)</th>
                          <th className="px-3 py-3 text-right">SGST (₹)</th>
                          <th className="px-3 py-3 text-right">IGST (₹)</th>
                          <th className="px-3 py-3 text-right">Total GST (₹)</th>
                          <th className="px-3 py-3 text-right">Invoice (Debit ₹)</th>
                          <th className="px-3 py-3 text-right">TDS (₹)</th>
                          <th className="px-3 py-3 text-right">Bank / Cash (₹)</th>
                          <th className="px-3 py-3 text-right">Settled (Credit ₹)</th>
                          <th className="px-3 py-3 text-right">Running Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-mono text-[11px]">
                        {filteredLedger.map((row, idx) => {
                          const bal = Number(row.running_balance) || 0;
                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50 transition-colors ${
                                row.voucher_type === 'Opening' ? 'bg-slate-50/80 font-bold' : ''
                              }`}
                            >
                              <td className="px-3 py-2.5 text-center font-sans text-slate-700">
                                {row.entry_date}
                              </td>
                              <td className="px-3 py-2.5 text-center font-sans">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
                              <td className="px-3 py-2.5 text-center font-semibold text-slate-900">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span>{row.voucher_no || '-'}</span>
                                  {row.voucher_type === 'Sales Invoice' && Number(row.debit) > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const params = new URLSearchParams({
                                          customerCode: selectedClient.LedgerCode,
                                          customerName: selectedClient.LedgerName,
                                          docType: 'SALES_INVOICE',
                                          docNo: row.voucher_no,
                                          amount: String(row.debit || ''),
                                        });
                                        navigate(`/transaction/receipts/new?${params.toString()}`);
                                      }}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer text-[10px] font-bold border border-emerald-200"
                                      title={`Record Receipt / Payment for ${row.voucher_no}`}
                                    >
                                      <CreditCard className="w-2.5 h-2.5" />
                                      <span>Pay</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-sans text-slate-600 max-w-xs truncate">
                                {row.particulars}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-700">
                                {row.taxable_amt > 0 ? fmt(row.taxable_amt) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-500">
                                {row.cgst_amt > 0 ? fmt(row.cgst_amt) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-500">
                                {row.sgst_amt > 0 ? fmt(row.sgst_amt) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-500">
                                {row.igst_amt > 0 ? fmt(row.igst_amt) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-700 font-semibold">
                                {row.total_gst > 0 ? fmt(row.total_gst) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right text-rose-700 font-bold">
                                {row.debit > 0 ? fmt(row.debit) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right text-amber-700 font-semibold">
                                {row.tds_amt > 0 ? fmt(row.tds_amt) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right text-emerald-700 font-semibold">
                                {row.net_received > 0 ? fmt(row.net_received) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right text-emerald-800 font-bold">
                                {row.credit > 0 ? fmt(row.credit) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right font-black text-slate-900">
                                {fmt(Math.abs(bal))}
                                <span className="text-[10px] ml-1 font-sans text-slate-500">
                                  {bal >= 0 ? 'Dr' : 'Cr'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Table Summary Footer */}
                      <tfoot className="bg-slate-100 text-slate-800 font-mono font-bold text-[11px] border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={4} className="px-3 py-3 text-center font-sans font-bold">
                            TOTALS &amp; CLOSING RUNNING BALANCE
                          </td>
                          <td className="px-3 py-3 text-right">{fmt(ledgerSummary.total_taxable)}</td>
                          <td className="px-3 py-3 text-right">{fmt(ledgerSummary.total_cgst)}</td>
                          <td className="px-3 py-3 text-right">{fmt(ledgerSummary.total_sgst)}</td>
                          <td className="px-3 py-3 text-right">{fmt(ledgerSummary.total_igst)}</td>
                          <td className="px-3 py-3 text-right">{fmt(ledgerSummary.total_gst)}</td>
                          <td className="px-3 py-3 text-right text-rose-700 font-black">
                            {fmt(ledgerSummary.total_debits)}
                          </td>
                          <td className="px-3 py-3 text-right text-amber-700">
                            {fmt(ledgerSummary.total_tds)}
                          </td>
                          <td className="px-3 py-3 text-right text-emerald-700">
                            {fmt(ledgerSummary.total_net_received)}
                          </td>
                          <td className="px-3 py-3 text-right text-emerald-800 font-black">
                            {fmt(ledgerSummary.total_credits)}
                          </td>
                          <td className="px-3 py-3 text-right text-indigo-900 font-black text-xs">
                            {fmt(Math.abs(ledgerSummary.closing_balance))}
                            <span className="text-[10px] ml-1 font-sans text-slate-500">
                              {ledgerSummary.closing_balance >= 0 ? 'Dr' : 'Cr'}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* REPORT 2: EXECUTIVE SUMMARY (SETTLEMENT MATRIX & KPIS)              */}
            {/* =================================================================== */}
            {activeTab === 'summary' && (
              <div className="p-4 lg:p-6 space-y-5">
                {/* 5 KPI Snapshot Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
                    <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
                      Total Invoiced / Billed
                    </span>
                    <span className="text-base font-black text-blue-900 font-mono mt-0.5 block">
                      {fmt(kpis.total_invoiced_amount || 0)}
                    </span>
                    <span className="text-[10px] text-blue-600 mt-1 block">
                      {kpis.total_sales_invoices_count || 0} Invoices Raised
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                      Total GST Charged
                    </span>
                    <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                      {fmt(ledgerSummary.total_gst || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      CGST + SGST + IGST
                    </span>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5">
                    <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                      TDS Withheld by Client
                    </span>
                    <span className="text-base font-black text-amber-900 font-mono mt-0.5 block">
                      {fmt(ledgerSummary.total_tds || 0)}
                    </span>
                    <span className="text-[10px] text-amber-600 mt-1 block">
                      Tax credit in 26AS
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                      Net Cash / Bank Collected
                    </span>
                    <span className="text-base font-black text-emerald-900 font-mono mt-0.5 block">
                      {fmt(kpis.total_collections || 0)}
                    </span>
                    <span className="text-[10px] text-emerald-600 mt-1 block">
                      Direct cash/bank realization
                    </span>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5">
                    <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                      Net Outstanding Balance
                    </span>
                    <span className="text-base font-black text-rose-900 font-mono mt-0.5 block">
                      {fmt(kpis.net_outstanding || 0)}
                    </span>
                    <span className="text-[10px] text-rose-600 mt-1 block">
                      {invoicesSummary.pending_count || 0} unpaid invoices
                    </span>
                  </div>
                </div>

                {/* Filter and Matrix Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Sales Invoice Settlement Matrix (Invoice-by-Invoice)</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({filteredInvoices.length} invoices)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click on any invoice row to expand matched payment receipts and TDS details.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setInvoiceFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        invoiceFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({invoicesBreakdown.length})
                    </button>
                    <button
                      onClick={() => setInvoiceFilter('PENDING')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        invoiceFilter === 'PENDING'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-rose-700'
                      }`}
                    >
                      Pending / Due ({invoicesSummary.pending_count + invoicesSummary.partial_count || 0})
                    </button>
                    <button
                      onClick={() => setInvoiceFilter('PAID')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        invoiceFilter === 'PAID'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      Fully Paid ({invoicesSummary.paid_count || 0})
                    </button>
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
                          <th className="px-3 py-3 text-center">#</th>
                          <th className="px-3 py-3">Invoice No</th>
                          <th className="px-3 py-3 text-center">Date</th>
                          <th className="px-3 py-3 text-center">FY</th>
                          <th className="px-3 py-3 text-right">Taxable (₹)</th>
                          <th className="px-3 py-3 text-right">GST (₹)</th>
                          <th className="px-3 py-3 text-right">Total Invoice (₹)</th>
                          <th className="px-3 py-3 text-right">Cash / Bank (₹)</th>
                          <th className="px-3 py-3 text-right">TDS (₹)</th>
                          <th className="px-3 py-3 text-right">Total Settled (₹)</th>
                          <th className="px-3 py-3 text-right">Balance Due (₹)</th>
                          <th className="px-3 py-3 text-center">Status</th>
                          <th className="px-3 py-3 text-center">Action / Pay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-mono text-[11px]">
                        {filteredInvoices.map((inv, idx) => {
                          const isExpanded = expandedInvoiceIdx === idx;
                          const matched = inv.matched_receipts || [];
                          const inv_tds = matched.reduce(
                            (acc, m) => acc + (Number(m.tds_amount) || 0),
                            0
                          );
                          const settled = Number(inv.amount_paid) || 0;
                          const inv_cash = Math.max(0, settled - inv_tds);
                          const due = Number(inv.balance_due) || 0;
                          const status = inv.payment_status_label || 'Pending';

                          return (
                            <React.Fragment key={idx}>
                              <tr
                                onClick={() =>
                                  setExpandedInvoiceIdx(isExpanded ? null : idx)
                                }
                                className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                              >
                                <td className="px-3 py-2.5 text-center font-sans text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2.5 font-bold text-slate-900">
                                  <div className="flex items-center gap-1.5">
                                    <span>{inv.InvoiceNo || inv.TransNo}</span>
                                    {matched.length > 0 && (
                                      <span className="text-[10px] text-slate-400 font-sans">
                                        ({matched.length} rcpts)
                                      </span>
                                    )}
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-sans text-slate-600">
                                  {String(inv.InvoiceDate || '').slice(0, 10)}
                                </td>
                                <td className="px-3 py-2.5 text-center font-sans text-slate-500">
                                  {(inv.fin_year || inv.FinYearVal || '-').replace('_', '-')}
                                </td>
                                <td className="px-3 py-2.5 text-right text-slate-700">
                                  {inv.TotalItemAmount > 0 ? fmt(inv.TotalItemAmount) : '-'}
                                </td>
                                <td className="px-3 py-2.5 text-right text-slate-600">
                                  {fmt(
                                    (Number(inv.TotalCGSTAmount) || 0) +
                                      (Number(inv.TotalSGSTAmount) || 0) +
                                      (Number(inv.TotalIGSTAmount) || 0)
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right text-slate-900 font-bold">
                                  {fmt(inv.net_amount_float || inv.NetAmount)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-emerald-700">
                                  {inv_cash > 0 ? fmt(inv_cash) : '-'}
                                </td>
                                <td className="px-3 py-2.5 text-right text-amber-700">
                                  {inv_tds > 0 ? fmt(inv_tds) : '-'}
                                </td>
                                <td className="px-3 py-2.5 text-right text-emerald-800 font-bold">
                                  {settled > 0 ? fmt(settled) : '-'}
                                </td>
                                <td className="px-3 py-2.5 text-right font-black text-rose-700">
                                  {due > 0 ? fmt(due) : '-'}
                                </td>
                                <td className="px-3 py-2.5 text-center font-sans">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      status.toLowerCase() === 'paid'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : status.toLowerCase() === 'partially paid'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {status}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center font-sans">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {Number(due) > 0.01 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const params = new URLSearchParams({
                                            customerCode: selectedClient.LedgerCode,
                                            customerName: selectedClient.LedgerName,
                                            docType: 'SALES_INVOICE',
                                            docNo: inv.InvoiceNo || inv.TransNo,
                                            amount: String(due || inv.net_amount_float || ''),
                                          });
                                          navigate(`/transaction/receipts/new?${params.toString()}`);
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                                        title="Record Payment for this invoice"
                                      >
                                        <CreditCard className="w-3 h-3" />
                                        <span>Pay</span>
                                      </button>
                                    )}
                                    {matched.length > 0 ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedInvoiceIdx(isExpanded ? null : idx);
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                                        title="View matched receipts"
                                      >
                                        <span>{matched.length} Rcpt</span>
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </button>
                                    ) : (
                                      Number(due) <= 0.01 && (
                                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>Settled</span>
                                        </span>
                                      )
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded Row: Matched Payment Receipts */}
                              {isExpanded && (
                                <tr className="bg-slate-50/90 font-sans">
                                  <td colSpan={13} className="px-6 py-3 border-y border-indigo-100">
                                    <div className="space-y-1.5">
                                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                        Matched Payments &amp; Receipts for {inv.InvoiceNo || inv.TransNo}:
                                      </span>
                                      {matched.length === 0 ? (
                                        <div className="text-xs text-slate-500 italic">
                                          No receipts have been allocated to this invoice yet.
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
                                          {matched.map((r, mIdx) => (
                                            <div
                                              key={mIdx}
                                              className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                                            >
                                              <div className="flex items-center justify-between font-bold text-slate-800">
                                                <span>Receipt #{r.receipt_no}</span>
                                                <span className="font-mono text-emerald-700">
                                                  {fmt(r.amount_allocated)}
                                                </span>
                                              </div>
                                              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                                                <span>Date: {r.receipt_date || '-'}</span>
                                                {Number(r.tds_amount) > 0 && (
                                                  <span className="text-amber-700 font-semibold font-mono">
                                                    TDS: {fmt(r.tds_amount)}
                                                  </span>
                                                )}
                                              </div>
                                              {r.narration && (
                                                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                                  {r.narration}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      {/* Table Summary Footer */}
                      <tfoot className="bg-slate-100 text-slate-800 font-mono font-bold text-[11px] border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={4} className="px-3 py-3 text-center font-sans font-bold">
                            PORTFOLIO TOTALS
                          </td>
                          <td className="px-3 py-3 text-right">
                            {fmt(
                              filteredInvoices.reduce(
                                (acc, i) => acc + (Number(i.TotalItemAmount) || 0),
                                0
                              )
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {fmt(
                              filteredInvoices.reduce(
                                (acc, i) =>
                                  acc +
                                  (Number(i.TotalCGSTAmount) || 0) +
                                  (Number(i.TotalSGSTAmount) || 0) +
                                  (Number(i.TotalIGSTAmount) || 0),
                                0
                              )
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-slate-900">
                            {fmt(
                              filteredInvoices.reduce(
                                (acc, i) =>
                                  acc + (Number(i.net_amount_float || i.NetAmount) || 0),
                                0
                              )
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-emerald-700">
                            {fmt(
                              filteredInvoices.reduce((acc, i) => {
                                const m = i.matched_receipts || [];
                                const tds = m.reduce(
                                  (a, r) => a + (Number(r.tds_amount) || 0),
                                  0
                                );
                                const pd = Number(i.amount_paid) || 0;
                                return acc + Math.max(0, pd - tds);
                              }, 0)
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-amber-700">
                            {fmt(
                              filteredInvoices.reduce((acc, i) => {
                                const m = i.matched_receipts || [];
                                return (
                                  acc +
                                  m.reduce((a, r) => a + (Number(r.tds_amount) || 0), 0)
                                );
                              }, 0)
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-emerald-800 font-black">
                            {fmt(
                              filteredInvoices.reduce(
                                (acc, i) => acc + (Number(i.amount_paid) || 0),
                                0
                              )
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-rose-700 font-black">
                            {fmt(
                              filteredInvoices.reduce(
                                (acc, i) => acc + (Number(i.balance_due) || 0),
                                0
                              )
                            )}
                          </td>
                          <td className="px-3 py-3"></td>
                          <td className="px-3 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerReportPage;
