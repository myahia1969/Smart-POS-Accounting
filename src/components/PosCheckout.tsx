/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  Layers,
  Store,
  MapPin,
  Phone,
  ShieldCheck,
  Zap,
  RotateCcw
} from 'lucide-react';
import { Product, Customer, CartItem, SaleInvoice, SystemSettings, Language, PaymentMethod } from '../types';
import { triggerSmartPrint, printInNewTab, downloadReceiptHtml } from '../utils/printReceipt';
import { CategoryIconModal } from './CategoryIconModal';

interface PosCheckoutProps {
  products: Product[];
  customers: Customer[];
  settings: SystemSettings;
  lang: Language;
  sales?: SaleInvoice[];
  onCompleteSale: (invoice: SaleInvoice) => Promise<boolean>;
  onRefreshProducts: () => void;
  onSaveProduct?: (product: Product) => Promise<boolean>;
  onUpdateSettings?: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
  onUpdateInvoiceStatus?: (id: string, updates: Partial<SaleInvoice>) => Promise<boolean>;
}

export const PosCheckout: React.FC<PosCheckoutProps> = ({
  products,
  customers,
  settings,
  lang,
  sales = [],
  onCompleteSale,
  onRefreshProducts,
  onSaveProduct,
  onUpdateSettings,
  onUpdateInvoiceStatus
}) => {
  const isAr = lang === 'ar';

  // Helper to load saved transaction synchronously on initialization
  const [initialSavedTx] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_saved_transaction');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && ((Array.isArray(parsed.cart) && parsed.cart.length > 0) || parsed.notes || parsed.orderDiscount > 0 || parsed.loyaltyPointsRedeemed > 0)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved POS transaction from localStorage:', e);
    }
    return null;
  });

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (initialSavedTx && Array.isArray(initialSavedTx.cart)) {
      return initialSavedTx.cart;
    }
    return [];
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    if (initialSavedTx && initialSavedTx.selectedCustomer) {
      return initialSavedTx.selectedCustomer;
    }
    if (initialSavedTx && initialSavedTx.selectedCustomerId) {
      const found = customers.find(c => c.id === initialSavedTx.selectedCustomerId);
      if (found) return found;
    }
    return customers.find(c => c.id === 'cust-1') || customers[0] || null;
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => initialSavedTx?.paymentMethod || 'cash');
  const [cashReceived, setCashReceived] = useState<string>(() => initialSavedTx?.cashReceived !== undefined ? String(initialSavedTx.cashReceived) : '');
  const [orderDiscount, setOrderDiscount] = useState<number>(() => initialSavedTx?.orderDiscount || 0);
  const [loyaltyPointsRedeemed, setLoyaltyPointsRedeemed] = useState<number>(() => initialSavedTx?.loyaltyPointsRedeemed || 0);
  const [notes, setNotes] = useState<string>(() => initialSavedTx?.notes || '');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [hasRecoveredTransaction, setHasRecoveredTransaction] = useState<boolean>(() => !!initialSavedTx);

  // Reconcile recovered customer & cart when products/customers props update
  useEffect(() => {
    if (selectedCustomer && customers.length > 0) {
      const freshCust = customers.find(c => c.id === selectedCustomer.id);
      if (freshCust && (freshCust.balance !== selectedCustomer.balance || freshCust.loyaltyPoints !== selectedCustomer.loyaltyPoints || freshCust.name !== selectedCustomer.name)) {
        setSelectedCustomer(freshCust);
      }
    }
  }, [customers, selectedCustomer]);

  useEffect(() => {
    if (products.length > 0 && cart.length > 0) {
      setCart(prevCart => {
        let hasChanges = false;
        const updated = prevCart.map(item => {
          const freshProd = products.find(p => p.id === item.product.id);
          if (freshProd && (freshProd.nameAr !== item.product.nameAr || freshProd.sellingPrice !== item.product.sellingPrice || freshProd.stock !== item.product.stock)) {
            hasChanges = true;
            return {
              ...item,
              product: freshProd,
              total: item.quantity * freshProd.sellingPrice - item.discount
            };
          }
          return item;
        });
        return hasChanges ? updated : prevCart;
      });
    }
  }, [products]);

  // Auto-save POS transaction to localStorage whenever cart or transaction details change
  useEffect(() => {
    try {
      const hasContent = cart.length > 0 || notes.trim() !== '' || orderDiscount > 0 || loyaltyPointsRedeemed > 0;
      if (hasContent) {
        const payload = {
          cart,
          selectedCustomer,
          selectedCustomerId: selectedCustomer?.id || null,
          paymentMethod,
          cashReceived,
          orderDiscount,
          loyaltyPointsRedeemed,
          notes,
          timestamp: Date.now()
        };
        localStorage.setItem('pos_saved_transaction', JSON.stringify(payload));
      } else {
        localStorage.removeItem('pos_saved_transaction');
      }
    } catch (e) {
      console.error('Failed to auto-save POS transaction to localStorage:', e);
    }
  }, [cart, selectedCustomer, paymentMethod, cashReceived, orderDiscount, loyaltyPointsRedeemed, notes]);

  const handleClearCart = () => {
    setCart([]);
    setCashReceived('');
    setOrderDiscount(0);
    setLoyaltyPointsRedeemed(0);
    setNotes('');
    setHasRecoveredTransaction(false);
    try {
      localStorage.removeItem('pos_saved_transaction');
    } catch (e) {
      console.error('Failed to remove saved POS transaction from localStorage:', e);
    }
  };

  // USB Barcode Scanner Utility State & Refs
  const [isScannerListenerActive, setIsScannerListenerActive] = useState<boolean>(true);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{ name: string; price: number; status: 'success' | 'error' | 'not_found'; timestamp: number } | null>(null);
  const barcodeBufferRef = React.useRef<string>('');
  const lastKeyTimeRef = React.useRef<number>(0);

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

  // Dedicated Quick Sale Modal State (One-time entry without inventory registration)
  const [isQuickSaleModalOpen, setIsQuickSaleModalOpen] = useState(false);
  const [quickSaleNameAr, setQuickSaleNameAr] = useState('');
  const [quickSaleNameEn, setQuickSaleNameEn] = useState('');
  const [quickSalePrice, setQuickSalePrice] = useState('');
  const [quickSaleQty, setQuickSaleQty] = useState<number>(1);
  const [quickSaleCategory, setQuickSaleCategory] = useState('أصناف وخدمات مخصصة');

  // Receipt Modal State
  const [completedInvoice, setCompletedInvoice] = useState<SaleInvoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // POS Quick Refund / Return State
  const [showPosRefundModal, setShowPosRefundModal] = useState(false);
  const [posRefundSearch, setPosRefundSearch] = useState('');
  const [selectedPosRefundInvoice, setSelectedPosRefundInvoice] = useState<SaleInvoice | null>(null);
  const [posRefundQty, setPosRefundQty] = useState<Record<string, number>>({});
  const [posRefundReason, setPosRefundReason] = useState('');
  const [isPosRefunding, setIsPosRefunding] = useState(false);

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

  // Audio Beep generator for hardware scanners
  const playBeepSound = (type: 'success' | 'error' | 'not_found') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'not_found') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Ignore if audio context not permitted
    }
  };

  // Unified barcode processing utility (used by hardware USB scanner and manual inputs)
  const processBarcodeScan = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // 1. Try finding exact match by barcode, SKU, or ID
    const exactMatch = products.find(p => 
      p.barcode === cleanCode || 
      p.id === cleanCode || 
      (p.sku && p.sku.toLowerCase() === cleanCode.toLowerCase())
    );

    if (exactMatch) {
      const added = addToCart(exactMatch);
      if (added) {
        playBeepSound('success');
        setLastScannedFeedback({ 
          name: isAr ? exactMatch.nameAr : exactMatch.nameEn, 
          price: exactMatch.sellingPrice, 
          status: 'success',
          timestamp: Date.now()
        });
      } else {
        playBeepSound('error');
        setLastScannedFeedback({ 
          name: isAr ? exactMatch.nameAr : exactMatch.nameEn, 
          price: exactMatch.sellingPrice, 
          status: 'error',
          timestamp: Date.now()
        });
      }
      return;
    }

    // 2. Try partial match or name match
    const matches = products.filter(p => 
      p.nameAr.toLowerCase().includes(cleanCode.toLowerCase()) || 
      p.nameEn.toLowerCase().includes(cleanCode.toLowerCase()) || 
      p.barcode.includes(cleanCode) ||
      p.category.toLowerCase().includes(cleanCode.toLowerCase())
    );

    if (matches.length === 1) {
      const added = addToCart(matches[0]);
      if (added) {
        playBeepSound('success');
        setLastScannedFeedback({ 
          name: isAr ? matches[0].nameAr : matches[0].nameEn, 
          price: matches[0].sellingPrice, 
          status: 'success',
          timestamp: Date.now()
        });
      } else {
        playBeepSound('error');
        setLastScannedFeedback({ 
          name: isAr ? matches[0].nameAr : matches[0].nameEn, 
          price: matches[0].sellingPrice, 
          status: 'error',
          timestamp: Date.now()
        });
      }
      return;
    } else if (matches.length > 1) {
      const added = addToCart(matches[0]);
      if (added) {
        playBeepSound('success');
        setLastScannedFeedback({ 
          name: isAr ? matches[0].nameAr : matches[0].nameEn, 
          price: matches[0].sellingPrice, 
          status: 'success',
          timestamp: Date.now()
        });
      }
      return;
    }

    // 3. Not found in inventory!
    playBeepSound('not_found');
    setLastScannedFeedback({ 
      name: cleanCode, 
      price: 0, 
      status: 'not_found',
      timestamp: Date.now()
    });

    // Open Quick Add Product modal pre-filled with this query
    setQuickNameAr(/^\d+$/.test(cleanCode) ? '' : cleanCode);
    setQuickNameEn(/^\d+$/.test(cleanCode) ? '' : cleanCode);
    setQuickBarcode(/^\d+$/.test(cleanCode) ? cleanCode : Math.floor(100000000000 + Math.random() * 900000000000).toString());
    setQuickPrice('');
    setQuickStock('50');
    setQuickMode('inventory');
    setIsQuickModalOpen(true);
  };

  // Global USB Barcode Scanner Keyboard Event Listener
  React.useEffect(() => {
    if (!isScannerListenerActive) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const isEditingText = activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl.id !== 'pos-barcode-input' && activeEl.id !== 'pos-search-input') ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If more than 150ms passed between strokes, reset buffer (not rapid hardware scanner)
      if (elapsed > 150) {
        barcodeBufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const bufferedCode = barcodeBufferRef.current.trim();
        
        // Case 1: Rapid hardware scan detected (or enter pressed when NOT editing text)
        if (bufferedCode.length >= 2 && (!isEditingText || elapsed <= 150)) {
          e.preventDefault();
          e.stopPropagation();
          if (activeEl && typeof activeEl.blur === 'function' && activeEl.tagName !== 'INPUT') {
            activeEl.blur(); // Prevent accidental button clicks
          }
          processBarcodeScan(bufferedCode);
          barcodeBufferRef.current = '';
          return;
        }

        // Case 2: Enter pressed while focused inside our dedicated POS barcode/search inputs
        if (activeEl && (activeEl.id === 'pos-barcode-input' || activeEl.id === 'pos-search-input')) {
          const val = (activeEl as HTMLInputElement).value?.trim();
          if (val) {
            e.preventDefault();
            processBarcodeScan(val);
            if (activeEl.id === 'pos-barcode-input') setBarcodeInput('');
            if (activeEl.id === 'pos-search-input') setSearchTerm('');
          }
          barcodeBufferRef.current = '';
          return;
        }

        barcodeBufferRef.current = '';
        return;
      }

      // Buffer single printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && !isEditingText) {
        barcodeBufferRef.current += e.key;
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && (activeEl?.id === 'pos-barcode-input' || activeEl?.id === 'pos-search-input')) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isScannerListenerActive, products, cart, settings, isAr]);

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

    processBarcodeScan(query);
    setBarcodeInput('');
    setSearchTerm('');
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

  // Handle Quick Sale (One-time custom price item without inventory registration)
  const handleAddQuickSale = (instantPay: boolean = false) => {
    const priceVal = parseFloat(quickSalePrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      alert(isAr ? 'يرجى إدخال مبلغ أو سعر بيع صحيح للبند!' : 'Please enter a valid price amount!');
      return;
    }
    const qtyVal = Math.max(1, quickSaleQty || 1);
    const finalNameAr = quickSaleNameAr.trim() || quickSaleNameEn.trim() || 'بند مبيع سريع / خدمة مباشرة';
    const finalNameEn = quickSaleNameEn.trim() || quickSaleNameAr.trim() || 'Quick Sale / Custom Item';

    const customProd: Product = {
      id: `quicksale-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      nameAr: finalNameAr,
      nameEn: finalNameEn,
      category: quickSaleCategory || 'أصناف وخدمات مخصصة',
      sellingPrice: priceVal,
      costPrice: 0,
      barcode: `QS-${Date.now().toString().slice(-6)}`,
      stock: 999999, // Infinite stock for one-time entries
      minStock: 0,
      unit: 'piece',
      returnPolicy: '7_days',
      updatedAt: new Date().toISOString()
    };

    if (instantPay) {
      const newCartItem: CartItem = {
        product: customProd,
        quantity: qtyVal,
        discount: 0,
        total: priceVal * qtyVal
      };
      
      const updatedCart = [...cart, newCartItem];
      setCart(updatedCart);
      
      const immediateSubtotal = updatedCart.reduce((sum, i) => sum + (i.quantity * i.product.sellingPrice), 0);
      const immediateDiscount = updatedCart.reduce((sum, i) => sum + i.discount, 0) + (orderDiscount || 0);
      const immediateTaxable = Math.max(0, immediateSubtotal - immediateDiscount);
      const immediateTax = Math.round((immediateTaxable * (settings.defaultTaxRate / 100)) * 100) / 100;
      const immediateGrand = Math.round((immediateTaxable + immediateTax) * 100) / 100;

      const invoicePayload: SaleInvoice = {
        id: `sale-${Date.now()}`,
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString(),
        items: updatedCart.map(item => ({
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
        subtotal: immediateSubtotal,
        discountTotal: immediateDiscount,
        taxRate: settings.defaultTaxRate,
        taxAmount: immediateTax,
        grandTotal: immediateGrand,
        paymentMethod: 'cash',
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerEmail: selectedCustomer?.email,
        cashReceived: immediateGrand,
        changeGiven: 0,
        cashierName: isAr ? 'الكاشير المعتمد (الوردية الأولى)' : 'Authorized Cashier (Shift 1)',
        notes: notes.trim() || (isAr ? 'بيع سريع ومباشر' : 'Instant Quick Sale'),
        returnPolicyText: settings.defaultReturnPolicyAr || settings.receiptFooterAr || 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة.',
        status: 'completed'
      };

      setIsProcessing(true);
      onCompleteSale(invoicePayload).then(success => {
        setIsProcessing(false);
        if (success) {
          setCompletedInvoice(invoicePayload);
          setCart([]);
          setCashReceived('');
          setOrderDiscount(0);
          setNotes('');
          setHasRecoveredTransaction(false);
          try {
            localStorage.removeItem('pos_saved_transaction');
          } catch (e) {
            console.error('Failed to remove saved POS transaction:', e);
          }
        }
      });
    } else {
      setCart(prev => {
        const existing = prev.find(item => item.product.nameAr === customProd.nameAr && item.product.sellingPrice === customProd.sellingPrice);
        if (existing) {
          return prev.map(item => 
            item.product.id === existing.product.id 
              ? { ...item, quantity: item.quantity + qtyVal, total: (item.quantity + qtyVal) * item.product.sellingPrice - item.discount }
              : item
          );
        }
        return [...prev, {
          product: customProd,
          quantity: qtyVal,
          discount: 0,
          total: priceVal * qtyVal
        }];
      });
    }

    setQuickSaleNameAr('');
    setQuickSaleNameEn('');
    setQuickSalePrice('');
    setQuickSaleQty(1);
    setIsQuickSaleModalOpen(false);
  };

  // Cart operations
  function addToCart(product: Product): boolean {
    if (product.stock <= 0) {
      alert(isAr ? 'عفواً، الكمية نافدة من المخزون!' : 'Sorry, product is out of stock!');
      return false;
    }
    let success = false;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(isAr ? 'الكمية المطلوبة تتجاوز رصيد المخزون!' : 'Requested quantity exceeds available stock!');
          success = false;
          return prev;
        }
        success = true;
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.product.sellingPrice - item.discount }
            : item
        );
      }
      success = true;
      return [...prev, {
        product,
        quantity: 1,
        discount: 0,
        total: product.sellingPrice
      }];
    });
    return success;
  }

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
        customerEmail: selectedCustomer?.email,
        cashReceived: paymentMethod === 'cash' ? numericCashReceived : grandTotal,
        changeGiven: paymentMethod === 'cash' ? changeGiven : 0,
        cashierName: isAr ? 'الكاشير المعتمد (الوردية الأولى)' : 'Authorized Cashier (Shift 1)',
        notes: notes.trim() || undefined,
        returnPolicyText: settings.defaultReturnPolicyAr || settings.receiptFooterAr || 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة.',
        status: 'completed',
        loyaltyPointsRedeemed: loyaltyPointsRedeemed > 0 ? loyaltyPointsRedeemed : undefined,
        loyaltyDiscountAmount: loyaltyPointsRedeemed > 0 ? Math.floor(loyaltyPointsRedeemed * ((settings.loyaltyRedeemRate || 10) / 100)) : undefined
      };

      const success = await onCompleteSale(invoicePayload);
      if (success) {
        setCompletedInvoice(invoicePayload);
        // Reset Cart
        setCart([]);
        setCashReceived('');
        setOrderDiscount(0);
        setLoyaltyPointsRedeemed(0);
        setNotes('');
        setHasRecoveredTransaction(false);
        try {
          localStorage.removeItem('pos_saved_transaction');
        } catch (e) {
          console.error('Failed to remove saved POS transaction:', e);
        }
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
      {/* Store Identity Banner on Home Page */}
      <div className="lg:col-span-12 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-500/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center shadow-inner shrink-0">
            <Store className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>{isAr ? settings.storeNameAr : settings.storeNameEn}</span>
              <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {isAr ? 'فرع المبيعات الرئيسي / POS' : 'Main Branch / POS'}
              </span>
            </h1>
            <p className="text-xs text-indigo-200/80 font-medium mt-1 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-400" /> {settings.storeAddress}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-400" /> {settings.storePhone}</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> {isAr ? 'الرقم الضريبي:' : 'VAT:'} {settings.taxNumber}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowPosRefundModal(true);
              setSelectedPosRefundInvoice(null);
            }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black px-3.5 py-2 rounded-2xl border-2 border-amber-300 shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition transform active:scale-95 cursor-pointer text-xs animate-pulse"
            title={isAr ? 'استرجاع أو استبدال فاتورة سابقة للمخزون' : 'POS Return & Refund'}
          >
            <span className="text-sm">🔄</span>
            <span>{isAr ? 'استرجاع فاتورة (Refund)' : 'Return / Refund'}</span>
          </button>
          <div className="text-right rtl:text-left bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="text-[10px] text-indigo-200 font-bold">{isAr ? 'عملة البيع الرسمية' : 'Default Currency'}</div>
            <div className="text-sm font-extrabold text-white flex items-center gap-1 justify-end">
              <span>{settings.currencySymbol}</span>
              <span className="text-xs opacity-75">({settings.currency})</span>
            </div>
          </div>
        </div>
      </div>

      {/* LEFT PANE (in LTR) or RIGHT PANE (in RTL): Product Catalog Grid */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        {/* USB Barcode Scanner Status & Live Feedback Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-3 rounded-2xl border border-indigo-500/30 shadow-lg text-white">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isScannerListenerActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'}`} />
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Barcode className="w-4 h-4 text-indigo-300" />
              <span>{isAr ? 'قارئ الباركود (USB Scanner):' : 'USB Barcode Scanner:'}</span>
              <span className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${isScannerListenerActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                {isScannerListenerActive ? (isAr ? 'متصل وجاهز للمسح الفوري ⚡' : 'ACTIVE & READY ⚡') : (isAr ? 'متوقف مؤقتاً' : 'PAUSED')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastScannedFeedback && (
              <div className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-bounce ${
                lastScannedFeedback.status === 'success' ? 'bg-emerald-600 text-white shadow-md' :
                lastScannedFeedback.status === 'error' ? 'bg-rose-600 text-white shadow-md' :
                'bg-amber-600 text-white shadow-md'
              }`}>
                {lastScannedFeedback.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>
                  {lastScannedFeedback.status === 'success' 
                    ? (isAr ? `⚡ تم مسح: "${lastScannedFeedback.name}" (+1 للسلة)` : `⚡ Scanned: "${lastScannedFeedback.name}" (+1 Cart)`) 
                    : lastScannedFeedback.status === 'error'
                    ? (isAr ? `⚠️ تعذر إضافة: "${lastScannedFeedback.name}" (نفد المخزون)` : `⚠️ Failed: "${lastScannedFeedback.name}" (Out of stock)`)
                    : (isAr ? `🔍 باركود غير معروف: "${lastScannedFeedback.name}"` : `🔍 Unknown barcode: "${lastScannedFeedback.name}"`)}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsScannerListenerActive(!isScannerListenerActive)}
              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 transition border border-white/10 cursor-pointer"
              title={isAr ? 'تفعيل أو تعطيل الاستماع التلقائي لقارئ الباركود' : 'Toggle USB Barcode Scanner listening'}
            >
              {isScannerListenerActive ? (isAr ? 'إيقاف الاستماع' : 'Pause Scanner') : (isAr ? 'تفعيل الاستماع' : 'Enable Scanner')}
            </button>
            <button
              type="button"
              onClick={() => playBeepSound('success')}
              className="p-1.5 rounded-xl bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 hover:text-white transition border border-indigo-400/30 cursor-pointer"
              title={isAr ? 'اختبار صوت المسح (Beep)' : 'Test scanner sound beep'}
            >
              🔊
            </button>
          </div>
        </div>

        {/* Search & Barcode Bar */}
        <div className="bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1 flex items-center">
            <Search className="absolute top-3.5 left-3.5 w-4 h-4 text-slate-400 rtl:right-3.5 rtl:left-auto pointer-events-none" />
            <input
              id="pos-search-input"
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
                id="pos-barcode-input"
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
            <button
              type="button"
              onClick={() => {
                setQuickSaleNameAr(searchTerm || barcodeInput || '');
                setQuickSaleNameEn(searchTerm || barcodeInput || '');
                setQuickSalePrice('');
                setQuickSaleQty(1);
                setIsQuickSaleModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-2xl text-xs font-black shadow-md shadow-amber-500/25 transition transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 border border-amber-300/30"
              title={isAr ? 'بيع سريع: إضافة بند أو خدمة بسعر مخصص مباشرة للفاتورة دون تسجيل بالمخزون' : 'Quick Sale: Add one-time item or custom price line item without inventory registration'}
            >
              <Zap className="w-4 h-4 fill-amber-200 stroke-white animate-pulse" />
              <span className="hidden md:inline">{isAr ? '⚡ بيع سريع / بند حر' : '⚡ Quick Sale'}</span>
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
            <div className="col-span-full py-14 text-center text-slate-500 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-[4px_4px_10px_#d1d9e6] flex flex-col items-center justify-center gap-3">
              <ShoppingBag className="w-12 h-12 mx-auto mb-1 text-slate-400 opacity-60" />
              <div>
                <p className="text-base font-bold text-slate-700">{isAr ? 'لا توجد منتجات مطابقة للبحث في المخزون' : 'No products match search criteria in inventory'}</p>
                <p className="text-xs text-slate-500 mt-1">{isAr ? 'هل ترغب في بيع هذا البند كبند حر أو خدمة بسعر مخصص مباشرة؟' : 'Would you like to add this as a one-time custom item without inventory registration?'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuickSaleNameAr(searchTerm || barcodeInput || '');
                  setQuickSaleNameEn(searchTerm || barcodeInput || '');
                  setQuickSalePrice('');
                  setQuickSaleQty(1);
                  setIsQuickSaleModalOpen(true);
                }}
                className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-amber-500/25 transition transform active:scale-95 flex items-center gap-2 cursor-pointer mt-1 border border-amber-300/30"
              >
                <Zap className="w-4 h-4 fill-amber-200 stroke-white animate-pulse" />
                <span>{isAr ? '⚡ إضافة كـ "بيع سريع / بند حر" الآن' : '⚡ Add as Quick Sale Item Now'}</span>
              </button>
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

                  {/* Product Thumbnail if available */}
                  {product.imageUrl && (
                    <div className="w-full h-28 my-1 rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 flex items-center justify-center shrink-0 shadow-inner">
                      <img src={product.imageUrl} alt={product.nameEn} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                    </div>
                  )}

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
            {/* Auto-Save Recovery Banner */}
            {hasRecoveredTransaction && (
              <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 p-3 rounded-2xl border border-emerald-500/40 flex items-center justify-between gap-2 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <div className="text-xs font-bold text-emerald-900">
                      {isAr ? 'تم استرجاع الفاتورة غير المكتملة' : 'Recovered Unsaved Transaction'}
                    </div>
                    <div className="text-[11px] text-emerald-800 font-medium">
                      {isAr ? 'تمت استعادة أصناف وبيانات العملية قبل إغلاق النظام' : 'Cart items & transaction details restored from previous session'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setHasRecoveredTransaction(false)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    title={isAr ? 'متابعة العملية' : 'Continue'}
                  >
                    {isAr ? 'متابعة' : 'Continue'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-[10px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    title={isAr ? 'تجاهل وتفريغ السلة' : 'Discard & clear cart'}
                  >
                    {isAr ? 'تجاهل' : 'Discard'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <span>{isAr ? 'فاتورة المبيعات الحالية' : 'Current POS Invoice'}</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickSaleNameAr('');
                    setQuickSaleNameEn('');
                    setQuickSalePrice('');
                    setQuickSaleQty(1);
                    setIsQuickSaleModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-[11px] rounded-xl shadow-sm flex items-center gap-1 transition active:scale-95 cursor-pointer border border-amber-300/30"
                  title={isAr ? 'إضافة بند حر / خدمة سريعة للفاتورة' : 'Add custom item / quick service'}
                >
                  <Zap className="w-3 h-3 fill-amber-200 stroke-white" />
                  <span>{isAr ? '⚡ بند حر +' : '⚡ Quick Item'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPosRefundModal(true);
                    setSelectedPosRefundInvoice(null);
                  }}
                  className="px-2.5 py-1 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-extrabold text-[11px] rounded-xl shadow-sm flex items-center gap-1 transition active:scale-95 cursor-pointer border border-rose-300/30 animate-pulse"
                  title={isAr ? 'استرجاع أو استبدال فاتورة سابقة' : 'Return / Refund an invoice'}
                >
                  <span className="text-xs">🔄</span>
                  <span>{isAr ? 'استرجاع' : 'Refund'}</span>
                </button>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-bold transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تفريغ' : 'Clear'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Customer Dropdown */}
            <div className="relative">
              <User className="absolute top-3 left-3 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const cust = customers.find(c => c.id === e.target.value) || null;
                  setSelectedCustomer(cust);
                  setLoyaltyPointsRedeemed(0);
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

            {/* Customer Loyalty Banner */}
            {selectedCustomer && selectedCustomer.id !== 'cust-1' && (
              <div className="mt-2.5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-2.5 rounded-2xl border border-amber-500/30 flex items-center justify-between gap-2 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎁</span>
                  <div>
                    <div className="text-[10px] font-bold text-amber-800">{isAr ? 'نقاط الولاء المتاحة للعميل:' : 'Customer Loyalty:'}</div>
                    <div className="text-xs font-black text-amber-900 font-mono">
                      {selectedCustomer.loyaltyPoints || 0} <span className="text-[10px] font-sans font-normal text-slate-600">≈ {Math.floor((selectedCustomer.loyaltyPoints || 0) * ((settings.loyaltyRedeemRate || 10) / 100))} {settings.currency}</span>
                    </div>
                  </div>
                </div>
                {(selectedCustomer.loyaltyPoints || 0) >= 10 && loyaltyPointsRedeemed === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const discountVal = Math.floor((selectedCustomer.loyaltyPoints || 0) * ((settings.loyaltyRedeemRate || 10) / 100));
                      if (discountVal > 0) {
                        setOrderDiscount(prev => prev + discountVal);
                        setLoyaltyPointsRedeemed(selectedCustomer.loyaltyPoints || 0);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[10px] font-black shadow-sm transition active:scale-95 whitespace-nowrap"
                  >
                    {isAr ? '🎁 استبدال بخصم' : '🎁 Redeem'}
                  </button>
                ) : loyaltyPointsRedeemed > 0 ? (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[10px] font-black">
                    {isAr ? '✅ تم تطبيق الخصم' : '✅ Redeemed'}
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="my-4 overflow-y-auto max-h-[320px] pr-1 flex flex-col gap-2.5 no-scrollbar flex-1">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400 my-auto flex flex-col items-center justify-center gap-3">
                <ShoppingCart className="w-12 h-12 mx-auto mb-1 opacity-30 text-slate-500" />
                <p className="text-xs font-medium text-slate-500">{isAr ? 'سلة المبيعات فارغة، انقر على الأصناف لإضافتها' : 'Cart is empty. Click catalog items to add.'}</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuickSaleNameAr('');
                    setQuickSaleNameEn('');
                    setQuickSalePrice('');
                    setQuickSaleQty(1);
                    setIsQuickSaleModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer mt-1 border border-amber-300/30"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-200 stroke-white animate-pulse" />
                  <span>{isAr ? '⚡ أو أضف بند مبيع سريع مباشر' : '⚡ Add Quick Sale Line Item'}</span>
                </button>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="p-3 rounded-2xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    {item.product.imageUrl && (
                      <img src={item.product.imageUrl} alt={item.product.nameEn} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                    )}
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

      {/* Quick Sale Modal (One-Time Custom Price Line Item Without Inventory Registration) */}
      {isQuickSaleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl border border-white rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-md shadow-amber-500/25">
                  <Zap className="w-6 h-6 fill-amber-200 stroke-white animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                    <span>{isAr ? '⚡ بيع سريع / بند حر (سعر مخصص)' : '⚡ Quick Sale / Custom Price Item'}</span>
                  </h3>
                  <p className="text-xs text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 inline-block mt-1 shadow-2xs">
                    {isAr ? 'يُضاف مباشرة لسلة الفاتورة الحالية دون الحاجة لتسجيله في المخزون' : 'One-time entry: adds directly to cart without inventory registration'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickSaleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Ready Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{isAr ? 'أصناف وخدمات سريعة جاهزة (اضغط للاختيار السريع):' : 'Quick Ready Presets (Tap to fill):'}</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { ar: '🍔 وجبة / صنف سريع', en: 'Quick Meal/Item', price: '50', cat: 'أصناف وخدمات مخصصة' },
                  { ar: '☕ مشروب / إضافة', en: 'Drink / Add-on', price: '20', cat: 'أصناف وخدمات مخصصة' },
                  { ar: '🛵 رسوم توصيل / شحن', en: 'Delivery Fee', price: '30', cat: 'خدمات التوصيل' },
                  { ar: '🛠️ رسوم خدمة / صيانة', en: 'Service / Installation', price: '150', cat: 'أصناف وخدمات مخصصة' },
                  { ar: '🎁 تغليف هدايا خاص', en: 'Special Gift Wrapping', price: '25', cat: 'أصناف وخدمات مخصصة' },
                  { ar: '📦 منتج غير مسجل', en: 'Unregistered Misc Item', price: '100', cat: 'أصناف وخدمات مخصصة' },
                  { ar: '⚡ تسوية أو فارق سعر', en: 'Price Adjustment / Fee', price: '10', cat: 'أصناف وخدمات مخصصة' },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuickSaleNameAr(preset.ar);
                      setQuickSaleNameEn(preset.en);
                      if (!quickSalePrice) setQuickSalePrice(preset.price);
                      setQuickSaleCategory(preset.cat);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 hover:text-amber-950 text-slate-700 text-xs font-bold transition border border-slate-200/60 hover:border-amber-300 cursor-pointer flex items-center gap-1 scale-[0.99] hover:scale-105"
                  >
                    <span>{isAr ? preset.ar : preset.en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={(e) => { e.preventDefault(); handleAddQuickSale(false); }} className="flex flex-col gap-4 mt-1">
              {/* Item Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'وصف أو اسم البند (بالعربية) *' : 'Item Description (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'مثال: وجبة خاصة / توصيل...' : 'e.g. Custom service / Fee'}
                    value={quickSaleNameAr}
                    onChange={(e) => setQuickSaleNameAr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'وصف أو اسم البند (بالإنجليزية)' : 'Item Description (English)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Custom Item / Extra Charge"
                    value={quickSaleNameEn}
                    onChange={(e) => setQuickSaleNameEn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Price & Quick Tap Amount Buttons */}
              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 flex flex-col gap-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-amber-950 flex items-center gap-1">
                    <span>💰</span>
                    <span>{isAr ? `سعر البيع المخصص (${settings.currency}) *` : `Custom Selling Price (${settings.currency}) *`}</span>
                  </label>
                  {quickSalePrice && (
                    <button
                      type="button"
                      onClick={() => setQuickSalePrice('')}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-extrabold underline cursor-pointer"
                    >
                      {isAr ? '✕ تصفير المبلغ' : '✕ Clear Amount'}
                    </button>
                  )}
                </div>
                
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={quickSalePrice}
                  onChange={(e) => setQuickSalePrice(e.target.value)}
                  className="w-full bg-white border-2 border-amber-400 rounded-2xl py-3 px-4 text-xl font-black text-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-200 transition text-center shadow-inner"
                />

                {/* Quick Add Buttons */}
                <div>
                  <div className="text-[10px] font-bold text-amber-800 mb-1">{isAr ? '⚡ إضافة سريعة للمبلغ (اضغط للزيادة):' : '⚡ Quick Amount Tap (Tap to add):'}</div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {[5, 10, 20, 50, 100, 200, 500, 1000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          const curr = parseFloat(quickSalePrice) || 0;
                          setQuickSalePrice((curr + val).toString());
                        }}
                        className="py-1.5 px-1 bg-white hover:bg-amber-500 hover:text-white text-amber-900 rounded-xl font-black text-xs border border-amber-300 shadow-2xs transition active:scale-90 cursor-pointer"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quantity & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Quantity */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isAr ? 'الكمية المطلوبة (Quantity)' : 'Quantity'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickSaleQty(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 bg-white border border-slate-300 rounded-xl font-black text-lg text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quickSaleQty}
                      onChange={(e) => setQuickSaleQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-slate-300 rounded-xl py-2 px-2 text-center text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setQuickSaleQty(prev => prev + 1)}
                      className="w-10 h-10 bg-white border border-slate-300 rounded-xl font-black text-lg text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex justify-center gap-1.5 mt-2">
                    {[1, 2, 3, 5, 10].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuickSaleQty(q)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          quickSaleQty === q ? 'bg-amber-500 text-white border-amber-600 shadow-2xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        x{q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isAr ? 'التصنيف / المجموعة (اختياري)' : 'Category (Optional)'}
                    </label>
                    <select
                      value={quickSaleCategory}
                      onChange={(e) => setQuickSaleCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="أصناف وخدمات مخصصة">⚡ {isAr ? 'أصناف وخدمات مخصصة / عام' : 'Custom Items & Services'}</option>
                      {categories.filter(c => c !== 'all' && c !== 'أصناف وخدمات مخصصة').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-[11px] text-slate-600 font-semibold mt-2 flex items-center gap-1 bg-white p-2 rounded-xl border border-slate-200/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{isAr ? 'لن يُضاف هذا الصنف لقائمة المخزون الدائمة' : 'Will not pollute inventory records'}</span>
                  </div>
                </div>
              </div>

              {/* Total Preview Box */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl flex items-center justify-between shadow-md border border-indigo-500/20">
                <div>
                  <div className="text-xs text-slate-300 font-medium">{isAr ? 'إجمالي قيمة البند الحر:' : 'Total Custom Line Item:'}</div>
                  <div className="text-[11px] text-amber-300 font-mono">
                    ({quickSaleQty} x {parseFloat(quickSalePrice) || 0} {settings.currency})
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-400">
                  {Math.round(((parseFloat(quickSalePrice) || 0) * quickSaleQty) * 100) / 100} <span className="text-sm font-normal text-white">{settings.currency}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/80">
                <button
                  type="submit"
                  className="py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>{isAr ? '➕ إضافة لسلة الفاتورة' : '➕ Add to Cart'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickSale(true)}
                  className="py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-5 h-5 fill-emerald-200 stroke-white animate-pulse" />
                  <span>{isAr ? '⚡ إضافة ودفع فوري (كاش)' : '⚡ Add & Instant Pay'}</span>
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

      {/* POS QUICK REFUND / RETURN MODAL */}
      {showPosRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0f172a] border-2 border-amber-500/50 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl flex flex-col gap-5 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 text-2xl font-black">
                  🔄
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">
                    {isAr ? 'استرجاع أو استبدال فاتورة من نقطة البيع (POS Return / Refund)' : 'Quick POS Return / Refund'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'ابحث برقم الفاتورة أو اختر من آخر المبيعات لاسترجاع الأصناف للمخزون فوراً' : 'Search invoice # or select from recent sales to restock instantly'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPosRefundModal(false);
                  setSelectedPosRefundInvoice(null);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Search or Select Invoice */}
            {!selectedPosRefundInvoice ? (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isAr ? 'ابحث برقم الفاتورة (مثال: INV-...) أو اسم العميل أو الكاشير...' : 'Search by invoice #, customer or cashier...'}
                    value={posRefundSearch}
                    onChange={(e) => setPosRefundSearch(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 focus:border-amber-500 rounded-2xl py-3.5 px-11 text-sm font-bold text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
                  />
                  <Search className="w-5 h-5 text-amber-400 absolute left-3.5 rtl:right-3.5 rtl:left-auto top-3.5" />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-black text-amber-300 flex items-center justify-between px-1">
                    <span>{isAr ? '📋 الفواتير المؤهلة للاسترجاع (أحدث المبيعات):' : '📋 Eligible Invoices (Recent Sales):'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{isAr ? 'اضغط على الفاتورة لاختيارها' : 'Click invoice to select'}</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {(sales || [])
                      .filter(s => (s.status === 'completed' || s.status === 'partial_refund') && (
                        !posRefundSearch ||
                        s.invoiceNumber.toLowerCase().includes(posRefundSearch.toLowerCase()) ||
                        (s.customerName && s.customerName.toLowerCase().includes(posRefundSearch.toLowerCase())) ||
                        s.cashierName.toLowerCase().includes(posRefundSearch.toLowerCase()) ||
                        s.items.some(it => it.productNameAr.toLowerCase().includes(posRefundSearch.toLowerCase()) || it.productNameEn.toLowerCase().includes(posRefundSearch.toLowerCase()))
                      ))
                      .slice(0, 15)
                      .map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => {
                            setSelectedPosRefundInvoice(inv);
                            const initQ: Record<string, number> = {};
                            inv.items.forEach((it, idx) => {
                              initQ[`${it.productId}-${idx}`] = Math.min(1, it.quantity);
                            });
                            setPosRefundQty(initQ);
                            setPosRefundReason(isAr ? 'استرجاع مباشر من الكاشير' : 'POS Cashier Return');
                          }}
                          className="bg-slate-900/80 hover:bg-slate-800/90 p-3.5 rounded-2xl border border-slate-800 hover:border-amber-500/50 cursor-pointer transition flex items-center justify-between gap-3 group"
                        >
                          <div>
                            <div className="font-mono font-black text-amber-400 text-sm flex items-center gap-2">
                              <span>{inv.invoiceNumber}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-sans font-bold">
                                {new Date(inv.date).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-xs text-slate-300 font-bold mt-1">
                              {isAr ? 'العميل:' : 'Customer:'} {inv.customerName || (isAr ? 'عميل عام' : 'General Customer')} | {isAr ? 'الأصناف:' : 'Items:'} {inv.items.length}
                            </div>
                          </div>
                          <div className="text-left rtl:text-right">
                            <div className="font-mono font-black text-emerald-400 text-base">
                              {inv.grandTotal} {settings.currency}
                            </div>
                            <div className="text-[10px] text-amber-300 font-bold group-hover:underline">
                              {isAr ? 'اختيار للاسترجاع ⬅️' : 'Select to refund ➡️'}
                            </div>
                          </div>
                        </div>
                      ))}
                    {(sales || []).filter(s => s.status === 'completed' || s.status === 'partial_refund').length === 0 && (
                      <div className="text-center py-10 text-slate-500 text-sm font-bold bg-slate-900/40 rounded-2xl border border-slate-800">
                        {isAr ? 'لا توجد فواتير مبيعات مكتملة متاحة للاسترجاع حالياً' : 'No completed sales invoices available for refund'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Select Quantities & Confirm Refund */
              <div className="space-y-4">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">{isAr ? 'الفاتورة المحددة:' : 'Selected Invoice:'}</div>
                    <div className="font-mono font-black text-amber-400 text-base">{selectedPosRefundInvoice.invoiceNumber}</div>
                    <div className="text-xs text-slate-300 font-bold mt-0.5">{selectedPosRefundInvoice.customerName || (isAr ? 'عميل عام' : 'General Customer')}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPosRefundInvoice(null)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 font-bold"
                  >
                    {isAr ? '🔄 تغيير الفاتورة' : '🔄 Change Invoice'}
                  </button>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2.5 max-h-56 overflow-y-auto">
                  <div className="text-xs text-amber-300 font-extrabold pb-2 border-b border-slate-800 flex items-center justify-between">
                    <span>📦 {isAr ? 'حدد الكمية التي ارجعها العميل (سيتم إعادتها للمخزون):' : 'Select quantities returned by customer:'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const initQ: Record<string, number> = {};
                        selectedPosRefundInvoice.items.forEach((it, i) => initQ[`${it.productId}-${i}`] = it.quantity);
                        setPosRefundQty(initQ);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white text-[10px] border border-amber-500/30 font-bold transition"
                    >
                      {isAr ? '⚡ استرجاع كل الأصناف' : '⚡ Refund All Items'}
                    </button>
                  </div>

                  {selectedPosRefundInvoice.items.map((item, idx) => {
                    const key = `${item.productId}-${idx}`;
                    const currentQ = posRefundQty[key] || 0;
                    return (
                      <div key={idx} className="flex items-center justify-between gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                        <div className="text-xs text-slate-200 truncate max-w-[240px]">
                          <span className="font-extrabold block text-sm">{idx + 1}. {isAr ? item.productNameAr : item.productNameEn}</span>
                          <span className="text-slate-400 text-[11px] block mt-0.5">
                            {isAr ? 'السعر:' : 'Price:'} <strong className="text-white">{item.unitPrice}</strong> {settings.currency} | {isAr ? 'المباع بالفاتورة:' : 'Sold:'} <strong className="text-amber-400">{item.quantity}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPosRefundQty({ ...posRefundQty, [key]: Math.max(0, currentQ - 1) })}
                            className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black flex items-center justify-center text-base shadow-sm"
                          >-</button>
                          <span className="w-10 text-center font-mono font-black text-sm text-amber-400 bg-black/40 py-1 rounded-lg border border-slate-700">
                            {currentQ}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPosRefundQty({ ...posRefundQty, [key]: Math.min(item.quantity, currentQ + 1) })}
                            className="w-8 h-8 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black flex items-center justify-center text-base shadow-sm"
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-300">{isAr ? '💰 إجمالي المبلغ المسترجع للعميل:' : '💰 Total Refund Amount to Customer:'}</span>
                  <span className="font-mono font-black text-xl text-emerald-400">
                    {selectedPosRefundInvoice.items.reduce((acc, it, idx) => acc + (it.unitPrice * (posRefundQty[`${it.productId}-${idx}`] || 0)), 0)} {settings.currency}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold block">{isAr ? 'سبب الاسترجاع (يظهر بسند الاسترجاع والتقارير):' : 'Reason for Return (Printed on Voucher):'}</label>
                  <input
                    type="text"
                    value={posRefundReason}
                    onChange={(e) => setPosRefundReason(e.target.value)}
                    placeholder={isAr ? 'مثال: استرجاع من الكاشير / رغبة العميل...' : 'e.g., Customer return / Defect...'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPosRefundInvoice(null)}
                    className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition"
                  >
                    {isAr ? 'إلغاء والتراجع' : 'Cancel'}
                  </button>

                  <button
                    type="button"
                    disabled={isPosRefunding}
                    onClick={async () => {
                      if (!onUpdateInvoiceStatus) {
                        alert(isAr ? 'خدمة تحديث الفواتير غير متصلة' : 'Invoice update service disconnected');
                        return;
                      }
                      let totalRefund = 0;
                      let hasSelected = false;
                      const refundedItemsList: SaleInvoice['refundedItems'] = [];
                      selectedPosRefundInvoice.items.forEach((item, idx) => {
                        const q = posRefundQty[`${item.productId}-${idx}`] || 0;
                        if (q > 0) {
                          hasSelected = true;
                          const rPrice = item.unitPrice * q;
                          totalRefund += rPrice;
                          refundedItemsList.push({
                            productId: item.productId,
                            barcode: item.barcode,
                            productNameAr: item.productNameAr,
                            productNameEn: item.productNameEn,
                            quantity: q,
                            refundPrice: rPrice
                          });
                        }
                      });
                      if (!hasSelected) {
                        alert(isAr ? 'يرجى تحديد كمية صنف واحد على الأقل للاسترجاع!' : 'Please select at least 1 item quantity to refund!');
                        return;
                      }

                      setIsPosRefunding(true);
                      const isFullRefund = totalRefund >= selectedPosRefundInvoice.grandTotal;
                      const newStatus: SaleInvoice['status'] = isFullRefund ? 'refunded' : 'partial_refund';
                      const updates: Partial<SaleInvoice> = {
                        status: newStatus,
                        cancelledReason: posRefundReason.trim() || (isAr ? 'استرجاع مباشر من الكاشير' : 'POS Cashier Return'),
                        cancelledBy: isAr ? 'الكاشير (POS)' : 'Cashier (POS)',
                        refundedAmount: totalRefund,
                        refundedItems: refundedItemsList,
                        notes: `${selectedPosRefundInvoice.notes || ''}\n[استرجاع فوري كاشير بمبلغ ${totalRefund} ${settings.currency} - السبب: ${posRefundReason.trim()}]`
                      };

                      const success = await onUpdateInvoiceStatus(selectedPosRefundInvoice.id, updates);
                      setIsPosRefunding(false);
                      if (success) {
                        alert(
                          isAr
                            ? `✅ تم استرجاع الفاتورة رقم ${selectedPosRefundInvoice.invoiceNumber} بنجاح! تم تحديث رصيد المخزون وإصدار سند الاسترجاع.`
                            : `✅ Invoice #${selectedPosRefundInvoice.invoiceNumber} refunded successfully! Stock restored.`
                        );
                        setShowPosRefundModal(false);
                        setSelectedPosRefundInvoice(null);
                        onRefreshProducts();
                      }
                    }}
                    className="flex-[2] py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className={`w-4 h-4 ${isPosRefunding ? 'animate-spin' : ''}`} />
                    <span>
                      {isPosRefunding
                        ? (isAr ? 'جاري تنفيذ الاسترجاع...' : 'Processing Refund...')
                        : (isAr ? '✅ تأكيد استرجاع الأصناف للمخزون والطباعة' : '✅ Confirm Refund & Restock Inventory')}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
