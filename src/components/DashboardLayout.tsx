import React, { useState } from 'react';
import {
  ArrowLeft,
  Bot,
  FileDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { COPY } from '../i18n';
import { DashboardTab, Language, PlanTier, ThemeMode } from '../types';
import { UserProfileMenu } from './UserProfileMenu';

interface DashboardLayoutProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  theme: ThemeMode;
  onToggleTheme: (theme: ThemeMode) => void;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onBackToLanding: () => void;
  onLogout: () => void;
  isAdminViewing?: boolean;
  onBackToAdmin?: () => void;
  shopName: string;
  shopBranch: string;
  shopPlan: PlanTier;
  userName: string;
  userEmail: string;
  activeConversationsCount: number;
  onGeneratePdfReport: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  activeTab,
  onSelectTab,
  onBackToLanding,
  onLogout,
  isAdminViewing = false,
  onBackToAdmin,
  shopName,
  shopBranch,
  shopPlan,
  userName,
  userEmail,
  activeConversationsCount,
  onGeneratePdfReport,
  children,
}) => {
  const t = COPY[lang];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: {
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'overview', label: t.sidebar.overview, icon: LayoutDashboard },
    {
      id: 'sales-bot',
      label: t.sidebar.salesBot,
      icon: Bot,
      badge: activeConversationsCount,
    },
    { id: 'inventory', label: t.sidebar.inventory, icon: Package },
    { id: 'forecast', label: t.sidebar.forecast, icon: TrendingUp },
  ];

  const currentHeader = t.header.titles[activeTab];

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#0F172A] dark:bg-slate-950 dark:border-r dark:border-slate-800 text-slate-200 px-4 py-5">
      <div>
        {/* Brand */}
        <div className="flex items-center justify-between px-2 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-display font-bold text-sm">
              SP
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              SavdoPilot
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active Shop Workspace Context */}
        <div className="mt-5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-white truncate">{shopName}</p>
            <span className="rounded bg-indigo-600/30 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 shrink-0">
              {shopPlan}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            {shopBranch} · {lang === 'uz' ? 'Faol' : 'Active'}
          </p>
        </div>

        {/* 4 Main Navigation Tabs */}
        <nav className="mt-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono-num text-[11px] font-semibold ${
                      isActive
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="space-y-1 border-t border-slate-800 pt-4">
        {isAdminViewing && onBackToAdmin && (
          <button
            type="button"
            onClick={onBackToAdmin}
            className="flex w-full items-center gap-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-600/30 transition-colors cursor-pointer whitespace-nowrap mb-2"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-400" />
            <span>
              {lang === 'uz' ? 'Admin Panelga Qaytish' : 'Back to Admin Console'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onBackToLanding}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>{t.sidebar.backToLanding}</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{lang === 'uz' ? 'Chiqish (Login)' : 'Log out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-68 max-w-full h-full">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 sm:px-6 sm:py-3.5 lg:px-8 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white truncate">
                  {currentHeader.title}
                </h1>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                <span className="hidden sm:inline text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                  {shopName}
                </span>
              </div>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block truncate">
                {currentHeader.sub}
              </p>
            </div>
          </div>

          {/* Right Header Controls: PDF Report + Language + User Profile Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onGeneratePdfReport}
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileDown className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'uz' ? 'PDF Hisobot' : 'Generate PDF Report'}</span>
            </button>

            <div
              className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5"
              role="group"
              aria-label="Language toggle"
            >
              <button
                type="button"
                onClick={() => onToggleLang('uz')}
                className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === 'uz'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                UZ
              </button>
              <button
                type="button"
                onClick={() => onToggleLang('en')}
                className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <UserProfileMenu
              lang={lang}
              theme={theme}
              onToggleTheme={onToggleTheme}
              userName={userName}
              userEmail={userEmail}
              roleLabel={isAdminViewing ? 'Super Admin' : shopPlan}
              onLogout={onLogout}
              onBackToLanding={onBackToLanding}
              isAdminViewingShop={isAdminViewing}
              onBackToAdmin={onBackToAdmin}
              onGeneratePdfReport={onGeneratePdfReport}
            />
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
