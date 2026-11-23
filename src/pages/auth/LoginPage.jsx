import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  User,
  Building,
  MapPin,
  Calendar,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ShieldCheck,
  KeyRound,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import scotoLogo from '../../assets/Scoto.png';
import { authApi } from '../../api/authApi';
import ResetPasswordModal from './ResetPasswordModal';
import { getOrCreateDeviceId, getBrowserInfo } from '../../utils/deviceUtils';

const DEFAULT_COMPANIES = [
  { id: 'SCT', name: 'SCOTO SYSTEC PRIVATE LTD' },
];

const DEFAULT_LOCATIONS = [
  { id: 'UNIT I', name: 'UNIT I' },
];

const DEFAULT_FINANCIAL_YEARS = [
  { id: '2', name: '2025_2026' },
  { id: '1', name: '2024_2025' },
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('signin'); // 'signin' or 'activate'

  const [companyList, setCompanyList] = useState(DEFAULT_COMPANIES);
  const [locationList, setLocationList] = useState(DEFAULT_LOCATIONS);
  const [finYearList, setFinYearList] = useState(DEFAULT_FINANCIAL_YEARS);

  const [company, setCompany] = useState('SCT');
  const [loc, setLoc] = useState('UNIT I');
  const [finYear, setFinYear] = useState('2');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 2FA Adaptive Device Verification State
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [twoFaOtp, setTwoFaOtp] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // First-Time Activation States (Tab 2)
  const [actStep, setActStep] = useState(1); // 1: Enter ID -> 2: Enter OTP & New Password -> 3: Success
  const [actUserId, setActUserId] = useState('');
  const [actOtp, setActOtp] = useState('');
  const [actNewPassword, setActNewPassword] = useState('');
  const [actConfirmPassword, setActConfirmPassword] = useState('');
  const [showActPassword, setShowActPassword] = useState(false);
  const [actMaskedEmail, setActMaskedEmail] = useState('');

  // Modal for Forgot Password
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const destination = location.state?.from?.pathname || '/dashboard';

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    const token = localStorage.getItem('scoto_auth_token');
    const userStr = localStorage.getItem('scoto_auth_user');
    if (token && userStr) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Load dynamic metadata from FastAPI backend
  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const meta = await authApi.getAuthMeta({ companyCode: company, locationCode: loc });
        if (!isMounted) return;
        if (meta?.companies?.length) {
          setCompanyList(meta.companies);
          if (!meta.companies.some((c) => c.id === company)) {
            setCompany(meta.companies[0].id);
          }
        }
        if (meta?.locations?.length) {
          setLocationList(meta.locations);
          if (!meta.locations.some((l) => l.id === loc)) {
            setLoc(meta.locations[0].id);
          }
        }
        if (meta?.financial_years?.length) {
          setFinYearList(meta.financial_years);
          if (!meta.financial_years.some((f) => f.id === finYear)) {
            setFinYear(meta.financial_years[0].id);
          }
        }
      } catch {
        // Retain fallback defaults
      }
    };
    fetchMetadata();
    return () => {
      isMounted = false;
    };
  }, [company, loc]);

  // Store session tokens and navigate
  const finalizeLogin = (access_token, user) => {
    const normalizedUser = {
      ...user,
      name: user.user_name || user.name || user.user_id || 'User',
      role: user.role_code || user.role || 'SystemAdmin',
      email: user.email || `${(user.user_name || user.user_id || 'user').toLowerCase()}@scoto.io`,
      designation: user.designation || 'Staff',
    };

    localStorage.setItem('scoto_auth_token', access_token);
    localStorage.setItem('scoto_auth_user', JSON.stringify(normalizedUser));
    localStorage.setItem(
      'scoto_company',
      JSON.stringify({ id: user.company_code || company, name: user.company_name || company })
    );
    localStorage.setItem(
      'scoto_location',
      JSON.stringify({ id: user.location_code || loc, name: user.location_name || loc })
    );
    localStorage.setItem(
      'scoto_fin_year',
      JSON.stringify({ id: user.fin_year_code || finYear, name: user.fin_year || finYear })
    );

    navigate(destination, { replace: true });
  };

  // -------------------------------------------------------------
  // TAB 1: SIGN IN (With Adaptive 2FA Device Challenge)
  // -------------------------------------------------------------
  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');

    if (!userId.trim()) {
      setError('Please enter User ID');
      return;
    }
    if (!password.trim()) {
      setError('Please enter Password');
      return;
    }

    setLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const browserAgent = getBrowserInfo();

      const response = await authApi.login({
        userId: userId.trim(),
        password: password,
        companyCode: company,
        locationCode: loc,
        finYearCode: finYear,
        deviceId: deviceId,
        browserAgent: browserAgent,
      });

      // Check if Adaptive 2FA is triggered on new browser/device
      if (response?.requires_2fa) {
        setIs2FARequired(true);
        setMaskedEmail(response.email_masked || 'your registered email');
        setTwoFaOtp('');
        return;
      }

      // Normal trusted device login
      finalizeLogin(response.access_token, response.user);
    } catch (err) {
      const errMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Invalid credentials or unable to connect to server.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Verify 2FA OTP for New Device
  const handleVerifyDeviceOtp = async (e) => {
    e?.preventDefault();
    setError('');

    if (!twoFaOtp.trim() || twoFaOtp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const browserAgent = getBrowserInfo();

      const response = await authApi.verifyDeviceOtp({
        userId: userId.trim(),
        companyCode: company,
        locationCode: loc,
        finYearCode: finYear,
        otpCode: twoFaOtp.trim(),
        deviceId: deviceId,
        browserAgent: browserAgent,
      });

      finalizeLogin(response.access_token, response.user);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: FIRST-TIME ACCOUNT ACTIVATION
  // -------------------------------------------------------------
  const handleRequestActivationOtp = async (e) => {
    e?.preventDefault();
    setError('');

    if (!actUserId.trim()) {
      setError('Please enter your assigned User ID.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.firstTimeActivate({
        userId: actUserId.trim(),
        companyCode: company,
        locationCode: loc,
      });

      setActMaskedEmail(response.email_masked || 'your registered email');
      setActStep(2);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to dispatch activation code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteActivation = async (e) => {
    e?.preventDefault();
    setError('');

    if (!actOtp.trim() || actOtp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    if (!actNewPassword || actNewPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (actNewPassword !== actConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await authApi.activateAccount({
        userId: actUserId.trim(),
        companyCode: company,
        locationCode: loc,
        otpCode: actOtp.trim(),
        newPassword: actNewPassword,
      });

      setActStep(3);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to activate account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/60 transition-all">
      {/* Enterprise Scoto Logo Header */}
      <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100">
        <div className="p-2 flex items-center justify-center max-w-[260px]">
          <img
            src={scotoLogo}
            alt="SCOTO Systec Private Limited"
            className="w-full h-auto object-contain max-h-16"
          />
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
          Enterprise Resource Portal
        </div>
      </div>

      {/* Modern Industry Dual Tab Switcher */}
      <div className="mt-5 grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => {
            setActiveTab('signin');
            setError('');
            setIs2FARequired(false);
          }}
          className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'signin'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('activate');
            setError('');
            setActStep(1);
          }}
          className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'activate'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          First-Time Setup
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Global Success Banner */}
      {successMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-700 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: SIGN IN VIEW                                          */}
      {/* ============================================================ */}
      {activeTab === 'signin' && (
        <>
          {/* Normal Login Form vs 2FA Device Verification */}
          {!is2FARequired ? (
            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              {/* Company Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-8 text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none"
                  >
                    {companyList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Location Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={loc}
                    onChange={(e) => setLoc(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-8 text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none"
                  >
                    {locationList.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Financial Year Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Financial Year</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={finYear}
                    onChange={(e) => setFinYear(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-8 text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none"
                  >
                    {finYearList.map((fy) => (
                      <option key={fy.id} value={fy.id}>
                        {fy.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* User ID Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">User ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs font-mono font-medium text-slate-900 placeholder-slate-400 uppercase transition-colors hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. ADMIN or SUPERADMIN"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-10 text-xs font-medium text-slate-900 placeholder-slate-400 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Adaptive 2FA Device Verification Form */
            <form onSubmit={handleVerifyDeviceOtp} className="mt-5 space-y-4">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-950">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>New Browser / Machine Verification</span>
                </div>
                <p className="mt-1 text-[11px] text-indigo-800/80 leading-relaxed">
                  We detected a login from a new browser. A 6-digit OTP code has been sent to{' '}
                  <b className="font-semibold">{maskedEmail}</b>. Enter it below to trust this device.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter 6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={twoFaOtp}
                    onChange={(e) => setTwoFaOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-center text-lg font-bold font-mono tracking-widest text-slate-900 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setIs2FARequired(false)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  ← Back to Login
                </button>
                <button
                  type="submit"
                  disabled={loading || twoFaOtp.length !== 6}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Trust Device & Sign In'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* TAB 2: FIRST-TIME SETUP (Strictly for Pre-Existing DB Users)  */}
      {/* ============================================================ */}
      {activeTab === 'activate' && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">New Employee / Admin?</span><br />
            Accounts are created by your Super Administrator. Enter your assigned User ID below to receive your activation OTP and set your private password.
          </div>

          {/* Act Step 1: Enter User ID & Request OTP */}
          {actStep === 1 && (
            <form onSubmit={handleRequestActivationOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-8 text-xs font-medium text-slate-800 cursor-pointer appearance-none"
                  >
                    {companyList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={loc}
                    onChange={(e) => setLoc(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-8 text-xs font-medium text-slate-800 cursor-pointer appearance-none"
                  >
                    {locationList.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Assigned User ID
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={actUserId}
                    onChange={(e) => setActUserId(e.target.value.toUpperCase())}
                    placeholder="e.g. EMP1024"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs font-mono font-medium text-slate-900 uppercase hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !actUserId.trim()}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Verifying Account...' : 'Send Activation OTP Code'}
              </button>
            </form>
          )}

          {/* Act Step 2: Enter OTP & Set New Password */}
          {actStep === 2 && (
            <form onSubmit={handleCompleteActivation} className="space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <Mail className="h-4 w-4 text-indigo-600" />
                  <span>Activation Code Sent</span>
                </div>
                <p className="mt-1 text-[11px] text-indigo-800/80">
                  We sent a 6-digit code to <b className="font-semibold">{actMaskedEmail}</b>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={actOtp}
                  onChange={(e) => setActOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-3 text-center text-base font-bold font-mono tracking-widest text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Set Your Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showActPassword ? 'text' : 'password'}
                    required
                    value={actNewPassword}
                    onChange={(e) => setActNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-10 text-xs font-medium text-slate-900 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowActPassword(!showActPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showActPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showActPassword ? 'text' : 'password'}
                    required
                    value={actConfirmPassword}
                    onChange={(e) => setActConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-10 text-xs font-medium text-slate-900 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setActStep(1)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || actOtp.length !== 6 || !actNewPassword || actNewPassword !== actConfirmPassword}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? 'Activating...' : 'Activate & Save Password'}
                </button>
              </div>
            </form>
          )}

          {/* Act Step 3: Success Screen */}
          {actStep === 3 && (
            <div className="text-center py-6 space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Account Activated Successfully!
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Your password has been saved. You can now use your User ID and new password to sign in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setUserId(actUserId);
                  setPassword('');
                  setActiveTab('signin');
                  setSuccessMsg(`Account for ${actUserId} is active. Sign in below.`);
                  setTimeout(() => setSuccessMsg(''), 6000);
                }}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Proceed to Sign In
              </button>
            </div>
          )}
        </div>
      )}

      {/* Forgot Password Reset Modal */}
      <ResetPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        company={company}
        loc={loc}
        initialUserId={userId}
        mode="reset"
        onSuccess={(id) => {
          setUserId(id);
          setPassword('');
          setError('');
          setSuccessMsg('Password updated. Please sign in with your new credentials.');
          setTimeout(() => setSuccessMsg(''), 5000);
        }}
      />
    </div>
  );
};

export default LoginPage;
