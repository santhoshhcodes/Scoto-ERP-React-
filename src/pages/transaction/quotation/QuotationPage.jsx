import React, { useState } from 'react';
import {
  FileText,
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
  DollarSign,
  Layers,
  Building2,
  Hash,
  Calculator,
  Calendar,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Loader2,
  Download,
  FileSpreadsheet,
  GitBranch,
  History,
  Lock,
} from 'lucide-react';
import {
  useQuotations,
  useCreateQuotation,
  useUpdateQuotation,
  useDeleteQuotation,
  useDownloadQuotationExcel,
} from '../../../api/transactionApi';
import { useMasterItems, useMasterLedgers } from '../../../api/masterApi';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';
import { DocumentActionDropdown } from '../../../components/common/DocumentActionDropdown';
import { DocumentPrintModal } from '../../../components/common/DocumentPrintModal';
import { QuotationRevisionModal } from './QuotationRevisionModal';
import { useFinancialYear } from '../../../context/FinancialYearContext';
import { generateNextTransactionNo, getFullFinYear } from '../../../utils/transactionNumberUtils';

const GST_RATES = [0, 5, 12, 18, 28];
const UOM_OPTIONS = ['Pcs', 'No', 'Roll', 'Set', 'Mtr', 'Box', 'Unit', 'Kg'];
const PRODUCT_CATEGORIES = [
  { value: '1', label: 'Material-Based' },
  { value: '2', label: 'Product-Based' },
];

const INITIAL_ITEM_ROW = {
  order_id: '1',
  ProductType: '',
  Prod_highlight: '',
  HSNCode: '',
  UOM: 'Pcs',
  Rate: 0,
  Qty: 1,
  ItemValue: 0,
  GST: 18,
  CGST: 0,
  SGST: 0,
  IGST: 0,
  NetAmount: 0,
  Service: 'Standard Supply',
};

