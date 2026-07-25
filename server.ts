/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * نظام المبيعات والمحاسبة الذكي - Smart POS & Accounting System
 * Express Server (Offline-First Backend with Atomic Persistence & Electron Support)
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { AppDatabase, Product, SaleInvoice, Customer, Supplier, Expense, SystemSettings, AIInsight, FinancialSummary, SystemDiagnostics } from './src/types.js';

// Resolve directory paths for ESM and CJS compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

// ==========================================
// 1. DATA PATH & LOGGING MANAGEMENT (التحدي الأول والثالث)
// ==========================================

/**
 * Determine the reliable persistent storage directory.
 * When running inside Electron Portable EXE or Desktop app, Electron passes process.env.USER_DATA_PATH
 * or process.env.DATA_DIR. In development, we fall back to `./data` inside root.
 */
const USER_DATA_DIR = process.env.USER_DATA_PATH || process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE_PATH = path.join(USER_DATA_DIR, 'db.json');
const LOG_FILE_PATH = process.env.APP_LOG_PATH || path.join(USER_DATA_DIR, 'app.log');

// Ensure directories exist immediately
try {
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create user data directory:', err);
}

/**
 * Custom Logger: Writes timestamped logs to both Console and persistent external app.log file.
 * Helps technical support diagnose client-side desktop issues without losing logs when portable app closes.
 */
function logToFile(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 23);
  const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
  const logLine = `[${timestamp}] [SERVER-${level}] ${message}${metaStr}\n`;

  // Output to console
  if (level === 'ERROR') {
    console.error(logLine.trim());
  } else if (level === 'WARN') {
    console.warn(logLine.trim());
  } else {
    console.log(logLine.trim());
  }

  // Append synchronously to external log file
  try {
    fs.appendFileSync(LOG_FILE_PATH, logLine, 'utf8');
  } catch (logErr) {
    console.error('Failed to write to external log file:', logErr);
  }
}

logToFile('INFO', 'Starting Smart POS & Accounting Server...', {
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  userDataDir: USER_DATA_DIR,
  dbPath: DB_FILE_PATH,
  logPath: LOG_FILE_PATH,
  isPortable: process.env.IS_PORTABLE === 'true'
});

// Capture global unhandled exceptions to prevent silent crashes in Desktop mode
process.on('uncaughtException', (err: Error) => {
  logToFile('ERROR', `Uncaught Exception: ${err.message}`, { stack: err.stack });
});

process.on('unhandledRejection', (reason: any) => {
  logToFile('ERROR', `Unhandled Rejection: ${reason instanceof Error ? reason.message : JSON.stringify(reason)}`);
});

// ==========================================
// 2. ATOMIC DATABASE ENGINE (قاعدة بيانات محلية مستقرة مع ضمان عدم التلف)
// ==========================================

const DEFAULT_SETTINGS: SystemSettings = {
  storeNameAr: 'متجر الصفوة الذكي للمبيعات',
  storeNameEn: 'Al-Safwa Smart POS Store',
  storeAddress: 'الرياض، المملكة العربية السعودية - شارع الملك فهد',
  storePhone: '+966 50 123 4567',
  taxNumber: '301234567800003',
  defaultTaxRate: 15, // 15% VAT
  currency: 'SAR',
  receiptFooterAr: 'شكراً لتسوقكم معنا! البضاعة المباعة ترد وتستبدل خلال 7 أيام بالفاتورة.',
  receiptFooterEn: 'Thank you for shopping with us! Returns accepted within 7 days with receipt.',
  defaultReturnPolicyAr: 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة. (الأصناف الغذائية والاستهلاكية غير قابلة للاسترجاع)',
  defaultReturnPolicyEn: 'Returns and exchanges accepted within 7 days with original invoice and item condition. (Consumables non-returnable)',
  enableSoundEffects: true,
  theme: 'soft-glass-light',
  language: 'ar',
  adminPin: '123456',
  customCategories: ['عام / General', '🍔 مأكولات وسناكس', '☕ مشروبات وقهوة', '🧼 مواد تنظيف وعناية', '📱 إلكترونيات وصيانة']
};

