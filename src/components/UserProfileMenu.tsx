import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  FileDown,
  LogOut,
  Mail,
  Moon,
  Phone,
  Send,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { Language, ThemeMode } from '../types';

interface UserProfileMenuProps {
  lang: Language;
  theme: ThemeMode;
  onToggleTheme: (theme: ThemeMode) => void;
  userName: string;
  userEmail: string;
  roleLabel: string;
  onLogout: () => void;
  onBackToLanding: () => void;
  isAdminViewingShop?: boolean;
  onBackToAdmin?: () => void;
  onGeneratePdfReport?: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  lang,
  theme,
  onToggleTheme,
  userName,
  userEmail,
  roleLabel,
  onLogout,
  onBackToLanding,
  isAdminViewingShop = false,
  onBackToAdmin,
  onGeneratePdfReport,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'SP';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-bold text-white shrink-0">
          {initials}
        </span>
        <span className="hidden sm:inline text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[120px] truncate">
          {userName}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-lg z-50"
        >
          {/* User Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 px-2.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {userName}
              </p>
              <span className="rounded bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
                {roleLabel}
              </span>
            </div>
            <p className="mt-0.5 font-mono-num text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {userEmail}
            </p>
          </div>

          {/* Theme Switcher */}
          <div className="border-b border-slate-100 dark:border-slate-800 px-2.5 py-2.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
              {lang === 'uz' ? 'Interfeys mavzusi' : 'Appearance'}
            </p>
            <div
              className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1"
              role="group"
              aria-label={lang === 'uz' ? 'Mavzu tanlash' : 'Theme switcher'}
            >
              <button
                type="button"
                onClick={() => onToggleTheme('light')}
                className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                <span>{lang === 'uz' ? 'Yorug‘' : 'Light'}</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleTheme('dark')}
                className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                <span>{lang === 'uz' ? 'Tungi' : 'Dark'}</span>
              </button>
            </div>
          </div>

          {/* Navigation & Account Actions */}
          <div className="pt-1.5 space-y-0.5">
            {onGeneratePdfReport && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onGeneratePdfReport();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FileDown className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {lang === 'uz' ? 'PDF Hisobot Yuklash' : 'Generate PDF Report'}
                </span>
              </button>
            )}

            {isAdminViewingShop && onBackToAdmin && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onBackToAdmin();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>
                  {lang === 'uz' ? 'Admin Panelga Qaytish' : 'Back to Admin Console'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onBackToLanding();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>
                {lang === 'uz' ? 'Landing Sahifaga Qaytish' : 'Back to Landing Page'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{lang === 'uz' ? 'Chiqish' : 'Log out'}</span>
            </button>
          </div>

          {/* Technical Support & Subscription Contact */}
          <div className="mt-1.5 border-t border-slate-100 dark:border-slate-800 px-2.5 pt-2.5 pb-1.5 space-y-1">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {lang === 'uz' ? 'Texnik yordam / Obuna:' : 'Support & Subscriptions:'}
            </p>
            <a
              href="https://t.me/Nigmatullayeva_22"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono-num text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              <span>@Nigmatullayeva_22</span>
            </a>
            <a
              href="tel:+998915672107"
              className="flex items-center gap-1.5 font-mono-num text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>+998 91 567 21 07</span>
            </a>
            <a
              href="mailto:nigmatullayevamaftuna22@gmail.com"
              className="flex items-center gap-1.5 font-mono-num text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline break-all"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span>nigmatullayevamaftuna22@gmail.com</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