export const QuotationPage = () => {
  const { selectedFinYear } = useFinancialYear();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
  const [editingTransNo, setEditingTransNo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  // TanStack Query Hooks
  const {
    data: quotationResponse,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useQuotations({ search: searchQuery, finYear: selectedFinYear });

  const { data: masterItemsRes } = useMasterItems();
  const { data: masterLedgersRes } = useMasterLedgers();

  const createQuotationMutation = useCreateQuotation();
  const updateQuotationMutation = useUpdateQuotation();
  const deleteQuotationMutation = useDeleteQuotation();
  const downloadExcelMutation = useDownloadQuotationExcel();
  const [downloadingTransNo, setDownloadingTransNo] = useState(null);
  const [printDoc, setPrintDoc] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activeReviseDoc, setActiveReviseDoc] = useState(null);
  const [reviseModalTab, setReviseModalTab] = useState('draft');

  const handleOpenReviseModal = (quo, tab = 'draft') => {
    setActiveReviseDoc(quo);
    setReviseModalTab(tab);
  };

  const availableItems = masterItemsRes?.data ?? [];
  const availableLedgers = masterLedgersRes?.data ?? [];

  // Form State
  const [formHeader, setFormHeader] = useState({
    TransNo: '',
    TransDate: new Date().toISOString().split('T')[0],
    ProdType: '1',
    CustomerCode: '',
    CustomerName: '',
    Narration: '',
    Purpose: '',
    TermsAndConditions: '1. Quotation valid for only 10 days.\n2. Payment: 100% in advance.\n3. Delivery: 5 to 7 working days after payment.\n4. All payments should be made in favour of "Scoto Systec Pvt. Ltd.", payable at Coimbatore.\n5. Project kick-start: Immediately after receiving the advance.', ApprovalStatus: 'Pending',
    RoundType: 'None',
    RoundOff: 0,
  });

  const [gridItems, setGridItems] = useState([]);
  const [currentRow, setCurrentRow] = useState(INITIAL_ITEM_ROW);
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

  const quotations = quotationResponse?.data ?? [];
  const {
    sortedItems: sortedQuotations,
    sortConfig,
    requestSort,
  } = useSortableData(quotations, { key: 'TransDate', direction: 'desc' });

  const isApproved = (val) => String(val ?? '').trim() === '1' || String(val ?? '').trim().toLowerCase() === 'approved';

  // Summary Metrics
  const totalQuotations = quotations.length;
  const approvedQuotations = quotations.filter((q) => isApproved(q.ApprovalStatus)).length;
  const pendingQuotations = quotations.filter((q) => !isApproved(q.ApprovalStatus)).length;
  const totalValue = quotations.reduce((acc, q) => acc + Number(q.FinalNetAmount || 0), 0);

  // Open Form for Adding New Quotation
  const handleOpenAdd = () => {
    setEditingTransNo(null);
    setNotification(null);
    setEditingItemIndex(null);
    setIsInterState(false);
    const nextNo = generateNextTransactionNo('SQ', selectedFinYear, quotations);
    setFormHeader({
      FinYearVal: getFullFinYear(selectedFinYear),
      TransNo: nextNo,
      TransDate: new Date().toISOString().split('T')[0],
      ProdType: '1',
      CustomerCode: '',
      CustomerName: '',
      Narration: '',
      Purpose: '',
      TermsAndConditions: '',
      ApprovalStatus: 'Pending',
      RoundType: 'None',
      RoundOff: 0,
    });
    setGridItems([]);
    setCurrentRow({
      ...INITIAL_ITEM_ROW,
      order_id: '1',
    });
    setViewMode('form');
  };

  // Open Form for Editing
  const handleOpenEdit = (quotation) => {
    setEditingTransNo(quotation.TransNo);
    setNotification(null);
    setEditingItemIndex(null);
    const hasIgst =
      Number(quotation.TotalIGSTAmount || 0) > 0 ||
      (quotation.Items || []).some((it) => Number(it.IGST || 0) > 0);
    setIsInterState(hasIgst);
    setFormHeader({
      TransNo: quotation.TransNo,
      TransDate: quotation.TransDate || new Date().toISOString().split('T')[0],
      ProdType: quotation.ProdType || '1',
      CustomerCode: quotation.CustomerCode || '',
      CustomerName: quotation.CustomerName || '',
      Narration: quotation.Narration || '',
      Purpose: quotation.Purpose || '',
      TermsAndConditions: quotation.TermsAndConditions || '',
      ApprovalStatus: quotation.ApprovalStatus || 'Pending',
      RoundType: quotation.RoundType || 'None',
      RoundOff: quotation.RoundOff || 0,
    });
    setGridItems(quotation.Items || []);
    setCurrentRow({
      ...INITIAL_ITEM_ROW,
      order_id: String((quotation.Items?.length || 0) + 1),
    });
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setEditingTransNo(null);
    setEditingItemIndex(null);
  };

  // Current Row Calculation
  const handleRowChange = (field, value) => {
    setCurrentRow((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === 'ProductType') {
        const matchedItem = availableItems.find((i) => i.ItemType === value || i.ItemDescription === value);
        if (matchedItem) {
          updated.HSNCode = matchedItem.HSNCode || updated.HSNCode;
          updated.UOM = matchedItem.UOM || updated.UOM;
          updated.Prod_highlight = matchedItem.ItemDescription || updated.Prod_highlight;
        }
      }

      return calculateRowTax(updated, isInterState);
    });
  };

  // Add or Update Item in Grid
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!currentRow.ProductType || Number(currentRow.Rate) <= 0 || Number(currentRow.Qty) <= 0) {
      alert('Please enter valid Product, Rate, and Quantity.');
      return;
    }

    if (editingItemIndex !== null) {
      setGridItems((prev) =>
        prev.map((item, idx) => (idx === editingItemIndex ? { ...currentRow, order_id: item.order_id } : item))
      );
      setEditingItemIndex(null);
      setCurrentRow({
        ...INITIAL_ITEM_ROW,
        order_id: String(gridItems.length + 1),
      });
    } else {
      setGridItems((prev) => [...prev, { ...currentRow, order_id: String(prev.length + 1) }]);
      setCurrentRow({
        ...INITIAL_ITEM_ROW,
        order_id: String(gridItems.length + 2),
      });
    }
  };

  // Edit Line Item from Grid
  const handleEditItem = (index) => {
    const itemToEdit = gridItems[index];
    if (!itemToEdit) return;
    setEditingItemIndex(index);
    setCurrentRow({ ...itemToEdit });
  };

  // Cancel Line Item Edit
  const handleCancelItemEdit = () => {
    setEditingItemIndex(null);
    setCurrentRow({
      ...INITIAL_ITEM_ROW,
      order_id: String(gridItems.length + 1),
    });
  };

  // Remove Item from Grid
  const handleRemoveItem = (index) => {
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setCurrentRow({
        ...INITIAL_ITEM_ROW,
        order_id: String(gridItems.length),
      });
    }
    setGridItems((prev) =>
      prev.filter((_, i) => i !== index).map((item, idx) => ({ ...item, order_id: String(idx + 1) }))
    );
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

  // Submit Quotation
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (gridItems.length === 0) {
      alert('Please add at least one line item to the quotation.');
      return;
    }

    const payload = {
      ...formHeader,
      FinYearVal: formHeader.FinYearVal || getFullFinYear(selectedFinYear, formHeader.TransDate),
      Items: gridItems,
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
        await updateQuotationMutation.mutateAsync({ transNo: editingTransNo, payload });
        setNotification({ type: 'success', message: `Quotation ${editingTransNo} updated successfully.` });
      } else {
        await createQuotationMutation.mutateAsync({ payload });
        setNotification({ type: 'success', message: `Quotation ${formHeader.TransNo} saved successfully.` });
      }
      setViewMode('list');
      setEditingTransNo(null);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to save quotation.' });
    }
  };

  // Delete Quotation
  const handleDelete = async (transNo) => {
    if (window.confirm(`Are you sure you want to delete quotation ${transNo}?`)) {
      try {
        await deleteQuotationMutation.mutateAsync({ transNo });
        setNotification({ type: 'success', message: `Quotation ${transNo} deleted.` });
      } catch (err) {
        setNotification({ type: 'error', message: err.message || 'Failed to delete quotation.' });
      }
    }
  };

  const handleDownloadExcel = async (transNo) => {
    if (!transNo) return;
    try {
      setDownloadingTransNo(transNo);
      await downloadExcelMutation.mutateAsync({ transNo });
      setNotification({
        type: 'success',
        message: `Quotation ${transNo} Excel downloaded successfully.`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || `Failed to download quotation ${transNo} Excel.`,
      });
    } finally {
      setDownloadingTransNo(null);
    }
  };

  const handleOpenPrintModal = (quo) => {
    setPrintDoc(quo);
    setIsPrintModalOpen(true);
  };

  const handlePrint = (transNo) => {
    const quo = quotations.find((q) => q.TransNo === transNo);
    handleOpenPrintModal(quo || { TransNo: transNo });
  };

  // ==========================================
  // VIEW: FULL FORM (ADD / EDIT QUOTATION)
  // ==========================================
  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        {/* Top Breadcrumb & Controls */}
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
                <FileText className="h-6 w-6 text-indigo-600" />
                {editingTransNo ? `Edit Quotation (${editingTransNo})` : 'New Quotation Entry'}
              </h1>
              <p className="text-xs text-slate-500">
                SCOTO Transaction Module &bull; GST Item Billing & Estimation
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-100 transition-colors cursor-pointer"
                title="Print A4 Quotation Document"
              >
                <Printer className="h-4 w-4 text-indigo-600" />
                Print A4
              </button>
              <button
                type="button"
                onClick={() => handleDownloadExcel(editingTransNo)}
                disabled={downloadingTransNo === editingTransNo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                title="Download Quotation Excel"
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
          {/* 1. Header Information Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              General Quotation Header
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* TransNo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trans No <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formHeader.TransNo}
                    readOnly
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-100 border border-slate-200 text-slate-900 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* TransDate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trans Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={formHeader.TransDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setFormHeader((prev) => {
                        const updated = { ...prev, TransDate: newDate };
                        if (!editingTransNo && selectedFinYear === 'ALL') {
                          updated.TransNo = generateNextTransactionNo('SQ', selectedFinYear, quotations, newDate);
                          updated.FinYearVal = getFullFinYear(selectedFinYear, newDate);
                        }
                        return updated;
                      });
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
              </div>

              {/* Product Basis */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Basis <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formHeader.ProdType}
                  onChange={(e) => setFormHeader({ ...formHeader, ProdType: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Name & Tax Mode */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Customer Name <span className="text-rose-500">*</span>
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
                        : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    }`}
                    title="Click to manually toggle between Intra-State (CGST+SGST) and Inter-State (IGST)"
                  >
                    {isInterState ? '🌐 Inter-State (IGST)' : '📍 Intra-State (CGST+SGST)'}
                  </button>
                </div>
                <input
                  type="text"
                  list="quo-ledgers"
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
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
                <datalist id="quo-ledgers">
                  {availableLedgers.map((l, idx) => (
                    <option key={idx} value={l.LedgerName} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Narration, Purpose, Terms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Narration</label>
                <textarea
                  rows={2}
                  value={formHeader.Narration}
                  onChange={(e) => setFormHeader({ ...formHeader, Narration: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose</label>
                <textarea
                  rows={2}
                  value={formHeader.Purpose}
                  onChange={(e) => setFormHeader({ ...formHeader, Purpose: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={formHeader.TermsAndConditions}
                  onChange={(e) => setFormHeader({ ...formHeader, TermsAndConditions: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Quotation Line Item Entry Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" />
                Quotation Line Details
              </span>
              <span className="text-xs font-normal text-slate-500">Auto GST & Net Amount Computation</span>
            </h2>

            {/* Quick Row Input Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              {/* Order ID */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Order #</label>
                <input
                  type="text"
                  value={currentRow.order_id}
                  readOnly
                  className="w-full px-2 py-1.5 text-xs rounded bg-slate-100 border border-slate-200 text-center font-mono font-bold"
                />
              </div>

              {/* Product Type / Description */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Product Type <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="item-types-list"
                  value={currentRow.ProductType}
                  onChange={(e) => handleRowChange('ProductType', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300 focus:ring-2 focus:ring-indigo-500/20"
                />
                <datalist id="item-types-list">
                  {availableItems.map((i) => (
                    <option key={i.ItemCode} value={i.ItemType}>
                      {i.ItemDescription}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Product Highlight */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Highlight / Spec</label>
                <input
                  type="text"
                  value={currentRow.Prod_highlight}
                  onChange={(e) => handleRowChange('Prod_highlight', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300"
                />
              </div>

              {/* HSN */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">HSN</label>
                <input
                  type="text"
                  value={currentRow.HSNCode}
                  onChange={(e) => handleRowChange('HSNCode', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono"
                />
              </div>

              {/* UOM */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">UOM</label>
                <select
                  value={currentRow.UOM}
                  onChange={(e) => handleRowChange('UOM', e.target.value)}
                  className="w-full px-1.5 py-1.5 text-xs rounded bg-white border border-slate-300"
                >
                  {UOM_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rate */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rate (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentRow.Rate}
                  onChange={(e) => handleRowChange('Rate', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono text-right font-semibold"
                />
              </div>

              {/* Qty */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Qty</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={currentRow.Qty}
                  onChange={(e) => handleRowChange('Qty', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono text-center font-semibold"
                />
              </div>

              {/* GST % */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">GST %</label>
                <select
                  value={currentRow.GST}
                  onChange={(e) => handleRowChange('GST', e.target.value)}
                  className="w-full px-1.5 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono"
                >
                  {GST_RATES.map((g) => (
                    <option key={g} value={g}>
                      {g}%
                    </option>
                  ))}
                </select>
              </div>

              {/* Add / Update Button */}
              <div className="lg:col-span-1 flex items-end gap-1.5">
                {editingItemIndex !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex-1 py-1.5 px-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="Update this line item"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Update
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
                    className="w-full py-1.5 px-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                )}
              </div>
            </div>

            {/* Added Items Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/80 font-bold uppercase tracking-wider text-[10px] text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Product Type</th>
                    <th className="px-3 py-2.5">Highlight</th>
                    <th className="px-2 py-2.5">HSN</th>
                    <th className="px-2 py-2.5">UOM</th>
                    <th className="px-3 py-2.5 text-right">Rate</th>
                    <th className="px-2 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Item Value</th>
                    <th className="px-2 py-2.5 text-center">GST</th>
                    {isInterState ? (
                      <th className="px-3 py-2.5 text-right text-purple-700">IGST</th>
                    ) : (
                      <>
                        <th className="px-2.5 py-2.5 text-right">CGST</th>
                        <th className="px-2.5 py-2.5 text-right">SGST</th>
                      </>
                    )}
                    <th className="px-3 py-2.5 text-right">Net Amount</th>
                    <th className="px-2 py-2.5 text-center">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gridItems.length === 0 ? (
                    <tr>
                      <td colSpan={isInterState ? 12 : 13} className="px-4 py-8 text-center text-slate-400">
                        No line items added yet. Fill in the fields above and click "+ Add" to populate.
                      </td>
                    </tr>
                  ) : (
                    gridItems.map((item, index) => (
                      <tr
                        key={index}
                        className={
                          editingItemIndex === index
                            ? 'bg-amber-50/80 ring-1 ring-amber-300 transition-colors'
                            : 'hover:bg-slate-50/70 transition-colors'
                        }
                      >
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{item.order_id}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{item.ProductType}</td>
                        <td className="px-3 py-2 text-slate-600">{item.Prod_highlight || '-'}</td>
                        <td className="px-2 py-2 font-mono text-slate-500">{item.HSNCode}</td>
                        <td className="px-2 py-2">{item.UOM}</td>
                        <td className="px-3 py-2 text-right font-mono">₹{Number(item.Rate).toFixed(2)}</td>
                        <td className="px-2 py-2 text-center font-mono font-bold">{item.Qty}</td>
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
                            <td className="px-2.5 py-2 text-right font-mono text-slate-500">
                              ₹{Number(item.CGST || 0).toFixed(2)}
                            </td>
                            <td className="px-2.5 py-2 text-right font-mono text-slate-500">
                              ₹{Number(item.SGST || 0).toFixed(2)}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">
                          ₹{Number(item.NetAmount).toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditItem(index)}
                              className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
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

            {/* 3. Summary & Financial Totals */}
            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Total Qty</span>
                  <span className="text-base font-bold text-slate-900 font-mono">{totalQty}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Total Taxable</span>
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
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">CGST / SGST</span>
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
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 flex flex-col justify-center">
                  <span className="block text-[10px] font-bold text-indigo-900 uppercase">Final Net Amount</span>
                  <span className="text-lg font-extrabold text-indigo-700 font-mono">
                    ₹{finalNetAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
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
              disabled={createQuotationMutation.isPending || updateQuotationMutation.isPending}
              className="px-6 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              {editingTransNo ? 'Update Quotation' : 'Save Quotation'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VIEW: LIST (QUOTATION REGISTER)
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <FileText className="h-5 w-5" />
            </div>
            Quotation Management
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Enterprise Client Estimates, Bill of Quantities & Formal Proposals
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Quotation
          </button>
        </div>
      </div>

      {/* Live Notification Banner */}
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

      {/* API Error Banner */}
      {fetchError && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Connection Error:</span> {fetchError.message || 'Failed to load quotations.'}
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

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quotations</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalQuotations}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{approvedQuotations}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{pendingQuotations}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pipeline Value</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600">₹{totalValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Table Register Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Search & Filter Header */}
        <div className="flex flex-col gap-3 p-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by TransNo, Customer, Narration..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{quotations.length}</strong> quotations
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
                  sortKey="CustomerName"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3.5"
                >
                  Customer Name
                </SortableHeader>
                <SortableHeader
                  sortKey="Narration"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3.5"
                >
                  Remarks / Narration
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
                <th className="px-4 py-3.5 text-center">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-700">Loading quotations...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-rose-500">
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
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No quotation records found. Click <strong>"Add New Quotation"</strong> to create one.
                  </td>
                </tr>
              ) : (
                sortedQuotations.map((quo, index) => (
                  <tr key={quo.TransNo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400 font-semibold">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-indigo-600">{quo.TransNo}</span>
                        {quo.RevNo > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReviseModal(quo, 'history')}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-transform hover:scale-105 ${
                              quo.RevNo >= 3
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : quo.RevNo === 2
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                            title="Click to view Revision History & Audit Log"
                          >
                            {quo.RevNo >= 3 && <Lock className="h-2.5 w-2.5" />}
                            {quo.RevLabel || `${quo.RevNo}R`}
                            {quo.RevNo >= 3 && ' (Final)'}
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Orig
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{quo.TransDate}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{quo.CustomerName}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{quo.Narration || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(quo.FinalNetAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${isApproved(quo.ApprovalStatus)
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {isApproved(quo.ApprovalStatus) ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <DocumentActionDropdown
                          onPrint={() => handleOpenPrintModal(quo)}
                          onDownloadExcel={() => handleDownloadExcel(quo.TransNo)}
                          isDownloading={downloadingTransNo === quo.TransNo}
                        />

                        {/* Revise Button (New Row Versioning) */}
                        {quo.RevNo >= 3 || quo.IsLocked ? (
                          <button
                            type="button"
                            disabled
                            className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed"
                            title="Revision limit reached (3/3). Maximum 3 revisions allowed. Further revisions locked."
                          >
                            <GitBranch className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReviseModal(quo, 'draft')}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title={`Revise Quotation (Create ${Number(quo.RevNo || 0) + 1}R)`}
                          >
                            <GitBranch className="h-4 w-4" />
                          </button>
                        )}

                        {/* History & Compare Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenReviseModal(quo, 'compare')}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Revision History & Multi-Version Compare"
                        >
                          <History className="h-4 w-4" />
                        </button>

                        {/* Edit Button (In-place correction) */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(quo)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit Quotation (In-place clerical correction)"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(quo.TransNo)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Quotation"
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
          documentType="QUOTATION"
          documentData={printDoc}
          clientLedger={availableLedgers.find(
            (l) => l.LedgerName === printDoc.CustomerName || l.LedgerCode === printDoc.SuppCode
          )}
          onDownloadExcel={() => handleDownloadExcel(printDoc.TransNo)}
          isDownloading={downloadingTransNo === printDoc.TransNo}
        />
      )}

      {/* Quotation Revision & Version Comparison Workspace Modal */}
      {activeReviseDoc && (
        <QuotationRevisionModal
          isOpen={Boolean(activeReviseDoc)}
          onClose={() => setActiveReviseDoc(null)}
          quotation={activeReviseDoc}
          initialTab={reviseModalTab}
          onPrintVersion={(vDoc) => handleOpenPrintModal(vDoc)}
          onRevisionSuccess={(newDoc) => {
            setNotification({
              type: 'success',
              message: `Quotation successfully revised to ${newDoc?.TransNo || 'new revision'}!`,
            });
          }}
        />
      )}
    </div>
  );
};

export default QuotationPage;
