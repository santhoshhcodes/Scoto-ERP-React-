import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Building,
  DollarSign,
  Layers,
  ArrowLeft,
  Check,
  CreditCard,
  Landmark,
  FileText,
  MapPin,
  Phone,
  Mail,
  Globe,
  Hash,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import StatCard from '../../../components/common/StatCard';
import {
  useMasterLedgers,
  useCreateMasterLedger,
  useUpdateMasterLedger,
  useDeleteMasterLedger,
} from '../../../api/masterApi';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';

const ACCOUNT_HEADERS = ['Assets', 'Liabilities', 'Income', 'Expenses', 'Equity'];

const ACCOUNT_GROUPS = [
  'Sundry Creditors (Suppliers & Vendors)',
  'Sundry Debtors (Receivables)',
  'Bank & Cash Accounts',
  'Current Assets',
  'Fixed Assets',
  'Direct Expenses',
  'Indirect Expenses',
  'Direct Income / Revenue',
  'Indirect Income',
  'Duties & Taxes',
];

const SUPPLIER_CLASSIFICATIONS = [
  'Pvt Company',
  'Proprietorship',
  'Partnership',
  'Public Listed Company',
  'Foreign Company',
  'Others',
];

const BANK_NAMES = [
  'HDFC Bank Ltd',
  'State Bank of India (SBI)',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank (PNB)',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Standard Chartered Bank',
  'Citibank / Foreign Bank',
  'Other Commercial Bank',
];

const INITIAL_FORM_STATE = {
  LedgerType: 'Supplier',
  LedgerCode: '',
  LedgerName: '',
  ChequePrintName: '',
  Ledger_Class: 'Pvt Company',
  Region: 'Domestic',
  AccLedgerHeaderName: 'Liabilities',
  AccGroupName: 'Sundry Creditors (Suppliers & Vendors)',
  AccSubGroupName: '',
  CostCenter: 'Cost Centre',
  // Address & Contact
  HouseNo: '',
  Add1: '',
  Add2: '',
  Area: '',
  City: 'Bengaluru',
  PinCode: '',
  State: 'Karnataka',
  Country: 'India',
  MobileNo: '',
  TelNo: '',
  ContectName: '',
  ContectNo: '',
  MailID: '',
  WebSite: '',
  // Bank Details
  BankName: 'HDFC Bank Ltd',
  AccountNo: '',
  BranchName: '',
  Branch_Addr: '',
  IFSCCode: '',
  SWIFTCode: '',
  IBANCode: '',
  // Statutory Details
  GSTNo: '',
  PanNo: '',
  TanNo: '',
  CINNo: '',
  IECode: '',
  LEICode: '',
  MSME_Status: '2',
  MSME_No: '',
  PaymentDays: '30',
  // Financial
  OpeningBalance: '0.00',
  BalanceType: 'Cr',
  Status: 'ACTIVE',
};

