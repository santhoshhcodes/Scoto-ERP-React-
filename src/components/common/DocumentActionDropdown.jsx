import React, { useState, useRef, useEffect } from 'react';
import { Printer, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';

export const DocumentActionDropdown = ({
  onPrint,
  onDownloadExcel,
  isDownloading = false,
  label = 'Print',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
        title="Print or Export Document"
      >
        <Printer className="h-3.5 w-3.5 text-indigo-600" />
        <span className="hidden sm:inline text-[11px] font-bold text-slate-700">{label}</span>
        <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 animate-in fade-in-50 zoom-in-95">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Document Options
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              if (onPrint) onPrint();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left cursor-pointer"
          >
            <Printer className="h-4 w-4 text-indigo-600 shrink-0" />
            <div>
              <div className="font-bold text-slate-900">Print A4</div>
              <div className="text-[10px] text-slate-400 font-normal">Standard A4 / PDF layout</div>
            </div>
          </button>

          <button
            type="button"
            disabled={isDownloading}
            onClick={() => {
              setIsOpen(false);
              if (onDownloadExcel) onDownloadExcel();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 text-emerald-600 animate-spin shrink-0" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <div>
              <div className="font-bold text-slate-900">Download Excel</div>
              <div className="text-[10px] text-slate-400 font-normal">Excel spreadsheet (.xlsx)</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentActionDropdown;
