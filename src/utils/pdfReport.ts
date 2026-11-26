import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SALES_FORECAST_SERIES } from '../data/initialData';
import { formatUZS } from '../i18n';
import { Language, ShopWorkspace } from '../types';

function pdfSafe(text: string): string {
  return text
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, '-')
    .replace(/–/g, '-');
}

export function generateShopPdfReport(
  shop: ShopWorkspace,
  lang: Language
): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const isUz = lang === 'uz';
  const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

  // Header Banner
  doc.setFillColor(15, 23, 42); // #0F172A Deep Slate
  doc.rect(0, 0, pageWidth, 34, 'F');

  // Refined Vector Logo Emblem in PDF Header
  doc.setFillColor(79, 70, 229); // #4F46E5 Indigo
  doc.roundedRect(14, 6.2, 9.4, 9.4, 2.4, 2.4, 'F');
  doc.setDrawColor(165, 180, 252);
  doc.setLineWidth(0.25);
  doc.roundedRect(14.3, 6.5, 8.8, 8.8, 2.1, 2.1, 'S');
  // Clean white S-ribbon bars + emerald growth bar
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16.1, 8.2, 5.2, 1.4, 0.5, 0.5, 'F');
  doc.roundedRect(16.1, 10.2, 5.2, 1.4, 0.5, 0.5, 'F');
  doc.setFillColor(110, 231, 183); // #6EE7B7 Mint Emerald
  doc.roundedRect(16.1, 12.2, 3.8, 1.4, 0.5, 0.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SavdoPilot', 26.2, 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(199, 210, 254);
  doc.text(
    pdfSafe(
      isUz
        ? "Do'kon Samaradorligi, Ombor Holati va Savdo Prognozi Hisoboti"
        : 'Shop Performance, Inventory Status & Sales Trends Report'
    ),
    14,
    22
  );

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(
    pdfSafe(`${shop.name} (${shop.branch}) | ${shop.plan} | ${nowStr}`),
    14,
    28.5
  );

  // Shop & Owner Info Strip
  let y = 42;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    pdfSafe(isUz ? '1. Do\'kon Ko\'rsatkichlari (KPI)' : '1. Executive Performance Summary'),
    14,
    y
  );

  const lowStockCount = shop.inventory.filter(
    (i) => i.stock <= 5 && i.daysIdle < 30
  ).length;
  const deadStockCount = shop.inventory.filter((i) => i.daysIdle >= 30).length;
  const forecast7Day = Math.round(shop.todaySales * 7.56);
  const totalUnits = shop.inventory.reduce((s, i) => s + i.stock, 0);
  const stockRetailValue = shop.inventory.reduce(
    (s, i) => s + i.stock * i.sellPrice,
    0
  );

  y += 4;
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
    },
    head: [
      [
        pdfSafe(isUz ? 'Ko\'rsatkich' : 'Metric'),
        pdfSafe(isUz ? 'Qiymat' : 'Value'),
        pdfSafe(isUz ? 'Izoh' : 'Context'),
      ],
    ],
    body: [
      [
        pdfSafe(isUz ? 'Bugungi Savdo' : "Today's Revenue"),
        pdfSafe(formatUZS(shop.todaySales, lang)),
        pdfSafe(isUz ? '+18% kechagiga nisbatan' : '+18% vs yesterday'),
      ],
      [
        pdfSafe(isUz ? 'AI Hal Qilgan Murojaatlar' : 'AI Resolved Chats'),
        pdfSafe(`${shop.aiResolvedCount} ${isUz ? 'ta' : 'chats'}`),
        pdfSafe(isUz ? '94% avtomatik (IG & TG)' : '94% automated (IG & TG)'),
      ],
      [
        pdfSafe(isUz ? '7 Kunlik AI Savdo Prognozi' : '7-Day AI Sales Forecast'),
        pdfSafe(formatUZS(forecast7Day, lang)),
        pdfSafe(isUz ? '+32% mavsumiy o\'sish' : '+32% seasonal surge'),
      ],
      [
        pdfSafe(isUz ? 'Ombor Qoldig\'i' : 'Warehouse Inventory'),
        pdfSafe(
          `${shop.inventory.length} SKU / ${totalUnits} ${isUz ? 'dona' : 'pcs'}`
        ),
        pdfSafe(
          isUz
            ? `${lowStockCount} kam qoldi, ${deadStockCount} dead-stock`
            : `${lowStockCount} low stock, ${deadStockCount} dead-stock`
        ),
      ],
      [
        pdfSafe(isUz ? 'Ombordagi Tovar Qiymati' : 'Stock Retail Valuation'),
        pdfSafe(formatUZS(stockRetailValue, lang)),
        pdfSafe(isUz ? `Egasi: ${shop.ownerName}` : `Owner: ${shop.ownerName}`),
      ],
    ],
    margin: { left: 14, right: 14 },
  });

  // Section 2: Sales Trends
  const afterKpiY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(
    pdfSafe(
      isUz
        ? '2. Savdo Dinamikasi va AI Prognoz Trendi'
        : '2. Sales Trends & AI Demand Trajectory'
    ),
    14,
    afterKpiY
  );

  const trendRows = SALES_FORECAST_SERIES.slice(10, 22).map((pt) => {
    const actualVal = pt.date === '25 Nov' ? shop.todaySales : pt.actual;
    const forecastVal = pt.date === '25 Nov' ? shop.todaySales : pt.forecast;
    return [
      pt.date,
      actualVal != null ? pdfSafe(formatUZS(actualVal, lang)) : '-',
      forecastVal != null ? pdfSafe(formatUZS(forecastVal, lang)) : '-',
      pdfSafe((isUz ? pt.noteUz : pt.noteEn) || (pt.isSpike ? '+32% Peak' : '-')),
    ];
  });

  autoTable(doc, {
    startY: afterKpiY + 3,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    head: [
      [
        pdfSafe(isUz ? 'Sana' : 'Date'),
        pdfSafe(isUz ? 'Haqiqiy Savdo' : 'Actual Sales'),
        pdfSafe(isUz ? 'AI Prognoz' : 'AI Forecast'),
        pdfSafe(isUz ? 'Mavsumiy Izoh' : 'Seasonal Note'),
      ],
    ],
    body: trendRows,
    margin: { left: 14, right: 14 },
  });

  // Section 3: Inventory Status
  const afterTrendY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  const needsNewPage = afterTrendY > 230;
  let invStartY = afterTrendY;

  if (needsNewPage) {
    doc.addPage();
    invStartY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(
    pdfSafe(
      isUz
        ? '3. Ombor Holati va Aqlli Narxlar Jadvali'
        : '3. Inventory Status & Pricing Breakdown'
    ),
    14,
    invStartY
  );

  const inventoryRows = shop.inventory.map((item) => {
    const margin = Math.round(((item.sellPrice - item.costPrice) / item.sellPrice) * 100);
    const statusLabel = item.discountApplied
      ? isUz
        ? 'AI Chegirma'
        : 'AI Discount'
      : item.daysIdle >= 30
      ? `Dead-stock (${item.daysIdle}d)`
      : item.stock <= 5
      ? isUz
        ? 'Kam qoldi'
        : 'Low Stock'
      : isUz
      ? 'Yetarli'
      : 'Healthy';

    return [
      pdfSafe(`${isUz ? item.nameUz : item.nameEn} (${item.sku})`),
      pdfSafe(item.sizes),
      `${item.stock} ${isUz ? 'dona' : 'pcs'}`,
      pdfSafe(formatUZS(item.sellPrice, lang)),
      `${margin}%`,
      pdfSafe(statusLabel),
    ];
  });

  autoTable(doc, {
    startY: invStartY + 3,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    head: [
      [
        pdfSafe(isUz ? 'Mahsulot (SKU)' : 'Product (SKU)'),
        pdfSafe(isUz ? 'Razmer' : 'Sizes'),
        pdfSafe(isUz ? 'Qoldiq' : 'Stock'),
        pdfSafe(isUz ? 'Narxi' : 'Sell Price'),
        pdfSafe(isUz ? 'Marja' : 'Margin'),
        pdfSafe(isUz ? 'Holati' : 'Status'),
      ],
    ],
    body: inventoryRows,
    margin: { left: 14, right: 14 },
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'SavdoPilot | Texnik yordam uchun: nigmatullayevamaftuna22@gmail.com',
      14,
      pageHeight - 8.5
    );
    doc.text(`${p} / ${totalPages}`, pageWidth - 22, pageHeight - 8.5);
  }

  const safeShopSlug = shop.name.replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `SavdoPilot_${safeShopSlug}_Report.pdf`;
  doc.save(filename);
  return filename;
}
