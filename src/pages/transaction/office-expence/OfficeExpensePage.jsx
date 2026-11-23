import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Receipt,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  Calendar,
  Building2,
  Trash2,
  Search,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  CreditCard,
  FileText,
  Filter,
  Layers,
  Tag,
  Coffee,
  Droplets,
  Flower2,
  FileBox,
  Sparkles,
  Wrench,
  Car,
  Compass,
  MoreHorizontal,
  Edit2,
  PieChart,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import {
  useOfficeFundBalance,
  useOfficeTransactions,
  useRecordOfficeCredit,
  useRecordOfficeDebit,
  useDeleteOfficeTransaction,
  useUpdateOfficeTransaction,
  useBatchAddOfficeExpenses,
  useOfficeExpenseMonthlyReport,
} from '../../../api/transactionApi';
import { exportToExcel, readExcelFile, downloadExcelTemplate } from '../../../utils/excelUtils';
import { exportPettyCashLedgerExcel, exportMonthlyReconciliationExcel } from './pettyCashExcelUtils';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';

// Standard Expense Categories supported by Petty Cash Ledger
const EXPENSE_CATEGORIES = [
  'Tea & Snacks',
  'Drinking Water',
  'Flowers',
  'Stationery',
  'Cleaning',
  'Maintenance',
  'Travel',
  'Other',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Rich Category Configuration Matching Web Screen Badges
const CATEGORY_CONFIG = {
  'Tea & Snacks': {
    icon: Coffee,
    textColor: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    barColor: 'bg-amber-500',
    dotColor: 'bg-amber-500',
    pillActive: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
  },
  'Drinking Water': {
    icon: Droplets,
    textColor: 'text-sky-800',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    barColor: 'bg-sky-500',
    dotColor: 'bg-sky-500',
    pillActive: 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
  },
  'Flowers': {
    icon: Flower2,
    textColor: 'text-pink-800',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    barColor: 'bg-pink-500',
    dotColor: 'bg-pink-500',
    pillActive: 'bg-pink-100 text-pink-900 border-pink-300 font-bold',
  },
  'Stationery': {
    icon: FileBox,
    textColor: 'text-indigo-800',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    barColor: 'bg-indigo-500',
    dotColor: 'bg-indigo-500',
    pillActive: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold',
  },
  'Cleaning': {
    icon: Sparkles,
    textColor: 'text-teal-800',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    barColor: 'bg-teal-500',
    dotColor: 'bg-teal-500',
    pillActive: 'bg-teal-100 text-teal-900 border-teal-300 font-bold',
  },
  'Maintenance': {
    icon: Wrench,
    textColor: 'text-orange-800',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    barColor: 'bg-orange-500',
    dotColor: 'bg-orange-500',
    pillActive: 'bg-orange-100 text-orange-900 border-orange-300 font-bold',
  },
  'Travel': {
    icon: Car,
    textColor: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    barColor: 'bg-blue-500',
    dotColor: 'bg-blue-500',
    pillActive: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
  },
  'Other': {
    icon: Tag,
    textColor: 'text-slate-800',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    barColor: 'bg-slate-500',
    dotColor: 'bg-slate-500',
    pillActive: 'bg-slate-200 text-slate-900 border-slate-300 font-bold',
  },
};

const getCategoryMeta = (cat) => {
  return CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['Other'];
};

const getCategoryIcon = (category) => {
  if (category === 'Money Received') {
    return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
  }
  const meta = getCategoryMeta(category);
  const IconComponent = meta.icon;
  return <IconComponent className={`h-4 w-4 ${meta.textColor}`} />;
};

export const OfficeExpensePage = () => {
  const navigate = useNavigate();

  // Date Helpers
  const todayDate = new Date();
  const currentMonthNum = todayDate.getMonth() + 1;
  const currentYearNum = todayDate.getFullYear();
  const todayStr = todayDate.toISOString().split('T')[0];

  const getMonthDateRange = (month, year) => {
    const padMonth = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    return {
      from: `${year}-${padMonth}-01`,
      to: `${year}-${padMonth}-${String(lastDay).padStart(2, '0')}`,
    };
  };

  const initialRange = getMonthDateRange(currentMonthNum, currentYearNum);

  // Unified Period Selection: 'month' (default: Monthly view) | 'custom' (Date range) | 'all' (All history)
  const [periodMode, setPeriodMode] = useState('month');
  const [reportMonth, setReportMonth] = useState(currentMonthNum);
  const [reportYear, setReportYear] = useState(currentYearNum);
  const [filterFromDate, setFilterFromDate] = useState(initialRange.from);
  const [filterToDate, setFilterToDate] = useState(initialRange.to);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'CREDIT' | 'DEBIT'
  const [searchTerm, setSearchTerm] = useState('');
  // Active View Tab: 'ledger' (Ledger Transactions) | 'breakdown' (Category Breakdown)
  const [activeViewTab, setActiveViewTab] = useState('ledger');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const handleSelectMonthYear = (m, y) => {
    setReportMonth(m);
    setReportYear(y);
    const range = getMonthDateRange(m, y);
    setFilterFromDate(range.from);
    setFilterToDate(range.to);
  };

  const handleSetThisMonth = () => {
    setPeriodMode('month');
    handleSelectMonthYear(currentMonthNum, currentYearNum);
  };

  const handleSetCustomRange = () => {
    setPeriodMode('custom');
    if (!filterFromDate || !filterToDate) {
      setFilterFromDate(initialRange.from);
      setFilterToDate(todayStr);
    }
  };

  const handleSetAllHistory = () => {
    setPeriodMode('all');
    setFilterFromDate('');
    setFilterToDate('');
  };

  // Live Petty Cash Balance Query (Overall Account)
  const {
    data: fundBalanceData,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useOfficeFundBalance();

  // Ledger Transactions Query
  const {
    data: rawTransactions = [],
    isLoading: isTransactionsLoading,
    isFetching: isTransactionsFetching,
    refetch: refetchTransactions,
  } = useOfficeTransactions({
    fromDate: filterFromDate || undefined,
    toDate: filterToDate || undefined,
    transactionType: filterType !== 'ALL' ? filterType : undefined,
  });

  // Monthly Report Query
  const {
    data: monthlyReportData,
    isLoading: isReportLoading,
    refetch: refetchMonthlyReport,
  } = useOfficeExpenseMonthlyReport({
    month: reportMonth,
    year: reportYear,
  });

  // Mutations
  const recordCreditMutation = useRecordOfficeCredit();
  const recordDebitMutation = useRecordOfficeDebit();
  const deleteTransactionMutation = useDeleteOfficeTransaction();
  const updateTransactionMutation = useUpdateOfficeTransaction();
  const batchAddExpensesMutation = useBatchAddOfficeExpenses();

  // Modal States
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [editForm, setEditForm] = useState({
    transaction_date: todayStr,
    category: 'Tea & Snacks',
    amount: '',
    party: '',
    quantity: '',
    remarks: '',
  });

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auth User
  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const currentUserName = authUser.name || authUser.username || authUser.user_id || 'Admin';

  // Forms State
  const [creditForm, setCreditForm] = useState({
    transaction_date: todayStr,
    amount: '',
    received_from: 'Owner / Management',
    description: '',
    remarks: '',
  });

  const [debitForm, setDebitForm] = useState({
    expense_date: todayStr,
    category: 'Tea & Snacks',
    product_name: '',
    amount: '',
    quantity: '',
    receiver_name: '',
    description: '',
    remarks: '',
  });

  const [importRows, setImportRows] = useState([]);
  const [importFile, setImportFile] = useState(null);

  // Summary Metrics (Opening Balance + Received Credits - Expenses)
  // 1. Overall Account Balance (From Fund Balance Query)
  const companyOpeningBalance =
    fundBalanceData?.opening_balance !== undefined
      ? Number(fundBalanceData.opening_balance)
      : 0;

  const companyTotalReceived =
    fundBalanceData?.total_received !== undefined
      ? Number(fundBalanceData.total_received)
      : 0;

  const companyTotalExpenses =
    fundBalanceData?.total_expenses !== undefined
      ? Number(fundBalanceData.total_expenses)
      : 0;

  const companyAvailableBalance =
    fundBalanceData?.available_balance !== undefined
      ? Number(fundBalanceData.available_balance)
      : companyOpeningBalance + companyTotalReceived - companyTotalExpenses;
  const availableBalance = companyAvailableBalance;

  // 2. Active View Dynamic Balance Figures
  const isMonthlyView = periodMode === 'month';

  const viewOpeningBalance = isMonthlyView && monthlyReportData?.opening_balance !== undefined
    ? Number(monthlyReportData.opening_balance)
    : companyOpeningBalance;

  // Calculate Running Balance Chronologically for Ledger
  const transactionsWithBalance = useMemo(() => {
    const txList = Array.isArray(rawTransactions) ? rawTransactions : rawTransactions?.data || rawTransactions?.items || [];
    if (!Array.isArray(txList) || txList.length === 0) return [];

    // Sort chronologically ascending to compute correct running balance
    const sorted = [...txList].sort((a, b) => {
      const dateA = new Date(a.TransactionDate).getTime();
      const dateB = new Date(b.TransactionDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (Number(a.TransactionId || a.ExpenseId) || 0) - (Number(b.TransactionId || b.ExpenseId) || 0);
    });

    let currentBalance = viewOpeningBalance;
    const computed = sorted.map((tx) => {
      const amt = Number(tx.Amount || 0);
      const isCredit = String(tx.TransactionType).toUpperCase() === 'CREDIT';
      if (isCredit) {
        currentBalance += amt;
      } else {
        currentBalance -= amt;
      }
      return {
        ...tx,
        isCredit,
        runningBalance: currentBalance,
      };
    });

    // Return descending for user display (latest on top!)
    return computed.reverse();
  }, [rawTransactions, viewOpeningBalance]);

  // Comprehensive Category Breakdown computed from all debit transactions in current period
  const categoryBreakdown = useMemo(() => {
    const map = {};
    let totalExpenseAmount = 0;
    let totalVouchers = 0;

    transactionsWithBalance.forEach((tx) => {
      const isCredit = tx.isCredit || String(tx.TransactionType).toUpperCase() === 'CREDIT';
      if (!isCredit) {
        const cat = tx.Category || 'Other';
        const amt = Number(tx.Amount || 0);
        totalExpenseAmount += amt;
        totalVouchers += 1;

        if (!map[cat]) {
          map[cat] = {
            category: cat,
            amount: 0,
            count: 0,
          };
        }
        map[cat].amount += amt;
        map[cat].count += 1;
      }
    });

    const list = Object.values(map)
      .map((c) => ({
        ...c,
        percentage: totalExpenseAmount > 0 ? (c.amount / totalExpenseAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      list,
      totalExpenseAmount,
      totalVouchers,
      topCategory: list.length > 0 ? list[0] : null,
    };
  }, [transactionsWithBalance]);

  // Filtered Ledger Transactions (category pill + search term)
  const filteredTransactions = useMemo(() => {
    let result = transactionsWithBalance;

    if (selectedCategory !== 'ALL') {
      result = result.filter((tx) => (tx.Category || 'Other') === selectedCategory);
    }

    if (!searchTerm.trim()) return result;
    const term = searchTerm.toLowerCase();
    return result.filter((tx) => {
      return (
        String(tx.Category || '').toLowerCase().includes(term) ||
        String(tx.Description || '').toLowerCase().includes(term) ||
        String(tx.ProductName || '').toLowerCase().includes(term) ||
        String(tx.ReceivedFrom || '').toLowerCase().includes(term) ||
        String(tx.ReceiverName || '').toLowerCase().includes(term) ||
        String(tx.Remarks || '').toLowerCase().includes(term) ||
        String(tx.Amount || '').includes(term)
      );
    });
  }, [transactionsWithBalance, selectedCategory, searchTerm]);

  // Sortable ledger transactions (defaults to latest TransactionDate descending)
  const {
    sortedItems: sortedLedgerTransactions,
    sortConfig: ledgerSortConfig,
    requestSort: requestLedgerSort,
  } = useSortableData(filteredTransactions, { key: 'TransactionDate', direction: 'desc' });

  // Sortable category breakdown list (defaults to highest amount descending)
  const {
    sortedItems: sortedCategoryBreakdown,
    sortConfig: catSortConfig,
    requestSort: requestCatSort,
  } = useSortableData(categoryBreakdown.list, { key: 'amount', direction: 'desc' });

  // Totals for filtered view
  const filteredTotals = useMemo(() => {
    let credits = 0;
    let debits = 0;
    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.Amount || 0);
      if (tx.isCredit) credits += amt;
      else debits += amt;
    });
    return {
      credits,
      debits,
      net: credits - debits,
    };
  }, [filteredTransactions]);

  const viewTotalReceived = isMonthlyView && monthlyReportData?.funds_received !== undefined
    ? Number(monthlyReportData.funds_received)
    : filteredTotals.credits;

  const viewTotalExpenses = isMonthlyView && monthlyReportData?.total_expenses !== undefined
    ? Number(monthlyReportData.total_expenses)
    : filteredTotals.debits;

  const viewClosingBalance = isMonthlyView && monthlyReportData?.closing_balance !== undefined
    ? Number(monthlyReportData.closing_balance)
    : (viewOpeningBalance + filteredTotals.credits - filteredTotals.debits);

  // =========================================================
  // Handlers
  // =========================================================

  // Record Money Received (Credit)
  const handleRecordCredit = async (e) => {
    e.preventDefault();
    const amt = Number(creditForm.amount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid received amount greater than 0.', 'error');
      return;
    }
    if (!creditForm.received_from.trim()) {
      showToast('Received From (Owner/Management) is required.', 'error');
      return;
    }

    try {
      await recordCreditMutation.mutateAsync({
        transaction_date: creditForm.transaction_date,
        amount: amt,
        received_from: creditForm.received_from.trim(),
        description: creditForm.description.trim() || 'Money received from management',
        remarks: creditForm.remarks.trim() || undefined,
      });
      showToast(`Credit of ₹${amt.toFixed(2)} recorded successfully.`);
      setShowCreditModal(false);
      setCreditForm({
        transaction_date: todayStr,
        amount: '',
        received_from: 'Owner / Management',
        description: '',
        remarks: '',
      });
      refetchTransactions();
      refetchBalance();
    } catch (err) {
      showToast(err?.response?.data?.detail || err.message || 'Failed to record credit.', 'error');
    }
  };

  // Record Expense (Debit)
  const handleRecordDebit = async (e) => {
    e.preventDefault();
    const amt = Number(debitForm.amount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid expense amount greater than 0.', 'error');
      return;
    }
    if (!debitForm.product_name.trim() && !debitForm.description.trim()) {
      showToast('Description is required.', 'error');
      return;
    }
    if (amt > availableBalance) {
      showToast(
        `Insufficient funds. Available balance is ₹${availableBalance.toFixed(2)}, cannot spend ₹${amt.toFixed(2)}.`,
        'error'
      );
      return;
    }

    try {
      await recordDebitMutation.mutateAsync({
        expense_date: debitForm.expense_date,
        category: debitForm.category,
        product_name: debitForm.product_name.trim() || debitForm.category,
        amount: amt,
        quantity: debitForm.quantity ? Number(debitForm.quantity) : undefined,
        receiver_name: debitForm.receiver_name.trim() || undefined,
        description: debitForm.description.trim() || debitForm.product_name.trim(),
        remarks: debitForm.remarks.trim() || undefined,
      });
      showToast(`Expense of ₹${amt.toFixed(2)} recorded successfully.`);
      setShowDebitModal(false);
      setDebitForm({
        expense_date: todayStr,
        category: 'Tea & Snacks',
        product_name: '',
        amount: '',
        quantity: '',
        receiver_name: '',
        description: '',
        remarks: '',
      });
      refetchTransactions();
      refetchBalance();
    } catch (err) {
      showToast(err?.response?.data?.detail || err.message || 'Failed to record expense.', 'error');
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (txId) => {
    if (!window.confirm('Are you sure you want to delete this transaction from the ledger?')) return;
    try {
      await deleteTransactionMutation.mutateAsync(txId);
      showToast('Transaction deleted successfully.');
      refetchTransactions();
      refetchBalance();
      refetchMonthlyReport();
    } catch (err) {
      showToast(err?.response?.data?.detail || err.message || 'Failed to delete transaction.', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (tx) => {
    const isCredit = tx.isCredit || String(tx.TransactionType).toUpperCase() === 'CREDIT';
    setEditingTx({ ...tx, isCredit });
    setEditForm({
      transaction_date: tx.TransactionDate || todayStr,
      category: tx.Category || 'Other',
      amount: String(tx.Amount || ''),
      party: isCredit ? (tx.ReceivedFrom || '') : (tx.ReceiverName || ''),
      quantity: tx.Quantity ? String(tx.Quantity) : '',
      remarks: tx.Remarks || '',
    });
  };

  // Save Transaction Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTx) return;
    const amt = Number(editForm.amount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid amount greater than 0.', 'error');
      return;
    }

    const txId = editingTx.TransactionId || editingTx.ExpenseId;
    const isCredit = editingTx.isCredit;

    try {
      await updateTransactionMutation.mutateAsync({
        transactionId: txId,
        payload: {
          transaction_date: editForm.transaction_date,
          amount: amt,
          category: !isCredit ? editForm.category : 'Money Received',
          product_name: !isCredit ? editForm.category : 'Money Received',
          description: !isCredit ? editForm.category : 'Money received from management',
          received_from: isCredit ? editForm.party.trim() || 'Owner / Management' : null,
          receiver_name: !isCredit ? editForm.party.trim() || null : null,
          quantity: !isCredit && editForm.quantity ? Number(editForm.quantity) : null,
          remarks: editForm.remarks.trim() || null,
        },
      });
      showToast(`Transaction #${txId} updated successfully.`);
      setEditingTx(null);
      refetchTransactions();
      refetchBalance();
      refetchMonthlyReport();
    } catch (err) {
      showToast(err?.response?.data?.detail || err.message || 'Failed to update transaction.', 'error');
    }
  };

  // Export Ledger to Excel (Unified & Industry Level)
  const handleExportExcel = async () => {
    if (!filteredTransactions.length) {
      showToast('No ledger records available to export.', 'error');
      return;
    }
    try {
      if (periodMode === 'month' && monthlyReportData) {
        await exportMonthlyReconciliationExcel({
          monthlyReportData,
          reportMonth,
          reportYear,
        });
        showToast(`Monthly reconciliation statement (${MONTH_NAMES[reportMonth - 1]} ${reportYear}) exported!`);
      } else {
        await exportPettyCashLedgerExcel({
          transactions: filteredTransactions,
          openingBalance: viewOpeningBalance,
          totalReceived: viewTotalReceived,
          totalExpenses: viewTotalExpenses,
          availableBalance: viewClosingBalance,
          scopeLabel: periodMode === 'all'
            ? 'All History'
            : `From ${filterFromDate} To ${filterToDate}`,
        });
        showToast('Executive Petty Cash Ledger exported to Excel.');
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast(`Failed to export Excel: ${err.message}`, 'error');
    }
  };

  // Handle Excel File Selected for Batch Import
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    try {
      const data = await readExcelFile(file);
      const parsed = data
        .map((row, idx) => {
          const expenseDate = row['ExpenseDate'] || row['Date'] || todayStr;
          const productName = row['ProductName'] || row['Description'] || row['Item'] || '';
          const category = row['Category'] || 'Other';
          const receiverName = row['ReceiverName'] || row['PaidTo'] || '';
          const amount = Number(row['Amount'] || row['Debit'] || 0);
          const remarks = row['Remarks'] || '';
          return {
            row_no: idx + 1,
            expense_date: expenseDate,
            product_name: String(productName).trim(),
            category: String(category).trim(),
            receiver_name: String(receiverName).trim(),
            amount,
            remarks: String(remarks).trim(),
            isValid: Boolean(productName && amount > 0),
          };
        })
        .filter((r) => r.product_name || r.amount > 0);
      setImportRows(parsed);
      showToast(`Parsed ${parsed.length} rows from Excel.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Confirm Batch Import
  const handleConfirmBatchImport = async () => {
    if (!importRows.length) return;
    const validRows = importRows.filter((r) => r.isValid);
    if (!validRows.length) {
      showToast('No valid expense rows found to import.', 'error');
      return;
    }
    const totalRequired = validRows.reduce((acc, r) => acc + r.amount, 0);
    if (totalRequired > availableBalance) {
      showToast(
        `Insufficient funds. Required: ₹${totalRequired.toFixed(2)}, Available: ₹${availableBalance.toFixed(2)}.`,
        'error'
      );
      return;
    }

    try {
      await batchAddExpensesMutation.mutateAsync({
        items: validRows.map((r) => ({
          expense_date: r.expense_date,
          product_name: r.product_name,
          category: r.category,
          amount: r.amount,
          receiver_name: r.receiver_name || undefined,
          remarks: r.remarks || undefined,
        })),
        created_by: currentUserName,
      });
      showToast(`Imported ${validRows.length} expenses successfully.`);
      setShowImportModal(false);
      setImportRows([]);
      setImportFile(null);
      refetchTransactions();
      refetchBalance();
    } catch (err) {
      showToast(err?.response?.data?.detail || err.message || 'Failed to import expenses.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-semibold shadow-xs transition-all ${toast.type === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="cursor-pointer opacity-70 hover:opacity-100 text-sm font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header & Controls Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Petty Cash & Office Expenses
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                Ledger Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Track money received (Credit), office expenses (Debit), and running balances
            </p>
          </div>
        </div>

        {/* Action Controls: Module Switcher + Credit/Debit Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Module Switcher Pills */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-700 shadow-xs flex items-center gap-1.5"
            >
              <Wallet className="h-3.5 w-3.5 text-indigo-600" />
              <span>Petty Cash</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/transaction/office-expense-management')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Daily Items & Monthly Bills"
            >
              <Receipt className="h-3.5 w-3.5 text-slate-400" />
              <span>Daily Bills</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/transaction/travel-expense')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Travel Claims (Petrol, Food, Room, Bus)"
            >
              <Compass className="h-3.5 w-3.5 text-slate-400" />
              <span>Travel Claims</span>
            </button>
          </div>

          {/* Record Money Received (Credit) Button */}
          <button
            onClick={() => setShowCreditModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
            title="Record Money Received from Owner/Management as Credit"
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>+ Record Credit</span>
          </button>

          {/* Record Expense (Debit) Button */}
          <button
            onClick={() => setShowDebitModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
            title="Record Office Expense as Debit"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>- Record Debit</span>
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards: Adapts to Monthly View or Overall Ledger */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Opening Balance */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Opening Balance
            </span>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-800 tracking-tight font-mono">
              ₹{viewOpeningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {isMonthlyView ? `Brought forward to ${MONTH_NAMES[reportMonth - 1]}` : 'Initial account balance'}
          </p>
        </div>

        {/* Card 2: Total Received (Credit) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Received (Credits)
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-700 tracking-tight font-mono">
              +₹{viewTotalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {isMonthlyView ? `Credits in ${MONTH_NAMES[reportMonth - 1]} ${reportYear}` : 'Total money received from management'}
          </p>
        </div>

        {/* Card 3: Total Expenses (Debit) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Expenses (Debits)
            </span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-rose-700 tracking-tight font-mono">
              ₹{viewTotalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {isMonthlyView ? `Debits in ${MONTH_NAMES[reportMonth - 1]} ${reportYear}` : 'Total office vouchers disbursed'}
          </p>
        </div>

        {/* Card 4: Available / Closing Balance */}
        <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50/70 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              {isMonthlyView ? 'Closing Balance' : 'Available Balance'}
            </span>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-900 tracking-tight font-mono">
              ₹{viewClosingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">
            {isMonthlyView ? `Reconciled for ${MONTH_NAMES[reportMonth - 1]} ${reportYear}` : 'Opening Balance + Credits − Debits'}
          </p>
        </div>
      </div>

      {/* Main Unified Container Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Unified Filter Toolbar */}
        <div className="flex flex-col gap-3.5 border-b border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left: Period View Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Period:</span>
              <div className="inline-flex p-1 bg-slate-200/60 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPeriodMode('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${periodMode === 'month'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Monthly View</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetCustomRange}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${periodMode === 'custom'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>Custom Range</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetAllHistory}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${periodMode === 'all'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>All History</span>
                </button>
              </div>

              {/* Monthly Dropdowns when periodMode === 'month' */}
              {periodMode === 'month' && (
                <div className="flex items-center gap-1.5 pl-2">
                  <select
                    value={reportMonth}
                    onChange={(e) => handleSelectMonthYear(Number(e.target.value), reportYear)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={reportYear}
                    onChange={(e) => handleSelectMonthYear(reportMonth, Number(e.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleSetThisMonth}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${reportMonth === currentMonthNum && reportYear === currentYearNum
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    Current Month
                  </button>
                </div>
              )}

              {/* Custom Date Pickers when periodMode === 'custom' */}
              {periodMode === 'custom' && (
                <div className="flex items-center gap-1.5 pl-2 text-xs">
                  <span className="font-semibold text-slate-500">From:</span>
                  <input
                    type="date"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-slate-800"
                  />
                  <span className="font-semibold text-slate-500 ml-1">To:</span>
                  <input
                    type="date"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Right: Actions (Import & Export Excel) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                title="Batch Import Transactions from Excel"
              >
                <Upload className="h-3.5 w-3.5 text-indigo-600" />
                <span>Import Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-2xs cursor-pointer"
                title="Export Executive Excel Report"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Sub-toolbar: Search + Type Filter + Refresh */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-500">Type:</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="CREDIT">Credits (+ Inflows)</option>
                  <option value="DEBIT">Debits (- Expenses)</option>
                </select>
              </div>

              <span className="text-slate-300">|</span>

              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-900">{filteredTransactions.length}</strong> transactions
                {periodMode === 'month' && ` for ${MONTH_NAMES[reportMonth - 1]} ${reportYear}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-60 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search category, party, notes..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  refetchTransactions();
                  refetchBalance();
                  refetchMonthlyReport();
                }}
                className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer shadow-2xs"
                title="Refresh Ledger"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTransactionsFetching || isReportLoading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Switcher: Ledger Transactions vs Category Breakdown */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveViewTab('ledger')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeViewTab === 'ledger'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Ledger Transactions</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${activeViewTab === 'ledger' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                {filteredTransactions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab('breakdown')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeViewTab === 'breakdown'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
            >
              <PieChart className="h-3.5 w-3.5" />
              <span>Category Breakdown</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${activeViewTab === 'breakdown' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                {categoryBreakdown.list.length} Categories
              </span>
            </button>
          </div>

          {/* Quick Active Category Indicator if filtered in Ledger */}
          {selectedCategory !== 'ALL' && activeViewTab === 'ledger' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold">Filter:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {selectedCategory}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className="hover:text-indigo-900 cursor-pointer ml-1 text-xs font-bold"
                  title="Clear Category Filter"
                >
                  &times;
                </button>
              </span>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* VIEW 1: LEDGER TRANSACTIONS TABLE */}
        {/* ================================================================= */}
        {activeViewTab === 'ledger' && (
          <div>
            {/* Category Quick Filter Pills Strip */}
            {categoryBreakdown.list.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-slate-200/80 bg-slate-50/50 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mr-1">
                  Filter Category:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedCategory === 'ALL'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  All ({transactionsWithBalance.length})
                </button>
                {categoryBreakdown.list.map((cat) => {
                  const meta = getCategoryMeta(cat.category);
                  const Icon = meta.icon;
                  const isSelected = selectedCategory === cat.category;
                  return (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat.category)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border ${isSelected
                          ? `${meta.pillActive} shadow-xs`
                          : `bg-white border-slate-200 text-slate-700 hover:${meta.bgColor}`
                        }`}
                    >
                      <Icon className={`h-3 w-3 ${meta.textColor}`} />
                      <span className="font-medium">{cat.category}</span>
                      <span className="font-mono font-bold opacity-75">
                        ₹{cat.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Unified Ledger Table with Latest on Top */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <SortableHeader
                      title="Date"
                      sortKey="TransactionDate"
                      sortConfig={ledgerSortConfig}
                      onSort={requestLedgerSort}
                      defaultDir="desc"
                      className="px-3.5 py-3"
                    />
                    <SortableHeader
                      title="Type"
                      sortKey={(tx) => (tx.isCredit ? 'CREDIT' : 'DEBIT')}
                      sortConfig={ledgerSortConfig}
                      onSort={requestLedgerSort}
                      align="center"
                      defaultDir="asc"
                      className="px-3.5 py-3"
                    />
                    <SortableHeader
                      title="Category"
                      sortKey="Category"
                      sortConfig={ledgerSortConfig}
                      onSort={requestLedgerSort}
                      defaultDir="asc"
                      className="px-3.5 py-3"
                    />
                    <SortableHeader
                      title="Party / Particulars"
                      sortKey={(tx) => (tx.isCredit ? (tx.ReceivedFrom || '') : (tx.ReceiverName || ''))}
                      sortConfig={ledgerSortConfig}
                      onSort={requestLedgerSort}
                      defaultDir="asc"
                      className="px-3.5 py-3"
                    />
                    <SortableHeader
                      title="Credit (+₹)"
                      sortKey={(tx) => (tx.isCredit ? Number(tx.Amount || 0) : 0)}
                      sortConfig={ledgerSortConfig}
                      onSort={requestLedgerSort}
                      align="right"
                      defaultDir="desc"
                      className="px-3.5 py-3 text-emerald-700"
                    />
                    <SortableHeader
                      title="Debit (-₹)"
                      sortKey={(tx) => (!tx.isCredit ? Number(tx.Amount || 0) : 0)}
                      sortConfig={ledgerSortConfig}
                      onSort={requestLedgerSort}
                      align="right"
                      defaultDir="desc"
                      className="px-3.5 py-3 text-rose-700"
                    />
                    <SortableHeader
                      title="Running Balance"
                      sortKey="runningBalance"
                      sortConfig={ledgerSortConfig}
                      onSort={requestLedgerSort}
                      align="right"
                      defaultDir="desc"
                      className="px-3.5 py-3 font-mono text-slate-900 bg-slate-100"
                    />
                    <th className="px-3.5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isTransactionsLoading || isReportLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-indigo-600" />
                        <p className="font-semibold text-sm">Loading ledger transactions...</p>
                      </td>
                    </tr>
                  ) : sortedLedgerTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Layers className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-700 text-sm">No transactions recorded for this period</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Use "+ Record Credit" or "- Record Debit" to add entries.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    sortedLedgerTransactions.map((tx) => {
                      const isCredit = tx.isCredit;
                      const amt = Number(tx.Amount || 0);
                      const txId = tx.TransactionId || tx.ExpenseId;
                      const catMeta = getCategoryMeta(tx.Category);
                      const CatIcon = catMeta.icon;

                      return (
                        <tr key={txId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3.5 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                            {tx.TransactionDate}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                            {isCredit ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                <ArrowDownLeft className="h-3 w-3" />
                                CREDIT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                <ArrowUpRight className="h-3 w-3" />
                                DEBIT
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-700">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${isCredit
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : `${catMeta.bgColor} ${catMeta.textColor} ${catMeta.borderColor}`
                              }`}>
                              {isCredit ? <ArrowDownLeft className="h-3 w-3" /> : <CatIcon className="h-3 w-3" />}
                              <span>{tx.Category || (isCredit ? 'Cash Top-Up' : 'Other')}</span>
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                            {isCredit ? (
                              <span className="text-emerald-800 font-semibold">
                                From: {tx.ReceivedFrom || 'Owner/Management'}
                              </span>
                            ) : (
                              <span className="font-semibold text-slate-800">
                                {tx.ReceiverName ? `To: ${tx.ReceiverName}` : '-'}
                              </span>
                            )}
                            {tx.Remarks && (
                              <span className="block text-[11px] text-slate-400 italic mt-0.5">
                                {tx.Remarks}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {isCredit ? `+₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                            {!isCredit ? `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 bg-slate-50/50 whitespace-nowrap">
                            ₹{Number(tx.runningBalance !== undefined ? tx.runningBalance : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(tx)}
                                className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-md cursor-pointer hover:bg-indigo-50"
                                title="Edit transaction"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(txId)}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-md cursor-pointer hover:bg-rose-50"
                                title="Delete record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredTransactions.length > 0 && (
                  <tfoot className="bg-slate-100/90 text-xs font-bold text-slate-800 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={4} className="px-3.5 py-3 text-slate-600 uppercase text-[11px]">
                        Period Totals ({filteredTransactions.length} items in view)
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                        +₹{filteredTotals.credits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-rose-700 whitespace-nowrap">
                        ₹{filteredTotals.debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-indigo-900 bg-slate-200/70 whitespace-nowrap">
                        ₹{viewClosingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: CATEGORY BREAKDOWN SECTION (Full Analysis) */}
        {/* ================================================================= */}
        {activeViewTab === 'breakdown' && (
          <div className="p-4 space-y-5">
            {/* Category Analysis Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                  Total Expenses Disbursed
                </span>
                <p className="mt-1 text-xl font-bold font-mono text-rose-900">
                  ₹{categoryBreakdown.totalExpenseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-rose-600 mt-0.5">Across all categories in this period</p>
              </div>

              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                  Active Categories
                </span>
                <p className="mt-1 text-xl font-bold font-mono text-indigo-900">
                  {categoryBreakdown.list.length} Categories
                </p>
                <p className="text-[11px] text-indigo-600 mt-0.5">Categories with expenses logged</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Total Vouchers Logged
                </span>
                <p className="mt-1 text-xl font-bold font-mono text-slate-900">
                  {categoryBreakdown.totalVouchers} Bills / Entries
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Debit transactions recorded</p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Highest Expense Category
                </span>
                <p className="mt-1 text-lg font-bold text-amber-900 truncate">
                  {categoryBreakdown.topCategory ? categoryBreakdown.topCategory.category : 'None'}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5 font-mono">
                  {categoryBreakdown.topCategory
                    ? `₹${categoryBreakdown.topCategory.amount.toFixed(2)} (${categoryBreakdown.topCategory.percentage.toFixed(1)}%)`
                    : 'No expenses'}
                </p>
              </div>
            </div>

            {/* Category Cards Visual Grid */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                Category Distribution Cards
              </h3>
              {categoryBreakdown.list.length === 0 ? (
                <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <PieChart className="h-7 w-7 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600 text-xs">No office expenses found for this period</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Record an expense to view category distribution.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {categoryBreakdown.list.map((c) => {
                    const meta = getCategoryMeta(c.category);
                    const Icon = meta.icon;

                    return (
                      <div
                        key={c.category}
                        className={`rounded-xl border p-3.5 transition-all hover:shadow-xs bg-white ${meta.borderColor}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bgColor} ${meta.borderColor} border`}>
                            <Icon className={`h-4 w-4 ${meta.textColor}`} />
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.bgColor} ${meta.textColor}`}>
                            {c.percentage.toFixed(1)}% Share
                          </span>
                        </div>

                        <h4 className="mt-2.5 text-xs font-bold text-slate-900">{c.category}</h4>

                        <div className="mt-1.5 flex items-baseline justify-between">
                          <span className="text-lg font-bold font-mono text-slate-900">
                            ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {c.count} {c.count === 1 ? 'bill' : 'bills'}
                          </span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`${meta.barColor} h-1.5 rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(100, c.percentage)}%` }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(c.category);
                            setActiveViewTab('ledger');
                          }}
                          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <span>View in Ledger</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Breakdown Table */}
            {categoryBreakdown.list.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                  Detailed Category Expense Statement
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5 text-center w-14">#</th>
                        <SortableHeader
                          title="Expense Category"
                          sortKey="category"
                          sortConfig={catSortConfig}
                          onSort={requestCatSort}
                          defaultDir="asc"
                          className="px-3.5 py-2.5"
                        />
                        <SortableHeader
                          title="Vouchers / Bills"
                          sortKey="count"
                          sortConfig={catSortConfig}
                          onSort={requestCatSort}
                          align="center"
                          defaultDir="desc"
                          className="px-3.5 py-2.5"
                        />
                        <SortableHeader
                          title="Total Spent (₹)"
                          sortKey="amount"
                          sortConfig={catSortConfig}
                          onSort={requestCatSort}
                          align="right"
                          defaultDir="desc"
                          className="px-3.5 py-2.5 text-rose-700"
                        />
                        <SortableHeader
                          title="Share of Outflow"
                          sortKey="percentage"
                          sortConfig={catSortConfig}
                          onSort={requestCatSort}
                          align="right"
                          defaultDir="desc"
                          className="px-3.5 py-2.5 w-32"
                        />
                        <th className="px-3.5 py-2.5 w-40">Distribution</th>
                        <th className="px-3.5 py-2.5 text-center w-28">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {sortedCategoryBreakdown.map((c, idx) => {
                        const meta = getCategoryMeta(c.category);
                        const Icon = meta.icon;

                        return (
                          <tr key={c.category} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3.5 py-2 text-center font-bold text-slate-400 font-mono">
                              #{idx + 1}
                            </td>
                            <td className="px-3.5 py-2 font-semibold text-slate-900">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${meta.bgColor} ${meta.textColor} ${meta.borderColor}`}>
                                <Icon className="h-3 w-3" />
                                <span>{c.category}</span>
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-center font-semibold text-slate-700">
                              {c.count} {c.count === 1 ? 'entry' : 'entries'}
                            </td>
                            <td className="px-3.5 py-2 text-right font-mono font-bold text-rose-700">
                              ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-800">
                              {c.percentage.toFixed(1)}%
                            </td>
                            <td className="px-3.5 py-2">
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`${meta.barColor} h-1.5 rounded-full`}
                                  style={{ width: `${Math.min(100, c.percentage)}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-3.5 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(c.category);
                                  setActiveViewTab('ledger');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                              >
                                <span>Filter</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100/90 text-xs font-bold text-slate-900 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={2} className="px-3.5 py-2.5 uppercase text-[11px] text-slate-600">
                          Total Across All Categories
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {categoryBreakdown.totalVouchers} Entries
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-rose-700">
                          ₹{categoryBreakdown.totalExpenseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono">
                          100.0%
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: RECORD MONEY RECEIVED (CREDIT) */}
      {/* ========================================================= */}
      {showCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-50/70 px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Money Received</h3>
                  <p className="text-[11px] text-emerald-800 font-medium">Petty Cash Inflow / Top-Up (CREDIT)</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreditModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRecordCredit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Received Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={creditForm.transaction_date}
                  onChange={(e) => setCreditForm({ ...creditForm, transaction_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={creditForm.amount}
                  onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Received From */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Received From <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Director, Owner, Management"
                  value={creditForm.received_from}
                  onChange={(e) => setCreditForm({ ...creditForm, received_from: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g., Weekly petty cash replenishment"
                  value={creditForm.description}
                  onChange={(e) => setCreditForm({ ...creditForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Payment Mode (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Cash in hand, Bank withdrawal"
                  value={creditForm.remarks}
                  onChange={(e) => setCreditForm({ ...creditForm, remarks: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreditModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordCreditMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {recordCreditMutation.isPending ? 'Saving...' : 'Save Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RECORD OFFICE EXPENSE (DEBIT) */}
      {/* ========================================================= */}
      {showDebitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-indigo-50/60 px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Office Expense</h3>
                  <p className="text-[11px] text-indigo-700 font-medium">Petty Cash Outflow (DEBIT)</p>
                </div>
              </div>
              <button
                onClick={() => setShowDebitModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRecordDebit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expense Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={debitForm.expense_date}
                    onChange={(e) => setDebitForm({ ...debitForm, expense_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expense Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={debitForm.category}
                    onChange={(e) => setDebitForm({ ...debitForm, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description / Item Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Evening snacks for client meeting, 20L water can"
                  value={debitForm.product_name}
                  onChange={(e) => setDebitForm({ ...debitForm, product_name: e.target.value, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={debitForm.amount}
                    onChange={(e) => setDebitForm({ ...debitForm, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Max Available: <span className="font-bold text-emerald-700 font-mono">₹{availableBalance.toFixed(2)}</span>
                  </p>
                </div>

                {/* Optional Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="e.g., 2, 5, 10"
                    value={debitForm.quantity}
                    onChange={(e) => setDebitForm({ ...debitForm, quantity: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Receiver / Vendor Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receiver / Vendor Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Tea Shop, Water Supplier, Stationery Mart"
                  value={debitForm.receiver_name}
                  onChange={(e) => setDebitForm({ ...debitForm, receiver_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Bill attached, UPI payment"
                  value={debitForm.remarks}
                  onChange={(e) => setDebitForm({ ...debitForm, remarks: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDebitModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordDebitMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {recordDebitMutation.isPending ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* MODAL 4: BATCH IMPORT EXPENSES FROM EXCEL */}
      {/* ========================================================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Import Expenses from Excel</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Upload an Excel file (.xlsx) with columns: <strong>Date, Category, Description, Amount, PaidTo, Remarks</strong>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    downloadExcelTemplate(
                      [
                        {
                          Date: todayStr,
                          Category: 'Tea & Snacks',
                          Description: 'Tea for guests',
                          Amount: 100,
                          PaidTo: 'Tea Shop',
                          Remarks: 'Cash',
                        },
                      ],
                      'Office_Expenses_Template'
                    );
                  }}
                  className=""
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Sample Template</span>
                </button>
              </div>

              <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-indigo-400 transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-file-input"
                />
                <label htmlFor="excel-file-input" className="cursor-pointer block space-y-2">
                  <FileSpreadsheet className="h-8 w-8 mx-auto text-indigo-500" />
                  <p className="text-xs font-bold text-slate-700">
                    {importFile ? importFile.name : 'Click to select or drag and drop Excel sheet'}
                  </p>
                  <p className="text-[11px] text-slate-400">Supports .xlsx, .xls, .csv</p>
                </label>
              </div>

              {/* Preview Rows */}
              {importRows.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importRows.map((r) => (
                        <tr key={r.row_no} className={r.isValid ? '' : 'bg-rose-50/50'}>
                          <td className="px-3 py-1.5 text-slate-400">{r.row_no}</td>
                          <td className="px-3 py-1.5 font-medium">{r.expense_date}</td>
                          <td className="px-3 py-1.5">{r.category}</td>
                          <td className="px-3 py-1.5 font-semibold">{r.product_name}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-rose-700">₹{r.amount.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-center">
                            {r.isValid ? (
                              <span className="text-emerald-600 font-bold text-[10px]">Ready</span>
                            ) : (
                              <span className="text-rose-600 font-bold text-[10px]">Invalid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchImport}
                  disabled={batchAddExpensesMutation.isPending || !importRows.length}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {batchAddExpensesMutation.isPending
                    ? 'Importing...'
                    : `Confirm & Import (${importRows.filter((r) => r.isValid).length} Rows)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: EDIT TRANSACTION (CREDIT / DEBIT) */}
      {/* ========================================================= */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between border-b border-slate-200 px-5 py-3.5 shrink-0 ${editingTx.isCredit ? 'bg-emerald-50/70' : 'bg-rose-50/70'
                }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs ${editingTx.isCredit ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                >
                  {editingTx.isCredit ? (
                    <ArrowDownLeft className="h-5 w-5" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit {editingTx.isCredit ? 'Money Received' : 'Expense Record'}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    Transaction #{editingTx.TransactionId || editingTx.ExpenseId} •{' '}
                    <span
                      className={`font-bold ${editingTx.isCredit ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                    >
                      {editingTx.isCredit ? 'CREDIT' : 'DEBIT'}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={editForm.transaction_date}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, transaction_date: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Category (for Debit) */}
              {!editingTx.isCredit && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expense Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    {[
                      'Tea & Snacks',
                      'Office Stationery',
                      'Courier / Speed Post',
                      'Office Maintenance',
                      'Food / Refreshments',
                      'Water / Utilities',
                      'Hardware / Cleaning',
                      'Printing / Xerox',
                      'Travel Reimbursement',
                      'Miscellaneous',
                      'Other',
                    ].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editForm.amount}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3.5 py-2 text-sm font-bold font-mono text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Party / Details */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingTx.isCredit ? 'Received From (Payer)' : 'Paid To / Handed To'}
                </label>
                <input
                  type="text"
                  value={editForm.party}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, party: e.target.value }))
                  }
                  placeholder={
                    editingTx.isCredit ? 'e.g. Owner / Management' : 'e.g. Ramesh (Peon) / Vendor'
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Quantity (Only for Debit) */}
              {!editingTx.isCredit && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.quantity}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                    placeholder="e.g. 5"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editForm.remarks}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, remarks: e.target.value }))
                  }
                  placeholder="Notes, bill number, or specific purpose..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateTransactionMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {updateTransactionMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeExpensePage;
