import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  HelpCircle,
  ArrowRight,
  ChevronDown,
  Search,
  Wallet,
  Package,
} from 'lucide-react';
import {
  useDepositAccounts,
  useOpenDocuments,
  useCreateCustomerReceipt,
} from '../../../api/receiptApi';
import { useCustomerClients } from '../../../api/customerReportApi';

export const RecordReceiptModal = ({
  isOpen,
  onClose,
  initialCustomer = null,
  initialDocument = null,
  onSuccess,
}) => {
  // -------------------------------------------------------------
  // State
  // -------------------------------------------------------------
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
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
  const createReceiptMutation = useCreateCustomerReceipt();

  // -------------------------------------------------------------
  // Initialize from props
  // -------------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      if (initialCustomer) {
        setSelectedCustomer(initialCustomer);
        setCustomerSearch(initialCustomer.LedgerName || initialCustomer.name || '');
      } else {
        setSelectedCustomer(null);
        setCustomerSearch('');
      }

      if (initialDocument) {
        setSelectedDoc(initialDocument);
        if (initialDocument.doc_type === 'SALES_INVOICE') {
          setReceiptType('Invoice Settlement');
          setGrossAmount(String(initialDocument.balance_due || initialDocument.total_amount || ''));
        } else if (initialDocument.doc_type === 'PROFORMA' || initialDocument.doc_type === 'QUOTATION') {
          setReceiptType('Advance against Quotation / Proforma');
          setGrossAmount(String(initialDocument.balance_pending || initialDocument.total_amount || ''));
        }
      } else {
        setSelectedDoc(null);
        setGrossAmount('');
      }

      setHasTDS(false);
      setTdsSection('194J');
      setTdsPercentage(10.0);
      setTdsAmount('0');
      setRefNo('');
      setRemarks('');
    }
  }, [isOpen, initialCustomer, initialDocument]);

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

  // Handle Document Selection
  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc);
    if (doc.doc_type === 'SALES_INVOICE') {
      const due = doc.balance_due !== undefined ? doc.balance_due : doc.total_amount;
      setGrossAmount(String(due > 0 ? due : doc.total_amount));
      setRemarks(`Payment received for invoice ${doc.trans_no || doc.invoice_no}`);
    } else {
      const pending = doc.balance_pending !== undefined ? doc.balance_pending : doc.total_amount;
      setGrossAmount(String(pending > 0 ? pending : doc.total_amount));
      setRemarks(`Advance payment for ${doc.trans_no || doc.doc_type}`);
    }
  };

  // -------------------------------------------------------------
  // Submit Form
  // -------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerCode || !customerName) {
      alert('Please select a customer first.');
      return;
    }

    const gross = parseFloat(grossAmount);
    if (isNaN(gross) || gross <= 0) {
      alert('Please enter a valid Gross Settlement Amount greater than 0.');
      return;
    }

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
        if (onSuccess) onSuccess(res);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create receipt:', err);
      alert(err.response?.data?.detail || err.message || 'Failed to record customer receipt');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl overflow-hidden text-left transition-all transform bg-white rounded-2xl shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <CreditCard className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Record Customer Payment / Advance</h2>
              <p className="text-xs text-emerald-100/90 font-medium">
                Record receipts against Invoices, Quotations, or Proformas with instant ledger & customer report sync
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

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Customer Selection */}
          <div className="bg-slate-50/80 rounded-xl p-4.5 border border-slate-200/80 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Customer / Client <span className="text-rose-500">*</span>
            </label>

            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-300 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{customerName}</div>
                    <div className="text-xs text-slate-500">
                      Code: <span className="font-mono font-medium">{customerCode}</span>
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
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                >
                  Change Customer
                </button>
              </div>
            ) : (
              <div ref={customerDropdownRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer name or ledger code..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                {isCustomerDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-20 max-h-56 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 py-1">
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
                          }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-emerald-50/80 transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 group-hover:text-emerald-900">
                              {client.LedgerName || client.name}
                            </span>
                            <span className="ml-2 text-[11px] font-mono text-slate-400">
                              ({client.LedgerCode || client.code})
                            </span>
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

          {/* Step 2: Receipt Type & Document Allocation */}
          {customerCode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Receipt Type & Allocation
                </label>
                {openDocs?.outstanding_balance > 0 && (
                  <div className="text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
                    Total Due: <span className="font-bold">₹{openDocs.outstanding_balance.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Type Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'Invoice Settlement', label: 'Payment against Sales Invoice', desc: 'Settling delivered orders' },
                  { id: 'Advance against Quotation / Proforma', label: 'Quotation / Proforma Advance', desc: 'Pre-dispatch advance' },
                  { id: 'On Account', label: 'On-Account / General Advance', desc: 'Lump sum settlement' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setReceiptType(type.id);
                      setSelectedDoc(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      receiptType === type.id
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{type.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{type.desc}</div>
                  </button>
                ))}
              </div>

              {/* Document Picker Table */}
              {isLoadingDocs ? (
                <div className="p-4 text-xs text-center text-slate-500 bg-slate-50 rounded-xl">
                  Loading open invoices and advances...
                </div>
              ) : (
                <>
                  {/* Case A: Sales Invoices */}
                  {receiptType === 'Invoice Settlement' && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Select Sales Invoice to Settle:</span>
                        <span className="text-[11px] text-slate-500">
                          {openDocs?.invoices?.length || 0} open invoice(s)
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {openDocs?.invoices && openDocs.invoices.length > 0 ? (
                          openDocs.invoices.map((inv) => {
                            const isSelected =
                              selectedDoc &&
                              (selectedDoc.trans_no === inv.trans_no || selectedDoc.invoice_no === inv.invoice_no);
                            return (
                              <div
                                key={inv.trans_no || inv.invoice_no}
                                onClick={() => handleSelectDoc(inv)}
                                className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                  isSelected ? 'bg-emerald-50/80 font-medium' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">{inv.trans_no}</span>
                                    {inv.invoice_no && inv.invoice_no !== inv.trans_no && (
                                      <span className="text-[11px] text-slate-500">({inv.invoice_no})</span>
                                    )}
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        inv.payment_status === 'PAID'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : inv.payment_status === 'PARTIAL'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {inv.payment_status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">Date: {inv.invoice_date || 'N/A'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-slate-900">
                                    Due: ₹{inv.balance_due?.toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Total: ₹{inv.total_amount?.toLocaleString('en-IN')}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-xs text-center text-slate-500">
                            No open unpaid sales invoices found for this customer.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Case B: Quotations & Proformas */}
                  {receiptType === 'Advance against Quotation / Proforma' && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Select Quotation or Proforma:</span>
                        <span className="text-[11px] text-slate-500">
                          {(openDocs?.proformas?.length || 0) + (openDocs?.quotations?.length || 0)} document(s)
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {openDocs?.proformas?.map((pf) => {
                          const isSelected = selectedDoc && selectedDoc.trans_no === pf.trans_no;
                          return (
                            <div
                              key={pf.trans_no}
                              onClick={() => handleSelectDoc(pf)}
                              className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-emerald-50/80 font-medium' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div>
                                <span className="font-bold text-slate-900">[Proforma] {pf.trans_no}</span>
                                <span className="ml-2 text-[11px] text-slate-400">Date: {pf.doc_date}</span>
                                {pf.quotation_no && (
                                  <div className="text-[11px] text-slate-500">Quote: {pf.quotation_no}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-slate-900">
                                  Order: ₹{pf.total_amount?.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[11px] text-emerald-600">
                                  Recvd: ₹{pf.already_paid?.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {openDocs?.quotations?.map((q) => {
                          const isSelected = selectedDoc && selectedDoc.trans_no === q.trans_no;
                          return (
                            <div
                              key={q.trans_no}
                              onClick={() => handleSelectDoc(q)}
                              className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-emerald-50/80 font-medium' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div>
                                <span className="font-bold text-slate-900">[Quotation] {q.trans_no}</span>
                                <span className="ml-2 text-[11px] text-slate-400">{q.product || 'Quote'}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-slate-900">
                                  Value: ₹{q.total_amount?.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  Pending: ₹{q.balance_pending?.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Selected Document Breakdown & GST Details */}
                  {selectedDoc && (
                    <div className="p-3.5 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-xl border border-emerald-200/80 shadow-xs space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                            <FileText className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                              <span>Selected:</span>
                              <span className="text-emerald-700 font-mono font-extrabold">{selectedDoc.trans_no || selectedDoc.invoice_no}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                                {selectedDoc.doc_type || receiptType}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Date: {selectedDoc.invoice_date || selectedDoc.doc_date || 'N/A'} {selectedDoc.invoice_no && selectedDoc.invoice_no !== selectedDoc.trans_no ? `| Ref: ${selectedDoc.invoice_no}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Balance Due</span>
                          <span className="text-xs font-extrabold text-rose-600 font-mono">
                            ₹{(selectedDoc.balance_due !== undefined ? selectedDoc.balance_due : (selectedDoc.balance_pending || selectedDoc.total_amount))?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Product Description */}
                      <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          <span>Product / Service Description</span>
                          <span>Details</span>
                        </div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{selectedDoc.product_desc || selectedDoc.product || 'Standard Invoice Services'}</span>
                        </div>
                      </div>

                      {/* GST Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Taxable</span>
                          <span className="font-bold text-slate-800 font-mono">
                            ₹{(selectedDoc.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">GST Rate</span>
                          <span className="font-bold text-indigo-700 font-mono">
                            {selectedDoc.gst_percentage || 18}%
                          </span>
                        </div>
                        {(selectedDoc.cgst_amount > 0 || (selectedDoc.igst_amount === 0 && selectedDoc.total_gst_amount > 0)) && (
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-[9px] uppercase font-bold text-slate-500 block">CGST + SGST</span>
                            <span className="font-bold text-slate-700 font-mono">
                              ₹{((selectedDoc.cgst_amount || 0) + (selectedDoc.sgst_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        {selectedDoc.igst_amount > 0 && (
                          <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
                            <span className="text-[9px] uppercase font-bold text-purple-700 block">IGST</span>
                            <span className="font-bold text-purple-900 font-mono">
                              ₹{(selectedDoc.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Total GST</span>
                          <span className="font-extrabold text-emerald-700 font-mono">
                            ₹{(selectedDoc.total_gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Quick settle buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const bal = selectedDoc.balance_due !== undefined ? selectedDoc.balance_due : (selectedDoc.balance_pending || selectedDoc.total_amount);
                            setGrossAmount(String(bal > 0 ? bal : selectedDoc.total_amount));
                            setRemarks(`Full payment settlement for ${selectedDoc.trans_no}`);
                          }}
                          className="px-2 py-0.5 text-[11px] font-bold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 rounded shadow-2xs transition-colors cursor-pointer"
                        >
                          Full Due (₹{(selectedDoc.balance_due !== undefined ? selectedDoc.balance_due : (selectedDoc.balance_pending || selectedDoc.total_amount))?.toLocaleString('en-IN')})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const bal = selectedDoc.balance_due !== undefined ? selectedDoc.balance_due : (selectedDoc.balance_pending || selectedDoc.total_amount);
                            const half = Math.round(((bal > 0 ? bal : selectedDoc.total_amount) / 2) * 100) / 100;
                            setGrossAmount(String(half));
                            setRemarks(`50% partial payment for ${selectedDoc.trans_no}`);
                          }}
                          className="px-2 py-0.5 text-[11px] font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
                        >
                          50%
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Payment Details, Bank & Deductions */}
          {customerCode && (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Deposit Account & Payment Details
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Deposit Bank */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Deposit To Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={depositGLCode}
                    onChange={(e) => setDepositGLCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                  >
                    {accountList.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.name} ({acc.bank_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Payment Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                  >
                    <option value="NEFT/RTGS">NEFT / RTGS (Bank Transfer)</option>
                    <option value="IMPS/UPI">IMPS / UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="OnLine">Online Payment Gateway</option>
                  </select>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                  />
                </div>

                {/* UTR / Cheque Ref No */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    UTR / Cheque / Ref Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-98471928, CHQ-10492"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800 uppercase"
                  />
                </div>
              </div>

              {/* Financial Amounts & TDS Section */}
              <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200/90 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gross Settlement Amount */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Gross Settlement Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={grossAmount}
                        onChange={(e) => setGrossAmount(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white text-sm font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Total invoice or advance amount being settled for the customer
                    </span>
                  </div>

                  {/* TDS Toggle */}
                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
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
                    <span className="text-[11px] text-slate-500 mt-1 pl-6">
                      Tax deducted at source that Scoto will claim in Form 26AS
                    </span>
                  </div>
                </div>

                {/* TDS Details (if checked) */}
                {hasTDS && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">TDS Section</label>
                      <select
                        value={tdsSection}
                        onChange={(e) => handleTdsSectionChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white text-xs rounded border border-amber-300 text-slate-800 font-medium"
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
                        className="w-full px-2.5 py-1.5 bg-white text-xs rounded border border-amber-300 text-slate-800 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">TDS Deducted (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tdsAmount}
                        onChange={(e) => setTdsAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white text-xs rounded border border-amber-300 text-amber-900 font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Net Summary Banner */}
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Net Deposit in Bank
                    </div>
                    <div className="text-xs text-emerald-700">
                      Gross: ₹{(parseFloat(grossAmount) || 0).toLocaleString('en-IN')}
                      {hasTDS && (
                        <span> - TDS: ₹{(parseFloat(tdsAmount) || 0).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-emerald-900">
                      ₹{computedNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks / Transaction Narration</label>
                <input
                  type="text"
                  placeholder="e.g. 50% advance for security system installation"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={createReceiptMutation.isPending || !customerCode || !grossAmount}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {createReceiptMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Receipt...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Record Payment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordReceiptModal;

