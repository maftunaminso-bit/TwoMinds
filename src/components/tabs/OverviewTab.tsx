import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  FileDown,
  PackageMinus,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SALES_FORECAST_SERIES } from '../../data/initialData';
import { COPY, formatUZS } from '../../i18n';
import { DashboardTab, InventoryItem, Language, ThemeMode } from '../../types';

interface OverviewTabProps {
  lang: Language;
  theme: ThemeMode;
  todaySales: number;
  aiResolvedCount: number;
  inventory: InventoryItem[];
  onNavigateTab: (tab: DashboardTab) => void;
  onInspectDeadStock: (itemId: string) => void;
  onGeneratePdfReport: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  lang,
  theme,
  todaySales,
  aiResolvedCount,
  inventory,
  onNavigateTab,
  onInspectDeadStock,
  onGeneratePdfReport,
}) => {
  const t = COPY[lang].overview;
  const isDark = theme === 'dark';

  const lowStockCount = inventory.filter(
    (item) => item.stock <= 5 && item.daysIdle < 30
  ).length;

  const lowStockTarget =
    inventory.find((i) => i.id === 'prod-kurtka') ||
    inventory.find((i) => i.stock <= 5 && i.daysIdle < 30) ||
    inventory[0];

  const deadStockTarget =
    inventory.find((i) => i.id === 'prod-koylak') ||
    inventory.find((i) => i.daysIdle >= 30) ||
    inventory[1] ||
    inventory[0];

  const chartData = SALES_FORECAST_SERIES.map((pt) =>
    pt.date === '25 Nov' ? { ...pt, actual: todaySales, forecast: todaySales } : pt
  );

  const forecast7Day = Math.round(todaySales * 7.56);

  const gridStroke = isDark ? '#1E293B' : '#E2E8F0';
  const tickFill = isDark ? '#94A3B8' : '#64748B';
  const axisStroke = isDark ? '#334155' : '#CBD5E1';
  const actualStroke = isDark ? '#818CF8' : '#4F46E5';
  const forecastStroke = isDark ? '#34D399' : '#10B981';

  return (
    <div className="space-y-6">
      {/* Top Action Strip with Generate PDF Report */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {lang === 'uz'
              ? "Kunlik natijalar va ombor hisoboti"
              : 'Shop Performance & Inventory Summary'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'uz'
              ? "Savdo dinamikasi, AI statistikasi va ombor qoldig'ini PDF formatida yuklab oling."
              : 'Export live KPIs, sales trends, and stock breakdown into a formatted PDF document.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onGeneratePdfReport}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <FileDown className="h-4 w-4" />
          <span>{lang === 'uz' ? 'PDF Hisobot Yaratish' : 'Generate PDF Report'}</span>
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: Today's Sales */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpi1Title}
            </p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
            {formatUZS(todaySales, lang)}
          </p>
          <p className="mt-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {t.kpi1Sub}
          </p>
        </div>

        {/* KPI 2: AI Resolved */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpi2Title}
            </p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Bot className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
            {aiResolvedCount} {lang === 'uz' ? 'ta' : 'chats'}
          </p>
          <p className="mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            {t.kpi2Sub}
          </p>
        </div>

        {/* KPI 3: Low Stock */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpi3Title}
            </p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <PackageMinus className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <p className="font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
              {lowStockCount} {lang === 'uz' ? 'ta SKU' : 'SKUs'}
            </p>
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              {lang === 'uz' ? 'Ogohlantirish' : 'Warning'}
            </span>
          </div>
          <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.kpi3Sub}
          </p>
        </div>

        {/* KPI 4: 7-Day Forecast */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpi4Title}
            </p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
            {formatUZS(forecast7Day, lang)}
          </p>
          <p className="mt-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {t.kpi4Sub}
          </p>
        </div>
      </div>

      {/* Main Chart + Actionable Alerts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Chart (8 cols) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:col-span-8">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {t.chartTitle}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t.chartSub}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 whitespace-nowrap shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{t.spikeBanner}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-5 bg-indigo-600 dark:bg-indigo-400 inline-block" />
              <span>{t.actualLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-5 border-t-2 border-dashed border-emerald-500 dark:border-emerald-400 inline-block" />
              <span>{t.forecastLabel}</span>
            </div>
          </div>

          <div className="mt-3 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={actualStroke} stopOpacity={isDark ? 0.28 : 0.16} />
                    <stop offset="95%" stopColor={actualStroke} stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={forecastStroke} stopOpacity={isDark ? 0.22 : 0.14} />
                    <stop offset="95%" stopColor={forecastStroke} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: tickFill }}
                  axisLine={{ stroke: axisStroke }}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: tickFill }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val: number) => `${Math.round(val / 1000000)}M`}
                  width={42}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const actualItem = payload.find((p) => p.dataKey === 'actual');
                    const forecastItem = payload.find((p) => p.dataKey === 'forecast');
                    const point = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm text-xs">
                        <p className="font-semibold text-slate-900 dark:text-white mb-1">{label}</p>
                        {actualItem?.value != null && (
                          <p className="font-mono-num text-indigo-700 dark:text-indigo-400">
                            {t.actualLabel}: {formatUZS(Number(actualItem.value), lang)}
                          </p>
                        )}
                        {forecastItem?.value != null && (
                          <p className="font-mono-num text-emerald-700 dark:text-emerald-400">
                            {t.forecastLabel}: {formatUZS(Number(forecastItem.value), lang)}
                          </p>
                        )}
                        {(point?.noteUz || point?.noteEn) && (
                          <p className="mt-1 font-medium text-amber-700 dark:text-amber-400">
                            {lang === 'uz' ? point.noteUz : point.noteEn}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  x="25 Nov"
                  stroke={isDark ? '#64748B' : '#94A3B8'}
                  strokeDasharray="3 3"
                  label={{
                    value: lang === 'uz' ? 'Bugun' : 'Today',
                    position: 'top',
                    fill: isDark ? '#CBD5E1' : '#475569',
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke={actualStroke}
                  strokeWidth={2.5}
                  fill="url(#actualFill)"
                  connectNulls={false}
                  activeDot={{ r: 4, fill: actualStroke }}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="none"
                  fill="url(#forecastFill)"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={forecastStroke}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls={false}
                  activeDot={{ r: 4, fill: forecastStroke }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actionable AI Alerts (4 cols) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {t.alertsTitle}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t.alertsSub}
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            </div>

            <div className="mt-4 space-y-4">
              {/* Alert 1: Low Stock */}
              {lowStockTarget && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/30 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {lang === 'uz' ? 'Kam qoldiq xavfi' : 'Stockout Risk'}
                    </span>
                    <span className="font-mono-num text-xs font-semibold text-amber-900 dark:text-amber-200">
                      {lowStockTarget.stock} {lang === 'uz' ? 'dona' : 'pcs'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {lang === 'uz'
                      ? `${lowStockTarget.nameUz} atigi ${lowStockTarget.stock} dona qoldi — 4 kun ichida tugaydi. ${lowStockTarget.recommendedRestock || 20} dona buyurtma berish tavsiya etiladi.`
                      : `${lowStockTarget.nameEn} has only ${lowStockTarget.stock} units left — will stock out in 4 days. AI recommends ordering ${lowStockTarget.recommendedRestock || 20} units.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('forecast')}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                  >
                    <span>{t.goToForecast}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Alert 2: Dead-stock */}
              {deadStockTarget && (
                <div className="rounded-lg border border-rose-200 dark:border-rose-800/70 bg-rose-50/50 dark:bg-rose-950/30 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300">
                      <PackageMinus className="h-3.5 w-3.5" />
                      {deadStockTarget.discountApplied
                        ? lang === 'uz'
                          ? 'Chegirma faollashtirildi'
                          : 'Discount Active'
                        : `Dead-stock · ${deadStockTarget.daysIdle} ${lang === 'uz' ? 'kun' : 'd'}`}
                    </span>
                    <span className="font-mono-num text-xs font-semibold text-rose-900 dark:text-rose-200">
                      {formatUZS(deadStockTarget.sellPrice, lang)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {deadStockTarget.discountApplied
                      ? lang === 'uz'
                        ? `${deadStockTarget.nameUz} narxi ${formatUZS(deadStockTarget.sellPrice, 'uz')} ga tushirildi va Telegram kanalga e'lon yuborildi.`
                        : `${deadStockTarget.nameEn} markdown (${formatUZS(deadStockTarget.sellPrice, 'en')}) is live and broadcasted to Telegram.`
                      : lang === 'uz'
                      ? `${deadStockTarget.nameUz} ${deadStockTarget.daysIdle} kundan beri sotilmayapti (Dead-stock). 20% chegirma yoki komplekt qilib sotish tavsiya etiladi.`
                      : `${deadStockTarget.nameEn} has had 0 sales for ${deadStockTarget.daysIdle} days (Dead-stock). Recommend an 18–20% markdown or bundle offer.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => onInspectDeadStock(deadStockTarget.id)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                  >
                    <span>{t.viewDiscount}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
