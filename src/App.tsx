import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { AdminPage } from './components/AdminPage';
import { DashboardLayout } from './components/DashboardLayout';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SupportChatbot } from './components/SupportChatbot';
import { ChannelsTab } from './components/tabs/ChannelsTab';
import { ForecastTab } from './components/tabs/ForecastTab';
import { InventoryTab } from './components/tabs/InventoryTab';
import { OverviewTab } from './components/tabs/OverviewTab';
import { SalesBotTab } from './components/tabs/SalesBotTab';
import { INITIAL_SHOPS } from './data/initialData';
import { formatUZS } from './i18n';
import {
  AppView,
  AuthSession,
  DashboardTab,
  InventoryItem,
  Language,
  PlanTier,
  ShopWorkspace,
  ThemeMode,
  ToastNotification,
} from './types';
import { api, type PublicShopSummary } from './utils/api';
import { generateShopPdfReport } from './utils/pdfReport';

export default function App() {
  const [lang, setLang] = useState<Language>('uz');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [view, setView] = useState<AppView>('landing');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Server-synced workspaces + in-memory session token (never stored in localStorage)
  const [shops, setShops] = useState<ShopWorkspace[]>(INITIAL_SHOPS);
  const [publicShops, setPublicShops] = useState<PublicShopSummary[]>(
    INITIAL_SHOPS.map((s) => ({
      id: s.id,
      name: s.name,
      branch: s.branch,
      ownerName: s.ownerName,
      ownerEmail: s.ownerEmail,
      plan: s.plan,
      status: s.status,
      todaySales: s.todaySales,
      aiResolvedCount: s.aiResolvedCount,
    }))
  );
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

  // Load public shop summaries for Landing / Login quick switcher
  const refreshPublicShops = useCallback(async () => {
    try {
      const data = await api.getPublicShops();
      if (data.shops.length > 0) {
        setPublicShops(data.shops);
      }
    } catch {
      // Ignore background fetch error on initial boot
    }
  }, []);

  useEffect(() => {
    void refreshPublicShops();
  }, [refreshPublicShops]);

  const activeShop = shops.find((s) => s.id === activeShopId) || shops[0];

  const activeConversationId =
    activeConversationMap[activeShop.id] || activeShop.conversations[0]?.id || '';

  const upsertShop = useCallback((updated: ShopWorkspace) => {
    setShops((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      if (!exists) return [updated, ...prev];
      return prev.map((s) => (s.id === updated.id ? updated : s));
    });
  }, []);

  // Poll active shop workspace every 3s while in Dashboard so real Telegram/Instagram messages appear live
  const refreshActiveShop = useCallback(async () => {
    if (!session?.token || !activeShopId) return;
    try {
      const data = await api.getShop(activeShopId, session.token);
      upsertShop(data.shop);
    } catch {
      // Keep current state if transient poll fails
    }
  }, [session?.token, activeShopId, upsertShop]);

  useEffect(() => {
    if (view !== 'dashboard' || !session?.token) return;
    const timer = setInterval(() => {
      void refreshActiveShop();
    }, 3000);
    return () => clearInterval(timer);
  }, [view, session?.token, refreshActiveShop]);

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

  const ensureDemoSession = async (targetShopId = activeShopId): Promise<AuthSession | null> => {
    if (session?.token) {
      if (session.role === 'admin' || session.shopId === targetShopId) {
        return session;
      }
    }
    try {
      const res = await api.loginDemoShop(targetShopId);
      setSession(res.session);
      upsertShop(res.shop);
      setActiveShopId(res.shop.id);
      return res.session;
    } catch (err: unknown) {
      pushToast(
        lang === 'uz' ? 'Server bilan ulanishda xato' : 'Server connection error',
        err instanceof Error ? err.message : undefined,
        'warning'
      );
      return null;
    }
  };

  const handleOpenDashboard = async (tab: DashboardTab = 'overview') => {
    setActiveTab(tab);
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await ensureDemoSession(activeShopId);
  };

  const handleBackToLanding = () => {
    setView('landing');
    void refreshPublicShops();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = () => {
    setView('login');
    void refreshPublicShops();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (
    nextSession: AuthSession,
    payload: { shop?: ShopWorkspace; shops?: ShopWorkspace[] }
  ) => {
    setSession(nextSession);
    if (nextSession.role === 'admin') {
      if (payload.shops) {
        setShops(payload.shops);
      }
      setView('admin');
      pushToast(
        lang === 'uz' ? 'Super Admin paneliga kirdingiz' : 'Signed in to Super Admin',
        lang === 'uz'
          ? "Barcha do'kon panellarini boshqarishingiz mumkin."
          : 'You can now provision and manage all shop panels.',
        'info'
      );
    } else if (payload.shop) {
      upsertShop(payload.shop);
      setActiveShopId(payload.shop.id);
      setActiveTab('overview');
      setView('dashboard');
      pushToast(
        lang === 'uz'
          ? `${payload.shop.name} paneli ochildi`
          : `Signed in to ${payload.shop.name}`,
        `${payload.shop.branch} · ${payload.shop.plan}`,
        'success'
      );
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setSession(null);
    setView('login');
    void refreshPublicShops();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin Console Handlers (Persisted on Server)
  const handleCreateShop = async (payload: {
    name: string;
    branch: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    plan: PlanTier;
    instagram: boolean;
    telegram: boolean;
  }) => {
    if (!session?.token) throw new Error('Admin authentication required');
    const res = await api.createAdminShop(payload, session.token);
    upsertShop(res.shop);
    setActiveConversationMap((prev) => ({
      ...prev,
      [res.shop.id]: res.shop.conversations[0]?.id || '',
    }));
    void refreshPublicShops();

    pushToast(
      lang === 'uz'
        ? `"${res.shop.name}" uchun alohida panel yaratildi`
        : `Provisioned isolated panel for "${res.shop.name}"`,
      `Login: ${res.shop.ownerEmail} · ${res.shop.plan}`,
      'success'
    );
  };

  const handleOpenShopPanelFromAdmin = async (shopId: string) => {
    setActiveShopId(shopId);
    setActiveTab('overview');
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (session?.token) {
      try {
        const res = await api.getShop(shopId, session.token);
        upsertShop(res.shop);
        pushToast(
          lang === 'uz'
            ? `${res.shop.name} paneliga o'tildi`
            : `Switched to ${res.shop.name} panel`,
          `${res.shop.branch} · ${res.shop.plan}`,
          'info'
        );
      } catch (err: unknown) {
        pushToast('Error', err instanceof Error ? err.message : undefined, 'warning');
      }
    }
  };

  const handleToggleShopStatus = async (shopId: string) => {
    if (!session?.token) return;
    const target = shops.find((s) => s.id === shopId);
    if (!target) return;
    const nextStatus = target.status === 'active' ? 'paused' : 'active';
    const res = await api.updateAdminShop(shopId, { status: nextStatus }, session.token);
    upsertShop(res.shop);
    void refreshPublicShops();
    pushToast(
      lang === 'uz'
        ? `${res.shop.name} holati: ${nextStatus === 'active' ? 'Faol' : "To'xtatilgan"}`
        : `${res.shop.name} status: ${nextStatus}`,
      undefined,
      'info'
    );
  };

  const handleChangeShopPlan = async (shopId: string, nextPlan: PlanTier) => {
    if (!session?.token) return;
    const res = await api.updateAdminShop(shopId, { plan: nextPlan }, session.token);
    upsertShop(res.shop);
    void refreshPublicShops();
    pushToast(
      lang === 'uz'
        ? `${res.shop.name} tarifi yangilandi`
        : `${res.shop.name} plan updated`,
      `${nextPlan}`,
      'success'
    );
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
    void handleOpenDashboard('overview');
  };

  const handleInspectDeadStock = (itemId: string) => {
    setPreselectedOptimizerId(itemId);
    setActiveTab('inventory');
  };

  const handleSendTestMessage = async (
    conversationId: string,
    text: string,
    sendToPlatform = false
  ) => {
    const activeSession = await ensureDemoSession(activeShop.id);
    if (!activeSession?.token) {
      throw new Error('Authentication required');
    }

    const res = await api.sendBotMessage(
      activeShop.id,
      conversationId,
      { text, lang, sendToPlatform },
      activeSession.token
    );
    upsertShop(res.shop);

    if (res.order) {
      pushToast(
        lang === 'uz'
          ? `Yangi buyurtma: ${res.order.orderId}`
          : `Order Confirmed: ${res.order.orderId}`,
        lang === 'uz'
          ? `${res.order.productName} ombordan ayrildi`
          : `${res.order.productName} deducted from stock`,
        'success'
      );
    }
  };

  const handleApplyDiscount = async (itemId: string, newPrice: number) => {
    const activeSession = await ensureDemoSession(activeShop.id);
    if (!activeSession?.token) return;

    try {
      const res = await api.applyDiscount(activeShop.id, itemId, newPrice, activeSession.token);
      upsertShop(res.shop);
      const target = res.shop.inventory.find((i) => i.id === itemId);
      if (target) {
        const channelNote = res.broadcast?.sent
          ? ` · Telegram (${res.broadcast.channel})`
          : '';
        pushToast(
          lang === 'uz'
            ? `Yangi narx qo‘llandi${channelNote}`
            : `New price applied${channelNote}`,
          `${lang === 'uz' ? target.nameUz : target.nameEn} → ${formatUZS(newPrice, lang)}`,
          'success'
        );
      }
    } catch (err: unknown) {
      pushToast('Error', err instanceof Error ? err.message : undefined, 'warning');
    }
  };

  const handleAddProduct = async (
    newProd: Omit<
      InventoryItem,
      'id' | 'daysIdle' | 'dailyVelocity' | 'recommendedRestock' | 'keywords'
    >
  ) => {
    const activeSession = await ensureDemoSession(activeShop.id);
    if (!activeSession?.token) return;

    try {
      const res = await api.addProduct(activeShop.id, newProd, activeSession.token);
      upsertShop(res.shop);
      pushToast(
        lang === 'uz' ? "Yangi tovar omborga qo'shildi" : 'New product added to inventory',
        `${res.item.nameUz} (${res.item.sku}) · ${res.item.stock} ${lang === 'uz' ? 'dona' : 'pcs'}`,
        'success'
      );
    } catch (err: unknown) {
      pushToast('Error', err instanceof Error ? err.message : undefined, 'warning');
    }
  };

  const handleConnectTelegram = async (payload: {
    botToken: string;
    mode: 'webhook' | 'polling';
    channelUsername?: string;
  }) => {
    const activeSession = await ensureDemoSession(activeShop.id);
    if (!activeSession?.token) throw new Error('Authentication required');
    const res = await api.connectTelegram(activeShop.id, payload, activeSession.token);
    upsertShop(res.shop);
    const botUser = res.shop.channelIntegrations?.telegram?.botUsername || 'Telegram Bot';
    pushToast(
      lang === 'uz' ? `${botUser} muvaffaqiyatli ulandi!` : `${botUser} connected!`,
      lang === 'uz'
        ? "Endi Telegramda botga yozilgan xabarlarga Gemini AI avtomatik javob beradi."
        : 'Gemini AI is now listening for live messages on Telegram.',
      'success'
    );
  };

  const handleDisconnectTelegram = async () => {
    const activeSession = await ensureDemoSession(activeShop.id);
    if (!activeSession?.token) return;
    const res = await api.disconnectTelegram(activeShop.id, activeSession.token);
    upsertShop(res.shop);
    pushToast(
      lang === 'uz' ? 'Telegram bot uzildi' : 'Telegram bot disconnected',
      undefined,
      'info'
    );
  };

  const handleConnectInstagram = async (payload: {
    pageId: string;
    igAccountId: string;
    igUsername?: string;
    accessToken: string;
    verifyToken?: string;
  }) => {
    const activeSession = await ensureDemoSession(activeShop.id);
    if (!activeSession?.token) throw new Error('Authentication required');
    const res = await api.connectInstagram(activeShop.id, payload, activeSession.token);
    upsertShop(res.shop);
    pushToast(
      lang === 'uz' ? 'Instagram DM API ulandi!' : 'Instagram DM API connected!',
      res.shop.channelIntegrations?.instagram?.igUsername,
      'success'
    );
  };

  const handleDisconnectInstagram = async () => {
    const activeSession = await ensureDemoSession(activeShop.id);
    if (!activeSession?.token) return;
    const res = await api.disconnectInstagram(activeShop.id, activeSession.token);
    upsertShop(res.shop);
    pushToast(
      lang === 'uz' ? 'Instagram DM uzildi' : 'Instagram DM disconnected',
      undefined,
      'info'
    );
  };

  const handleTestInstagramWebhook = async (payload: { username?: string; text: string }) => {
    const activeSession = await ensureDemoSession(activeShop.id);
    if (!activeSession?.token) throw new Error('Authentication required');
    const res = await api.testInstagramWebhook(activeShop.id, payload, activeSession.token);
    upsertShop(res.shop);
    if (res.shop.conversations[0]) {
      setActiveConversationMap((prev) => ({
        ...prev,
        [res.shop.id]: res.shop.conversations[0].id,
      }));
    }
    pushToast(
      lang === 'uz'
        ? 'Instagram Webhook sinovi bajarildi!'
        : 'Instagram Webhook test processed!',
      lang === 'uz'
        ? 'AI Savdo Boti bo‘limida yangi DM javobini ko‘rishingiz mumkin.'
        : 'Check the AI Sales Bot inbox for the generated DM reply.',
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
          onOpenDashboard={(tab) => void handleOpenDashboard(tab)}
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
          shops={publicShops}
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
          onOpenShopPanel={(shopId) => void handleOpenShopPanelFromAdmin(shopId)}
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
              onApplyDiscount={(itemId, newPrice) => void handleApplyDiscount(itemId, newPrice)}
              onAddProduct={(item) => void handleAddProduct(item)}
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

          {activeTab === 'channels' && (
            <ChannelsTab
              lang={lang}
              shop={activeShop}
              onConnectTelegram={handleConnectTelegram}
              onDisconnectTelegram={handleDisconnectTelegram}
              onConnectInstagram={handleConnectInstagram}
              onDisconnectInstagram={handleDisconnectInstagram}
              onTestInstagramWebhook={handleTestInstagramWebhook}
              onRefreshShop={refreshActiveShop}
            />
          )}
        </DashboardLayout>
      )}

      {/* Floating SavdoPilot Support Chatbot */}
      <SupportChatbot
        lang={lang}
        onNavigateView={(targetView, targetTab) => {
          if (targetView === 'dashboard') {
            void handleOpenDashboard(targetTab || 'overview');
            return;
          }
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
