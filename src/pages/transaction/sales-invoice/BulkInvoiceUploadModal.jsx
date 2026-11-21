import React, { useState, useMemo } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
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

export const BulkInvoiceUploadModal = ({ isOpen, onClose, onSuccess }) => {
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
  const { data: dbLedgersRes } = useMasterLedgers({ ledger_type: 'ALL', enabled: isOpen });
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
    // Disallow selecting duplicate invoices
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
  const handleLedgerActionChange = (lookupKey, isCreateNew) => {
    setLedgerOverrides((prev) => {
      const curr = prev[lookupKey] || {};
      const orig = previewData?.ledgers?.find((l) => l.lookup_key === lookupKey);
      return {
        ...prev,
        [lookupKey]: {
          ...curr,
          is_create_new: isCreateNew,
          action: isCreateNew ? 'CREATE_NEW' : 'MAP_EXISTING',
          exists_in_db: !isCreateNew,
          selected_ledger_code: isCreateNew ? '' : (curr.selected_ledger_code || curr.matched_ledger_code || orig?.suggested_ledger_code || ''),
          matched_ledger_code: isCreateNew ? '' : (curr.matched_ledger_code || orig?.suggested_ledger_code || ''),
          assigned_code: isCreateNew ? (orig?.assigned_code || 'Auto-Generate') : (curr.selected_ledger_code || curr.matched_ledger_code || orig?.suggested_ledger_code),
        },
      };
    });
  };

  const handleSelectExistingLedger = (lookupKey, ledgerCode) => {
    const found = (dbLedgers || []).find((l) => l.LedgerCode === ledgerCode);
    setLedgerOverrides((prev) => {
      const curr = prev[lookupKey] || {};
      return {
        ...prev,
        [lookupKey]: {
          ...curr,
          selected_ledger_code: ledgerCode,
          matched_ledger_code: ledgerCode,
          suggested_ledger_name: found?.LedgerName || curr.suggested_ledger_name,
          customer_name: found?.LedgerName || curr.customer_name,
          is_create_new: false,
          action: 'MAP_EXISTING',
          exists_in_db: true,
          state: found?.State || curr.state || '',
          gst_no: found?.GSTNo || curr.gst_no || '',
        },
      };
    });
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
      if (onSuccess) onSuccess(resData);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Main Dialog Modal */}
      <div className="relative w-full max-w-6xl overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <UploadCloud className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Bulk Sales Invoice & Ledger Importer</h2>
              <p className="text-xs text-emerald-100/90 font-medium">
                Import up to 100 Excel invoices with automatic customer ledger reconciliation & Item Master sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* VIEW A: SUCCESS SCREEN AFTER COMMIT */}
          {commitSuccessData ? (
            <div className="py-8 text-center space-y-6 max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Bulk Invoices Successfully Committed!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  All transactions and ledgers have been safely registered into the Scoto ERP database.
                </p>
              </div>

              {/* Stats Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Sales Invoices</div>
                  <div className="text-lg font-extrabold text-emerald-600 font-mono">
                    {commitSuccessData.invoices_committed || 0}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Line Items</div>
                  <div className="text-lg font-extrabold text-slate-800 font-mono">
                    {commitSuccessData.items_committed || 0}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Customer Ledgers</div>
                  <div className="text-lg font-extrabold text-blue-600 font-mono">
                    {commitSuccessData.ledgers_created || 0} New
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Item Master</div>
                  <div className="text-lg font-extrabold text-purple-600 font-mono">
                    {commitSuccessData.items_created || 0} New
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    handleClearAllFiles();
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  View Invoices Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleClearAllFiles();
                    onClose();
                    navigate('/transaction/record-payment');
                  }}
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
                <div className="space-y-4">
                  {/* Drag and Drop Box */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      isDragOver
                        ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                        : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
                    }`}
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-3 shadow-inner">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Drag and drop your Sales Invoice Excel workbooks here
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports up to 100 Excel files (.xlsx, .xls, .xlsm) formatted per Scoto Sales Invoice template or batch register.
                    </p>

                    <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer transition-colors">
                      <UploadCloud className="w-4 h-4 text-emerald-600" />
                      Browse Files
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
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">
                          Selected Files ({files.length})
                        </span>
                        <button
                          type="button"
                          onClick={handleClearAllFiles}
                          className="text-rose-600 hover:underline font-semibold text-[11px]"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {files.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-medium truncate">{file.name}</span>
                              <span className="text-[11px] text-slate-400 shrink-0">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Options & Action */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoCreateItems}
                            onChange={(e) => setAutoCreateItems(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <span className="font-medium">
                            Auto-register missing services/items into Item Master (Mst_Item)
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={handleAnalyzeFiles}
                          disabled={previewMutation.isPending}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {previewMutation.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Analyzing Files...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Analyze & Preview Invoices
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: 3-TABLE RECONCILIATION DASHBOARD */}
              {previewData && (
                <div className="space-y-4">
                  {/* Summary KPI Strip */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="block text-[10px] font-bold uppercase text-slate-500">
                        Invoices Detected
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 font-mono">
                        {previewData.summary?.total_invoices || 0}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400">
                          {previewData.summary?.total_files || 0} File(s)
                        </span>
                        {previewData.summary?.duplicate_invoices_count > 0 && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            {previewData.summary.duplicate_invoices_count} Duplicate Blocked
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="block text-[10px] font-bold uppercase text-slate-500">
                        Taxable Total
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 font-mono">
                        ₹{selectedKPIs.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">Selected Invoices</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="block text-[10px] font-bold uppercase text-slate-500">
                        GST (CGST+SGST)
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 font-mono">
                        ₹{selectedKPIs.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">18% Standard SAC</span>
                    </div>

                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="block text-[10px] font-bold uppercase text-emerald-800">
                        Total Net Amount
                      </span>
                      <span className="text-lg font-extrabold text-emerald-700 font-mono">
                        ₹{selectedKPIs.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="block text-[10px] text-emerald-600 mt-0.5">
                        {selectedKPIs.count} of {previewData.invoices.length} Checked
                      </span>
                    </div>

                    <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                      <span className="block text-[10px] font-bold uppercase text-blue-800">
                        Ledgers Status
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          {previewData.summary?.matched_ledgers_count || 0} Matched
                        </span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {previewData.summary?.new_ledgers_count || 0} New
                        </span>
                      </div>
                      <span className="block text-[10px] text-blue-600 mt-1">
                        Review in Ledger Tab
                      </span>
                    </div>
                  </div>

                  {/* 3 Tab Selector Buttons */}
                  <div className="flex items-center justify-between border-b border-slate-200 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('invoices')}
                        className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                          activeTab === 'invoices'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Table 1: Sales Invoices ({previewData.invoices?.length || 0})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('items')}
                        className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                          activeTab === 'items'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Layers className="w-4 h-4" />
                        Table 2: Line Items ({previewData.items?.length || 0})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('ledgers')}
                        className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                          activeTab === 'ledgers'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        Table 3: Customer Ledgers ({previewData.ledgers?.length || 0})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewData(null)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 pb-2 cursor-pointer"
                    >
                      Upload Other Files
                    </button>
                  </div>

                  {/* TAB 1: SALES INVOICES MASTER LIST */}
                  {activeTab === 'invoices' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-xs">
                            <tr>
                              <th className="p-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={
                                    previewData.invoices?.length > 0 &&
                                    selectedInvoiceNos.size === previewData.invoices.length
                                  }
                                  onChange={handleToggleAllInvoices}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </th>
                              <th className="p-3">Invoice No</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Customer Name</th>
                              <th className="p-3">GSTIN</th>
                              <th className="p-3 text-center">Items</th>
                              <th className="p-3 text-right">Taxable (₹)</th>
                              <th className="p-3 text-right">GST (₹)</th>
                              <th className="p-3 text-right">Net Total (₹)</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {previewData.invoices.map((inv) => {
                              const isChecked = selectedInvoiceNos.has(inv.invoice_no);
                              return (
                                <tr
                                  key={inv.invoice_no}
                                  className={`transition-colors ${
                                    inv.is_duplicate
                                      ? 'bg-slate-50/70 opacity-60'
                                      : !isChecked
                                      ? 'opacity-50 bg-slate-50/40 hover:bg-slate-50'
                                      : 'hover:bg-slate-50/80'
                                  }`}
                                >
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      disabled={inv.is_duplicate}
                                      checked={isChecked && !inv.is_duplicate}
                                      onChange={() => handleToggleInvoice(inv.invoice_no)}
                                      className={`rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 ${
                                        inv.is_duplicate
                                          ? 'opacity-30 cursor-not-allowed'
                                          : 'cursor-pointer'
                                      }`}
                                      title={
                                        inv.is_duplicate
                                          ? 'Duplicate invoice already in ERP - cannot be selected'
                                          : ''
                                      }
                                    />
                                  </td>
                                  <td className="p-3 font-bold text-slate-900 font-mono">
                                    <div>{inv.invoice_no}</div>
                                    {inv.source_file && (
                                      <div className="text-[10px] text-slate-400 font-mono font-normal truncate max-w-[170px]" title={inv.source_file}>
                                        {inv.source_file}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-slate-600 font-mono">
                                    {inv.invoice_date}
                                  </td>
                                  <td className="p-3 font-medium text-slate-900">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span>{inv.customer_name}</span>
                                      {inv.detected_unit && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                          {inv.detected_unit}
                                        </span>
                                      )}
                                    </div>
                                    {inv.detected_unit && inv.base_customer_name && (
                                      <div className="text-[10px] text-slate-400 font-normal">
                                        Parent: {inv.base_customer_name}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 font-mono text-[11px] text-slate-500">
                                    {inv.gst_no || 'Unregistered'}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-[11px] text-slate-700">
                                      {inv.items_count}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-800">
                                    {inv.total_item_amount?.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-600">
                                    {(inv.total_cgst + inv.total_sgst + inv.total_igst)?.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-right font-bold font-mono text-emerald-700">
                                    ₹{inv.net_amount?.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-center">
                                    {inv.is_duplicate ? (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200"
                                        title="This invoice number already exists in ERP. Re-importing duplicate invoices is blocked."
                                      >
                                        <AlertCircle className="w-3 h-3 text-rose-600" />
                                        Duplicate in DB (Blocked)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        Ready
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
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-xs">
                            <tr>
                              <th className="p-3">Invoice No</th>
                              <th className="p-3">Service / Item Description</th>
                              <th className="p-3">HSN/SAC</th>
                              <th className="p-3 text-center">Qty</th>
                              <th className="p-3 text-right">Rate (₹)</th>
                              <th className="p-3 text-right">Taxable (₹)</th>
                              <th className="p-3 text-center">GST %</th>
                              <th className="p-3 text-right">Line Total (₹)</th>
                              <th className="p-3 text-center">Mst_Item Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {previewData.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3 font-bold font-mono text-slate-900">
                                  {item.invoice_no}
                                </td>
                                <td className="p-3 font-medium text-slate-900">
                                  {item.item_desc}
                                </td>
                                <td className="p-3 font-mono text-slate-600">{item.hsn_code}</td>
                                <td className="p-3 text-center font-mono">
                                  {item.qty} {item.uom}
                                </td>
                                <td className="p-3 text-right font-mono text-slate-700">
                                  {item.rate?.toFixed(2)}
                                </td>
                                <td className="p-3 text-right font-mono text-slate-800">
                                  {item.taxable_amount?.toFixed(2)}
                                </td>
                                <td className="p-3 text-center font-semibold text-slate-700">
                                  {item.gst_rate}%
                                </td>
                                <td className="p-3 text-right font-bold font-mono text-emerald-700">
                                  ₹{item.line_net?.toFixed(2)}
                                </td>
                                <td className="p-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      item.item_master_status.includes('Matched')
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-purple-50 text-purple-800 border border-purple-200'
                                    }`}
                                  >
                                    {item.item_master_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SMART CUSTOMER LEDGER RECONCILIATION */}
                  {activeTab === 'ledgers' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto max-h-96 p-4 space-y-4">
                        {previewData.ledgers.map((l) => {
                          const override = ledgerOverrides[l.lookup_key] || l;
                          const isNew = override.is_create_new;

                          return (
                            <div
                              key={l.lookup_key}
                              className={`p-4 rounded-xl border transition-all ${
                                isNew
                                  ? 'bg-blue-50/40 border-blue-200'
                                  : 'bg-emerald-50/30 border-emerald-200'
                              }`}
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-slate-900">
                                      {l.customer_name || l.excel_customer_name}
                                    </h4>
                                    {l.detected_unit && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                        Unit: {l.detected_unit}
                                      </span>
                                    )}
                                    {l.excel_customer_name && l.excel_customer_name !== (l.customer_name || '') && (
                                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                        Prefix 'M/s.' removed
                                      </span>
                                    )}
                                    {/* Match Badge */}
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                        l.match_type === 'EXACT_UNIT_MATCH'
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : l.match_type === 'NEW_UNIT_LEDGER'
                                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                          : l.match_type === 'EXACT_GST'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : l.match_type === 'EXACT_NAME'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : l.match_type === 'FUZZY_NAME'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {l.match_type === 'EXACT_UNIT_MATCH' && 'Matched Unit Ledger (100%)'}
                                      {l.match_type === 'NEW_UNIT_LEDGER' &&
                                        `New Unit of ${l.parent_ledger_name || 'Existing Customer'} (${l.parent_ledger_code})`}
                                      {l.match_type === 'EXACT_GST' && 'Exact GST Match (100%)'}
                                      {l.match_type === 'EXACT_NAME' && 'Exact Name Match (100%)'}
                                      {l.match_type === 'FUZZY_NAME' &&
                                        `Fuzzy Match (${l.match_score}%)`}
                                      {l.match_type === 'NEW_LEDGER' && 'New Customer'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1 font-mono">
                                    {l.detected_unit && l.base_customer_name && (
                                      <span className="text-slate-700 font-sans font-medium">
                                        Cheque Print / Legal: <strong className="text-slate-900">{l.base_customer_name}</strong>
                                      </span>
                                    )}
                                    <span>GST: {l.gst_no || l.excel_gst || 'None'}</span>
                                    <span>PAN: {l.pan_no || l.excel_pan || 'None'}</span>
                                    <span>City: {l.city || 'N/A'}</span>
                                  </div>
                                </div>

                                {/* Reconcile Action Toggle */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {l.match_type === 'NEW_UNIT_LEDGER' && l.parent_ledger_code ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleLedgerActionChange(l.lookup_key, true)
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                          isNew
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                      >
                                        Create Separate Unit Ledger ({override.assigned_code || l.assigned_code})
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSelectExistingLedger(l.lookup_key, l.parent_ledger_code)
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                          !isNew && override.selected_ledger_code === l.parent_ledger_code
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                      >
                                        Merge into Parent ({l.parent_ledger_code})
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleLedgerActionChange(l.lookup_key, false)
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                          !isNew
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                      >
                                        Link to Existing Ledger
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleLedgerActionChange(l.lookup_key, true)
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                          isNew
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                      >
                                        Create as New Ledger
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Action Specific Sub-form */}
                              <div className="mt-3 pt-3 border-t border-slate-200/80">
                                {!isNew ? (
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <label className="text-xs font-semibold text-slate-700 shrink-0">
                                      Target ERP Customer Ledger:
                                    </label>
                                    <select
                                      value={override.selected_ledger_code || ''}
                                      onChange={(e) =>
                                        handleSelectExistingLedger(l.lookup_key, e.target.value)
                                      }
                                      className="w-full sm:max-w-md px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    >
                                      <option value="">-- Select Existing ERP Customer --</option>
                                      {(dbLedgers || []).map((dbL) => (
                                        <option key={dbL.LedgerCode} value={dbL.LedgerCode}>
                                          {dbL.LedgerName} ({dbL.LedgerCode}) - {dbL.City || 'N/A'}
                                        </option>
                                      ))}
                                    </select>
                                    {override.suggested_ledger_code && (
                                      <span className="text-[11px] text-emerald-700 font-medium">
                                        Matched: {override.suggested_ledger_name} (
                                        {override.suggested_ledger_code})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                          Ledger Name (Operational ERP Account)
                                        </label>
                                        <input
                                          type="text"
                                          value={override.customer_name || override.full_customer_name || ''}
                                          onChange={(e) =>
                                            handleUpdateNewLedgerField(
                                              l.lookup_key,
                                              'customer_name',
                                              e.target.value
                                            )
                                          }
                                          placeholder="e.g. ABC Textiles Ltd - Unit A"
                                          className="w-full mt-0.5 px-2.5 py-1 text-xs rounded border border-slate-300 bg-white font-medium"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                          Cheque Print Name (Legal Company Title)
                                        </label>
                                        <input
                                          type="text"
                                          value={override.base_customer_name || override.customer_name || ''}
                                          onChange={(e) =>
                                            handleUpdateNewLedgerField(
                                              l.lookup_key,
                                              'base_customer_name',
                                              e.target.value
                                            )
                                          }
                                          placeholder="e.g. ABC Textiles Ltd"
                                          className="w-full mt-0.5 px-2.5 py-1 text-xs rounded border border-slate-300 bg-white"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                      <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                          Billing Address
                                        </label>
                                        <input
                                          type="text"
                                          value={override.address1 || ''}
                                          onChange={(e) =>
                                            handleUpdateNewLedgerField(
                                              l.lookup_key,
                                              'address1',
                                              e.target.value
                                            )
                                          }
                                          placeholder="Street / Area Address"
                                          className="w-full mt-0.5 px-2.5 py-1 text-xs rounded border border-slate-300 bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                          City
                                        </label>
                                        <input
                                          type="text"
                                          value={override.city || ''}
                                          onChange={(e) =>
                                            handleUpdateNewLedgerField(
                                              l.lookup_key,
                                              'city',
                                              e.target.value
                                            )
                                          }
                                          className="w-full mt-0.5 px-2.5 py-1 text-xs rounded border border-slate-300 bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                          Pincode / State
                                        </label>
                                        <div className="flex gap-1 mt-0.5">
                                          <input
                                            type="text"
                                            value={override.pincode || ''}
                                            onChange={(e) =>
                                              handleUpdateNewLedgerField(
                                                l.lookup_key,
                                                'pincode',
                                                e.target.value
                                              )
                                            }
                                            placeholder="PIN"
                                            className="w-16 px-1.5 py-1 text-xs rounded border border-slate-300 bg-white"
                                          />
                                          <input
                                            type="text"
                                            value={override.state || 'Tamil Nadu'}
                                            onChange={(e) =>
                                              handleUpdateNewLedgerField(
                                                l.lookup_key,
                                                'state',
                                                e.target.value
                                              )
                                            }
                                            className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer / Commit Bar */}
        {!commitSuccessData && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div>
              {previewData ? (
                <div className="text-xs text-slate-600">
                  Ready to import{' '}
                  <span className="font-bold text-slate-900">{selectedKPIs.count}</span> of{' '}
                  <span className="font-bold">{previewData.invoices.length}</span> Invoices (Net{' '}
                  <span className="font-bold text-emerald-700">
                    ₹{selectedKPIs.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  ).
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Supported formats: Standard Scoto Invoice sheets (.xlsx, .xls, .xlsm)
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {previewData && (
                <button
                  type="button"
                  onClick={handleCommitInvoices}
                  disabled={commitMutation.isPending || selectedKPIs.count === 0}
                  className="px-6 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {commitMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Commit {selectedKPIs.count} Invoices to ERP
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
