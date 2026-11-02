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
} from 'lucide-react';
import scotoLogo from '../../assets/Scoto.png';
import { authApi } from '../../api/authApi';

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
      const response = await authApi.login({
        userId: userId.trim(),
        password: password,
        companyCode: company,
        locationCode: loc,
        finYearCode: finYear,
      });

      const { access_token, user } = response;

      // Normalize user profile for legacy and new component compatibility
      const normalizedUser = {
        ...user,
        name: user.user_name || user.name || user.user_id || 'User',
        role: user.role_code || user.role || 'SystemAdmin',
        email: user.email || `${(user.user_name || user.user_id || 'user').toLowerCase()}@scoto.io`,
        designation: user.designation || 'Staff',
      };

      // Store session tokens & profile
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

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/60 transition-all">
      {/* Authentic Scoto Enterprise Logo Header */}
      <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100">
        <div className="p-2 flex items-center justify-center max-w-[260px]">
          <img
            src={scotoLogo}
            alt="SCOTO Systec Private Limited"
            className="w-full h-auto object-contain max-h-16"
          />
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 border border-primary-100">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-pulse" />
          Sign in to start your session
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main ERP Form Controls */}
      <form onSubmit={handleLogin} className="mt-5 space-y-4">
        {/* Company Dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Company
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-8 text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 focus:border-primary-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer appearance-none"
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
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-8 text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 focus:border-primary-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer appearance-none"
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
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Financial Year
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={finYear}
              onChange={(e) => setFinYear(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-8 text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 focus:border-primary-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer appearance-none"
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
          <label className="block text-xs font-bold text-slate-700 mb-1">
            User ID
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs font-mono font-medium text-slate-900 placeholder-slate-400 transition-colors hover:border-slate-300 focus:border-primary-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g. ACCSCOTO"
              autoComplete="username"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-10 text-xs font-medium text-slate-900 placeholder-slate-400 transition-colors hover:border-slate-300 focus:border-primary-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Login Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-xs font-bold text-white shadow-md shadow-primary-600/30 hover:bg-primary-700 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
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
    </div>
  );
};

export default LoginPage;


