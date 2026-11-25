import React, { useState } from 'react';
import { Calendar, Download, TrendingUp } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { COPY, formatUZS, getCategoryLabel } from '../../i18n';
import { InventoryItem, Language, ProductCategory, ThemeMode } from '../../types';

interface ForecastTabProps {
  lang: Language;
  theme: ThemeMode;
  inventory: InventoryItem[];
  onExportReport: (timeframe: number) => void;
}

export const ForecastTab: React.FC<ForecastTabProps> = ({
  lang,
  theme,
  inventory,
  onExportReport,
}) => {
  const t = COPY[lang].forecast;
  const isDark = theme === 'dark';
  const [timeframe, setTimeframe] = useState<7 | 14 | 30>(14);
  const [categoryFilter, setCategoryFilter] = useState<'All' | ProductCategory>('All');

  const scaleFactor = timeframe === 7 ? 0.55 : timeframe === 14 ? 1 : 1.95;

  const baseChartData = [
    {
      periodUz: timeframe === 7 ? '1–3 kun' : timeframe === 14 ? '1–4 kun' : '1-hafta (Payday)',
      periodEn: timeframe === 7 ? 'Days 1–3' : timeframe === 14 ? 'Days 1–4' : 'Week 1 (Payday)',
      apparel: Math.round(64 * scaleFactor),
      footwear: Math.round(42 * scaleFactor),
      accessories: Math.round(52 * scaleFactor),
      seasonalIndex: 112,
    },
    {
      periodUz: timeframe === 7 ? '4–5 kun' : timeframe === 14 ? '5–8 kun (Payday)' : '2-hafta (Qishki)',
      periodEn: timeframe === 7 ? 'Days 4–5' : timeframe === 14 ? 'Days 5–8 (Payday)' : 'Week 2 (Cold Snap)',
      apparel: Math.round(88 * scaleFactor),
      footwear: Math.round(56 * scaleFactor),
      accessories: Math.round(68 * scaleFactor),
      seasonalIndex: 134,
    },
    {
      periodUz: timeframe === 7 ? '6–7 kun' : timeframe === 14 ? '9–11 kun' : '3-hafta (Payday 2)',
      periodEn: timeframe === 7 ? 'Days 6–7' : timeframe === 14 ? 'Days 9–11' : 'Week 3 (Payday 2)',
      apparel: Math.round(79 * scaleFactor),
      footwear: Math.round(49 * scaleFactor),
      accessories: Math.round(61 * scaleFactor),
      seasonalIndex: 126,
    },
    {
      periodUz: timeframe === 7 ? 'Hafta oxiri' : timeframe === 14 ? '12–14 kun (Yangi yil)' : '4-hafta (Yangi yil)',
      periodEn: timeframe === 7 ? 'Weekend Peak' : timeframe === 14 ? 'Days 12–14 (Holiday)' : 'Week 4 (New Year)',
      apparel: Math.round(104 * scaleFactor),
      footwear: Math.round(64 * scaleFactor),
      accessories: Math.round(85 * scaleFactor),
      seasonalIndex: 148,
    },
  ];

  const restockRows = inventory
    .filter((item) => {
      const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
      const needsRestock = item.daysIdle < 30 && item.recommendedRestock > 0;
      return matchesCat && needsRestock;
    })
    .map((item) => {
      const daysUntilStockout = Math.max(
        1,
        Math.round(item.stock / Math.max(0.5, item.dailyVelocity))
      );
      const qty = Math.max(4, Math.round(item.recommendedRestock * scaleFactor));
      const requiredBudget = qty * item.costPrice;
      const expectedProfit = qty * (item.sellPrice - item.costPrice);
      return {
        item,
        daysUntilStockout,
        qty,
        requiredBudget,
        expectedProfit,
      };
    })
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

  const totalBudget = restockRows.reduce((sum, r) => sum + r.requiredBudget, 0);
  const totalProfit = restockRows.reduce((sum, r) => sum + r.expectedProfit, 0);

  const categories: ('All' | ProductCategory)[] = [
    'All',
    'Ustki kiyim',
    'Oyoq kiyim',
    'Aksessuarlar',
  ];

  const gridStroke = isDark ? '#1E293B' : '#E2E8F0';
  const tickFill = isDark ? '#94A3B8' : '#64748B';
  const axisStroke = isDark ? '#334155' : '#CBD5E1';

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:flex-row sm:items-center">
        {/* Timeframe Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            {t.timeframes.map((tf) => (
              <button
                key={tf.value}
                type="button"
                onClick={() => setTimeframe(tf.value as 7 | 14 | 30)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  timeframe === tf.value
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {getCategoryLabel(cat, lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Top Forecast Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              {t.chartTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.chartSub}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            {t.seasonalTags.map((tag, idx) => (
              <React.Fragment key={tag}>
                {idx > 0 && (
                  <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                    ·
                  </span>
                )}
                <span className="font-medium text-indigo-700 dark:text-indigo-400">
                  {tag}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={baseChartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey={lang === 'uz' ? 'periodUz' : 'periodEn'}
                tick={{ fontSize: 11, fill: tickFill }}
                axisLine={{ stroke: axisStroke }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: isDark ? '#34D399' : '#10B981' }}
                axisLine={false}
                tickLine={false}
                domain={[80, 170]}
                width={38}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: isDark ? '#F1F5F9' : '#0F172A',
                }}
                itemStyle={{
                  color: isDark ? '#E2E8F0' : '#0F172A',
                }}
                labelStyle={{
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  fontWeight: 600,
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: '12px',
                  paddingTop: '8px',
                  color: isDark ? '#CBD5E1' : '#334155',
                }}
              />
              {(categoryFilter === 'All' || categoryFilter === 'Ustki kiyim') && (
                <Bar
                  yAxisId="left"
                  dataKey="apparel"
                  name={getCategoryLabel('Ustki kiyim', lang)}
                  fill={isDark ? '#818CF8' : '#4F46E5'}
                  radius={[4, 4, 0, 0]}
                  barSize={26}
                />
              )}
              {(categoryFilter === 'All' || categoryFilter === 'Oyoq kiyim') && (
                <Bar
                  yAxisId="left"
                  dataKey="footwear"
                  name={getCategoryLabel('Oyoq kiyim', lang)}
                  fill={isDark ? '#38BDF8' : '#0EA5E9'}
                  radius={[4, 4, 0, 0]}
                  barSize={26}
                />
              )}
              {(categoryFilter === 'All' || categoryFilter === 'Aksessuarlar') && (
                <Bar
                  yAxisId="left"
                  dataKey="accessories"
                  name={getCategoryLabel('Aksessuarlar', lang)}
                  fill={isDark ? '#94A3B8' : '#64748B'}
                  radius={[4, 4, 0, 0]}
                  barSize={26}
                />
              )}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="seasonalIndex"
                name={lang === 'uz' ? 'Mavsumiy indeks (%)' : 'Seasonal Index (%)'}
                stroke={isDark ? '#34D399' : '#10B981'}
                strokeWidth={2.5}
                dot={{ r: 3, fill: isDark ? '#34D399' : '#10B981' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Restock Planner Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {t.plannerTitle}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t.plannerSub}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <th className="px-4 py-3">{t.cols.product}</th>
                <th className="px-4 py-3 text-right">{t.cols.stock}</th>
                <th className="px-4 py-3">{t.cols.daysLeft}</th>
                <th className="px-4 py-3 text-right">{t.cols.restockQty}</th>
                <th className="px-4 py-3 text-right">{t.cols.budget}</th>
                <th className="px-4 py-3 text-right">{t.cols.profit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {restockRows.map(({ item, daysUntilStockout, qty, requiredBudget, expectedProfit }) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {lang === 'uz' ? item.nameUz : item.nameEn}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono-num">{item.sku}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{getCategoryLabel(item.category, lang)}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {item.stock} {t.unitsUnit}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono-num text-xs font-semibold ${
                        daysUntilStockout <= 3
                          ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : daysUntilStockout <= 5
                          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {daysUntilStockout} {t.daysUnit}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                    +{qty} {t.unitsUnit}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {formatUZS(requiredBudget, lang)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    +{formatUZS(expectedProfit, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Budget Summary Card */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.nextPrefix} {timeframe} {t.dayUnitLong} {t.summaryBudgetLabel}{' '}
              <span className="font-mono-num font-bold text-slate-900 dark:text-white">
                {formatUZS(totalBudget, lang)}
              </span>
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-800 dark:text-emerald-400">
              {t.summaryProfitLabel}{' '}
              <span className="font-mono-num font-bold">
                +{formatUZS(totalProfit, lang)}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onExportReport(timeframe)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>{t.exportBtn}</span>
        </button>
      </div>
    </div>
  );
};
