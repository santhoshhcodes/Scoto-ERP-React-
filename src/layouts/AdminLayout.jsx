import React, { useState, useEffect, Component } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

class LayoutErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[LayoutErrorBoundary]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800">
            {this.props.title || 'Component Error'}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Enterprise ERP Layout
 * - Root: Full-screen locked (h-screen w-screen overflow-hidden flex)
 * - Sidebar: Left column, full height from the very top (h-full), NOT covered by header
 * - Right Area: Vertical flex container (flex-1 h-full flex flex-col min-w-0 overflow-hidden)
 *    - Header: Top bar (h-16 w-full shrink-0 border-b)
 *    - Main Content: Independent scroll area (flex-1 h-full overflow-y-auto)
 */
export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 antialiased">
      {/* 1. SIDEBAR: Full height from the very top, Header does NOT cover Sidebar */}
      <LayoutErrorBoundary title="Sidebar Navigation Error">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          onExpand={() => setIsSidebarOpen(true)}
        />
      </LayoutErrorBoundary>

      {/* 2. RIGHT WORKSPACE AREA: Header on top, content below with independent scroll */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        {/* 2A. TOP HEADER (pinned to the top of the right pane) */}
        <LayoutErrorBoundary title="Header Error">
          <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        </LayoutErrorBoundary>

        {/* 2B. MAIN CONTENT AREA (independent scroll for tables & dashboard) */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-slate-50/50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <LayoutErrorBoundary title="Page Error">
              <Outlet />
            </LayoutErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
