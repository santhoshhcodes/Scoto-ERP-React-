import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { readExcelFile, downloadExcelTemplate } from '../../utils/excelUtils';

/**
 * Reusable Excel / CSV Import Modal
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string} title
 * @param {string} description
 * @param {Array<Object>} sampleTemplateData - Sample rows to download as template
 * @param {string} templateFileName - Name for template file
 * @param {Function} onImport - Callback with imported and parsed array of records: (rows, mode) => void
 * @param {Array<string>} requiredColumns - List of required column names (case-insensitive)
 */
export const ExcelImportModal = ({
  isOpen,
  onClose,
  title = 'Import Excel File',
  description = 'Upload an Excel or CSV file to bulk import data into the system.',
  sampleTemplateData = [],
  templateFileName = 'template',
  onImport,
  requiredColumns = [],
}) => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [importMode, setImportMode] = useState('append'); // 'append' | 'replace'
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    processFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const processFile = async (selectedFile) => {
    setIsLoading(true);
    setErrorMsg(null);
    setFile(selectedFile);

    try {
      const rows = await readExcelFile(selectedFile);
      if (!rows || rows.length === 0) {
        throw new Error('The selected file contains no data rows.');
      }

      const headers = Object.keys(rows[0] || {});
      setColumnHeaders(headers);

      // Validate required columns if any
      if (requiredColumns && requiredColumns.length > 0) {
        const lowerHeaders = headers.map((h) => h.toLowerCase().trim().replace(/[\s_-]/g, ''));
        const missing = requiredColumns.filter(
          (req) => !lowerHeaders.includes(req.toLowerCase().trim().replace(/[\s_-]/g, ''))
        );

        if (missing.length > 0) {
          setErrorMsg(
            `Warning: Expected column(s) not found: [${missing.join(', ')}]. Please review the mapping below or use the official template.`
          );
        }
      }

      setParsedData(rows);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to parse Excel file.');
      setParsedData([]);
      setColumnHeaders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (sampleTemplateData && sampleTemplateData.length > 0) {
      downloadExcelTemplate(sampleTemplateData, templateFileName, 'Import_Template');
    }
  };

  const handleConfirmImport = () => {
    if (parsedData.length === 0) {
      setErrorMsg('No valid rows to import.');
      return;
    }
    if (onImport) {
      onImport(parsedData, importMode);
    }
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setColumnHeaders([]);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Top Banner / Template Download */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>Need the proper format? Download our pre-formatted template.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-2xs border border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Upload Area */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center hover:bg-indigo-50/40 hover:border-indigo-400 transition-all cursor-pointer group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6" />
              </div>
              <p className="mt-3 text-xs font-bold text-slate-800">
                Click to upload or drag & drop file
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supports Excel (.xlsx, .xls) and CSV (.csv) files up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{file.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB • {parsedData.length} records ready
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setParsedData([]);
                    setColumnHeaders([]);
                    setErrorMsg(null);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Change File
                </button>
              </div>

              {/* Import Mode Options */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Import Method:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700">Append to list</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-slate-700">Replace current</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Data Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  Data Preview (First 5 of {parsedData.length} rows)
                </span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {parsedData.length} rows parsed
                </span>
              </div>
              <div className="max-h-48 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      {columnHeaders.map((col, idx) => (
                        <th key={idx} className="px-3 py-2 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedData.slice(0, 5).map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-50/80">
                        {columnHeaders.map((col, colIdx) => (
                          <td key={colIdx} className="px-3 py-1.5 whitespace-nowrap text-slate-700">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedData.length === 0 || isLoading}
            onClick={handleConfirmImport}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Import {parsedData.length} Records</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;
