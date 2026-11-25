import { useEffect, useState } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { AdminPage } from './components/AdminPage';
import { DashboardLayout } from './components/DashboardLayout';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SupportChatbot } from './components/SupportChatbot';
import { ForecastTab } from './components/tabs/ForecastTab';
import { InventoryTab } from './components/tabs/InventoryTab';
import { OverviewTab } from './components/tabs/OverviewTab';
import { SalesBotTab } from './components/tabs/SalesBotTab';
import { INITIAL_SHOPS } from './data/initialData';
import { formatUZS } from './i18n';
import {
  AppView,
  AuthSession,
  ChatMessage,
  DashboardTab,
  InventoryItem,
  Language,
  PlanTier,
  ShopWorkspace,
  ThemeMode,
  ToastNotification,
} from './types';
import { generateAiBotReply } from './utils/aiResponder';
import { generateShopPdfReport } from './utils/pdfReport';

export default function App() {
  const [lang, setLang] = useState<Language>('uz');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [view, setView] = useState<AppView>('landing');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Multi-tenant shop workspaces
  const [shops, setShops] = useState<ShopWorkspace[]>(INITIAL_SHOPS);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeShopId, setActiveShopId] = useState<string>(INITIAL_SHOPS[0].id);
  const [activeConversationMap, setActiveConversationMap] = useState<Record<string, string>>({
    [INITIAL_SHOPS[0].id]: INITIAL_SHOPS[0].conversations[0].id,
    [INITIAL_SHOPS[1].id]: INITIAL_SHOPS[1].conversations[0].id,
    [INITIAL_SHOPS[2].id]: INITIAL_SHOPS[2].conversations[0].id,
  });

  const [preselectedOptimizerId, setPreselectedOptimizerId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Sync Tailwind dark class on <html> when inside Dashboard or Admin view
  useEffect(() => {
    const isDashboardSurface = view === 'dashboard' || view === 'admin';
    document.documentElement.classList.toggle('dark', theme === 'dark' && isDashboardSurface);
  }, [theme, view]);

  const activeShop = shops.find((s) => s.id === activeShopId) || shops[0];

  const activeConversationId =
    activeConversationMap[activeShop.id] || activeShop.conversations[0]?.id || '';

  const pushToast = (
    title: string,
    description?: string,
    tone: ToastNotification['tone'] = 'success'
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, description, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleOpenDashboard = (tab: DashboardTab = 'overview') => {
    setActiveTab(tab);
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLanding = () => {
    setView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = () => {
    setView('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (nextSession: AuthSession) => {
    setSession(nextSession);
    if (nextSession.role === 'admin') {
      setView('admin');
      pushToast(
        lang === 'uz' ? 'Super Admin paneliga kirdingiz' : 'Signed in to Super Admin',
        lang === 'uz'
          ? "Barcha do'kon panellarini boshqarishingiz mumkin."
          : 'You can now provision and manage all shop panels.',
        'info'
      );
    } else if (nextSession.shopId) {
      const targetShop = shops.find((s) => s.id === nextSession.shopId);
      setActiveShopId(nextSession.shopId);
      setActiveTab('overview');
      setView('dashboard');
      if (targetShop) {
        pushToast(
          lang === 'uz'
            ? `${targetShop.name} paneli ochildi`
            : `Signed in to ${targetShop.name}`,
          `${targetShop.branch} · ${targetShop.plan}`,
          'success'
        );
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setSession(null);
    setView('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin Console Handlers
  const handleCreateShop = (payload: {
    name: string;
    branch: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    plan: PlanTier;
    instagram: boolean;
    telegram: boolean;
  }) => {
    const newId = `shop-${Date.now()}`;
    const starterProdId = `${newId}-p1`;
    const starterDeadId = `${newId}-p2`;

    const newShop: ShopWorkspace = {
      id: newId,
      name: payload.name,
      branch: payload.branch,
      ownerName: payload.ownerName,
      ownerEmail: payload.ownerEmail,
      ownerPassword: payload.ownerPassword,
      plan: payload.plan,
      status: 'active',
      channels: {
        instagram: payload.instagram,
        telegram: payload.telegram,
      },
      todaySales: 2850000,
      aiResolvedCount: 18,
      createdAt: '2026-11-25',
      inventory: [
        {
          id: starterProdId,
          sku: `${payload.name.slice(0, 2).toUpperCase()}-001`,
          nameUz: 'Mavsumiy Kurtka (Qora)',
          nameEn: 'Seasonal Jacket (Black)',
          category: 'Ustki kiyim',
          sizes: 'M, L, XL',
          stock: 4,
          costPrice: 220000,
          sellPrice: 360000,
          daysIdle: 2,
          dailyVelocity: 1.3,
          recommendedRestock: 18,
          keywords: ['kurtka', 'jacket', 'qora', 'black', 'ustki'],
        },
        {
          id: starterDeadId,
          sku: `${payload.name.slice(0, 2).toUpperCase()}-002`,
          nameUz: 'Sport Krossovka',
          nameEn: 'Sport Sneakers',
          category: 'Oyoq kiyim',
          sizes: '41, 42, 43',
          stock: 12,
          costPrice: 250000,
          sellPrice: 410000,
          daysIdle: 33,
          dailyVelocity: 0.2,
          recommendedRestock: 0,
          keywords: ['krossovka', 'sneaker', 'sport', '42'],
        },
      ],
      conversations: [
        {
          id: `${newId}-conv1`,
          customerName: 'Test Mijoz',
          handle: '@mijoz_demo',
          initials: 'TM',
          platform: payload.instagram ? 'instagram' : 'telegram',
          status: 'ai_replied',
          lastActive: '14:15',
          contextProductId: starterProdId,
          messages: [
            {
              id: `${newId}-m1`,
              sender: 'customer',
              text: 'Salom, Mavsumiy kurtka L razmer bormi? Narxi qancha?',
              timestamp: '14:14',
            },
            {
              id: `${newId}-m2`,
              sender: 'ai',
              text: "Assalomu alaykum! Ha, Mavsumiy Kurtka (Qora) L razmer omborimizda 4 dona mavjud. Narxi: 360,000 so'm. Rasmiylashtiramizmi?",
              timestamp: '14:15',
            },
          ],
        },
      ],
    };

    setShops((prev) => [newShop, ...prev]);
    setActiveConversationMap((prev) => ({
      ...prev,
      [newId]: newShop.conversations[0].id,
    }));

    pushToast(
      lang === 'uz'
        ? `"${newShop.name}" uchun alohida panel yaratildi`
        : `Provisioned isolated panel for "${newShop.name}"`,
      `Login: ${newShop.ownerEmail} · ${newShop.plan}`,
      'success'
    );
  };

  const handleOpenShopPanelFromAdmin = (shopId: string) => {
    setActiveShopId(shopId);
    setActiveTab('overview');
    setView('dashboard');
    const target = shops.find((s) => s.id === shopId);
    if (target) {
      pushToast(
        lang === 'uz'
          ? `${target.name} paneliga o'tildi`
          : `Switched to ${target.name} panel`,
        `${target.branch} · ${target.plan}`,
        'info'
      );
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleShopStatus = (shopId: string) => {
    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? { ...s, status: s.status === 'active' ? 'paused' : 'active' }
          : s
      )
    );
    const target = shops.find((s) => s.id === shopId);
    if (target) {
      const nextStatus = target.status === 'active' ? 'paused' : 'active';
      pushToast(
        lang === 'uz'
          ? `${target.name} holati: ${nextStatus === 'active' ? 'Faol' : "To'xtatilgan"}`
          : `${target.name} status: ${nextStatus}`,
        undefined,
        'info'
      );
    }
  };

  const handleChangeShopPlan = (shopId: string, nextPlan: PlanTier) => {
    setShops((prev) =>
      prev.map((s) => (s.id === shopId ? { ...s, plan: nextPlan } : s))
    );
    const target = shops.find((s) => s.id === shopId);
    if (target) {
      pushToast(
        lang === 'uz'
          ? `${target.name} tarifi yangilandi`
          : `${target.name} plan updated`,
        `${nextPlan}`,
        'success'
      );
    }
  };

  const handleSelectPlan = (planName: string) => {
    pushToast(
      lang === 'uz'
        ? `${planName} tarifi demo rejimi faollashtirildi`
        : `${planName} plan demo activated`,
      lang === 'uz'
        ? "Jonli boshqaruv paneliga yo'naltirildingiz."
        : 'Redirected to the interactive workspace.',
      'info'
    );
    handleOpenDashboard('overview');
  };

  const handleInspectDeadStock = (itemId: string) => {
    setPreselectedOptimizerId(itemId);
    setActiveTab('inventory');
  };

  const handleSendTestMessage = (conversationId: string, text: string) => {
    const targetConv = activeShop.conversations.find((c) => c.id === conversationId);
    if (!targetConv) return;

    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const customerMsg: ChatMessage = {
      id: `msg-c-${Date.now()}`,
      sender: 'customer',
      text,
      timestamp,
    };

    const aiResult = generateAiBotReply(
      text,
      activeShop.inventory,
      targetConv.contextProductId,
      lang
    );

    const aiMsg: ChatMessage = {
      id: `msg-ai-${Date.now() + 1}`,
      sender: 'ai',
      text: aiResult.replyText,
      timestamp,
      orderCreated: aiResult.orderCreated,
    };

    const deductedItem = aiResult.deductStockProductId
      ? activeShop.inventory.find((i) => i.id === aiResult.deductStockProductId)
      : undefined;

    setShops((prev) =>
      prev.map((shop) => {
        if (shop.id !== activeShop.id) return shop;

        const nextInventory =
          aiResult.deductStockProductId && aiResult.orderCreated
            ? shop.inventory.map((item) =>
                item.id === aiResult.deductStockProductId
                  ? { ...item, stock: Math.max(0, item.stock - 1) }
                  : item
              )
            : shop.inventory;

        const nextSales =
          aiResult.deductStockProductId && aiResult.orderCreated
            ? shop.todaySales + aiResult.orderCreated.price
            : shop.todaySales;

        const nextConversations = shop.conversations.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                contextProductId: aiResult.matchedProductId,
                lastActive: timestamp,
                status: aiResult.orderCreated ? ('order_confirmed' as const) : ('ai_replied' as const),
                messages: [...conv.messages, customerMsg, aiMsg],
              }
            : conv
        );

        return {
          ...shop,
          inventory: nextInventory,
          todaySales: nextSales,
          aiResolvedCount: shop.aiResolvedCount + 1,
          conversations: nextConversations,
        };
      })
    );

    if (deductedItem && aiResult.orderCreated) {
      const nextQty = Math.max(0, deductedItem.stock - 1);
      pushToast(
        lang === 'uz'
          ? `Yangi buyurtma: ${aiResult.orderCreated.orderId}`
          : `Order Confirmed: ${aiResult.orderCreated.orderId}`,
        lang === 'uz'
          ? `${deductedItem.nameUz} ombordan ayrildi (${nextQty} dona qoldi)`
          : `${deductedItem.nameEn} stock updated (${nextQty} remaining)`,
        'success'
      );
    }
  };

  const handleApplyDiscount = (itemId: string, newPrice: number) => {
    const target = activeShop.inventory.find((i) => i.id === itemId);

    setShops((prev) =>
      prev.map((shop) => {
        if (shop.id !== activeShop.id) return shop;
        return {
          ...shop,
          inventory: shop.inventory.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  originalSellPrice: item.originalSellPrice || item.sellPrice,
                  sellPrice: newPrice,
                  discountApplied: true,
                }
              : item
          ),
        };
      })
    );

    if (target) {
      pushToast(
        lang === 'uz'
          ? 'Yangi narx qo‘llandi va Telegram kanalga e’lon qilindi'
          : 'New price applied & broadcasted to Telegram channel',
        `${lang === 'uz' ? target.nameUz : target.nameEn} → ${formatUZS(newPrice, lang)}`,
        'success'
      );
    }
  };

  const handleAddProduct = (
    newProd: Omit<
      InventoryItem,
      'id' | 'daysIdle' | 'dailyVelocity' | 'recommendedRestock' | 'keywords'
    >
  ) => {
    const id = `prod-${Date.now()}`;
    const keywords = newProd.nameUz
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    const created: InventoryItem = {
      ...newProd,
      id,
      daysIdle: 0,
      dailyVelocity: 1.0,
      recommendedRestock: newProd.stock <= 5 ? 15 : 8,
      keywords,
    };

    setShops((prev) =>
      prev.map((shop) =>
        shop.id === activeShop.id
          ? { ...shop, inventory: [created, ...shop.inventory] }
          : shop
      )
    );

    pushToast(
      lang === 'uz' ? "Yangi tovar omborga qo'shildi" : 'New product added to inventory',
      `${created.nameUz} (${created.sku}) · ${created.stock} ${lang === 'uz' ? 'dona' : 'pcs'}`,
      'success'
    );
  };

  const handleGeneratePdfReport = () => {
    const filename = generateShopPdfReport(activeShop, lang);
    pushToast(
      lang === 'uz' ? 'PDF hisobot yuklab olindi' : 'PDF Report Downloaded',
      filename,
      'success'
    );
  };

  const handleExportReport = (timeframe: number) => {
    const filename = generateShopPdfReport(activeShop, lang);
    pushToast(
      lang === 'uz'
        ? `Xarid va savdo PDF hisoboti (${timeframe} kun) yuklab olindi`
        : `Performance & restock PDF report (${timeframe} days) downloaded`,
      filename,
      'success'
    );
  };

  const currentUserName =
    session?.role === 'admin' ? 'Super Admin' : activeShop.ownerName;
  const currentUserEmail =
    session?.role === 'admin' ? 'admin@savdopilot.uz' : activeShop.ownerEmail;

  return (
    <>
      {view === 'landing' && (
        <LandingPage
          lang={lang}
          onToggleLang={setLang}
          onOpenDashboard={handleOpenDashboard}
          onOpenLogin={handleOpenLogin}
          todaySales={activeShop.todaySales}
          aiResolvedCount={activeShop.aiResolvedCount}
          inventory={activeShop.inventory}
          onSelectPlan={handleSelectPlan}
        />
      )}

      {view === 'login' && (
        <LoginPage
          lang={lang}
          onToggleLang={setLang}
          shops={shops}
          onLoginSuccess={handleLoginSuccess}
          onBackToLanding={handleBackToLanding}
        />
      )}

      {view === 'admin' && (
        <AdminPage
          lang={lang}
          onToggleLang={setLang}
          theme={theme}
          onToggleTheme={setTheme}
          shops={shops}
          onCreateShop={handleCreateShop}
          onOpenShopPanel={handleOpenShopPanelFromAdmin}
          onToggleShopStatus={handleToggleShopStatus}
          onChangeShopPlan={handleChangeShopPlan}
          onLogout={handleLogout}
          onBackToLanding={handleBackToLanding}
        />
      )}

      {view === 'dashboard' && (
        <DashboardLayout
          lang={lang}
          onToggleLang={setLang}
          theme={theme}
          onToggleTheme={setTheme}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onBackToLanding={handleBackToLanding}
          onLogout={handleLogout}
          isAdminViewing={session?.role === 'admin'}
          onBackToAdmin={() => setView('admin')}
          shopName={activeShop.name}
          shopBranch={activeShop.branch}
          shopPlan={activeShop.plan}
          userName={currentUserName}
          userEmail={currentUserEmail}
          activeConversationsCount={activeShop.conversations.length}
          onGeneratePdfReport={handleGeneratePdfReport}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              lang={lang}
              theme={theme}
              todaySales={activeShop.todaySales}
              aiResolvedCount={activeShop.aiResolvedCount}
              inventory={activeShop.inventory}
              onNavigateTab={setActiveTab}
              onInspectDeadStock={handleInspectDeadStock}
              onGeneratePdfReport={handleGeneratePdfReport}
            />
          )}

          {activeTab === 'sales-bot' && (
            <SalesBotTab
              lang={lang}
              conversations={activeShop.conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(convId) =>
                setActiveConversationMap((prev) => ({
                  ...prev,
                  [activeShop.id]: convId,
                }))
              }
              inventory={activeShop.inventory}
              onSendTestMessage={handleSendTestMessage}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryTab
              lang={lang}
              inventory={activeShop.inventory}
              onApplyDiscount={handleApplyDiscount}
              onAddProduct={handleAddProduct}
              preselectedOptimizerId={preselectedOptimizerId}
              onClearPreselectedOptimizer={() => setPreselectedOptimizerId(null)}
            />
          )}

          {activeTab === 'forecast' && (
            <ForecastTab
              lang={lang}
              theme={theme}
              inventory={activeShop.inventory}
              onExportReport={handleExportReport}
            />
          )}
        </DashboardLayout>
      )}

      {/* Floating SavdoPilot Support Chatbot */}
      <SupportChatbot
        lang={lang}
        onNavigateView={(targetView, targetTab) => {
          if (targetTab) setActiveTab(targetTab);
          setView(targetView);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Global Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-lg"
            >
              <div className="flex items-start gap-2.5">
                {toast.tone === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                )}
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {toast.title}
                  </p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {toast.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== toast.id))
                }
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
