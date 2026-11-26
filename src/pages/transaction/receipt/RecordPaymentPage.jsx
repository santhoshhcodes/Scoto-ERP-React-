import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Building2,
  Calendar,
  Hash,
  FileText,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Search,
  Wallet,
  RotateCcw,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Copy,
  Package,
} from 'lucide-react';
import {
  useDepositAccounts,
  useOpenDocuments,
  useCreateCustomerReceipt,
} from '../../../api/receiptApi';
import { useCustomerClients, useCustomerDossier } from '../../../api/customerReportApi';

export const RecordPaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL query parameters for pre-filling
  const urlCustomerCode = searchParams.get('customerCode') || '';
  const urlCustomerName = searchParams.get('customerName') || '';
  const urlDocType = searchParams.get('docType') || '';
  const urlDocNo = searchParams.get('docNo') || '';
  const urlAmount = searchParams.get('amount') || '';

  // -------------------------------------------------------------
  // State
  // -------------------------------------------------------------
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Form Fields
  const [receiptType, setReceiptType] = useState('Invoice Settlement');
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [depositGLCode, setDepositGLCode] = useState('');
  const [payMode, setPayMode] = useState('NEFT/RTGS');
  const [refNo, setRefNo] = useState('');
  const [refDate, setRefDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Financials
  const [grossAmount, setGrossAmount] = useState('');
  const [hasTDS, setHasTDS] = useState(false);
  const [tdsSection, setTdsSection] = useState('194J');
  const [tdsPercentage, setTdsPercentage] = useState(10.0);
  const [tdsAmount, setTdsAmount] = useState('0');
  const [remarks, setRemarks] = useState('');

  // Selected document allocation
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [validationModal, setValidationModal] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  // Refs for scrolling to missing fields
  const customerSectionRef = useRef(null);
  const amountSectionRef = useRef(null);
  const customerDropdownRef = useRef(null);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Queries
  const { data: clientsData, isLoading: isLoadingClients } = useCustomerClients(customerSearch);
  const { data: depositAccounts = [] } = useDepositAccounts();

  const clientList = useMemo(() => {
    if (Array.isArray(clientsData)) return clientsData;
    if (Array.isArray(clientsData?.data)) return clientsData.data;
    return [];
  }, [clientsData]);

  const accountList = useMemo(() => {
    if (Array.isArray(depositAccounts)) return depositAccounts;
    if (Array.isArray(depositAccounts?.data)) return depositAccounts.data;
    return [];
  }, [depositAccounts]);

  const customerCode = selectedCustomer?.LedgerCode || selectedCustomer?.code || '';
  const customerName = selectedCustomer?.LedgerName || selectedCustomer?.name || '';

  const { data: openDocs, isLoading: isLoadingDocs } = useOpenDocuments(customerCode, customerName);
  const { data: dossierData } = useCustomerDossier(customerCode, 'ALL');
  const createReceiptMutation = useCreateCustomerReceipt();

  // -------------------------------------------------------------
  // Pre-fill from URL params
  // -------------------------------------------------------------
  useEffect(() => {
    if (urlCustomerCode && !selectedCustomer) {
      setSelectedCustomer({
        LedgerCode: urlCustomerCode,
        LedgerName: urlCustomerName || urlCustomerCode,
      });
      setCustomerSearch(urlCustomerName || urlCustomerCode);
    }
  }, [urlCustomerCode, urlCustomerName, selectedCustomer]);

  // Handle URL document selection once openDocs is loaded
  useEffect(() => {
    if (urlDocNo && openDocs && !selectedDoc) {
      if (urlDocType === 'SALES_INVOICE' || !urlDocType) {
        const found = openDocs?.invoices?.find(
          (inv) => inv.trans_no === urlDocNo || inv.invoice_no === urlDocNo
        );
        if (found) {
          const isPaid = found.payment_status === 'PAID' || (found.balance_due !== undefined && Number(found.balance_due) <= 0.01);
          if (isPaid) {
            setValidationError(`Invoice ${found.trans_no || found.invoice_no} is already fully paid (₹0.00 balance due). It cannot be selected for payment.`);
            return;
          }
          setSelectedDoc(found);
          setReceiptType('Invoice Settlement');
          setGrossAmount(urlAmount || String(found.balance_due > 0 ? found.balance_due : ''));
          setRemarks(`Payment received for invoice ${found.trans_no}`);
        }
      } else if (urlDocType === 'PROFORMA' || urlDocType === 'QUOTATION') {
        const foundPf = openDocs?.proformas?.find((p) => p.trans_no === urlDocNo);
        const foundQ = openDocs?.quotations?.find((q) => q.trans_no === urlDocNo);
        const found = foundPf || foundQ;
        if (found) {
          const isPaid = found.balance_pending !== undefined && Number(found.balance_pending) <= 0.01;
          if (isPaid) {
            setValidationError(`Document ${found.trans_no} is already fully paid (₹0.00 balance due). It cannot be selected for payment.`);
            return;
          }
          setSelectedDoc(found);
          setReceiptType('Advance against Quotation / Proforma');
          setGrossAmount(urlAmount || String(found.balance_pending > 0 ? found.balance_pending : ''));
          setRemarks(`Advance payment for ${found.trans_no}`);
        }
      }
    } else if (urlAmount && !grossAmount && !selectedDoc) {
      setGrossAmount(urlAmount);
    }
  }, [urlDocNo, urlDocType, urlAmount, openDocs, selectedDoc, grossAmount]);

  // Set default deposit account (HSBC preferred)
  useEffect(() => {
    if (accountList.length > 0 && !depositGLCode) {
      const hsbc = accountList.find((a) => a.code === 'GL/00077' || a.name?.includes('HSBC'));
      setDepositGLCode(hsbc ? hsbc.code : accountList[0].code);
    }
  }, [accountList, depositGLCode]);

  // Auto-calculate TDS amount when Gross Amount or TDS % changes
  useEffect(() => {
    const gross = parseFloat(grossAmount) || 0;
    if (hasTDS && gross > 0) {
      const calculatedTds = Math.round((gross * (tdsPercentage / 100)) * 100) / 100;
      setTdsAmount(String(calculatedTds));
    } else {
      setTdsAmount('0');
    }
  }, [grossAmount, hasTDS, tdsPercentage]);

  // Handle TDS Section Change presets
  const handleTdsSectionChange = (section) => {
    setTdsSection(section);
    if (section === '194C') setTdsPercentage(2.0);
    else if (section === '194J') setTdsPercentage(10.0);
    else if (section === '194H') setTdsPercentage(5.0);
    else if (section === '194Q') setTdsPercentage(0.1);
  };

  // Compute Net Amount
  const computedNet = useMemo(() => {
    const gross = parseFloat(grossAmount) || 0;
    const tds = parseFloat(tdsAmount) || 0;
    return Math.max(0, Math.round((gross - tds) * 100) / 100);
  }, [grossAmount, tdsAmount]);

  // Document Selection Handler
  const handleSelectDoc = (doc) => {
    const isPaid = doc.payment_status === 'PAID' ||
      (doc.doc_type === 'SALES_INVOICE' && doc.balance_due !== undefined && Number(doc.balance_due) <= 0.01) ||
      (doc.doc_type !== 'SALES_INVOICE' && doc.balance_pending !== undefined && Number(doc.balance_pending) <= 0.01);

    if (isPaid) {
      setValidationError(`Document ${doc.trans_no || doc.invoice_no} is already fully paid (₹0.00 balance due). It cannot be selected for payment.`);
      return;
    }

    setSelectedDoc(doc);
    setValidationError('');
    setFieldErrors((prev) => ({ ...prev, grossAmount: false }));
    if (doc.doc_type === 'SALES_INVOICE') {
      const due = doc.balance_due !== undefined ? Number(doc.balance_due) : Number(doc.total_amount);
      setGrossAmount(String(due > 0 ? due : ''));
      setRemarks(`Payment received for sales invoice ${doc.trans_no || doc.invoice_no}`);
    } else {
      const pending = doc.balance_pending !== undefined ? Number(doc.balance_pending) : Number(doc.total_amount);
      setGrossAmount(String(pending > 0 ? pending : ''));
      setRemarks(`Advance payment for ${doc.trans_no || doc.doc_type}`);
    }
  };

  // Milestone advance percentage calculation
  const applyAdvancePercentage = (pct) => {
    if (!selectedDoc) return;
    const total = selectedDoc.total_amount || 0;
    const calc = Math.round((total * (pct / 100)) * 100) / 100;
    setGrossAmount(String(calc));
    setRemarks(`${pct}% advance payment for ${selectedDoc.trans_no}`);
    setFieldErrors((prev) => ({ ...prev, grossAmount: false }));
  };

  // -------------------------------------------------------------
  // Validation Checks
  // -------------------------------------------------------------
  useEffect(() => {
    const gross = parseFloat(grossAmount) || 0;
    const tds = parseFloat(tdsAmount) || 0;

    if (selectedDoc) {
      if (selectedDoc.doc_type === 'SALES_INVOICE') {
        const balDue = selectedDoc.balance_due !== undefined ? Number(selectedDoc.balance_due) : Number(selectedDoc.total_amount);
        if (balDue <= 0.01 || selectedDoc.payment_status === 'PAID') {
          setValidationError(
            `Invoice ${selectedDoc.trans_no || selectedDoc.invoice_no} is already fully paid (₹0.00 balance due). Please select an unpaid invoice.`
          );
          return;
        }
        if (gross > 0 && gross > (balDue + 0.05)) {
          setValidationError(
            `Allocated amount (₹${gross.toLocaleString('en-IN')}) exceeds the invoice balance due (₹${balDue.toLocaleString('en-IN')}). Please adjust the amount.`
          );
          return;
        }
      } else if (selectedDoc.doc_type === 'PROFORMA' || selectedDoc.doc_type === 'QUOTATION') {
        const balPending = selectedDoc.balance_pending !== undefined ? Number(selectedDoc.balance_pending) : Number(selectedDoc.total_amount);
        if (balPending <= 0.01) {
          setValidationError(
            `Document ${selectedDoc.trans_no} is already fully paid (₹0.00 balance due).`
          );
          return;
        }
        if (gross > 0 && gross > (balPending + 0.05)) {
          setValidationError(
            `Advance amount (₹${gross.toLocaleString('en-IN')}) exceeds the remaining balance pending (₹${balPending.toLocaleString('en-IN')}).`
          );
          return;
        }
      }
    }

    if (hasTDS && tds > gross) {
      setValidationError('TDS amount cannot exceed Gross Settlement Amount.');
      return;
    }

    setValidationError('');
  }, [grossAmount, tdsAmount, selectedDoc, hasTDS]);

  // -------------------------------------------------------------
  // Submit Form
  // -------------------------------------------------------------
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const errors = [];
    const newFieldErrors = {};

    if (!customerCode || !customerName) {
      errors.push('Customer / Client is required. Please search and select a customer.');
      newFieldErrors.customer = true;
    }

    const gross = parseFloat(grossAmount);
    if (isNaN(gross) || gross <= 0) {
      errors.push('Gross Settlement Amount is required (must be greater than ₹0.00).');
      newFieldErrors.grossAmount = true;
    }

    if (!depositGLCode) {
      errors.push('Deposit Bank Account is required. Please choose an account to deposit.');
      newFieldErrors.depositGL = true;
    }

    if (!receiptDate) {
      errors.push('Payment / Receipt Date is required.');
      newFieldErrors.receiptDate = true;
    }

    if (selectedDoc) {
      const isPaid = selectedDoc.payment_status === 'PAID' ||
        (selectedDoc.doc_type === 'SALES_INVOICE' && selectedDoc.balance_due !== undefined && Number(selectedDoc.balance_due) <= 0.01) ||
        (selectedDoc.doc_type !== 'SALES_INVOICE' && selectedDoc.balance_pending !== undefined && Number(selectedDoc.balance_pending) <= 0.01);
      if (isPaid) {
        errors.push(`Document ${selectedDoc.trans_no || selectedDoc.invoice_no} is already fully paid. Duplicate receipts are not allowed.`);
        newFieldErrors.grossAmount = true;
      } else {
        const balDue = selectedDoc.doc_type === 'SALES_INVOICE'
          ? (selectedDoc.balance_due !== undefined ? Number(selectedDoc.balance_due) : Number(selectedDoc.total_amount))
          : (selectedDoc.balance_pending !== undefined ? Number(selectedDoc.balance_pending) : Number(selectedDoc.total_amount));
        if (gross > (balDue + 0.05)) {
          errors.push(`Gross settlement amount (₹${gross.toLocaleString('en-IN')}) cannot exceed the balance due (₹${balDue.toLocaleString('en-IN')}).`);
          newFieldErrors.grossAmount = true;
        }
      }
    }

    if (validationError) {
      errors.push(validationError);
    }

    if (errors.length > 0) {
      setFieldErrors(newFieldErrors);
      setValidationModal(errors);
      if (newFieldErrors.customer && customerSectionRef.current) {
        customerSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (newFieldErrors.grossAmount && amountSectionRef.current) {
        amountSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    // Clear errors
    setFieldErrors({});
    setValidationModal(null);

    const selectedAcc = accountList.find((a) => a.code === depositGLCode);
    const tds = parseFloat(tdsAmount) || 0;

    // Prepare allocations
    const allocations = [];
    if (selectedDoc) {
      const taxableAmt = Number(selectedDoc.taxable_amount || 0);
      const gstPct = Number(selectedDoc.gst_percentage || 0);
      const cgstAmt = Number(selectedDoc.cgst_amount || 0);
      const sgstAmt = Number(selectedDoc.sgst_amount || 0);
      const igstAmt = Number(selectedDoc.igst_amount || 0);
      const totGstAmt = Number(selectedDoc.total_gst_amount || (cgstAmt + sgstAmt + igstAmt));

      allocations.push({
        DocType: selectedDoc.doc_type || (receiptType.includes('Advance') ? 'PROFORMA' : 'SALES_INVOICE'),
        DocNo: selectedDoc.trans_no || selectedDoc.invoice_no || selectedDoc.doc_no,
        DocDate: selectedDoc.invoice_date || selectedDoc.doc_date || '',
        SecondaryDocNo: selectedDoc.invoice_no || selectedDoc.quotation_no || '',
        TotalDocAmount: selectedDoc.total_amount || gross,
        AlreadyPaid: selectedDoc.already_paid || 0,
        AllocatedAmount: gross,
        TDSPercentage: hasTDS ? tdsPercentage : 0,
        TDSAmount: tds,
        LineTotal: computedNet,
        Remarks: remarks,
        // Detailed Item and GST breakdown fields
        ItemDescription: selectedDoc.product_desc || selectedDoc.product || '',
        TaxableAmount: taxableAmt,
        GSTPercentage: gstPct,
        CGSTPercentage: cgstAmt > 0 ? (gstPct ? gstPct / 2 : 9) : 0,
        CGSTAmount: cgstAmt,
        SGSTPercentage: sgstAmt > 0 ? (gstPct ? gstPct / 2 : 9) : 0,
        SGSTAmount: sgstAmt,
        IGSTPercentage: igstAmt > 0 ? (gstPct || 18) : 0,
        IGSTAmount: igstAmt,
        TotalGSTAmount: totGstAmt,
      });
    }

    const payload = {
      CCode: 'SCT',
      LCode: 'UNIT I',
      ReceiptDate: receiptDate,
      ReceiptType: receiptType,
      CustomerCode: customerCode,
      CustomerName: customerName,
      DepositGLCode: depositGLCode,
      DepositAccountName: selectedAcc ? selectedAcc.name : '',
      BankName: selectedAcc ? selectedAcc.bank_name : 'Bank',
      AccountNo: selectedAcc ? selectedAcc.account_no : '',
      PayMode: payMode,
      RefNo: refNo.trim(),
      RefDate: refDate,
      GrossAmount: gross,
      TDSAmount: tds,
      TDSPercentage: hasTDS ? tdsPercentage : 0,
      TDSSection: hasTDS ? tdsSection : 'None',
      TotGSTAmt: selectedDoc ? Number(selectedDoc.total_gst_amount || 0) : 0,
      NetAmount: computedNet,
      Remarks: remarks.trim() || `Customer receipt from ${customerName}`,
      Allocations: allocations,
    };

    try {
      const res = await createReceiptMutation.mutateAsync(payload);
      if (res && res.success) {
        setSubmitSuccess(res);
      }
    } catch (err) {
      console.error('Failed to create receipt:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to record customer receipt';
      setValidationModal([detail]);
    }
  };

  // Reset Form
  const handleReset = () => {
    setSelectedDoc(null);
    setGrossAmount('');
    setHasTDS(false);
    setTdsAmount('0');
    setRefNo('');
    setRemarks('');
    setValidationError('');
    setFieldErrors({});
    setValidationModal(null);
    setSubmitSuccess(null);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>Transaction</span>
              <span>/</span>
              <span
                onClick={() => navigate('/transaction/receipts')}
                className="hover:text-emerald-600 cursor-pointer"
              >
                Customer Receipts
              </span>
              <span>/</span>
              <span className="text-emerald-600 font-bold">Record Payment</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Record Customer Payment / Advance
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/transaction/receipts')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors"
          >
            View Receipts Register
          </button>
          {customerCode && (
            <button
              type="button"
              onClick={() =>
                navigate(`/transaction/customer-report?customerCode=${customerCode}&customerName=${encodeURIComponent(customerName)}`)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl transition-colors"
            >
              <span>Customer 360 Report</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. SUCCESS CONFIRMATION MODAL POPUP DIALOG               */}
      {/* ======================================================== */}
      {submitSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => {
                  setSubmitSuccess(null);
                  handleReset();
                }}
                className="absolute right-4 top-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center mb-3 border border-white/30 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-white animate-bounce-short" />
              </div>

              <h2 className="text-xl font-black tracking-tight">Payment Recorded Successfully!</h2>
              <p className="text-xs text-emerald-100 mt-1 max-w-sm mx-auto">
                Customer receipt voucher posted into accounting ledger & live customer report.
              </p>
            </div>

            {/* Body Details */}
            <div className="p-6 space-y-4">
              {/* Voucher Tag Card */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Voucher Number</div>
                  <div className="text-base font-black font-mono text-emerald-800">{submitSuccess.trans_no}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(submitSuccess.trans_no);
                      setCopiedVoucher(true);
                      setTimeout(() => setCopiedVoucher(false), 2000);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedVoucher ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedVoucher ? 'Copied!' : 'Copy No'}</span>
                </button>
              </div>

              {/* Transaction Summary Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer</span>
                  <span className="font-bold text-slate-900 mt-0.5 block truncate">{submitSuccess.customer_name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">Code: {submitSuccess.customer_code}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Bank Deposit</span>
                  <span className="font-bold text-slate-900 mt-0.5 block truncate">{submitSuccess.bank_name || 'Bank Account'}</span>
                  <span className="text-[10px] text-slate-500 font-mono">Mode: {submitSuccess.pay_mode || 'NEFT'}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross Amount</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                    ₹{(submitSuccess.gross_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500">Customer ledger credit</span>
                </div>

                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Net Bank Deposit</span>
                  <span className="text-sm font-black text-emerald-800 mt-0.5 block">
                    ₹{(submitSuccess.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-emerald-600">
                    {submitSuccess.tds_amount > 0 ? `(TDS Withheld: ₹${submitSuccess.tds_amount})` : 'Full Bank Credit'}
                  </span>
                </div>
              </div>

              {/* Database Verification Status */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-1">
                  Database Status & Row Inserts:
                </div>
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>dbo.Acc_Receipts_Main — Header Row Recorded</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>dbo.Acc_Receipts_Sub — Allocation Line Items Linked</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>dbo.Acc_Trans_All — Double-Entry Posted (Bank Dr / Customer Cr)</span>
                </div>
              </div>
            </div>

            {/* Footer Navigation Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSubmitSuccess(null);
                  handleReset();
                }}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                + Record Another
              </button>
              <button
                type="button"
                onClick={() => navigate('/transaction/receipts')}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Receipts Register
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(`/transaction/customer-report?customerCode=${submitSuccess.customer_code}&customerName=${encodeURIComponent(submitSuccess.customer_name)}`)
                }
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>View Customer Report</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. FIELD VALIDATION ALERT MODAL POPUP                    */}
      {/* ======================================================== */}
      {validationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold">Please Fill Required Fields</h3>
                <p className="text-xs text-rose-100">The following information is required before saving:</p>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <ul className="space-y-2">
                {validationModal.map((err, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-rose-800 bg-rose-50/80 p-2.5 rounded-xl border border-rose-200">
                    <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                      ✕
                    </span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setValidationModal(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Got it, I&apos;ll fill them
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FORM CONTENT                                             */}
      {/* ======================================================== */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Customer Selection */}
        <div
          ref={customerSectionRef}
          className={`bg-white rounded-2xl p-6 border shadow-xs space-y-4 transition-all ${fieldErrors.customer ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200'
            }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${fieldErrors.customer ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                1
              </span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Select Customer / Client <span className="text-rose-500">*</span>
              </h2>
            </div>
          </div>

          {fieldErrors.customer && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Please select a customer from the search dropdown below before recording payment.</span>
            </div>
          )}

          {selectedCustomer ? (
            <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 shadow-2xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{customerName}</h3>
                    {(selectedCustomer?.CustomerUnit || dossierData?.customer_info?.CustomerUnit) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                        {selectedCustomer?.CustomerUnit || dossierData?.customer_info?.CustomerUnit}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>
                      Ledger Code: <strong className="font-mono text-slate-700">{customerCode}</strong>
                    </span>
                    {dossierData?.customer_info?.City && (
                      <>
                        <span>•</span>
                        <span>{dossierData.customer_info.City}</span>
                      </>
                    )}
                    {dossierData?.customer_info?.GSTNo && (
                      <>
                        <span>•</span>
                        <span>GSTIN: {dossierData.customer_info.GSTNo}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSelectedDoc(null);
                  setCustomerSearch('');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Change Customer
              </button>
            </div>
          ) : (
            <div ref={customerDropdownRef} className="relative max-w-xl">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type customer name or ledger code to search..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setIsCustomerDropdownOpen(true);
                    setFieldErrors((prev) => ({ ...prev, customer: false }));
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  className={`w-full pl-10 pr-4 py-2.5 bg-white text-sm rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 ${fieldErrors.customer ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-300'
                    }`}
                />
              </div>

              {isCustomerDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-20 max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 py-1">
                  {isLoadingClients ? (
                    <div className="p-3 text-xs text-slate-500 text-center">Loading customers...</div>
                  ) : clientList && clientList.length > 0 ? (
                    clientList.map((client) => (
                      <button
                        key={client.LedgerCode || client.code}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(client);
                          setIsCustomerDropdownOpen(false);
                          setCustomerSearch(client.LedgerName || client.name);
                          setFieldErrors((prev) => ({ ...prev, customer: false }));
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-emerald-50/80 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 group-hover:text-emerald-900">
                              {client.LedgerName || client.name}
                            </span>
                            {client.CustomerUnit && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                {client.CustomerUnit}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="font-mono">({client.LedgerCode || client.code})</span>
                            {client.City && <span>• {client.City}</span>}
                            {client.GSTNo && <span>• GST: {client.GSTNo}</span>}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      No customers found matching &quot;{customerSearch}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Receipt Type & Allocation */}
        {customerCode && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Receipt Category & Document Allocation
                </h2>
              </div>

              {selectedDoc && (
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Selected Document</span>
                </button>
              )}
            </div>

            {/* Receipt Type Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'Invoice Settlement',
                  label: 'Payment against Sales Invoice',
                  desc: 'Settle billed orders with direct invoice matching',
                  badge: `${openDocs?.invoices?.length || 0} Open Invoices`,
                },
                {
                  id: 'Advance against Quotation / Proforma',
                  label: 'Quotation / Proforma Advance',
                  desc: 'Pre-dispatch milestone advance payment',
                  badge: `${(openDocs?.proformas?.length || 0) + (openDocs?.quotations?.length || 0)} Quotes/PI`,
                },
                {
                  id: 'On Account',
                  label: 'On-Account / General Advance',
                  desc: 'Lump sum receipt without specific document link',
                  badge: 'FIFO Auto-Clear',
                },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    setReceiptType(type.id);
                    setSelectedDoc(null);
                    setValidationError('');
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${receiptType === type.id
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{type.label}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${receiptType === type.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                      {type.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{type.desc}</p>
                </button>
              ))}
            </div>

            {/* Document Picker Tables */}
            {isLoadingDocs ? (
              <div className="p-6 text-xs text-center text-slate-500 bg-slate-50 rounded-xl">
                Loading open invoices and advance milestones...
              </div>
            ) : (
              <>
                {/* Case 1: Open Sales Invoices */}
                {receiptType === 'Invoice Settlement' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Select Sales Invoice to Settle:</span>
                      <span className="text-slate-500">
                        {openDocs?.invoices?.length || 0} open invoice(s)
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3 w-10 text-center">Select</th>
                            <th className="p-3">Invoice No</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Order / PI Ref</th>
                            <th className="p-3 text-right">Total (₹)</th>
                            <th className="p-3 text-right">Paid (₹)</th>
                            <th className="p-3 text-right">Balance Due (₹)</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {openDocs?.invoices && openDocs.invoices.length > 0 ? (
                            openDocs.invoices.map((inv) => {
                              const isPaid = inv.payment_status === 'PAID' || (inv.balance_due !== undefined && Number(inv.balance_due) <= 0.01);
                              const isSelected =
                                !isPaid &&
                                selectedDoc &&
                                (selectedDoc.trans_no === inv.trans_no || selectedDoc.invoice_no === inv.invoice_no);
                              return (
                                <tr
                                  key={inv.trans_no || inv.invoice_no}
                                  onClick={() => !isPaid && handleSelectDoc(inv)}
                                  className={`transition-colors ${
                                    isPaid
                                      ? 'opacity-60 bg-slate-50 cursor-not-allowed select-none'
                                      : isSelected
                                      ? 'bg-emerald-50 font-medium cursor-pointer'
                                      : 'hover:bg-emerald-50/50 cursor-pointer'
                                  }`}
                                  title={isPaid ? 'This invoice is already fully paid' : ''}
                                >
                                  <td className="p-3 text-center">
                                    <input
                                      type="radio"
                                      name="selected_invoice"
                                      disabled={isPaid}
                                      checked={Boolean(isSelected)}
                                      onChange={() => !isPaid && handleSelectDoc(inv)}
                                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                  </td>
                                  <td className="p-3 font-bold text-slate-900">{inv.trans_no}</td>
                                  <td className="p-3 text-slate-500">{inv.invoice_date || 'N/A'}</td>
                                  <td className="p-3 text-slate-600 font-mono text-[11px]">
                                    {inv.invoice_no && inv.invoice_no !== inv.trans_no ? inv.invoice_no : '-'}
                                  </td>
                                  <td className="p-3 text-right font-medium text-slate-700">
                                    ₹{inv.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-right font-medium text-emerald-600">
                                    ₹{inv.already_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-right font-extrabold text-rose-600">
                                    ₹{inv.balance_due?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isPaid || inv.payment_status === 'PAID'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : inv.payment_status === 'PARTIAL'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {isPaid ? 'PAID' : inv.payment_status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={8} className="p-6 text-center text-slate-400">
                                No open unpaid sales invoices found for this customer.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Selected Invoice Details & GST Breakdown */}
                    {selectedDoc && selectedDoc.doc_type === 'SALES_INVOICE' && (
                      <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-xl border border-emerald-200/80 shadow-xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                              <FileText className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <span>Selected Invoice:</span>
                                <span className="text-emerald-700 font-mono font-extrabold">{selectedDoc.trans_no || selectedDoc.invoice_no}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                                  Sales Invoice
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Date: {selectedDoc.invoice_date || 'N/A'} {selectedDoc.invoice_no && selectedDoc.invoice_no !== selectedDoc.trans_no ? `| Ref: ${selectedDoc.invoice_no}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Balance Due</span>
                            <span className="text-sm font-extrabold text-rose-600 font-mono">
                              ₹{(selectedDoc.balance_due !== undefined ? selectedDoc.balance_due : selectedDoc.total_amount)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Product / Service Description & Items */}
                        <div className="bg-white/90 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                            <span>Product / Service Description</span>
                            <span>Item Breakdown</span>
                          </div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{selectedDoc.product_desc || 'Standard Invoice Services'}</span>
                          </div>
                          {Array.isArray(selectedDoc.items) && selectedDoc.items.length > 0 && (
                            <div className="pt-1 mt-1 border-t border-slate-100 space-y-1">
                              {selectedDoc.items.map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                                  <span className="truncate max-w-md">{it.ProductType || it.ItemCode} (HSN: {it.HSNCode || '-'})</span>
                                  <span>Qty: {it.Qty} × ₹{it.Rate} = ₹{(it.ItemValue || (it.Qty * it.Rate))?.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* GST Breakdown (Separate CGST, SGST, IGST) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Taxable Value</span>
                            <span className="font-bold text-slate-800 font-mono">
                              ₹{(selectedDoc.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">GST Rate</span>
                            <span className="font-bold text-indigo-700 font-mono">
                              {selectedDoc.gst_percentage || 18}%
                            </span>
                          </div>
                          {(selectedDoc.cgst_amount > 0 || (selectedDoc.igst_amount === 0 && selectedDoc.total_gst_amount > 0)) && (
                            <>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">CGST ({((selectedDoc.gst_percentage || 18) / 2)}%)</span>
                                <span className="font-bold text-slate-700 font-mono">
                                  ₹{(selectedDoc.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">SGST ({((selectedDoc.gst_percentage || 18) / 2)}%)</span>
                                <span className="font-bold text-slate-700 font-mono">
                                  ₹{(selectedDoc.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </>
                          )}
                          {selectedDoc.igst_amount > 0 && (
                            <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200 col-span-2">
                              <span className="text-[10px] uppercase font-bold text-purple-700 block">IGST ({selectedDoc.gst_percentage || 18}%)</span>
                              <span className="font-bold text-purple-900 font-mono">
                                ₹{(selectedDoc.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total GST</span>
                            <span className="font-extrabold text-emerald-700 font-mono">
                              ₹{(selectedDoc.total_gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-300">
                            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Invoice Net Total</span>
                            <span className="font-extrabold text-emerald-900 font-mono">
                              ₹{(selectedDoc.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Quick Settlement Action Pills */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-xs font-semibold text-slate-600">Quick Settle:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const bal = selectedDoc.balance_due !== undefined ? selectedDoc.balance_due : selectedDoc.total_amount;
                              setGrossAmount(String(bal > 0 ? bal : selectedDoc.total_amount));
                              setRemarks(`Full payment settlement for invoice ${selectedDoc.trans_no}`);
                              setFieldErrors((prev) => ({ ...prev, grossAmount: false }));
                            }}
                            className="px-2.5 py-1 text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            Full Balance (₹{(selectedDoc.balance_due !== undefined ? selectedDoc.balance_due : selectedDoc.total_amount)?.toLocaleString('en-IN')})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const bal = selectedDoc.balance_due !== undefined ? selectedDoc.balance_due : selectedDoc.total_amount;
                              const half = Math.round(((bal > 0 ? bal : selectedDoc.total_amount) / 2) * 100) / 100;
                              setGrossAmount(String(half));
                              setRemarks(`50% partial payment for invoice ${selectedDoc.trans_no}`);
                              setFieldErrors((prev) => ({ ...prev, grossAmount: false }));
                            }}
                            className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            50% Balance
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Case 2: Open Quotations & Proformas */}
                {receiptType === 'Advance against Quotation / Proforma' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Select Quotation or Proforma:</span>
                      <span className="text-slate-500">
                        {(openDocs?.proformas?.length || 0) + (openDocs?.quotations?.length || 0)} document(s)
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3 w-10 text-center">Select</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Doc No</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Reference</th>
                            <th className="p-3 text-right">Order Value (₹)</th>
                            <th className="p-3 text-right">Advance Received (₹)</th>
                            <th className="p-3 text-right">Balance Pending (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {openDocs?.proformas?.map((pf) => {
                            const isSelected = selectedDoc && selectedDoc.trans_no === pf.trans_no;
                            return (
                              <tr
                                key={pf.trans_no}
                                onClick={() => handleSelectDoc(pf)}
                                className={`hover:bg-emerald-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50 font-medium' : ''
                                  }`}
                              >
                                <td className="p-3 text-center">
                                  <input
                                    type="radio"
                                    name="selected_advance_doc"
                                    checked={Boolean(isSelected)}
                                    onChange={() => handleSelectDoc(pf)}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                    Proforma
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-slate-900">{pf.trans_no}</td>
                                <td className="p-3 text-slate-500">{pf.doc_date || 'N/A'}</td>
                                <td className="p-3 text-slate-600 font-mono text-[11px]">{pf.quotation_no || '-'}</td>
                                <td className="p-3 text-right font-medium text-slate-700">
                                  ₹{pf.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-medium text-emerald-600">
                                  ₹{pf.already_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-extrabold text-amber-600">
                                  ₹{pf.balance_pending?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}

                          {openDocs?.quotations?.map((q) => {
                            const isSelected = selectedDoc && selectedDoc.trans_no === q.trans_no;
                            return (
                              <tr
                                key={q.trans_no}
                                onClick={() => handleSelectDoc(q)}
                                className={`hover:bg-emerald-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50 font-medium' : ''
                                  }`}
                              >
                                <td className="p-3 text-center">
                                  <input
                                    type="radio"
                                    name="selected_advance_doc"
                                    checked={Boolean(isSelected)}
                                    onChange={() => handleSelectDoc(q)}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Quotation
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-slate-900">{q.trans_no}</td>
                                <td className="p-3 text-slate-500">{q.doc_date || 'N/A'}</td>
                                <td className="p-3 text-slate-600 text-[11px] truncate max-w-xs">{q.product || '-'}</td>
                                <td className="p-3 text-right font-medium text-slate-700">
                                  ₹{q.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-medium text-emerald-600">
                                  ₹{q.already_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-extrabold text-amber-600">
                                  ₹{q.balance_pending?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Selected Quotation/Proforma Details & GST Breakdown */}
                    {selectedDoc && (selectedDoc.doc_type === 'PROFORMA' || selectedDoc.doc_type === 'QUOTATION') && (
                      <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-xl border border-indigo-200/80 shadow-xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
                              <FileText className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <span>Selected Document:</span>
                                <span className="text-indigo-700 font-mono font-extrabold">{selectedDoc.trans_no}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-medium">
                                  {selectedDoc.doc_type === 'PROFORMA' ? 'Proforma Invoice' : 'Quotation'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Date: {selectedDoc.invoice_date || selectedDoc.doc_date || 'N/A'} {selectedDoc.quotation_no ? `| Ref: ${selectedDoc.quotation_no}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Balance Pending</span>
                            <span className="text-sm font-extrabold text-amber-600 font-mono">
                              ₹{(selectedDoc.balance_pending !== undefined ? selectedDoc.balance_pending : selectedDoc.total_amount)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Product / Service Description & Items */}
                        <div className="bg-white/90 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                            <span>Service / Order Scope</span>
                            <span>Item Breakdown</span>
                          </div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>{selectedDoc.product_desc || selectedDoc.product || 'Scope of Services'}</span>
                          </div>
                          {Array.isArray(selectedDoc.items) && selectedDoc.items.length > 0 && (
                            <div className="pt-1 mt-1 border-t border-slate-100 space-y-1">
                              {selectedDoc.items.map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                                  <span className="truncate max-w-md">{it.ProductType || it.ItemCode} (HSN: {it.HSNCode || '-'})</span>
                                  <span>Qty: {it.Qty} × ₹{it.Rate} = ₹{(it.ItemValue || (it.Qty * it.Rate))?.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* GST Breakdown (Separate CGST, SGST, IGST) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Taxable Value</span>
                            <span className="font-bold text-slate-800 font-mono">
                              ₹{(selectedDoc.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">GST Rate</span>
                            <span className="font-bold text-indigo-700 font-mono">
                              {selectedDoc.gst_percentage || 18}%
                            </span>
                          </div>
                          {(selectedDoc.cgst_amount > 0 || (selectedDoc.igst_amount === 0 && selectedDoc.total_gst_amount > 0)) && (
                            <>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">CGST ({((selectedDoc.gst_percentage || 18) / 2)}%)</span>
                                <span className="font-bold text-slate-700 font-mono">
                                  ₹{(selectedDoc.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">SGST ({((selectedDoc.gst_percentage || 18) / 2)}%)</span>
                                <span className="font-bold text-slate-700 font-mono">
                                  ₹{(selectedDoc.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </>
                          )}
                          {selectedDoc.igst_amount > 0 && (
                            <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200 col-span-2">
                              <span className="text-[10px] uppercase font-bold text-purple-700 block">IGST ({selectedDoc.gst_percentage || 18}%)</span>
                              <span className="font-bold text-purple-900 font-mono">
                                ₹{(selectedDoc.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total GST</span>
                            <span className="font-extrabold text-indigo-700 font-mono">
                              ₹{(selectedDoc.total_gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
                            <span className="text-[10px] uppercase font-bold text-indigo-900 block">Order Total</span>
                            <span className="font-extrabold text-indigo-950 font-mono">
                              ₹{(selectedDoc.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Milestone Percentage Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <span className="text-xs font-bold text-slate-700">Milestone Advance %:</span>
                          {[20, 30, 50, 100].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => applyAdvancePercentage(pct)}
                              className="px-3 py-1.5 text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              {pct}% Advance (₹{Math.round((selectedDoc.total_amount * (pct / 100))).toLocaleString('en-IN')})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Case 3: On Account Notice */}
                {receiptType === 'On Account' && (
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                    <div className="font-bold">On-Account Lump Sum Settlement</div>
                    <p className="text-indigo-800">
                      This receipt will credit the customer&apos;s ledger directly. Scoto ERP&apos;s FIFO reconciliation engine will automatically apply this credit against the customer&apos;s oldest outstanding invoices in reports and statements.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Bank & Payment Mode */}
        {customerCode && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Deposit Account & Transaction Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Deposit Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Deposit To Account <span className="text-rose-500">*</span>
                </label>
                <select
                  value={depositGLCode}
                  onChange={(e) => {
                    setDepositGLCode(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, depositGL: false }));
                  }}
                  className={`w-full px-3 py-2.5 bg-white text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800 ${fieldErrors.depositGL ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-300'
                    }`}
                >
                  {accountList.map((acc) => (
                    <option key={acc.code} value={acc.code}>
                      {acc.name} ({acc.bank_name})
                    </option>
                  ))}
                </select>
                {fieldErrors.depositGL && (
                  <span className="text-[10px] font-bold text-rose-600 mt-1 block">Please select an account</span>
                )}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Mode <span className="text-rose-500">*</span>
                </label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                >
                  <option value="NEFT/RTGS">NEFT / RTGS (Bank Transfer)</option>
                  <option value="IMPS/UPI">IMPS / UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="OnLine">Online Gateway</option>
                </select>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment / Receipt Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => {
                    setReceiptDate(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, receiptDate: false }));
                  }}
                  className={`w-full px-3 py-2.5 bg-white text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 ${fieldErrors.receiptDate ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-300'
                    }`}
                />
                {fieldErrors.receiptDate && (
                  <span className="text-[10px] font-bold text-rose-600 mt-1 block">Date is required</span>
                )}
              </div>

              {/* UTR / Cheque Ref No */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  UTR / Cheque / Ref Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-98471928, CHQ-10492"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800 uppercase"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Financial Amounts & TDS Withholding */}
        {customerCode && (
          <div
            ref={amountSectionRef}
            className={`bg-white rounded-2xl p-6 border shadow-xs space-y-5 transition-all ${fieldErrors.grossAmount ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200'
              }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${fieldErrors.grossAmount ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                4
              </span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Financial Settlement & Tax Deductions (TDS) <span className="text-rose-500">*</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Input Amounts */}
              <div className="space-y-4">
                {/* Gross Amount Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Gross Settlement Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={grossAmount}
                      onChange={(e) => {
                        setGrossAmount(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, grossAmount: false }));
                      }}
                      className={`w-full pl-9 pr-4 py-2.5 bg-white text-base font-bold text-slate-900 rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${fieldErrors.grossAmount ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-300'
                        }`}
                    />
                  </div>
                  {fieldErrors.grossAmount ? (
                    <span className="text-[11px] font-bold text-rose-600 mt-1 block">
                      ⚠️ Please enter a valid gross settlement amount greater than ₹0.00
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Total customer ledger credit (Invoice settlement or advance amount)
                    </span>
                  )}
                </div>

                {/* TDS Withholding Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasTDS}
                      onChange={(e) => setHasTDS(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Customer deducted TDS on this payment?
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500 mt-0.5 pl-6 block">
                    Tax withheld by customer under IT Act (Section 194C, 194J, etc.) to claim in Form 26AS
                  </span>
                </div>

                {/* TDS Details (if enabled) */}
                {hasTDS && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">TDS Section</label>
                      <select
                        value={tdsSection}
                        onChange={(e) => handleTdsSectionChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white text-xs rounded-lg border border-amber-300 text-slate-800 font-medium"
                      >
                        <option value="194C">194C - Contracts (2%)</option>
                        <option value="194J">194J - Tech/Prof (10%)</option>
                        <option value="194H">194H - Brokerage (5%)</option>
                        <option value="194Q">194Q - Purchase (0.1%)</option>
                        <option value="Custom">Custom TDS Rate</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">TDS Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tdsPercentage}
                        onChange={(e) => setTdsPercentage(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white text-xs rounded-lg border border-amber-300 text-slate-800 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">TDS Deducted (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tdsAmount}
                        onChange={(e) => setTdsAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white text-xs rounded-lg border border-amber-300 text-amber-900 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Visual Settlement Card */}
              <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Accounting Balance Breakdown
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                      <span className="text-slate-600">Gross Settlement Amount:</span>
                      <span className="font-bold text-slate-900">
                        ₹{(parseFloat(grossAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                      <span className="text-amber-700">Less: TDS Deducted (Form 26AS):</span>
                      <span className="font-bold text-amber-700">
                        - ₹{(parseFloat(tdsAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div>
                        <div className="text-sm font-extrabold text-emerald-900">
                          Net Bank / Cash Received
                        </div>
                        <div className="text-[11px] text-slate-400">Actual amount credited to company bank</div>
                      </div>
                      <div className="text-xl font-black text-emerald-700">
                        ₹{computedNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Message */}
                {validationError ? (
                  <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{validationError}</span>
                  </div>
                ) : (
                  <div className="mt-4 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Arithmetic validation verified (Gross = Net + TDS)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Narration */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Remarks / Transaction Narration
              </label>
              <input
                type="text"
                placeholder="e.g. Settlement against Invoice SINV/25-26/00231 via HSBC NEFT"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Reset Form
            </button>
          </div>

          <button
            type="submit"
            disabled={createReceiptMutation.isPending}
            className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {createReceiptMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Posting Double-Entry Voucher...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Record Payment</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecordPaymentPage;
