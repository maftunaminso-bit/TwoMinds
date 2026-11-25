import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Copy,
  Check,
  Mail,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import { AppView, DashboardTab, Language } from '../types';

interface SupportChatbotProps {
  lang: Language;
  onNavigateView: (view: AppView, tab?: DashboardTab) => void;
}

interface BotChatItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  showEmail?: boolean;
}

const ADMIN_EMAIL = 'nigmatullayevamaftuna22@gmail.com';

export const SupportChatbot: React.FC<SupportChatbotProps> = ({
  lang,
  onNavigateView,
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<BotChatItem[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text:
        lang === 'uz'
          ? "Assalomu alaykum! Men SavdoPilot yordamchisiman. Tariflar, SKU tushunchasi, AI savdo boti yoki admin bilan bog'lanish bo'yicha savollaringizga javob beraman."
          : 'Hello! I am the SavdoPilot Assistant. Ask me about pricing plans, what SKU means, multi-shop admin access, or how to contact the admin.',
    },
  ]);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, open]);

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(ADMIN_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildReply = (query: string): Omit<BotChatItem, 'id' | 'sender'> => {
    const q = query.toLowerCase();

    if (/\b(sku|artikul|kod|nima bu)\b/i.test(q)) {
      return {
        text:
          lang === 'uz'
            ? "SKU (Stock Keeping Unit) — ombordagi har bir alohida mahsulot turi uchun beriladigan noyob hisob kodi (artikul), masalan: SP-JK-01 (Oversize Kurtka). SavdoPilot har bir SKU bo'yicha qoldiq, foyda va tugash muddatini alohida kuzatadi."
            : 'SKU (Stock Keeping Unit) is the unique inventory tracking code assigned to each distinct product in your warehouse (e.g., SP-JK-01 for Oversize Jacket). SavdoPilot tracks stock, margin, and stockout runway per SKU.',
        action: {
          label: lang === 'uz' ? 'Ombor jadvalini ko‘rish' : 'View Inventory Table',
          onClick: () => {
            onNavigateView('dashboard', 'inventory');
            setOpen(false);
          },
        },
      };
    }

    if (/\b(admin|bog'lan|boglan|aloqa|email|pochta|gmail|maftuna|contact|support|help)\b/i.test(q)) {
      return {
        text:
          lang === 'uz'
            ? `SavdoPilot admini bilan bevosita bog'lanish uchun quyidagi elektron pochta manziliga yozishingiz mumkin:`
            : 'You can reach the SavdoPilot administrator directly via email:',
        showEmail: true,
      };
    }

    if (/\b(narx|tarif|pul|sum|so'm|som|bepul|biznes|pro|price|plan|cost)\b/i.test(q)) {
      return {
        text:
          lang === 'uz'
            ? "Tariflarimiz:\n• Start: Bepul (1 kanal, 50 ta SKU)\n• Biznes: 149,000 so'm/oy (IG + TG, 500 SKU, Dead-stock AI)\n• Pro: 349,000 so'm/oy (Cheksiz SKU, ko'p filialli ombor, 30 kunlik prognoz)"
            : 'Our plans:\n• Start: Free (1 channel, 50 SKUs)\n• Biznes: 149,000 UZS/mo (IG + TG, 500 SKUs, Dead-stock AI)\n• Pro: 349,000 UZS/mo (Unlimited SKUs, multi-branch, 30-day forecast)',
      };
    }

    if (/\b(login|kirish|parol|password|panel|do'kon|dokon|account|sign)\b/i.test(q)) {
      return {
        text:
          lang === 'uz'
            ? "Demo kirish ma'lumotlari:\n• Super Admin: admin@savdopilot.uz / admin123\n• Do'kon paneli: modahub@savdopilot.uz / shop123\nAdmin panelda yangi do'konlar uchun alohida panellar ajratishingiz mumkin."
            : 'Demo credentials:\n• Super Admin: admin@savdopilot.uz / admin123\n• Shop Owner: modahub@savdopilot.uz / shop123\nInside Admin you can provision separate panels for new shops.',
        action: {
          label: lang === 'uz' ? 'Kirish sahifasiga o‘tish' : 'Go to Login Page',
          onClick: () => {
            onNavigateView('login');
            setOpen(false);
          },
        },
      };
    }

    if (/\b(instagram|telegram|bot|savdo|demo|ombor|prognoz|dead-stock|chegirma)\b/i.test(q)) {
      return {
        text:
          lang === 'uz'
            ? "SavdoPilot Instagram DM va Telegram Bot murojaatlariga 24/7 o'zbek tilida javob beradi, buyurtma tasdiqlansa ombor qoldig'ini avtomatik kamaytiradi va 30+ kun turib qolgan tovarlarga aqlli chegirma taklif qiladi."
            : 'SavdoPilot answers Instagram DM & Telegram inquiries 24/7, automatically deducts warehouse stock on confirmed orders, and recommends smart markdowns for 30+ day dead stock.',
        action: {
          label: lang === 'uz' ? 'AI Botni sinab ko‘rish' : 'Try AI Sales Bot',
          onClick: () => {
            onNavigateView('dashboard', 'sales-bot');
            setOpen(false);
          },
        },
      };
    }

    return {
      text:
        lang === 'uz'
          ? "Savolingiz uchun rahmat! Quyidagi tezkor bo'limlardan birini tanlashingiz yoki adminimizga nigmatullayevamaftuna22@gmail.com orqali murojaat qilishingiz mumkin."
          : 'Thanks for reaching out! Pick a quick topic below, explore the live demo, or email our admin at nigmatullayevamaftuna22@gmail.com.',
      showEmail: true,
    };
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: BotChatItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };

    const reply = buildReply(trimmed);
    const botMsg: BotChatItem = {
      id: `b-${Date.now() + 1}`,
      sender: 'bot',
      ...reply,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  const quickQuestions =
    lang === 'uz'
      ? ['SKU nima?', 'Tariflar qancha?', 'Demo login', "Admin bilan bog'lanish"]
      : ['What is SKU?', 'Pricing plans?', 'Demo login', 'Contact Admin'];

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40">
      {open ? (
        <div className="flex h-[min(460px,calc(100dvh-6rem))] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-[#0F172A] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-display text-sm font-bold leading-tight">
                  SavdoPilot Yordamchi
                </p>
                <p className="text-[11px] text-slate-300">
                  {lang === 'uz' ? 'Tezkor savol-javob boti' : 'Instant Support Assistant'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/70 p-3.5 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {msg.text}

                  {msg.showEmail && (
                    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 px-2.5 py-2">
                      <a
                        href={`mailto:${ADMIN_EMAIL}`}
                        className="inline-flex items-center gap-1.5 font-mono-num text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline truncate"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{ADMIN_EMAIL}</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="rounded p-1 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer shrink-0"
                        title={lang === 'uz' ? 'Nusxa olish' : 'Copy email'}
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {msg.action && (
                    <button
                      type="button"
                      onClick={msg.action.onClick}
                      className="mt-2.5 inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      {msg.action.label} →
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Quick Chips */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 pt-2.5 pb-1.5 flex flex-wrap gap-1.5">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lang === 'uz' ? 'Savolingizni yozing...' : 'Ask a question...'
              }
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shrink-0"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          aria-label="Open support chatbot"
        >
          <MessageSquare className="h-4 w-4" />
          <span>{lang === 'uz' ? 'Yordam boti' : 'AI Help'}</span>
        </button>
      )}
    </div>
  );
};
