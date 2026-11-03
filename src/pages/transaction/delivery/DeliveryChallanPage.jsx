import React, { useState } from 'react';
import {
  Truck,
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
  Loader2,
} from 'lucide-react';
import { useMasterItems, useMasterLedgers } from '../../../api/masterApi';
import {
  useDeliveryChallans,
  useCreateDeliveryChallan,
  useUpdateDeliveryChallan,
  useDeleteDeliveryChallan,
} from '../../../api/transactionApi';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';
import { useFinancialYear } from '../../../context/FinancialYearContext';

export const DeliveryChallanPage = () => {
  const { selectedFinYear } = useFinancialYear();
  const [viewMode, setViewMode] = useState('list');
  const [editingDeliveryNo, setEditingDeliveryNo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  const {
    data: challanRes,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useDeliveryChallans({ search: searchQuery, finYear: selectedFinYear });

  const { data: masterItemsRes } = useMasterItems();
  const { data: masterLedgersRes } = useMasterLedgers();

  const createChallanMutation = useCreateDeliveryChallan();
  const updateChallanMutation = useUpdateDeliveryChallan();
  const deleteChallanMutation = useDeleteDeliveryChallan();

  const challans = challanRes?.data ?? [];
  const {
    sortedItems: sortedChallans,
    sortConfig,
    requestSort,
  } = useSortableData(challans, { key: 'Deliverydate', direction: 'desc' });
  const availableItems = masterItemsRes?.data ?? [];
  const availableLedgers = masterLedgersRes?.data ?? [];

  const [formHeader, setFormHeader] = useState({
    Deliveryno: '',
    Deliverydate: new Date().toISOString().split('T')[0],
    Returntype: '1',
    TransType: 'Customer',
    Suppliername: '',
    SupplierInvoice: '',
    Supplier_ref_no: '',
    Supplier_ref_date: new Date().toISOString().split('T')[0],
    Deliverymode: 'Courier',
    purpose: '',
    GSTName: 'GST 18%',
    SGST_Per: 9,
    CGST_Per: 9,
    IGST_Per: 0,
  });

  const [gridItems, setGridItems] = useState([]);
  const [currentRow, setCurrentRow] = useState({
    Item: '',
    HSN: '',
    UOM: 'Pcs',
    Qty: 1,
    Rate: 0,
    InvoiceTotal: 0,
  });

  const handleOpenAdd = () => {
    setEditingDeliveryNo(null);
    setNotification(null);
    const nextNo = `DC-2026-${String(challans.length + 1).padStart(3, '0')}`;
    setFormHeader({
      Deliveryno: nextNo,
      Deliverydate: new Date().toISOString().split('T')[0],
      Returntype: '1',
      TransType: 'Customer',
      Suppliername: '',
      SupplierInvoice: '',
      Supplier_ref_no: '',
      Supplier_ref_date: new Date().toISOString().split('T')[0],
      Deliverymode: '',
      purpose: '',
      GSTName: 'GST 18%',
      SGST_Per: 9,
      CGST_Per: 9,
      IGST_Per: 0,
    });
    setGridItems([]);
    setCurrentRow({
      Item: '',
      HSN: '',
      UOM: 'Pcs',
      Qty: 1,
      Rate: 0,
      InvoiceTotal: 0,
    });
    setViewMode('form');
  };

  const handleOpenEdit = (c) => {
    setEditingDeliveryNo(c.Deliveryno);
    setNotification(null);
    setFormHeader({
      Deliveryno: c.Deliveryno,
      Deliverydate: c.Deliverydate || new Date().toISOString().split('T')[0],
      Returntype: c.Returntype || '1',
      TransType: c.TransType || 'Customer',
      Suppliername: c.Suppliername || '',
      SupplierInvoice: c.SupplierInvoice || '',
      Supplier_ref_no: c.Supplier_ref_no || '',
      Supplier_ref_date: c.Supplier_ref_date || new Date().toISOString().split('T')[0],
      Deliverymode: c.Deliverymode || 'Courier',
      purpose: c.purpose || '',
      GSTName: c.GSTName || 'GST 18%',
      SGST_Per: Number(c.SGST_Per || 9),
      CGST_Per: Number(c.CGST_Per || 9),
      IGST_Per: Number(c.IGST_Per || 0),
    });
    setGridItems(c.Items || []);
    setViewMode('form');
  };

  const handleRowChange = (field, value) => {
    setCurrentRow((prev) => {
      const updated = { ...prev, [field]: value };
      const rate = Number(updated.Rate) || 0;
      const qty = Number(updated.Qty) || 0;
      updated.InvoiceTotal = rate * qty;
      return updated;
    });
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!currentRow.Item || Number(currentRow.Qty) <= 0) {
      alert('Please enter a valid item and quantity.');
      return;
    }
    setGridItems((prev) => [...prev, { ...currentRow }]);
  };

  const handleRemoveItem = (index) => {
    setGridItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Computations
  const totalQty = gridItems.reduce((acc, i) => acc + Number(i.Qty || 0), 0);
  const totalAmt = gridItems.reduce((acc, i) => acc + Number(i.InvoiceTotal || 0), 0);
  const sgstAmt = (totalAmt * Number(formHeader.SGST_Per || 0)) / 100;
  const cgstAmt = (totalAmt * Number(formHeader.CGST_Per || 0)) / 100;
  const igstAmt = (totalAmt * Number(formHeader.IGST_Per || 0)) / 100;
  const finalInvoice = totalAmt + sgstAmt + cgstAmt + igstAmt;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (gridItems.length === 0) {
      alert('Please add at least one item to dispatch.');
      return;
    }

    const payload = {
      ...formHeader,
      TotalAmt: totalAmt,
      SGSTAmt: sgstAmt,
      CGSTAmt: cgstAmt,
      IGSTAmt: igstAmt,
      FinalInvoice: finalInvoice,
      Items: gridItems,
    };

    try {
      if (editingDeliveryNo) {
        await updateChallanMutation.mutateAsync({ deliveryNo: editingDeliveryNo, payload });
        setNotification({ type: 'success', message: `Delivery Challan ${editingDeliveryNo} updated.` });
      } else {
        await createChallanMutation.mutateAsync({ payload });
        setNotification({ type: 'success', message: `Delivery Challan ${formHeader.Deliveryno} created.` });
      }
      setViewMode('list');
      setEditingDeliveryNo(null);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to save Delivery Challan.' });
    }
  };

  const handleDelete = async (no) => {
    if (window.confirm(`Delete Delivery Challan ${no}?`)) {
      try {
        await deleteChallanMutation.mutateAsync({ deliveryNo: no });
        setNotification({ type: 'success', message: `Delivery Challan ${no} deleted.` });
      } catch (err) {
        setNotification({ type: 'error', message: err.message || 'Failed to delete Delivery Challan.' });
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
              <Truck className="h-6 w-6 text-indigo-600" />
              {editingDeliveryNo ? `Edit Delivery Challan (${editingDeliveryNo})` : 'New Delivery Challan'}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Challan & Transport Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Challan No</label>
                <input
                  type="text"
                  value={formHeader.Deliveryno}
                  readOnly
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 border border-slate-200 text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Challan Date</label>
                <input
                  type="date"
                  value={formHeader.Deliverydate}
                  onChange={(e) => setFormHeader({ ...formHeader, Deliverydate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Return Type</label>
                <select
                  value={formHeader.Returntype}
                  onChange={(e) => setFormHeader({ ...formHeader, Returntype: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200"
                >
                  <option value="1">Returnable</option>
                  <option value="2">Non-Returnable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Supplier</label>
                <input
                  type="text"
                  list="dc-ledgers"
                  value={formHeader.Suppliername}
                  onChange={(e) => setFormHeader({ ...formHeader, Suppliername: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200"
                  required
                />
                <datalist id="dc-ledgers">
                  {availableLedgers.map((l, idx) => (
                    <option key={idx} value={l.LedgerName} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Mode</label>
                <input
                  type="text"
                  value={formHeader.Deliverymode}
                  onChange={(e) => setFormHeader({ ...formHeader, Deliverymode: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Ref No / PO</label>
                <input
                  type="text"
                  value={formHeader.Supplier_ref_no}
                  onChange={(e) => setFormHeader({ ...formHeader, Supplier_ref_no: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Remarks</label>
                <input
                  type="text"
                  value={formHeader.purpose}
                  onChange={(e) => setFormHeader({ ...formHeader, purpose: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              Challan Items Dispatch List
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Item Description</label>
                <input
                  type="text"
                  list="dc-items"
                  value={currentRow.Item}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = availableItems.find(
                      (i) => i.ItemType === val || i.ItemDescription === val
                    );
                    setCurrentRow((prev) => ({
                      ...prev,
                      Item: val,
                      HSN: matched?.HSNCode || prev.HSN,
                      UOM: matched?.UOM || prev.UOM,
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300"
                />
                <datalist id="dc-items">
                  {availableItems.map((item, idx) => (
                    <option key={idx} value={item.ItemType || item.ItemDescription} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">HSN</label>
                <input
                  type="text"
                  value={currentRow.HSN}
                  onChange={(e) => handleRowChange('HSN', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">UOM</label>
                <select
                  value={currentRow.UOM}
                  onChange={(e) => handleRowChange('UOM', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-300"
                >
                  <option value="Pcs">Pcs</option>
                  <option value="Set">Set</option>
                  <option value="Box">Box</option>
                  <option value="Unit">Unit</option>
                </select>
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
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  + Add Item
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Item Description</th>
                    <th className="px-3 py-2.5">HSN</th>
                    <th className="px-3 py-2.5">UOM</th>
                    <th className="px-3 py-2.5 text-center">Dispatch Qty</th>
                    <th className="px-3 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gridItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{item.Item}</td>
                      <td className="px-3 py-2 font-mono text-slate-500">{item.HSN}</td>
                      <td className="px-3 py-2">{item.UOM}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-indigo-700">{item.Qty}</td>
                      <td className="px-3 py-2 text-center">
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

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">
                Total Items: <strong className="text-slate-900 font-mono">{gridItems.length}</strong>
              </span>
              <span className="font-semibold text-slate-600">
                Total Dispatch Quantity: <strong className="text-indigo-700 font-mono text-sm">{totalQty}</strong>
              </span>
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
              disabled={createChallanMutation.isPending || updateChallanMutation.isPending}
              className="px-6 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md cursor-pointer"
            >
              {editingDeliveryNo ? 'Update Challan' : 'Save Delivery Challan'}
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
              <Truck className="h-5 w-5" />
            </div>
            Delivery Challan Register
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Material & Goods Delivery Challan Dispatch Register
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
            Add New Challan
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
              <span className="font-bold">Connection Error:</span> {fetchError.message || 'Failed to load delivery challans.'}
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

      {/* Register Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Challan No, Customer, PO..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 border-b border-slate-200">
              <tr>
                <SortableHeader
                  sortKey="Deliveryno"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Challan No
                </SortableHeader>
                <SortableHeader
                  sortKey="Deliverydate"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Date
                </SortableHeader>
                <SortableHeader
                  sortKey="Returntype"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Return Type
                </SortableHeader>
                <SortableHeader
                  sortKey="Suppliername"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Customer / Supplier
                </SortableHeader>
                <SortableHeader
                  sortKey="Deliverymode"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Delivery Mode
                </SortableHeader>
                <SortableHeader
                  sortKey="Supplier_ref_no"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="px-4 py-3"
                >
                  Ref No
                </SortableHeader>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-700">Loading delivery challans...</p>
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
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No delivery challans found. Click <strong>"Add New"</strong> to create one.
                  </td>
                </tr>
              ) : (
                sortedChallans.map((c) => (
                  <tr key={c.Deliveryno} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">{c.Deliveryno}</td>
                    <td className="px-4 py-3 text-slate-600">{c.Deliverydate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                        c.Returntype === '1' || c.Returntype === 'Returnable'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {c.Returntype === '1' || c.Returntype === 'Returnable' ? 'Returnable' : 'Non-Returnable'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.Suppliername}</td>
                    <td className="px-4 py-3 text-slate-600">{c.Deliverymode || '-'}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{c.Supplier_ref_no || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.Deliveryno)}
                          className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                          title="Delete"
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
    </div>
  );
};

export default DeliveryChallanPage;
