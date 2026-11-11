import React, { useEffect, useRef, useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, Sparkles, LogIn, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserAccount } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const DEMO_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr_pro_keith',
    name: 'Dr. Keith Nguyen',
    email: 'keith.nguyen@caltech.edu',
    role: 'PRO_RESEARCHER',
    organization: 'Caltech & FPTU Astrophysics Lab',
    flaggedCandidatesCount: 28,
    joinedDate: 'Jan 2026',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr_cit_sarah',
    name: 'Sarah Jenkins',
    email: 'sarah.j@citizen-science.nasa.gov',
    role: 'CITIZEN_ASTRONOMER',
    organization: 'NASA Citizen Astronomers Network',
    flaggedCandidatesCount: 12,
    joinedDate: 'Feb 2026',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
  }
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setFeedback(null);
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleDemoLogin = (account: UserAccount) => {
    setIsLoading(true);
    setFeedback({ type: 'success', message: `Xác thực thành công. Chào mừng ${account.name}!` });
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(account);
      onClose();
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    setTimeout(() => {
      setIsLoading(false);
      if (email.trim() && password.length >= 4) {
        const newUser: UserAccount = {
          id: `usr_${Date.now()}`,
          name: fullName.trim() || email.split('@')[0],
          email: email.trim(),
          role: 'CITIZEN_ASTRONOMER',
          organization: 'NASA Space Apps Explorer',
          flaggedCandidatesCount: 0,
          joinedDate: 'Hôm nay'
        };
        setFeedback({ type: 'success', message: 'Đăng nhập thành công vào trạm làm việc SPHEREx!' });
        setTimeout(() => {
          onLoginSuccess(newUser);
          onClose();
        }, 500);
      } else {
        setFeedback({ type: 'error', message: 'Vui lòng nhập email hợp lệ và mật khẩu tối thiểu 4 ký tự.' });
      }
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-2xl border border-space-700 bg-space-950 p-0 text-slate-100 shadow-2xl backdrop:bg-black/85 backdrop:backdrop-blur-md open:flex open:flex-col overflow-hidden"
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-space-800 bg-space-900/90 px-6 py-4">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nasa-blue/20 border border-nasa-cyan/40 text-nasa-cyan">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h2 id="auth-modal-title" className="text-sm font-bold text-white tracking-wide">
              {tab === 'signin' ? 'Đăng Nhập Tài Khoản' : 'Đăng Ký Thành Viên'}
            </h2>
            <p className="text-[11px] text-slate-400">
              NASA SPHEREx Research &amp; Citizen Portal
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ đăng nhập"
          className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-space-800 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-space-800 bg-space-950 px-6 pt-3" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'signin'}
          onClick={() => { setTab('signin'); setFeedback(null); }}
          className={`focus-ring pb-2.5 text-xs font-semibold border-b-2 mr-6 transition-colors ${
            tab === 'signin'
              ? 'border-nasa-cyan text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Đăng Nhập
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'signup'}
          onClick={() => { setTab('signup'); setFeedback(null); }}
          className={`focus-ring pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === 'signup'
              ? 'border-nasa-cyan text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Tạo Tài Khoản Mới
        </button>
      </div>

      <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
        {/* Quick Demo Accounts Banner */}
        <div className="rounded-xl border border-nasa-cyan/20 bg-nasa-cyan/5 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-nasa-cyan">
              <Sparkles className="h-3.5 w-3.5" />
              Đăng nhập nhanh 1-Click (Tài khoản thử nghiệm):
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleDemoLogin(acc)}
                disabled={isLoading}
                className="focus-ring flex items-center justify-between rounded-lg border border-space-700 bg-space-900/90 px-3 py-2 text-left hover:border-nasa-cyan hover:bg-space-850 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-space-800 text-xs font-bold text-white border border-space-600">
                    {acc.name[0]}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{acc.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{acc.role === 'PRO_RESEARCHER' ? 'PRO RESEARCHER' : 'CITIZEN ASTRONOMER'}</div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-space-800"></div>
          </div>
          <span className="relative bg-space-950 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
            Hoặc nhập tài khoản
          </span>
        </div>

        {/* Form Feedback */}
        {feedback && (
          <div
            role="status"
            className={`flex items-center space-x-2 rounded-lg p-3 text-xs ${
              feedback.type === 'success'
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'signup' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Họ và Tên:
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Dr. Alex Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-space-700 bg-space-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
                />
                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Email Nghiên Cứu / Tài Khoản:
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="astronomer@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus-ring w-full rounded-lg border border-space-700 bg-space-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
              />
              <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                Mật Khẩu:
              </label>
              {tab === 'signin' && (
                <button
                  type="button"
                  onClick={() => alert('Vui lòng chọn tài khoản Demo để đăng nhập thử nghiệm ngay lập tức!')}
                  className="text-[11px] text-nasa-cyan hover:underline"
                >
                  Quên mật khẩu?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus-ring w-full rounded-lg border border-space-700 bg-space-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
              />
              <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-space-700 bg-space-900 text-nasa-cyan focus:ring-nasa-cyan"
              />
              <span>Ghi nhớ 30 ngày</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              Bảo mật 256-bit SSL
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="focus-ring mt-2 flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-nasa-blue to-nasa-cyan px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>{tab === 'signin' ? 'Đăng Nhập Trạm Làm Việc' : 'Hoàn Tất Đăng Ký'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="border-t border-space-800 bg-space-900/60 px-6 py-3 text-center text-[11px] text-slate-500">
        Bằng việc tiếp tục, bạn đồng ý với Điều Khoản Khoa Học Công Dân của NASA Space Apps Challenge 2026.
      </footer>
    </dialog>
  );
};
