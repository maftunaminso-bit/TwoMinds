import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  FileDown,
  Loader2,
  PackageMinus,
  Send,
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
import { COPY, formatUZS } from '../../i18n';
import {
  DashboardTab,
  InventoryItem,
  Language,
  OwnerDirectorAnswer,
  SalesForecastPoint,
  ShopOrder,
  ThemeMode,
} from '../../types';

interface OverviewTabProps {
  lang: Language;
  theme: ThemeMode;
  todaySales: number;
  aiResolvedCount: number;
  inventory: InventoryItem[];
  orders?: ShopOrder[];
  onNavigateTab: (tab: DashboardTab) => void;
  onInspectDeadStock: (itemId: string) => void;
  onGeneratePdfReport: () => void;
  onAskOwnerDirector?: (question: string) => Promise<OwnerDirectorAnswer>;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS_SHORT[d.getMonth()];
  return `${day} ${mon}`;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  lang,
  theme,
  todaySales,
  aiResolvedCount,
  inventory,
  orders = [],
  onNavigateTab,
  onInspectDeadStock,
  onGeneratePdfReport,
  onAskOwnerDirector,
}) => {
  const t = COPY[lang].overview;
  const isDark = theme === 'dark';

  const ownerChipsUz = [
    'Bugun nechta kurtka sotildi?',
    'Qaysi tovarlar tugayapti?',
    'Sof foyda qancha?',
  ];
  const ownerChipsEn = [
    'How many jackets sold today?',
    'Which items are running low?',
    'What is today’s net profit?',
  ];
  const ownerChips = lang === 'uz' ? ownerChipsUz : ownerChipsEn;

  const [selectedQuestion, setSelectedQuestion] = useState<string>(ownerChipsUz[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [aiDirectorAnswer, setAiDirectorAnswer] = useState<OwnerDirectorAnswer | null>(null);
  const [directorLoading, setDirectorLoading] = useState(false);
  const [directorError, setDirectorError] = useState('');

  const lowStockItems = inventory.filter((item) => item.stock <= 5 && item.daysIdle < 30);
  const lowStockCount = lowStockItems.length;

  const lowStockTarget =
    inventory.find((i) => i.id === 'prod-kurtka') ||
    lowStockItems[0] ||
    inventory[0];

  const deadStockTarget =
    inventory.find((i) => i.id === 'prod-koylak') ||
    inventory.find((i) => i.daysIdle >= 30) ||
    inventory[1] ||
    inventory[0];

  const dailyInventoryRunRate = useMemo(
    () =>
      inventory.reduce(
        (sum, item) => sum + item.dailyVelocity * item.sellPrice,
        0
      ),
    [inventory]
  );

  const { chartData, todayLabel, forecast7Day } = useMemo(() => {
    const now = new Date();
    const baseSales = Math.max(todaySales, dailyInventoryRunRate || 8000000);
    const points: SalesForecastPoint[] = [];
    const todayStr = formatShortDate(now);
    const histFactors = [0.68, 0.72, 0.74, 0.87, 0.9, 0.78, 0.76, 0.81, 0.88, 0.83, 0.91, 0.95, 0.85];

    for (let offset = -13; offset <= 14; offset++) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const label = formatShortDate(dt);
      const dayNum = dt.getDate();
      const isPayday = (dayNum >= 1 && dayNum <= 5) || (dayNum >= 15 && dayNum <= 20);
      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;

      if (offset < 0) {
        const idx = offset + 13;
        const factor = histFactors[idx] ?? 0.82;
        const val = Math.round((baseSales * factor) / 50000) * 50000;
        points.push({
          date: label,
          actual: val,
          forecast: null,
          noteUz: isPayday ? "Payday o'sishi" : undefined,
          noteEn: isPayday ? 'Payday lift' : undefined,
        });
      } else if (offset === 0) {
        points.push({
          date: label,
          actual: todaySales,
          forecast: todaySales,
        });
      } else {
        const trendBoost = 1 + offset * 0.022;
        const paydayBoost = isPayday ? 1.12 : 1;
        const weekendBoost = isWeekend ? 1.07 : 1;
        const val =
          Math.round((baseSales * trendBoost * paydayBoost * weekendBoost) / 50000) * 50000;
        const isSpike = isPayday || offset >= 10;
        points.push({
          date: label,
          actual: null,
          forecast: val,
          isSpike,
          noteUz: isPayday
            ? 'Oylik maosh kunlari talabi'
            : offset === 10
            ? 'Mavsumiy talab +32%'
            : undefined,
          noteEn: isPayday
            ? 'Payday demand lift'
            : offset === 10
            ? 'Seasonal demand +32%'
            : undefined,
        });
      }
    }

    const next7Sum = points
      .filter((p) => p.actual === null && p.forecast !== null)
      .slice(0, 7)
      .reduce((sum, p) => sum + (p.forecast || 0), 0);

    return {
      chartData: points,
      todayLabel: todayStr,
      forecast7Day: next7Sum,
    };
  }, [todaySales, dailyInventoryRunRate]);

  // Live calculations for Owner Telegram AI Director initial state
  const avgMargin =
    inventory.length > 0
      ? inventory.reduce(
          (sum, item) => sum + (item.sellPrice - item.costPrice) / Math.max(1, item.sellPrice),
          0
        ) / inventory.length
      : 0.36;
  const estimatedNetProfit = Math.round(todaySales * avgMargin);
  const jacketOrdersCount =
    orders.filter((o) => o.productName.toLowerCase().includes('kurtka')).length;

  const fallbackSummary = useMemo((): OwnerDirectorAnswer => {
    const lower = selectedQuestion.toLowerCase();
    if (lower.includes('kurtka') || lower.includes('jacket') || lower.includes('nechta')) {
      return {
        headline:
          lang === 'uz'
            ? `Bugun bot orqali ${jacketOrdersCount} ta kurtka buyurtmasi (${lowStockTarget?.stock ?? 0} dona qoldi)`
            : `${jacketOrdersCount} jacket bot orders today (${lowStockTarget?.stock ?? 0} left)`,
        detail:
          lang === 'uz'
            ? `Asosiy pozitsiya: ${lowStockTarget?.nameUz || 'Oversize Kurtka (Qora)'}. Ombor qoldig'i: ${lowStockTarget?.stock ?? 0} dona.`
            : `Top item: ${lowStockTarget?.nameEn || 'Oversize Jacket (Black)'}. Remaining stock: ${lowStockTarget?.stock ?? 0} units.`,
        metricLabel: lang === 'uz' ? 'Qolgan zaxira qiymati' : 'Remaining Value',
        metricValue: formatUZS((lowStockTarget?.stock || 0) * (lowStockTarget?.sellPrice || 0), lang),
      };
    }
    if (lower.includes('tugayapti') || lower.includes('low') || lower.includes('qoldi') || lower.includes('tovar')) {
      const topLowList = lowStockItems
        .slice(0, 3)
        .map((i) => `${lang === 'uz' ? i.nameUz : i.nameEn} (${i.stock} ${lang === 'uz' ? 'dona' : 'pcs'})`)
        .join(', ');
      return {
        headline:
          lang === 'uz'
            ? `${lowStockCount} ta SKU kritik qoldiqda (≤ 5 dona)`
            : `${lowStockCount} SKUs at critical low stock (≤ 5 units)`,
        detail:
          lang === 'uz'
            ? `Tezkor to'ldirish kerak: ${topLowList || 'Kritik SKU yo‘q'}.`
            : `Immediate restock needed: ${topLowList || 'No critical SKUs'}.`,
        metricLabel: lang === 'uz' ? 'Kritik SKUlar' : 'Critical SKUs',
        metricValue: `${lowStockCount} ${lang === 'uz' ? 'ta SKU' : 'SKUs'}`,
      };
    }
    return {
      headline:
        lang === 'uz'
          ? `Bugungi hisoblangan sof foyda: ${formatUZS(estimatedNetProfit, 'uz')}`
          : `Today's estimated net profit: ${formatUZS(estimatedNetProfit, 'en')}`,
      detail:
        lang === 'uz'
          ? `Jami savdo: ${formatUZS(todaySales, 'uz')} · O'rtacha marja: ${Math.round(avgMargin * 100)}%. AI Kassir ${aiResolvedCount} ta murojaatni yopdi.`
          : `Gross revenue: ${formatUZS(todaySales, 'en')} · Avg margin: ${Math.round(avgMargin * 100)}%. AI Cashier resolved ${aiResolvedCount} inquiries.`,
      metricLabel: lang === 'uz' ? "O'rtacha marja" : 'Avg Net Margin',
      metricValue: `${Math.round(avgMargin * 100)}%`,
    };
  }, [
    selectedQuestion,
    lang,
    jacketOrdersCount,
    lowStockTarget,
    lowStockItems,
    lowStockCount,
    estimatedNetProfit,
    todaySales,
    avgMargin,
    aiResolvedCount,
  ]);

  const ownerSummary = aiDirectorAnswer || fallbackSummary;

  const askRealDirector = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setSelectedQuestion(trimmed);
    if (!onAskOwnerDirector) return;
    setDirectorLoading(true);
    setDirectorError('');
    try {
      const answer = await onAskOwnerDirector(trimmed);
      setAiDirectorAnswer(answer);
    } catch (err: unknown) {
      setDirectorError(
        err instanceof Error
          ? err.message
          : lang === 'uz'
          ? 'Gemini AI javob olishda xatolik yuz berdi.'
          : 'Failed to get Gemini AI response.'
      );
    } finally {
      setDirectorLoading(false);
    }
  };

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
                  x={todayLabel}
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
                      ? `${lowStockTarget.nameUz} (${lowStockTarget.highlightSize || 'L'} razmer) atigi ${lowStockTarget.stock} dona qoldi — 4 kun ichida tugaydi. ${lowStockTarget.recommendedRestock || 20} dona buyurtma berish tavsiya etiladi.`
                      : `${lowStockTarget.nameEn} (Size ${lowStockTarget.highlightSize || 'L'}) has only ${lowStockTarget.stock} units left — will stock out in 4 days. AI recommends ordering ${lowStockTarget.recommendedRestock || 20} units.`}
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
                        ? `${deadStockTarget.nameUz} narxi ${formatUZS(deadStockTarget.sellPrice, 'uz')} ga tushirildi va Telegram/Instagramga post chiqarildi.`
                        : `${deadStockTarget.nameEn} markdown (${formatUZS(deadStockTarget.sellPrice, 'en')}) is live and published to Telegram & Instagram.`
                      : lang === 'uz'
                      ? `${deadStockTarget.nameUz} ${deadStockTarget.daysIdle} kundan beri sotilmayapti (Dead-stock). 20% chegirma va Telegram kanalga avtomatik post chiqarish tavsiya etiladi.`
                      : `${deadStockTarget.nameEn} has had 0 sales for ${deadStockTarget.daysIdle} days (Dead-stock). Recommend 20% markdown and auto-posting to your Telegram channel.`}
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

      {/* Owner Telegram AI Director Mini-Widget */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {lang === 'uz'
                  ? "Do'kon Egasi Uchun Telegram AI Direktor"
                  : 'Telegram AI Director for Shop Owner'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'uz'
                  ? "Telegramda istalgan savolni bering — AI ombor va savdo ma'lumotlaridan tezkor hisobot beradi."
                  : 'Ask your private Telegram Director bot anything for instant executive inventory & profit answers.'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400 whitespace-nowrap shrink-0">
            <Bot className="h-3.5 w-3.5" />
            <span>@SavdoPilot_Director_Bot</span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-center">
          {/* Quick-Click Chips + Custom Prompt */}
          <div className="lg:col-span-6 space-y-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {lang === 'uz'
                ? 'Tezkor savolni bosing yoki yozing:'
                : 'Click a quick owner question or ask your own:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {ownerChips.map((chip) => {
                const isActive = selectedQuestion === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    disabled={directorLoading}
                    onClick={() => void askRealDirector(chip)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customQuestion.trim() || directorLoading) return;
                const q = customQuestion.trim();
                setCustomQuestion('');
                void askRealDirector(q);
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                value={customQuestion}
                disabled={directorLoading}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder={
                  lang === 'uz'
                    ? "Masalan: Bugun sof foyda qancha?"
                    : 'e.g. How is today’s margin?'
                }
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!customQuestion.trim() || directorLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {directorLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{lang === 'uz' ? "So'rash" : 'Ask'}</span>
              </button>
            </form>
            {directorError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{directorError}</span>
              </div>
            )}
          </div>

          {/* Instant Executive AI Summary Card */}
          <div className="lg:col-span-6">
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 p-4">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
                  {directorLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>{lang === 'uz' ? 'Gemini AI Direktor Javobi' : 'Gemini AI Director Summary'}</span>
                </span>
                <span className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                  {directorLoading
                    ? lang === 'uz'
                      ? 'Tahlil qilinmoqda...'
                      : 'Analyzing...'
                    : aiDirectorAnswer
                    ? 'Gemini Live'
                    : lang === 'uz'
                    ? 'Real vaqt'
                    : 'Live'}
                </span>
              </div>
              <p className="mt-2 font-display text-sm font-bold text-slate-900 dark:text-white">
                {ownerSummary.headline}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {ownerSummary.detail}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-indigo-200/70 dark:border-indigo-800/70 pt-2.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {ownerSummary.metricLabel}:
                </span>
                <span className="font-mono-num font-bold text-indigo-700 dark:text-indigo-300">
                  {ownerSummary.metricValue}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
