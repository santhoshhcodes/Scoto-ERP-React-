import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Hash,
  Layers,
  Tag,
  QrCode,
  ArrowLeft,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import StatCard from '../../../components/common/StatCard';
import {
  useMasterItems,
  useCreateMasterItem,
  useUpdateMasterItem,
  useDeleteMasterItem,
} from '../../../api/masterApi';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';

const PRODUCT_TYPES = ['ESSL', 'OTHERS', 'BIOMETRIC', 'SECURITY_SYSTEMS', 'ACCESS_CONTROL'];
const UOM_OPTIONS = ['No', 'Pcs', 'Roll', 'Set', 'Mtr', 'Box', 'Unit', 'Kg'];
const ITEM_TYPES = [
  'Face Recognition Terminal',
  'Fingerprint Reader',
  'Access Control Panel',
  'Power Supply / Adapter',
  'Smart RFID Card',
  'Electromagnetic Lock',
  'Push to Exit Switch',
  'Software License',
  'Cabling & Accessories',
];

const INITIAL_FORM_STATE = {
  ProductType: 'ESSL',
  ItemCode: '',
  ItemDescription: '',
  ItemType: 'Face Recognition Terminal',
  HSNCode: '',
  UOM: 'Pcs',
  SerialNo: '',
  Status: 'ACTIVE',
};

