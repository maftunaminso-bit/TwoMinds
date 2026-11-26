import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  Flame,
  HelpCircle,
  Loader2,
  Package,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { SAMPLE_AI_IMPORT_PRODUCTS } from '../../data/initialData';
import { COPY, formatUZS, getCategoryLabel } from '../../i18n';
import {
  DeadStockMarketingPlan,
  InventoryItem,
  Language,
  ProductCategory,
  SmartParsedProduct,
} from '../../types';
import { downloadCsv } from '../../utils/csvExport';

interface InventoryTabProps {
  lang: Language;
  inventory: InventoryItem[];
  onApplyDiscount: (itemId: string, newPrice: number, promoText?: string) => void;
  onAddProduct: (
    item: Omit<InventoryItem, 'id' | 'daysIdle' | 'dailyVelocity' | 'recommendedRestock' | 'keywords'>
  ) => void;
  onSmartParseFile?: (payload: {
    fileName: string;
    mimeType: string;
    fileBase64?: string;
    textContent?: string;
  }) => Promise<SmartParsedProduct[]>;
  onSmartImport?: (
    items: Array<
      Omit<InventoryItem, 'id' | 'daysIdle' | 'dailyVelocity' | 'recommendedRestock' | 'keywords'>
    >
  ) => Promise<void>;
  onGenerateAiMarketing?: (itemId: string) => Promise<DeadStockMarketingPlan>;
  preselectedOptimizerId: string | null;
  onClearPreselectedOptimizer: () => void;
  openSmartImport?: boolean;
  onClearOpenSmartImport?: () => void;
}

type StatusFilter = 'all' | 'low' | 'dead';

