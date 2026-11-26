import React, { useState } from 'react';
import {
  Menu,
  RefreshCw,
  Bell,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Building2,
  Calendar,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBackendHealth } from '../../api/attendanceApi';
import { useFinancialYear } from '../../context/FinancialYearContext';
import { LogoutConfirmModal } from '../common/LogoutConfirmModal';
import scotoLogo from '../../assets/Scoto.png';

export const Header = ({ onToggleSidebar, onMenuClick, isSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedFinYear, setSelectedFinYear, availableYears } = useFinancialYear();
  const { refetch: refetchHealth, isFetching: isHealthFetching } = useBackendHealth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Check if current page is in office expense module (which uses natural date ranges, not FY)
  const isOfficeExpensePage =
    location.pathname.toLowerCase().includes('office-expen') ||

    location.pathname.toLowerCase().includes('expense-management') ||

    location.pathname.toLowerCase().includes('/travel-expense');

  // Check if current page is in transaction module or transaction-related reports
  const isTransactionPage =
    (location.pathname.startsWith('/transaction') ||
      location.pathname.startsWith('/reports') ||
      location.pathname === '/tally-upload') &&
    !isOfficeExpensePage;

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

  const handleToggle = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else if (onMenuClick) {
      onMenuClick();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('scoto_auth_user');
    localStorage.removeItem('scoto_auth_token');
    navigate('/auth/login');
  };

  const handleSyncClick = async () => {
    try {
      await refetchHealth();
      setSyncSuccessToast(true);
      setTimeout(() => setSyncSuccessToast(false), 3000);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6">
      {/* Left side: Sidebar Toggle & System Date */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={handleToggle}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          aria-label="Toggle sidebar"
          title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand shown on mobile when sidebar is collapsed */}
        <div className="flex lg:hidden items-center gap-2">
          <div className="flex h-8 w-auto max-w-[110px] items-center justify-center rounded-lg bg-white p-1 border border-slate-200 shadow-2xs">
            <img src={scotoLogo} alt="Scoto ERP" className="h-full w-full object-contain" />
          </div>
          <span className="font-bold text-slate-900 text-xs">ERP</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="text-slate-600 font-mono font-medium">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Right side: Sync Status, Notifications & User Profile Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Sync Success Floating feedback */}
        {!isTransactionPage && syncSuccessToast && (
          <div className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Biometric Services Synchronized</span>
          </div>
        )}

        {/* Conditional Header Control: Financial Year Selector on Transaction Pages, Sync Status on Other Pages */}
        {isTransactionPage ? (
          <div className="flex items-center gap-1.5 bg-slate-100/90 rounded-lg p-1 border border-slate-200 shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-500 ml-1.5 sm:ml-2" />
            <span className="text-xs font-semibold text-slate-600">FY:</span>
            <select
              value={selectedFinYear}
              onChange={(e) => setSelectedFinYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 pr-2 sm:pr-3 py-1 outline-none cursor-pointer"
              title="Select Financial Year"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr === 'ALL' ? 'All Financial Years' : `FY ${yr}`}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <button
            onClick={handleSyncClick}
            disabled={isHealthFetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 hover:border-indigo-300 transition-all disabled:opacity-60 cursor-pointer"
            title="Synchronize real-time biometric and ERP data"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isHealthFetching ? 'animate-spin text-indigo-600' : ''
                }`}
            />
            <span className="hidden sm:inline">
              {isHealthFetching ? 'Synchronizing...' : 'Sync Status'}
            </span>
            <span className="sm:hidden">Sync</span>
          </button>
        )}



        {/* User Profile Controls Menu */}
        <div className="relative pl-1 border-l border-slate-200">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
            }}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
              {userInitials}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {displayRole}
              </div>
            </div>
            <ChevronDown className="hidden md:block h-3.5 w-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">{displayName}</p>
                <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 font-semibold">
                  <ShieldCheck className="h-3 w-3" />
                  <span>{currentUser.designation}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setIsLogoutModalOpen(true);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </header>
  );
};

export default Header;
