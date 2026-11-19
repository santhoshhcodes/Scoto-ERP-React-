import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, Building2, Phone, Mail, Hash, Calendar, FileText } from 'lucide-react';
import scotoLogo from '../../assets/Scoto.png';
import { numToIndianWords } from '../../utils/indianCurrencyWords';

/**
 * Universal A4 Document Print and Preview Modal
 * Supports: 'QUOTATION', 'PROFORMA', 'SALES_INVOICE'
 * Matches the layout and content of Scoto ERP Excel templates.
 */
export const DocumentPrintModal = ({
  isOpen,
  onClose,
  documentType = 'QUOTATION', // 'QUOTATION' | 'PROFORMA' | 'SALES_INVOICE'
  documentData,
  clientLedger,
  onDownloadExcel,
  isDownloading = false,
}) => {
  if (!isOpen || !documentData) return null;

  const docTitles = {
    QUOTATION: 'QUOTATION',
    PROFORMA: 'PROFORMA INVOICE',
    SALES_INVOICE: 'TAX INVOICE',
  };

  const title = docTitles[documentType] || 'QUOTATION';
  const transNo = documentData.TransNo || documentData.trans_no || '';
  const transDate = documentData.TransDate || documentData.trans_date || '';
  const invoiceNo = documentData.InvoiceNo || '';
  const invoiceDate = documentData.InvoiceDate || '';
  const quotationNo = documentData.QuotationNo || '';
  const quotationDate = documentData.QuotationDate || '';

  // Customer & Ledger Information
  const customerName = documentData.CustomerName || clientLedger?.LedgerName || '';
  const add1 = (clientLedger?.Add1 || '').trim();
  const add2 = (clientLedger?.Add2 || '').trim();
  const city = (clientLedger?.City || '').trim();
  const pincode = String(clientLedger?.PinCode || '').trim();
  const state = (clientLedger?.State || '').trim();
  const gstNo = String(clientLedger?.GSTNo || documentData.GST || '').trim();
  const contactName = String(clientLedger?.ContectName || '').trim();
  const kindAttn = contactName && contactName.toUpperCase() !== 'NA' ? contactName : 'MANAGEMENT';

  const fullAddress = [add1, add2].filter(Boolean).join(', ');
  const cityPincode = [city, pincode ? `- ${pincode}` : '', state ? `(${state})` : ''].filter(Boolean).join(' ');

  // Items
  const items = documentData.Items || documentData.items || [];

  // Amounts & Taxes
  const totalItemAmount = Number(
    documentData.TotalItemAmount ?? documentData.TotalAmount ?? 0
  );
  const totalCGST = Number(documentData.TotalCGSTAmount ?? 0);
  const totalSGST = Number(documentData.TotalSGSTAmount ?? 0);
  const totalIGST = Number(documentData.TotalIGSTAmount ?? 0);
  const roundOff = Number(documentData.RoundOff ?? 0);
  const grandTotal = Number(
    documentData.FinalNetAmount ?? documentData.NetAmount ?? (totalItemAmount + totalCGST + totalSGST + totalIGST + roundOff)
  );

  const gstRate = items.length > 0 && items[0].GST ? Number(items[0].GST) : 18;
  const isInterState = totalIGST > 0;

  // Terms and conditions
  const defaultTerms = [
    '1. Quotation valid for only 10 Days.',
    '2. Payment: 100% in Advance.',
    '3. Delivery: 5 to 7 Working Days against payment.',
    '4. All payments should be made in favor of "Scoto Systec Pvt Ltd" payable at Coimbatore.',
    '5. Project Kick start: Immediate after receiving the Advance.',
  ];

  let termsList = defaultTerms;
  const customTerms = documentData.TermsAndConditions || documentData.terms_conditions;
  if (customTerms && String(customTerms).trim()) {
    termsList = String(customTerms)
      .split(/\r?\n|<br\s*\/?>/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // Bulletproof iframe-based printing: Never clips, never shows white/blank page!
  const handlePrint = () => {
    const printEl = document.getElementById('printable-a4-document-root');
    if (!printEl) {
      window.print();
      return;
    }

    // Collect all stylesheets from head
    const headNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    const iframe = document.createElement('iframe');
    iframe.name = 'print_frame';
    iframe.id = 'print_frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow || iframe.contentDocument;
    const doc = frameDoc.document || frameDoc;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${title} - ${transNo || invoiceNo}</title>
          ${headNodes}
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm 6mm 8mm;
            }
            html, body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            }
            #printable-a4-document-root {
              box-shadow: none !important;
              border: none !important;
              max-width: 100% !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${printEl.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1500);
      }
    };

    const images = doc.images;
    let loaded = 0;
    const total = images.length;

    if (total === 0) {
      setTimeout(triggerPrint, 150);
    } else {
      let fired = false;
      const onImgDone = () => {
        loaded += 1;
        if (loaded >= total && !fired) {
          fired = true;
          setTimeout(triggerPrint, 150);
        }
      };
      for (let i = 0; i < total; i++) {
        if (images[i].complete) {
          loaded += 1;
        } else {
          images[i].onload = onImgDone;
          images[i].onerror = onImgDone;
        }
      }
      if (loaded >= total && !fired) {
        fired = true;
        setTimeout(triggerPrint, 150);
      } else {
        setTimeout(() => {
          if (!fired) {
            fired = true;
            triggerPrint();
          }
        }, 800);
      }
    }
  };

  const modalContent = (
    <div
      id="print-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex flex-col items-center p-2 sm:p-4 print:p-0 print:bg-white print:static"
    >
      {/* Print styles injected for clean A4 printing if user presses Ctrl+P */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm 8mm 6mm 8mm;
        }
        @media print {
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          #root {
            display: none !important;
          }
          #print-modal-backdrop {
            position: static !important;
            inset: auto !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            z-index: auto !important;
          }
          #printable-a4-document-root {
            position: static !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            min-height: auto !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Floating Action Header Bar (Hidden during print) */}
      <div className="no-print sticky top-2 z-50 w-full max-w-4xl mb-3 flex items-center justify-between rounded-2xl bg-slate-900/95 border border-slate-700/80 px-4 py-2.5 shadow-2xl text-white backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-indigo-400" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {title} Preview
            </div>
            <div className="font-mono text-sm font-extrabold text-white">
              {transNo || invoiceNo}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onDownloadExcel && (
            <button
              type="button"
              onClick={onDownloadExcel}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600/90 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Download Excel Spreadsheet"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
            title="Print A4 Page or Save as PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Print A4</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* A4 PRINT CANVAS CONTAINER (Exact 210mm proportional width)                 */}
      {/* ========================================================================= */}
      <div
        id="printable-a4-document-root"
        className="w-full max-w-[210mm] bg-white text-slate-900 border border-slate-300 shadow-2xl p-6 sm:p-8 rounded-sm text-[11px] leading-normal font-sans"
        style={{ minHeight: '297mm', boxSizing: 'border-box' }}
      >
        {/* 1. Header with Title & Logo */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
          <div>
            <h1 className="text-2xl font-black tracking-wide text-slate-900 uppercase">
              {title}
            </h1>
            <p className="text-[10px] text-slate-500 tracking-wider font-semibold uppercase mt-0.5">
              Original For Recipient
            </p>
          </div>

          <div className="flex items-center gap-2">
            <img
              src={scotoLogo}
              alt="SCOTO"
              className="h-10 w-auto object-contain"
            />
            {/* <div className="text-right">
              <span className="text-lg font-black tracking-tight text-indigo-950 font-sans block">
                SCOTO
              </span>
              <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase block">
                SYSTEC PVT LTD
              </span>
            </div> */}
          </div>
        </div>

        {/* 2. Client & Service Provider 3-Column Info Grid */}
        <div className="grid grid-cols-12 border border-slate-900 border-t-0 text-[10px]">
          {/* Client Details (Left - 5 cols) */}
          <div className="col-span-5 p-2.5 border-r border-slate-900 flex flex-col justify-between">
            <div>
              <div className="font-extrabold text-[10px] uppercase text-slate-600 tracking-wider underline mb-1">
                Name & Address of Client:
              </div>
              <div className="font-bold text-xs text-slate-900 mb-0.5">
                {customerName || 'Customer'}
              </div>
              {fullAddress && <div className="text-slate-700 leading-tight">{fullAddress}</div>}
              {cityPincode && <div className="text-slate-700">{cityPincode}</div>}
              <div className="font-bold text-slate-900 mt-1.5">
                GSTN: {gstNo && gstNo.toUpperCase() !== 'NA' ? gstNo : 'Unregistered'}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-300 mt-2 font-bold text-slate-800">
              Kind Attn: <span className="font-normal text-slate-900">{kindAttn}</span>
            </div>
          </div>

          {/* Service Provider (Middle - 4 cols) */}
          <div className="col-span-4 p-2.5 border-r border-slate-900 text-slate-700 flex flex-col justify-between">
            <div>
              <div className="font-extrabold text-[10px] uppercase text-slate-600 tracking-wider underline mb-1">
                Service Provider:
              </div>
              <div className="font-bold text-xs text-slate-900">
                SCOTO SYSTEC PRIVATE LIMITED
              </div>
              <div className="leading-tight text-[9.5px] mt-0.5">
                No: 61-A, First Floor, HM Enclave,
                <br />
                Thiruvalluvar Nagar, 50 Feet Road,
                <br />
                Ramanathapuram,
                <br />
                Coimbatore - 641045, India
              </div>
              <div className="font-bold text-slate-900 mt-1">
                GSTN: 33AAVCS5957L1ZF
              </div>
            </div>

            <div className="pt-2 border-t border-slate-300 mt-2 text-[9.5px]">
              <span className="font-bold">Tel:</span> +91 422 4210406
            </div>
          </div>

          {/* Document Reference Box (Right - 3 cols) */}
          <div className="col-span-3 p-2.5 bg-slate-50/60 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div>
                <span className="text-[9px] font-bold uppercase text-slate-500 block">
                  {documentType === 'QUOTATION' ? 'Quote No:' : documentType === 'PROFORMA' ? 'PI No:' : 'Invoice No:'}
                </span>
                <span className="font-mono font-bold text-xs text-slate-900 block truncate">
                  {transNo || invoiceNo}
                </span>
              </div>

              <div>
                <span className="text-[9px] font-bold uppercase text-slate-500 block">Date:</span>
                <span className="font-mono font-bold text-xs text-slate-900 block">
                  {transDate || invoiceDate}
                </span>
              </div>

              {documentType === 'QUOTATION' && (documentData.RevLabel || documentData.RevNo !== undefined) && (
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Revision:</span>
                  <span className="font-mono font-bold text-xs text-indigo-700 block">
                    {documentData.RevLabel || (documentData.RevNo ? `${documentData.RevNo}R` : 'ORIGINAL')}
                  </span>
                </div>
              )}

              {quotationNo && (
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Quotation Ref:</span>
                  <span className="font-mono text-[10px] font-semibold text-slate-800 block truncate">
                    {quotationNo} {quotationDate ? `(${quotationDate})` : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-1.5 border-t border-slate-200 text-[9px] text-slate-500">
              State: Tamil Nadu (33)
            </div>
          </div>
        </div>

        {/* 3. Items Table */}
        <div className="border border-slate-900 border-t-0">
          <table className="w-full text-left border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-slate-100/90 font-bold text-slate-900 border-b border-slate-900 text-[10px] uppercase">
                <th className="py-2 px-2 text-center w-8 border-r border-slate-900">#</th>
                <th className="py-2 px-3 border-r border-slate-900">Description of Goods / Services</th>
                <th className="py-2 px-2 text-center w-18 border-r border-slate-900">HSN/SAC</th>
                <th className="py-2 px-2 text-center w-14 border-r border-slate-900">Qty</th>
                <th className="py-2 px-2 text-right w-20 border-r border-slate-900">Price (₹)</th>
                <th className="py-2 px-3 text-right w-24">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                    No items listed
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => {
                  const prod = it.ProductType || it.ItemCode || it.product_type || '';
                  const hl = it.Prod_highlight || it.prod_highlight || '';
                  const desc = hl && String(hl).trim() !== String(prod).trim()
                    ? `${prod} - ${hl}`
                    : prod;

                  const rate = Number(it.Rate ?? it.rate ?? 0);
                  const qty = Number(it.Qty ?? it.qty ?? 1);
                  const uom = it.UOM || it.uom || 'Pcs';
                  const itemVal = Number(it.ItemValue ?? it.item_value ?? (rate * qty));
                  const hsn = it.HSNCode || it.hsn_code || '-';

                  return (
                    <tr key={it.id || it.order_id || idx} className="align-top">
                      <td className="py-2 px-2 text-center font-mono font-semibold border-r border-slate-900 text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-900 font-medium text-slate-900">
                        <div className="font-semibold text-slate-900">{desc}</div>
                        {it.SerialNo && (
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                            S/N: {it.SerialNo}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono border-r border-slate-900 text-slate-700">
                        {hsn}
                      </td>
                      <td className="py-2 px-2 text-center font-mono border-r border-slate-900 text-slate-900">
                        {qty} <span className="text-[9px] text-slate-500">{uom}</span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono border-r border-slate-900 text-slate-900">
                        {rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                        {itemVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Extra spacing rows if fewer than 3 items to preserve A4 proportion */}
              {items.length < 3 &&
                Array.from({ length: 3 - items.length }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-6">
                    <td className="border-r border-slate-900">&nbsp;</td>
                    <td className="border-r border-slate-900">&nbsp;</td>
                    <td className="border-r border-slate-900">&nbsp;</td>
                    <td className="border-r border-slate-900">&nbsp;</td>
                    <td className="border-r border-slate-900">&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* 4. Totals & Tax Calculation Breakdown */}
        <div className="grid grid-cols-12 border border-slate-900 border-t-0 text-[10.5px]">
          {/* Left spacer / notes (7 cols) */}
          <div className="col-span-7 p-2.5 border-r border-slate-900 bg-slate-50/40 flex flex-col justify-end">
            <div className="text-[9.5px] text-slate-500 italic">
              * Rates quoted are inclusive of standard supply and standard warranty terms.
            </div>
          </div>

          {/* Right Totals Breakdown (5 cols) */}
          <div className="col-span-5 divide-y divide-slate-300">
            <div className="flex justify-between py-1.5 px-3">
              <span className="font-semibold text-slate-700">Sub Total:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{totalItemAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {isInterState ? (
              <div className="flex justify-between py-1.5 px-3">
                <span className="text-slate-700">IGST @ {gstRate}%:</span>
                <span className="font-mono text-slate-900">
                  ₹{totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-1 px-3">
                  <span className="text-slate-700">CGST @ {gstRate / 2}%:</span>
                  <span className="font-mono text-slate-900">
                    ₹{totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 px-3">
                  <span className="text-slate-700">SGST @ {gstRate / 2}%:</span>
                  <span className="font-mono text-slate-900">
                    ₹{totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}

            {roundOff !== 0 && (
              <div className="flex justify-between py-1 px-3 text-[10px]">
                <span className="text-slate-600">Round Off:</span>
                <span className="font-mono text-slate-800">
                  {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                </span>
              </div>
            )}

            <div className="flex justify-between py-2 px-3 bg-slate-100 font-extrabold border-t-2 border-slate-900 text-xs">
              <span className="text-slate-950 uppercase">Grand Total:</span>
              <span className="font-mono text-slate-950">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Amount in Words */}
        <div className="border border-slate-900 border-t-0 p-2.5 bg-slate-50/70 text-[10px] font-bold text-slate-900">
          <span className="uppercase text-slate-600 tracking-wider">Amount in Words: </span>
          <span className="font-mono">{numToIndianWords(grandTotal)}</span>
        </div>

        {/* 6. Company & Bank Details Grid */}
        <div className="grid grid-cols-12 border border-slate-900 border-t-0 text-[10px]">
          {/* Company Registration Details */}
          <div className="col-span-6 p-2.5 border-r border-slate-900 space-y-1">
            <div className="font-bold uppercase text-slate-900 underline">
              SCOTO SYSTEC PVT LTD
            </div>
            <div><span className="font-bold">GSTIN:</span> 33AAVCS5957L1ZF</div>
            <div><span className="font-bold">PAN:</span> AAVCS5957L</div>
            <div className="text-[9px] text-slate-500">Coimbatore Jurisdiction</div>
          </div>

          {/* Bank Payment Details */}
          <div className="col-span-6 p-2.5 space-y-0.5">
            <div className="font-bold uppercase text-slate-900 underline">
              Bank Details for Remittance:
            </div>
            <div className="font-bold text-slate-900">CITY UNION BANK</div>
            <div><span className="font-semibold text-slate-600">A/c Name:</span> SCOTO SYSTEC PRIVATE LIMITED</div>
            <div><span className="font-semibold text-slate-600">A/c No:</span> <strong className="font-mono">510909010084515</strong></div>
            <div><span className="font-semibold text-slate-600">IFSC Code:</span> <strong className="font-mono">CIUB0000214</strong></div>
            <div className="text-[9px] text-slate-500">Branch: Ramanathapuram, Coimbatore</div>
          </div>
        </div>

        {/* 7. Terms & Conditions */}
        <div className="border border-slate-900 border-t-0 p-2.5 text-[9.5px]">
          <div className="font-extrabold uppercase text-slate-900 underline mb-1">
            Terms & Conditions:
          </div>
          <ol className="list-none space-y-0.5 text-slate-700 pl-0">
            {termsList.map((line, idx) => (
              <li key={idx} className="leading-tight">
                {line}
              </li>
            ))}
          </ol>
        </div>

        {/* 8. Authorized Signatory Footer */}
        <div className="border border-slate-900 border-t-0 p-3 flex justify-between items-end">
          <div className="text-[9px] text-slate-400">
            Thank you for your business!
            <br />
            This is a computer-generated document.
          </div>

          <div className="text-center w-52">
            <div className="text-[9.5px] font-bold text-slate-800 uppercase mb-8">
              For SCOTO SYSTEC PVT LTD
            </div>
            <div className="border-t border-slate-400 pt-1 text-[9px] font-bold text-slate-600 uppercase tracking-wider">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default DocumentPrintModal;