export const InventoryTab: React.FC<InventoryTabProps> = ({
  lang,
  inventory,
  onApplyDiscount,
  onAddProduct,
  onSmartParseFile,
  onSmartImport,
  onGenerateAiMarketing,
  preselectedOptimizerId,
  onClearPreselectedOptimizer,
  openSmartImport,
  onClearOpenSmartImport,
}) => {
  const t = COPY[lang].inventory;
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ProductCategory>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [optimizerItemId, setOptimizerItemId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);

  // Real Smart Import states
  const [isScanningImport, setIsScanningImport] = useState(false);
  const [isCommittingImport, setIsCommittingImport] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [parsedPreview, setParsedPreview] = useState<
    Array<SmartParsedProduct & { selected: boolean }>
  >([]);

  // Real AI Marketing Drawer states
  const [aiPlan, setAiPlan] = useState<DeadStockMarketingPlan | null>(null);
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [aiPlanError, setAiPlanError] = useState('');
  const [editableRecPrice, setEditableRecPrice] = useState<number>(0);
  const [editablePromoText, setEditablePromoText] = useState<string>('');

  const [promoCopied, setPromoCopied] = useState(false);
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

  useEffect(() => {
    if (openSmartImport) {
      setShowSmartImportModal(true);
      onClearOpenSmartImport?.();
    }
  }, [openSmartImport, onClearOpenSmartImport]);

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

  const buildFallbackMarketingCopy = (item: InventoryItem, recPrice: number) => {
    const pct = Math.round(((item.sellPrice - recPrice) / Math.max(1, item.sellPrice)) * 100);
    if (lang === 'en') {
      return `🔥 FLASH AUTOPILOT OFFER!\n\n${item.nameEn} (${item.sizes})\n❌ Was: ${formatUZS(item.sellPrice, 'en')}\n✅ Today Only: ${formatUZS(recPrice, 'en')} (-${pct}%)\n\n📦 Only ${item.stock} units left! Pay via Click/Payme right in DM & get fast Yandex Delivery.\n👉 Reply "Order" to lock yours!`;
    }
    return `🔥 MAXSUS CHEGIRMA VA KOMPLEKT!\n\n${item.nameUz} (${item.sizes})\n❌ Eski narx: ${formatUZS(item.sellPrice, 'uz')}\n✅ Bugungi aksiya: ${formatUZS(recPrice, 'uz')} (-${pct}%)\n\n📦 Omborda atigi ${item.stock} dona qoldi! Chat ichida Click/Payme orqali to'lang — Yandex kuryer 20 daqiqada yetkazib beradi.\n👉 Buyurtma uchun Direct yoki Botga yozing!`;
  };

  // Trigger real Gemini marketing plan when drawer opens
  useEffect(() => {
    if (!optimizerItem) {
      setAiPlan(null);
      setAiPlanError('');
      setAiPlanLoading(false);
      return;
    }
    const fallbackPrice = getRecommendedPrice(optimizerItem);
    setEditableRecPrice(fallbackPrice);
    setEditablePromoText(buildFallbackMarketingCopy(optimizerItem, fallbackPrice));
    setAiPlan(null);
    setAiPlanError('');

    if (!onGenerateAiMarketing) return;
    let cancelled = false;
    setAiPlanLoading(true);
    onGenerateAiMarketing(optimizerItem.id)
      .then((plan) => {
        if (cancelled) return;
        setAiPlan(plan);
        setEditableRecPrice(plan.recommendedSellPrice);
        setEditablePromoText(lang === 'en' ? plan.promoPostEn : plan.promoPostUz);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAiPlanError(
          err instanceof Error
            ? err.message
            : lang === 'uz'
            ? 'AI marketing tahlilini olishda xato.'
            : 'Failed to generate AI marketing plan.'
        );
      })
      .finally(() => {
        if (!cancelled) setAiPlanLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [optimizerItemId, lang]);

  const handleExportInventoryCsv = () => {
    downloadCsv(
      `savdopilot-ombor-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'SKU',
        lang === 'uz' ? 'Nomi (UZ)' : 'Name (UZ)',
        'Name (EN)',
        lang === 'uz' ? 'Kategoriya' : 'Category',
        lang === 'uz' ? 'Razmerlar' : 'Sizes',
        lang === 'uz' ? 'Qoldiq' : 'Stock',
        lang === 'uz' ? 'Kelish narxi (UZS)' : 'Cost (UZS)',
        lang === 'uz' ? 'Sotish narxi (UZS)' : 'Price (UZS)',
        lang === 'uz' ? 'Turgan kun' : 'Days Idle',
      ],
      filteredItems.map((i) => [
        i.sku,
        i.nameUz,
        i.nameEn,
        i.category,
        i.sizes,
        i.stock,
        i.costPrice,
        i.sellPrice,
        i.daysIdle,
      ])
    );
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

  const handleRealFileUpload = async (file: File) => {
    if (isScanningImport) return;
    setImportError('');
    setParsedPreview([]);
    setImportFileName(file.name);
    setIsScanningImport(true);

    try {
      const lower = file.name.toLowerCase();
      const isTextLike =
        lower.endsWith('.csv') || lower.endsWith('.txt') || file.type === 'text/csv';

      let fileBase64: string | undefined;
      let textContent: string | undefined;

      if (isTextLike) {
        textContent = await file.text();
      } else {
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const raw = String(reader.result || '');
            const idx = raw.indexOf(',');
            resolve(idx >= 0 ? raw.slice(idx + 1) : raw);
          };
          reader.onerror = () => reject(new Error('Failed to read file.'));
          reader.readAsDataURL(file);
        });
      }

      if (!onSmartParseFile) {
        throw new Error('Smart parse endpoint not configured.');
      }

      const items = await onSmartParseFile({
        fileName: file.name,
        mimeType: file.type || (lower.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/plain'),
        fileBase64,
        textContent,
      });

      if (items.length === 0) {
        setImportError(
          lang === 'uz'
            ? "Fayldan mahsulotlar ajratib bo'lmadi. Jadval yoki rasm aniqroq ekanligini tekshiring."
            : 'No products could be extracted from the file.'
        );
      } else {
        setParsedPreview(items.map((it) => ({ ...it, selected: true })));
      }
    } catch (err: unknown) {
      setImportError(
        err instanceof Error
          ? err.message
          : lang === 'uz'
          ? 'Faylni AI bilan tahlil qilishda xato yuz berdi.'
          : 'Failed to parse file with AI.'
      );
    } finally {
      setIsScanningImport(false);
    }
  };

  const handleLoadDemoSamplePreview = async () => {
    if (isScanningImport) return;
    setImportError('');
    setImportFileName('namuna_daftar_ombor.xlsx');
    setIsScanningImport(true);
    try {
      if (onSmartParseFile) {
        const csvSample = [
          'SKU,Nomi,Kategoriya,Razmerlar,Qoldiq,Kelish,Sotish',
          ...SAMPLE_AI_IMPORT_PRODUCTS.map(
            (p) => `${p.sku},"${p.nameUz}",${p.category},"${p.sizes}",${p.stock},${p.costPrice},${p.sellPrice}`
          ),
        ].join('\n');
        const items = await onSmartParseFile({
          fileName: 'namuna_daftar_ombor.csv',
          mimeType: 'text/csv',
          textContent: csvSample,
        });
        setParsedPreview(items.map((it) => ({ ...it, selected: true })));
      } else {
        setParsedPreview(SAMPLE_AI_IMPORT_PRODUCTS.map((it) => ({ ...it, selected: true })));
      }
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Sample parse failed');
    } finally {
      setIsScanningImport(false);
    }
  };

  const handleCommitParsedImport = async () => {
    const selected = parsedPreview.filter((p) => p.selected);
    if (selected.length === 0 || isCommittingImport) return;
    setIsCommittingImport(true);
    try {
      const payload = selected.map(({ selected: _sel, ...rest }) => rest);
      if (onSmartImport) {
        await onSmartImport(payload);
      } else {
        for (const item of payload) {
          onAddProduct(item);
        }
      }
      setParsedPreview([]);
      setImportFileName(null);
      setShowSmartImportModal(false);
    } finally {
      setIsCommittingImport(false);
    }
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
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
          {/* Search Input */}
          <div className="relative w-full xl:flex-1 xl:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
            />
          </div>

          {/* Right Controls: Status Filter + AI Smart Import + Add Button */}
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
              onClick={handleExportInventoryCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportError('');
                setParsedPreview([]);
                setShowSmartImportModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Zap className="h-4 w-4" />
              <span>{t.smartImportBtn}</span>
            </button>

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
                  const recPrice = editableRecPrice || getRecommendedPrice(optimizerItem);
                  const pctDrop = Math.round(
                    ((optimizerItem.sellPrice - recPrice) / Math.max(1, optimizerItem.sellPrice)) *
                      100
                  );
                  const netProfitPerUnit = recPrice - optimizerItem.costPrice;
                  return (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5">
                      <label className="block text-xs font-medium text-emerald-800 dark:text-emerald-300">
                        {t.optimizer.recommendedPrice}
                      </label>
                      <input
                        type="number"
                        step={1000}
                        min={1000}
                        value={recPrice}
                        onChange={(e) => setEditableRecPrice(Math.max(1000, Number(e.target.value) || 0))}
                        className="mt-1 w-full rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-2 py-1 font-mono-num text-sm font-bold text-emerald-900 dark:text-emerald-200 focus:outline-none"
                      />
                      <p className="mt-1 font-mono-num text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        -{pctDrop}% · +{formatUZS(netProfitPerUnit, lang)}{' '}
                        {lang === 'uz' ? 'sof foyda' : 'net'}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {aiPlanLoading && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>
                    {lang === 'uz'
                      ? 'Gemini AI narx elastikligi va sotuvchi post yozmoqda...'
                      : 'Gemini AI is calculating elasticity and writing promo copy...'}
                  </span>
                </div>
              )}

              {aiPlanError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{aiPlanError}</span>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {t.optimizer.impactTitle}
                    </p>
                    {aiPlan?.expectedMultiplier && (
                      <span className="rounded bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 font-mono-num text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        {aiPlan.expectedMultiplier}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {aiPlan
                      ? lang === 'uz'
                        ? aiPlan.elasticityNoteUz
                        : aiPlan.elasticityNoteEn
                      : `${formatUZS(optimizerItem.sellPrice, lang)} → ${formatUZS(
                          editableRecPrice || getRecommendedPrice(optimizerItem),
                          lang
                        )} · ${t.optimizer.impactText}`}
                  </p>
                </div>

                {/* Editable AI Marketing Copy */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {t.optimizer.bundleLabel}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(editablePromoText);
                        setPromoCopied(true);
                        setTimeout(() => setPromoCopied(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {promoCopied ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>
                        {promoCopied
                          ? lang === 'uz'
                            ? 'Nusxalandi'
                            : 'Copied'
                          : lang === 'uz'
                          ? 'Nusxalash'
                          : 'Copy'}
                      </span>
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={editablePromoText}
                    onChange={(e) => setEditablePromoText(e.target.value)}
                    className="w-full rounded-lg border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/50 dark:bg-indigo-950/30 p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  const rec = editableRecPrice || getRecommendedPrice(optimizerItem);
                  onApplyDiscount(optimizerItem.id, rec, editablePromoText);
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

      {/* AI Smart Import Modal (Real Excel / CSV / Notebook Photo Parser + Preview) */}
      {showSmartImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {lang === 'uz'
                      ? 'AI Smart Import (Haqiqiy Excel / Daftar Tahlili)'
                      : 'AI Smart Import (Real Excel / Notebook Parser)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'uz'
                      ? 'Haqiqiy .xlsx, .csv fayl yoki qo‘lyozma daftar rasmini yuklang — Gemini AI SKU jadvaliga aylantiradi'
                      : 'Upload a real .xlsx, .csv, or notebook photo — Gemini AI extracts structured SKUs'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isScanningImport || isCommittingImport}
                onClick={() => setShowSmartImportModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isScanningImport ? (
              <div className="my-6 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 p-6 text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'uz'
                    ? `Gemini AI faylni tahlil qilmoqda (${importFileName})...`
                    : `Gemini AI parsing ${importFileName}...`}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {lang === 'uz'
                    ? 'Mahsulot nomlari, SKU, razmerlar, kelish va sotish narxlari ajratilmoqda...'
                    : 'Extracting product names, SKUs, sizes, cost and sell prices...'}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {importError && (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 p-5 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer">
                  <Upload className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {lang === 'uz'
                      ? 'Excel (.xlsx / .csv) yoki Daftar rasmini (.jpg / .png / .webp) tanlang'
                      : 'Choose Excel (.xlsx / .csv) or Notebook Photo (.jpg / .png / .webp)'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {importFileName
                      ? `${lang === 'uz' ? 'Tanlangan:' : 'Selected:'} ${importFileName}`
                      : lang === 'uz'
                      ? 'Yuklangandan so‘ng tasdiqlash uchun jadval ko‘rsatiladi'
                      : 'Extracted items appear in an editable preview before saving'}
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.csv,.txt,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void handleRealFileUpload(f);
                    }}
                  />
                </label>

                {parsedPreview.length > 0 ? (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>
                          {lang === 'uz'
                            ? `${parsedPreview.length} ta tovar ajratildi — tasdiqlang:`
                            : `${parsedPreview.length} items extracted — review & confirm:`}
                        </span>
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      {parsedPreview.map((item, idx) => (
                        <div key={`${item.sku}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                          <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) =>
                                setParsedPreview((prev) =>
                                  prev.map((row, rIdx) =>
                                    rIdx === idx ? { ...row, selected: e.target.checked } : row
                                  )
                                )
                              }
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">
                                {lang === 'uz' ? item.nameUz : item.nameEn}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-num">
                                {item.sku} · {item.category} · {item.sizes}
                              </p>
                            </div>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={item.stock}
                              onChange={(e) =>
                                setParsedPreview((prev) =>
                                  prev.map((row, rIdx) =>
                                    rIdx === idx
                                      ? { ...row, stock: Math.max(0, Number(e.target.value) || 0) }
                                      : row
                                  )
                                )
                              }
                              className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-right font-mono-num text-xs"
                              title={lang === 'uz' ? 'Soni' : 'Stock'}
                            />
                            <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                              {formatUZS(item.sellPrice, lang)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'uz'
                      ? "Fayl bo'lmasa, quyidagi \"Namuna bilan sinash\" tugmasini bosib AI skanerlashni tekshirishingiz mumkin."
                      : 'No file handy? Click "Try Sample" below to test AI extraction.'}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => void handleLoadDemoSamplePreview()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{lang === 'uz' ? 'Namuna bilan sinash' : 'Try Sample'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSmartImportModal(false)}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      {t.addModal.cancel}
                    </button>
                    <button
                      type="button"
                      disabled={parsedPreview.filter((p) => p.selected).length === 0 || isCommittingImport}
                      onClick={() => void handleCommitParsedImport()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isCommittingImport && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>
                        {lang === 'uz'
                          ? `Omborga qo'shish (${parsedPreview.filter((p) => p.selected).length})`
                          : `Import Selected (${parsedPreview.filter((p) => p.selected).length})`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
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
