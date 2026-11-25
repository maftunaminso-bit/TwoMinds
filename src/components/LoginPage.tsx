import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { formatUZS } from '../i18n';
import { AdminAuthStatus, AuthSession, Language, ShopWorkspace } from '../types';
import { api, type PublicShopSummary } from '../utils/api';

interface LoginPageProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  shops: PublicShopSummary[];
  onLoginSuccess: (
    session: AuthSession,
    payload: { shop?: ShopWorkspace; shops?: ShopWorkspace[] }
  ) => void;
  onBackToLanding: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  lang,
  onToggleLang,
  shops,
  onLoginSuccess,
  onBackToLanding,
}) => {
  const [roleTab, setRoleTab] = useState<'shop_owner' | 'admin'>('shop_owner');
  const [email, setEmail] = useState('modahub@savdopilot.uz');
  const [password, setPassword] = useState('shop123');
  const [claimPassword, setClaimPassword] = useState('');
  const [adminStatus, setAdminStatus] = useState<AdminAuthStatus>({
    configured: true,
    source: 'env',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .getAdminAuthStatus()
      .then((status) => {
        if (active) setAdminStatus(status);
      })
      .catch(() => {
        // Ignore background status probe errors
      });
    return () => {
      active = false;
    };
  }, []);

  const handleRoleSwitch = (nextRole: 'shop_owner' | 'admin') => {
    setRoleTab(nextRole);
    setError('');
    if (nextRole === 'admin') {
      setEmail('admin@savdopilot.uz');
      setPassword('');
    } else {
      const firstActive = shops.find((s) => s.status === 'active') || shops[0];
      setEmail(firstActive?.ownerEmail || 'modahub@savdopilot.uz');
      setPassword('shop123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (roleTab === 'admin' && adminStatus.source === 'unclaimed') {
        const res = await api.claimAdminPassword(claimPassword);
        setAdminStatus({ configured: true, source: 'claimed' });
        onLoginSuccess(res.session, { shops: res.shops });
        return;
      }

      const res = await api.login(email, password);
      onLoginSuccess(res.session, { shop: res.shop, shops: res.shops });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'uz'
          ? 'Kirishda xatolik yuz berdi'
          : 'Authentication failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickShopLogin = async (shop: PublicShopSummary) => {
    if (shop.status === 'paused') {
      setError(
        lang === 'uz'
          ? `"${shop.name}" paneli to'xtatilgan. Admin paneldan faollashtiring.`
          : `"${shop.name}" is paused. Reactivate it from the Admin console.`
      );
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.loginDemoShop(shop.id);
      onLoginSuccess(res.session, { shop: res.shop });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const isClaimMode = roleTab === 'admin' && adminStatus.source === 'unclaimed';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Minimal Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden min-[380px]:inline">
              {lang === 'uz' ? 'Asosiy sahifa' : 'Home'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-display font-bold text-xs shrink-0">
              SP
            </div>
            <span className="font-display text-sm sm:text-base font-bold text-slate-900">
              SavdoPilot
            </span>
          </div>

          <div
            className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5"
            role="group"
            aria-label="Language toggle"
          >
            <button
              type="button"
              onClick={() => onToggleLang('uz')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                lang === 'uz'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              UZ
            </button>
            <button
              type="button"
              onClick={() => onToggleLang('en')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                lang === 'en'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Center Workspace */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left: Login Form Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-6">
            <h1 className="font-display text-2xl font-bold text-slate-900">
              {lang === 'uz' ? 'Tizimga kirish' : 'Sign in to SavdoPilot'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {lang === 'uz'
                ? "Do'koningiz boshqaruv paneliga yoki Super Admin konsoliga kiring."
                : 'Access your dedicated shop workspace or the Super Admin console.'}
            </p>

            {/* Role Selector */}
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => handleRoleSwitch('shop_owner')}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  roleTab === 'shop_owner'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store className="h-3.5 w-3.5 text-indigo-600" />
                <span>{lang === 'uz' ? "Do'kon paneli" : 'Shop Panel'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSwitch('admin')}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  roleTab === 'admin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>{lang === 'uz' ? 'Super Admin' : 'Super Admin'}</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                  {error}
                </div>
              )}

              {isClaimMode ? (
                <>
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-900">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
                      <span>
                        {lang === 'uz'
                          ? 'Birinchi ishga tushirish: Admin parolini o‘rnating'
                          : 'First-Run Setup: Claim Super Admin Access'}
                      </span>
                    </div>
                    <p className="text-indigo-800/90 leading-relaxed">
                      {lang === 'uz'
                        ? "Super Admin paroli hali belgilanmagan. Kamida 6 belgidan iborat parol kiriting — u serverda xavfsiz xeshlanib saqlanadi."
                        : 'Set your initial Super Admin password (min 6 characters). It will be hashed and locked on the server.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {lang === 'uz'
                        ? 'Yangi Super Admin paroli'
                        : 'New Super Admin Password'}
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={claimPassword}
                        onChange={(e) => setClaimPassword(e.target.value)}
                        placeholder="Kamida 6 ta belgi..."
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {lang === 'uz' ? 'Login Email' : 'Email Address'}
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="modahub@savdopilot.uz"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {lang === 'uz' ? 'Parol' : 'Password'}
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {isClaimMode
                    ? lang === 'uz'
                      ? 'Parolni Saqlash va Admin Panelga Kirish'
                      : 'Claim Admin & Continue'
                    : roleTab === 'admin'
                    ? lang === 'uz'
                      ? 'Admin Panelga Kirish'
                      : 'Sign in as Super Admin'
                    : lang === 'uz'
                    ? "Do'kon Paneliga Kirish"
                    : 'Sign in to Shop Panel'}
                </span>
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-1">
              <p>
                <span className="font-semibold text-slate-700">
                  {lang === 'uz' ? "Demo Do'kon:" : 'Demo Shop:'}
                </span>{' '}
                <span className="font-mono-num">modahub@savdopilot.uz</span> /{' '}
                <span className="font-mono-num">shop123</span>
              </p>
              <p className="pt-1">
                <span className="font-semibold text-slate-700">
                  {lang === 'uz' ? "Admin bilan bog'lanish:" : 'Contact Admin:'}
                </span>{' '}
                <a
                  href="mailto:nigmatullayevamaftuna22@gmail.com"
                  className="font-mono-num text-indigo-600 hover:underline break-all"
                >
                  nigmatullayevamaftuna22@gmail.com
                </a>
              </p>
            </div>
          </div>

          {/* Right: 1-Click Demo Workspace Switcher */}
          <div className="space-y-4 lg:col-span-6">
            {/* Super Admin Console Info Card */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-indigo-700">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-bold">
                      {lang === 'uz'
                        ? 'Super Admin Boshqaruv Konsoli'
                        : 'Super Admin Control Console'}
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-display text-base font-bold text-slate-900">
                    {lang === 'uz'
                      ? "Do'konlar uchun alohida panellar ajratish"
                      : 'Provision & manage separate shop panels'}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {lang === 'uz'
                      ? "Yangi do'kon yaratish, login/parol berish, tarif belgilash va istalgan do'kon paneliga kirib tekshirish."
                      : 'Create new retail shops, assign login credentials & plans, and launch any store workspace.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRoleSwitch('admin')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>
                  {lang === 'uz'
                    ? 'Super Admin bo‘limiga o‘tish'
                    : 'Switch to Super Admin Login'}
                </span>
              </button>
            </div>

            {/* Individual Shop Panels List */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {lang === 'uz'
                    ? "Mavjud Do'kon Panellari (Tezkor kirish)"
                    : 'Provisioned Shop Panels (Quick Access)'}
                </h3>
                <span className="font-mono-num text-xs text-slate-500">
                  {shops.length} {lang === 'uz' ? 'ta' : 'shops'}
                </span>
              </div>

              <div className="space-y-2.5">
                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {shop.name}
                          </p>
                          <span className="text-[11px] font-semibold text-indigo-700">
                            {shop.plan}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          <span className="font-mono-num">{shop.ownerEmail}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span className="font-mono-num">
                            {formatUZS(shop.todaySales, lang)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickShopLogin(shop)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                        shop.status === 'active'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      <span>
                        {shop.status === 'active'
                          ? lang === 'uz'
                            ? 'Kirish'
                            : 'Open'
                          : lang === 'uz'
                          ? "To'xtatilgan"
                          : 'Paused'}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
