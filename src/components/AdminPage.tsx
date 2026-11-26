import React, { useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Building2,
  CheckCircle2,
  ExternalLink,
  Instagram,
  LogOut,
  Mail,
  Menu,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Store,
  Wallet,
  X,
} from 'lucide-react';
import { formatUZS } from '../i18n';
import { Language, PlanTier, ShopWorkspace, ThemeMode } from '../types';
import { SavdoPilotLogo } from './SavdoPilotLogo';
import { UserProfileMenu } from './UserProfileMenu';

interface AdminPageProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  theme: ThemeMode;
  onToggleTheme: (theme: ThemeMode) => void;
  shops: ShopWorkspace[];
  onCreateShop: (payload: {
    name: string;
    branch: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    plan: PlanTier;
    instagram: boolean;
    telegram: boolean;
  }) => Promise<void>;
  onOpenShopPanel: (shopId: string) => void;
  onToggleShopStatus: (shopId: string) => Promise<void>;
  onChangeShopPlan: (shopId: string, plan: PlanTier) => Promise<void>;
  onLogout: () => void;
  onBackToLanding: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  shops,
  onCreateShop,
  onOpenShopPanel,
  onToggleShopStatus,
  onChangeShopPlan,
  onLogout,
  onBackToLanding,
}) => {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'All' | PlanTier>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('shop123');
  const [plan, setPlan] = useState<PlanTier>('Biznes');
  const [instagram, setInstagram] = useState(true);
  const [telegram, setTelegram] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalSales = shops.reduce((acc, s) => acc + s.todaySales, 0);
  const totalAiChats = shops.reduce((acc, s) => acc + s.aiResolvedCount, 0);
  const activeCount = shops.filter((s) => s.status === 'active').length;

  const filteredShops = shops.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.branch.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      s.ownerEmail.toLowerCase().includes(q);
    const matchesPlan = planFilter === 'All' || s.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !branch.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      setFormError(
        lang === 'uz'
          ? "Barcha majburiy maydonlarni to'ldiring."
          : 'Please complete all required fields.'
      );
      return;
    }

    const emailExists = shops.some(
      (s) => s.ownerEmail.toLowerCase() === ownerEmail.trim().toLowerCase()
    );
    if (emailExists) {
      setFormError(
        lang === 'uz'
          ? 'Bu login email allaqachon boshqa do‘konga biriktirilgan.'
          : 'This login email is already assigned to another shop.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await onCreateShop({
        name: name.trim(),
        branch: branch.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPassword: ownerPassword.trim() || 'shop123',
        plan,
        instagram,
        telegram,
      });

      setName('');
      setBranch('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('shop123');
      setPlan('Biznes');
      setInstagram(true);
      setTelegram(true);
      setShowCreateModal(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create shop');
    } finally {
      setSubmitting(false);
    }
  };

  const AdminSidebar = (
    <div className="flex h-full flex-col justify-between bg-[#0F172A] dark:bg-slate-950 dark:border-r dark:border-slate-800 px-4 py-5 text-slate-200">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 px-2 pb-5">
          <SavdoPilotLogo size="md" tone="light" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2.5">
          <div className="flex items-center gap-2 text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Super Admin</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-white">
            admin@savdopilot.uz
          </p>
        </div>

        <nav className="mt-6 space-y-1">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="flex w-full items-center justify-between rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Store className="h-4 w-4" />
              <span>{lang === 'uz' ? "Do'kon Panellari" : 'Shop Workspaces'}</span>
            </span>
            <span className="rounded-md bg-indigo-500 px-1.5 py-0.5 font-mono-num text-[11px] font-semibold">
              {shops.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setShowCreateModal(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === 'uz' ? 'Yangi Panel Ajratish' : 'Provision Shop'}</span>
          </button>
        </nav>
      </div>

      <div className="space-y-1 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === 'uz' ? 'Landing Sahifa' : 'Landing Page'}</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogOut className="h-4 w-4" />
          <span>{lang === 'uz' ? 'Chiqish' : 'Log out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop Deep Slate Admin Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block sticky top-0 h-screen">
        {AdminSidebar}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-68 max-w-full h-full">
            {AdminSidebar}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 sm:px-6 lg:px-8 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 lg:hidden cursor-pointer shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {lang === 'uz'
                  ? "Super Admin — Do'konlar Boshqaruvi"
                  : 'Super Admin — Shop Management'}
              </h1>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block truncate">
                {lang === 'uz'
                  ? "Har bir do'kon uchun mustaqil ombor, AI bot va login panelini ajrating va boshqaring."
                  : 'Provision isolated workspaces, credentials, and plan limits for each retail store.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div
              className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5"
              role="group"
              aria-label="Language toggle"
            >
              <button
                type="button"
                onClick={() => onToggleLang('uz')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
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
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">
                {lang === 'uz' ? "Yangi Do'kon Qo'shish" : 'Provision New Shop'}
              </span>
            </button>

            <UserProfileMenu
              lang={lang}
              theme={theme}
              onToggleTheme={onToggleTheme}
              userName="Super Admin"
              userEmail="admin@savdopilot.uz"
              roleLabel="Admin"
              onLogout={onLogout}
              onBackToLanding={onBackToLanding}
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Platform KPI Strip */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {lang === 'uz' ? "Jami Do'konlar" : 'Total Shops'}
                  </p>
                  <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="mt-3 font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
                  {shops.length} {lang === 'uz' ? 'ta' : ''}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'uz'
                    ? 'Alohida izolyatsiyalangan panellar'
                    : 'Isolated retail workspaces'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {lang === 'uz' ? 'Faol Panellar' : 'Active Panels'}
                  </p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="mt-3 font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
                  {activeCount} / {shops.length}
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {lang === 'uz' ? 'Real vaqtda ishlamoqda' : 'Operational'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {lang === 'uz' ? 'Umumiy Bugungi Savdo' : 'Combined Daily GMV'}
                  </p>
                  <Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="mt-3 font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
                  {formatUZS(totalSales, lang)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'uz' ? "Barcha do'konlar bo'yicha" : 'Across all stores'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {lang === 'uz' ? 'Jami AI Murojaatlar' : 'Total AI Chats'}
                  </p>
                  <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="mt-3 font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
                  {totalAiChats} {lang === 'uz' ? 'ta' : ''}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'uz' ? 'Instagram & Telegram' : 'Instagram & Telegram'}
                </p>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    lang === 'uz'
                      ? "Do'kon nomi, egasi yoki email bo'yicha qidirish..."
                      : 'Search by shop name, owner, or login email...'
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                {(['All', 'Start', 'Biznes', 'Pro'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPlanFilter(tier)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      planFilter === tier
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tier === 'All'
                      ? lang === 'uz'
                        ? 'Barchasi'
                        : 'All Plans'
                      : tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Shops Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <th className="px-4 py-3">
                        {lang === 'uz' ? "Do'kon va Filial" : 'Shop & Branch'}
                      </th>
                      <th className="px-4 py-3">
                        {lang === 'uz' ? 'Egasi va Login' : 'Owner & Login'}
                      </th>
                      <th className="px-4 py-3">
                        {lang === 'uz' ? 'Kanallar' : 'Channels'}
                      </th>
                      <th className="px-4 py-3">
                        {lang === 'uz' ? 'Tarif' : 'Plan'}
                      </th>
                      <th className="px-4 py-3 text-right">
                        {lang === 'uz' ? 'Bugungi Savdo' : "Today's Sales"}
                      </th>
                      <th className="px-4 py-3 text-right">
                        {lang === 'uz' ? 'SKU' : 'SKUs'}
                      </th>
                      <th className="px-4 py-3">
                        {lang === 'uz' ? 'Holati' : 'Status'}
                      </th>
                      <th className="px-4 py-3 text-right">
                        {lang === 'uz' ? 'Boshqaruv' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredShops.map((shop) => (
                      <tr
                        key={shop.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {shop.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {shop.branch}
                            <span className="mx-1.5" aria-hidden="true">·</span>
                            <span className="font-mono-num">{shop.createdAt}</span>
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {shop.ownerName}
                          </p>
                          <p className="mt-0.5 font-mono-num text-xs text-slate-500 dark:text-slate-400">
                            {shop.ownerEmail}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {shop.channels.instagram && (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                                title="Instagram DM"
                              >
                                <Instagram className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {shop.channels.telegram && (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
                                title="Telegram Bot"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <select
                            value={shop.plan}
                            onChange={(e) =>
                              onChangeShopPlan(shop.id, e.target.value as PlanTier)
                            }
                            aria-label={`Plan for ${shop.name}`}
                            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-600 focus:outline-none cursor-pointer"
                          >
                            <option value="Start">Start</option>
                            <option value="Biznes">Biznes</option>
                            <option value="Pro">Pro</option>
                          </select>
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono-num font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatUZS(shop.todaySales, lang)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono-num text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {shop.inventory.length} SKU
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onToggleShopStatus(shop.id)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold cursor-pointer ${
                              shop.status === 'active'
                                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                            }`}
                          >
                            {shop.status === 'active' ? (
                              <>
                                <PlayCircle className="h-3 w-3" />
                                <span>{lang === 'uz' ? 'Faol' : 'Active'}</span>
                              </>
                            ) : (
                              <>
                                <PauseCircle className="h-3 w-3" />
                                <span>{lang === 'uz' ? "To'xtatilgan" : 'Paused'}</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenShopPanel(shop.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                          >
                            <span>
                              {lang === 'uz' ? 'Panelni Ochish' : 'Open Panel'}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        {/* Admin Page Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 sm:px-6 lg:px-8 transition-colors">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2.5 sm:flex-row sm:items-center text-xs text-slate-500 dark:text-slate-400">
            <p>© 2026 SavdoPilot · Super Admin</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <a
                href="https://t.me/Nigmatullayeva_22"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono-num font-medium text-sky-600 dark:text-sky-400 hover:underline underline-offset-4"
              >
                Telegram: @Nigmatullayeva_22
              </a>
              <a
                href="tel:+998915672107"
                className="font-mono-num font-medium text-slate-700 dark:text-slate-300 hover:underline underline-offset-4"
              >
                Tel: +998 91 567 21 07
              </a>
              <a
                href="mailto:nigmatullayevamaftuna22@gmail.com"
                className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Texnik yordam uchun:{' '}
                  <span className="font-mono-num">nigmatullayevamaftuna22@gmail.com</span>
                </span>
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Provision New Shop Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'uz'
                    ? "Yangi Do'kon Paneli Ajratish"
                    : 'Provision New Shop Workspace'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'uz'
                    ? "Yaratilgan do'kon uchun alohida ombor, AI bot va login ajratiladi."
                    : 'Assigns an isolated inventory, AI sales bot, and login credentials.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {formError && (
                <p className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'uz' ? "Do'kon nomi" : 'Shop Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Baraka Boutique"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'uz' ? 'Filial / Shahar' : 'Branch / City'}
                  </label>
                  <input
                    type="text"
                    required
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Sergeli filiali"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'uz' ? "Do'kon egasi" : 'Owner Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Azizbek Karimov"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'uz' ? 'Tarif rejasi' : 'Subscription Plan'}
                  </label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as PlanTier)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="Start">Start (Bepul)</option>
                    <option value="Biznes">Biznes (149,000 so'm/oy)</option>
                    <option value="Pro">Pro (349,000 so'm/oy)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'uz' ? 'Login Email' : 'Login Email'}
                  </label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="baraka@savdopilot.uz"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'uz' ? 'Parol' : 'Initial Password'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {lang === 'uz' ? 'Ulangan savdo kanallari' : 'Enabled Channels'}
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={instagram}
                      onChange={(e) => setInstagram(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <span>Instagram DM</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={telegram}
                      onChange={(e) => setTelegram(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <span>Telegram Bot</span>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {lang === 'uz' ? 'Bekor qilish' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                >
                  {submitting
                    ? lang === 'uz'
                      ? 'Saqlanmoqda...'
                      : 'Provisioning...'
                    : lang === 'uz'
                    ? 'Panel Yaratish'
                    : 'Provision Panel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
