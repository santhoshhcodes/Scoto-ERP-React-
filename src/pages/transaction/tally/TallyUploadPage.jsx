import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowRight,
  Filter,
  Layers,
  FileCheck,
  AlertCircle,
  Database,
  Eye,
  X,
  Download,
  Building,
  MapPin,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StatCard } from '../../../components/common';
import { exportToExcel } from '../../../utils/excelUtils';
import { useFinancialYear } from '../../../context/FinancialYearContext';
import scotoLogo from '../../../assets/ScotoLogo.png';
import {
  useTallyTransactions,
  usePreviewTallyExcel,
  useUploadTallyExcel,
  tallyApi,
} from '../../../api/tallyApi';

export const TallyUploadPage = () => {
  const { selectedFinYear } = useFinancialYear();
  // Target Company & Location Settings (Matches .NET defaults: SCT / UNIT I)
  const [cCode, setCCode] = useState('SCT');
  const [lCode, setLCode] = useState('UNIT I');
  const [userId, setUserId] = useState('ACCSCOTO');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Preview Data State
  const [previewData, setPreviewData] = useState(null);
  const [expandedVoucherIdx, setExpandedVoucherIdx] = useState(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  // Log Table Filters
  const [search, setSearch] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Queries & Mutations
  const {
    data: transData = { records: [], total: 0 },
    isLoading: isLoadingTrans,
    isFetching: isFetchingTrans,
    refetch: refetchTrans,
  } = useTallyTransactions({
    limit: 100,
    search,
    voucher_type: voucherTypeFilter,
    from_date: fromDate,
    to_date: toDate,
    fin_year: selectedFinYear,
  });

  const previewMutation = usePreviewTallyExcel();
  const uploadMutation = useUploadTallyExcel();

  const isUploading = uploadMutation.isPending;
  const isPreviewing = previewMutation.isPending;

  // Handle Drag & Drop
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
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelected(files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      showToast('Please select a valid .xlsx Excel file.', 'error');
      return;
    }
    setSelectedFile(file);
    setPreviewData(null);
    setExpandedVoucherIdx(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setExpandedVoucherIdx(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger Preview
  const handlePreview = async () => {
    if (!selectedFile) {
      showToast('Please choose an Excel file to preview.', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('c_code', cCode);
      formData.append('l_code', lCode);

      const res = await previewMutation.mutateAsync(formData);
      setPreviewData(res);
      showToast(
        `Preview ready: ${res.summary.total_vouchers} vouchers parsed across ${res.summary.total_sheets} sheet(s).`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to parse Tally Excel file.', 'error');
    }
  };

  // Trigger Upload (Direct or after preview)
  const handleUpload = async () => {
    if (!selectedFile) {
      showToast('Please select a Tally Excel file to upload.', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('c_code', cCode);
      formData.append('l_code', lCode);
      formData.append('user_id', userId);
      formData.append('user_name', userId);
      formData.append('overwrite', overwriteExisting ? 'true' : 'false');

      const res = await uploadMutation.mutateAsync(formData);
      showToast(
        res.message || `Success! ${res.vouchers_inserted || res.vouchers_processed} vouchers inserted.`,
        'success'
      );
      handleClearFile();
      refetchTrans();
    } catch (err) {
      showToast(err.message || 'Tally upload failed.', 'error');
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = async () => {
    try {
      await tallyApi.downloadTemplate();
      showToast('Sample Tally Excel template downloaded.');
    } catch (err) {
      showToast('Failed to download template: ' + (err.message || ''), 'error');
    }
  };

  // Export Table Data to Excel
  const handleExportTable = () => {
    if (!transData.records || !transData.records.length) {
      showToast('No transaction records available to export.', 'error');
      return;
    }

    const exportRows = transData.records.map((r, i) => ({
      'S.No': i + 1,
      'Voucher No': r.trans_no,
      'Date': r.trans_date_display || r.trans_date,
      'Voucher Type': r.trans_type,
      'Ledger Name': r.ledger_name,
      'Ledger Code': r.ledger_code,
      'Account Head': r.acc_head_name,
      'Credit (₹)': r.credit_amount,
      'Debit (₹)': r.debit_amount,
      'Narration': r.narration,
      'Financial Year': r.fin_year,
      'Created By': r.created_by,
    }));

    exportToExcel(
      exportRows,
      `Tally_Transactions_${new Date().toISOString().split('T')[0]}`,
      'Transactions'
    );
    showToast('Transactions exported to Excel.');
  };

  // Format INR Currency
  const formatINR = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Statistics calculation for transaction history
  const stats = useMemo(() => {
    const recs = transData.records || [];
    const totalCredit = recs.reduce((acc, r) => acc + (Number(r.credit_amount) || 0), 0);
    const totalDebit = recs.reduce((acc, r) => acc + (Number(r.debit_amount) || 0), 0);
    const uniqueVouchers = new Set(recs.map((r) => r.trans_no)).size;

    return {
      totalEntries: transData.total || recs.length,
      uniqueVouchers,
      totalCredit,
      totalDebit,
    };
  }, [transData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert Banner */}
      {toast && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs shadow-xs animate-in fade-in ${
            toast.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            <span className="font-semibold">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="cursor-pointer opacity-70 hover:opacity-100 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header & Branding */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
        

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {/* <span className="font-extrabold text-xs tracking-tight text-slate-800 flex items-center gap-1">
                SCOTO <span className="text-indigo-600 font-black">ERP</span>
              </span> */}
              
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Tally Voucher Upload & Sync
              </h1>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                Accounts Module
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Ingest multi-sheet Tally Excel voucher registers directly into General Ledger (
              <span className="font-mono text-slate-700 font-semibold">dbo.Acc_Trans_All</span>)
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600" />
            <span>Download Sample Template</span>
          </button>

          <button
            type="button"
            onClick={() => refetchTrans()}
            disabled={isFetchingTrans}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${isFetchingTrans ? 'animate-spin' : ''}`} />
            <span>{isFetchingTrans ? 'Syncing...' : 'Refresh Logs'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Logged Entries"
          value={`${stats.totalEntries}`}
          icon={Database}
          color="indigo"
          changeLabel="General Ledger entries in DB"
        />

        <StatCard
          title="Unique Vouchers"
          value={`${stats.uniqueVouchers}`}
          icon={FileCheck}
          color="emerald"
          changeLabel="Sales, Receipts, Payments"
        />

        <StatCard
          title="Total Ledger Credits"
          value={formatINR(stats.totalCredit)}
          icon={FileSpreadsheet}
          color="purple"
          changeLabel="Total credited amount"
        />

        <StatCard
          title="Total Ledger Debits"
          value={formatINR(stats.totalDebit)}
          icon={Layers}
          color="teal"
          changeLabel="Total debited amount"
        />
      </div>

      {/* Main Upload Box & Config Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload Dropzone (2 Cols wide on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Select Tally Excel File
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Supported: Microsoft Excel (.xlsx)
              </span>
            </div>

            {/* Drag & Drop Target Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                  : selectedFile
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xs border border-slate-200 text-indigo-600 mb-3">
                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
              </div>

              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{selectedFile.name}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready for preview or upload
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drag and drop your Tally Excel workbook here
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Automatically scans all worksheets containing Date and Particulars columns
                  </p>
                </div>
              )}
            </div>

            {/* Actions for Selected File */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Clear File</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {/* Preview Button */}
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={!selectedFile || isPreviewing || isUploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 cursor-pointer shadow-2xs transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{isPreviewing ? 'Validating Sheets...' : 'Preview Vouchers'}</span>
                </button>

                {/* Direct Upload Button (matches .NET btnTallyUpload) */}
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading || isPreviewing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>{isUploading ? 'Ingesting to ERP...' : 'Tally Upload'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Target Entity & Location Configuration (1 Col wide) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Posting Configuration
              </h2>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Code</label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={cCode}
                    onChange={(e) => setCCode(e.target.value)}
                    className="w-full bg-transparent font-mono font-semibold text-slate-900 focus:outline-none"
                    placeholder="e.g. SCT"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Scoto operating company identity
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location / Plant</label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={lCode}
                    onChange={(e) => setLCode(e.target.value)}
                    className="w-full bg-transparent font-mono font-semibold text-slate-900 focus:outline-none"
                    placeholder="e.g. UNIT I"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Operating location (matches .NET SessionMstLcode)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Posting Operator</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-slate-900 focus:outline-none text-xs"
                />
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1.5 text-indigo-900 text-[11px]">
                <div className="font-bold flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Target Table: Acc_Trans_All</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Financial years are automatically calculated per voucher date from{' '}
                  <span className="font-mono text-indigo-800">dbo.MstFinacialYear</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section (Appears after clicking Preview) */}
      {previewData && (
        <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs space-y-5 animate-in fade-in slide-in-from-top-2">
          {/* Header of Preview */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-indigo-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Pre-Ingestion Analysis & Ledger Mapping
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                    previewData.summary.is_balanced
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {previewData.summary.is_balanced ? '✓ 100% Balanced' : '⚠ Debit/Credit Mismatch'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Extracted {previewData.summary.total_vouchers} vouchers across{' '}
                {previewData.summary.total_sheets} sheet(s) ({previewData.summary.total_entries} ledger
                postings)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Overwrite if already present</span>
              </label>

              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 cursor-pointer transition-colors"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Confirm & Ingest All Vouchers</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics of the Workbook */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="text-slate-500 block">Total Debits</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {formatINR(previewData.summary.total_debit)}
              </span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="text-slate-500 block">Total Credits</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {formatINR(previewData.summary.total_credit)}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <span className="text-emerald-700 block font-semibold">New to Import</span>
              <span className="text-sm font-bold text-emerald-800 font-mono">
                {previewData.summary.new_vouchers_count ?? previewData.summary.total_vouchers} Vouchers
              </span>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <span className="text-amber-700 block font-semibold">Already In DB</span>
              <span className="text-sm font-bold text-amber-800 font-mono">
                {previewData.summary.already_in_db_count ?? 0} {overwriteExisting ? '(Will Overwrite)' : '(Will Skip)'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <span className="text-slate-500 block">Unmatched Ledgers</span>
              <span
                className={`text-sm font-bold ${
                  previewData.summary.unmatched_ledgers_count > 0 ? 'text-amber-700' : 'text-slate-700'
                }`}
              >
                {previewData.summary.unmatched_ledgers_count} (Defaulted to 'NA')
              </span>
            </div>
          </div>

          {/* Unmatched Ledgers Warning Box if any */}
          {previewData.unmatched_ledgers && previewData.unmatched_ledgers.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-1.5 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span>Unmatched Ledger Accounts Detected:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                The following ledgers do not yet exist in{' '}
                <span className="font-semibold">Acc_Mst_GeneralLedger</span>. They will be imported
                with code <span className="font-mono font-bold">NA</span> per standard ERP rules:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {previewData.unmatched_ledgers.map((lName, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-900 border border-amber-300"
                  >
                    {lName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Vouchers Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Extracted Vouchers ({previewData.vouchers.length})
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[380px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Voucher No</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5">Particulars (Main Ledger)</th>
                    <th className="px-3 py-2.5 text-right">Gross Total</th>
                    <th className="px-3 py-2.5">Postings</th>
                    <th className="px-3 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {previewData.vouchers.map((v, i) => {
                    const isExpanded = expandedVoucherIdx === i;
                    return (
                      <React.Fragment key={i}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                            {v.trans_date_display}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-indigo-700">
                            <div className="flex items-center gap-1.5">
                              <span>{v.voucher_no}</span>
                              {v.is_already_in_db ? (
                                <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 whitespace-nowrap">
                                  In DB (Skip)
                                </span>
                              ) : (
                                <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 whitespace-nowrap">
                                  New
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              {v.voucher_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900 truncate max-w-xs">
                            {v.particulars}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            {formatINR(v.gross_total)}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {v.entries.length} leg(s)
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setExpandedVoucherIdx(isExpanded ? null : i)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide' : 'Details'}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={8} className="p-3">
                              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                                <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                                  <span>Ledger Postings Breakdown for Voucher #{v.voucher_no}</span>
                                  {v.narration && (
                                    <span className="font-normal italic text-slate-500 max-w-md truncate">
                                      Narration: {v.narration}
                                    </span>
                                  )}
                                </div>
                                <div className="divide-y divide-slate-100 text-xs">
                                  {v.entries.map((ent, eIdx) => (
                                    <div
                                      key={eIdx}
                                      className="flex items-center justify-between py-1.5 text-[11px]"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-900">
                                          {ent.ledger_name}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-400">
                                          Code: {ent.ledger_code}
                                        </span>
                                        {ent.is_matched ? (
                                          <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                                            GL Matched
                                          </span>
                                        ) : (
                                          <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 border border-amber-200">
                                            NA
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 font-mono font-semibold">
                                        <span className={ent.debit_amount > 0 ? 'text-blue-700' : 'text-slate-400'}>
                                          Dr: {formatINR(ent.debit_amount)}
                                        </span>
                                        <span className={ent.credit_amount > 0 ? 'text-emerald-700' : 'text-slate-400'}>
                                          Cr: {formatINR(ent.credit_amount)}
                                        </span>
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
          </div>
        </div>
      )}

      {/* Ingested Vouchers History & Audit Log */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-600" />
              <span>General Ledger Transactions Audit Log</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live records from <span className="font-mono font-semibold">dbo.Acc_Trans_All</span>{' '}
              reflecting synchronized Tally transactions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportTable}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search voucher no, ledger, narration..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Voucher Type Filter */}
          <div>
            <select
              value={voucherTypeFilter}
              onChange={(e) => setVoucherTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Voucher Types</option>
              <option value="Sales">Sales</option>
              <option value="Receipt">Receipt</option>
              <option value="Payment">Payment</option>
              <option value="Journal">Journal</option>
              <option value="Purchase">Purchase</option>
              <option value="Contra">Contra</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              title="From Transaction Date"
            />
          </div>

          {/* To Date */}
          <div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              title="To Transaction Date"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Voucher No</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Account / Ledger</th>
                <th className="px-3 py-2.5">Head</th>
                <th className="px-3 py-2.5 text-right">Debit (₹)</th>
                <th className="px-3 py-2.5 text-right">Credit (₹)</th>
                <th className="px-3 py-2.5">Narration</th>
                <th className="px-3 py-2.5">FY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoadingTrans ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading transactions from Acc_Trans_All...</span>
                  </td>
                </tr>
              ) : !transData.records || transData.records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No transactions matching the selected criteria. Upload a Tally Excel file above.
                  </td>
                </tr>
              ) : (
                transData.records.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-3 py-2 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {r.trans_no}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                      {r.trans_date_display || r.trans_date}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {r.trans_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900 truncate max-w-xs">
                      {r.ledger_name}
                      {r.ledger_code && r.ledger_code !== 'NA' && (
                        <span className="ml-1 text-[10px] font-mono text-slate-400 font-normal">
                          ({r.ledger_code})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500 truncate max-w-[150px]">
                      {r.acc_head_name || '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-blue-700 whitespace-nowrap">
                      {r.debit_amount > 0 ? formatINR(r.debit_amount) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                      {r.credit_amount > 0 ? formatINR(r.credit_amount) : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-500 max-w-xs truncate" title={r.narration}>
                      {r.narration || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {r.fin_year || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Animated Loading Overlay matching .NET loading-blocks */}
      {(isUploading || isPreviewing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-xs animate-in fade-in">
          <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
            {/* .NET Loading Blocks Animation */}
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="h-4 w-4 rounded-md bg-indigo-600 animate-pulse"
                  style={{ animationDelay: `${idx * 0.2}s` }}
                />
              ))}
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                {isUploading ? 'Ingesting Tally Vouchers...' : 'Parsing Tally Excel Sheets...'}
              </h4>
              <p className="text-xs text-slate-500">
                {isUploading
                  ? 'Writing balanced journal entries into dbo.Acc_Trans_All'
                  : 'Validating columns, dates, amounts, and General Ledger matches'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TallyUploadPage;
