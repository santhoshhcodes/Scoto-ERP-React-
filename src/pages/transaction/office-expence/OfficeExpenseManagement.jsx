import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Coffee,
  Cookie,
  Droplets,
  Flower2,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  Receipt,
  Download,
  Check,
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  X,
  FileSpreadsheet,
  Wallet,
  AlertTriangle,
  History,
  Copy,
  ShoppingBag,
  Loader2,
  Compass,
} from 'lucide-react';
import { exportToExcel } from '../../../utils/excelUtils';
import { exportDailyOfficeExpenseExcel } from './dailyExpenseExcelUtils';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';
import {
  useOfficeFundBalance,
  useRecordOfficeDebit,
  useDailyItems,
  useCreateDailyItem,
  useUpdateDailyItem,
  useDailyUsage,
  useSaveDailyUsage,
  useDailyRegister,
  useDailyVendorSummary,
  useSettleDailyVendor,
  useDailySettlementHistory,
  expenseApi,
} from '../../../api';

/**
 * Currency formatter (₹)
 */
const money = (val) =>
  `₹${Number(val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Date helpers
const getTodayStr = () => new Date().toLocaleDateString('en-CA');

const getFirstDayOfMonthStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

// Helper to get category/item icon
const getItemIcon = (iconType, className = 'h-5 w-5') => {
  switch (iconType) {
    case 'tea':
      return <Coffee className={`${className} text-amber-600`} />;
    case 'snacks':
      return <Cookie className={`${className} text-orange-600`} />;
    case 'water':
      return <Droplets className={`${className} text-sky-600`} />;
    case 'flower':
      return <Flower2 className={`${className} text-pink-600`} />;
    case 'sparkles':
      return <Sparkles className={`${className} text-teal-600`} />;
    case 'shopping':
      return <ShoppingBag className={`${className} text-indigo-600`} />;
    default:
      return <Tag className={`${className} text-indigo-600`} />;
  }
};

export default function OfficeExpenseManagement() {
  const navigate = useNavigate();

  // ========================================================
  // 1. Cross-Module Sync: Petty Cash Fund Balance & Mutation
  // ========================================================
  const { data: fundBalanceData, refetch: refetchFundBalance } = useOfficeFundBalance();
  const recordDebitMutation = useRecordOfficeDebit();

  const availablePettyCash = useMemo(() => {
    if (!fundBalanceData) return 0;
    if (fundBalanceData.available_balance !== undefined) {
      return Number(fundBalanceData.available_balance);
    }
    const opening = Number(fundBalanceData.opening_balance || 0);
    const rec = Number(fundBalanceData.total_received || 0);
    const exp = Number(fundBalanceData.total_expenses || 0);
    return opening + rec - exp;
  }, [fundBalanceData]);

  // ========================================================
  // 2. Real-Time Date Range Filter (From Date -> To Date)
  // ========================================================
  const [filterFromDate, setFilterFromDate] = useState(getFirstDayOfMonthStr());
  const [filterToDate, setFilterToDate] = useState(getTodayStr());

  // Quick Preset Date Ranges
  const handleSetThisMonth = () => {
    setFilterFromDate(getFirstDayOfMonthStr());
    setFilterToDate(getTodayStr());
  };

  const handleSetLast7Days = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setFilterFromDate(d.toLocaleDateString('en-CA'));
    setFilterToDate(getTodayStr());
  };

  const handleSetTodayOnly = () => {
    const t = getTodayStr();
    setFilterFromDate(t);
    setFilterToDate(t);
  };

  // Derive Period Month for Backend Summary & Settlement History (YYYY-MM)
  const currentPeriodMonth = useMemo(() => {
    return filterFromDate ? filterFromDate.slice(0, 7) : getTodayStr().slice(0, 7);
  }, [filterFromDate]);

  // ========================================================
  // 3. Daily Entry State
  // ========================================================
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // Pending quantities typed into card inputs (form state)
  const [pendingQuantities, setPendingQuantities] = useState({});

  // Visual feedback for cards recently logged
  const [justLoggedItem, setJustLoggedItem] = useState({});
  const [toast, setToast] = useState(null);

  // Tabs: 'daily' | 'register' | 'settlement' | 'history'
  const [activeTab, setActiveTab] = useState('daily');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    rate: '',
    unit: '',
    vendor: '',
    iconType: 'other',
    category: 'Other',
  });

  // Settlement Form State
  const [settlingVendor, setSettlingVendor] = useState(null);
  const [settleForm, setSettleForm] = useState({
    paymentDate: getTodayStr(),
    paymentMethod: 'Cash',
    category: 'Other',
    reference: '',
    remarks: '',
    syncToLedger: true,
  });

  const showNotification = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Close modals on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowItemModal(false);
        setSettlingVendor(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ========================================================
  // 4. PURE API HOOKS & DATA SOURCES (No localStorage, No Mocks)
  // ========================================================

  // A. Items Master API
  const {
    data: rawItemsResponse,
    isLoading: isLoadingItems,
    refetch: refetchItems,
  } = useDailyItems();
  const createItemMutation = useCreateDailyItem();
  const updateItemMutation = useUpdateDailyItem();

  const items = useMemo(() => {
    const list = Array.isArray(rawItemsResponse)
      ? rawItemsResponse
      : rawItemsResponse?.data && Array.isArray(rawItemsResponse.data)
        ? rawItemsResponse.data
        : [];

    return list.map((it) => ({
      id: it.id,
      name: it.name,
      rate: Number(it.rate),
      unit: it.unit || 'unit',
      vendor: it.vendor || 'General Supplier',
      category: it.category || 'Other',
      iconType: it.icon_type || 'other',
      isActive: it.is_active !== false,
    }));
  }, [rawItemsResponse]);

  // B. Daily Usage API (Selected Date)
  const {
    data: serverUsageResponse,
    isLoading: isLoadingUsage,
    refetch: refetchUsage,
  } = useDailyUsage(selectedDate);
  const saveUsageMutation = useSaveDailyUsage();

  const selectedDateEntries = useMemo(() => {
    const usageData = serverUsageResponse?.data || serverUsageResponse;
    const rawEntries = Array.isArray(usageData?.entries) ? usageData.entries : [];
    return rawEntries.map((se) => ({
      id: se.entry_id,
      date: se.expense_date || selectedDate,
      itemId: se.item_id,
      itemName: se.item_name,
      qty: Number(se.quantity),
      rate: Number(se.rate),
      amount: Number(se.amount),
      vendor: se.vendor || 'General Supplier',
      category: se.category || 'Other',
      status: se.status || 'UNSETTLED',
      settlementId: se.settlement_id,
      remarks: se.remarks,
    }));
  }, [serverUsageResponse, selectedDate]);

  // C. Period Register API (From Date -> To Date)
  const {
    data: serverRegisterResponse,
    isLoading: isLoadingRegister,
    refetch: refetchRegister,
  } = useDailyRegister({
    fromDate: filterFromDate,
    toDate: filterToDate,
    search: searchQuery,
  });

  const registerEntries = useMemo(() => {
    const reg = serverRegisterResponse?.data || serverRegisterResponse;
    const list = Array.isArray(reg?.entries) ? reg.entries : [];
    return list.map((e) => ({
      id: e.entry_id,
      date: e.expense_date,
      itemId: e.item_id,
      itemName: e.item_name,
      category: e.category || 'Other',
      qty: Number(e.quantity),
      rate: Number(e.rate),
      amount: Number(e.amount),
      vendor: e.vendor || 'General Supplier',
      status: e.status || 'UNSETTLED',
      settlementId: e.settlement_id,
      remarks: e.remarks,
    }));
  }, [serverRegisterResponse]);

  // D. Vendor Summary API & Settling
  const {
    data: serverVendorResponse,
    isLoading: isLoadingVendors,
    refetch: refetchVendors,
  } = useDailyVendorSummary(currentPeriodMonth);
  const settleVendorMutation = useSettleDailyVendor();

  // E. Settlement History API
  const {
    data: serverHistoryResponse,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useDailySettlementHistory(currentPeriodMonth);

  const settlementHistory = useMemo(() => {
    const list = Array.isArray(serverHistoryResponse)
      ? serverHistoryResponse
      : serverHistoryResponse?.data && Array.isArray(serverHistoryResponse.data)
        ? serverHistoryResponse.data
        : [];

    return list.map((s) => ({
      id: s.settlement_id,
      vendor: s.vendor_name,
      periodMonth: s.period_month,
      amount: Number(s.amount),
      paymentDate: s.payment_date,
      paymentMethod: s.payment_method || 'Cash',
      category: s.category || 'Other',
      fundId: s.fund_id,
      ledgerTransactionId: s.ledger_transaction_id,
      reference: s.reference,
      remarks: s.remarks,
      createdAt: s.created_at,
    }));
  }, [serverHistoryResponse]);

  // ========================================================
  // Sortable tables state - default latest entries first
  // ========================================================
  const {
    sortedItems: sortedDayEntries,
    sortConfig: daySortConfig,
    requestSort: requestDaySort,
  } = useSortableData(selectedDateEntries, { key: 'id', direction: 'desc' });

  const {
    sortedItems: sortedRegisterEntries,
    sortConfig: registerSortConfig,
    requestSort: requestRegisterSort,
  } = useSortableData(registerEntries, { key: 'date', direction: 'desc' });

  const {
    sortedItems: sortedSettlementHistory,
    sortConfig: settlementSortConfig,
    requestSort: requestSettlementSort,
  } = useSortableData(settlementHistory, { key: 'paymentDate', direction: 'desc' });

  // ========================================================
  // 5. Computed Metrics Directly From API Data
  // ========================================================

  // Per-item recorded statistics for selectedDate (from Daily Usage API)
  const itemDayStats = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      const itemEntries = selectedDateEntries.filter((e) => e.itemId === it.id);
      const settled = itemEntries.filter((e) => e.status === 'SETTLED');
      const unsettled = itemEntries.filter((e) => e.status === 'UNSETTLED');

      const settledQty = settled.reduce((sum, e) => sum + Number(e.qty || 0), 0);
      const settledAmt = settled.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const unsettledQty = unsettled.reduce((sum, e) => sum + Number(e.qty || 0), 0);
      const unsettledAmt = unsettled.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      map[it.id] = {
        totalQty: settledQty + unsettledQty,
        totalAmt: settledAmt + unsettledAmt,
        settledQty,
        settledAmt,
        unsettledQty,
        unsettledAmt,
        hasSettled: settledQty > 0,
        hasUnsettled: unsettledQty > 0,
        entries: itemEntries,
      };
    });
    return map;
  }, [items, selectedDateEntries]);

  // Totals recorded for selectedDate
  const selectedDayRecordedTotals = useMemo(() => {
    const usageData = serverUsageResponse?.data || serverUsageResponse;
    const totalAmt = Number(
      usageData?.total_amount !== undefined
        ? usageData.total_amount
        : selectedDateEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    );
    const settledAmt = selectedDateEntries
      .filter((e) => e.status === 'SETTLED')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const unsettledAmt = selectedDateEntries
      .filter((e) => e.status === 'UNSETTLED')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalQty = selectedDateEntries.reduce((sum, e) => sum + Number(e.qty || 0), 0);

    return { totalAmt, settledAmt, unsettledAmt, totalQty, count: selectedDateEntries.length };
  }, [serverUsageResponse, selectedDateEntries]);

  // Pending items currently typed in input boxes
  const pendingSummary = useMemo(() => {
    let sum = 0;
    let count = 0;
    items.forEach((it) => {
      const q = Number(pendingQuantities[it.id] || 0);
      if (q > 0) {
        sum += q * Number(it.rate || 0);
        count += 1;
      }
    });
    return { sum, count };
  }, [items, pendingQuantities]);

  // Period Register Metrics
  const periodMetrics = useMemo(() => {
    const reg = serverRegisterResponse?.data || serverRegisterResponse;
    let totalUnits = 0;
    registerEntries.forEach((e) => {
      totalUnits += Number(e.qty || 0);
    });

    const totalAmt = Number(
      reg?.total_amount !== undefined
        ? reg.total_amount
        : registerEntries.reduce((s, e) => s + e.amount, 0)
    );
    const unsettledAmt = Number(
      reg?.unsettled_amount !== undefined
        ? reg.unsettled_amount
        : registerEntries.filter((e) => e.status === 'UNSETTLED').reduce((s, e) => s + e.amount, 0)
    );
    const settledAmt = totalAmt - unsettledAmt;

    return { totalAmt, settledAmt, unsettledAmt, totalUnits, count: registerEntries.length };
  }, [serverRegisterResponse, registerEntries]);

  // Vendor Summaries for Selected Date Range
  const vendorSummaries = useMemo(() => {
    const map = new Map();
    registerEntries.forEach((e) => {
      const v = e.vendor || 'General Supplier';
      if (!map.has(v)) {
        map.set(v, {
          vendor: v,
          category: e.category || 'Other',
          totalQty: 0,
          totalAmount: 0,
          unsettledAmount: 0,
          settledAmount: 0,
          itemNames: new Set(),
          unsettledEntries: [],
        });
      }
      const data = map.get(v);
      const amt = Number(e.amount || 0);
      data.totalQty += Number(e.qty || 0);
      data.totalAmount += amt;
      if (e.status === 'UNSETTLED') {
        data.unsettledAmount += amt;
        data.unsettledEntries.push(e);
      } else {
        data.settledAmount += amt;
      }
      data.itemNames.add(e.itemName);
    });

    return Array.from(map.values()).map((v) => ({
      ...v,
      itemSummary: Array.from(v.itemNames).join(', '),
    }));
  }, [registerEntries]);

  // Vendor Status Filter in Tab 3 ('all' | 'pending' | 'settled')
  const [vendorFilterStatus, setVendorFilterStatus] = useState('all');

  const filteredVendorSummaries = useMemo(() => {
    if (vendorFilterStatus === 'pending') {
      return vendorSummaries.filter((v) => v.unsettledAmount > 0);
    }
    if (vendorFilterStatus === 'settled') {
      return vendorSummaries.filter((v) => v.unsettledAmount <= 0);
    }
    return vendorSummaries;
  }, [vendorSummaries, vendorFilterStatus]);

  // ========================================================
  // 6. User Action Handlers (All Calling API Functions)
  // ========================================================

  const handlePendingQtyChange = (itemId, val) => {
    setPendingQuantities((prev) => ({ ...prev, [itemId]: val }));
  };

  const handleStepPendingQty = (itemId, delta) => {
    const current = Number(pendingQuantities[itemId] || 0);
    const next = Math.max(0, current + delta);
    setPendingQuantities((prev) => ({ ...prev, [itemId]: next === 0 ? '' : String(next) }));
  };

  const shiftSelectedDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toLocaleDateString('en-CA'));
    setPendingQuantities({});
  };

  // 1. Log a single item directly to API
  const handleLogSingleItem = async (item) => {
    const qtyNum = Number(pendingQuantities[item.id] || 0);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      showNotification(`Please enter a quantity greater than 0 for "${item.name}".`, 'error');
      return;
    }

    // Build map of current unsettled items for selectedDate
    const unsettledMap = new Map();
    selectedDateEntries
      .filter((e) => e.status === 'UNSETTLED')
      .forEach((e) => {
        unsettledMap.set(e.itemId, Number(e.qty || 0));
      });

    // Add new quantity
    const prevQty = unsettledMap.get(item.id) || 0;
    unsettledMap.set(item.id, prevQty + qtyNum);

    const payloadItems = Array.from(unsettledMap.entries()).map(([item_id, quantity]) => ({
      item_id,
      quantity,
    }));

    try {
      await saveUsageMutation.mutateAsync({
        expense_date: selectedDate,
        items: payloadItems,
      });

      // Clear input on this card
      setPendingQuantities((prev) => ({ ...prev, [item.id]: '' }));

      // Flash success check on this item card
      setJustLoggedItem((prev) => ({ ...prev, [item.id]: true }));
      setTimeout(() => {
        setJustLoggedItem((prev) => ({ ...prev, [item.id]: false }));
      }, 1500);

      showNotification(
        `Logged ${qtyNum} ${item.unit || 'units'} of "${item.name}" for ${selectedDate}! (${money(
          qtyNum * Number(item.rate)
        )})`,
        'success'
      );
    } catch (err) {
      showNotification(`Failed to save entry: ${err?.message || 'Server error'}`, 'error');
    }
  };

  // 2. Save all pending quantities entered across cards via API
  const handleSaveAllPending = async () => {
    const itemsToSave = items.filter((it) => Number(pendingQuantities[it.id] || 0) > 0);

    if (itemsToSave.length === 0) {
      showNotification('No pending quantities entered to save.', 'info');
      return;
    }

    // Build map of current unsettled items for selectedDate
    const unsettledMap = new Map();
    selectedDateEntries
      .filter((e) => e.status === 'UNSETTLED')
      .forEach((e) => {
        unsettledMap.set(e.itemId, Number(e.qty || 0));
      });

    // Add each pending quantity
    itemsToSave.forEach((it) => {
      const q = Number(pendingQuantities[it.id]);
      const prev = unsettledMap.get(it.id) || 0;
      unsettledMap.set(it.id, prev + q);
    });

    const payloadItems = Array.from(unsettledMap.entries()).map(([item_id, quantity]) => ({
      item_id,
      quantity,
    }));

    try {
      await saveUsageMutation.mutateAsync({
        expense_date: selectedDate,
        items: payloadItems,
      });

      const totalPendingSum = pendingSummary.sum;
      setPendingQuantities({});

      showNotification(
        `Saved ${itemsToSave.length} pending items for ${selectedDate}! Total: ${money(totalPendingSum)}`,
        'success'
      );
    } catch (err) {
      showNotification(`Failed to save pending items: ${err?.message || 'Server error'}`, 'error');
    }
  };

  // 3. Delete an unsettled entry from today's record via API
  const handleDeleteDayEntry = async (entry) => {
    if (entry.status === 'SETTLED') {
      alert('This entry is part of a SETTLED bill and cannot be deleted.');
      return;
    }

    if (
      !window.confirm(
        `Delete entry "${entry.itemName}" (${entry.qty} units - ${money(entry.amount)})?`
      )
    ) {
      return;
    }

    const remainingItems = selectedDateEntries
      .filter((e) => e.status === 'UNSETTLED' && e.id !== entry.id && e.itemId !== entry.itemId)
      .map((e) => ({
        item_id: e.itemId,
        quantity: Number(e.qty),
      }));

    try {
      await saveUsageMutation.mutateAsync({
        expense_date: selectedDate,
        items: remainingItems,
      });
      showNotification(`Removed "${entry.itemName}" from ${selectedDate}.`);
    } catch (err) {
      showNotification(`Failed to delete entry: ${err?.message}`, 'error');
    }
  };

  // 4. Copy previous day into pending inputs via API
  // const handleCopyPreviousDay = async () => {
  //   const prevDate = new Date(selectedDate);
  //   prevDate.setDate(prevDate.getDate() - 1);
  //   const prevDateStr = prevDate.toLocaleDateString('en-CA');

  //   try {
  //     const prevData = await expenseApi.getDailyUsage(prevDateStr);
  //     const usage = prevData?.data || prevData;
  //     const prevEntries = Array.isArray(usage?.entries) ? usage.entries : [];

  //     if (!prevEntries.length) {
  //       showNotification(`No entries found for previous day (${prevDateStr}) to copy.`, 'info');
  //       return;
  //     }

  //     const map = {};
  //     items.forEach((it) => {
  //       const itPrev = prevEntries.filter((e) => e.item_id === it.id);
  //       const totalPrevQty = itPrev.reduce((sum, e) => sum + Number(e.quantity || 0), 0);
  //       if (totalPrevQty > 0) {
  //         map[it.id] = String(totalPrevQty);
  //       }
  //     });

  //     setPendingQuantities(map);
  //     showNotification(
  //       `Loaded counts from ${prevDateStr} into input fields. Click "Save All Pending" or log individually.`,
  //       'info'
  //     );
  //   } catch (err) {
  //     showNotification(`Could not fetch previous day: ${err?.message}`, 'error');
  //   }
  // };

  const handleClearPending = () => {
    setPendingQuantities({});
  };

  // 5. Item Creation & Editing via API
  const handleOpenItemModal = (itemToEdit = null) => {
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setItemForm({
        name: itemToEdit.name,
        rate: String(itemToEdit.rate),
        unit: itemToEdit.unit,
        vendor: itemToEdit.vendor || '',
        iconType: itemToEdit.iconType || 'other',
        category: itemToEdit.category || 'Other',
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        rate: '',
        unit: '',
        vendor: '',
        iconType: 'other',
        category: 'Other',
      });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const rateNum = Number(itemForm.rate);
    if (!itemForm.name.trim() || !Number.isFinite(rateNum) || rateNum < 0) {
      alert('Please enter a valid item name and unit rate.');
      return;
    }

    const payload = {
      name: itemForm.name.trim(),
      rate: rateNum,
      unit: itemForm.unit.trim() || 'unit',
      vendor: itemForm.vendor.trim() || 'General Supplier',
      icon_type: itemForm.iconType || 'other',
      category: itemForm.category || 'Other',
    };

    try {
      if (editingItem) {
        await updateItemMutation.mutateAsync({
          itemId: editingItem.id,
          payload: { ...payload, is_active: true },
        });
        showNotification(`Updated item: "${itemForm.name.trim()}"`);
      } else {
        await createItemMutation.mutateAsync(payload);
        showNotification(
          `Added new fixed item: "${payload.name}" (${money(payload.rate)} / ${payload.unit})`
        );
      }
      setShowItemModal(false);
    } catch (err) {
      showNotification(`Item save error: ${err?.message || 'Failed to save item'}`, 'error');
    }
  };

  const handleDeleteItem = async (itemId, itemName) => {
    if (!window.confirm(`Deactivate item "${itemName}"?`)) return;
    try {
      const it = items.find((x) => x.id === itemId);
      await updateItemMutation.mutateAsync({
        itemId,
        payload: {
          name: it?.name || itemName,
          rate: it?.rate || 0,
          unit: it?.unit || 'unit',
          vendor: it?.vendor || 'General Supplier',
          category: it?.category || 'Other',
          icon_type: it?.iconType || 'other',
          is_active: false,
        },
      });
      showNotification(`Deactivated item: "${itemName}"`);
    } catch (err) {
      showNotification(`Failed to deactivate item: ${err?.message}`, 'error');
    }
  };

  // 6. Delete entry from register via API
  const handleDeleteRegisterEntry = async (entry) => {
    if (entry.status === 'SETTLED') {
      alert('This entry is part of a SETTLED bill and cannot be deleted.');
      return;
    }
    if (!window.confirm(`Delete entry "${entry.itemName}" from ${entry.date}?`)) return;

    try {
      const dayData = await expenseApi.getDailyUsage(entry.date);
      const usage = dayData?.data || dayData;
      const dayEntries = Array.isArray(usage?.entries) ? usage.entries : [];
      const remainingItems = dayEntries
        .filter((e) => e.status === 'UNSETTLED' && e.item_id !== entry.itemId)
        .map((e) => ({ item_id: e.item_id, quantity: Number(e.quantity) }));

      await saveUsageMutation.mutateAsync({
        expense_date: entry.date,
        items: remainingItems,
      });
      refetchRegister();
      showNotification('Entry removed.');
    } catch (err) {
      showNotification(`Failed to delete entry: ${err?.message}`, 'error');
    }
  };

  // Export Period Register to Industry-Level Item & Vendor Grouped Excel
  const handleExportExcel = async () => {
    if (!registerEntries.length) {
      alert('No entries available in this period to export.');
      return;
    }
    try {
      await exportDailyOfficeExpenseExcel({
        registerEntries,
        vendorSummaries,
        settlementHistory,
        filterFromDate,
        filterToDate,
      });
      showNotification('Executive item-wise Excel register downloaded successfully!');
    } catch (err) {
      console.error('Export Excel failed:', err);
      showNotification(`Failed to export Excel: ${err?.message}`, 'error');
    }
  };

  // 7. Settle Vendor via API
  const handleOpenSettleModal = (vendorData) => {
    setSettlingVendor(vendorData);
    setSettleForm({
      paymentDate: getTodayStr(),
      paymentMethod: 'Cash',
      category: vendorData.category || 'Other',
      reference: '',
      remarks: '',
      syncToLedger: true,
    });
  };

  const handleConfirmSettlement = async (e) => {
    e.preventDefault();
    if (!settlingVendor) return;

    const amt = settlingVendor.unsettledAmount;
    if (amt <= 0) {
      alert('This vendor has no unsettled balance for the selected period.');
      return;
    }

    // Cash balance check
    if (settleForm.paymentMethod === 'Cash' && amt > availablePettyCash) {
      const proceed = window.confirm(
        `Warning: Available petty cash is ₹${availablePettyCash.toFixed(2)}, which is less than this bill of ₹${amt.toFixed(2)}. Proceed anyway?`
      );
      if (!proceed) return;
    }

    try {
      // Direct call to Backend Daily Vendor Settlement Endpoint
      // Note: Backend automatically records settlement AND inserts DEBIT in Petty Cash Ledger with LedgerTransactionId!
      const res = await settleVendorMutation.mutateAsync({
        vendor_name: settlingVendor.vendor,
        period_month: currentPeriodMonth,
        payment_date: settleForm.paymentDate,
        payment_method: settleForm.paymentMethod,
        category: settleForm.category || 'Other',
        fund_id: null,
        reference: settleForm.reference || undefined,
        remarks: settleForm.remarks || undefined,
      });

      refetchFundBalance();
      refetchVendors();
      refetchRegister();
      refetchHistory();
      refetchUsage();

      const txId = res?.ledger_transaction_id || res?.data?.ledger_transaction_id;

      showNotification(
        `Settled ${money(amt)} for ${settlingVendor.vendor} (${currentPeriodMonth})! ${txId ? `Petty cash debited (Tx #${txId}).` : 'Recorded in Petty Cash Ledger.'
        }`,
        'success'
      );
      setSettlingVendor(null);
    } catch (err) {
      console.error('Backend settlement error:', err);
      showNotification(
        `Settlement failed: ${err?.message || 'Server error occurred during settlement'}`,
        'error'
      );
    }
  };

  // Export Settlement History via API data
  const handleExportHistory = () => {
    if (!settlementHistory.length) {
      alert('No settlements recorded yet.');
      return;
    }
    const data = settlementHistory.map((s, idx) => ({
      'S.No': idx + 1,
      'Paid Date': s.paymentDate,
      Vendor: s.vendor,
      'Period Month': s.periodMonth,
      'Amount (₹)': s.amount,
      'Payment Method': s.paymentMethod,
      'Ledger Tx ID': s.ledgerTransactionId || '-',
      'Reference / Voucher': s.reference || '-',
      Remarks: s.remarks || '-',
    }));
    exportToExcel(data, `Vendor_Settlement_History_${currentPeriodMonth}`);
  };

  // Reusable Date Range Filter Toolbar
  const renderDateFilterToolbar = () => (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <Calendar className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>Settlement Period:</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-500 font-semibold">From:</span>
          <input
            type="date"
            value={filterFromDate}
            onChange={(e) => setFilterFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-500 font-semibold">To:</span>
          <input
            type="date"
            value={filterToDate}
            onChange={(e) => setFilterToDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={handleSetThisMonth}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-medium transition-colors cursor-pointer"
        >
          This Month
        </button>
        <button
          type="button"
          onClick={handleSetLast7Days}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-medium transition-colors cursor-pointer"
        >
          Last 7 Days
        </button>
        <button
          type="button"
          onClick={handleSetTodayOnly}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-medium transition-colors cursor-pointer"
        >
          Today
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 w-full text-slate-800 antialiased">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 text-white px-5 py-3.5 text-xs font-semibold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          {toast.type === 'error' ? (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner & Cross-Module Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Daily Office Expenses & Bills
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                Daily Billing
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily items, consumption register, vendor settlements, and Petty Cash integration
            </p>
          </div>
        </div>

        {/* Cross-Module Navigation Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/transaction/office-expense')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Petty Cash Ledger & Money Received"
            >
              <Wallet className="h-3.5 w-3.5 text-slate-400" />
              <span>Petty Cash</span>
              {availablePettyCash !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                  ₹{Number(availablePettyCash).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              )}
            </button>

            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-700 shadow-xs flex items-center gap-1.5"
            >
              <Receipt className="h-3.5 w-3.5 text-indigo-600" />
              <span>Daily Bills</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/transaction/travel-expense')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Travel Expense Claims (Petrol, Food, Room, Bus)"
            >
              <Compass className="h-3.5 w-3.5 text-slate-400" />
              <span>Travel Claims</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenItemModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('daily')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'daily'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Daily Entry</span>
            {isLoadingUsage && <Loader2 className="h-3 w-3 animate-spin" />}
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'register'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Consumption Register</span>
            {isLoadingRegister ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : registerEntries.length > 0 ? (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'register' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
              >
                {registerEntries.length}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('settlement')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'settlement'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Vendor Settlements</span>
            {vendorSummaries.some((v) => v.unsettledAmount > 0) && (
              <span className="flex h-2 w-2 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <History className="h-4 w-4" />
            <span>Payment History ({settlementHistory.length})</span>
          </button>
        </div>

        {/* Live Available Petty Cash Callout */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Petty Cash In Hand:</span>
          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            {money(availablePettyCash)}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DAILY ENTRY "CARDS" SECTION */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Date Selector & Action Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-600" />
                Select Date:
              </span>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => shiftSelectedDate(-1)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setPendingQuantities({});
                  }}
                  className="bg-transparent text-xs font-bold font-mono text-slate-900 px-2 py-1 outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => shiftSelectedDate(1)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedDate(getTodayStr());
                  setPendingQuantities({});
                }}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${selectedDate === getTodayStr()
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                Today
              </button>

              {/* <button
                type="button"
                onClick={handleCopyPreviousDay}
                disabled={items.length === 0}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 px-2 py-1 rounded-lg border border-dashed border-slate-300 hover:border-indigo-300 transition-colors cursor-pointer disabled:opacity-40"
                title="Copy counts from yesterday into pending inputs"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Yesterday</span>
              </button> */}

              {pendingSummary.count > 0 && (
                <button
                  type="button"
                  onClick={handleClearPending}
                  className="text-xs text-slate-400 hover:text-rose-600 px-1.5 py-1 transition-colors cursor-pointer"
                  title="Clear pending input boxes"
                >
                  Clear Inputs
                </button>
              )}
            </div>

            {/* Daily Total & Save Button */}
            <div className="flex flex-wrap items-center justify-between md:justify-end gap-4">
              <div className="text-right">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Recorded for {selectedDate}
                </div>
                <div className="flex items-baseline justify-end gap-2">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {money(selectedDayRecordedTotals.totalAmt)}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    ({selectedDayRecordedTotals.count}{' '}
                    {selectedDayRecordedTotals.count === 1 ? 'entry' : 'entries'})
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2 text-[10px] font-mono mt-0.5">
                  <span className="text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-semibold border border-slate-200" title="Saved to log, pending bill payment to vendor">
                    Unsettled: {money(selectedDayRecordedTotals.unsettledAmt)}
                  </span>
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200" title="Paid and settled to vendor">
                    Settled: {money(selectedDayRecordedTotals.settledAmt)}
                  </span>
                </div>
              </div>

              {pendingSummary.count > 0 ? (
                <button
                  type="button"
                  onClick={handleSaveAllPending}
                  disabled={saveUsageMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all cursor-pointer animate-pulse disabled:opacity-50"
                >
                  {saveUsageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>
                    Save Entered Items ({pendingSummary.count} • {money(pendingSummary.sum)})
                  </span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>All Entries Saved</span>
                </div>
              )}
            </div>
          </div>

          {/* Item Cards Grid / Empty State */}
          {isLoadingItems ? (
            <div className="flex items-center justify-center p-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
              <span className="text-xs font-semibold">Loading items from server...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-300 bg-white shadow-2xs space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Receipt className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">No Expense Items Created Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Add your recurring office expense items (with fixed rates and suppliers) to start
                  recording daily quantities.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenItemModal()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add First Expense Item</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((it) => {
                const stats = itemDayStats[it.id] || {
                  totalQty: 0,
                  totalAmt: 0,
                  settledQty: 0,
                  settledAmt: 0,
                  unsettledQty: 0,
                  unsettledAmt: 0,
                };
                const pendingQtyVal = pendingQuantities[it.id] ?? '';
                const numPendingQty = Number(pendingQtyVal || 0);
                const pendingCost = numPendingQty * Number(it.rate || 0);
                const hasPending = numPendingQty > 0;
                const isJustLogged = Boolean(justLoggedItem[it.id]);

                return (
                  <div
                    key={it.id}
                    className={`relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all ${hasPending
                      ? 'border-indigo-400 bg-white ring-2 ring-indigo-100 shadow-sm'
                      : stats.totalQty > 0
                        ? 'border-slate-300 bg-white shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                  >
                    <div>
                      {/* Card Header: Icon, Name, Vendor, Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                            {getItemIcon(it.iconType)}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 leading-tight">
                              {it.name}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[150px]">
                              {it.vendor || 'General Supplier'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-70 hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => handleOpenItemModal(it)}
                            title="Edit Rate or Name"
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(it.id, it.name)}
                            title="Deactivate Item"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Unit Rate Pill */}
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                        <span>Rate:</span>
                        <span className="font-bold font-mono text-slate-900">
                          ₹{it.rate} / {it.unit || 'unit'}
                        </span>
                      </div>

                      {/* Today's Recorded Status Pill */}
                      <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            Recorded Today:
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {stats.totalQty} {it.unit || 'units'} ({money(stats.totalAmt)})
                          </span>
                        </div>
                        {stats.totalQty > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {stats.settledQty > 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"
                                title="Vendor bill has been paid and settled in Tab 3"
                              >
                                <Check className="h-3 w-3" /> {stats.settledQty} Bill Settled
                              </span>
                            )}
                            {stats.unsettledQty > 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title="Saved in today's daily log. Vendor bill will be settled in Tab 3 (Settle by Date Range)."
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {stats.unsettledQty} Saved (Unsettled Bill)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantity Input + Steppers + Individual Log Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                        <span>+ Add Quantity ({it.unit || 'units'}):</span>
                        {hasPending && (
                          <span className="text-indigo-600 font-bold font-mono text-xs">
                            Cost: {money(pendingCost)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStepPendingQty(it.id, -1)}
                          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-base cursor-pointer"
                        >
                          -
                        </button>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={pendingQtyVal}
                          onChange={(e) => handlePendingQtyChange(it.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleLogSingleItem(it);
                          }}
                          className="h-9 w-full text-center font-mono font-bold text-base rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />

                        <button
                          type="button"
                          onClick={() => handleStepPendingQty(it.id, 1)}
                          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-base cursor-pointer"
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => handleLogSingleItem(it)}
                          disabled={!hasPending || saveUsageMutation.isPending}
                          className={`h-9 px-3.5 shrink-0 flex items-center justify-center rounded-lg font-bold text-xs transition-all cursor-pointer ${isJustLogged
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : hasPending
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          title="Save this item to today's record via API"
                        >
                          {isJustLogged ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Added!
                            </span>
                          ) : (
                            <span>+ Log</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* "+ Add Another Item" Card in Grid */}
              <div
                onClick={() => handleOpenItemModal()}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer min-h-[220px]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-slate-200 text-indigo-600 shadow-xs">
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-800 block">Add New Item</span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Define recurring fixed items
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* Today's Recorded Activity Table */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Recorded Items for {selectedDate}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedDateEntries.length}{' '}
                    {selectedDateEntries.length === 1 ? 'entry' : 'entries'} • Total:{' '}
                    {money(selectedDayRecordedTotals.totalAmt)} (Unsettled:{' '}
                    {money(selectedDayRecordedTotals.unsettledAmt)} | Settled:{' '}
                    {money(selectedDayRecordedTotals.settledAmt)})
                  </p>
                </div>
              </div>

              {selectedDateEntries.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Date Total:</span>
                  <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                    {money(selectedDayRecordedTotals.totalAmt)}
                  </span>
                </div>
              )}
            </div>

            {isLoadingUsage ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                <span>Loading daily entries from server...</span>
              </div>
            ) : selectedDateEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs space-y-1">
                <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">
                  No items recorded yet for {selectedDate}.
                </p>
                <p className="text-[11px] text-slate-400">
                  Type a quantity on any card above and click "+ Log" to record.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <SortableHeader
                        sortKey="itemName"
                        sortConfig={daySortConfig}
                        onSort={requestDaySort}
                        className="py-2.5 px-3"
                      >
                        Item Name
                      </SortableHeader>
                      <SortableHeader
                        sortKey="vendor"
                        sortConfig={daySortConfig}
                        onSort={requestDaySort}
                        className="py-2.5 px-3"
                      >
                        Vendor
                      </SortableHeader>
                      <SortableHeader
                        sortKey="rate"
                        sortConfig={daySortConfig}
                        onSort={requestDaySort}
                        align="right"
                        className="py-2.5 px-3 text-right"
                      >
                        Unit Rate
                      </SortableHeader>
                      <SortableHeader
                        sortKey="qty"
                        sortConfig={daySortConfig}
                        onSort={requestDaySort}
                        align="right"
                        className="py-2.5 px-3 text-right"
                      >
                        Quantity
                      </SortableHeader>
                      <SortableHeader
                        sortKey="amount"
                        sortConfig={daySortConfig}
                        onSort={requestDaySort}
                        align="right"
                        className="py-2.5 px-3 text-right"
                      >
                        Total Amount
                      </SortableHeader>
                      <SortableHeader
                        sortKey="status"
                        sortConfig={daySortConfig}
                        onSort={requestDaySort}
                        align="center"
                        className="py-2.5 px-3 text-center"
                      >
                        Bill Status
                      </SortableHeader>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedDayEntries.map((entry, idx) => (
                      <tr key={entry.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{entry.itemName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{entry.vendor || '-'}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          ₹{entry.rate}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {entry.qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                          {money(entry.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {entry.status === 'SETTLED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="h-3 w-3" /> Bill Settled (Paid)
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              title="Saved in daily record. Vendor bill to be settled in Tab 3."
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Saved (Unsettled Bill)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {entry.status === 'SETTLED' ? (
                            <span
                              className="text-slate-400 text-[10px] font-semibold italic"
                              title="Settled in bill — cannot delete"
                            >
                              Locked
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteDayEntry(entry)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove this entry via API"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REAL-TIME EXPENSE REGISTER (FROM DATE -> TO DATE) */}
      {/* ========================================================================= */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Date Range Toolbar */}
          {renderDateFilterToolbar()}

          {/* Search Bar & Export */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by item, vendor, status..."
                className="h-9 w-full pl-9 pr-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Export Register (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Metric Summary Cards for the selected period */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Period Total</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {money(periodMetrics.totalAmt)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {periodMetrics.totalUnits} items logged
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase">
                Settled Amount
              </div>
              <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5">
                {money(periodMetrics.settledAmt)}
              </div>
              <div className="text-[10px] text-emerald-600 mt-1">Paid to vendors</div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5">
              <div className="text-[11px] font-semibold text-amber-800 uppercase">
                Unsettled / Pending
              </div>
              <div className="text-xl font-bold font-mono text-amber-800 mt-0.5">
                {money(periodMetrics.unsettledAmt)}
              </div>
              <div className="text-[10px] text-amber-600 mt-1">Ready to settle</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                Total Entries
              </div>
              <div className="text-xl font-bold font-mono text-indigo-700 mt-0.5">
                {periodMetrics.count}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">In this date range</div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <SortableHeader
                      sortKey="date"
                      sortConfig={registerSortConfig}
                      onSort={requestRegisterSort}
                      className="px-4 py-3"
                    >
                      Date
                    </SortableHeader>
                    <SortableHeader
                      sortKey="itemName"
                      sortConfig={registerSortConfig}
                      onSort={requestRegisterSort}
                      className="px-4 py-3"
                    >
                      Item Name
                    </SortableHeader>
                    <SortableHeader
                      sortKey="category"
                      sortConfig={registerSortConfig}
                      onSort={requestRegisterSort}
                      className="px-4 py-3"
                    >
                      Category
                    </SortableHeader>
                    <SortableHeader
                      sortKey="qty"
                      sortConfig={registerSortConfig}
                      onSort={requestRegisterSort}
                      align="right"
                      className="px-4 py-3 text-right"
                    >
                      Quantity
                    </SortableHeader>
                    <SortableHeader
                      sortKey="rate"
                      sortConfig={registerSortConfig}
                      onSort={requestRegisterSort}
                      align="right"
                      className="px-4 py-3 text-right"
                    >
                      Rate (₹)
                    </SortableHeader>
                    <SortableHeader
                      sortKey="amount"
                      sortConfig={registerSortConfig}
                      onSort={requestRegisterSort}
                      align="right"
                      className="px-4 py-3 text-right"
                    >
                      Total Cost (₹)
                    </SortableHeader>
                    <SortableHeader
                      sortKey="vendor"
                      sortConfig={registerSortConfig}
                      onSort={requestRegisterSort}
                      className="px-4 py-3"
                    >
                      Vendor / Shop
                    </SortableHeader>
                    <SortableHeader
                      sortKey="status"
                      sortConfig={registerSortConfig}
                      onSort={requestRegisterSort}
                      className="px-4 py-3"
                    >
                      Status
                    </SortableHeader>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingRegister ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                        <span>Loading register from server...</span>
                      </td>
                    </tr>
                  ) : (
                    sortedRegisterEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{row.itemName}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                          {row.category || 'Other'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">
                          {row.qty}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                          ₹{row.rate}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-700">
                          {money(row.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{row.vendor}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.status === 'SETTLED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                          >
                            {row.status === 'SETTLED' ? '✓ Settled' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.status === 'SETTLED' ? (
                            <span className="text-slate-400 text-[10px] italic">Locked</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteRegisterEntry(row)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="Delete entry via API"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                  {!isLoadingRegister && !registerEntries.length && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        No entries recorded between {filterFromDate} and {filterToDate}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VENDOR SETTLEMENT BY DATE RANGE (FROM DATE -> TO DATE) */}
      {/* ========================================================================= */}
      {activeTab === 'settlement' && (
        <div className="space-y-4">
          {/* Date Range Selection Bar */}
          {renderDateFilterToolbar()}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Vendor Bills for Period:{' '}
                <span className="font-mono text-indigo-600">{filterFromDate}</span> to{' '}
                <span className="font-mono text-indigo-600">{filterToDate}</span>
              </h2>
              <p className="text-xs text-slate-500">
                Select any date range above to view accumulated vendor bills and settle them.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setVendorFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${vendorFilterStatus === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                All ({vendorSummaries.length})
              </button>
              <button
                type="button"
                onClick={() => setVendorFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${vendorFilterStatus === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  }`}
              >
                ⏳ Pending ({vendorSummaries.filter((v) => v.unsettledAmount > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setVendorFilterStatus('settled')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${vendorFilterStatus === 'settled'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
              >
                ✓ Settled ({vendorSummaries.filter((v) => v.unsettledAmount <= 0).length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendorSummaries.map((v) => {
              const isSettled = v.unsettledAmount <= 0;
              return (
                <div
                  key={v.vendor}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">{v.vendor}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{v.itemSummary}</p>
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${isSettled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                      >
                        {isSettled ? 'All Settled' : 'Payment Pending'}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Items in this period:</span>
                        <span className="font-mono font-semibold">{v.totalQty}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Period Bill Amount:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {money(v.totalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Already Settled:</span>
                        <span className="font-mono font-semibold text-emerald-700">
                          {money(v.settledAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-100">
                        <span>Pending To Pay:</span>
                        <span
                          className={`font-mono text-base ${isSettled ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                        >
                          {money(v.unsettledAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    {!isSettled ? (
                      <button
                        type="button"
                        onClick={() => handleOpenSettleModal(v)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Settle Bill ({money(v.unsettledAmount)})</span>
                      </button>
                    ) : (
                      <div className="w-full py-2 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                        ✓ Settled for this date range
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {!vendorSummaries.length && (
              <div className="col-span-3 text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
                No vendor expenses logged between {filterFromDate} and {filterToDate}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SETTLEMENT HISTORY TAB */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Date Range Selection Bar */}
          {renderDateFilterToolbar()}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Vendor Settlement Audit History ({currentPeriodMonth})
              </h2>
              <p className="text-xs text-slate-500">
                Audit log of all settled bills from backend database with linked Petty Cash Ledger Transaction IDs.
              </p>
            </div>
            {settlementHistory.length > 0 && (
              <button
                type="button"
                onClick={handleExportHistory}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Export History (.xlsx)</span>
              </button>
            )}
          </div>

          {/* Metric Summary Cards for Settlement History */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                Settlements Completed
              </div>
              <div className="text-xl font-bold font-mono text-indigo-700 mt-0.5">
                {settlementHistory.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">In period month {currentPeriodMonth}</div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase">
                Total Amount Paid
              </div>
              <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5">
                {money(settlementHistory.reduce((s, h) => s + Number(h.amount || 0), 0))}
              </div>
              <div className="text-[10px] text-emerald-600 mt-1">Debited from Petty Cash</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                Period Month
              </div>
              <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                {currentPeriodMonth}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">From settlement period filter</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <SortableHeader
                      sortKey="paymentDate"
                      sortConfig={settlementSortConfig}
                      onSort={requestSettlementSort}
                      className="px-4 py-3"
                    >
                      Paid Date
                    </SortableHeader>
                    <SortableHeader
                      sortKey="vendor"
                      sortConfig={settlementSortConfig}
                      onSort={requestSettlementSort}
                      className="px-4 py-3"
                    >
                      Vendor
                    </SortableHeader>
                    <SortableHeader
                      sortKey="periodMonth"
                      sortConfig={settlementSortConfig}
                      onSort={requestSettlementSort}
                      className="px-4 py-3"
                    >
                      Period Month
                    </SortableHeader>
                    <SortableHeader
                      sortKey="amount"
                      sortConfig={settlementSortConfig}
                      onSort={requestSettlementSort}
                      align="right"
                      className="px-4 py-3 text-right"
                    >
                      Amount Paid
                    </SortableHeader>
                    <SortableHeader
                      sortKey="paymentMethod"
                      sortConfig={settlementSortConfig}
                      onSort={requestSettlementSort}
                      className="px-4 py-3"
                    >
                      Payment Method
                    </SortableHeader>
                    <SortableHeader
                      sortKey="reference"
                      sortConfig={settlementSortConfig}
                      onSort={requestSettlementSort}
                      className="px-4 py-3"
                    >
                      Reference / Remarks
                    </SortableHeader>
                    <SortableHeader
                      sortKey="ledgerTransactionId"
                      sortConfig={settlementSortConfig}
                      onSort={requestSettlementSort}
                      align="center"
                      className="px-4 py-3 text-center"
                    >
                      Ledger Sync
                    </SortableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                        <span>Loading settlement history from server...</span>
                      </td>
                    </tr>
                  ) : (
                    sortedSettlementHistory.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-800">
                          {s.paymentDate}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{s.vendor}</td>
                        <td className="px-4 py-3 font-mono text-indigo-700 font-semibold whitespace-nowrap">
                          {s.periodMonth || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                          {money(s.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {s.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {s.reference ? (
                            <span className="font-mono text-slate-800">{s.reference} </span>
                          ) : null}
                          {s.remarks ? (
                            <span className="text-slate-500">({s.remarks})</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.ledgerTransactionId ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <Check className="h-3 w-3" /> Synced (Tx #{s.ledgerTransactionId})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                              <Check className="h-3 w-3 text-emerald-600" /> Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                  {!isLoadingHistory && !settlementHistory.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        No settlements recorded for period {currentPeriodMonth}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT EXPENSE ITEM */}
      {/* ========================================================================= */}
      {showItemModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowItemModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <form
            onSubmit={handleSaveItem}
            className="w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? 'Edit Fixed Expense Item' : 'New Fixed Expense Item'}
              </h3>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tea, Drinking Water, Cleaning, Newspaper"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fixed Unit Rate (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={itemForm.rate}
                    onChange={(e) => setItemForm({ ...itemForm, rate: e.target.value })}
                    className="w-full h-9 px-3 font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. cup, can, piece, packet, day"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vendor / Supplier Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vendor or Store Name"
                  value={itemForm.vendor}
                  onChange={(e) => setItemForm({ ...itemForm, vendor: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Tea & Snacks">Tea & Snacks</option>
                    <option value="Drinking Water">Drinking Water</option>
                    <option value="Flowers">Flowers</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Card Icon</label>
                  <select
                    value={itemForm.iconType}
                    onChange={(e) => setItemForm({ ...itemForm, iconType: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="tea">☕ Tea / Coffee</option>
                    <option value="snacks">🍪 Snacks</option>
                    <option value="water">💧 Water Can</option>
                    <option value="flower">🌸 Flowers</option>
                    <option value="sparkles">✨ Cleaning</option>
                    <option value="shopping">🛍️ Groceries</option>
                    <option value="other">🏷️ Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                {createItemMutation.isPending || updateItemMutation.isPending
                  ? 'Saving...'
                  : editingItem
                    ? 'Update Item'
                    : 'Create Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SETTLE VENDOR BILL FOR SELECTED DATE RANGE (FROM DATE -> TO DATE) */}
      {/* ========================================================================= */}
      {settlingVendor && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettlingVendor(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <form
            onSubmit={handleConfirmSettlement}
            className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Settle Vendor Bill</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Record payment & update ledger balance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettlingVendor(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* Bill Summary Card with Date Range Period */}
              <div className="rounded-xl bg-gradient-to-br from-indigo-50/80 via-indigo-50/50 to-purple-50/40 border border-indigo-100 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-600">Vendor</div>
                    <div className="text-base font-bold text-slate-900 truncate">{settlingVendor.vendor}</div>
                    <div className="text-xs text-slate-600">{settlingVendor.itemSummary}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Total To Pay</div>
                    <div className="font-mono font-black text-rose-700 text-lg leading-tight">
                      {money(settlingVendor.unsettledAmount)}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-indigo-100/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Settling Period:</span>{' '}
                    <span className="font-mono font-bold text-indigo-900">
                      {filterFromDate} → {filterToDate}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-medium">Unsettled Items:</span>{' '}
                    <span className="font-mono font-bold text-slate-800">
                      {settlingVendor.unsettledEntries.length} entries
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Fields: Payment Date & Method side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={settleForm.paymentDate}
                    onChange={(e) => setSettleForm({ ...settleForm, paymentDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={settleForm.paymentMethod}
                    onChange={(e) => setSettleForm({ ...settleForm, paymentMethod: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Cash">Cash (Petty Cash)</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Live Petty Cash Warning */}
              {settleForm.paymentMethod === 'Cash' && (
                <div
                  className={`rounded-xl p-3 border text-xs ${availablePettyCash >= settlingVendor.unsettledAmount
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50/80 border-amber-200 text-amber-800'
                    }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Available Petty Cash:</span>
                    <span className="font-mono text-sm">{money(availablePettyCash)}</span>
                  </div>
                  {availablePettyCash < settlingVendor.unsettledAmount && (
                    <p className="mt-1 text-[11px] text-amber-700 font-medium">
                      ⚠️ Bill amount exceeds available cash in hand.
                    </p>
                  )}
                </div>
              )}

              {/* Sync with Petty Cash Ledger Checkbox */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="sync-ledger-checkbox"
                  checked={settleForm.syncToLedger}
                  onChange={(e) => setSettleForm({ ...settleForm, syncToLedger: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="sync-ledger-checkbox" className="text-xs text-slate-700 cursor-pointer leading-tight">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    Record Debit in Petty Cash Ledger
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Automatically registers debit in Petty Cash Ledger for {filterFromDate} to {filterToDate} so balances stay in sync.
                  </span>
                </label>
              </div>

              {/* Reference & Remarks side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reference / Voucher No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref / Cash voucher #"
                    value={settleForm.reference}
                    onChange={(e) => setSettleForm({ ...settleForm, reference: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Notes for accounting ledger"
                    value={settleForm.remarks}
                    onChange={(e) => setSettleForm({ ...settleForm, remarks: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setSettlingVendor(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={settleVendorMutation.isPending || recordDebitMutation.isPending}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {settleVendorMutation.isPending || recordDebitMutation.isPending
                  ? 'Settling...'
                  : 'Confirm Settlement'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
