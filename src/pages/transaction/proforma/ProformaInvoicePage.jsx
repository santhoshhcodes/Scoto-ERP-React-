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
  ArrowLeft,
  Building2,
  Hash,
  Calendar,
  Layers,
  AlertCircle,
  TrendingUp,
  Loader2,
  Download,
} from 'lucide-react';
import { useMasterItems, useMasterLedgers } from '../../../api/masterApi';
import {
  useQuotations,
  useProformaInvoices,
  useCreateProformaInvoice,
  useUpdateProformaInvoice,
  useDeleteProformaInvoice,
  useDownloadProformaInvoiceExcel,
} from '../../../api/transactionApi';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';
import { DocumentActionDropdown } from '../../../components/common/DocumentActionDropdown';
import { DocumentPrintModal } from '../../../components/common/DocumentPrintModal';

export const ProformaInvoicePage = () => {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
  const [editingTransNo, setEditingTransNo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  // TanStack Queries & Mutations
  const {
    data: proformaRes,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useProformaInvoices({ search: searchQuery });

  const { data: quotationRes } = useQuotations();
  const { data: masterItemsRes } = useMasterItems();
  const { data: masterLedgersRes } = useMasterLedgers();

  const createProformaMutation = useCreateProformaInvoice();
  const updateProformaMutation = useUpdateProformaInvoice();
  const deleteProformaMutation = useDeleteProformaInvoice();
  const downloadProformaExcelMutation = useDownloadProformaInvoiceExcel();
  const [downloadingTransNo, setDownloadingTransNo] = useState(null);
  const [printDoc, setPrintDoc] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const proformas = proformaRes?.data ?? [];
  const {
    sortedItems: sortedProformas,
    sortConfig,
    requestSort,
  } = useSortableData(proformas, { key: 'TransDate', direction: 'desc' });
  const availableQuotations = quotationRes?.data ?? [];
  const availableItems = masterItemsRes?.data ?? [];
  const availableLedgers = masterLedgersRes?.data ?? [];

  // Form State
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
    Service: 'Standard Supply',
  };

  const [formHeader, setFormHeader] = useState({
    TransNo: '',
    TransDate: new Date().toISOString().split('T')[0],
    QuotationNo: '',
    QuotationDate: new Date().toISOString().split('T')[0],
    CustomerCode: '',
    CustomerName: '',
    Remarks: '',
    ApprovalStatus: 'Pending',
    RoundType: 'None',
    RoundOff: 0,
  });

  const [gridItems, setGridItems] = useState([]);
  const [currentRow, setCurrentRow] = useState(INITIAL_ITEM_ROW);

  const isApproved = (val) => String(val ?? '').trim() === '1' || String(val ?? '').trim().toLowerCase() === 'approved';

  // KPI Calculations
  const totalCount = proformas.length;
  const approvedCount = proformas.filter((p) => isApproved(p.ApprovalStatus)).length;
  const pendingCount = proformas.filter((p) => !isApproved(p.ApprovalStatus)).length;
  const totalValue = proformas.reduce((acc, p) => acc + Number(p.FinalNetAmount || p.TotalAmount || 0), 0);

  const handleOpenAdd = () => {
    setEditingTransNo(null);
    setNotification(null);
    const nextNo = `PI-2026-${String(proformas.length + 1).padStart(3, '0')}`;
    setFormHeader({
      TransNo: nextNo,
      TransDate: new Date().toISOString().split('T')[0],
      QuotationNo: '',
      QuotationDate: new Date().toISOString().split('T')[0],
      CustomerCode: '',
      CustomerName: '',
      Remarks: '',
      ApprovalStatus: 'Pending',
      RoundType: 'None',
      RoundOff: 0,
    });
    setGridItems([]);
    setCurrentRow(INITIAL_ITEM_ROW);
    setViewMode('form');
  };

  const handleOpenEdit = (pi) => {
    setEditingTransNo(pi.TransNo);
    setNotification(null);
    setFormHeader({
      TransNo: pi.TransNo,
      TransDate: pi.TransDate || new Date().toISOString().split('T')[0],
      QuotationNo: pi.QuotationNo || '',
      QuotationDate: pi.QuotationDate || new Date().toISOString().split('T')[0],
      CustomerCode: pi.CustomerCode || '',
      CustomerName: pi.CustomerName || '',
      Remarks: pi.Remarks || '',
      ApprovalStatus: pi.ApprovalStatus || 'Pending',
      RoundType: pi.RoundType || 'None',
      RoundOff: pi.RoundOff || 0,
    });
    setGridItems(pi.Items || []);
    setCurrentRow(INITIAL_ITEM_ROW);
    setViewMode('form');
  };

  const handleQuotationSelect = (quoNo) => {
    if (!quoNo) {
      setFormHeader((prev) => ({
        ...prev,
        QuotationNo: '',
        CustomerCode: '',
        CustomerName: '',
      }));
      setGridItems([]);
      return;
    }
    const matched = availableQuotations.find((q) => q.TransNo === quoNo);
    if (matched) {
      setFormHeader((prev) => ({
        ...prev,
        QuotationNo: matched.TransNo,
        QuotationDate: matched.TransDate || prev.TransDate,
        CustomerCode: matched.CustomerCode || '',
        CustomerName: matched.CustomerName || '',
      }));
      setGridItems(matched.Items || []);
    }
  };

  const handleRowChange = (field, value) => {
    setCurrentRow((prev) => {
      const updated = { ...prev, [field]: value };
      const rate = Number(updated.Rate) || 0;
      const qty = Number(updated.Qty) || 0;
      const gst = Number(updated.GST) || 0;
      const itemVal = rate * qty;
      const halfGst = (itemVal * (gst / 2)) / 100;
      const net = itemVal + halfGst * 2;

      updated.ItemValue = itemVal;
      updated.CGST = halfGst;
      updated.SGST = halfGst;
      updated.NetAmount = net;
      return updated;
    });
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!currentRow.ProductType || Number(currentRow.Rate) <= 0 || Number(currentRow.Qty) <= 0) {
      alert('Please enter valid product details.');
      return;
    }
    setGridItems((prev) => [...prev, { ...currentRow, order_id: String(prev.length + 1) }]);
  };

  const handleRemoveItem = (index) => {
    setGridItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Totals
  const totalQty = gridItems.reduce((acc, i) => acc + Number(i.Qty || 0), 0);
  const totalItemAmount = gridItems.reduce((acc, i) => acc + Number(i.ItemValue || 0), 0);
  const totalCGSTAmount = gridItems.reduce((acc, i) => acc + Number(i.CGST || 0), 0);
  const totalSGSTAmount = gridItems.reduce((acc, i) => acc + Number(i.SGST || 0), 0);
  const totalIGSTAmount = gridItems.reduce((acc, i) => acc + Number(i.IGST || 0), 0);
  const totalAmount = totalItemAmount + totalCGSTAmount + totalSGSTAmount + totalIGSTAmount;

  let finalNetAmount = totalAmount;
  const roundOffVal = Number(formHeader.RoundOff) || 0;
  if (formHeader.RoundType === 'Add') finalNetAmount += roundOffVal;
  else if (formHeader.RoundType === 'Less') finalNetAmount -= roundOffVal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (gridItems.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    const payload = {
      ...formHeader,
      TotalQty: totalQty,
      TotalItemAmount: totalItemAmount,
      TotalCGSTAmount: totalCGSTAmount,
      TotalSGSTAmount: totalSGSTAmount,
      TotalIGSTAmount: totalIGSTAmount,
      TotalAmount: totalAmount,
      FinalNetAmount: finalNetAmount,
      Items: gridItems,
    };

    try {
      if (editingTransNo) {
        await updateProformaMutation.mutateAsync({ transNo: editingTransNo, payload });
        setNotification({ type: 'success', message: `Proforma Invoice ${editingTransNo} updated successfully.` });
      } else {
        await createProformaMutation.mutateAsync({ payload });
        setNotification({ type: 'success', message: `Proforma Invoice ${formHeader.TransNo} saved successfully.` });
      }
      setViewMode('list');
      setEditingTransNo(null);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to save Proforma Invoice.' });
    }
  };

  const handleDownloadExcel = async (transNo) => {
    if (!transNo) return;
    try {
      setDownloadingTransNo(transNo);
      await downloadProformaExcelMutation.mutateAsync({ transNo });
      setNotification({
        type: 'success',
        message: `Proforma Invoice ${transNo} Excel downloaded successfully.`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || `Failed to download proforma invoice ${transNo} Excel.`,
      });
    } finally {
      setDownloadingTransNo(null);
    }
  };

  const handleOpenPrintModal = (pi) => {
    setPrintDoc(pi);
    setIsPrintModalOpen(true);
  };

  const handleDelete = async (transNo) => {
    if (window.confirm(`Delete proforma invoice ${transNo}?`)) {
      try {
        await deleteProformaMutation.mutateAsync({ transNo });
        setNotification({ type: 'success', message: `Proforma Invoice ${transNo} deleted successfully.` });
      } catch (err) {
        setNotification({ type: 'error', message: err.message || 'Failed to delete proforma invoice.' });
      }
    }
  };

  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-indigo-600" />
              {editingTransNo ? `Edit Proforma Invoice (${editingTransNo})` : 'New Proforma Invoice Entry'}
            </h1>
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-100 transition-colors cursor-pointer"
                title="Print A4 Proforma Invoice"
              >
                <Printer className="h-4 w-4 text-indigo-600" />
                Print A4
              </button>
              <button
                type="button"
                onClick={() => handleDownloadExcel(editingTransNo)}
                disabled={downloadingTransNo === editingTransNo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                title="Download Proforma Invoice Excel"
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Proforma Invoice Header
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trans No</label>
                <input
                  type="text"
                  value={formHeader.TransNo}
                  readOnly
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 border border-slate-200 text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trans Date</label>
                <input
                  type="date"
                  value={formHeader.TransDate}
                  onChange={(e) => setFormHeader({ ...formHeader, TransDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ref Quotation No</label>
                <select
                  value={formHeader.QuotationNo}
                  onChange={(e) => handleQuotationSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
                >
                  <option value="">- Manual Entry / None -</option>
                  {availableQuotations.map((q) => (
                    <option key={q.TransNo} value={q.TransNo}>
                      {q.TransNo} ({q.CustomerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Party Name</label>
                <input
                  type="text"
                  list="pi-ledgers"
                  value={formHeader.CustomerName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matched = availableLedgers.find((l) => l.LedgerName === name);
                    setFormHeader({
                      ...formHeader,
                      CustomerName: name,
                      CustomerCode: matched?.LedgerCode || formHeader.CustomerCode,
                    });
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
                  required
                />
                <datalist id="pi-ledgers">
                  {availableLedgers.map((l, idx) => (
                    <option key={idx} value={l.LedgerName} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks & Scope</label>
              <textarea
                rows={2}
                value={formHeader.Remarks}
                onChange={(e) => setFormHeader({ ...formHeader, Remarks: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 resize-none"
              />
            </div>
          </div>

          {/* Grid Items */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              Proforma Line Details
            </h2>

            {/* Quick Add Form */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product Type</label>
                <input
                  type="text"
                  list="pi-items"
                  value={currentRow.ProductType}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = availableItems.find(
                      (i) => i.ItemType === val || i.ItemDescription === val
                    );
                    setCurrentRow((prev) => ({
                      ...prev,
                      ProductType: val,
                      HSNCode: matched?.HSNCode || prev.HSNCode,
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300"
                />
                <datalist id="pi-items">
                  {availableItems.map((item, idx) => (
                    <option key={idx} value={item.ItemType || item.ItemDescription} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rate (₹)</label>
                <input
                  type="number"
                  value={currentRow.Rate}
                  onChange={(e) => handleRowChange('Rate', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Qty</label>
                <input
                  type="number"
                  value={currentRow.Qty}
                  onChange={(e) => handleRowChange('Qty', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">GST %</label>
                <select
                  value={currentRow.GST}
                  onChange={(e) => handleRowChange('GST', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5">Product Type</th>
                    <th className="px-2 py-2.5">HSN</th>
                    <th className="px-3 py-2.5 text-right">Rate</th>
                    <th className="px-2 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Taxable</th>
                    <th className="px-2 py-2.5 text-center">GST</th>
                    <th className="px-3 py-2.5 text-right">Net Amount</th>
                    <th className="px-2 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gridItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-semibold text-slate-900">{item.ProductType}</td>
                      <td className="px-2 py-2 font-mono text-slate-500">{item.HSNCode}</td>
                      <td className="px-3 py-2 text-right font-mono">₹{Number(item.Rate).toFixed(2)}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold">{item.Qty}</td>
                      <td className="px-3 py-2 text-right font-mono">₹{Number(item.ItemValue).toFixed(2)}</td>
                      <td className="px-2 py-2 text-center font-mono">{item.GST}%</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">
                        ₹{Number(item.NetAmount).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="font-semibold text-slate-600">Total Qty: </span>
                <span className="font-mono font-bold text-slate-900">{totalQty}</span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="font-semibold text-slate-600">Taxable: </span>
                  <span className="font-mono font-bold text-slate-900">₹{totalItemAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">CGST/SGST: </span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{(totalCGSTAmount + totalSGSTAmount).toFixed(2)}
                  </span>
                </div>
                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <span className="font-bold text-indigo-950">Final Amount: </span>
                  <span className="font-mono font-bold text-indigo-700 text-sm">₹{finalNetAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createProformaMutation.isPending || updateProformaMutation.isPending}
              className="px-6 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md cursor-pointer"
            >
              {editingTransNo ? 'Update Proforma' : 'Save Proforma Invoice'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            Proforma Invoice List
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Proforma Invoices Generated from Quotations & Customer Billing Estimates
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Proforma
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="cursor-pointer">&times;</button>
        </div>
      )}

      {/* API Connection Error Banner */}
      {fetchError && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Connection Error:</span> {fetchError.message || 'Failed to load proforma invoices.'}
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Proformas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{approvedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Pending Approval</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Value</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">
            ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Table Box */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search TransNo, Customer, Quotation..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 border-b border-slate-200">
              <tr>
                <SortableHeader
                  sortKey="TransNo"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Trans No
                </SortableHeader>
                <SortableHeader
                  sortKey="TransDate"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Date
                </SortableHeader>
                <SortableHeader
                  sortKey="QuotationNo"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Quotation No
                </SortableHeader>
                <SortableHeader
                  sortKey="CustomerName"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Customer Name
                </SortableHeader>
                <SortableHeader
                  sortKey="FinalNetAmount"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="right"
                  className="px-4 py-3 text-right"
                >
                  Net Amount
                </SortableHeader>
                <SortableHeader
                  sortKey="ApprovalStatus"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="center"
                  className="px-4 py-3 text-center"
                >
                  Status
                </SortableHeader>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-700">Loading proforma invoices...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-rose-500">
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
              ) : proformas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No proforma invoices found. Click <strong>"Add New"</strong> to create one.
                  </td>
                </tr>
              ) : (
                sortedProformas.map((pi) => (
                  <tr key={pi.TransNo} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">{pi.TransNo}</td>
                    <td className="px-4 py-3 text-slate-600">{pi.TransDate}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{pi.QuotationNo || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{pi.CustomerName}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(pi.FinalNetAmount || pi.TotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isApproved(pi.ApprovalStatus)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isApproved(pi.ApprovalStatus) ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <DocumentActionDropdown
                          onPrint={() => handleOpenPrintModal(pi)}
                          onDownloadExcel={() => handleDownloadExcel(pi.TransNo)}
                          isDownloading={downloadingTransNo === pi.TransNo}
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(pi)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(pi.TransNo)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Delete"
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
          documentType="PROFORMA"
          documentData={printDoc}
          clientLedger={availableLedgers.find(
            (l) => l.LedgerName === printDoc.CustomerName || l.LedgerCode === printDoc.CustomerCode
          )}
          onDownloadExcel={() => handleDownloadExcel(printDoc.TransNo)}
          isDownloading={downloadingTransNo === printDoc.TransNo}
        />
      )}
    </div>
  );
};

export default ProformaInvoicePage;