export const ItemMasterPage = () => {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
  const [editingItemCode, setEditingItemCode] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [notification, setNotification] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('ALL');

  // React Query Hooks
  const {
    data: itemsResponse,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useMasterItems({
    search: searchQuery,
    product_type: selectedProductType !== 'ALL' ? selectedProductType : undefined,
  });

  const createItemMutation = useCreateMasterItem();
  const updateItemMutation = useUpdateMasterItem();
  const deleteItemMutation = useDeleteMasterItem();

  const isSaving = createItemMutation.isPending || updateItemMutation.isPending;

  // Real items fetched from MSSQL backend
  const items = itemsResponse?.data ?? [];

  // Metrics
  const totalItems = items.length;
  const esslCount = items.filter((i) => i.ProductType === 'ESSL').length;
  const serialTracked = items.filter((i) => i.SerialNo === 'YES').length;
  const activeItems = items.filter((i) => i.Status === 'ACTIVE').length;

  // Filtered List (client-side fallback filter)
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.ItemDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ItemCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ItemType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.HSNCode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedProductType === 'ALL' || item.ProductType === selectedProductType;

    return matchesSearch && matchesType;
  });

  const {
    sortedItems: sortedFilteredItems,
    sortConfig,
    requestSort,
  } = useSortableData(filteredItems, { key: 'ItemCode', direction: 'desc' });

  // Open Form for Adding New Item
  const handleOpenAdd = () => {
    setEditingItemCode(null);
    setNotification(null);
    setFormData({
      ProductType: 'ESSL',
      ItemCode: `ITM-${Math.floor(1000 + Math.random() * 9000)}`,
      ItemDescription: '',
      ItemType: 'Face Recognition Terminal',
      HSNCode: '',
      UOM: 'Pcs',
      SerialNo: '',
      Status: 'ACTIVE',
    });
    setViewMode('form');
  };

  // Open Form for Editing
  const handleOpenEdit = (item) => {
    setEditingItemCode(item.ItemCode);
    setNotification(null);
    setFormData({ ...item });
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setEditingItemCode(null);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.ItemDescription.trim()) return;

    try {
      if (editingItemCode) {
        await updateItemMutation.mutateAsync({
          itemCode: editingItemCode,
          payload: {
            ProductType: formData.ProductType,
            ItemDescription: formData.ItemDescription,
            ItemType: formData.ItemType,
            HSNCode: formData.HSNCode,
            UOM: formData.UOM,
            SerialNo: formData.SerialNo,
            Status: formData.Status,
          },
        });
        setNotification({ type: 'success', message: `Item ${editingItemCode} updated successfully!` });
      } else {
        await createItemMutation.mutateAsync({
          payload: formData,
        });
        setNotification({ type: 'success', message: `Item ${formData.ItemCode} created successfully!` });
      }
      setViewMode('list');
      setEditingItemCode(null);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to save item' });
    }
  };

  const handleDelete = async (itemCode) => {
    if (window.confirm(`Are you sure you want to delete item ${itemCode}?`)) {
      try {
        await deleteItemMutation.mutateAsync({ itemCode });
        setNotification({ type: 'success', message: `Item ${itemCode} deleted successfully!` });
      } catch (err) {
        setNotification({ type: 'error', message: err.message || 'Failed to delete item' });
      }
    }
  };

  // ==========================================
  // VIEW: FULL SCREEN FORM (ADD / EDIT ITEM)
  // ==========================================
  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        {/* Top Navigation & Breadcrumbs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Item List
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {editingItemCode ? 'Edit Item Master' : 'New Item Master Entry'}
              </h1>
              <p className="text-xs text-slate-500">
                Configure item specifications, tax categories, and serial tracking
              </p>
            </div>
          </div>
        </div>

        {/* Full-Screen Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-600" />
                Item Specifications & Catalog Details
              </h3>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                Product Details
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Product Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.ProductType}
                  onChange={(e) => handleChange('ProductType', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                >
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Item Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.ItemCode}
                    onChange={(e) => handleChange('ItemCode', e.target.value)}
                    placeholder="e.g. ITM-8001"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-medium"
                    required
                  />
                </div>
              </div>

              {/* Item Classification */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Item Classification <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={formData.ItemType}
                    onChange={(e) => handleChange('ItemType', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  >
                    {ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Item Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Item Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={formData.ItemDescription}
                onChange={(e) => handleChange('ItemDescription', e.target.value)}
                placeholder="e.g. eSSL AI Face Recognition & Fingerprint Attendance Terminal (Model: uFace 800)"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {/* HSN Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  HSN / SAC Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <QrCode className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.HSNCode}
                    onChange={(e) => handleChange('HSNCode', e.target.value)}
                    placeholder="e.g.8543 or 8471"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* UOM */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Unit of Measure (UOM) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Layers className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={formData.UOM}
                    onChange={(e) => handleChange('UOM', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  >
                    {UOM_OPTIONS.map((uom) => (
                      <option key={uom} value={uom}>
                        {uom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>



              {/* Manual Serial Number Entry */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Serial Number
                </label>

                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

                  <input
                    type="text"
                    value={formData.SerialNo ?? ""}
                    onChange={(e) => handleChange("SerialNo", e.target.value)}
                    placeholder="Enter serial number"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.Status}
                  onChange={(e) => handleChange('Status', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 active:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isSaving
                ? 'Saving...'
                : editingItemCode
                  ? 'Update Item'
                  : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN LIST VIEW
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Notification Toast/Banner or API Error */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-xs font-medium ${notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-4 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {fetchError && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Connection Error:</span> {fetchError.message || 'Failed to load items.'}
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
              Item Master
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
              <Package className="h-3 w-3" />
              Inventory & Catalog
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Biometric devices, hardware accessories, UOM classifications, and HSN tax codes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh items"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 active:bg-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Catalog Items"
          value={`${totalItems}`}
          icon={Package}
          color="indigo"
          changeLabel="Total catalog products"
        />

        <StatCard
          title="eSSL Biometrics"
          value={`${esslCount}`}
          icon={Layers}
          color="blue"
          changeLabel="Biometric product range"
        />

        <StatCard
          title="Serial Tracked"
          value={`${serialTracked}`}
          icon={Hash}
          color="emerald"
          changeLabel="Individual warranty tracking"
        />

        <StatCard
          title="Active Items"
          value={`${activeItems}`}
          icon={CheckCircle2}
          color="amber"
          changeLabel="Ready for transactions"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, description, HSN..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Product Type Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
          {['ALL', 'ESSL', 'BIOMETRIC', 'ACCESS_CONTROL', 'OTHERS'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedProductType(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all cursor-pointer ${selectedProductType === type
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
            >
              {type}
            </button>
          ))}
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
                  sortKey="ProductType"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  Product Type
                </SortableHeader>
                <SortableHeader
                  sortKey="ItemCode"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  Item Code
                </SortableHeader>
                <SortableHeader
                  sortKey="ItemDescription"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  Item Description
                </SortableHeader>
                <SortableHeader
                  sortKey="ItemType"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  Classification
                </SortableHeader>
                <SortableHeader
                  sortKey="HSNCode"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  HSN
                </SortableHeader>
                <SortableHeader
                  sortKey="UOM"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="py-3.5 px-4"
                >
                  UOM
                </SortableHeader>
                <SortableHeader
                  sortKey="SerialNo"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  align="center"
                  className="py-3.5 px-4 text-center"
                >
                  Serial Tracking
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
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-700">Loading items...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-rose-500">
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
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">No items found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Try adjusting your search criteria or add a new item
                    </p>
                  </td>
                </tr>
              ) : (
                sortedFilteredItems.map((item, index) => (
                  <tr
                    key={item.ItemCode || index}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.ProductType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                      {item.ItemCode}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {item.ItemDescription}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {item.ItemType}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 text-xs">
                      {item.HSNCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-xs">
                        {item.UOM}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${item.SerialNo === 'YES'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                      >
                        {item.SerialNo}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${item.Status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                      >
                        {item.Status === 'ACTIVE' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-rose-600" />
                        )}
                        {item.Status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.ItemCode)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Item"
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
            Showing <span className="font-semibold text-slate-700">{filteredItems.length}</span> entries
          </div>
          <div className="text-slate-400 text-xs font-medium">
            Item Master Catalog
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemMasterPage;