const DEFAULT_DB: AppDatabase = {
  products: [
    {
      id: 'prod-1',
      sku: 'COF-COL-01',
      nameAr: 'قهوة مختصة كولومبيا سوبريمو (250 جم)',
      nameEn: 'Specialty Coffee Colombia Supremo (250g)',
      barcode: '628100123401',
      category: 'مشروبات وقهوة',
      costPrice: 24,
      sellingPrice: 45,
      stock: 35,
      minStock: 10,
      unit: 'piece',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-2',
      sku: 'TEA-GRN-02',
      nameAr: 'شاي أخضر عضوي فاخر (علبة 50 كيس)',
      nameEn: 'Premium Organic Green Tea (50 Bags)',
      barcode: '628100123402',
      category: 'مشروبات وقهوة',
      costPrice: 12,
      sellingPrice: 22,
      stock: 48,
      minStock: 8,
      unit: 'piece',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-3',
      sku: 'CHO-DRK-03',
      nameAr: 'شوكولاتة داكنة 85% كاكاو بلجيكي',
      nameEn: 'Belgian Dark Chocolate 85% Cocoa',
      barcode: '628100123403',
      category: 'حلويات وسناكس',
      costPrice: 8,
      sellingPrice: 16,
      stock: 6,
      minStock: 15, // Low stock demo!
      unit: 'piece',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-4',
      sku: 'OIL-OLV-04',
      nameAr: 'زيت زيتون بكر ممتاز عصرة أولى (1 لتر)',
      nameEn: 'Extra Virgin Olive Oil First Cold Press (1L)',
      barcode: '628100123404',
      category: 'مواد غذائية',
      costPrice: 35,
      sellingPrice: 65,
      stock: 20,
      minStock: 5,
      unit: 'piece',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-5',
      sku: 'HNY-SDR-05',
      nameAr: 'عسل سدر طبيعي ممتاز (500 جم)',
      nameEn: 'Natural Sidr Honey Premium (500g)',
      barcode: '628100123405',
      category: 'مواد غذائية',
      costPrice: 60,
      sellingPrice: 110,
      stock: 12,
      minStock: 5,
      unit: 'piece',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prod-6',
      sku: 'NUT-MIX-06',
      nameAr: 'مكسرات مشكلة محمصة فاخرة (كيلو)',
      nameEn: 'Roasted Mixed Nuts Premium (1 kg)',
      barcode: '628100123406',
      category: 'مكسرات وتمور',
      costPrice: 45,
      sellingPrice: 85,
      stock: 4, // Low stock demo!
      minStock: 10,
      unit: 'kg',
      updatedAt: new Date().toISOString()
    }
  ],
  customers: [
    {
      id: 'cust-1',
      name: 'عميل نقدي عام (General Customer)',
      phone: '0000000000',
      balance: 0,
      creditLimit: 0,
      totalPurchases: 1850,
      notes: 'العميل الافتراضي للمبيعات السريعة',
      createdAt: new Date().toISOString()
    },
    {
      id: 'cust-2',
      name: 'مهندس أحمد عبد العزيز',
      phone: '0501112233',
      email: 'ahmed@example.com',
      balance: 150, // Owes 150 SAR
      creditLimit: 2000,
      totalPurchases: 4200,
      notes: 'عميل دائم، يفضل الدفع بالآجل أحياناً',
      createdAt: new Date().toISOString()
    },
    {
      id: 'cust-3',
      name: 'شركة الأفق التجارية',
      phone: '0554445566',
      email: 'info@horizon.com',
      balance: 0,
      creditLimit: 10000,
      totalPurchases: 15400,
      notes: 'خصم تجاري خاص 5%',
      createdAt: new Date().toISOString()
    }
  ],
  suppliers: [
    {
      id: 'supp-1',
      name: 'شركة البن العالمية للاستيراد',
      phone: '0112223344',
      companyName: 'Global Coffee Imports Co.',
      balance: 1200, // We owe them 1200 SAR
      suppliedCategories: ['مشروبات وقهوة'],
      notes: 'توريد شهري ثابت للقهوة والشاي',
      createdAt: new Date().toISOString()
    },
    {
      id: 'supp-2',
      name: 'مؤسسة الخير للمواد الغذائية',
      phone: '0115556677',
      companyName: 'Al-Khair Foodstuff Est.',
      balance: 0,
      suppliedCategories: ['مواد غذائية', 'مكسرات وتمور'],
      notes: 'التوريد بالدفع الفوري فقط',
      createdAt: new Date().toISOString()
    }
  ],
  sales: [
    {
      id: 'sale-101',
      invoiceNumber: 'INV-2026-0001',
      date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      items: [
        {
          productId: 'prod-1',
          productNameAr: 'قهوة مختصة كولومبيا سوبريمو (250 جم)',
          productNameEn: 'Specialty Coffee Colombia Supremo',
          barcode: '628100123401',
          costPrice: 24,
          unitPrice: 45,
          quantity: 2,
          discount: 0,
          total: 90
        },
        {
          productId: 'prod-3',
          productNameAr: 'شوكولاتة داكنة 85% كاكاو بلجيكي',
          productNameEn: 'Belgian Dark Chocolate 85%',
          barcode: '628100123403',
          costPrice: 8,
          unitPrice: 16,
          quantity: 3,
          discount: 0,
          total: 48
        }
      ],
      subtotal: 138,
      discountTotal: 0,
      taxRate: 15,
      taxAmount: 20.7,
      grandTotal: 158.7,
      paymentMethod: 'card',
      customerId: 'cust-1',
      customerName: 'عميل نقدي عام (General Customer)',
      cashierName: 'محمد (الكاشير)',
      status: 'completed'
    },
    {
      id: 'sale-102',
      invoiceNumber: 'INV-2026-0002',
      date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      items: [
        {
          productId: 'prod-4',
          productNameAr: 'زيت زيتون بكر ممتاز عصرة أولى (1 لتر)',
          productNameEn: 'Extra Virgin Olive Oil (1L)',
          barcode: '628100123404',
          costPrice: 35,
          unitPrice: 65,
          quantity: 2,
          discount: 10,
          total: 120
        },
        {
          productId: 'prod-5',
          productNameAr: 'عسل سدر طبيعي ممتاز (500 جم)',
          productNameEn: 'Natural Sidr Honey Premium (500g)',
          barcode: '628100123405',
          costPrice: 60,
          unitPrice: 110,
          quantity: 1,
          discount: 0,
          total: 110
        }
      ],
      subtotal: 230,
      discountTotal: 10,
      taxRate: 15,
      taxAmount: 34.5,
      grandTotal: 264.5,
      paymentMethod: 'cash',
      cashReceived: 300,
      changeGiven: 35.5,
      customerId: 'cust-1',
      customerName: 'عميل نقدي عام (General Customer)',
      cashierName: 'محمد (الكاشير)',
      status: 'completed'
    },
    {
      id: 'sale-103',
      invoiceNumber: 'INV-2026-0003',
      date: new Date().toISOString(), // Today
      items: [
        {
          productId: 'prod-1',
          productNameAr: 'قهوة مختصة كولومبيا سوبريمو (250 جم)',
          productNameEn: 'Specialty Coffee Colombia Supremo',
          barcode: '628100123401',
          costPrice: 24,
          unitPrice: 45,
          quantity: 4,
          discount: 0,
          total: 180
        },
        {
          productId: 'prod-6',
          productNameAr: 'مكسرات مشكلة محمصة فاخرة (كيلو)',
          productNameEn: 'Roasted Mixed Nuts Premium (1 kg)',
          barcode: '628100123406',
          costPrice: 45,
          unitPrice: 85,
          quantity: 1,
          discount: 0,
          total: 85
        }
      ],
      subtotal: 265,
      discountTotal: 0,
      taxRate: 15,
      taxAmount: 39.75,
      grandTotal: 304.75,
      paymentMethod: 'credit',
      customerId: 'cust-2',
      customerName: 'مهندس أحمد عبد العزيز',
      cashierName: 'سارة (مشرف عام)',
      notes: 'تم تقييد المبلغ على حساب العميل بالآجل',
      status: 'completed'
    }
  ],
  expenses: [
    {
      id: 'exp-1',
      title: 'إيجار المحل الشهري (دفعة مقدمة)',
      category: 'rent',
      amount: 1500,
      date: new Date(Date.now() - 86400000 * 5).toISOString(),
      notes: 'إيجار شهر يوليو 2026',
      receiptNumber: 'RENT-701',
      loggedBy: 'المدير العام'
    },
    {
      id: 'exp-2',
      title: 'فاتورة الكهرباء والماء',
      category: 'utilities',
      amount: 380,
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      notes: 'فاتورة شهرية لعداد المحل',
      receiptNumber: 'ELEC-988',
      loggedBy: 'محمد (الكاشير)'
    },
    {
      id: 'exp-3',
      title: 'صيانة ماكينة التغليف والطباعة',
      category: 'maintenance',
      amount: 150,
      date: new Date().toISOString(),
      notes: 'تغيير حبر حراري وصيانة طابعة الفواتير',
      receiptNumber: 'MAINT-104',
      loggedBy: 'سارة (مشرف عام)'
    }
  ],
  insights: [
    {
      id: 'ins-1',
      createdAt: new Date().toISOString(),
      titleAr: 'تحذير مخزون منخفض: الشوكولاتة الداكنة والمكسرات',
      titleEn: 'Low Stock Warning: Dark Chocolate & Mixed Nuts',
      summaryAr: 'يوجد 2 صنف وصلوا إلى حد الطلب الأدنى (أقل من 10 قطع). يُنصح بطلب توريد عاجل من الموردين لتجنب نفاذ الكمية وفقدان المبيعات.',
      summaryEn: '2 items have reached minimum stock threshold. Immediate supplier reorder is recommended to avoid stockout.',
      type: 'stock_alert',
      priority: 'high',
      actionableStepAr: 'إنشاء طلب شراء لعدد 30 كرتونة شوكولاتة و 20 كيلو مكسرات من مؤسسة الخير.',
      actionableStepEn: 'Create purchase order for 30 boxes of chocolate and 20 kg of nuts from Al-Khair Est.'
    },
    {
      id: 'ins-2',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      titleAr: 'فرصة لزيادة الأرباح في قسم القهوة المختصة',
      titleEn: 'Profit Optimization Opportunity: Specialty Coffee',
      summaryAr: 'تظهر البيانات أن القهوة المختصة هي الصنف الأعلى مبيعاً وأعلى هامش ربح (46.6%). يمكن زيادة الإيرادات بعرض حزم ترويجية مع العسل أو الشوكولاتة.',
      summaryEn: 'Specialty coffee has the highest sales volume and margin (46.6%). Bundle promotions with honey or chocolate can boost average order value.',
      type: 'profit_opportunity',
      priority: 'medium',
      actionableStepAr: 'إطلاق عرض "باقة المزاج": خصم 10% عند شراء قهوة مختصة + شوكولاتة بلجيكية.',
      actionableStepEn: 'Launch "Mood Bundle": 10% discount when buying coffee + Belgian chocolate.'
    }
  ],
  settings: DEFAULT_SETTINGS,
  metadata: {
    lastUpdated: new Date().toISOString(),
    dbVersion: '1.0.0'
  }
};

