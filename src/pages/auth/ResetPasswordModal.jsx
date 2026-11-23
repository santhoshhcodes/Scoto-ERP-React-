import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { authApi } from '../../api/authApi';

export const ResetPasswordModal = ({
  isOpen,
  onClose,
  company,
  loc,
  initialUserId = '',
  mode = 'reset', // 'reset' or 'activate'
  onSuccess,
}) => {
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Enter OTP, 3: Set Password, 4: Success
  const [userId, setUserId] = useState(initialUserId);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Sync initial user ID when modal opens
  useEffect(() => {
    if (isOpen) {
      setUserId(initialUserId);
      setStep(1);
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMsg('');
      setCanResend(false);
      setTimer(60);
    }
  }, [isOpen, initialUserId]);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    setError('');

    if (!userId.trim()) {
      setError('Please enter your User ID');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword({
        userId: userId.trim(),
        companyCode: company,
        locationCode: loc,
      });

      setMaskedEmail(response.email_masked || 'your registered email');
      setStep(2);
      setTimer(60);
      setCanResend(false);
    } catch (err) {
      setError(err?.message || 'Failed to dispatch OTP. Please check your User ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code received in your email.');
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyOtp({
        userId: userId.trim(),
        companyCode: company,
        locationCode: loc,
        otpCode: otpCode.trim(),
      });

      setStep(3);
    } catch (err) {
      setError(err?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword({
        userId: userId.trim(),
        companyCode: company,
        locationCode: loc,
      });
      setTimer(60);
      setCanResend(false);
      setSuccessMsg('A new OTP has been dispatched to your email.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please retype carefully.');
      return;
    }

    setLoading(true);
    try {
      const apiMethod = mode === 'activate' ? authApi.activateAccount : authApi.resetPassword;
      await apiMethod({
        userId: userId.trim(),
        companyCode: company,
        locationCode: loc,
        otpCode: otpCode.trim(),
        newPassword: newPassword,
      });

      setStep(4);
    } catch (err) {
      setError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isReset = mode === 'reset';
  const modalTitle = isReset ? 'Reset Your Password' : 'First Time Account Setup';
  const modalSubtitle = isReset
    ? 'Verify your identity via registered email OTP to reset your password'
    : 'Verify your identity to set up your password for the first time';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      size="sm"
    >
      <div className="space-y-4 pt-1">
        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Temporary Success Alert */}
        {successMsg && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-700 animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* STEP 1: Enter User ID */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
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
                  onChange={(e) => setUserId(e.target.value.toUpperCase())}
                  placeholder="e.g. ADMIN or SUPERADMIN"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs font-mono font-medium text-slate-900 placeholder-slate-400 uppercase transition-colors hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                A 6-digit verification code will be sent to the official email registered for this account.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !userId.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <span>Sending OTP...</span>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900">
              <div className="flex items-center gap-2 font-semibold">
                <Mail className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Verification Code Sent</span>
              </div>
              <p className="mt-1 text-[11px] text-indigo-700/80">
                We sent a 6-digit OTP code to <b className="font-semibold">{maskedEmail}</b>. It is valid for 10 minutes.
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
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-center text-lg font-bold font-mono tracking-widest text-slate-900 placeholder-slate-300 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Resend Timer / Action */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Didn't receive email?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Resend Code</span>
                </button>
              ) : (
                <span className="font-medium text-slate-400">
                  Resend in <b className="font-mono text-slate-600">{timer}s</b>
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Set New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-10 text-xs font-medium text-slate-900 placeholder-slate-400 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-10 text-xs font-medium text-slate-900 placeholder-slate-400 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Saving Password...' : 'Save New Password & Finish'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Success Message */}
        {step === 4 && (
          <div className="text-center py-4 space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-1">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Password Set Successfully!
            </h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Your password has been updated. You can now use your new password to sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                onSuccess?.(userId);
                onClose();
              }}
              className="mt-2 w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
            >
              Sign In Now
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ResetPasswordModal;
