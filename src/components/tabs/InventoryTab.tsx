import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  HelpCircle,
  Package,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { COPY, formatUZS, getCategoryLabel } from '../../i18n';
import { InventoryItem, Language, ProductCategory } from '../../types';

interface InventoryTabProps {
  lang: Language;
  inventory: InventoryItem[];
  onApplyDiscount: (itemId: string, newPrice: number) => void;
  onAddProduct: (item: Omit<InventoryItem, 'id' | 'daysIdle' | 'dailyVelocity' | 'recommendedRestock' | 'keywords'>) => void;
  preselectedOptimizerId: string | null;
  onClearPreselectedOptimizer: () => void;
}

type StatusFilter = 'all' | 'low' | 'dead';

export const InventoryTab: React.FC<InventoryTabProps> = ({
  lang,
  inventory,
  onApplyDiscount,
  onAddProduct,
  preselectedOptimizerId,
  onClearPreselectedOptimizer,
}) => {
  const t = COPY[lang].inventory;
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ProductCategory>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [optimizerItemId, setOptimizerItemId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSkuInfo, setShowSkuInfo] = useState(false);

  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('Ustki kiyim');
  const [newSizes, setNewSizes] = useState('M, L, XL');
  const [newStock, setNewStock] = useState('15');
  const [newCost, setNewCost] = useState('150000');
  const [newPrice, setNewPrice] = useState('260000');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (preselectedOptimizerId) {
      setOptimizerItemId(preselectedOptimizerId);
      onClearPreselectedOptimizer();
    }
  }, [preselectedOptimizerId, onClearPreselectedOptimizer]);

  const filteredItems = inventory.filter((item) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.nameUz.toLowerCase().includes(q) ||
      item.nameEn.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.sizes.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === 'All' || item.category === categoryFilter;

    const isDead = item.daysIdle >= 30;
    const isLow = item.stock <= 5 && !isDead;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'low' && isLow) ||
      (statusFilter === 'dead' && isDead);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const optimizerItem = optimizerItemId
    ? inventory.find((i) => i.id === optimizerItemId) || null
    : null;

  const getRecommendedPrice = (item: InventoryItem) => {
    if (item.id === 'prod-koylak' && item.sellPrice === 240000) {
      return 195000;
    }
    const discounted = Math.round((item.sellPrice * 0.82) / 5000) * 5000;
    const minSafe = item.costPrice + 25000;
    return Math.max(discounted, minSafe);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedStock = Number(newStock);
    const parsedCost = Number(newCost);
    const parsedPrice = Number(newPrice);

    if (!newName.trim() || !newSku.trim() || parsedStock < 0 || parsedCost <= 0 || parsedPrice <= 0) {
      setFormError(
        lang === 'uz'
          ? "Iltimos, barcha maydonlarni to'g'ri to'ldiring."
          : 'Please fill in all fields with valid numbers.'
      );
      return;
    }

    onAddProduct({
      sku: newSku.trim().toUpperCase(),
      nameUz: newName.trim(),
      nameEn: newName.trim(),
      category: newCategory,
      sizes: newSizes.trim() || 'Standart',
      stock: parsedStock,
      costPrice: parsedCost,
      sellPrice: parsedPrice,
    });

    setNewName('');
    setNewSku('');
    setNewSizes('M, L, XL');
    setNewStock('15');
    setNewCost('150000');
    setNewPrice('260000');
    setFormError('');
    setShowAddModal(false);
  };

  const categories: ('All' | ProductCategory)[] = [
    'All',
    'Ustki kiyim',
    'Oyoq kiyim',
    'Aksessuarlar',
  ];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          {/* Search Input */}
          <div className="relative w-full lg:flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
            />
          </div>

          {/* Right Controls: Status Filter + Add Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex max-w-full items-center overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {(
                [
                  { id: 'all', label: t.statusAll },
                  { id: 'low', label: t.statusLow },
                  { id: 'dead', label: t.statusDead },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === st.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>{t.addBtn}</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
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

      {/* SKU Definition Callout (on click) */}
      {showSkuInfo && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 px-4 py-3 text-xs text-slate-700 dark:text-slate-200">
          <p className="leading-relaxed">
            <span className="font-bold text-indigo-700 dark:text-indigo-300">SKU (Stock Keeping Unit)</span>{' '}
            {lang === 'uz'
              ? "— ombordagi har bir alohida mahsulot va uning o'lcham/rang variantiga beriladigan noyob hisob kodi (artikul), masalan: SP-JK-01. Shu kod orqali Instagram va Telegram buyurtmalari yagona ombor bilan aniq sinxronlanadi."
              : '— a unique tracking code (article ID) assigned to each distinct product in your warehouse, such as SP-JK-01. It keeps Instagram and Telegram stock counts synchronized.'}
          </p>
          <button
            type="button"
            onClick={() => setShowSkuInfo(false)}
            className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
            aria-label="Close SKU info"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Inventory Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
              {t.emptyTitle}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.emptyDesc}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{t.cols.product}</span>
                      <button
                        type="button"
                        onClick={() => setShowSkuInfo((prev) => !prev)}
                        title={lang === 'uz' ? 'SKU nima?' : 'What is SKU?'}
                        className="rounded-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                        aria-label="What is SKU?"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </th>
                  <th className="px-4 py-3">{t.cols.sizes}</th>
                  <th className="px-4 py-3 text-right">{t.cols.stock}</th>
                  <th className="px-4 py-3 text-right">{t.cols.cost}</th>
                  <th className="px-4 py-3 text-right">{t.cols.price}</th>
                  <th className="px-4 py-3 text-right">{t.cols.margin}</th>
                  <th className="px-4 py-3">{t.cols.status}</th>
                  <th className="px-4 py-3 text-right">{t.cols.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const isDead = item.daysIdle >= 30;
                  const isLow = item.stock <= 5 && !isDead;
                  const marginPct = Math.round(
                    ((item.sellPrice - item.costPrice) / item.sellPrice) * 100
                  );

                  return (
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

                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.sizes}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono-num font-semibold whitespace-nowrap">
                        <span
                          className={
                            item.stock <= 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLow
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }
                        >
                          {item.stock} {lang === 'uz' ? 'dona' : 'pcs'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono-num text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatUZS(item.costPrice, lang)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono-num whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {formatUZS(item.sellPrice, lang)}
                        </div>
                        {item.discountApplied && item.originalSellPrice && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 line-through">
                            {formatUZS(item.originalSellPrice, lang)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono-num text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {marginPct}%
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.discountApplied ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            <Tag className="h-3 w-3" />
                            {t.appliedBadge}
                          </span>
                        ) : isDead ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                            <Flame className="h-3 w-3" />
                            {t.statuses.dead}: {item.daysIdle}{' '}
                            {lang === 'uz' ? 'kun' : 'd'}
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            {t.statuses.low}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            {t.statuses.ok}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {isDead && !item.discountApplied ? (
                          <button
                            type="button"
                            onClick={() => setOptimizerItemId(item.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{t.aiDiscountBtn}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOptimizerItemId(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            <span>{lang === 'uz' ? 'Narx tahlili' : 'Price AI'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Price Optimizer Slide-over Drawer */}
      {optimizerItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-[1px]">
          <div className="flex h-full w-full max-w-md flex-col justify-between bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto">
            <div>
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-semibold">{t.optimizer.title}</span>
                  </div>
                  <h3 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                    {lang === 'uz' ? optimizerItem.nameUz : optimizerItem.nameEn}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono-num">{optimizerItem.sku}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{t.optimizer.subtitle}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOptimizerItemId(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {optimizerItem.daysIdle >= 30 && (
                <div className="mt-4 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-300">
                  <span className="font-mono-num font-bold">{optimizerItem.daysIdle}</span>{' '}
                  {t.optimizer.idleWarning} ({optimizerItem.stock}{' '}
                  {lang === 'uz' ? 'dona qoldiq' : 'units'}).
                </div>
              )}

              {/* Price Comparison Card */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.optimizer.currentPrice}
                  </p>
                  <p className="mt-1 font-mono-num text-base font-bold text-slate-900 dark:text-white">
                    {formatUZS(optimizerItem.sellPrice, lang)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'uz' ? 'Kelish:' : 'Cost:'}{' '}
                    <span className="font-mono-num">
                      {formatUZS(optimizerItem.costPrice, lang)}
                    </span>
                  </p>
                </div>

                {(() => {
                  const recPrice = getRecommendedPrice(optimizerItem);
                  const pctDrop = Math.round(
                    ((optimizerItem.sellPrice - recPrice) / optimizerItem.sellPrice) * 100
                  );
                  const netProfitPerUnit = recPrice - optimizerItem.costPrice;
                  return (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5">
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                        {t.optimizer.recommendedPrice}
                      </p>
                      <p className="mt-1 font-mono-num text-base font-bold text-emerald-900 dark:text-emerald-200">
                        {formatUZS(recPrice, lang)}
                      </p>
                      <p className="mt-1 font-mono-num text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        -{pctDrop}% · +{formatUZS(netProfitPerUnit, lang)}{' '}
                        {lang === 'uz' ? 'sof foyda' : 'net'}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {t.optimizer.impactTitle}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {t.optimizer.impactText}
                  </p>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {t.optimizer.bundleLabel}
                  </p>
                  <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                    {t.optimizer.bundleValue}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  const rec = getRecommendedPrice(optimizerItem);
                  onApplyDiscount(optimizerItem.id, rec);
                  setOptimizerItemId(null);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{t.optimizer.applyBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => setOptimizerItemId(null)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {t.optimizer.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {t.addModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              {formError && (
                <p className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.addModal.name}
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Termo Kurtka"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.addModal.sku}
                  </label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="SP-JK-22"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.addModal.category}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="Ustki kiyim">{getCategoryLabel('Ustki kiyim', lang)}</option>
                    <option value="Oyoq kiyim">{getCategoryLabel('Oyoq kiyim', lang)}</option>
                    <option value="Aksessuarlar">{getCategoryLabel('Aksessuarlar', lang)}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.addModal.sizes}
                  </label>
                  <input
                    type="text"
                    value={newSizes}
                    onChange={(e) => setNewSizes(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.addModal.stock}
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.addModal.cost}
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.addModal.price}
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {t.addModal.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  {t.addModal.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
