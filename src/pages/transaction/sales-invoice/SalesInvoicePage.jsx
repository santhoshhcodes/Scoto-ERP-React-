import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Search,
  RefreshCw,
  Printer,
  Edit2,
  Trash2,
  CheckCircle2,
  Check,
  X,
  Clock,
  ArrowLeft,
  Building2,
  Hash,
  Calendar,
  Layers,
  Barcode,
  AlertCircle,
  TrendingUp,
  Package,
  Loader2,
  Download,
  CreditCard,
  UploadCloud,
} from 'lucide-react';
import { BulkInvoiceUploadModal } from './BulkInvoiceUploadModal';
import {
  useSalesInvoices,
  useCreateSalesInvoice,
  useUpdateSalesInvoice,
  useDeleteSalesInvoice,
  useSalesInvoiceProformaMeta,
  useDownloadSalesInvoiceExcel,
  transactionApi,
} from '../../../api/transactionApi';
import { useMasterItems, useMasterLedgers } from '../../../api/masterApi';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';
import { DocumentActionDropdown } from '../../../components/common/DocumentActionDropdown';
import { DocumentPrintModal } from '../../../components/common/DocumentPrintModal';
import { useFinancialYear } from '../../../context/FinancialYearContext';
import { generateNextTransactionNo, getFullFinYear } from '../../../utils/transactionNumberUtils';

const GST_RATES = [0, 5, 12, 18, 28];

const INITIAL_ITEM_ROW = {
  ItemCode: '',
  ProductType: '',
  HSNCode: '',
  Qty: 1,
  Rate: 0,
  ItemValue: 0,
  GST: 18,
  CGST: 0,
  SGST: 0,
  IGST: 0,
  NetAmount: 0,
};

const INITIAL_SERIAL_ROW = {
  ProductType: '',
  HSNCode: '',
  MaterialInventory: '',
  SerialNo: '',
};

