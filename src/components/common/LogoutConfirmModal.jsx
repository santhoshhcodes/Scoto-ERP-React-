import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LogoutConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const navigate = useNavigate();

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogoutAction = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      localStorage.removeItem('scoto_auth_user');
      localStorage.removeItem('scoto_auth_token');
      navigate('/auth/login');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Small Modal Dialog Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-200 animate-in zoom-in-95 z-10"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/50 mb-3">
            <LogOut className="h-6 w-6 ml-0.5" />
          </div>

          <h3 className="text-base font-semibold text-slate-900">
            Sign Out Confirmation
          </h3>
          <p className="mt-1.5 text-sm text-slate-500">
            Do you want to log out?
          </p>

          <div className="mt-6 flex w-full items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogoutAction}
              className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-98 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
