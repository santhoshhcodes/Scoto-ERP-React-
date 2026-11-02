import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ScanFace,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  Package,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  CalendarRange,
} from 'lucide-react';
import { StatCard, StatusBadge } from '../../components/common';
import { useDailySummary, useBackendHealth } from '../../api/attendanceApi';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: health } = useBackendHealth();
  const { data: dailySummary = [], isLoading: isDailyLoading } = useDailySummary({
    target_date: todayStr,
  });

  const totalHeadcount = dailySummary.length || 0;
  const fullDayCount = dailySummary.filter(
    (t) => t.status === 'FULL_DAY' || t.status === 'PRESENT_CONFIRMED' || t.status === 'ON_DUTY'
  ).length;
  const halfDayCount = dailySummary.filter((t) => t.status === 'HALF_DAY').length;
  const presentCount = fullDayCount + halfDayCount;
  const lateOrShortCount = dailySummary.filter(
    (t) =>
      t.status === 'SHORT_HOURS' ||
      t.status === 'SINGLE_PUNCH_ANOMALY' ||
      t.status === 'NO_CHECK_IN_REVIEW' ||
      t.status === 'DEVICE_ISSUE'
  ).length;
  const absentCount = dailySummary.filter(
    (t) => t.status === 'ABSENT' || t.status === 'ABSENT_CONFIRMED' || t.status === 'LOP'
  ).length;
  const attendanceRate =
    totalHeadcount > 0 ? Math.round((presentCount / totalHeadcount) * 100) : 0;

  const activePunches = dailySummary.filter((t) => t.first_in);

  const formatTimeOnly = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Heading & Hero Info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations & Attendance Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise overview of daily attendance and master records
          </p>
        </div>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Staff Roster"
          value={`${totalHeadcount} Staff`}
          icon={Users}
          color="indigo"
          trend="Active"
          trendType="neutral"
          changeLabel="Total registered staff"
          onClick={() => navigate('/attendance')}
        />

        <StatCard
          title="Face Verified Today"
          value={`${presentCount} / ${totalHeadcount}`}
          icon={ScanFace}
          color="emerald"
          badge={<span className="text-xs font-semibold text-emerald-600">({attendanceRate}%)</span>}
          trend={`${fullDayCount} Full Day`}
          trendType="up"
          changeLabel="Synchronized with biometric terminals"
          onClick={() => navigate('/attendance')}
        />

        <StatCard
          title="Anomalies / Short Hours"
          value={`${lateOrShortCount} Flags`}
          icon={AlertTriangle}
          color="amber"
          trend={`${absentCount} Absent`}
          trendType={lateOrShortCount > 0 ? 'down' : 'up'}
          changeLabel="Single punches & short duration"
          onClick={() => navigate('/attendance')}
        />

        <StatCard
          title="Terminal Status"
          value={health?.status === 'healthy' ? 'Active' : 'Connecting'}
          icon={CheckCircle2}
          color="purple"
          trend="Real-time"
          trendType="up"
          changeLabel="Biometric service online"
          onClick={() => navigate('/attendance')}
        />
      </div>

      {/* Two Column Grid: Today's Punch Feed & Master Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Attendance Activity (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ScanFace className="h-4 w-4 text-indigo-600" />
                Today's Face Biometric Punches
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff members with verified first-in timestamps for {todayStr}
              </p>
            </div>
            <button
              onClick={() => navigate('/attendance')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              View Full Logs
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {isDailyLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading today's biometric attendance logs...
              </div>
            ) : activePunches.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No biometric punches recorded yet for today ({todayStr}).
              </div>
            ) : (
              activePunches.slice(0, 6).map((item) => (
                <div
                  key={item.employee_code}
                  className="flex items-center justify-between py-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                      {item.employee_name ? item.employee_name.charAt(0).toUpperCase() : 'E'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{item.employee_name}</span>
                        <StatusBadge status={item.status} size="sm" showDot={false} />
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Code: <span className="font-mono text-indigo-600 font-medium">{item.employee_code}</span> • {item.total_punches} punches
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-xs font-semibold text-slate-700">
                      IN: {formatTimeOnly(item.first_in)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      OUT: {formatTimeOnly(item.last_out)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Operations & Master Module Navigation (1 col) */}
        <div className="space-y-6">
          {/* Master Setup Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Master Data Management
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Configure items, inventory, and ledger accounts
            </p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/master/items')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/80 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">Item Master</div>
                    <div className="text-[10px] text-slate-500">Hardware, Biometrics & Products</div>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => navigate('/master/ledgers')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/80 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">Ledger Master</div>
                    <div className="text-[10px] text-slate-500">Suppliers, GST & Banking Details</div>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Attendance Shortcuts */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Attendance Shortcuts
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/attendance/unified-daily')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/80 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>Daily Attendance Desk</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => navigate('/attendance/unified-monthly')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/80 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-indigo-600" />
                  <span>Monthly Attendance Desk</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