export const SalesInvoicePage = () => {
  const { selectedFinYear } = useFinancialYear();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
  const [editingTransNo, setEditingTransNo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  // TanStack Query Hooks
  const {
    data: invoiceResponse,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useSalesInvoices({ search: searchQuery, finYear: selectedFinYear });

  const { data: masterItemsRes } = useMasterItems();
  const { data: masterLedgersRes } = useMasterLedgers();
  const { data: proformaMetaRes } = useSalesInvoiceProformaMeta();

  const createInvoiceMutation = useCreateSalesInvoice();
  const updateInvoiceMutation = useUpdateSalesInvoice();
  const deleteInvoiceMutation = useDeleteSalesInvoice();
  const downloadInvoiceExcelMutation = useDownloadSalesInvoiceExcel();
  const [downloadingTransNo, setDownloadingTransNo] = useState(null);
  const [printDoc, setPrintDoc] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const navigate = useNavigate();

  const availableItems = masterItemsRes?.data ?? [];
  const availableLedgers = masterLedgersRes?.data ?? [];
  const availableProformas = proformaMetaRes?.data ?? [];

  // Form State
  const [formHeader, setFormHeader] = useState({
    TransNo: '',
    TransDate: new Date().toISOString().split('T')[0],
    InvoiceNo: '',
    InvoiceDate: new Date().toISOString().split('T')[0],
    GRN: '',
    CustomerCode: '',
    CustomerName: '',
    Remarks: '',
    ApprovalStatus: 'Approved',
    RoundType: 'None',
    RoundOff: 0,
  });

  const handleSelectProforma = async (proformaNo) => {
    if (!proformaNo || proformaNo === '-Select-') return;
    try {
      const res = await transactionApi.getProformaByNo(proformaNo);
      const pfData = res?.data;
      if (pfData) {
        setFormHeader((prev) => ({
          ...prev,
          InvoiceNo: pfData.TransNo || proformaNo,
          InvoiceDate: pfData.TransDate || prev.InvoiceDate,
          CustomerCode: pfData.CustomerCode || prev.CustomerCode,
          CustomerName: pfData.CustomerName || prev.CustomerName,
          Remarks: pfData.Remarks || prev.Remarks,
        }));
        if (pfData.Items && pfData.Items.length > 0) {
          const mappedItems = pfData.Items.map((item) => {
            const qty = Number(item.Qty) || 1;
            const rate = Number(item.Rate) || 0;
            const itemVal = Number(item.ItemValue) || qty * rate;
            const gst = Number(item.GST) || 18;
            const halfGst = (itemVal * (gst / 2)) / 100;
            return {
              ItemCode: item.ItemCode || '',
              ProductType: item.ProductType || '',
              HSNCode: item.HSNCode || '',
              Qty: qty,
              Rate: rate,
              ItemValue: itemVal,
              GST: gst,
              CGST: Number(item.CGST) || halfGst,
              SGST: Number(item.SGST) || halfGst,
              IGST: Number(item.IGST) || 0,
              NetAmount: Number(item.NetAmount) || (itemVal + halfGst * 2),
              SerialNo: '',
            };
          });
          setGridItems(mappedItems);
        }
      }
    } catch (err) {
      console.warn('Failed to load proforma details:', err);
    }
  };

  const [gridItems, setGridItems] = useState([]);
  const [serialDetails, setSerialDetails] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [isInterState, setIsInterState] = useState(false);

  // Helper: Detect if customer ledger is outside Tamil Nadu (TN state code is '33')
  const checkIsInterState = (customer) => {
    if (!customer) return false;
    const gstNo = String(customer.GSTNo || customer.gst_no || customer.GST || '').trim();
    if (gstNo.length >= 2) {
      return gstNo.substring(0, 2) !== '33';
    }
    const state = String(customer.State || customer.state || '').trim().toLowerCase();
    if (state && !['tamil nadu', 'tamilnadu', 'tn'].includes(state)) {
      return true;
    }
    return false;
  };

  // Helper: calculate a row's taxes dynamically for Intra (CGST+SGST) vs Inter (IGST)
  const calculateRowTax = (row, interState) => {
    const rate = Number(row.Rate) || 0;
    const qty = Number(row.Qty) || 0;
    const gstPercent = Number(row.GST) || 0;
    const itemVal = rate * qty;

    if (interState) {
      const igst = (itemVal * gstPercent) / 100;
      return {
        ...row,
        ItemValue: itemVal,
        CGST: 0,
        SGST: 0,
        IGST: igst,
        NetAmount: itemVal + igst,
      };
    } else {
      const halfGst = (itemVal * (gstPercent / 2)) / 100;
      return {
        ...row,
        ItemValue: itemVal,
        CGST: halfGst,
        SGST: halfGst,
        IGST: 0,
        NetAmount: itemVal + halfGst * 2,
      };
    }
  };

  // Active Line Entry
  const [currentRow, setCurrentRow] = useState(INITIAL_ITEM_ROW);
  const [currentSerial, setCurrentSerial] = useState(INITIAL_SERIAL_ROW);

  const invoices = invoiceResponse?.data ?? [];
  const {
    sortedItems: sortedInvoices,
    sortConfig,
    requestSort,
  } = useSortableData(invoices, { key: 'TransDate', direction: 'desc' });

  // Metrics
  const totalInvoices = invoices.length;
  const approvedInvoices = invoices.filter((i) => i.ApprovalStatus === 'Approved').length;
  const pendingInvoices = invoices.filter((i) => i.ApprovalStatus === 'Pending').length;
  const totalInvoicedValue = invoices.reduce((acc, i) => acc + Number(i.FinalNetAmount || 0), 0);

  // Open Add Form
  const handleOpenAdd = () => {
    setEditingTransNo(null);
    setNotification(null);
    setEditingItemIndex(null);
    setIsInterState(false);
    const nextNo = generateNextTransactionNo('SI', selectedFinYear, invoices);
    setFormHeader({
      FinYearVal: getFullFinYear(selectedFinYear),
      TransNo: nextNo,
      TransDate: new Date().toISOString().split('T')[0],
      InvoiceNo: '',
      InvoiceDate: new Date().toISOString().split('T')[0],
      GRN: '',
      CustomerCode: '',
      CustomerName: '',
      Remarks: '',
      ApprovalStatus: 'Approved',
      RoundType: 'None',
      RoundOff: 0,
    });
    setGridItems([]);
    setSerialDetails([]);
    setCurrentRow(INITIAL_ITEM_ROW);
    setCurrentSerial(INITIAL_SERIAL_ROW);
    setViewMode('form');
  };

  // Open Edit Form
  const handleOpenEdit = (invoice) => {
    setEditingTransNo(invoice.TransNo);
    setNotification(null);
    setEditingItemIndex(null);
    const hasIgst =
      Number(invoice.TotalIGSTAmount || 0) > 0 ||
      (invoice.Items || []).some((it) => Number(it.IGST || 0) > 0);
    setIsInterState(hasIgst);
    setFormHeader({
      TransNo: invoice.TransNo,
      TransDate: invoice.TransDate || new Date().toISOString().split('T')[0],
      InvoiceNo: invoice.InvoiceNo || '',
      InvoiceDate: invoice.InvoiceDate || new Date().toISOString().split('T')[0],
      GRN: invoice.GRN || '',
      CustomerCode: invoice.CustomerCode || '',
      CustomerName: invoice.CustomerName || '',
      Remarks: invoice.Remarks || '',
      ApprovalStatus: invoice.ApprovalStatus || 'Approved',
      RoundType: invoice.RoundType || 'None',
      RoundOff: invoice.RoundOff || 0,
    });
    setGridItems(invoice.Items || []);
    setSerialDetails(invoice.SerialDetails || []);
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setEditingTransNo(null);
    setEditingItemIndex(null);
  };

  // Line Item Math
  const handleRowChange = (field, value) => {
    setCurrentRow((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === 'ProductType') {
        const matched = availableItems.find((i) => i.ItemType === value || i.ItemDescription === value);
        if (matched) {
          updated.HSNCode = matched.HSNCode || updated.HSNCode;
          updated.ItemCode = matched.ItemCode || updated.ItemCode;
        }
      }

      return calculateRowTax(updated, isInterState);
    });
  };

  // Add or Update Item in Invoice
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!currentRow.ProductType || Number(currentRow.Rate) <= 0 || Number(currentRow.Qty) <= 0) {
      alert('Please provide a valid Product, Rate, and Quantity.');
      return;
    }

    if (editingItemIndex !== null) {
      setGridItems((prev) =>
        prev.map((item, idx) =>
          idx === editingItemIndex
            ? { ...currentRow, InvoiceNo: formHeader.InvoiceNo || item.InvoiceNo }
            : item
        )
      );
      setEditingItemIndex(null);
      setCurrentRow(INITIAL_ITEM_ROW);
    } else {
      setGridItems((prev) => [...prev, { ...currentRow, InvoiceNo: formHeader.InvoiceNo }]);
      setCurrentRow(INITIAL_ITEM_ROW);
    }
  };

  // Edit Line Item from Invoice Grid
  const handleEditItem = (index) => {
    const itemToEdit = gridItems[index];
    if (!itemToEdit) return;
    setEditingItemIndex(index);
    setCurrentRow({ ...itemToEdit });
  };

  // Cancel Line Item Edit
  const handleCancelItemEdit = () => {
    setEditingItemIndex(null);
    setCurrentRow(INITIAL_ITEM_ROW);
  };

  const handleRemoveItem = (index) => {
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setCurrentRow(INITIAL_ITEM_ROW);
    }
    setGridItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Serial Row
  const handleAddSerial = (e) => {
    e.preventDefault();
    if (!currentSerial.SerialNo.trim()) {
      alert('Please enter a serial number.');
      return;
    }
    setSerialDetails((prev) => [...prev, { ...currentSerial }]);
    setCurrentSerial((prev) => ({ ...prev, SerialNo: '' }));
  };

  const handleRemoveSerial = (index) => {
    setSerialDetails((prev) => prev.filter((_, i) => i !== index));
  };

  // Totals Computation
  const totalQty = gridItems.reduce((acc, item) => acc + Number(item.Qty || 0), 0);
  const totalItemAmount = gridItems.reduce((acc, item) => acc + Number(item.ItemValue || 0), 0);
  const totalCGSTAmount = gridItems.reduce((acc, item) => acc + Number(item.CGST || 0), 0);
  const totalSGSTAmount = gridItems.reduce((acc, item) => acc + Number(item.SGST || 0), 0);
  const totalIGSTAmount = gridItems.reduce((acc, item) => acc + Number(item.IGST || 0), 0);
  const totalAmount = totalItemAmount + totalCGSTAmount + totalSGSTAmount + totalIGSTAmount;

  let finalNetAmount = totalAmount;
  const roundOffVal = Number(formHeader.RoundOff) || 0;
  if (formHeader.RoundType === 'Add') {
    finalNetAmount += roundOffVal;
  } else if (formHeader.RoundType === 'Less') {
    finalNetAmount -= roundOffVal;
  }

  // Submit Invoice
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (gridItems.length === 0) {
      alert('Please add at least one line item to the invoice.');
      return;
    }

    const payload = {
      ...formHeader,
      FinYearVal: formHeader.FinYearVal || getFullFinYear(selectedFinYear, formHeader.TransDate),
      Items: gridItems,
      SerialDetails: serialDetails,
      TotalQty: totalQty,
      TotalItemAmount: totalItemAmount,
      TotalCGSTAmount: totalCGSTAmount,
      TotalSGSTAmount: totalSGSTAmount,
      TotalIGSTAmount: totalIGSTAmount,
      TotalAmount: totalAmount,
      FinalNetAmount: finalNetAmount,
    };

    try {
      if (editingTransNo) {
        await updateInvoiceMutation.mutateAsync({ transNo: editingTransNo, payload });
        setNotification({ type: 'success', message: `Sales Invoice ${editingTransNo} updated.` });
      } else {
        await createInvoiceMutation.mutateAsync({ payload });
        setNotification({ type: 'success', message: `Sales Invoice ${formHeader.TransNo} created.` });
      }
      setViewMode('list');
      setEditingTransNo(null);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to save sales invoice.' });
    }
  };

  const handleDelete = async (transNo) => {
    if (window.confirm(`Are you sure you want to delete invoice ${transNo}?`)) {
      try {
        await deleteInvoiceMutation.mutateAsync({ transNo });
        setNotification({ type: 'success', message: `Sales Invoice ${transNo} deleted.` });
      } catch (err) {
        setNotification({ type: 'error', message: err.message || 'Failed to delete invoice.' });
      }
    }
  };

  const handleDownloadExcel = async (transNo) => {
    if (!transNo) return;
    try {
      setDownloadingTransNo(transNo);
      await downloadInvoiceExcelMutation.mutateAsync({ transNo });
      setNotification({
        type: 'success',
        message: `Sales Invoice ${transNo} Excel downloaded successfully.`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || `Failed to download invoice ${transNo} Excel.`,
      });
    } finally {
      setDownloadingTransNo(null);
    }
  };

  const handleOpenPrintModal = async (inv) => {
    if (inv.Items && inv.Items.length > 0) {
      setPrintDoc(inv);
      setIsPrintModalOpen(true);
    } else {
      try {
        const full = await transactionApi.getSalesInvoiceByNo(inv.TransNo);
        setPrintDoc(full?.data || full || inv);
        setIsPrintModalOpen(true);
      } catch (err) {
        setPrintDoc(inv);
        setIsPrintModalOpen(true);
      }
    }
  };

  const handlePrint = (transNo) => {
    const inv = invoices.find((i) => i.TransNo === transNo);
    handleOpenPrintModal(inv || { TransNo: transNo });
  };

  // ==========================================
  // VIEW: FULL FORM (SALES INVOICE ENTRY)
  // ==========================================
  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back To List
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-6 w-6 text-emerald-600" />
                {editingTransNo ? `Edit Sales Invoice (${editingTransNo})` : 'New Sales Invoice Entry'}
              </h1>
              <p className="text-xs text-slate-500">
                SCOTO Transaction Module &bull; GST Tax Invoice & Serial Dispatch Tracking
              </p>
            </div>
          </div>

          {editingTransNo && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleOpenPrintModal({
                    ...formHeader,
                    TotalItemAmount: gridItems.reduce((acc, it) => acc + Number(it.ItemValue || 0), 0),
                    TotalCGSTAmount: gridItems.reduce((acc, it) => acc + Number(it.CGST || 0), 0),
                    TotalSGSTAmount: gridItems.reduce((acc, it) => acc + Number(it.SGST || 0), 0),
                    TotalIGSTAmount: gridItems.reduce((acc, it) => acc + Number(it.IGST || 0), 0),
                    FinalNetAmount: gridItems.reduce((acc, it) => acc + Number(it.NetAmount || 0), 0),
                    Items: gridItems,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors cursor-pointer"
                title="Print A4 Tax Invoice"
              >
                <Printer className="h-4 w-4 text-emerald-700" />
                Print A4
              </button>
              <button
                type="button"
                onClick={() => handleDownloadExcel(editingTransNo)}
                disabled={downloadingTransNo === editingTransNo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                title="Download Sales Invoice Excel"
              >
                {downloadingTransNo === editingTransNo ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                ) : (
                  <Download className="h-4 w-4 text-emerald-600" />
                )}
                Download Excel
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Invoice Header Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Sales Invoice Header Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* TransNo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trans No</label>
                <input
                  type="text"
                  value={formHeader.TransNo}
                  readOnly
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100 border border-slate-200 text-slate-900 font-mono font-semibold"
                />
              </div>

              {/* TransDate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trans Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formHeader.TransDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setFormHeader((prev) => {
                      const updated = { ...prev, TransDate: newDate };
                      if (!editingTransNo && selectedFinYear === 'ALL') {
                        updated.TransNo = generateNextTransactionNo('SI', selectedFinYear, invoices, newDate);
                        updated.FinYearVal = getFullFinYear(selectedFinYear, newDate);
                      }
                      return updated;
                    });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              {/* Invoice No / Proforma Ref */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proforma / PO / Invoice Ref <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="space-y-1">
                  <select
                    value={availableProformas.some((p) => p.TransNo === formHeader.InvoiceNo) ? formHeader.InvoiceNo : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleSelectProforma(val);
                      }
                    }}
                    className="w-full px-2.5 py-1 text-[11px] rounded bg-emerald-50/60 border border-emerald-200 text-emerald-900 font-semibold cursor-pointer"
                  >
                    <option value="">-- Load from Proforma (Optional) --</option>
                    {availableProformas.map((p) => (
                      <option key={p.TransNo} value={p.TransNo}>
                        {p.TransNo} &bull; {p.CustomerName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formHeader.InvoiceNo}
                    onChange={(e) => setFormHeader({ ...formHeader, InvoiceNo: e.target.value })}
                    placeholder="PO No, Proforma Ref, or custom invoice no..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Invoice Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={formHeader.InvoiceDate}
                  onChange={(e) => setFormHeader({ ...formHeader, InvoiceDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* GRN Ref */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GRN Reference</label>
                <input
                  type="text"
                  value={formHeader.GRN}
                  onChange={(e) => setFormHeader({ ...formHeader, GRN: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:bg-white"
                />
              </div>

              {/* Customer Name & Tax Mode */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Customer <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = !isInterState;
                      setIsInterState(nextMode);
                      setGridItems((prev) => prev.map((item) => calculateRowTax(item, nextMode)));
                      setCurrentRow((prev) => calculateRowTax(prev, nextMode));
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      isInterState
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                    title="Click to manually toggle between Intra-State (CGST+SGST) and Inter-State (IGST)"
                  >
                    {isInterState ? '🌐 Inter-State (IGST)' : '📍 Intra-State (CGST+SGST)'}
                  </button>
                </div>
                <input
                  type="text"
                  list="sinv-ledgers"
                  value={formHeader.CustomerName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matched = availableLedgers.find((l) => l.LedgerName === name);
                    const inter = checkIsInterState(matched);
                    setIsInterState(inter);
                    setFormHeader({
                      ...formHeader,
                      CustomerName: name,
                      CustomerCode: matched?.LedgerCode || formHeader.CustomerCode,
                    });
                    if (gridItems.length > 0) {
                      setGridItems((prev) => prev.map((item) => calculateRowTax(item, inter)));
                    }
                    setCurrentRow((prev) => calculateRowTax(prev, inter));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
                <datalist id="sinv-ledgers">
                  {availableLedgers.map((l, idx) => (
                    <option key={idx} value={l.LedgerName} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Remarks / Narration */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Dispatch Notes</label>
              <textarea
                rows={2}
                value={formHeader.Remarks}
                onChange={(e) => setFormHeader({ ...formHeader, Remarks: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 resize-none"
              />
            </div>
          </div>

          {/* 2. Line Items Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                Sales Item Line Details
              </span>
              <span className="text-xs text-slate-500 font-normal">HSN Taxable Billing</span>
            </h2>

            {/* Item Entry Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <div className="lg:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product Type</label>
                <input
                  type="text"
                  list="item-inv-list"
                  value={currentRow.ProductType}
                  onChange={(e) => handleRowChange('ProductType', e.target.value)}
                  placeholder="Select Product..."
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300"
                />
                <datalist id="item-inv-list">
                  {availableItems.map((i) => (
                    <option key={i.ItemCode} value={i.ItemType}>
                      {i.ItemDescription}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">HSN Code</label>
                <input
                  type="text"
                  value={currentRow.HSNCode}
                  onChange={(e) => handleRowChange('HSNCode', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono"
                />
              </div>

              <div className="lg:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={currentRow.Qty}
                  onChange={(e) => handleRowChange('Qty', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono text-center font-bold"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rate (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentRow.Rate}
                  onChange={(e) => handleRowChange('Rate', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono text-right font-semibold"
                />
              </div>

              <div className="lg:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">GST %</label>
                <select
                  value={currentRow.GST}
                  onChange={(e) => handleRowChange('GST', e.target.value)}
                  className="w-full px-1 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono"
                >
                  {GST_RATES.map((g) => (
                    <option key={g} value={g}>
                      {g}%
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2 flex items-end gap-1.5">
                {editingItemIndex !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex-1 py-1.5 px-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="Update this line item"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Update Line Item
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelItemEdit}
                      className="py-1.5 px-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
                      title="Cancel item editing"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-1.5 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Line Item
                  </button>
                )}
              </div>
            </div>

            {/* Grid Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 font-bold uppercase tracking-wider text-[10px] text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Product Type</th>
                    <th className="px-3 py-2.5">HSN Code</th>
                    <th className="px-2 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Rate</th>
                    <th className="px-3 py-2.5 text-right">Item Value</th>
                    <th className="px-2 py-2.5 text-center">GST</th>
                    {isInterState ? (
                      <th className="px-3 py-2.5 text-right text-purple-700">IGST</th>
                    ) : (
                      <>
                        <th className="px-3 py-2.5 text-right">CGST</th>
                        <th className="px-3 py-2.5 text-right">SGST</th>
                      </>
                    )}
                    <th className="px-3 py-2.5 text-right">Net Amount</th>
                    <th className="px-2 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gridItems.length === 0 ? (
                    <tr>
                      <td colSpan={isInterState ? 9 : 10} className="px-4 py-8 text-center text-slate-400">
                        No items added to this invoice. Add items above to build tax totals.
                      </td>
                    </tr>
                  ) : (
                    gridItems.map((item, index) => (
                      <tr
                        key={index}
                        className={
                          editingItemIndex === index
                            ? 'bg-amber-50/80 ring-1 ring-amber-300 transition-colors'
                            : 'hover:bg-slate-50/70'
                        }
                      >
                        <td className="px-3 py-2 font-semibold text-slate-900">{item.ProductType}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{item.HSNCode}</td>
                        <td className="px-2 py-2 text-center font-mono font-bold">{item.Qty}</td>
                        <td className="px-3 py-2 text-right font-mono">₹{Number(item.Rate).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">
                          ₹{Number(item.ItemValue).toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-center font-mono">{item.GST}%</td>
                        {isInterState ? (
                          <td className="px-3 py-2 text-right font-mono font-bold text-purple-700">
                            ₹{Number(item.IGST || 0).toFixed(2)}
                          </td>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-right font-mono text-slate-500">
                              ₹{Number(item.CGST || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-500">
                              ₹{Number(item.SGST || 0).toFixed(2)}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                          ₹{Number(item.NetAmount).toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditItem(index)}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Edit item"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 rounded text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove item"
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
          </div>

          {/* 3. Serial Tracking Details (ASP.NET RepeaterSerialDetails replication) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Barcode className="h-4 w-4 text-indigo-600" />
                Dispatch Serial Tracking (Device / Terminal Barcodes)
              </span>
              <span className="text-xs text-slate-500 font-normal">Hardware Warranty & Identification</span>
            </h2>

            {/* Serial Entry Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product</label>
                <input
                  type="text"
                  list="sinv-serial-items"
                  value={currentSerial.ProductType}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = availableItems.find(
                      (i) => i.ItemType === val || i.ItemDescription === val
                    );
                    setCurrentSerial({
                      ...currentSerial,
                      ProductType: val,
                      HSNCode: matched?.HSNCode || currentSerial.HSNCode,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300"
                />
                <datalist id="sinv-serial-items">
                  {availableItems.map((i, idx) => (
                    <option key={idx} value={i.ItemType || i.ItemDescription} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">HSN Code</label>
                <input
                  type="text"
                  value={currentSerial.HSNCode}
                  onChange={(e) => setCurrentSerial({ ...currentSerial, HSNCode: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Material Inventory / Location</label>
                <input
                  type="text"
                  value={currentSerial.MaterialInventory}
                  onChange={(e) => setCurrentSerial({ ...currentSerial, MaterialInventory: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Serial No / IMEI / Barcode</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={currentSerial.SerialNo}
                    onChange={(e) => setCurrentSerial({ ...currentSerial, SerialNo: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddSerial}
                    className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Serial Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 font-bold uppercase tracking-wider text-[10px] text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Product Type</th>
                    <th className="px-4 py-2.5">HSN Code</th>
                    <th className="px-4 py-2.5">Material Inventory</th>
                    <th className="px-4 py-2.5">Serial No</th>
                    <th className="px-3 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serialDetails.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        No serialized items recorded.
                      </td>
                    </tr>
                  ) : (
                    serialDetails.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-semibold text-slate-900">{s.ProductType}</td>
                        <td className="px-4 py-2 font-mono text-slate-500">{s.HSNCode}</td>
                        <td className="px-4 py-2 text-slate-600">{s.MaterialInventory}</td>
                        <td className="px-4 py-2 font-mono font-bold text-indigo-700">{s.SerialNo}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveSerial(idx)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Financial Summary Calculation Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Total Items Qty</span>
                <span className="text-base font-bold text-slate-900 font-mono">{totalQty}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Taxable Value</span>
                <span className="text-base font-bold text-slate-900 font-mono">₹{totalItemAmount.toFixed(2)}</span>
              </div>
              <div>
                {totalIGSTAmount > 0 || isInterState ? (
                  <>
                    <span className="block text-[10px] font-bold text-purple-700 uppercase">Total Tax (IGST)</span>
                    <span className="text-base font-bold text-purple-900 font-mono">
                      ₹{totalIGSTAmount.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Total Tax (CGST+SGST)</span>
                    <span className="text-base font-bold text-slate-700 font-mono">
                      ₹{(totalCGSTAmount + totalSGSTAmount).toFixed(2)}
                    </span>
                  </>
                )}
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Round Off</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <select
                    value={formHeader.RoundType}
                    onChange={(e) => setFormHeader({ ...formHeader, RoundType: e.target.value })}
                    className="px-1.5 py-0.5 text-xs rounded border border-slate-300 bg-white"
                  >
                    <option value="None">None</option>
                    <option value="Add">Add</option>
                    <option value="Less">Less</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={formHeader.RoundOff}
                    onChange={(e) => setFormHeader({ ...formHeader, RoundOff: Number(e.target.value) })}
                    className="w-16 px-1.5 py-0.5 text-xs rounded border border-slate-300 bg-white text-right font-mono"
                  />
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 flex flex-col justify-center">
                <span className="block text-[10px] font-bold text-emerald-900 uppercase">Invoice Net Total</span>
                <span className="text-lg font-extrabold text-emerald-700 font-mono">
                  ₹{finalNetAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleBackToList}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
              className="px-6 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              {editingTransNo ? 'Update Sales Invoice' : 'Generate Sales Invoice'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VIEW: LIST (SALES INVOICE REGISTER)
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Receipt className="h-5 w-5" />
            </div>
            Sales Invoice Management
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            GST Sales Invoicing, Serialized Dispatch Notes & Tax Ledger Registry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => navigate('/transaction/sales-invoices/bulk-upload')}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-all cursor-pointer"
          >
            <UploadCloud className="h-4 w-4 text-emerald-700" />
            Bulk Invoice & Ledger Importer
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Invoice
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold ${notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* API Connection Error Banner */}
      {fetchError && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Connection Error:</span> {fetchError.message || 'Failed to load sales invoices.'}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoices</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalInvoices}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{approvedInvoices}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{pendingInvoices}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">₹{totalInvoicedValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Register Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Search Header */}
        <div className="flex flex-col gap-3 p-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by TransNo, InvoiceNo, Customer..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{invoices.length}</strong> invoices
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/70 font-bold uppercase tracking-wider text-[10px] text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">SL_No</th>
                <SortableHeader
                  sortKey="TransNo"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3.5"
                >
                  TransNo
                </SortableHeader>
                <SortableHeader
                  sortKey="TransDate"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3.5"
                >
                  TransDate
                </SortableHeader>
                <SortableHeader
                  sortKey="InvoiceNo"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3.5"
                >
                  Invoice No
                </SortableHeader>
                <SortableHeader
                  sortKey="InvoiceDate"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3.5"
                >
                  Invoice Date
                </SortableHeader>
                <SortableHeader
                  sortKey="CustomerName"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3.5"
                >
                  Customer Name
                </SortableHeader>
                <SortableHeader
                  sortKey="Remarks"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3.5"
                >
                  Remarks
                </SortableHeader>
                <SortableHeader
                  sortKey="FinalNetAmount"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="right"
                  className="px-4 py-3.5 text-right"
                >
                  Net Amount
                </SortableHeader>
                <SortableHeader
                  sortKey="ApprovalStatus"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="center"
                  className="px-4 py-3.5 text-center"
                >
                  Approval Status
                </SortableHeader>
                <th className="px-4 py-3.5 text-center">Payment Status</th>
                <th className="px-4 py-3.5 text-center">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-emerald-600" />
                    <p className="text-sm font-semibold text-slate-700">Loading invoices...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-rose-500">
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
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    No invoice records found. Click <strong>"Add New Invoice"</strong> to generate one.
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((inv, index) => (
                  <tr key={inv.TransNo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400 font-semibold">{index + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">{inv.TransNo}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.TransDate}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.InvoiceNo}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.InvoiceDate}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{inv.CustomerName}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{inv.Remarks || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(inv.FinalNetAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${inv.ApprovalStatus === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {inv.ApprovalStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inv.payment_status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                          Paid
                        </span>
                      ) : inv.payment_status === 'PARTIAL' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title={`Paid: ₹${inv.amount_paid} | Due: ₹${inv.balance_due}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                          Partial (Due ₹{Number(inv.balance_due || 0).toLocaleString('en-IN')})
                        </span>
                      ) : inv.ApprovalStatus === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title={`Pending Balance: ₹${inv.balance_due || inv.FinalNetAmount}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                          Pending {inv.is_overdue ? `(${inv.days_overdue}d)` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {inv.payment_status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => {
                              const params = new URLSearchParams({
                                customerCode: inv.CustomerCode || '',
                                customerName: inv.CustomerName || '',
                                docType: 'SALES_INVOICE',
                                docNo: inv.TransNo || inv.InvoiceNo || '',
                                amount: String(inv.balance_due || inv.FinalNetAmount || inv.NetAmount || ''),
                              });
                              navigate(`/transaction/receipts/new?${params.toString()}`);
                            }}
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Record Payment for this Invoice"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        <DocumentActionDropdown
                          onPrint={() => handleOpenPrintModal(inv)}
                          onDownloadExcel={() => handleDownloadExcel(inv.TransNo)}
                          isDownloading={downloadingTransNo === inv.TransNo}
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(inv)}
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Edit Invoice"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(inv.TransNo)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Universal A4 Document Print Modal */}
      {isPrintModalOpen && printDoc && (
        <DocumentPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPrintDoc(null);
          }}
          documentType="SALES_INVOICE"
          documentData={printDoc}
          clientLedger={availableLedgers.find(
            (l) => l.LedgerName === printDoc.CustomerName || l.LedgerCode === printDoc.CustomerCode
          )}
          onDownloadExcel={() => handleDownloadExcel(printDoc.TransNo)}
          isDownloading={downloadingTransNo === printDoc.TransNo}
        />
      )}

      {/* Bulk Excel Invoices Upload Modal */}
      {isUploadModalOpen && (
        <BulkInvoiceUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={(res) => {
            refetch();
            setNotification({
              type: 'success',
              message: `Bulk import completed! ${res.invoices_committed || 0} invoice(s) committed successfully.`,
            });
          }}
        />
      )}

    </div>
  );
};

export default SalesInvoicePage;
