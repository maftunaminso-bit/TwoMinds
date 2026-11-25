import { formatUZS } from '../i18n';
import { ChatMessage, InventoryItem, Language } from '../types';

export interface AiReplyResult {
  replyText: string;
  matchedProductId: string;
  deductStockProductId?: string;
  orderCreated?: ChatMessage['orderCreated'];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’`']/g, "'")
    .trim();
}

function findMatchingProduct(
  message: string,
  inventory: InventoryItem[],
  contextProductId: string
): InventoryItem {
  const norm = normalize(message);

  // Score each product by keyword hits
  let bestMatch: InventoryItem | null = null;
  let bestScore = 0;

  for (const item of inventory) {
    let score = 0;
    for (const kw of item.keywords) {
      if (norm.includes(kw.toLowerCase())) {
        score += kw.length > 3 ? 3 : 1;
      }
    }
    if (norm.includes(item.sku.toLowerCase())) {
      score += 5;
    }
    if (norm.includes(item.nameUz.toLowerCase()) || norm.includes(item.nameEn.toLowerCase())) {
      score += 6;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch;
  }

  return inventory.find((p) => p.id === contextProductId) || inventory[0];
}

export function generateAiBotReply(
  rawMessage: string,
  inventory: InventoryItem[],
  contextProductId: string,
  lang: Language
): AiReplyResult {
  const norm = normalize(rawMessage);
  const product = findMatchingProduct(rawMessage, inventory, contextProductId);
  const productName = lang === 'uz' ? product.nameUz : product.nameEn;

  // Detect if the user wrote in English even when UI is UZ, or vice-versa
  const looksEnglish =
    /\b(price|size|discount|available|stock|order|deliver|send|yes|buy|sneakers|jacket|shirt|sweater|bag)\b/i.test(
      norm
    );
  const replyLang: Language = looksEnglish && lang === 'en' ? 'en' : lang;

  const isOrderIntent =
    /\b(ha|olaman|buyurtma|rasmiylashtir|yuboring|zakaz|yetkazib|bering|chilonzor|yunusobod|sergeli|mirzo|toshkent|yes|order|confirm|deliver|send|buy|checkout)\b/i.test(
      norm
    );

  const isDiscountIntent =
    /\b(chegirma|skidka|aksiya|arzon|komplekt|discount|sale|promo|bundle|offer)\b/i.test(norm);

  const isCatalogIntent =
    /\b(nimalar|boshqa|katalog|assortiment|catalog|list|products|what do you have)\b/i.test(norm);

  // Extract requested size if mentioned
  const sizeMatch = norm.match(/\b(xs|s|m|l|xl|xxl|30|32|34|39|40|41|42|43|44)\b/i);
  const requestedSize = sizeMatch ? sizeMatch[1].toUpperCase() : null;
  const hasRequestedSize = requestedSize
    ? product.sizes.toUpperCase().includes(requestedSize)
    : true;

  if (isCatalogIntent) {
    const topAvailable = inventory
      .filter((i) => i.stock > 0)
      .slice(0, 4)
      .map(
        (i) =>
          `• ${replyLang === 'uz' ? i.nameUz : i.nameEn} (${i.sizes}) — ${formatUZS(i.sellPrice, replyLang)} (${i.stock} ${replyLang === 'uz' ? 'dona' : 'pcs'})`
      )
      .join('\n');

    return {
      matchedProductId: product.id,
      replyText:
        replyLang === 'uz'
          ? `Hozirda omborimizda eng ko'p so'ralayotgan tovarlar:\n${topAvailable}\nQaysi biri bo'yicha buyurtma rasmiylashtiramiz?`
          : `Here are our top in-stock items right now:\n${topAvailable}\nWhich item would you like to reserve?`,
    };
  }

  if (isOrderIntent) {
    if (product.stock <= 0) {
      const alternative = inventory.find(
        (i) => i.id !== product.id && i.category === product.category && i.stock > 0
      );
      const altText = alternative
        ? replyLang === 'uz'
          ? ` Uning o'rniga "${alternative.nameUz}" (${formatUZS(alternative.sellPrice, 'uz')}, ${alternative.stock} dona qolgan) tavsiya qila olamiz.`
          : ` We can offer "${alternative.nameEn}" (${formatUZS(alternative.sellPrice, 'en')}, ${alternative.stock} left) instead.`
        : '';

      return {
        matchedProductId: product.id,
        replyText:
          replyLang === 'uz'
            ? `Uzr, "${productName}" hozirgina omborda tugadi (0 dona). Yangi partiya 3 kun ichida keladi.${altText}`
            : `Sorry, "${productName}" just sold out (0 left in warehouse). Restock arrives in 3 days.${altText}`,
      };
    }

    const nextStock = product.stock - 1;
    const orderNum = `SP-${Math.floor(4830 + Math.random() * 500)}`;
    const deliveryFee = product.sellPrice >= 500000 ? 0 : 25000;

    return {
      matchedProductId: product.id,
      deductStockProductId: product.id,
      orderCreated: {
        orderId: orderNum,
        productName: `${productName}${requestedSize ? ` · ${requestedSize}` : ''}`,
        price: product.sellPrice,
        deliveryFee,
        remainingStock: nextStock,
      },
      replyText:
        replyLang === 'uz'
          ? `Buyurtmangiz muvaffaqiyatli rasmiylashtirildi! № ${orderNum}. ${productName}${requestedSize ? ` (${requestedSize} razmer)` : ''} — ${formatUZS(product.sellPrice, 'uz')}. Ombor qoldig'i avtomatik yangilandi (${nextStock} dona qoldi).`
          : `Order confirmed! #${orderNum} for ${productName}${requestedSize ? ` (Size ${requestedSize})` : ''} — ${formatUZS(product.sellPrice, 'en')}. Warehouse stock updated automatically (${nextStock} left).`,
    };
  }

  if (isDiscountIntent) {
    if (product.discountApplied && product.originalSellPrice) {
      return {
        matchedProductId: product.id,
        replyText:
          replyLang === 'uz'
            ? `Ha! "${productName}" uchun maxsus AI chegirma amal qilmoqda: ${formatUZS(product.originalSellPrice, 'uz')} o'rniga ${formatUZS(product.sellPrice, 'uz')}! Omborda ${product.stock} dona qoldi. Rasmiylashtiramizmi?`
            : `Yes! "${productName}" currently has a smart markdown: ${formatUZS(product.sellPrice, 'en')} (down from ${formatUZS(product.originalSellPrice, 'en')}). ${product.stock} units in stock — want to order?`,
      };
    }

    if (product.daysIdle >= 30) {
      const bundlePrice = Math.round(product.sellPrice * 0.85);
      return {
        matchedProductId: product.id,
        replyText:
          replyLang === 'uz'
            ? `"${productName}" bo'yicha maxsus taklifimiz bor: hozirgi narxi ${formatUZS(product.sellPrice, 'uz')}, lekin komplektda (Kurtka + Ko'ylak) yoki bugungi buyurtmada -15% chegirma bilan ${formatUZS(bundlePrice, 'uz')} ga beramiz! Omborda ${product.stock} dona mavjud.`
            : `We have a special offer on "${productName}": regular price is ${formatUZS(product.sellPrice, 'en')}, or ${formatUZS(bundlePrice, 'en')} (-15%) as part of our today-only bundle! ${product.stock} units available.`,
      };
    }

    return {
      matchedProductId: product.id,
      replyText:
        replyLang === 'uz'
          ? `"${productName}" narxi ${formatUZS(product.sellPrice, 'uz')} (omborda ${product.stock} dona). 2 ta mahsulot buyurtma qilsangiz -10% chegirma va Toshkent bo'ylab bepul yetkazib berish taqdim etiladi!`
          : `"${productName}" is priced at ${formatUZS(product.sellPrice, 'en')} (${product.stock} left). Order 2+ items to unlock -10% bundle discount and free Tashkent delivery!`,
    };
  }

  // Standard availability / size / price inquiry
  if (product.stock <= 0) {
    return {
      matchedProductId: product.id,
      replyText:
        replyLang === 'uz'
          ? `Afsuski, "${productName}" hozirda omborimizda tugagan (0 dona). Yangi yetkazib berish kelganda xabar berishimizni xohlaysizmi?`
          : `Unfortunately, "${productName}" is currently out of stock (0 units left). Would you like us to notify you when the next batch arrives?`,
    };
  }

  if (requestedSize && !hasRequestedSize) {
    return {
      matchedProductId: product.id,
      replyText:
        replyLang === 'uz'
          ? `"${productName}" dan afsuski ${requestedSize} razmer qolmagan. Hozirgi mavjud razmerlar: ${product.sizes} (${product.stock} dona qolgan). Narxi: ${formatUZS(product.sellPrice, 'uz')}. Shu razmerlardan birini ko'rasizmi?`
          : `Size ${requestedSize} for "${productName}" is unavailable right now. Available sizes: ${product.sizes} (${product.stock} in stock) at ${formatUZS(product.sellPrice, 'en')}. Would one of those work?`,
    };
  }

  const sizeInfo = requestedSize
    ? replyLang === 'uz'
      ? ` (${requestedSize} razmer)`
      : ` (Size ${requestedSize})`
    : ` (${product.sizes})`;

  const urgencyNote =
    product.stock <= 4
      ? replyLang === 'uz'
        ? ` Atigi ${product.stock} dona qoldi — tez tugab bormoqda!`
        : ` Only ${product.stock} left — selling fast!`
      : replyLang === 'uz'
        ? ` Omborimizda ${product.stock} dona mavjud.`
        : ` ${product.stock} units currently in stock.`;

  return {
    matchedProductId: product.id,
    replyText:
      replyLang === 'uz'
        ? `Assalomu alaykum! Ha, ${productName}${sizeInfo} nalichida bor.${urgencyNote} Narxi: ${formatUZS(product.sellPrice, 'uz')}. Toshkent bo'ylab yetkazib berish 25,000 so'm. Rasmiylashtiramizmi?`
        : `Hello! Yes, ${productName}${sizeInfo} is available.${urgencyNote} Price: ${formatUZS(product.sellPrice, 'en')}. Tashkent courier delivery is 25,000 UZS. Would you like to place an order?`,
  };
}