export const LedgerMasterPage = () => {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
  const [editingLedgerCode, setEditingLedgerCode] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // TanStack Query Hooks
  const {
    data: ledgersResponse,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useMasterLedgers({
    search: searchQuery,
  });

  const createLedgerMutation = useCreateMasterLedger();
  const updateLedgerMutation = useUpdateMasterLedger();
  const deleteLedgerMutation = useDeleteMasterLedger();

  // Real ledgers fetched from MSSQL backend
  const ledgers = ledgersResponse?.data ?? [];

  // Type Filter Tabs
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL'); // 'ALL' | 'Customer' | 'Supplier' | 'General Ledger'

  // Statistics
  const totalLedgers = ledgers.length;
  const customerCount = ledgers.filter((l) => l.LedgerType === 'Customer').length;
  const supplierCount = ledgers.filter((l) => l.LedgerType === 'Supplier').length;
  const glCount = ledgers.filter((l) => l.LedgerType === 'General Ledger').length;

  // Filtered List (by selected type and search query)
  const filteredLedgers = ledgers.filter((ledger) => {
    const matchesType =
      selectedTypeFilter === 'ALL' || ledger.LedgerType === selectedTypeFilter;

    const matchesSearch =
      ledger.LedgerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ledger.LedgerCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ledger.AccGroupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ledger.GSTNo && ledger.GSTNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ledger.City && ledger.City.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesSearch;
  });

  const {
    sortedItems: sortedFilteredLedgers,
    sortConfig,
    requestSort,
  } = useSortableData(filteredLedgers, { key: 'LedgerCode', direction: 'desc' });

  const handleOpenAdd = (defaultType = null) => {
    setEditingLedgerCode(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    const type = defaultType || (selectedTypeFilter !== 'ALL' ? selectedTypeFilter : 'Customer');
    const prefix = type === 'Customer' ? 'CUS-' : type === 'General Ledger' ? 'GL-' : 'SUP-';
    const header = type === 'Customer' ? 'Assets' : type === 'General Ledger' ? 'Assets' : 'Liabilities';
    const group = type === 'Customer' ? 'Sundry Debtors (Receivables)' : type === 'General Ledger' ? 'Bank & Cash Accounts' : 'Sundry Creditors (Suppliers & Vendors)';
    const balType = type === 'Customer' ? 'Dr' : type === 'General Ledger' ? 'Dr' : 'Cr';

    setFormData({
      ...INITIAL_FORM_STATE,
      LedgerType: type,
      LedgerCode: `${prefix}${Math.floor(1000 + Math.random() * 9000)}`,
      AccLedgerHeaderName: header,
      AccGroupName: group,
      BalanceType: balType,
    });
    setViewMode('form');
  };

  const handleOpenEdit = (ledger) => {
    setEditingLedgerCode(ledger.LedgerCode || ledger.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormData({ ...INITIAL_FORM_STATE, ...ledger });
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setEditingLedgerCode(null);
    setErrorMessage(null);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'LedgerName' && !prev.ChequePrintName) {
        updated.ChequePrintName = value;
      }
      if (field === 'LedgerType' && !editingLedgerCode) {
        if (value === 'Customer') {
          updated.LedgerCode = `CUS-${Math.floor(1000 + Math.random() * 9000)}`;
          updated.AccLedgerHeaderName = 'Assets';
          updated.AccGroupName = 'Sundry Debtors (Receivables)';
          updated.BalanceType = 'Dr';
        } else if (value === 'Supplier') {
          updated.LedgerCode = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
          updated.AccLedgerHeaderName = 'Liabilities';
          updated.AccGroupName = 'Sundry Creditors (Suppliers & Vendors)';
          updated.BalanceType = 'Cr';
        } else if (value === 'General Ledger') {
          updated.LedgerCode = `GL-${Math.floor(1000 + Math.random() * 9000)}`;
          updated.AccLedgerHeaderName = 'Assets';
          updated.AccGroupName = 'Bank & Cash Accounts';
          updated.BalanceType = 'Dr';
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.LedgerName.trim()) return;

    setErrorMessage(null);

    const isGL = formData.LedgerType === 'General Ledger';
    const payload = {
      ...formData,
      ChequePrintName: (formData.ChequePrintName?.trim() || formData.LedgerName?.trim()),
      PaymentDays: isGL ? '0' : (formData.PaymentDays || '30'),
      OpeningBalance: formData.OpeningBalance === '' ? '0.00' : (formData.OpeningBalance ?? '0.00'),
      BalanceType: formData.BalanceType || (formData.LedgerType === 'Customer' ? 'Dr' : 'Cr'),
    };

    try {
      if (editingLedgerCode) {
        await updateLedgerMutation.mutateAsync({
          ledgerCode: editingLedgerCode,
          payload,
        });
        setSuccessMessage(`Ledger ${editingLedgerCode} updated successfully.`);
      } else {
        await createLedgerMutation.mutateAsync({
          payload,
        });
        setSuccessMessage(`Ledger ${formData.LedgerName} created successfully.`);
      }

      setTimeout(() => {
        setViewMode('list');
        setEditingLedgerCode(null);
      }, 500);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Failed to save ledger record.'
      );
    }
  };

  const handleDelete = async (code) => {
    if (window.confirm(`Are you sure you want to delete ledger ${code}?`)) {
      try {
        await deleteLedgerMutation.mutateAsync({ ledgerCode: code });
        setSuccessMessage(`Ledger ${code} deleted.`);
      } catch (err) {
        alert(err.response?.data?.detail || err.message || 'Failed to delete ledger.');
      }
    }
  };

  const isSaving = createLedgerMutation.isPending || updateLedgerMutation.isPending;

  // ==============================================================
  // VIEW: FULL SCREEN FORM (ADD / EDIT SUPPLIER & LEDGER MASTER)
  // ==============================================================
  if (viewMode === 'form') {
    const isGeneralLedger = formData.LedgerType === 'General Ledger';

    return (
      <div className="space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Ledger List
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {editingLedgerCode
                  ? `Edit ${formData.LedgerType} Master`
                  : `New ${formData.LedgerType === 'Customer' ? 'Customer (Client)' : formData.LedgerType === 'General Ledger' ? 'General Ledger Account' : 'Supplier (Vendor)'} Entry`}
              </h1>
              <p className="text-xs text-slate-500">
                {formData.LedgerType === 'Customer'
                  ? 'Setup client account, GSTIN, billing address, and credit terms'
                  : formData.LedgerType === 'General Ledger'
                  ? 'Setup Chart of Accounts, Bank/Cash accounts, GST heads, and Cost Centres'
                  : 'Setup vendor accounts, settlement banking details, address records, and statutory compliance'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Error Banner */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Entity & General Ledger Classification */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                {isGeneralLedger
                  ? '1. Account Identification & Classification'
                  : '1. General Ledger & Supplier Identification'}
              </h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                {isGeneralLedger ? 'General Ledger (GL)' : 'General Information'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5">
              {/* LedgerType */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ledger Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.LedgerType}
                  onChange={(e) => handleChange('LedgerType', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                >
                  <option value="Supplier">Supplier (Vendor)</option>
                  <option value="Customer">Customer (Client)</option>
                  <option value="General Ledger">General Ledger</option>
                </select>
              </div>

              {/* LedgerCode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ledger Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.LedgerCode}
                    onChange={(e) => handleChange('LedgerCode', e.target.value)}
                    disabled={!!editingLedgerCode}
                    placeholder={isGeneralLedger ? 'e.g. GL-1001' : 'e.g. SUP-1001'}
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border font-mono font-medium ${
                      editingLedgerCode
                        ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* LedgerName */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {formData.LedgerType === 'Customer'
                    ? 'Customer / Client Company Name'
                    : formData.LedgerType === 'General Ledger'
                    ? 'General Ledger Account Name'
                    : 'Supplier / Vendor Company Name'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.LedgerName}
                  onChange={(e) => handleChange('LedgerName', e.target.value)}
                  placeholder={
                    isGeneralLedger
                      ? 'e.g. Office Rent Expense / Output CGST 9% / City Union Bank'
                      : 'e.g. eSSL Security Systems India Pvt Ltd'
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  required
                />
              </div>
            </div>

            {/* Non-GL specific: ChequePrintName, Entity Classification, Payment Terms */}
            {!isGeneralLedger && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5">
                {/* ChequePrintName */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Cheque Print Name
                  </label>
                  <input
                    type="text"
                    value={formData.ChequePrintName}
                    onChange={(e) => handleChange('ChequePrintName', e.target.value)}
                    placeholder="Name to appear on bank remittances"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Ledger_Class */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Entity Classification
                  </label>
                  <select
                    value={formData.Ledger_Class}
                    onChange={(e) => handleChange('Ledger_Class', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {SUPPLIER_CLASSIFICATIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PaymentDays */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payment Terms (Credit Days)
                  </label>
                  <select
                    value={formData.PaymentDays}
                    onChange={(e) => handleChange('PaymentDays', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="0">Immediate (0 Days)</option>
                    <option value="15">15 Days</option>
                    <option value="30">30 Days</option>
                    <option value="45">45 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                </div>
              </div>
            )}

            {/* Account Classification: Header, Group, Sub-Group, Cost Center */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5 pt-1">
              {/* AccLedgerHeaderName */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Header <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.AccLedgerHeaderName}
                  onChange={(e) => handleChange('AccLedgerHeaderName', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                >
                  {ACCOUNT_HEADERS.map((hdr) => (
                    <option key={hdr} value={hdr}>
                      {hdr}
                    </option>
                  ))}
                </select>
              </div>

              {/* AccGroupName */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Group <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.AccGroupName}
                  onChange={(e) => handleChange('AccGroupName', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                >
                  {ACCOUNT_GROUPS.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>

              {/* AccSubGroupName */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Sub Group
                </label>
                <input
                  type="text"
                  value={formData.AccSubGroupName}
                  onChange={(e) => handleChange('AccSubGroupName', e.target.value)}
                  placeholder={
                    isGeneralLedger
                      ? 'e.g. Utility Expenses / GST Taxes'
                      : 'e.g. Hardware Vendors'
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* CostCenter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cost Center Allocation <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.CostCenter}
                  onChange={(e) => handleChange('CostCenter', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                >
                  <option value="Cost Centre">Cost Centre</option>
                  <option value="Profit Centre">Profit Centre</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </div>
            </div>
          </div>

          {/* Informative Guidance Banner for General Ledger */}
          {isGeneralLedger && (
            <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4.5 flex items-start gap-3">
              <div className="p-2 bg-sky-100 rounded-lg text-sky-700 shrink-0">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                  Internal Financial Account (Chart of Accounts)
                </h4>
                <p className="text-xs text-sky-700 mt-0.5 leading-relaxed">
                  General Ledger accounts represent internal company accounts (such as Expenses, Incomes, Duties & Taxes, or Bank/Cash). 
                  Party address records, settlement banking details, and statutory tax compliance registrations (GSTIN/PAN) are only required for trading entities (Customers & Suppliers).
                </p>
              </div>
            </div>
          )}

          {/* Sections 2, 3, 4: Only applicable for Trading Parties (Customers & Suppliers) */}
          {!isGeneralLedger && (
            <>
              {/* Section 2: Address & Contact Details */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                2. Address & Communication Details
              </h3>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                Location & Office
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5">
              {/* HouseNo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Apartment No / Street
                </label>
                <input
                  type="text"
                  value={formData.HouseNo}
                  onChange={(e) => handleChange('HouseNo', e.target.value)}
                  placeholder="e.g. Plot No. 24, Phase 1"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Add1 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.Add1}
                  onChange={(e) => handleChange('Add1', e.target.value)}
                  placeholder="Street / Building name"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Add2 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.Add2}
                  onChange={(e) => handleChange('Add2', e.target.value)}
                  placeholder="Landmark / Suite"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Area / Locality
                </label>
                <input
                  type="text"
                  value={formData.Area}
                  onChange={(e) => handleChange('Area', e.target.value)}
                  placeholder="e.g. Electronic City"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5">
              {/* City */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={formData.City}
                  onChange={(e) => handleChange('City', e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* PinCode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.PinCode}
                  onChange={(e) => handleChange('PinCode', e.target.value)}
                  placeholder="e.g. 560100"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={formData.State}
                  onChange={(e) => handleChange('State', e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Country
                </label>
                <select
                  value={formData.Country}
                  onChange={(e) => handleChange('Country', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="Singapore">Singapore</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Germany">Germany</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5 pt-1">
              {/* ContectName */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={formData.ContectName}
                  onChange={(e) => handleChange('ContectName', e.target.value)}
                  placeholder="e.g. Raghavan Iyer"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* MobileNo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.MobileNo}
                    onChange={(e) => handleChange('MobileNo', e.target.value)}
                    placeholder="e.g. 9845012345"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* MailID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.MailID}
                    onChange={(e) => handleChange('MailID', e.target.value)}
                    placeholder="e.g. accounts@supplier.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* WebSite */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="url"
                    value={formData.WebSite}
                    onChange={(e) => handleChange('WebSite', e.target.value)}
                    placeholder="https://company.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Bank Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-amber-600" />
                3. Banking & Settlement Information
              </h3>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100">
                Settlements & Remittance
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
              {/* BankName */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank Name
                </label>
                <select
                  value={formData.BankName}
                  onChange={(e) => handleChange('BankName', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="None">None / Not Applicable</option>
                  {BANK_NAMES.map((bnk) => (
                    <option key={bnk} value={bnk}>
                      {bnk}
                    </option>
                  ))}
                </select>
              </div>

              {/* AccountNo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Number
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.AccountNo}
                    onChange={(e) => handleChange('AccountNo', e.target.value)}
                    placeholder="e.g. 50200012345678"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-medium"
                  />
                </div>
              </div>

              {/* IFSCCode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.IFSCCode}
                  onChange={(e) => handleChange('IFSCCode', e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0000523"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5">
              {/* BranchName */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={formData.BranchName}
                  onChange={(e) => handleChange('BranchName', e.target.value)}
                  placeholder="e.g. Electronic City Branch"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Branch_Addr */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Branch Address
                </label>
                <input
                  type="text"
                  value={formData.Branch_Addr}
                  onChange={(e) => handleChange('Branch_Addr', e.target.value)}
                  placeholder="e.g. Hosur Main Road, Bengaluru"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* SWIFTCode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  SWIFT Code (International)
                </label>
                <input
                  type="text"
                  value={formData.SWIFTCode}
                  onChange={(e) => handleChange('SWIFTCode', e.target.value.toUpperCase())}
                  placeholder="e.g. HDFCINBB"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                />
              </div>

              {/* IBANCode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  IBAN Code
                </label>
                <input
                  type="text"
                  value={formData.IBANCode}
                  onChange={(e) => handleChange('IBANCode', e.target.value.toUpperCase())}
                  placeholder="International Bank A/c No"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Statutory & Tax Registration */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                4. Statutory Registrations & Tax Compliance
              </h3>
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-100">
                Statutory & Tax
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5">
              {/* GSTNo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  GSTIN / VAT Number
                </label>
                <input
                  type="text"
                  value={formData.GSTNo}
                  onChange={(e) => handleChange('GSTNo', e.target.value.toUpperCase())}
                  placeholder="e.g. 29AABCE1234F1Z5"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono font-medium"
                />
              </div>

              {/* PanNo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PAN Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.PanNo}
                  onChange={(e) => handleChange('PanNo', e.target.value.toUpperCase())}
                  placeholder="e.g. AABCE1234F"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                />
              </div>

              {/* TanNo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  TAN Number
                </label>
                <input
                  type="text"
                  value={formData.TanNo}
                  onChange={(e) => handleChange('TanNo', e.target.value.toUpperCase())}
                  placeholder="e.g. BLRE12345F"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                />
              </div>

              {/* CINNo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  CIN Number (Company Reg)
                </label>
                <input
                  type="text"
                  value={formData.CINNo}
                  onChange={(e) => handleChange('CINNo', e.target.value.toUpperCase())}
                  placeholder="e.g. U72200KA2005PTC035123"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5">
              {/* IECode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  IEC (Import / Export Code)
                </label>
                <input
                  type="text"
                  value={formData.IECode}
                  onChange={(e) => handleChange('IECode', e.target.value)}
                  placeholder="e.g. 0705001234"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                />
              </div>

              {/* MSME_Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  MSME Registered
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: '1', label: 'Yes' },
                    { val: '2', label: 'No' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => handleChange('MSME_Status', opt.val)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        formData.MSME_Status === opt.val
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* MSME_No */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  MSME / Udyam Certificate No
                </label>
                <input
                  type="text"
                  value={formData.MSME_No}
                  onChange={(e) => handleChange('MSME_No', e.target.value)}
                  placeholder="e.g. UDYAM-KR-03-0012345"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Section: Opening Balance & Account Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            {isGeneralLedger ? '2. Opening Balance & Status' : '5. Opening Balance & Status'}
          </h3>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
            Financial Balances
          </span>
        </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* OpeningBalance */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Opening Balance Amount (₹)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.OpeningBalance}
                    onChange={(e) => handleChange('OpeningBalance', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* BalanceType */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Debit / Credit (Dr / Cr)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Dr', 'Cr'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleChange('BalanceType', t)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        formData.BalanceType === t
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t === 'Dr' ? 'Debit (Dr)' : 'Credit (Cr)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Status
                </label>
                <select
                  value={formData.Status}
                  onChange={(e) => handleChange('Status', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <button
              type="button"
              onClick={handleBackToList}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-500 active:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {editingLedgerCode ? 'Update Ledger' : 'Save Ledger'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==============================================================
  // VIEW: MAIN LIST VIEW
  // ==============================================================
  return (
    <div className="space-y-6">
      {/* Toast / Success Notification */}
      {successMessage && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* API Error Banner */}
      {fetchError && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Connection Error:</span> {fetchError.message || 'Failed to load ledgers.'}
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

      {/* Header matching Face Attendance Screen */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Ledger Master
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <BookOpen className="h-3 w-3" />
              Chart of Accounts & Suppliers
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Supplier ledgers, settlement bank accounts, statutory tax compliance, and cost center allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh ledgers"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            Refresh
          </button>
          <button
            onClick={() => handleOpenAdd()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-500 active:bg-emerald-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {selectedTypeFilter === 'Customer'
              ? 'Add Customer'
              : selectedTypeFilter === 'Supplier'
              ? 'Add Supplier'
              : selectedTypeFilter === 'General Ledger'
              ? 'Add General Ledger'
              : 'Add New Ledger'}
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Master Ledgers"
          value={`${totalLedgers}`}
          icon={BookOpen}
          color="emerald"
          changeLabel="All ledger entries"
        />

        <StatCard
          title="Customers (Clients)"
          value={`${customerCount}`}
          icon={Building}
          color="blue"
          changeLabel="Sundry Debtors"
        />

        <StatCard
          title="Suppliers (Vendors)"
          value={`${supplierCount}`}
          icon={Layers}
          color="indigo"
          changeLabel="Sundry Creditors"
        />

        <StatCard
          title="General Accounts (GL)"
          value={`${glCount}`}
          icon={DollarSign}
          color="amber"
          changeLabel="Cash, Banks & Nominal"
        />
      </div>

      {/* Type Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
          {[
            { id: 'ALL', label: 'All Ledgers', count: totalLedgers },
            { id: 'Customer', label: 'Customers (Clients)', count: customerCount },
            { id: 'Supplier', label: 'Suppliers (Vendors)', count: supplierCount },
            { id: 'General Ledger', label: 'General Accounts (GL)', count: glCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTypeFilter(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedTypeFilter === tab.id
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {tab.label} <span className="ml-1 text-[11px] opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, supplier / ledger name, group, GSTIN, city..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Table - Styled exactly like Attendance DataTable */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">S.No</th>
                <SortableHeader
                  sortKey="LedgerCode"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  Code
                </SortableHeader>
                <SortableHeader
                  sortKey="LedgerName"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  Supplier / Ledger Name
                </SortableHeader>
                <SortableHeader
                  sortKey="BankName"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  Bank & A/c No
                </SortableHeader>
                <SortableHeader
                  sortKey="GSTNo"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  GSTIN & City
                </SortableHeader>
                <SortableHeader
                  sortKey="AccLedgerHeaderName"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  Header & Group
                </SortableHeader>
                <SortableHeader
                  sortKey="OpeningBalance"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="right"
                  className="py-3.5 px-4 text-right"
                >
                  Opening Balance
                </SortableHeader>
                <SortableHeader
                  sortKey="Status"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="center"
                  className="py-3.5 px-4 text-center"
                >
                  Status
                </SortableHeader>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-emerald-600" />
                    <p className="text-sm font-semibold text-slate-700">Loading ledgers...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-rose-500">
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
              ) : filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">No ledgers or suppliers found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Try adjusting your search criteria or add a new record
                    </p>
                  </td>
                </tr>
              ) : (
                sortedFilteredLedgers.map((ledger, index) => (
                  <tr
                    key={ledger.LedgerCode || ledger.id || index}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">
                      {ledger.LedgerCode}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        <span>{ledger.LedgerName}</span>
                        {ledger.LedgerType === 'Supplier' && (
                          <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded">
                            Supplier
                          </span>
                        )}
                      </div>
                      <span className="block text-[11px] font-normal text-slate-400 truncate">
                        {ledger.ChequePrintName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-medium text-slate-800">{ledger.BankName || '--'}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {ledger.AccountNo ? `A/c: ${ledger.AccountNo}` : '--'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-mono text-slate-700 font-medium">{ledger.GSTNo || '--'}</div>
                      <div className="text-[11px] text-slate-400">
                        {ledger.City ? `${ledger.City}${ledger.State ? `, ${ledger.State}` : ''}` : '--'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          ledger.AccLedgerHeaderName === 'Assets'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : ledger.AccLedgerHeaderName === 'Income'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ledger.AccLedgerHeaderName === 'Expenses'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {ledger.AccLedgerHeaderName || 'General'}
                      </span>
                      <span className="block text-[11px] font-normal text-slate-500 mt-0.5 truncate max-w-[140px]">
                        {ledger.AccGroupName || ledger.AccCateName || '--'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                      ₹{parseFloat(ledger.OpeningBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="ml-1 text-[11px] text-slate-400 font-normal">
                        ({ledger.BalanceType || 'Cr'})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          ledger.Status === 'ACTIVE' || ledger.Status === 'Add' || !ledger.Status
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {ledger.Status === 'ACTIVE' || ledger.Status === 'Add' || !ledger.Status ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-rose-600" />
                        )}
                        {ledger.Status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(ledger)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Edit Ledger & Bank Details"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ledger.id || ledger.LedgerCode)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Ledger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar matching DataTable */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-700">{filteredLedgers.length}</span> entries
          </div>
          <div className="text-slate-400 text-xs font-medium">
            General Ledger Master
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default LedgerMasterPage;