let db: AppDatabase;

/**
 * Load database safely from DB_FILE_PATH. If it doesn't exist or is corrupted,
 * initialize with DEFAULT_DB and perform an immediate save.
 */
function loadDatabase(): AppDatabase {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const rawData = fs.readFileSync(DB_FILE_PATH, 'utf8');
      const parsed = JSON.parse(rawData);
      logToFile('INFO', `Database loaded successfully from ${DB_FILE_PATH}`, {
        products: parsed.products?.length || 0,
        sales: parsed.sales?.length || 0
      });
      return {
        ...DEFAULT_DB,
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
      };
    } else {
      logToFile('WARN', `Database file not found at ${DB_FILE_PATH}. Initializing default offline database.`);
      saveDatabase(DEFAULT_DB);
      return DEFAULT_DB;
    }
  } catch (err) {
    logToFile('ERROR', `Corrupted DB file or read error at ${DB_FILE_PATH}. Falling back to default database!`, err);
    return DEFAULT_DB;
  }
}

/**
 * Atomic Database Save (الكتابة الآمنة لمنع تلف الملفات عند انقطاع الكهرباء أو إغلاق التطبيق فجأة)
 * 1. Write JSON to db.json.tmp
 * 2. Synchronously rename db.json.tmp -> db.json (Atomic operation on POSIX/Windows NTFS)
 */
