import React, { useState, useEffect, useMemo } from 'react';
import {
  GitBranch,
  History,
  Lock,
  ArrowRight,
  ShieldAlert,
  Check,
  Plus,
  Edit2,
  Trash2,
  Printer,
  X,
  FileText,
  Calculator,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Layers,
  Calendar,
  User,
  Building2,
} from 'lucide-react';
import { useQuotationHistory, useReviseQuotation } from '../../../api/transactionApi';

const GST_RATES = [0, 5, 12, 18, 28];
const UOM_OPTIONS = ['Pcs', 'No', 'Roll', 'Set', 'Mtr', 'Box', 'Unit', 'Kg'];

const INITIAL_ITEM = {
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

export const QuotationRevisionModal = ({
  isOpen,
  onClose,
  quotation,
  initialTab = 'draft',
  onPrintVersion,
  onRevisionSuccess,
}) => {
  if (!isOpen || !quotation) return null;

  const baseTransNo = quotation.BaseTransNo || quotation.TransNo;
  const currentRevNo = Number(quotation.RevNo || 0);
  const nextRevNo = currentRevNo + 1;
  const nextRevLabel = `${nextRevNo}R`;
  const isHardLocked = currentRevNo >= 3 || Boolean(quotation.IsLocked);

  // Fetch full revision history from backend
  const { data: historyRes, isLoading: isHistoryLoading, refetch: refetchHistory } = useQuotationHistory(
    baseTransNo,
    { enabled: Boolean(baseTransNo) }
  );

  const historyData = historyRes?.data?.history || [];
  const maxServerRev = historyRes?.data?.current_rev_no ?? currentRevNo;
  const canRevise = !isHardLocked && maxServerRev < 3;

  const [activeTab, setActiveTab] = useState(canRevise && initialTab === 'draft' ? 'draft' : 'compare');
  const [revisionReason, setRevisionReason] = useState('');
  const [items, setItems] = useState([]);
  const [currentRow, setCurrentRow] = useState(INITIAL_ITEM);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formError, setFormError] = useState(null);

  const reviseMutation = useReviseQuotation();

  // Initialize draft items from source quotation
  useEffect(() => {
    if (quotation) {
      const cloned = (quotation.Items || []).map((it, idx) => ({
        ...it,
        order_id: String(idx + 1),
        Rate: Number(it.Rate || 0),
        Qty: Number(it.Qty || 1),
        GST: Number(it.GST || 18),
        ItemValue: Number(it.ItemValue || 0),
        CGST: Number(it.CGST || 0),
        SGST: Number(it.SGST || 0),
        IGST: Number(it.IGST || 0),
        NetAmount: Number(it.NetAmount || 0),
      }));
      setItems(cloned);
      setCurrentRow({ ...INITIAL_ITEM, order_id: String(cloned.length + 1) });
      setRevisionReason('');
      setEditingIndex(null);
      setFormError(null);
    }
  }, [quotation]);

  // Handle Input Changes for Current Item Row
  const handleItemChange = (field, value) => {
    setCurrentRow((prev) => {
      const updated = { ...prev, [field]: value };
      const rate = Number(field === 'Rate' ? value : updated.Rate) || 0;
      const qty = Number(field === 'Qty' ? value : updated.Qty) || 0;
      const gst = Number(field === 'GST' ? value : updated.GST) || 0;

      const itemVal = rate * qty;
      const halfGst = (itemVal * (gst / 2)) / 100;
      const net = itemVal + halfGst * 2;

      updated.ItemValue = itemVal;
      updated.CGST = halfGst;
      updated.SGST = halfGst;
      updated.IGST = 0;
      updated.NetAmount = net;
      return updated;
    });
  };

  // Add or Update Item in Draft Grid
  const handleAddOrUpdateItem = (e) => {
    e?.preventDefault();
    if (!currentRow.ProductType || Number(currentRow.Rate) <= 0 || Number(currentRow.Qty) <= 0) {
      alert('Please enter valid Product Name, Rate, and Quantity.');
      return;
    }

    if (editingIndex !== null) {
      setItems((prev) =>
        prev.map((item, idx) => (idx === editingIndex ? { ...currentRow, order_id: item.order_id } : item))
      );
      setEditingIndex(null);
      setCurrentRow({ ...INITIAL_ITEM, order_id: String(items.length + 1) });
    } else {
      setItems((prev) => [...prev, { ...currentRow, order_id: String(prev.length + 1) }]);
      setCurrentRow({ ...INITIAL_ITEM, order_id: String(items.length + 2) });
    }
  };

  const handleEditItem = (index) => {
    setEditingIndex(index);
    setCurrentRow({ ...items[index] });
  };

  const handleCancelItemEdit = () => {
    setEditingIndex(null);
    setCurrentRow({ ...INITIAL_ITEM, order_id: String(items.length + 1) });
  };

  const handleRemoveItem = (index) => {
    if (editingIndex === index) {
      setEditingIndex(null);
    }
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((item, idx) => ({ ...item, order_id: String(idx + 1) }))
    );
  };

  // Live Totals for Draft Revision
  const draftQty = items.reduce((acc, it) => acc + Number(it.Qty || 0), 0);
  const draftItemAmt = items.reduce((acc, it) => acc + Number(it.ItemValue || 0), 0);
  const draftCGST = items.reduce((acc, it) => acc + Number(it.CGST || 0), 0);
  const draftSGST = items.reduce((acc, it) => acc + Number(it.SGST || 0), 0);
  const draftIGST = items.reduce((acc, it) => acc + Number(it.IGST || 0), 0);
  const draftTotalAmt = draftItemAmt + draftCGST + draftSGST + draftIGST;

  let draftNet = draftTotalAmt;
  const roundOffVal = Number(quotation.RoundOff || 0);
  if (quotation.RoundType === 'Add') draftNet += roundOffVal;
  else if (quotation.RoundType === 'Less') draftNet -= roundOffVal;

  const prevNet = Number(quotation.FinalNetAmount || quotation.NetAmount || 0);
  const netDelta = draftNet - prevNet;
  const netDeltaPercent = prevNet > 0 ? (netDelta / prevNet) * 100 : 0;

  // Submit Revision
  const handleSubmitRevision = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!revisionReason || !revisionReason.trim()) {
      setFormError('A Revision Reason is mandatory to document why this new version is being created.');
      return;
    }

    if (items.length === 0) {
      setFormError('At least one item is required in the revised quotation.');
      return;
    }

    const payload = {
      ...quotation,
      TransDate: new Date().toISOString().split('T')[0],
      RevReason: revisionReason.trim(),
      Items: items,
      TotalQty: draftQty,
      TotalItemAmount: draftItemAmt,
      TotalCGSTAmount: draftCGST,
      TotalSGSTAmount: draftSGST,
      TotalIGSTAmount: draftIGST,
      TotalAmount: draftTotalAmt,
      FinalNetAmount: draftNet,
    };

    try {
      const response = await reviseMutation.mutateAsync({
        transNo: quotation.TransNo,
        payload,
      });
      await refetchHistory();
      if (onRevisionSuccess) {
        onRevisionSuccess(response.data);
      }
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.detail || err.message || 'Failed to submit quotation revision.');
    }
  };

  // Build Comprehensive Side-by-Side Comparison Matrix (Saved historical versions only)
  const comparisonMatrix = useMemo(() => {
    const sourceList = historyData && historyData.length > 0 ? historyData : (quotation ? [quotation] : []);
    if (sourceList.length === 0) return { versions: [], products: [] };

    // Only compare actual saved historical versions (no draft)
    const versions = [...sourceList];

    // Collect all unique product types/names across all versions
    const productMap = new Map();
    versions.forEach((ver) => {
      (ver.Items || []).forEach((it) => {
        const key = (it.ProductType || it.ItemCode || 'Item').trim().toLowerCase();
        if (!productMap.has(key)) {
          productMap.set(key, {
            name: it.ProductType || it.ItemCode || 'Item',
            hsn: it.HSNCode || '',
            uom: it.UOM || 'Pcs',
          });
        }
      });
    });

    const products = Array.from(productMap.entries()).map(([key, prod]) => {
      const perVersionData = versions.map((ver) => {
        const matched = (ver.Items || []).find(
          (it) => (it.ProductType || it.ItemCode || '').trim().toLowerCase() === key
        );
        return matched || null;
      });
      return {
        key,
        ...prod,
        versions: perVersionData,
      };
    });

    return { versions, products };
  }, [historyData, quotation]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
              <GitBranch className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Quotation Revision Workspace</h2>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Base: {baseTransNo}
                </span>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                  currentRevNo >= 3
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : currentRevNo === 2
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : currentRevNo === 1
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  Current: {quotation.RevLabel || `${currentRevNo}R`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Client: <strong className="text-slate-800">{quotation.CustomerName}</strong> &bull; Track revisions, audit commercial changes & compare versions side-by-side
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4-Step Revision Progress Tracker */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[
              { num: 0, label: 'Original', code: '0R' },
              { num: 1, label: '1st Revision', code: '1R' },
              { num: 2, label: '2nd Revision', code: '2R' },
              { num: 3, label: '3rd Revision (Final)', code: '3R' },
            ].map((step, idx) => {
              const isDone = currentRevNo >= step.num;
              const isCurrent = currentRevNo === step.num;
              const isTarget = nextRevNo === step.num && canRevise;

              return (
                <React.Fragment key={step.code}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-xs'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : isTarget
                          ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isDone && !isCurrent ? <Check className="h-4 w-4 stroke-[3]" /> : step.code}
                    </div>
                    <span
                      className={`mt-1 text-[11px] font-semibold ${
                        isCurrent
                          ? 'text-indigo-700 font-bold'
                          : isTarget
                          ? 'text-amber-700 font-bold'
                          : isDone
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div
                      className={`h-1 flex-1 mx-2 rounded-full ${
                        currentRevNo > step.num ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Hard Lock Alert Banner if 3R Reached */}
        {isHardLocked && (
          <div className="bg-purple-50 border-b border-purple-200 px-6 py-3 flex items-center gap-3 text-purple-900">
            <div className="p-1.5 rounded-lg bg-purple-200 text-purple-800">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1 text-xs">
              <strong className="font-bold text-sm">Quotation Revision Limit Reached (3/3):</strong>
              <p className="text-purple-700 mt-0.5">
                This quotation has reached its final permitted revision ({quotation.RevLabel || '3R'}). Industry compliance locks further revisions. If new commercial terms are required, please generate a brand-new quotation.
              </p>
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center border-b border-slate-200 px-6 bg-white gap-2">
          {canRevise && (
            <button
              type="button"
              onClick={() => setActiveTab('draft')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'draft'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Edit2 className="h-4 w-4" />
              Draft Revision ({nextRevLabel})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'compare'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            Side-by-Side Comparison Matrix
            {comparisonMatrix.versions.length > 0 && (
              <span className="ml-1 bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {comparisonMatrix.versions.length} versions
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="h-4 w-4" />
            Revision History Timeline ({historyData.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: DRAFT REVISION */}
          {activeTab === 'draft' && canRevise && (
            <form onSubmit={handleSubmitRevision} className="space-y-6">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Revision Header Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Revision No</span>
                  <span className="font-mono text-sm font-bold text-indigo-600">
                    {baseTransNo}-{nextRevLabel}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Revision Date</span>
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {new Date().toISOString().split('T')[0]}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Previous Net Amount</span>
                  <span className="font-mono text-sm font-bold text-slate-700">
                    ₹{prevNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Revised Net Amount</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-extrabold text-indigo-600">
                      ₹{draftNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    {netDelta !== 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${
                          netDelta < 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {netDelta < 0 ? <TrendingDown className="h-3 w-3 mr-0.5" /> : <TrendingUp className="h-3 w-3 mr-0.5" />}
                        {netDeltaPercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Revision Reason Box */}
              <div className="rounded-xl bg-white p-4 border border-slate-200 shadow-xs">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Revision Reason / Audit Remarks <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="e.g., Commercial renegotiation: 5% discount applied per Director approval"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  This note will be permanently logged in the revision history and printed on audit summaries.
                </span>
              </div>

              {/* Line Items Editor */}
              <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calculator className="h-4 w-4 text-indigo-500" />
                    Revision Line Items ({items.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Modify prices, quantities, or taxes to create Revision {nextRevLabel}
                  </span>
                </div>

                {/* Inline Add / Edit Row */}
                <div className={`p-3 border-b transition-colors ${
                  editingIndex !== null ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50/40 border-slate-200'
                }`}>
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Product / Service</label>
                      <input
                        type="text"
                        placeholder="Product Description"
                        value={currentRow.ProductType}
                        onChange={(e) => handleItemChange('ProductType', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">HSN Code</label>
                      <input
                        type="text"
                        placeholder="HSN"
                        value={currentRow.HSNCode}
                        onChange={(e) => handleItemChange('HSNCode', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">UOM</label>
                      <select
                        value={currentRow.UOM}
                        onChange={(e) => handleItemChange('UOM', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-1.5 text-xs"
                      >
                        {UOM_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Qty</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={currentRow.Qty}
                        onChange={(e) => handleItemChange('Qty', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-right"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={currentRow.Rate}
                        onChange={(e) => handleItemChange('Rate', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-right"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">GST %</label>
                      <select
                        value={currentRow.GST}
                        onChange={(e) => handleItemChange('GST', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-1 py-1.5 text-xs"
                      >
                        {GST_RATES.map((g) => (
                          <option key={g} value={g}>{g}%</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddOrUpdateItem}
                        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          editingIndex !== null
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {editingIndex !== null ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Update
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" /> Add
                          </>
                        )}
                      </button>
                      {editingIndex !== null && (
                        <button
                          type="button"
                          onClick={handleCancelItemEdit}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                        <th className="px-3 py-2 w-10 text-center">#</th>
                        <th className="px-3 py-2">Item Description</th>
                        <th className="px-3 py-2">HSN</th>
                        <th className="px-3 py-2 text-center">UOM</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Rate (₹)</th>
                        <th className="px-3 py-2 text-right">Amount (₹)</th>
                        <th className="px-3 py-2 text-center">GST %</th>
                        <th className="px-3 py-2 text-right">Net (₹)</th>
                        <th className="px-3 py-2 w-16 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            editingIndex === idx ? 'bg-amber-50/70 font-semibold' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{it.ProductType}</td>
                          <td className="px-3 py-2 font-mono text-slate-500">{it.HSNCode || '-'}</td>
                          <td className="px-3 py-2 text-center font-mono text-slate-600">{it.UOM}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-900">{it.Qty}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-900">
                            {Number(it.Rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">
                            {Number(it.ItemValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-slate-600">{it.GST}%</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            {Number(it.NetAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditItem(idx)}
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                title="Edit Item"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                title="Remove Item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Live Total Summary */}
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end">
                  <div className="w-72 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Total Item Value:</span>
                      <span className="font-mono font-semibold">₹{draftItemAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Total Tax (CGST + SGST):</span>
                      <span className="font-mono font-semibold">₹{(draftCGST + draftSGST).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-bold text-slate-900">
                      <span>Revised Net Amount:</span>
                      <span className="font-mono text-indigo-600">₹{draftNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviseMutation.isPending}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <GitBranch className="h-4 w-4" />
                  {reviseMutation.isPending ? 'Generating Revision...' : `Confirm & Create Revision (${nextRevLabel})`}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SIDE-BY-SIDE COMPARISON MATRIX */}
          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <span>
                    <strong>Multi-Version Audit Matrix:</strong> Review rates, quantities, and totals across Original and all subsequent revisions side-by-side.
                  </span>
                </div>
                {canRevise && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('draft')}
                    className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1"
                  >
                    Draft {nextRevLabel} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Versions Header Card Comparison */}
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-3 min-w-max">
                  {comparisonMatrix.versions.map((ver) => (
                    <div
                      key={ver.TransNo}
                      className={`w-72 rounded-xl p-4 border shadow-xs transition-all ${
                        ver.IsActiveRevision
                          ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-mono text-xs font-bold text-slate-800 truncate" title={ver.TransNo}>
                          {ver.TransNo}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          ver.IsActiveRevision
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {ver.IsActiveRevision ? 'Active' : 'Superseded'}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Revision Label:</span>
                          <span className="font-bold text-slate-800">{ver.RevLabel || (ver.RevNo ? `${ver.RevNo}R` : 'ORIGINAL')}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Total Items:</span>
                          <span className="font-mono font-semibold text-slate-800">{(ver.Items || []).length} items</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Total Qty:</span>
                          <span className="font-mono font-semibold text-slate-800">{ver.TotQty || 0}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Net Amount:</span>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            ₹{Number(ver.FinalNetAmount || ver.NetAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                          <strong className="block text-slate-400 text-[9px] uppercase">Reason:</strong>
                          <span className="italic">{ver.RevReason || 'Initial quotation'}</span>
                        </div>
                      </div>

                      {onPrintVersion && (
                        <button
                          type="button"
                          onClick={() => onPrintVersion(ver)}
                          className="mt-3 w-full rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Printer className="h-3.5 w-3.5 text-indigo-600" /> Print Version
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Product By Product Side-by-Side Table */}
              <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800">Line Items Comparative Breakdown</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                        <th className="px-3 py-2 w-48">Item Description</th>
                        {comparisonMatrix.versions.map((ver) => (
                          <th key={ver.TransNo} className="px-3 py-2 text-right min-w-[130px]">
                            {ver.RevLabel || (ver.RevNo ? `${ver.RevNo}R` : 'Orig')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparisonMatrix.products.map((prod) => (
                        <tr key={prod.key} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-slate-900 block">{prod.name}</span>
                            <span className="text-[10px] text-slate-400">HSN: {prod.hsn || '-'} &bull; {prod.uom}</span>
                          </td>
                          {prod.versions.map((it, vIdx) => {
                            if (!it) {
                              return (
                                <td key={vIdx} className="px-3 py-2.5 text-right font-mono text-slate-300 italic">
                                  Not in version
                                </td>
                              );
                            }

                            // Calculate rate diff from previous version
                            const prevItem = vIdx > 0 ? prod.versions[vIdx - 1] : null;
                            const rateDiff = prevItem ? Number(it.Rate) - Number(prevItem.Rate) : 0;

                            return (
                              <td key={vIdx} className="px-3 py-2.5 text-right">
                                <div className="font-mono font-bold text-slate-900">
                                  ₹{Number(it.NetAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {it.Qty} {it.UOM} &times; ₹{Number(it.Rate).toLocaleString('en-IN')}
                                </div>
                                {rateDiff !== 0 && (
                                  <span className={`text-[9px] font-bold ${rateDiff < 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {rateDiff < 0 ? '↓' : '↑'} ₹{Math.abs(rateDiff)} ({((rateDiff / Number(prevItem.Rate)) * 100).toFixed(1)}%)
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REVISION HISTORY TIMELINE */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {historyData.map((rev, idx) => (
                  <div
                    key={rev.TransNo}
                    className={`rounded-xl border p-4 bg-white shadow-xs transition-all ${
                      rev.IsActiveRevision
                        ? 'border-indigo-300 ring-2 ring-indigo-100'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          rev.RevNo >= 3
                            ? 'bg-purple-100 text-purple-800'
                            : rev.RevNo === 2
                            ? 'bg-amber-100 text-amber-800'
                            : rev.RevNo === 1
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {rev.RevLabel || (rev.RevNo ? `${rev.RevNo}R` : 'ORIGINAL')}
                        </span>
                        <span className="font-mono font-bold text-sm text-slate-900">{rev.TransNo}</span>
                        {rev.IsActiveRevision ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Active Revision
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            Superseded {rev.SupersededOn ? `on ${rev.SupersededOn.split(' ')[0]}` : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-extrabold text-sm text-slate-900">
                          ₹{Number(rev.FinalNetAmount || rev.NetAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        {onPrintVersion && (
                          <button
                            type="button"
                            onClick={() => onPrintVersion(rev)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:bg-slate-50 cursor-pointer shadow-xs"
                            title="Print this version"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Date: <strong className="text-slate-800">{rev.TransDate}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>User: <strong className="text-slate-800">{rev.UserName || 'ADMIN'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calculator className="h-3.5 w-3.5 text-slate-400" />
                        <span>Line Items: <strong className="text-slate-800">{(rev.Items || []).length}</strong></span>
                      </div>
                    </div>

                    {rev.RevReason && (
                      <div className="mt-2 text-xs text-slate-600">
                        <strong className="text-slate-500 font-semibold">Reason for revision:</strong>{' '}
                        <span className="italic text-slate-800">{rev.RevReason}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

