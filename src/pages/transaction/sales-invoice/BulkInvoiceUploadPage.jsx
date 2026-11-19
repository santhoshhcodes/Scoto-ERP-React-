import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Search,
  Check,
  Building2,
  Package,
  Layers,
  FileText,
  Percent,
  Trash2,
  Plus,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  usePreviewBulkSalesInvoices,
  useCommitBulkSalesInvoices,
} from '../../../api/transactionApi';
import { useMasterLedgers } from '../../../api/masterApi';
import { useNavigate } from 'react-router-dom';

export const BulkInvoiceUploadPage = () => {
  const navigate = useNavigate();

  // -------------------------------------------------------------
  // State
  // -------------------------------------------------------------
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'items' | 'ledgers'
  const [autoCreateItems, setAutoCreateItems] = useState(true);

  // Preview Data & Edit Overrides
  const [previewData, setPreviewData] = useState(null);
  const [selectedInvoiceNos, setSelectedInvoiceNos] = useState(new Set());
  const [ledgerOverrides, setLedgerOverrides] = useState({});
  const [errorMessage, setErrorMessage] = useState(null);
  const [commitSuccessData, setCommitSuccessData] = useState(null);

  // Ledger Master Data for Manual Mapping Dropdowns
  const { data: dbLedgersRes } = useMasterLedgers({ ledger_type: 'ALL', enabled: true });
  const dbLedgers = useMemo(() => {
    if (Array.isArray(dbLedgersRes)) return dbLedgersRes;
    if (Array.isArray(dbLedgersRes?.data)) return dbLedgersRes.data;
    return [];
  }, [dbLedgersRes]);

  // Mutations
  const previewMutation = usePreviewBulkSalesInvoices();
  const commitMutation = useCommitBulkSalesInvoices();

  // -------------------------------------------------------------
  // File Handling
  // -------------------------------------------------------------
  const isExcelFile = (filename) => {
    const name = String(filename || '').toLowerCase();
    return (
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      name.endsWith('.xlsm')
    );
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    const excelFiles = selectedFiles.filter((f) => isExcelFile(f.name));
    if (!excelFiles.length) {
      setErrorMessage('Please select valid Excel files (.xlsx, .xls, or .xlsm).');
      return;
    }
    setFiles((prev) => [...prev, ...excelFiles]);
    setErrorMessage(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    const excelFiles = droppedFiles.filter((f) => isExcelFile(f.name));
    if (excelFiles.length > 0) {
      setFiles((prev) => [...prev, ...excelFiles]);
      setErrorMessage(null);
    } else {
      setErrorMessage('Please drop valid Excel files (.xlsx, .xls, or .xlsm).');
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearAllFiles = () => {
    setFiles([]);
    setPreviewData(null);
    setSelectedInvoiceNos(new Set());
    setLedgerOverrides({});
    setErrorMessage(null);
    setCommitSuccessData(null);
  };

  // -------------------------------------------------------------
  // Dry-Run Preview Action
  // -------------------------------------------------------------
  const handleAnalyzeFiles = async () => {
    if (!files.length) {
      setErrorMessage('Please add at least one Excel invoice file.');
      return;
    }

    setErrorMessage(null);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await previewMutation.mutateAsync(formData);
      const data = response?.data || response;

      if (!data || !data.invoices || !data.invoices.length) {
        setErrorMessage(
          'No invoice records could be parsed. Please check if your files follow the Scoto invoice layout.'
        );
        return;
      }

      setPreviewData(data);

      // Select ONLY non-duplicate invoices by default (duplicates are strictly blocked)
      const nonDuplicateNos = new Set(
        data.invoices.filter((inv) => !inv.is_duplicate).map((inv) => inv.invoice_no)
      );
      setSelectedInvoiceNos(nonDuplicateNos);

      // Initialize ledger overrides map
      const initialLedgers = {};
      (data.ledgers || []).forEach((l) => {
        initialLedgers[l.lookup_key] = { ...l };
      });
      setLedgerOverrides(initialLedgers);
      setActiveTab('invoices');
    } catch (err) {
      console.error('Bulk Preview Error:', err);
      setErrorMessage(err.response?.data?.detail || err.message || 'Failed to parse Excel invoices.');
    }
  };

  // -------------------------------------------------------------
  // Invoice Selection Toggles
  // -------------------------------------------------------------
  const handleToggleInvoice = (invNo) => {
    const targetInv = previewData?.invoices?.find((i) => i.invoice_no === invNo);
    if (targetInv?.is_duplicate) return;

    setSelectedInvoiceNos((prev) => {
      const next = new Set(prev);
      if (next.has(invNo)) {
        next.delete(invNo);
      } else {
        next.add(invNo);
      }
      return next;
    });
  };

  const handleToggleAllInvoices = () => {
    if (!previewData?.invoices) return;
    const nonDuplicates = previewData.invoices.filter((i) => !i.is_duplicate);
    if (nonDuplicates.length === 0) return;

    if (selectedInvoiceNos.size >= nonDuplicates.length) {
      setSelectedInvoiceNos(new Set());
    } else {
      setSelectedInvoiceNos(new Set(nonDuplicates.map((i) => i.invoice_no)));
    }
  };

  // -------------------------------------------------------------
  // Ledger Override Handlers
  // -------------------------------------------------------------
  const handleMapExistingLedger = (lookupKey, selectedDbLedger) => {
    if (!selectedDbLedger) return;
    setLedgerOverrides((prev) => ({
      ...prev,
      [lookupKey]: {
        ...prev[lookupKey],
        action: 'MAP_EXISTING',
        is_create_new: false,
        exists_in_db: true,
        selected_ledger_code: selectedDbLedger.LedgerCode,
        matched_ledger_code: selectedDbLedger.LedgerCode,
        assigned_code: selectedDbLedger.LedgerCode,
        suggested_ledger_name: selectedDbLedger.LedgerName,
        customer_name: selectedDbLedger.LedgerName,
        state: selectedDbLedger.State || prev[lookupKey]?.state || '',
        gst_no: selectedDbLedger.GSTNo || prev[lookupKey]?.gst_no || '',
      },
    }));
  };

  const handleSetAutoCreateLedger = (lookupKey) => {
    const orig = previewData?.ledgers?.find((l) => l.lookup_key === lookupKey);
    setLedgerOverrides((prev) => ({
      ...prev,
      [lookupKey]: {
        ...prev[lookupKey],
        action: 'CREATE_NEW',
        is_create_new: true,
        exists_in_db: false,
        selected_ledger_code: '',
        matched_ledger_code: '',
        assigned_code: orig?.assigned_code || 'Auto-Generate',
        customer_name: orig?.customer_name || orig?.excel_customer_name || prev[lookupKey]?.customer_name || '',
        gst_no: orig?.gst_no || orig?.excel_gst || prev[lookupKey]?.gst_no || '',
      },
    }));
  };

  const handleUpdateNewLedgerField = (lookupKey, field, val) => {
    setLedgerOverrides((prev) => {
      const curr = prev[lookupKey] || {};
      return {
        ...prev,
        [lookupKey]: {
          ...curr,
          [field]: val,
        },
      };
    });
  };

  // -------------------------------------------------------------
  // Commit to Database
  // -------------------------------------------------------------
  const handleCommitInvoices = async () => {
    if (!previewData) return;

    const invoicesToCommit = previewData.invoices.filter((inv) =>
      selectedInvoiceNos.has(inv.invoice_no)
    );

    if (!invoicesToCommit.length) {
      setErrorMessage('Please select at least one invoice to import.');
      return;
    }

    const payload = {
      invoices: invoicesToCommit,
      ledgers: Object.values(ledgerOverrides),
      items_master: previewData.items_master || [],
      auto_create_items: autoCreateItems,
    };

    try {
      setErrorMessage(null);
      const res = await commitMutation.mutateAsync(payload);
      const resData = res?.data || res;
      setCommitSuccessData(resData);
    } catch (err) {
      console.error('Commit Bulk Invoices Error:', err);
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Failed to save sales invoices to database.'
      );
    }
  };

  // -------------------------------------------------------------
  // Computed Totals for Selected Invoices
  // -------------------------------------------------------------
  const selectedKPIs = useMemo(() => {
    if (!previewData?.invoices) {
      return { count: 0, taxable: 0, tax: 0, net: 0 };
    }
    const filtered = previewData.invoices.filter((inv) => selectedInvoiceNos.has(inv.invoice_no));
    return {
      count: filtered.length,
      taxable: filtered.reduce((acc, i) => acc + (i.total_item_amount || 0), 0),
      tax: filtered.reduce(
        (acc, i) => acc + (i.total_cgst || 0) + (i.total_sgst || 0) + (i.total_igst || 0),
        0
      ),
      net: filtered.reduce((acc, i) => acc + (i.net_amount || 0), 0),
    };
  }, [previewData, selectedInvoiceNos]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumbs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <button
              onClick={() => navigate('/transaction/sales-invoice')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Sales Invoices
            </button>
            <span>/</span>
            <span className="font-semibold text-slate-800">Bulk Invoice & Ledger Importer</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/20">
              <UploadCloud className="h-5 w-5" />
            </div>
            Bulk Sales Invoice & Ledger Importer
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Fast, multi-file (.xlsx, .xls, .xlsm) ingestion with auto customer ledger matching, item creation, duplicate detection & double-entry posting.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/transaction/sales-invoice')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            Back to Sales Invoices
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* VIEW A: SUCCESS SCREEN AFTER COMMIT */}
        {commitSuccessData ? (
          <div className="py-12 text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Bulk Invoices Successfully Committed!
              </h2>
              <p className="text-xs text-slate-500 mt-1.5">
                All invoices, customer ledgers, line items, and double-entry postings have been saved to the database.
              </p>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-500">Sales Invoices</div>
                <div className="text-xl font-extrabold text-emerald-600 font-mono">
                  {commitSuccessData.invoices_committed || 0}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-500">Line Items</div>
                <div className="text-xl font-extrabold text-slate-800 font-mono">
                  {commitSuccessData.items_committed || 0}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-500">Customer Ledgers</div>
                <div className="text-xl font-extrabold text-blue-600 font-mono">
                  {commitSuccessData.ledgers_created || 0} New
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-500">Item Master</div>
                <div className="text-xl font-extrabold text-purple-600 font-mono">
                  {commitSuccessData.items_created || 0} New
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  handleClearAllFiles();
                  navigate('/transaction/sales-invoice');
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                View Invoices Register
              </button>
              <button
                type="button"
                onClick={handleClearAllFiles}
                className="px-5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                + Import Another Batch
              </button>
              <button
                type="button"
                onClick={() => navigate('/transaction/record-payment')}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Proceed to Customer Receipt
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* STEP 1: FILE UPLOAD ZONE & OPTIONS */}
            {!previewData && (
              <div className="space-y-6">
                {/* Drag and Drop Box */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                      : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
                  }`}
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-4 shadow-inner">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Drag and drop your Sales Invoice Excel workbooks here
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                    Supports up to 100 Excel files (.xlsx, .xls, .xlsm) formatted per Scoto Sales Invoice layout or tabular invoice register.
                  </p>

                  <label className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer transition-colors">
                    <UploadCloud className="w-4 h-4 text-emerald-600" />
                    Browse Excel Files
                    <input
                      type="file"
                      multiple
                      accept=".xlsx, .xls, .xlsm, .XLSX, .XLS, .XLSM"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Selected Files Badge List */}
                {files.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Ready to analyze ({files.length} files selected):</span>
                      <button
                        type="button"
                        onClick={handleClearAllFiles}
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      {files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate font-medium text-slate-800">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleAnalyzeFiles}
                        disabled={previewMutation.isPending}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${previewMutation.isPending ? 'animate-spin' : ''}`} />
                        {previewMutation.isPending ? 'Analyzing Invoices & Ledgers...' : 'Analyze Excel Invoices'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: REVIEW TABS (INVOICES, ITEMS, CUSTOMER LEDGERS) */}
            {previewData && (
              <div className="space-y-5">
                {/* Summary KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-slate-50 to-emerald-50/50 p-4 rounded-xl border border-slate-200">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Invoices Selected</div>
                    <div className="text-lg font-extrabold text-slate-800 font-mono">
                      {selectedKPIs.count} of {previewData.invoices?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Taxable Value</div>
                    <div className="text-lg font-extrabold text-slate-800 font-mono">
                      ₹{selectedKPIs.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Total Tax</div>
                    <div className="text-lg font-extrabold text-slate-800 font-mono">
                      ₹{selectedKPIs.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Net Invoice Amount</div>
                    <div className="text-lg font-extrabold text-emerald-700 font-mono">
                      ₹{selectedKPIs.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('invoices')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'invoices'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      1. Sales Invoices ({previewData.invoices?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('items')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'items'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      2. Line Items ({previewData.items_master?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ledgers')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'ledgers'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      3. Customer Ledgers ({previewData.ledgers?.length || 0})
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPreviewData(null)}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Re-Upload Files
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitInvoices}
                      disabled={commitMutation.isPending || selectedKPIs.count === 0}
                      className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {commitMutation.isPending
                        ? 'Writing Invoices to Database...'
                        : `Commit ${selectedKPIs.count} Invoices to Database`}
                    </button>
                  </div>
                </div>

                {/* TAB 1: SALES INVOICES TABLE */}
                {activeTab === 'invoices' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Showing {previewData.invoices?.length || 0} invoice(s) extracted from {files.length} Excel workbook(s).
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleAllInvoices}
                        className="font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        {selectedInvoiceNos.size >= (previewData.invoices || []).filter((i) => !i.is_duplicate).length
                          ? 'Deselect All'
                          : 'Select All Valid Invoices'}
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3 w-10 text-center">Import</th>
                            <th className="p-3">Invoice No</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Customer / Party Name</th>
                            <th className="p-3">GSTIN</th>
                            <th className="p-3 text-right">Taxable (₹)</th>
                            <th className="p-3 text-right">CGST</th>
                            <th className="p-3 text-right">SGST</th>
                            <th className="p-3 text-right">IGST</th>
                            <th className="p-3 text-right">Net Total (₹)</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(previewData.invoices || []).map((inv) => {
                            const isSelected = selectedInvoiceNos.has(inv.invoice_no);
                            const isDuplicate = Boolean(inv.is_duplicate);
                            const custLookup = inv.gst_no || (inv.customer_name || '').toLowerCase();
                            const custOverride = ledgerOverrides[custLookup] || (previewData.ledgers || []).find((l) => l.lookup_key === custLookup);
                            const displayCustName = custOverride?.customer_name || inv.customer_name;
                            const linkedCustCode = (!custOverride?.is_create_new && (custOverride?.selected_ledger_code || custOverride?.matched_ledger_code))
                              ? (custOverride?.selected_ledger_code || custOverride?.matched_ledger_code)
                              : (custOverride?.assigned_code || inv.linked_ledger_code || 'Auto-Generate');

                            return (
                              <tr
                                key={inv.invoice_no}
                                className={`transition-colors ${
                                  isDuplicate
                                    ? 'bg-rose-50/50 opacity-80 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-emerald-50/40 font-medium'
                                    : 'hover:bg-slate-50/60'
                                }`}
                              >
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isDuplicate}
                                    onChange={() => handleToggleInvoice(inv.invoice_no)}
                                    className={`w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 ${
                                      isDuplicate ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                    }`}
                                  />
                                </td>
                                <td className="p-3 font-bold font-mono text-slate-900">
                                  {inv.invoice_no}
                                </td>
                                <td className="p-3 text-slate-600">{inv.invoice_date}</td>
                                <td className="p-3">
                                  <div className="font-semibold text-slate-900">{displayCustName}</div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                                    <span>Ledger:</span>
                                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                      {linkedCustCode}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-[11px] text-slate-500">
                                  {inv.gst_no || '-'}
                                </td>
                                <td className="p-3 text-right font-mono">
                                  ₹{(inv.total_item_amount || 0).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="p-3 text-right font-mono text-slate-500">
                                  ₹{(inv.total_cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono text-slate-500">
                                  ₹{(inv.total_sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono text-purple-700 font-bold">
                                  ₹{(inv.total_igst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-700 font-mono">
                                  ₹{(inv.net_amount || 0).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="p-3 text-center">
                                  {isDuplicate ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                      Duplicate in DB (Blocked)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      Ready to Insert
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: LINE ITEMS BREAKDOWN */}
                {activeTab === 'items' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Unique Product & Service line items extracted from Excel files.</span>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={autoCreateItems}
                          onChange={(e) => setAutoCreateItems(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Auto-insert missing items into Item Master</span>
                      </label>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3">HSN Code</th>
                            <th className="p-3">Item / Service Description</th>
                            <th className="p-3 text-center">GST Rate %</th>
                            <th className="p-3 text-center">Item Master Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(previewData.items_master || []).map((itm, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="p-3 font-mono font-bold text-slate-900">{itm.hsn_code}</td>
                              <td className="p-3 font-semibold text-slate-800">{itm.item_desc}</td>
                              <td className="p-3 text-center font-mono font-bold text-indigo-700">
                                {itm.gst_rate}%
                              </td>
                              <td className="p-3 text-center">
                                {itm.exists_in_db ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                    Existing in Master
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    Will Auto-Create in Item Master
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: CUSTOMER LEDGERS RECONCILIATION */}
                {activeTab === 'ledgers' && (
                  <div className="space-y-4">
                    {/* Information Banner */}
                    <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-200 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
                      <div>
                        <div className="font-bold text-blue-950 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span>Smart Customer Ledger Reconciliation & Auto-Creation</span>
                        </div>
                        <p className="text-[11px] text-blue-800 mt-1">
                          Scoto ERP reconciles party names with your database ledgers (via GSTIN, Exact Name, and Fuzzy Matching). New customers will be auto-assigned next sequential codes (e.g. <code>CUS/xxxxx</code>) with clean titles (zero <code>M/s.</code> prefix).
                        </p>
                      </div>

                      {/* Mini Stats Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-xs font-semibold text-slate-700 shadow-2xs">
                          Total: <strong className="text-slate-900">{previewData.ledgers?.length || 0}</strong>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 font-mono text-xs font-semibold text-emerald-800 shadow-2xs">
                          Matched: <strong>{(previewData.ledgers || []).filter((l) => { const ov = ledgerOverrides[l.lookup_key] || l; return !ov.is_create_new && (ov.selected_ledger_code || ov.matched_ledger_code); }).length}</strong>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-100 border border-blue-300 font-mono text-xs font-semibold text-blue-800 shadow-2xs">
                          New: <strong>{(previewData.ledgers || []).filter((l) => { const ov = ledgerOverrides[l.lookup_key] || l; return ov.is_create_new; }).length}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3">Party Name in Excel</th>
                            <th className="p-3">Clean Customer Name (ERP)</th>
                            <th className="p-3">GSTIN</th>
                            <th className="p-3">State / City</th>
                            <th className="p-3 text-center">Reconciliation Status</th>
                            <th className="p-3 text-center">Assigned / Target Code</th>
                            <th className="p-3">Action / Manual Mapping</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(previewData.ledgers || []).map((ldg) => {
                            const override = ledgerOverrides[ldg.lookup_key] || ldg;
                            const isExisting = (!override.is_create_new && (override.selected_ledger_code || override.matched_ledger_code)) || override.action === 'MAP_EXISTING';
                            const targetCode = isExisting
                              ? (override.selected_ledger_code || override.matched_ledger_code)
                              : (override.assigned_code || ldg.assigned_code || 'Auto-Generate');
                            const rawName = ldg.excel_customer_name || ldg.customer_name || '';
                            const cleanName = override.customer_name || override.excel_customer_name || '';
                            const hasRemovedPrefix = rawName.toLowerCase().startsWith('m/s') || rawName.toLowerCase().startsWith('messrs');

                            return (
                              <tr key={ldg.lookup_key} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3">
                                  <div className="font-semibold text-slate-900">{rawName}</div>
                                  {hasRemovedPrefix && (
                                    <span className="inline-block mt-0.5 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                      'M/s.' prefix removed
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={cleanName}
                                    onChange={(e) =>
                                      handleUpdateNewLedgerField(ldg.lookup_key, 'customer_name', e.target.value)
                                    }
                                    placeholder="Enter Customer Name"
                                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-medium text-slate-800 w-full focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                  />
                                </td>
                                <td className="p-3 font-mono text-[11px] text-slate-600">
                                  {override.gst_no || override.excel_gst || '-'}
                                </td>
                                <td className="p-3 text-slate-600">
                                  {override.state || '-'} {override.city ? `(${override.city})` : ''}
                                </td>
                                <td className="p-3 text-center">
                                  {isExisting ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Matched Existing
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                      <Plus className="w-3 h-3 text-blue-600" />
                                      New Customer (Will Create)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block font-mono font-bold text-xs px-2.5 py-1 rounded-lg border ${
                                    isExisting
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-blue-50 text-blue-800 border-blue-200'
                                  }`}>
                                    {targetCode}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <select
                                    value={isExisting ? (override.selected_ledger_code || override.matched_ledger_code || '') : ''}
                                    onChange={(e) => {
                                      const code = e.target.value;
                                      if (code) {
                                        const matched = (dbLedgers || []).find((l) => l.LedgerCode === code);
                                        handleMapExistingLedger(ldg.lookup_key, matched);
                                      } else {
                                        handleSetAutoCreateLedger(ldg.lookup_key);
                                      }
                                    }}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                                  >
                                    <option value="">-- Create As New Customer ({targetCode}) --</option>
                                    {(dbLedgers || []).map((dbL) => (
                                      <option key={dbL.LedgerCode} value={dbL.LedgerCode}>
                                        {dbL.LedgerName} ({dbL.LedgerCode}) {dbL.City ? `- ${dbL.City}` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BulkInvoiceUploadPage;