function saveDatabase(newDb: AppDatabase): boolean {
  try {
    newDb.metadata.lastUpdated = new Date().toISOString();
    const tmpPath = `${DB_FILE_PATH}.tmp`;
    const jsonString = JSON.stringify(newDb, null, 2);

    // Write to tmp file
    fs.writeFileSync(tmpPath, jsonString, 'utf8');
    // Rename tmp to actual destination atomically
    fs.renameSync(tmpPath, DB_FILE_PATH);

    // Keep an updated memory reference
    db = newDb;
    return true;
  } catch (err) {
    logToFile('ERROR', `Fatal Error during Atomic Save to ${DB_FILE_PATH}:`, err);
    return false;
  }
}

// Initialize Database in memory
db = loadDatabase();

// ==========================================
// 3. EXPRESS SERVER & MIDDLEWARE SETUP
// ==========================================

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware for API diagnostics
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/')) {
    logToFile('INFO', `API Request: ${req.method} ${req.path}`);
  }
  next();
});

// ==========================================
// 4. REST API ROUTES (POS, ACCOUNTING, INVENTORY, AI INSIGHTS)
// ==========================================

// --- Health & Diagnostics API ---
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.get('/api/diagnostics', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const diagnostics: SystemDiagnostics = {
    appVersion: '1.0.0',
    nodeVersion: process.version,
    electronVersion: process.versions?.electron || 'Not in Electron runtime',
    platform: process.platform,
    arch: process.arch,
    dbPath: DB_FILE_PATH,
    logPath: LOG_FILE_PATH,
    isPortable: process.env.IS_PORTABLE === 'true' || USER_DATA_DIR.includes('Portable'),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
    totalProducts: db.products.length,
    totalSales: db.sales.length,
    totalCustomers: db.customers.length,
    totalExpenses: db.expenses.length,
    lastBackupDate: db.metadata.lastUpdated,
    serverPort: PORT,
    status: 'online'
  };
  res.json(diagnostics);
});

// --- Entire Database Dump / Restore API ---
app.get('/api/db', (req: Request, res: Response) => {
  res.json(db);
});

