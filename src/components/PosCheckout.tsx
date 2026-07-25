/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  CreditCard, 
  Banknote, 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Tag, 
  Receipt,
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  Percent,
  Calculator,
  Download,
  ExternalLink,
  X,
  PackagePlus,
  Layers
} from 'lucide-react';
import { Product, Customer, CartItem, SaleInvoice, SystemSettings, Language, PaymentMethod } from '../types';
import { triggerSmartPrint, printInNewTab, downloadReceiptHtml } from '../utils/printReceipt';
import { CategoryIconModal } from './CategoryIconModal';

interface PosCheckoutProps {
  products: Product[];
  customers: Customer[];
  settings: SystemSettings;
  lang: Language;
  onCompleteSale: (invoice: SaleInvoice) => Promise<boolean>;
  onRefreshProducts: () => void;
  onSaveProduct?: (product: Product) => Promise<boolean>;
  onUpdateSettings?: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
}

export const PosCheckout: React.FC<PosCheckoutProps> = ({
  products,
  customers,
  settings,
  lang,
  onCompleteSale,
  onRefreshProducts,
  onSaveProduct,
  onUpdateSettings
}) => {
  const isAr = lang === 'ar';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    customers.find(c => c.id === 'cust-1') || customers[0] || null
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');

  // Category Icon Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Quick Add Product / Custom Item Modal State
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickMode, setQuickMode] = useState<'inventory' | 'custom'>('inventory');
  const [quickNameAr, setQuickNameAr] = useState('');
  const [quickNameEn, setQuickNameEn] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickBarcode, setQuickBarcode] = useState('');
  const [quickCategory, setQuickCategory] = useState('عام / General');
  const [quickStock, setQuickStock] = useState('50');
  const [isSavingQuickProduct, setIsSavingQuickProduct] = useState(false);

  // Receipt Modal State
  const [completedInvoice, setCompletedInvoice] = useState<SaleInvoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extract categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    if (settings.customCategories && Array.isArray(settings.customCategories)) {
      settings.customCategories.forEach(cat => cat && cats.add(cat));
    }
    if (cats.size === 0) {
      cats.add('عام / General');
      cats.add('🍔 مأكولات وسناكس');
      cats.add('☕ مشروبات وقهوة');
      cats.add('🧼 مواد تنظيف وعناية');
      cats.add('📱 إلكترونيات وصيانة');
    }
    products.forEach(p => p.category && cats.add(p.category));
    return ['all', ...Array.from(cats)];
  }, [products, settings.customCategories]);

  const handleSaveCategoryGroup = async (newCat: string) => {
    const existing = settings.customCategories || [];
    if (!existing.includes(newCat) && onUpdateSettings) {
      await onUpdateSettings({ customCategories: [...existing, newCat] });
    }
    setSelectedCategory(newCat);
    setQuickCategory(newCat);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch = searchTerm === '' || 
        p.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Barcode / Search quick add
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const query = (barcodeInput || searchTerm).trim();

    if (!query) {
      // If both search boxes are empty, clicking "+ إضافة" opens the Quick Add / New Product modal!
      setQuickNameAr('');
      setQuickNameEn('');
      setQuickBarcode(Math.floor(100000000000 + Math.random() * 900000000000).toString());
      setQuickPrice('');
      setQuickStock('50');
      setQuickMode('inventory');
      setIsQuickModalOpen(true);
      return;
    }

    // 1. Try finding exact match by barcode or SKU
    const exactMatch = products.find(p => p.barcode === query || p.id === query);
    if (exactMatch) {
      addToCart(exactMatch);
      setBarcodeInput('');
      setSearchTerm('');
      return;
    }

    // 2. Try finding by name or partial barcode
    const matches = products.filter(p => 
      p.nameAr.toLowerCase().includes(query.toLowerCase()) || 
      p.nameEn.toLowerCase().includes(query.toLowerCase()) || 
      p.barcode.includes(query) ||
      p.category.toLowerCase().includes(query.toLowerCase())
    );

    if (matches.length === 1) {
      addToCart(matches[0]);
      setBarcodeInput('');
      setSearchTerm('');
    } else if (matches.length > 1) {
      // If multiple matches found, add the first result to cart
      addToCart(matches[0]);
      setBarcodeInput('');
    } else {
      // Not found in inventory at all! Open Quick Add Product modal pre-filled with this query!
      setQuickNameAr(query);
      setQuickNameEn(query);
      setQuickBarcode(/^\d+$/.test(query) ? query : Math.floor(100000000000 + Math.random() * 900000000000).toString());
      setQuickPrice('');
      setQuickStock('50');
      setQuickMode('inventory');
      setIsQuickModalOpen(true);
    }
  };

  const handleSaveQuickProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNameAr.trim() && !quickNameEn.trim()) {
      alert(isAr ? 'يرجى إدخال اسم الصنف على الأقل!' : 'Please enter item name at least!');
      return;
    }
    const priceVal = Number(quickPrice) || 10;

    setIsSavingQuickProduct(true);
    try {
      if (quickMode === 'inventory') {
        const newProd: Product = {
          id: `prod-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          nameAr: quickNameAr.trim() || quickNameEn.trim() || 'صنف سريع',
          nameEn: quickNameEn.trim() || quickNameAr.trim() || 'Quick Item',
          category: quickCategory,
          sellingPrice: priceVal,
          costPrice: priceVal * 0.7,
          barcode: quickBarcode.trim() || Math.floor(100000000000 + Math.random() * 900000000000).toString(),
          stock: Number(quickStock) || 50,
          minStock: 5,
          unit: 'piece',
          returnPolicy: '7_days',
          updatedAt: new Date().toISOString()
        };
        if (onSaveProduct) {
          await onSaveProduct(newProd);
        }
        addToCart(newProd);
      } else {
        // Custom item for this invoice only
        const customProd: Product = {
          id: `custom-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          nameAr: quickNameAr.trim() || quickNameEn.trim() || 'صنف مخصص سريع',
          nameEn: quickNameEn.trim() || quickNameAr.trim() || 'Custom Quick Item',
          category: 'أصناف وخدمات مخصصة',
          sellingPrice: priceVal,
          costPrice: 0,
          barcode: `CUST-${Date.now()}`,
          stock: 999999,
          minStock: 0,
          unit: 'piece',
          returnPolicy: '7_days',
          updatedAt: new Date().toISOString()
        };
        addToCart(customProd);
      }
      setIsQuickModalOpen(false);
      setBarcodeInput('');
      setSearchTerm('');
    } catch (err: any) {
      alert(err.message || (isAr ? 'حدث خطأ في حفظ الصنف!' : 'Error saving item!'));
    } finally {
      setIsSavingQuickProduct(false);
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(isAr ? 'عفواً، الكمية نافدة من المخزون!' : 'Sorry, product is out of stock!');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(isAr ? 'الكمية المطلوبة تتجاوز رصيد المخزون!' : 'Requested quantity exceeds available stock!');
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.product.sellingPrice - item.discount }
            : item
        );
      }
      return [...prev, {
        product,
        quantity: 1,
        discount: 0,
        total: product.sellingPrice
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (item && delta > 0 && item.quantity >= item.product.stock) {
      alert(isAr ? 'عفواً، الكمية المطلوبة تتجاوز رصيد المخزون المتاح في المستودع!' : 'Requested quantity exceeds available stock!');
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, Math.min(item.product.stock, item.quantity + delta));
        return { ...item, quantity: newQty, total: newQty * item.product.sellingPrice - item.discount };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.product.sellingPrice), 0);
  }, [cart]);

  const itemsDiscountTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.discount, 0);
  }, [cart]);

  const totalDiscount = itemsDiscountTotal + (orderDiscount || 0);
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxAmount = Math.round((taxableAmount * (settings.defaultTaxRate / 100)) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const numericCashReceived = parseFloat(cashReceived) || grandTotal;
  const changeGiven = Math.max(0, Math.round((numericCashReceived - grandTotal) * 100) / 100);

  // Complete Sale
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert(isAr ? 'سلة المبيعات فارغة!' : 'Cart is empty!');
      return;
    }

    if (paymentMethod === 'credit' && (!selectedCustomer || selectedCustomer.id === 'cust-1')) {
      alert(isAr ? 'يرجى اختيار عميل مسجل لإتمام عملية البيع بالآجل (الدفع الآجل)' : 'Please select a registered customer for credit sales!');
      return;
    }

    setIsProcessing(true);
    try {
      const invoicePayload: SaleInvoice = {
        id: `sale-${Date.now()}`,
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString(),
        items: cart.map(item => ({
          productId: item.product.id,
          productNameAr: item.product.nameAr,
          productNameEn: item.product.nameEn,
          barcode: item.product.barcode,
          costPrice: item.product.costPrice,
          unitPrice: item.product.sellingPrice,
          quantity: item.quantity,
          discount: item.discount,
          total: item.total,
          returnPolicy: item.product.returnPolicy || '7_days'
        })),
        subtotal,
        discountTotal: totalDiscount,
        taxRate: settings.defaultTaxRate,
        taxAmount,
        grandTotal,
        paymentMethod,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        cashReceived: paymentMethod === 'cash' ? numericCashReceived : grandTotal,
        changeGiven: paymentMethod === 'cash' ? changeGiven : 0,
        cashierName: isAr ? 'الكاشير المعتمد (الوردية الأولى)' : 'Authorized Cashier (Shift 1)',
        notes: notes.trim() || undefined,
        returnPolicyText: settings.defaultReturnPolicyAr || settings.receiptFooterAr || 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة.',
        status: 'completed'
      };

      const success = await onCompleteSale(invoicePayload);
      if (success) {
        setCompletedInvoice(invoicePayload);
        // Reset Cart
        setCart([]);
        setCashReceived('');
        setOrderDiscount(0);
        setNotes('');
        onRefreshProducts();
      }
    } catch (err: any) {
      alert(err.message || (isAr ? 'حدث خطأ في حفظ الفاتورة' : 'Error saving invoice'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* LEFT PANE (in LTR) or RIGHT PANE (in RTL): Product Catalog Grid */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        {/* Search & Barcode Bar */}
        <div className="bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1 flex items-center">
            <Search className="absolute top-3.5 left-3.5 w-4 h-4 text-slate-400 rtl:right-3.5 rtl:left-auto pointer-events-none" />
            <input
              type="text"
              placeholder={isAr ? 'ابحث بالاسم أو الباركود أو التصنيف (أو اضغط إنتر للإضافة السريعة)...' : 'Search by name, barcode or category...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/60 border border-white/80 rounded-2xl py-2.5 px-10 text-sm text-slate-800 placeholder-slate-400 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="absolute top-3 right-3 rtl:left-3 rtl:right-auto text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            )}
          </form>

          {/* Barcode Scanner Input Form & Add Buttons */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative w-44 sm:w-52">
              <Barcode className="absolute top-3.5 left-3 w-4 h-4 text-indigo-600 rtl:right-3 rtl:left-auto pointer-events-none" />
              <input
                type="text"
                placeholder={isAr ? 'مسح الباركود أو الإضافة...' : 'Scan Barcode or Add...'}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full bg-white/60 border border-white/80 rounded-2xl py-2.5 px-9 text-sm text-slate-800 placeholder-slate-400 font-mono shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
            <button
              type="button"
              onClick={() => handleBarcodeSubmit()}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/20 transition transform active:scale-95 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
              title={isAr ? 'إضافة للبند المبحوث أو فتح نافذة الصنف السريع' : 'Add searched item or create quick item'}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{isAr ? 'إضافة +' : 'Add +'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickNameAr('');
                setQuickNameEn('');
                setQuickBarcode(Math.floor(100000000000 + Math.random() * 900000000000).toString());
                setQuickPrice('');
                setQuickStock('50');
                setQuickMode('inventory');
                setIsQuickModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 transition transform active:scale-95 flex items-center justify-center gap-1 cursor-pointer flex-shrink-0"
              title={isAr ? 'إضافة صنف جديد سريع للمخزون أو الفاتورة مباشرة' : 'Quick create new product'}
            >
              <PackagePlus className="w-4 h-4" />
              <span className="hidden md:inline">{isAr ? 'صنف جديد' : 'New Item'}</span>
            </button>
          </form>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border border-indigo-500 scale-[1.02]'
                  : 'bg-white/50 hover:bg-white/80 text-slate-600 border border-white/80 shadow-sm'
              }`}
            >
              {cat === 'all' ? (isAr ? '🌟 كل الأصناف' : '🌟 All Items') : cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs transition-all whitespace-nowrap shadow-md shadow-emerald-500/20 flex items-center gap-1 cursor-pointer scale-[1.01]"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isAr ? '+ أيقونة مجموعة جديدة' : '+ New Category Icon'}</span>
          </button>
        </div>

        {/* Product Cards Grid (Soft Glass Neumorphism) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[620px] pr-1 no-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-[4px_4px_10px_#d1d9e6]">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-400 opacity-60" />
              <p className="text-base font-semibold">{isAr ? 'لا توجد منتجات مطابقة للبحث' : 'No products match search criteria'}</p>
            </div>
          ) : (
            filteredProducts.map(product => {
              const isLowStock = product.stock <= product.minStock;
              const isOutOfStock = product.stock <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  className={`group relative bg-white/40 backdrop-blur-md rounded-3xl p-4 border transition-all duration-300 flex flex-col justify-between select-none ${
                    isOutOfStock 
                      ? 'opacity-50 border-rose-300 cursor-not-allowed bg-rose-50/40' 
                      : 'border-white/60 hover:border-indigo-400 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] hover:shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] hover:-translate-y-1 cursor-pointer'
                  }`}
                >
                  {/* Stock Pill */}
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/80 text-slate-700 border border-white shadow-sm">
                      #{product.barcode.slice(-4)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm ${
                      isOutOfStock ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                      isLowStock ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse' :
                      'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {isOutOfStock ? (isAr ? 'نفد' : 'Out') : `${product.stock} ${isAr ? 'متوفر' : 'in stock'}`}
                    </span>
                  </div>

                  {/* Product Title */}
                  <div className="my-2">
                    <h3 className="font-bold text-sm text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition">
                      {isAr ? product.nameAr : product.nameEn}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{product.category}</p>
                    {product.returnPolicy && product.returnPolicy !== '7_days' && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                        {product.returnPolicy === 'no_return' ? (isAr ? '🚫 غير قابل للاسترجاع' : '🚫 Non-returnable') :
                         product.returnPolicy === 'exchange_only' ? (isAr ? '🔀 استبدال فقط' : '🔀 Exchange only') :
                         product.returnPolicy === '14_days' ? (isAr ? '🔄 استرجاع 14 يوم' : '🔄 14 Days return') : `🔄 ${product.returnPolicy}`}
                      </span>
                    )}
                  </div>

                  {/* Price Bar */}
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-base font-extrabold text-slate-800">
                        {product.sellingPrice} <span className="text-xs font-normal text-indigo-600">{settings.currency}</span>
                      </span>
                    </div>
                    {!isOutOfStock && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        className="w-8 h-8 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition shadow-sm border border-indigo-100 hover:scale-110 active:scale-95 cursor-pointer"
                        title={isAr ? 'إضافة للفاتورة' : 'Add to cart'}
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE (in LTR) or LEFT PANE (in RTL): Cashier Cart & Billing Summary */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
        <div className="bg-white/40 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col h-full justify-between">
          
          {/* Header & Customer Selection */}
          <div className="flex flex-col gap-3 pb-4 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <span>{isAr ? 'فاتورة المبيعات الحالية' : 'Current POS Invoice'}</span>
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-bold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تفريغ' : 'Clear'}</span>
                </button>
              )}
            </div>

            {/* Customer Dropdown */}
            <div className="relative">
              <User className="absolute top-3 left-3 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const cust = customers.find(c => c.id === e.target.value) || null;
                  setSelectedCustomer(cust);
                }}
                className="w-full bg-white/60 border border-white/80 rounded-2xl py-2 px-9 text-xs font-semibold text-slate-800 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.balance > 0 ? `(${isAr ? 'عليه:' : 'Owes:'} ${c.balance} ${settings.currency})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="my-4 overflow-y-auto max-h-[320px] pr-1 flex flex-col gap-2.5 no-scrollbar flex-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 my-auto">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="text-xs font-medium text-slate-500">{isAr ? 'سلة المبيعات فارغة، انقر على الأصناف لإضافتها' : 'Cart is empty. Click catalog items to add.'}</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="p-3 rounded-2xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-slate-800 flex-1">
                      {isAr ? item.product.nameAr : item.product.nameEn}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {/* Qty Controls */}
                    <div className="flex items-center gap-2 bg-white/80 rounded-xl p-1 border border-white shadow-sm">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition font-bold shadow-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-slate-800 px-2">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition font-bold shadow-xs active:scale-90 cursor-pointer"
                        title={isAr ? 'زيادة الكمية' : 'Increase quantity'}
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Price & Total */}
                    <div className="text-right">
                      <span className="text-slate-500 text-[11px]">
                        {item.product.sellingPrice} × {item.quantity} =
                      </span>
                      <span className="font-extrabold text-indigo-600 ml-1.5 rtl:mr-1.5 text-sm">
                        {item.total} <span className="text-[10px]">{settings.currency}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="py-3 border-t border-slate-200/60 flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-700">{isAr ? 'طريقة الدفع:' : 'Payment Method:'}</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', labelAr: 'نقدي (Cash)', labelEn: 'Cash', icon: Banknote },
                { id: 'card', labelAr: 'شبكة (Card)', labelEn: 'Card/POS', icon: CreditCard },
                { id: 'credit', labelAr: 'آجل (Credit)', labelEn: 'On Credit', icon: FileText },
              ].map(method => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border border-indigo-500'
                        : 'bg-white/50 hover:bg-white/80 text-slate-600 border border-white/80 shadow-sm'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{isAr ? method.labelAr : method.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* If Cash, Show Cash Received input & Change calculation */}
            {paymentMethod === 'cash' && cart.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-1 p-2.5 rounded-2xl bg-white/60 border border-white/80 shadow-inner">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-1">
                    {isAr ? 'المبلغ المستلم من العميل:' : 'Cash Received:'}
                  </label>
                  <input
                    type="number"
                    placeholder={grandTotal.toString()}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full bg-white border border-white/80 rounded-xl py-1 px-2 text-xs text-slate-800 font-bold text-center shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="flex flex-col justify-center text-center">
                  <span className="text-[10px] text-slate-500 font-semibold">{isAr ? 'المتبقي للعميل:' : 'Change Due:'}</span>
                  <span className={`text-sm font-extrabold ${changeGiven > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {changeGiven} {settings.currency}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Financial Calculation Summary Table */}
          <div className="pt-3 border-t border-slate-200/60 flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>{isAr ? 'المجموع الفرعي (Subtotal):' : 'Subtotal:'}</span>
              <span className="font-semibold text-slate-800">{subtotal} {settings.currency}</span>
            </div>

            <div className="flex justify-between text-slate-500">
              <span>{isAr ? 'الخصم الإضافي (Discount):' : 'Discount:'}</span>
              <input
                type="number"
                value={orderDiscount}
                onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                className="w-16 bg-white border border-slate-200 rounded px-1.5 text-right text-xs text-amber-700 font-bold shadow-inner focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-between text-slate-500">
              <span>{isAr ? `ضريبة القيمة المضافة (${settings.defaultTaxRate}% VAT):` : `VAT (${settings.defaultTaxRate}%):`}</span>
              <span className="font-semibold text-slate-800">{taxAmount} {settings.currency}</span>
            </div>

            <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200/80 text-base font-extrabold text-slate-800">
              <span>{isAr ? 'الإجمالي النهائي (Total):' : 'Grand Total:'}</span>
              <span className="text-lg text-indigo-700 font-black">
                {grandTotal} <span className="text-xs text-indigo-600 font-normal">{settings.currency}</span>
              </span>
            </div>
          </div>

          {/* Complete Sale Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className={`mt-4 w-full py-3.5 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition duration-200 ${
              cart.length === 0 || isProcessing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-200 border border-emerald-500 transform active:scale-[0.98]'
            }`}
          >
            {isProcessing ? (
              <span>{isAr ? 'جاري حفظ الفاتورة...' : 'Processing...'}</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>{isAr ? 'إصدار الفاتورة والطباعة' : 'Complete Sale & Receipt'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* COMPLETED INVOICE RECEIPT MODAL (معاينة الفاتورة للطباعة) */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:block">
          <div className="print-invoice-container bg-white text-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto flex flex-col gap-4 animate-in fade-in zoom-in duration-200 print:max-w-none print:w-full print:max-h-none print:shadow-none print:border-none print:rounded-none print:p-4">
            {/* Store Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <h3 className="font-extrabold text-lg text-slate-900">{isAr ? settings.storeNameAr : settings.storeNameEn}</h3>
              <p className="text-xs text-slate-600 mt-1">{settings.storeAddress}</p>
              <p className="text-xs text-slate-600">{isAr ? 'هاتف:' : 'Tel:'} {settings.storePhone} | {isAr ? 'الرقم الضريبي:' : 'VAT:'} {settings.taxNumber}</p>
              <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-800 border border-slate-200">
                {isAr ? 'فاتورة ضريبية مبسطة' : 'Simplified Tax Invoice'}
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <div>
                <p><strong>{isAr ? 'رقم الفاتورة:' : 'Invoice #:'}</strong> {completedInvoice.invoiceNumber}</p>
                <p><strong>{isAr ? 'التاريخ:' : 'Date:'}</strong> {new Date(completedInvoice.date).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</p>
              </div>
              <div className="text-right">
                <p><strong>{isAr ? 'طريقة الدفع:' : 'Payment:'}</strong> {
                  completedInvoice.paymentMethod === 'cash' ? (isAr ? 'نقدي (Cash)' : 'Cash') :
                  completedInvoice.paymentMethod === 'card' ? (isAr ? 'شبكة (Card)' : 'Card') :
                  (isAr ? 'آجل (Credit)' : 'Credit')
                }</p>
                <p><strong>{isAr ? 'العميل:' : 'Customer:'}</strong> {completedInvoice.customerName || 'عام'}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs text-left rtl:text-right border-y border-slate-200 my-1">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-2">{isAr ? 'الصنف' : 'Item'}</th>
                  <th className="py-2 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                  <th className="py-2 text-right">{isAr ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedInvoice.items.map((item, idx) => (
                  <tr key={idx} className="py-1.5">
                    <td className="py-1.5 font-semibold text-slate-800">
                      <div>{isAr ? item.productNameAr : item.productNameEn}</div>
                      {item.returnPolicy && item.returnPolicy !== '7_days' && (
                        <div className="text-[9px] text-purple-900 font-extrabold mt-0.5 bg-purple-50 inline-block px-1 py-0.5 rounded border border-purple-200">
                          {item.returnPolicy === 'no_return' ? (isAr ? '🚫 غير قابل للاسترجاع' : '🚫 Non-returnable') :
                           item.returnPolicy === 'exchange_only' ? (isAr ? '🔀 استبدال فقط' : '🔀 Exchange only') :
                           item.returnPolicy === '14_days' ? (isAr ? '🔄 استرجاع 14 يوم' : '🔄 14 Days return') : `🔄 ${item.returnPolicy}`}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 text-center font-mono">{item.quantity}</td>
                    <td className="py-1.5 text-right font-bold text-slate-900">{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Totals */}
            <div className="flex flex-col gap-1 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span>{completedInvoice.subtotal} {settings.currency}</span>
              </div>
              {completedInvoice.discountTotal > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>{isAr ? 'إجمالي الخصم:' : 'Discount:'}</span>
                  <span>-{completedInvoice.discountTotal} {settings.currency}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{isAr ? `ضريبة القيمة المضافة (${completedInvoice.taxRate}%):` : `VAT (${completedInvoice.taxRate}%):`}</span>
                <span>{completedInvoice.taxAmount} {settings.currency}</span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-300 text-base font-extrabold text-slate-900">
                <span>{isAr ? 'الإجمالي النهائي:' : 'Grand Total:'}</span>
                <span>{completedInvoice.grandTotal} {settings.currency}</span>
              </div>
            </div>

            {/* EXPLICIT RETURN POLICY ON INVOICE (سياسة الاسترجاع المطبوعة على الفاتورة) */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-slate-900 text-xs">
              <div className="font-bold text-purple-900 flex items-center gap-1 mb-1">
                <span>📋</span>
                <span>{isAr ? 'سياسة الاسترجاع والاستبدال:' : 'Return & Exchange Policy:'}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-800 font-bold whitespace-pre-line">
                {completedInvoice.returnPolicyText || settings.defaultReturnPolicyAr || settings.receiptFooterAr || (isAr ? 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة.' : 'Returns accepted within 7 days with original receipt.')}
              </p>
            </div>

            {/* Simulated QR Code / Barcode footer for Saudi ZATCA compliance feel */}
            <div className="text-center pt-4 border-t border-dashed border-slate-300 flex flex-col items-center gap-2">
              <div className="p-2 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center w-28 h-28 shadow-inner">
                <Barcode className="w-20 h-20 text-slate-800" />
              </div>
              <p className="text-[11px] text-slate-500 text-center italic">{isAr ? settings.receiptFooterAr : settings.receiptFooterEn}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2 print:hidden">
              <div className="flex gap-2">
                <button
                  onClick={() => triggerSmartPrint(completedInvoice, settings, isAr)}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'طباعة مباشرة' : 'Direct Print'}</span>
                </button>
                <button
                  onClick={() => printInNewTab(completedInvoice, settings, isAr)}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition"
                  title={isAr ? 'افتح في تبويب جديد لتجنب قيود المتصفح' : 'Open in new tab to bypass iframe restrictions'}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isAr ? 'طباعة في نافذة جديدة' : 'Print in New Tab'}</span>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadReceiptHtml(completedInvoice, settings, isAr)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                  title={isAr ? 'تنزيل الفاتورة كملف جاهز للطباعة على أي طابعة' : 'Download standalone printable file'}
                >
                  <Download className="w-4 h-4" />
                  <span>{isAr ? 'تنزيل ملف الفاتورة للطباعة (مضمون 100%)' : 'Download Printable File (100% Guaranteed)'}</span>
                </button>
                <button
                  onClick={() => setCompletedInvoice(null)}
                  className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-2xl text-xs transition"
                >
                  {isAr ? 'إغلاق ومتابعة' : 'Close & Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product / Custom Item Modal */}
      {isQuickModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl border border-white rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-2xl shadow-inner">
                  <PackagePlus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">
                    {isAr ? 'إضافة صنف سريع / منتج جديد' : 'Quick Add / New Product'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'أضف صنفاً جديداً للمخزون أو بنداً مخصصاً للفاتورة الحالية مباشرة' : 'Create new inventory product or add custom item to invoice'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode selector pills */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setQuickMode('inventory')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  quickMode === 'inventory'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60 scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📦</span>
                <span>{isAr ? 'حفظ بالمخزون والفاتورة' : 'Save to Inventory & Cart'}</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickMode('custom')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  quickMode === 'custom'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60 scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⚡</span>
                <span>{isAr ? 'بند مخصص للفاتورة فقط' : 'Invoice Custom Item Only'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveQuickProduct} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'اسم الصنف (بالعربية) *' : 'Item Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: وجبة خاصة / صيانة / منتج جديد' : 'e.g. Custom service / New item'}
                  value={quickNameAr}
                  onChange={(e) => setQuickNameAr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'اسم الصنف (بالإنجليزية)' : 'Item Name (English)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special Item / Custom Fee"
                  value={quickNameEn}
                  onChange={(e) => setQuickNameEn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'سعر البيع (' + settings.currency + ') *' : 'Price (' + settings.currency + ') *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(e.target.value)}
                    className="w-full bg-indigo-50/50 border border-indigo-200 rounded-2xl py-2.5 px-3.5 text-base font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {isAr ? 'التصنيف والمجموعة' : 'Category'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>+ {isAr ? 'أيقونة جديدة' : 'New Icon'}</span>
                    </button>
                  </div>
                  <select
                    value={quickCategory}
                    onChange={(e) => {
                      if (e.target.value === 'NEW_CAT') {
                        setIsCategoryModalOpen(true);
                      } else {
                        setQuickCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                  >
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="NEW_CAT">✨ + {isAr ? 'إضافة مجموعة بأيقونة جديدة...' : 'Add new category icon...'}</option>
                  </select>
                </div>
              </div>

              {quickMode === 'inventory' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'الباركود / الرمز' : 'Barcode / SKU'}
                    </label>
                    <input
                      type="text"
                      value={quickBarcode}
                      onChange={(e) => setQuickBarcode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'الكمية الأولية بالمخزون' : 'Initial Stock Qty'}
                    </label>
                    <input
                      type="number"
                      value={quickStock}
                      onChange={(e) => setQuickStock(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-slate-200/80 mt-1">
                <button
                  type="submit"
                  disabled={isSavingQuickProduct}
                  className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl text-xs shadow-lg shadow-indigo-500/30 transition transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>
                    {isSavingQuickProduct
                      ? (isAr ? 'جاري الحفظ وإضافة الصنف...' : 'Saving item...')
                      : (quickMode === 'inventory' ? (isAr ? 'حفظ وإضافة للفاتورة الآن' : 'Save to Inventory & Cart') : (isAr ? 'إضافة البند للفاتورة مباشرة' : 'Add Custom Item to Cart'))}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickModalOpen(false)}
                  className="px-5 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Icon & Group Creation Modal */}
      <CategoryIconModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaveCategory={handleSaveCategoryGroup}
        lang={lang}
        existingCategories={categories}
      />
    </div>
  );
};
