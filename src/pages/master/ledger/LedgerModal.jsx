import React, { useState, useEffect } from 'react';
import { X, BookOpen, Check, Hash, Building, Layers, DollarSign } from 'lucide-react';

const ACCOUNT_HEADERS = ['Assets', 'Liabilities', 'Income', 'Expenses', 'Equity'];

const ACCOUNT_GROUPS = [
  'Current Assets',
  'Fixed Assets',
  'Sundry Debtors (Receivables)',
  'Sundry Creditors (Payables)',
  'Direct Expenses',
  'Indirect Expenses',
  'Direct Income / Revenue',
  'Indirect Income',
  'Bank & Cash Accounts',
  'Duties & Taxes',
];

const COST_CENTRE_OPTIONS = ['Cost Centre', 'Profit Centre', 'Not Applicable'];

export const LedgerModal = ({ isOpen, onClose, onSave, editingLedger }) => {
  const [formData, setFormData] = useState({
    ledgerCode: '',
    ledgerName: '',
    accountHeader: 'Assets',
    accountGroup: 'Current Assets',
    subGroupName: 'Bank & Cash Accounts',
    categoryCode: 'CAT-OPR',
    costCenter: 'Cost Centre',
    openingBalance: '0.00',
    balanceType: 'Dr',
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (editingLedger) {
      setFormData({ ...editingLedger });
    } else {
      setFormData({
        ledgerCode: `GL-${Math.floor(1000 + Math.random() * 9000)}`,
        ledgerName: '',
        accountHeader: 'Assets',
        accountGroup: 'Current Assets',
        subGroupName: 'Bank & Cash Accounts',
        categoryCode: 'CAT-OPR',
        costCenter: 'Cost Centre',
        openingBalance: '0.00',
        balanceType: 'Dr',
        status: 'ACTIVE',
      });
    }
  }, [editingLedger, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.ledgerName.trim()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingLedger ? 'Edit Ledger Master' : 'New General Ledger Entry'}
              </h2>
              <p className="text-xs text-slate-500">
                Setup Chart of Accounts, Group hierarchy, and Cost/Profit centres
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* General Ledger Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                General Ledger Code <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.ledgerCode}
                  onChange={(e) => handleChange('ledgerCode', e.target.value)}
                  placeholder="e.g. GL-1001"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* General Ledger Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                General Ledger Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ledgerName}
                onChange={(e) => handleChange('ledgerName', e.target.value)}
                placeholder="e.g. HDFC Bank - Operational A/c"
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Header */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Header <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.accountHeader}
                onChange={(e) => handleChange('accountHeader', e.target.value)}
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

            {/* Account Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Group <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.accountGroup}
                onChange={(e) => handleChange('accountGroup', e.target.value)}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Sub Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Sub Group
              </label>
              <input
                type="text"
                value={formData.subGroupName}
                onChange={(e) => handleChange('subGroupName', e.target.value)}
                placeholder="e.g. Cash in Hand / Vendor Payables"
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Cost Center / Profit Center */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cost Centre Allocation <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={formData.costCenter}
                  onChange={(e) => handleChange('costCenter', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                >
                  {COST_CENTRE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Opening Balance */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Opening Balance (₹)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  value={formData.openingBalance}
                  onChange={(e) => handleChange('openingBalance', e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Dr / Cr */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Debit / Credit Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Dr', 'Cr'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleChange('balanceType', type)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      formData.balanceType === type
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {type === 'Dr' ? 'Debit (Dr)' : 'Credit (Cr)'}
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
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              {editingLedger ? 'Update Ledger' : 'Save Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LedgerModal;