app.post('/api/backup/export', (req: Request, res: Response) => {
  logToFile('INFO', 'Exporting full database backup payload');
  db.settings.lastBackupDate = new Date().toISOString();
  saveDatabase(db);
  res.header('Content-Type', 'application/json');
  res.header('Content-Disposition', `attachment; filename="SmartPOS_Backup_${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(db, null, 2));
});

app.post('/api/backup/import', (req: Request, res: Response) => {
  try {
    const backupPayload = req.body as AppDatabase;
    if (!backupPayload || !Array.isArray(backupPayload.products) || !Array.isArray(backupPayload.sales)) {
      return res.status(400).json({ error: 'ملف النسخة الاحتياطية غير صالح أو تالف.' });
    }
    saveDatabase(backupPayload);
    logToFile('INFO', 'Database successfully imported from external backup payload');
    res.json({ success: true, message: 'تم استعادة النسخة الاحتياطية بنجاح!' });
  } catch (err: any) {
    logToFile('ERROR', 'Failed to import backup payload', err);
    res.status(500).json({ error: err.message || 'خطأ أثناء استعادة البيانات.' });
  }
});

// --- Products & Inventory API ---
app.get('/api/products', (req: Request, res: Response) => {
  res.json(db.products);
});

app.post('/api/products', (req: Request, res: Response) => {
  const prod = req.body as Product;
  if (!prod.id) {
    prod.id = `prod-${Date.now()}`;
  }
  prod.updatedAt = new Date().toISOString();

  const index = db.products.findIndex(p => p.id === prod.id);
  if (index >= 0) {
    db.products[index] = prod;
  } else {
    const existingBarcode = db.products.find(p => p.barcode === prod.barcode);
    if (existingBarcode) {
      return res.status(400).json({ error: 'الباركود مسجل بالفعل لصنف آخر في المخزون!' });
    }
    if (prod.sku && db.products.some(p => p.sku && p.sku.toLowerCase() === prod.sku!.toLowerCase())) {
      return res.status(400).json({ error: 'رمز الصنف الداخلي (SKU) مسجل بالفعل لصنف آخر في المخزون!' });
    }
    db.products.push(prod);
  }
  saveDatabase(db);
  res.json({ success: true, product: prod });
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  db.products = db.products.filter(p => p.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// --- Customers API ---
app.get('/api/customers', (req: Request, res: Response) => {
  res.json(db.customers);
});

app.post('/api/customers', (req: Request, res: Response) => {
  const cust = req.body as Customer;
  if (!cust.id) {
    cust.id = `cust-${Date.now()}`;
    cust.createdAt = new Date().toISOString();
  }
  const index = db.customers.findIndex(c => c.id === cust.id);
  if (index >= 0) {
    db.customers[index] = cust;
  } else {
    db.customers.push(cust);
  }
  saveDatabase(db);
  res.json({ success: true, customer: cust });
});

app.delete('/api/customers/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  db.customers = db.customers.filter(c => c.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

app.put('/api/customers/:id/loyalty', (req: Request, res: Response) => {
  try {
    const { points, action } = req.body; // action: 'add' | 'deduct' | 'set'
    const index = db.customers.findIndex(c => c.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Customer not found' });
    const current = db.customers[index].loyaltyPoints || 0;
    if (action === 'add') {
      db.customers[index].loyaltyPoints = current + Number(points);
      db.customers[index].totalPointsEarned = (db.customers[index].totalPointsEarned || 0) + Number(points);
    } else if (action === 'deduct') {
      db.customers[index].loyaltyPoints = Math.max(0, current - Number(points));
    } else {
      db.customers[index].loyaltyPoints = Math.max(0, Number(points));
    }
    saveDatabase(db);
    res.json({ success: true, customer: db.customers[index] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Suppliers API ---
app.get('/api/suppliers', (req: Request, res: Response) => {
  res.json(db.suppliers);
});

app.post('/api/suppliers', (req: Request, res: Response) => {
  const supp = req.body as Supplier;
  if (!supp.id) {
    supp.id = `supp-${Date.now()}`;
    supp.createdAt = new Date().toISOString();
  }
  const index = db.suppliers.findIndex(s => s.id === supp.id);
  if (index >= 0) {
    db.suppliers[index] = supp;
  } else {
    db.suppliers.push(supp);
  }
  saveDatabase(db);
  res.json({ success: true, supplier: supp });
});

app.delete('/api/suppliers/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  db.suppliers = db.suppliers.filter(s => s.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// --- Sales & POS Checkout API ---
app.get('/api/sales', (req: Request, res: Response) => {
  res.json(db.sales);
});

app.post('/api/sales', (req: Request, res: Response) => {
  try {
    const invoice = req.body as SaleInvoice;
    if (!invoice.id) {
      invoice.id = `sale-${Date.now()}`;
    }
    if (!invoice.invoiceNumber) {
      const year = new Date().getFullYear();
      const seq = (db.sales.length + 1).toString().padStart(4, '0');
      invoice.invoiceNumber = `INV-${year}-${seq}`;
    }
    if (!invoice.date) {
      invoice.date = new Date().toISOString();
    }
    if (!invoice.returnPolicyText) {
      invoice.returnPolicyText = db.settings.defaultReturnPolicyAr || db.settings.receiptFooterAr || 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة.';
    }

    // 1. Decrement product stocks automatically
    for (const item of invoice.items) {
      const prodIndex = db.products.findIndex(p => p.id === item.productId || p.barcode === item.barcode || (p.sku && p.sku === item.barcode));
      if (prodIndex >= 0) {
        db.products[prodIndex].stock = Math.max(0, db.products[prodIndex].stock - item.quantity);
        db.products[prodIndex].updatedAt = new Date().toISOString();
      }
    }

    // 2. Update customer balance, purchase history, & loyalty points if customer assigned
    if (invoice.customerId) {
      const custIndex = db.customers.findIndex(c => c.id === invoice.customerId);
      if (custIndex >= 0) {
        db.customers[custIndex].totalPurchases += invoice.grandTotal;
        if (invoice.paymentMethod === 'credit') {
          db.customers[custIndex].balance += invoice.grandTotal;
        }
        if (db.settings.loyaltyEnabled !== false) {
          const earnRate = db.settings.loyaltyEarnRate || 10;
          const earned = invoice.loyaltyPointsEarned !== undefined ? invoice.loyaltyPointsEarned : Math.floor(invoice.grandTotal / earnRate);
          invoice.loyaltyPointsEarned = earned;
          const redeemed = invoice.loyaltyPointsRedeemed || 0;
          const currentPts = db.customers[custIndex].loyaltyPoints || 0;
          db.customers[custIndex].loyaltyPoints = Math.max(0, currentPts - redeemed + earned);
          db.customers[custIndex].totalPointsEarned = (db.customers[custIndex].totalPointsEarned || 0) + earned;
        }
      }
    }

    db.sales.unshift(invoice); // Add latest to top
    saveDatabase(db);
    logToFile('INFO', `POS Invoice completed: ${invoice.invoiceNumber} | Total: ${invoice.grandTotal} ${db.settings.currency}`);
    res.json({ success: true, invoice });
  } catch (err: any) {
    logToFile('ERROR', 'Error processing POS checkout transaction', err);
    res.status(500).json({ error: err.message || 'حدث خطأ أثناء حفظ الفاتورة' });
  }
});

app.put('/api/sales/:id', (req: Request, res: Response) => {
  try {
    const saleId = req.params.id;
    const { status, cancelledReason, cancelledBy, returnPolicyText, notes, refundedAmount, refundedItems } = req.body;
    const invoiceIndex = db.sales.findIndex(s => s.id === saleId || s.invoiceNumber === saleId || String(s.id) === String(saleId));
    if (invoiceIndex < 0) {
      return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    }

    const oldInvoice = db.sales[invoiceIndex];
    const oldStatus = oldInvoice.status;

    // If changing from completed or partial_refund to cancelled or refunded, restore stock quantities
    if ((oldStatus === 'completed' || oldStatus === 'partial_refund') && (status === 'cancelled' || status === 'refunded')) {
      for (const item of oldInvoice.items) {
        const prodIndex = db.products.findIndex(p => p.id === item.productId || p.barcode === item.barcode || (p.sku && p.sku === item.barcode));
        if (prodIndex >= 0) {
          db.products[prodIndex].stock += item.quantity;
          db.products[prodIndex].updatedAt = new Date().toISOString();
        }
      }
      // Reverse customer debt if credit sale
      if (oldInvoice.customerId && oldInvoice.paymentMethod === 'credit') {
        const custIndex = db.customers.findIndex(c => c.id === oldInvoice.customerId);
        if (custIndex >= 0) {
          db.customers[custIndex].balance = Math.max(0, db.customers[custIndex].balance - oldInvoice.grandTotal);
          db.customers[custIndex].totalPurchases = Math.max(0, db.customers[custIndex].totalPurchases - oldInvoice.grandTotal);
        }
      }
      // Reverse loyalty points
      if (oldInvoice.customerId && (oldInvoice.loyaltyPointsEarned || oldInvoice.loyaltyPointsRedeemed)) {
        const custIndex = db.customers.findIndex(c => c.id === oldInvoice.customerId);
        if (custIndex >= 0) {
          const earned = oldInvoice.loyaltyPointsEarned || 0;
          const redeemed = oldInvoice.loyaltyPointsRedeemed || 0;
          db.customers[custIndex].loyaltyPoints = Math.max(0, (db.customers[custIndex].loyaltyPoints || 0) - earned + redeemed);
        }
      }
    } else if (status === 'partial_refund' && Array.isArray(refundedItems)) {
      // Partial item refund: restore ONLY the returned quantities
      for (const rItem of refundedItems) {
        const prodIndex = db.products.findIndex(p => p.id === rItem.productId || p.barcode === rItem.barcode || (p.sku && p.sku === rItem.barcode));
        if (prodIndex >= 0) {
          db.products[prodIndex].stock += rItem.quantity;
          db.products[prodIndex].updatedAt = new Date().toISOString();
        }
      }
      if (oldInvoice.customerId && oldInvoice.paymentMethod === 'credit' && refundedAmount) {
        const custIndex = db.customers.findIndex(c => c.id === oldInvoice.customerId);
        if (custIndex >= 0) {
          db.customers[custIndex].balance = Math.max(0, db.customers[custIndex].balance - refundedAmount);
          db.customers[custIndex].totalPurchases = Math.max(0, db.customers[custIndex].totalPurchases - refundedAmount);
        }
      }
    }

    if (status) db.sales[invoiceIndex].status = status;
    if (cancelledReason !== undefined) db.sales[invoiceIndex].cancelledReason = cancelledReason;
    if (cancelledBy !== undefined) db.sales[invoiceIndex].cancelledBy = cancelledBy;
    if (returnPolicyText !== undefined) db.sales[invoiceIndex].returnPolicyText = returnPolicyText;
    if (notes !== undefined) db.sales[invoiceIndex].notes = notes;
    if (refundedAmount !== undefined) db.sales[invoiceIndex].refundedAmount = refundedAmount;
    if (refundedItems !== undefined) db.sales[invoiceIndex].refundedItems = refundedItems;
    if (status === 'cancelled' || status === 'refunded' || status === 'partial_refund') {
      db.sales[invoiceIndex].cancelledAt = new Date().toISOString();
    }

    saveDatabase(db);
    logToFile('INFO', `Invoice ${oldInvoice.invoiceNumber} updated to status: ${status}`);
    res.json({ success: true, invoice: db.sales[invoiceIndex] });
  } catch (err: any) {
    logToFile('ERROR', 'Error updating invoice status', err);
    res.status(500).json({ error: err.message || 'حدث خطأ أثناء تحديث الفاتورة' });
  }
});

// --- Expenses API ---
app.get('/api/expenses', (req: Request, res: Response) => {
  res.json(db.expenses);
});

app.post('/api/expenses', (req: Request, res: Response) => {
  const exp = req.body as Expense;
  if (!exp.id) {
    exp.id = `exp-${Date.now()}`;
  }
  if (!exp.date) {
    exp.date = new Date().toISOString();
  }
  const index = db.expenses.findIndex(e => e.id === exp.id);
  if (index >= 0) {
    db.expenses[index] = exp;
  } else {
    db.expenses.unshift(exp);
  }
  saveDatabase(db);
  res.json({ success: true, expense: exp });
});

app.delete('/api/expenses/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  db.expenses = db.expenses.filter(e => e.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// --- System Settings API ---
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(db.settings);
});

app.post('/api/settings', (req: Request, res: Response) => {
  db.settings = { ...db.settings, ...(req.body || {}) };
  saveDatabase(db);
  res.json({ success: true, settings: db.settings });
});

// --- Financial Summary & Accounting Analytics API ---
app.get('/api/summary', (req: Request, res: Response) => {
  const period = (req.query.period as 'today' | 'month' | 'all') || 'all';
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = now.toISOString().slice(0, 7);

  // Filter sales based on period
  const filteredSales = db.sales.filter(s => {
    if (s.status !== 'completed') return false;
    if (period === 'today') return s.date.startsWith(todayStr);
    if (period === 'month') return s.date.startsWith(currentMonthStr);
    return true;
  });

  const filteredExpenses = db.expenses.filter(e => {
    if (period === 'today') return e.date.startsWith(todayStr);
    if (period === 'month') return e.date.startsWith(currentMonthStr);
    return true;
  });

  let totalRevenue = 0;
  let totalCOGS = 0;
  let cashInDrawer = 0;
  let cardPayments = 0;
  let creditSales = 0;

  for (const sale of filteredSales) {
    totalRevenue += sale.grandTotal;
    if (sale.paymentMethod === 'cash') cashInDrawer += sale.grandTotal;
    if (sale.paymentMethod === 'card') cardPayments += sale.grandTotal;
    if (sale.paymentMethod === 'credit') creditSales += sale.grandTotal;

    // Calculate COGS for each item sold
    for (const item of sale.items) {
      totalCOGS += (item.costPrice || 0) * item.quantity;
    }
  }

  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // Receivables & Payables
  const totalReceivables = db.customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalPayables = db.suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);

  // Inventory value & low stock count
  let inventoryValue = 0;
  let lowStockCount = 0;
  for (const prod of db.products) {
    inventoryValue += prod.costPrice * prod.stock;
    if (prod.stock <= prod.minStock) lowStockCount++;
  }

  // Daily Sales Chart Data (Last 7 days or matching days)
  const dailyMap: Record<string, { revenue: number; profit: number; expenses: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    dailyMap[dateKey] = { revenue: 0, profit: 0, expenses: 0 };
  }

  for (const s of db.sales) {
    const dKey = s.date.slice(0, 10);
    if (dailyMap[dKey] && s.status === 'completed') {
      dailyMap[dKey].revenue += s.grandTotal;
      let sCogs = 0;
      s.items.forEach(i => sCogs += (i.costPrice || 0) * i.quantity);
      dailyMap[dKey].profit += (s.grandTotal - sCogs);
    }
  }

  for (const e of db.expenses) {
    const dKey = e.date.slice(0, 10);
    if (dailyMap[dKey]) {
      dailyMap[dKey].expenses += e.amount;
    }
  }

  const dailySalesChart = Object.keys(dailyMap).map(date => ({
    date: date.slice(5), // MM-DD
    revenue: Math.round(dailyMap[date].revenue),
    profit: Math.round(dailyMap[date].profit),
    expenses: Math.round(dailyMap[date].expenses)
  }));

  // Category chart breakdown
  const catMap: Record<string, { value: number; count: number }> = {};
  for (const s of db.sales) {
    if (s.status !== 'completed') continue;
    for (const item of s.items) {
      const p = db.products.find(x => x.id === item.productId || x.barcode === item.barcode || (x.sku && x.sku === item.barcode));
      const cat = p ? p.category : 'عام';
      if (!catMap[cat]) catMap[cat] = { value: 0, count: 0 };
      catMap[cat].value += item.total;
      catMap[cat].count += item.quantity;
    }
  }

  const categorySalesChart = Object.keys(catMap).map(cat => ({
    category: cat,
    value: Math.round(catMap[cat].value),
    count: catMap[cat].count
  }));

  const summary: FinancialSummary = {
    period,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCOGS: Math.round(totalCOGS * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    cashInDrawer: Math.round(cashInDrawer * 100) / 100,
    cardPayments: Math.round(cardPayments * 100) / 100,
    creditSales: Math.round(creditSales * 100) / 100,
    totalReceivables: Math.round(totalReceivables * 100) / 100,
    totalPayables: Math.round(totalPayables * 100) / 100,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    lowStockCount,
    salesCount: filteredSales.length,
    averageOrderValue: filteredSales.length > 0 ? Math.round((totalRevenue / filteredSales.length) * 100) / 100 : 0,
    dailySalesChart,
    categorySalesChart
  };

  res.json(summary);
});

// --- AI Financial Advisor API via Gemini ---
app.post('/api/ai/analyze', async (req: Request, res: Response) => {
  logToFile('INFO', 'Received request for Gemini AI Financial Analysis...');
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 10) {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        أنت مستشار مالي ومحاسبي ذكي خبير في أنظمة مبيعات التجزئة (POS).
        إليك ملخص البيانات المالية والمخزون الحالي للمتجر:
        - إجمالي الإيرادات: ${req.body.totalRevenue || 0} ${db.settings.currency}
        - مجمل الربح: ${req.body.grossProfit || 0} ${db.settings.currency}
        - إجمالي المصروفات التشغيلية: ${req.body.totalExpenses || 0} ${db.settings.currency}
        - صافي الربح: ${req.body.netProfit || 0} ${db.settings.currency}
        - قيمة المخزون الحالي: ${req.body.inventoryValue || 0} ${db.settings.currency}
        - عدد الأصناف منخفضة المخزون: ${req.body.lowStockCount || 0}
        - قائمة المنتجات وتفاصيلها: ${JSON.stringify(db.products.map(p => ({ name: p.nameAr, stock: p.stock, minStock: p.minStock, margin: p.sellingPrice - p.costPrice })))}

        المطلوب: توليد 3 نصائح وتوصيات مالية وإدارية ذكية وقابلة للتنفيذ الفوري بصيغة JSON فقط عبارة عن مصفوفة objects، كل object يحتوي على:
        titleAr, titleEn, summaryAr, summaryEn, type ('profit_opportunity' | 'stock_alert' | 'cost_reduction' | 'general'), priority ('high' | 'medium' | 'low'), actionableStepAr, actionableStepEn.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text || '[]';
      const parsedInsights = JSON.parse(text);
      if (Array.isArray(parsedInsights) && parsedInsights.length > 0) {
        const formatted: AIInsight[] = parsedInsights.map((ins: any, idx: number) => ({
          id: `ins-gen-${Date.now()}-${idx}`,
          createdAt: new Date().toISOString(),
          titleAr: ins.titleAr || 'تحليل مالي ذكي',
          titleEn: ins.titleEn || 'Smart Financial Insight',
          summaryAr: ins.summaryAr || '',
          summaryEn: ins.summaryEn || '',
          type: ins.type || 'general',
          priority: ins.priority || 'medium',
          actionableStepAr: ins.actionableStepAr || '',
          actionableStepEn: ins.actionableStepEn || ''
        }));
        db.insights = formatted;
        saveDatabase(db);
        return res.json({ success: true, insights: formatted, source: 'gemini_live' });
      }
    }
  } catch (aiError: any) {
    logToFile('WARN', `Gemini AI API unavailable or failed (${aiError.message}). Falling back to local offline financial heuristics.`);
  }

  // --- Offline Heuristic Insights Fallback ---
  const lowStockItems = db.products.filter(p => p.stock <= p.minStock);
  const insights: AIInsight[] = [];

  if (lowStockItems.length > 0) {
    insights.push({
      id: `ins-off-${Date.now()}-1`,
      createdAt: new Date().toISOString(),
      titleAr: `تنبيه حرج: نفاذ وشيك لـ (${lowStockItems.length}) أصناف من المخزون`,
      titleEn: `Critical Stock Alert: (${lowStockItems.length}) items reaching depletion`,
      summaryAr: `تم رصد انخفاض مخزون الأصناف التالية: ${lowStockItems.map(i => i.nameAr).join('، ')}. يجب الإسراع بإصدار أوامر توريد لتجنب توقف المبيعات.`,
      summaryEn: `Low stock detected for: ${lowStockItems.map(i => i.nameEn).join(', ')}. Issue supplier orders urgently.`,
      type: 'stock_alert',
      priority: 'high',
      actionableStepAr: `تواصل فوراً مع الموردين لإعادة تعبئة المخزون بمعدل يغطي استهلاك 30 يوماً القادمة.`,
      actionableStepEn: `Contact suppliers immediately to restock enough inventory for the next 30 days.`
    });
  }

  insights.push({
    id: `ins-off-${Date.now()}-2`,
    createdAt: new Date().toISOString(),
    titleAr: 'تحسين الربحية عبر مراجعة تسعير المنتجات الأعلى تكلفة',
    titleEn: 'Profitability Enhancement via High-Cost Item Pricing Audit',
    summaryAr: 'بناءً على تحليل هامش الربح، يوصى بمراجعة الأصناف ذات التكلفة المرتفعة وعمل عروض ترويجية لزيادة دوران رأس المال وتقليل جمد السيولة في المخزون.',
    summaryEn: 'Based on margin audit, we recommend promotional bundling for high-cost items to increase cash turnover.',
    type: 'profit_opportunity',
    priority: 'medium',
    actionableStepAr: 'تنظيم عرض أسبوعي لخصم بسيط على الكميات الأكبر (مثلاً شراء قطعتين بخصم 5%) لتحفيز المبيعات النقدية.',
    actionableStepEn: 'Organize weekly bundle discounts (e.g. buy 2 get 5% off) to stimulate immediate cash velocity.'
  });

  db.insights = insights;
  saveDatabase(db);
  res.json({ success: true, insights, source: 'local_heuristic' });
});

// ==========================================
// 5. PRODUCTION FRONTEND SERVING & VITE DEV MIDDLEWARE
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In Dev Mode: Attach Vite Middleware
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      logToFile('INFO', 'Vite Dev Middleware attached successfully.');
    } catch (viteErr) {
      logToFile('WARN', 'Could not load Vite Middleware in Dev mode:', viteErr);
    }
  } else {
    // In Production Mode: Serve static frontend files from dist/
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*all', (req: Request, res: Response) => {
        if (!req.path.startsWith('/api/')) {
          res.sendFile(path.join(distPath, 'index.html'));
        }
      });
      logToFile('INFO', `Serving production static frontend from ${distPath}`);
    } else {
      logToFile('WARN', `Production dist folder not found at ${distPath}. Build frontend using npm run build.`);
    }
  }

  const server = app.listen(PORT, HOST, () => {
    logToFile('INFO', `Smart POS & Accounting Server is running and listening on http://${HOST}:${PORT}`);
  });

  // Graceful shutdown handling for Electron Process Management (التحدي الثاني)
  const shutdown = (signal: string) => {
    logToFile('INFO', `Received ${signal}. Gracefully shutting down Express server...`);
    server.close(() => {
      logToFile('INFO', 'Express HTTP server closed cleanly. Releasing port 3000.');
      process.exit(0);
    });
    // Force close after 5 seconds if connections hang
    setTimeout(() => {
      logToFile('WARN', 'Forcing Express process termination after 5s timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('message', (msg: any) => {
    if (msg === 'shutdown' || (typeof msg === 'object' && msg?.command === 'shutdown')) {
      shutdown('ELECTRON_IPC_SHUTDOWN');
    }
  });
}

startServer();
