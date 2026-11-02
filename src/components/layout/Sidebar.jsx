import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanFace,
  Building2,
  LogOut,
  ShieldCheck,
  X,
  Package,
  BookOpen,
  ChevronDown,
  Layers,
  FileText,
  Receipt,
  Repeat,
  CheckSquare,
  Truck,
  Printer,
  ChevronRight,
  UserCheck,
  DollarSign,
  Users,
  Clock,
  ShieldAlert,
  FileSpreadsheet,
  Wallet,
  CalendarRange,
  Compass,
  PieChart,
} from 'lucide-react';
import scotoLogo from '../../assets/Scoto.png';

const CORE_NAVIGATION = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
];

// Retired previous flow references kept intact in files (AttendancePage, ManualAttendancePage, ManualLateFinePage)
const ATTENDANCE_NAVIGATION = [
  {
    name: 'Daily Desk',
    path: '/attendance/unified-daily',
    icon: ShieldCheck,
    badge: 'Daily',
    subtitle: 'Unified Punches & Fines',
  },
  {
    name: 'Monthly Desk',
    path: '/attendance/unified-monthly',
    icon: CalendarRange,
    badge: 'Monthly',
    subtitle: 'Monthly Report & 1-31 Sheet',
  },
  {
    name: 'Employees',
    path: '/attendance/employees',
    icon: Users,
    badge: null,
    subtitle: 'Staff Directory & Add New',
  },
];

const MASTER_NAVIGATION = [
  {
    name: 'Item Master',
    path: '/master/items',
    icon: Package,
    subtitle: 'Inventory & Biometrics',
  },
  {
    name: 'Ledger Master',
    path: '/master/ledgers',
    icon: BookOpen,
    subtitle: 'Accounts & Compliance',
  },
];

const QUOTATION_SUB_NAVIGATION = [
  {
    name: 'Quotation',
    path: '/transaction/quotation',
    icon: FileText,
  },
  {
    name: 'Quotation Approval',
    path: '/transaction/quotation-approval',
    icon: CheckSquare,
  },
  {
    name: 'Proforma Invoice',
    path: '/transaction/proforma-invoice',
    icon: FileText,
  },
  {
    name: 'Proforma Invoice Approval',
    path: '/transaction/proforma-invoice-approval',
    icon: CheckSquare,
  },
  {
    name: 'Delivery Challan',
    path: '/transaction/delivery-challan',
    icon: Truck,
  },
];

const SALES_INVOICE_SUB_NAVIGATION = [
  {
    name: 'Sales Invoice',
    path: '/transaction/sales-invoice',
    icon: Printer,
  },
  {
    name: 'Sales Invoice Approval',
    path: '/transaction/sales-invoice-approval',
    icon: CheckSquare,
  },
];

const EXPENSE_SUB_NAVIGATION = [
  {
    name: 'Petty Cash Ledger',
    path: '/transaction/office-expense',
    icon: Wallet,
  },
  {
    name: 'Expense Management',
    path: '/transaction/office-expense-management',
    icon: Receipt,
  },
  {
    name: 'Travel Expenses',
    path: '/transaction/travel-expense',
    icon: Compass,
  },
];

