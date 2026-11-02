import React, { useState, useEffect } from 'react';
import { X, Package, Check, Hash, Tag, Layers, QrCode } from 'lucide-react';

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

export const ItemModal = ({ isOpen, onClose, onSave, editingItem }) => {
  const [formData, setFormData] = useState({
    ProductType: 'ESSL',
    ItemCode: '',
    ItemDescription: '',
    ItemType: 'Face Recognition Terminal',
    HSNCode: '8543',
    UOM: 'Pcs',
    SerialNo: 'YES',
    Status: 'ACTIVE',
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        ProductType: editingItem.ProductType || editingItem.productType || 'ESSL',
        ItemCode: editingItem.ItemCode || editingItem.itemCode || '',
        ItemDescription: editingItem.ItemDescription || editingItem.itemDescription || '',
        ItemType: editingItem.ItemType || editingItem.itemType || 'Face Recognition Terminal',
        HSNCode: editingItem.HSNCode || editingItem.hsnCode || '8543',
        UOM: editingItem.UOM || editingItem.uom || 'Pcs',
        SerialNo: editingItem.SerialNo || editingItem.serialNo || 'YES',
        Status: editingItem.Status || editingItem.status || 'ACTIVE',
      });
    } else {
      setFormData({
        ProductType: 'ESSL',
        ItemCode: `ITM-${Math.floor(1000 + Math.random() * 9000)}`,
        ItemDescription: '',
        ItemType: 'Face Recognition Terminal',
        HSNCode: '8543',
        UOM: 'Pcs',
        SerialNo: 'YES',
        Status: 'ACTIVE',
      });
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.ItemDescription.trim()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingItem ? 'Edit Item Master' : 'New Item Master Entry'}
              </h2>
              <p className="text-xs text-slate-500">
                Configure item specifications, HSN tax codes, and serial tracking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
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
                  placeholder="e.g. ITM-1002"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Item Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Item Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={formData.ItemDescription}
              onChange={(e) => handleChange('ItemDescription', e.target.value)}
              placeholder="e.g. eSSL AI Face Recognition Device with Fingerprint & RFID (Model: uFace902)"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Item Classification / Type <span className="text-rose-500">*</span>
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
                  placeholder="e.g. 8543 or 8471"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Serial No Required */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Serial No Tracking <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['YES', 'NO'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleChange('SerialNo', opt)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      formData.SerialNo === opt
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

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

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              {editingItem ? 'Update Item' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemModal;
