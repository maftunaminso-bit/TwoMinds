import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  Instagram,
  Layers,
  Mail,
  PackageCheck,
  Phone,
  Send,
  TrendingUp,
  X,
} from 'lucide-react';
import { INITIAL_INVENTORY } from '../data/initialData';
import { COPY, formatUZS } from '../i18n';
import { DashboardTab, InventoryItem, Language } from '../types';
import { SavdoPilotLogo } from './SavdoPilotLogo';

interface LandingPageProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  onOpenDashboard: (tab?: DashboardTab) => void;
  onOpenLogin: () => void;
  todaySales: number;
  aiResolvedCount: number;
  inventory: InventoryItem[];
  onSelectPlan: (planName: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  lang,
  onToggleLang,
  onOpenDashboard,
  onOpenLogin,
  todaySales,
  aiResolvedCount,
  inventory,
  onSelectPlan,
}) => {
  const t = COPY[lang];
  const [selectedPlanForContact, setSelectedPlanForContact] = useState<{
    name: string;
    price: string;
    period: string;
  } | null>(null);
  const kurtka =
    inventory.find((i) => i.id === 'prod-kurtka') ||
    inventory[0] ||
    INITIAL_INVENTORY[0];
  const krossovka =
    inventory.find((i) => i.id === 'prod-krossovka') ||
    inventory[1] ||
    inventory[0] ||
    INITIAL_INVENTORY[1];
  const koylak =
    inventory.find((i) => i.id === 'prod-koylak') ||
    inventory.find((i) => i.daysIdle >= 30) ||
    inventory[2] ||
    inventory[1] ||
    inventory[0] ||
    INITIAL_INVENTORY[2];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navbar — 3-Zone Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 sm:gap-6 lg:gap-8 px-3.5 py-3 sm:px-6 sm:py-3.5 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            className="flex items-center whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-md"
          >
            <SavdoPilotLogo size="md" tone="dark" />
          </a>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#imkoniyatlar"
              className="whitespace-nowrap shrink-0 hover:text-slate-900 hover:underline underline-offset-4 transition-colors"
            >
              {t.nav.features}
            </a>
            <a
              href="#qanday-ishlaydi"
              className="whitespace-nowrap shrink-0 hover:text-slate-900 hover:underline underline-offset-4 transition-colors"
            >
              {t.nav.howItWorks}
            </a>
            <a
              href="#narxlar"
              className="whitespace-nowrap shrink-0 hover:text-slate-900 hover:underline underline-offset-4 transition-colors"
            >
              {t.nav.pricing}
            </a>
          </nav>

          {/* Zone 3: Language Switch + Primary CTA */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5"
              role="group"
              aria-label="Language toggle"
            >
              <button
                type="button"
                onClick={() => onToggleLang('uz')}
                className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              {t.nav.login}
            </button>

            <button
              type="button"
              onClick={() => onOpenDashboard('overview')}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              <span className="sm:hidden">Demo</span>
              <span className="hidden sm:inline">{t.nav.demoCta}</span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main id="top">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
              {/* Left Column: Value Proposition */}
              <div className="lg:col-span-6">
                <p className="text-sm font-medium text-indigo-600 mb-4">
                  {t.hero.eyebrow}
                </p>
                <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-[1.12] text-balance">
                  {t.hero.headline}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  {t.hero.subheadline}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => onOpenDashboard('overview')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                  >
                    <span>{t.hero.primaryCta}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenDashboard('sales-bot')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                  >
                    <Bot className="h-4 w-4 text-indigo-600" />
                    <span>{t.hero.secondaryCta}</span>
                  </button>
                </div>

                <p className="mt-6 text-xs text-slate-500">
                  {t.hero.proofLine}
                </p>
              </div>

              {/* Right Column: Live Dashboard Preview Mockup */}
              <div className="lg:col-span-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  {/* Mockup Top Strip */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white text-xs font-bold">
                        MH
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">ModaHub Tashkent</p>
                        <p className="text-[11px] text-slate-500">{t.hero.previewTitle}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenDashboard('overview')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {lang === 'uz' ? 'Panelga kirish →' : 'Open workspace →'}
                    </button>
                  </div>

                  {/* Mockup KPI Row */}
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                      <p className="text-xs text-slate-500">{t.hero.previewTodaySales}</p>
                      <p className="mt-1 font-mono-num text-base font-semibold text-slate-900 sm:text-xl">
                        {formatUZS(todaySales, lang)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        +18% {lang === 'uz' ? 'kechagiga nisbatan' : 'vs yesterday'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                      <p className="text-xs text-slate-500">{t.overview.kpi2Title}</p>
                      <p className="mt-1 font-mono-num text-base font-semibold text-slate-900 sm:text-xl">
                        {aiResolvedCount} {lang === 'uz' ? 'ta' : 'chats'}
                      </p>
                      <p className="mt-1 text-xs font-medium text-indigo-600">
                        94% {lang === 'uz' ? 'avtomatik AI javob' : 'auto-resolved'}
                      </p>
                    </div>
                  </div>

                  {/* Live Channel Order Sync Feed */}
                  <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70">
                      <span className="text-xs font-semibold text-slate-700">
                        {t.hero.previewLiveOrders}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {t.hero.previewSyncedStock}
                      </span>
                    </div>

                    {/* Row 1: Instagram */}
                    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                          <Instagram className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            Aziza Karimova · {lang === 'uz' ? kurtka.nameUz : kurtka.nameEn}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {lang === 'uz'
                              ? 'Instagram DM · Chilonzor 5-kvartal'
                              : 'Instagram DM · Chilonzor District 5'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono-num text-xs font-semibold text-slate-900">
                          {formatUZS(kurtka.sellPrice, lang)}
                        </p>
                        <p className="text-[11px] font-medium text-amber-700">
                          {lang === 'uz' ? `Qoldiq: ${kurtka.stock} dona` : `Stock: ${kurtka.stock} left`}
                        </p>
                      </div>
                    </div>

                    {/* Row 2: Telegram */}
                    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-600 border border-sky-200">
                          <Send className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            @sardor_uz · {lang === 'uz' ? krossovka.nameUz : krossovka.nameEn}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {lang === 'uz'
                              ? 'Telegram Bot · 42 razmer tekshirildi'
                              : 'Telegram Bot · Size 42 verified'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono-num text-xs font-semibold text-slate-900">
                          {formatUZS(krossovka.sellPrice, lang)}
                        </p>
                        <p className="text-[11px] font-medium text-emerald-700">
                          {lang === 'uz' ? `Qoldiq: ${krossovka.stock} dona` : `Stock: ${krossovka.stock} left`}
                        </p>
                      </div>
                    </div>

                    {/* Row 3: Dead-stock Smart Action */}
                    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {lang === 'uz' ? koylak.nameUz : koylak.nameEn}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {lang === 'uz'
                              ? 'AI Narx Taklifi · 38 kunlik dead-stock'
                              : 'AI Markdown Alert · 38 days idle'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
                          -18% AI
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Core Feature Cards */}
        <section id="imkoniyatlar" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
              {t.features.heading}
            </h2>
            <p className="mt-3 text-base text-slate-600">
              {t.features.subheading}
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {t.features.items.map((feat, idx) => {
              const targetTab: DashboardTab =
                idx === 0 ? 'sales-bot' : idx === 1 ? 'inventory' : 'forecast';
              const Icon = idx === 0 ? Bot : idx === 1 ? PackageCheck : TrendingUp;
              return (
                <div
                  key={feat.index}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono-num text-xs font-semibold text-slate-400">
                        {feat.index}
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-bold text-slate-900">
                      {feat.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                      {feat.desc}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-emerald-700 mb-3">
                      {feat.metric}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenDashboard(targetTab)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap"
                    >
                      <span>{feat.action}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section id="qanday-ishlaydi" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {t.workflow.heading}
                </h2>
                <p className="mt-3 text-base text-slate-600">{t.workflow.subheading}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenDashboard('sales-bot')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors self-start md:self-auto whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>{t.hero.secondaryCta}</span>
              </button>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
              {t.workflow.steps.map((item) => (
                <div key={item.step} className="border-t border-slate-200 pt-5">
                  <p className="font-mono-num text-xs font-semibold text-indigo-600">
                    {item.step}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section (in UZS) */}
        <section id="narxlar" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t.pricing.heading}
            </h2>
            <p className="mt-3 text-base text-slate-600">{t.pricing.subheading}</p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {t.pricing.plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col justify-between rounded-xl bg-white p-6 ${
                  plan.highlight
                    ? 'border-2 border-indigo-600'
                    : 'border border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      {plan.name}
                    </h3>
                    {plan.highlight && (
                      <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200 whitespace-nowrap shrink-0">
                        {t.pricing.popularBadge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{plan.audience}</p>

                  <div className="mt-5 flex items-baseline gap-1.5 border-b border-slate-100 pb-5">
                    <span className="font-mono-num text-3xl font-bold text-slate-900">
                      {plan.price}
                    </span>
                    <span className="text-sm text-slate-500">{plan.period}</span>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {plan.limits.map((lim) => (
                      <li key={lim} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{lim}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const isFree = plan.price === 'Bepul' || plan.price === 'Free';
                    if (isFree) {
                      onSelectPlan(plan.name);
                    } else {
                      setSelectedPlanForContact({
                        name: plan.name,
                        price: plan.price,
                        period: plan.period,
                      });
                    }
                  }}
                  className={`mt-8 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    plan.highlight
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {plan.price === 'Bepul' || plan.price === 'Free'
                    ? t.pricing.openDemo
                    : lang === 'uz'
                    ? 'Obuna sotib olish'
                    : 'Buy Subscription'}
                </button>
              </div>
            ))}
          </div>

          {/* Subscription Purchase & Support Contact Strip */}
          <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50/70 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {lang === 'uz'
                    ? "Obuna sotib olish yoki do'koningiz uchun alohida panel ochish"
                    : 'Purchase a subscription or activate your shop workspace'}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">
                  {lang === 'uz'
                    ? "O'zingizning do'koningizga mos tarifni ulash, shaxsiy login-parol olish va Telegram/Instagram sozlash uchun bog'laning:"
                    : 'Contact us directly to activate your paid plan, receive private shop login credentials, and configure Telegram/Instagram:'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <a
                  href="https://t.me/Nigmatullayeva_22"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors whitespace-nowrap"
                >
                  <Send className="h-3.5 w-3.5 shrink-0" />
                  <span>Telegram: @Nigmatullayeva_22</span>
                </a>
                <a
                  href="tel:+998915672107"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono-num text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>+998 91 567 21 07</span>
                </a>
                <a
                  href="mailto:nigmatullayevamaftuna22@gmail.com"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono-num text-xs font-semibold text-indigo-700 hover:bg-slate-50 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>nigmatullayevamaftuna22@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Subscription Purchase Contact Modal */}
      {selectedPlanForContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {lang === 'uz'
                    ? `${selectedPlanForContact.name} obunasini sotib olish`
                    : `Subscribe to ${selectedPlanForContact.name}`}
                </h3>
                <p className="mt-0.5 font-mono-num text-xs font-semibold text-indigo-600">
                  {selectedPlanForContact.price} {selectedPlanForContact.period}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForContact(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-600">
              {lang === 'uz'
                ? "Do'koningiz uchun shaxsiy parol bilan himoyalangan panel, Telegram Bot va Instagram DM ulanishini faollashtirish uchun quyidagi raqam yoki manzillar orqali bog'laning:"
                : 'To activate your password-protected shop workspace with live Telegram Bot & Instagram DM integration, contact us via:'}
            </p>

            <div className="mt-4 space-y-2.5">
              <a
                href="https://t.me/Nigmatullayeva_22"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 text-xs font-semibold text-sky-900 hover:bg-sky-100/70 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Send className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>Telegram</span>
                </span>
                <span className="font-mono-num text-sky-700">@Nigmatullayeva_22</span>
              </a>

              <a
                href="tel:+998915672107"
                className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/70 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'uz' ? 'Telefon' : 'Phone'}</span>
                </span>
                <span className="font-mono-num text-emerald-800">+998 91 567 21 07</span>
              </a>

              <a
                href="mailto:nigmatullayevamaftuna22@gmail.com"
                className="flex items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100/70 transition-colors"
              >
                <span className="inline-flex items-center gap-2 shrink-0">
                  <Mail className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Email</span>
                </span>
                <span className="font-mono-num text-indigo-700 truncate">
                  nigmatullayevamaftuna22@gmail.com
                </span>
              </a>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  const name = selectedPlanForContact.name;
                  setSelectedPlanForContact(null);
                  onSelectPlan(name);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {lang === 'uz' ? "Avval Jonli Demoni ko'rish" : 'Try Live Demo First'}
              </button>
              <a
                href="https://t.me/Nigmatullayeva_22"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{lang === 'uz' ? 'Telegramda yozish' : 'Message on Telegram'}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2.5">
              <SavdoPilotLogo size="sm" tone="dark" />
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-xs text-slate-500">{t.footer.location}</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{t.footer.tagline}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <a
                href="https://t.me/Nigmatullayeva_22"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:underline underline-offset-4"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="font-mono-num">@Nigmatullayeva_22</span>
              </a>
              <a
                href="tel:+998915672107"
                className="inline-flex items-center gap-1.5 font-mono-num text-xs font-medium text-slate-700 hover:text-indigo-600 hover:underline underline-offset-4"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                <span>+998 91 567 21 07</span>
              </a>
              <a
                href="mailto:nigmatullayevamaftuna22@gmail.com"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-4"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="font-mono-num">nigmatullayevamaftuna22@gmail.com</span>
              </a>
            </div>
            <p className="text-xs text-slate-500">{t.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