export const Sidebar = ({
  isOpen = true,
  onClose,
  onExpand,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Unified open state
  const isExpanded = isOpen ?? isMobileOpen ?? true;

  // Active route checks
  const isAttendanceActive =
    location.pathname.startsWith('/attendance') ||
    location.pathname.startsWith('/employee');

  const isMasterActive =
    location.pathname.startsWith('/master') ||
    location.pathname.includes('/master/items') ||
    location.pathname.includes('/master/ledgers');

  const isQuotationActive =
    location.pathname.includes('/transaction/quotation') ||
    location.pathname.includes('/transaction/proforma') ||
    location.pathname.includes('/transaction/delivery');

  const isSalesInvoiceActive = location.pathname.includes('/transaction/sales-invoice');
  const isTallyActive = location.pathname.includes('/transaction/tally') || location.pathname.includes('/tally-upload');
  const isOfficeExpenseActive =
    location.pathname.includes('/transaction/office-expense') ||
    location.pathname.includes('/transaction/office-expence') ||
    location.pathname.includes('/transaction/office-expense-management') ||
    location.pathname.includes('/transaction/OfficeExpenseManagement') ||
    location.pathname.includes('/transaction/travel-expense');

  const isTransactionActive =
    location.pathname.startsWith('/transaction') ||
    isQuotationActive ||
    isSalesInvoiceActive ||
    isTallyActive ||
    isOfficeExpenseActive;

  // Accordion dropdown states (mutually exclusive, closed by default unless on active route)
  const [isAttendanceDropdownOpen, setIsAttendanceDropdownOpen] = useState(isAttendanceActive);
  const [isMasterDropdownOpen, setIsMasterDropdownOpen] = useState(isMasterActive);
  const [isTransactionDropdownOpen, setIsTransactionDropdownOpen] = useState(isTransactionActive);
  const [isQuotationMenuOpen, setIsQuotationMenuOpen] = useState(isQuotationActive);
  const [isSalesInvMenuOpen, setIsSalesInvMenuOpen] = useState(isSalesInvoiceActive);
  const [isExpenseMenuOpen, setIsExpenseMenuOpen] = useState(isOfficeExpenseActive);

  // Synchronize open states ONLY when route changes to an active route
  useEffect(() => {
    if (isAttendanceActive) {
      setIsAttendanceDropdownOpen(true);
      setIsMasterDropdownOpen(false);
      setIsTransactionDropdownOpen(false);
      setIsQuotationMenuOpen(false);
      setIsSalesInvMenuOpen(false);
      setIsExpenseMenuOpen(false);
    } else if (isMasterActive) {
      setIsMasterDropdownOpen(true);
      setIsAttendanceDropdownOpen(false);
      setIsTransactionDropdownOpen(false);
      setIsQuotationMenuOpen(false);
      setIsSalesInvMenuOpen(false);
      setIsExpenseMenuOpen(false);
    } else if (isSalesInvoiceActive) {
      setIsTransactionDropdownOpen(true);
      setIsAttendanceDropdownOpen(false);
      setIsMasterDropdownOpen(false);
      setIsSalesInvMenuOpen(true);
      setIsQuotationMenuOpen(false);
      setIsExpenseMenuOpen(false);
    } else if (isQuotationActive) {
      setIsTransactionDropdownOpen(true);
      setIsAttendanceDropdownOpen(false);
      setIsMasterDropdownOpen(false);
      setIsQuotationMenuOpen(true);
      setIsSalesInvMenuOpen(false);
      setIsExpenseMenuOpen(false);
    } else if (isTallyActive) {
      setIsTransactionDropdownOpen(true);
      setIsAttendanceDropdownOpen(false);
      setIsMasterDropdownOpen(false);
      setIsQuotationMenuOpen(false);
      setIsSalesInvMenuOpen(false);
      setIsExpenseMenuOpen(false);
    } else if (isOfficeExpenseActive) {
      setIsTransactionDropdownOpen(true);
      setIsAttendanceDropdownOpen(false);
      setIsMasterDropdownOpen(false);
      setIsQuotationMenuOpen(false);
      setIsSalesInvMenuOpen(false);
      setIsExpenseMenuOpen(true);
    }
  }, [
    location.pathname,
    isAttendanceActive,
    isMasterActive,
    isTransactionActive,
    isQuotationActive,
    isSalesInvoiceActive,
    isOfficeExpenseActive,
  ]);

  // Attendance click handler: in collapsed rail, expands sidebar & opens Attendance; in expanded, toggles Attendance
  const handleAttendanceClick = () => {
    if (!isExpanded) {
      if (onExpand) onExpand();
      setIsAttendanceDropdownOpen(true);
      setIsMasterDropdownOpen(false);
      setIsTransactionDropdownOpen(false);
      setIsQuotationMenuOpen(false);
      setIsSalesInvMenuOpen(false);
      return;
    }
    setIsAttendanceDropdownOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsMasterDropdownOpen(false);
        setIsTransactionDropdownOpen(false);
        setIsQuotationMenuOpen(false);
        setIsSalesInvMenuOpen(false);
      }
      return next;
    });
  };

  // Master click handler: in collapsed rail, expands sidebar & opens Master; in expanded, toggles Master & closes others
  const handleMasterClick = () => {
    if (!isExpanded) {
      if (onExpand) onExpand();
      setIsMasterDropdownOpen(true);
      setIsAttendanceDropdownOpen(false);
      setIsTransactionDropdownOpen(false);
      setIsQuotationMenuOpen(false);
      setIsSalesInvMenuOpen(false);
      return;
    }
    setIsMasterDropdownOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsAttendanceDropdownOpen(false);
        setIsTransactionDropdownOpen(false);
        setIsQuotationMenuOpen(false);
        setIsSalesInvMenuOpen(false);
      }
      return next;
    });
  };

  // Transaction click handler: in collapsed rail, expands sidebar & opens Transaction (with sub-modules CLOSED); in expanded, toggles Transaction
  const handleTransactionClick = () => {
    if (!isExpanded) {
      if (onExpand) onExpand();
      setIsTransactionDropdownOpen(true);
      setIsAttendanceDropdownOpen(false);
      setIsMasterDropdownOpen(false);
      setIsQuotationMenuOpen(false);
      setIsSalesInvMenuOpen(false);
      return;
    }
    setIsTransactionDropdownOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsAttendanceDropdownOpen(false);
        setIsMasterDropdownOpen(false);
        setIsQuotationMenuOpen(false);
        setIsSalesInvMenuOpen(false);
      }
      return next;
    });
  };

  // Sub-Module Toggles under Transaction (One closes the other)
  const handleToggleQuotation = () => {
    setIsQuotationMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsSalesInvMenuOpen(false);
        setIsExpenseMenuOpen(false);
      }
      return next;
    });
  };

  const handleToggleSalesInvoice = () => {
    setIsSalesInvMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsQuotationMenuOpen(false);
        setIsExpenseMenuOpen(false);
      }
      return next;
    });
  };

  const handleToggleExpense = () => {
    setIsExpenseMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsQuotationMenuOpen(false);
        setIsSalesInvMenuOpen(false);
      }
      return next;
    });
  };

  // Core nav click: expand sidebar if collapsed, close modules
  const handleCoreNavClick = () => {
    if (!isExpanded && onExpand) {
      onExpand();
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('scoto_auth_user');
    localStorage.removeItem('scoto_auth_token');
    navigate('/auth/login');
  };

  let currentUser = {
    name: 'Admin',
    role: 'SystemAdmin',
    email: 'admin@scoto.io',
    designation: 'Manager',
  };
  try {
    const userStr = localStorage.getItem('scoto_auth_user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      currentUser = {
        ...parsed,
        name: parsed.name || parsed.user_name || parsed.user_id || 'Admin',
        role: parsed.role || parsed.role_code || 'SystemAdmin',
        email: parsed.email || `${(parsed.user_name || parsed.user_id || 'admin').toLowerCase()}@scoto.io`,
        designation: parsed.designation || 'Staff',
      };
    }
  } catch {
    // fallback
  }

  const displayName = currentUser.name || 'Admin';
  const displayRole = (currentUser.role || 'User').replace(/_/g, ' ');
  const userInitials = (displayName || 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
        aria-label="Close sidebar backdrop"
      />

      {/* Main Enterprise ERP Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out lg:static shrink-0 border-r border-slate-800 select-none shadow-xl ${
          isExpanded
            ? 'w-64 translate-x-0'
            : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        {/* Brand Header */}
        <div
          onClick={() => {
            if (!isExpanded && onExpand) onExpand();
          }}
          className={`flex h-16 shrink-0 items-center justify-between border-b border-slate-800/90 px-3.5 bg-slate-950/40 ${
            !isExpanded ? 'cursor-pointer hover:bg-slate-800/50' : ''
          }`}
          title={!isExpanded ? 'Click to expand sidebar' : undefined}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-md shadow-purple-900/30">
              <img src={scotoLogo} alt="Scoto Logo" className="h-full w-full object-contain" />
            </div>

            {/* Expanded ERP Suite Branding */}
            {isExpanded && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-tight text-white text-sm">
                    SCOTO
                  </span>
                  <span className="rounded bg-primary-500/20 px-1.5 py-0.5 text-[9px] font-bold text-primary-300 border border-primary-500/30 uppercase tracking-wide">
                    ERP
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-400 tracking-wider">
                  Systec Private Ltd
                </p>
              </div>
            )}
          </div>

          {/* Close Icon for Mobile Drawer */}
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden transition-colors cursor-pointer"
              title="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar">

          {/* Group 1: Core Dashboard */}
          <div className="space-y-1">
            {CORE_NAVIGATION.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={!isExpanded ? item.name : undefined}
                  onClick={handleCoreNavClick}
                  className={({ isActive }) =>
                    `group relative flex items-center rounded-xl transition-all cursor-pointer ${
                      isExpanded
                        ? 'justify-between px-3.5 py-2.5 text-sm font-medium'
                        : 'justify-center p-3 text-sm'
                    } ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-5 w-5 shrink-0 transition-colors ${
                            isActive
                              ? 'text-white'
                              : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        {isExpanded && <span className="truncate">{item.name}</span>}
                      </div>

                      {/* Mini Sidebar Flyout Tooltip */}
                      {!isExpanded && (
                        <div className="absolute left-full ml-3 hidden rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block z-50 whitespace-nowrap border border-slate-800 pointer-events-none">
                          {item.name}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Group 2: Attendance Module Folder */}
          <div className="space-y-1">
            {isExpanded ? (
              /* In Expanded View: Interactive Tree Accordion */
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleAttendanceClick}
                  className={`w-full group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    isAttendanceActive || isAttendanceDropdownOpen
                      ? 'bg-slate-800/90 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ScanFace
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        isAttendanceActive
                          ? 'text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span>Attendance</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      isAttendanceDropdownOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {/* Sub-Tree Links for Attendance Options */}
                {isAttendanceDropdownOpen && (
                  <div className="ml-4 pl-3 py-1 space-y-1 border-l-2 border-slate-700/80 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
                    {ATTENDANCE_NAVIGATION.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => {
                            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                              handleClose();
                            }
                          }}
                          className={({ isActive }) =>
                            `group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <div className="flex items-center gap-2.5 truncate">
                              <SubIcon
                                className={`h-4 w-4 shrink-0 transition-colors ${
                                  isActive
                                    ? 'text-white'
                                    : 'text-slate-400 group-hover:text-slate-200'
                                }`}
                              />
                              <span className="truncate">{subItem.name}</span>
                            </div>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* In Collapsed Rail Mode: Clicking Expands the Sidebar and Opens Attendance */
              <div className="relative flex justify-center">
                <button
                  type="button"
                  onClick={handleAttendanceClick}
                  title="Attendance - Click to open"
                  className={`group relative flex items-center justify-center p-3 rounded-xl transition-all cursor-pointer ${
                    isAttendanceActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <ScanFace
                    className={`h-5 w-5 shrink-0 ${
                      isAttendanceActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />

                  {/* Active Indicator Dot */}
                  {isAttendanceActive && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                  )}

                  {/* Tooltip on Hover */}
                  <div className="absolute left-full ml-3 hidden rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block z-50 whitespace-nowrap border border-slate-800 pointer-events-none">
                    Attendance Module
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Group 3: Master Setup & Records */}
          <div className="space-y-1">
            {isExpanded ? (
              /* In Expanded View: Interactive Tree Accordion */
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleMasterClick}
                  className={`w-full group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    isMasterActive || isMasterDropdownOpen
                      ? 'bg-slate-800/90 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        isMasterActive
                          ? 'text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span>Master</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      isMasterDropdownOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {/* Sub-Tree Links for Item & Ledger */}
                {isMasterDropdownOpen && (
                  <div className="ml-4 pl-3 py-1 space-y-1 border-l-2 border-slate-700/80 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
                    {MASTER_NAVIGATION.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => {
                            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                              handleClose();
                            }
                          }}
                          className={({ isActive }) =>
                            `group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <div className="flex items-center gap-2.5 truncate">
                              <SubIcon
                                className={`h-4 w-4 shrink-0 transition-colors ${
                                  isActive
                                    ? 'text-white'
                                    : 'text-slate-400 group-hover:text-slate-200'
                                }`}
                              />
                              <span className="truncate">{subItem.name}</span>
                            </div>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* In Collapsed Rail Mode: Clicking Expands the Sidebar and Opens Master */
              <div className="relative flex justify-center">
                <button
                  type="button"
                  onClick={handleMasterClick}
                  title="Master (Item & Ledger) - Click to open"
                  className={`group relative flex items-center justify-center p-3 rounded-xl transition-all cursor-pointer ${
                    isMasterActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Layers
                    className={`h-5 w-5 shrink-0 ${
                      isMasterActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />

                  {/* Active Indicator Dot */}
                  {isMasterActive && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                  )}

                  {/* Tooltip on Hover */}
                  <div className="absolute left-full ml-3 hidden rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block z-50 whitespace-nowrap border border-slate-800 pointer-events-none">
                    Master Data
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Group 4: Transaction Module */}
          <div className="space-y-1">
            {isExpanded ? (
              /* In Expanded View: Interactive Tree Accordion */
              <div className="space-y-1">
                {/* Main Transaction Toggle */}
                <button
                  type="button"
                  onClick={handleTransactionClick}
                  className={`w-full group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    isTransactionActive || isTransactionDropdownOpen
                      ? 'bg-slate-800/90 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Repeat
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        isTransactionActive
                          ? 'text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span>Transaction</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      isTransactionDropdownOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {/* Sub-Tree containing Quotation Sub-Menu & Sales Invoice Sub-Menu (Mutually exclusive) */}
                {isTransactionDropdownOpen && (
                  <div className="ml-3 pl-2.5 py-1 space-y-2 border-l-2 border-slate-700/80 transition-all duration-200 animate-in fade-in slide-in-from-top-1">

                    {/* 1. Quotation Sub-Menu Treeview */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={handleToggleQuotation}
                        className={`w-full group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          isQuotationActive || isQuotationMenuOpen
                            ? 'bg-slate-800 text-indigo-300'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Quotation</span>
                        </div>
                        <ChevronDown
                          className={`h-3 w-3 text-slate-400 transition-transform ${
                            isQuotationMenuOpen ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </button>

                      {isQuotationMenuOpen && (
                        <div className="ml-3 pl-2 py-0.5 space-y-1 border-l border-slate-700">
                          {QUOTATION_SUB_NAVIGATION.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <NavLink
                                key={subItem.path}
                                to={subItem.path}
                                onClick={() => {
                                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                    handleClose();
                                  }
                                }}
                                className={({ isActive }) =>
                                  `group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                  }`
                                }
                              >
                                <SubIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{subItem.name}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. Sales Invoice Sub-Menu Treeview */}
                    <div className="space-y-1 pt-1">
                      <button
                        type="button"
                        onClick={handleToggleSalesInvoice}
                        className={`w-full group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          isSalesInvoiceActive || isSalesInvMenuOpen
                            ? 'bg-slate-800 text-emerald-300'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Sales Invoice</span>
                        </div>
                        <ChevronDown
                          className={`h-3 w-3 text-slate-400 transition-transform ${
                            isSalesInvMenuOpen ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </button>

                      {isSalesInvMenuOpen && (
                        <div className="ml-3 pl-2 py-0.5 space-y-1 border-l border-slate-700">
                          {SALES_INVOICE_SUB_NAVIGATION.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <NavLink
                                key={subItem.path}
                                to={subItem.path}
                                onClick={() => {
                                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                    handleClose();
                                  }
                                }}
                                className={({ isActive }) =>
                                  `group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                  }`
                                }
                              >
                                <SubIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{subItem.name}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 3. Tally Upload Direct Link */}
                    <div className="pt-1 border-t border-slate-800/80">
                      <NavLink
                        to="/transaction/tally-upload"
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                            handleClose();
                          }
                        }}
                        className={({ isActive }) =>
                          `w-full group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                          }`
                        }
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-3.5 w-3.5 text-amber-400" />
                          <span>Tally Upload</span>
                        </div>
                       
                      </NavLink>
                    </div>

                    {/* 3.1 Customer Wise Report Link */}
                    <div className="pt-1 border-t border-slate-800/80">
                      <NavLink
                        to="/transaction/customer-report"
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                            handleClose();
                          }
                        }}
                        className={({ isActive }) =>
                          `w-full group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                          }`
                        }
                      >
                        <div className="flex items-center gap-2">
                          <PieChart className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Customer Report</span>
                        </div>
                      </NavLink>
                    </div>

                    {/* 4. Office Expense Sub-Menu Treeview */}
                    <div className="space-y-1 pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={handleToggleExpense}
                        className={`w-full group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          isOfficeExpenseActive || isExpenseMenuOpen
                            ? 'bg-slate-800 text-rose-300'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Wallet className="h-3.5 w-3.5 text-rose-400" />
                          <span>Office Expense</span>
                        </div>
                        <ChevronDown
                          className={`h-3 w-3 text-slate-400 transition-transform ${
                            isExpenseMenuOpen ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </button>

                      {isExpenseMenuOpen && (
                        <div className="ml-3 pl-2 py-0.5 space-y-1 border-l border-slate-700">
                          {EXPENSE_SUB_NAVIGATION.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <NavLink
                                key={subItem.path}
                                to={subItem.path}
                                onClick={() => {
                                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                    handleClose();
                                  }
                                }}
                                className={({ isActive }) =>
                                  `group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-rose-600 text-white shadow-xs font-semibold'
                                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                  }`
                                }
                              >
                                <SubIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{subItem.name}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            ) : (
              /* In Collapsed Rail Mode: Clicking Expands the Sidebar and Opens Transaction */
              <div className="relative flex justify-center">
                <button
                  type="button"
                  onClick={handleTransactionClick}
                  title="Transaction - Click to open"
                  className={`group relative flex items-center justify-center p-3 rounded-xl transition-all cursor-pointer ${
                    isTransactionActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Repeat
                    className={`h-5 w-5 shrink-0 ${
                      isTransactionActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />

                  {/* Active Indicator Dot */}
                  {isTransactionActive && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                  )}

                  {/* Tooltip on Hover */}
                  <div className="absolute left-full ml-3 hidden rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block z-50 whitespace-nowrap border border-slate-800 pointer-events-none">
                    Transaction
                  </div>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="border-t border-slate-800/80 p-3 shrink-0 bg-slate-950/30">
          {isExpanded ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-900/80 p-2.5 border border-slate-800/70">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-700 text-xs font-bold text-white shadow-xs">
                  {userInitials}
                </div>
                <div className="truncate">
                  <div className="truncate text-xs font-semibold text-white">
                    {displayName}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-indigo-300 font-medium">
                    <ShieldCheck className="h-3 w-3 shrink-0" />
                    <span className="truncate">{displayRole}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-700 text-xs font-bold text-white shadow-xs"
                title={`${displayName} (${displayRole})`}
              >
                {userInitials}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
