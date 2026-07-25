/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'ar' | 'en';

export type PaymentMethod = 'cash' | 'card' | 'credit' | 'split';

export interface Product {
  id: string;
  sku?: string; // Internal Stock Keeping Unit (SKU)
  nameAr: string;
  nameEn: string;
  barcode: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: 'piece' | 'kg' | 'box' | 'meter';
  imageUrl?: string;
  returnPolicy?: string; // e.g. '7_days', '14_days', 'exchange_only', 'no_return', or custom
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // percentage or fixed amount
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  balance: number; // positive = owes us money (receivable), negative = advance
  creditLimit: number;
  totalPurchases: number;
  loyaltyPoints?: number; // Current loyalty points available to redeem
  totalPointsEarned?: number; // Lifetime loyalty points accumulated
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  companyName: string;
  balance: number; // positive = we owe them (payable)
  suppliedCategories: string[];
  notes?: string;
  createdAt: string;
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string; // e.g., INV-2026-0001
  date: string; // ISO string
  items: {
    productId: string;
    productNameAr: string;
    productNameEn: string;
    barcode: string;
    costPrice: number;
    unitPrice: number;
    quantity: number;
    discount: number;
    total: number;
    returnPolicy?: string;
  }[];
  subtotal: number;
  discountTotal: number;
  taxRate: number; // percentage e.g. 15 for VAT
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  cashReceived?: number;
  changeGiven?: number;
  cashierName: string;
  notes?: string;
  returnPolicyText?: string; // Custom return policy printed on the invoice
  cancelledReason?: string; // Reason for invoice cancellation / void
  cancelledAt?: string; // Timestamp of cancellation
  cancelledBy?: string; // Who cancelled it
  status: 'completed' | 'refunded' | 'pending' | 'cancelled' | 'partial_refund';
  refundedAmount?: number; // Total amount refunded in partial refund
  refundedItems?: { productId: string; barcode: string; productNameAr: string; productNameEn: string; quantity: number; refundPrice: number; }[];
  loyaltyPointsEarned?: number; // Points earned on this invoice
  loyaltyPointsRedeemed?: number; // Points redeemed for discount
  loyaltyDiscountAmount?: number; // Value of discount from loyalty points
}

export interface Expense {
  id: string;
  title: string;
  category: 'rent' | 'salaries' | 'utilities' | 'supplies' | 'maintenance' | 'marketing' | 'other';
  amount: number;
  date: string;
  notes?: string;
  receiptNumber?: string;
  loggedBy: string;
}

export interface FinancialSummary {
  period: 'today' | 'month' | 'all';
  totalRevenue: number;
  totalCOGS: number; // Cost of Goods Sold
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  cashInDrawer: number;
  cardPayments: number;
  creditSales: number;
  totalReceivables: number;
  totalPayables: number;
  inventoryValue: number;
  lowStockCount: number;
  salesCount: number;
  averageOrderValue: number;
  dailySalesChart: { date: string; revenue: number; profit: number; expenses: number }[];
  categorySalesChart: { category: string; value: number; count: number }[];
}

export interface SystemDiagnostics {
  appVersion: string;
  nodeVersion: string;
  electronVersion: string;
  platform: string;
  arch: string;
  dbPath: string;
  logPath: string;
  isPortable: boolean;
  uptimeSeconds: number;
  memoryUsageMB: number;
  totalProducts: number;
  totalSales: number;
  totalCustomers: number;
  totalExpenses: number;
  lastBackupDate?: string;
  serverPort: number;
  status: 'online' | 'degraded';
}

export interface AIInsight {
  id: string;
  createdAt: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  type: 'profit_opportunity' | 'stock_alert' | 'cost_reduction' | 'general';
  priority: 'high' | 'medium' | 'low';
  actionableStepAr: string;
  actionableStepEn: string;
}

export interface SystemSettings {
  storeNameAr: string;
  storeNameEn: string;
  storeAddress: string;
  storePhone: string;
  taxNumber: string;
  defaultTaxRate: number; // e.g. 15%
  currency: string; // e.g., 'SAR', 'EGP', 'USD', 'AED'
  receiptFooterAr: string;
  receiptFooterEn: string;
  defaultReturnPolicyAr?: string;
  defaultReturnPolicyEn?: string;
  enableSoundEffects: boolean;
  theme: 'soft-glass-light' | 'soft-glass-dark';
  language: Language;
  adminPin?: string; // Admin password/PIN for manager access
  customCategories?: string[]; // Custom product categories with emojis/icons e.g. ["🧼 مواد تنظيف", "🍔 مأكولات"]
  loyaltyEnabled?: boolean; // Enable loyalty points
  loyaltyEarnRate?: number; // e.g. 1 point for every 10 SAR spent
  loyaltyRedeemRate?: number; // e.g. 10 SAR discount for every 100 points
  lastBackupDate?: string; // Last data backup timestamp
  defaultPrinter?: string; // Default receipt printer selected via Electron webContents.getPrinters API
}

export interface AppDatabase {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: SaleInvoice[];
  expenses: Expense[];
  insights: AIInsight[];
  settings: SystemSettings;
  metadata: {
    lastUpdated: string;
    dbVersion: string;
  };
}
