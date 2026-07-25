/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, Plus, Search, AlertTriangle, Edit, Trash2, Check, RefreshCw, Filter, ArrowUpDown, Layers, Camera, Upload, Image as ImageIcon, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, SystemSettings, Language } from '../types';
import { CategoryIconModal } from './CategoryIconModal';
import JsBarcode from 'jsbarcode';

interface JsBarcodeRendererProps {
  value: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
  fontSize?: number;
  format?: string;
  className?: string;
}

const JsBarcodeRenderer: React.FC<JsBarcodeRendererProps> = ({
  value,
  height = 40,
  width = 1.5,
  displayValue = false,
  fontSize = 12,
  format = 'CODE128',
  className = ''
}) => {
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    if (!svgRef.current) return;
    const cleanVal = (value || '00000000').toString().trim();
    if (!cleanVal) return;

    try {
      JsBarcode(svgRef.current, cleanVal, {
        format: (format || 'CODE128') as any,
        width: width,
        height: height,
        displayValue: displayValue,
        fontSize: fontSize,
        margin: 0,
        background: 'transparent',
        lineColor: '#000000'
      });
    } catch (err) {
      try {
        const fallbackVal = cleanVal.replace(/[^a-zA-Z0-9.\-$+/]/g, '') || '12345678';
        JsBarcode(svgRef.current, fallbackVal, {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          margin: 0,
          background: 'transparent',
          lineColor: '#000000'
        });
      } catch (e) {
        console.error('JsBarcode render failed:', e);
      }
    }
  }, [value, height, width, displayValue, fontSize, format]);

  return <svg ref={svgRef} className={`max-w-full h-auto ${className}`} />;
};

const PLACEHOLDER_IMAGES = [
  { labelAr: 'مشروبات وقهوة ☕', labelEn: 'Beverages & Coffee ☕', url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=300&q=80' },
  { labelAr: 'عصائر طازجة 🧃', labelEn: 'Fresh Juice 🧃', url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=300&q=80' },
  { labelAr: 'حلويات وسناكس 🍫', labelEn: 'Snacks & Sweets 🍫', url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=300&q=80' },
  { labelAr: 'معجنات ومخبوزات 🥐', labelEn: 'Bakery & Pastry 🥐', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80' },
  { labelAr: 'فواكه وخضروات 🍎', labelEn: 'Fruits & Veggies 🍎', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80' },
  { labelAr: 'وجبات سريعة 🍔', labelEn: 'Fast Food & Burgers 🍔', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80' },
  { labelAr: 'مواد غذائية وبقالة 🛒', labelEn: 'Grocery Staples 🛒', url: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=300&q=80' },
  { labelAr: 'مواد تنظيف وعناية 🧼', labelEn: 'Cleaning Supplies 🧼', url: 'https://images.unsplash.com/photo-1585816830744-f859a7210dfa?auto=format&fit=crop&w=300&q=80' },
  { labelAr: 'إلكترونيات وصيانة 📱', labelEn: 'Electronics & Tech 📱', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80' },
  { labelAr: 'عطور ومستحضرات 🌸', labelEn: 'Cosmetics & Beauty 🌸', url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=300&q=80' },
  { labelAr: 'صندوق منتج (أوفلاين) 📦', labelEn: 'Box Preset (Offline) 📦', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package" style="background:%236366f1;color:white;padding:20px;"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>' },
  { labelAr: 'حقيبة تسوق (أوفلاين) 🛍️', labelEn: 'Shopping Bag (Offline) 🛍️', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-bag" style="background:%2310b981;color:white;padding:20px;"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' }
];

interface InventoryManagerProps {
  products: Product[];
  settings: SystemSettings;
  lang: Language;
  userRole?: 'admin' | 'cashier';
  onSaveProduct: (product: Product) => Promise<boolean>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onUpdateSettings?: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  settings,
  lang,
  userRole,
  onSaveProduct,
  onDeleteProduct,
  onUpdateSettings
}) => {
  const isAr = lang === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [customLowStockThreshold, setCustomLowStockThreshold] = useState<number>(10);
  
  // Modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Barcode Studio Modal state (Accessible to both Admin and Cashier as requested)
  const [isBarcodeStudioOpen, setIsBarcodeStudioOpen] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState<'existing' | 'new' | 'sku'>('existing');
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<Product | null>(null);
  const [barcodeLabelCount, setBarcodeLabelCount] = useState<number>(12);
  const [labelStyle, setLabelStyle] = useState<'sticker' | 'shelf'>('sticker');
  const [barcodeFormat, setBarcodeFormat] = useState<string>('CODE128');
  const [customBarcodeVal, setCustomBarcodeVal] = useState<string>('');
  const [skuInputVal, setSkuInputVal] = useState<string>('');
  const [skuBarcodeRule, setSkuBarcodeRule] = useState<'exact_sku' | 'numeric_ean'>('numeric_ean');

  // New Product quick creation from Barcode Studio
  const [newBarcodeNameAr, setNewBarcodeNameAr] = useState('');
  const [newBarcodeNameEn, setNewBarcodeNameEn] = useState('');
  const [newBarcodeCategory, setNewBarcodeCategory] = useState('مواد غذائية');
  const [newBarcodePrice, setNewBarcodePrice] = useState<number>(15);
  const [newBarcodeCost, setNewBarcodeCost] = useState<number>(10);
  const [newBarcodeStock, setNewBarcodeStock] = useState<number>(50);
  const [generatedNewBarcode, setGeneratedNewBarcode] = useState(`6281001${Math.floor(10000 + Math.random() * 90000)}`);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Camera & Image state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraActive && isModalOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.error('Camera access error:', err);
          setCameraError(isAr ? 'تعذر الوصول إلى الكاميرا. تأكد من وجود كاميرا ومنح الصلاحيات في المتصفح.' : 'Unable to access camera. Please check browser permissions.');
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isCameraActive, isModalOpen, isAr]);

  useEffect(() => {
    if (!isModalOpen && isCameraActive) {
      stopCamera();
    }
  }, [isModalOpen]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 300;
      canvas.height = videoRef.current.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (editingProduct) {
          setEditingProduct({ ...editingProduct, imageUrl: dataUrl });
        }
      }
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result && typeof reader.result === 'string' && editingProduct) {
          setEditingProduct({ ...editingProduct, imageUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getSkuGeneratedBarcode = (skuStr: string, rule: 'exact_sku' | 'numeric_ean'): string => {
    if (!skuStr) return '2000000000';
    if (rule === 'exact_sku') {
      return skuStr;
    }
    let digits = skuStr.replace(/\D/g, '');
    if (!digits) {
      let hash = 0;
      for (let i = 0; i < skuStr.length; i++) hash = (hash * 31 + skuStr.charCodeAt(i)) % 999999;
      digits = Math.abs(hash).toString();
    }
    return `200${digits.padStart(7, '0').slice(0, 9)}`;
  };

  const renderBarcodeBars = (code: string, customHeight: number = 40, customWidth: number = 1.5) => {
    return <JsBarcodeRenderer value={code} height={customHeight} width={customWidth} format={barcodeFormat} />;
  };

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
    if (editingProduct) {
      setEditingProduct({ ...editingProduct, category: newCat });
    }
    setNewBarcodeCategory(newCat);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch = searchTerm === '' || 
        p.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const isLow = p.stock <= customLowStockThreshold || p.stock <= p.minStock;
      const matchStock = !filterLowStock || isLow;
      return matchCat && matchSearch && matchStock;
    });
  }, [products, selectedCategory, searchTerm, filterLowStock, customLowStockThreshold]);

  // Export Current Product List as CSV for external reporting
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      alert(isAr ? 'لا توجد منتجات حالياً للتصدير.' : 'No products available to export.');
      return;
    }

    const headers = [
      isAr ? 'رمز الصنف (SKU)' : 'SKU',
      isAr ? 'الباركود' : 'Barcode',
      isAr ? 'الاسم بالعربي' : 'Name (Ar)',
      isAr ? 'الاسم بالإنجليزي' : 'Name (En)',
      isAr ? 'التصنيف' : 'Category',
      isAr ? 'الوحدة' : 'Unit',
      isAr ? 'المخزون الحالي' : 'Stock',
      isAr ? 'حد التنبيه' : 'Min Stock Alert',
      isAr ? `سعر التكلفة (${settings.currency})` : `Cost Price (${settings.currency})`,
      isAr ? `سعر البيع (${settings.currency})` : `Selling Price (${settings.currency})`,
      isAr ? 'هامش الربح (%)' : 'Profit Margin (%)',
      isAr ? `إجمالي القيمة بالتكلفة (${settings.currency})` : `Total Value at Cost (${settings.currency})`,
      isAr ? `إجمالي القيمة بالبيع (${settings.currency})` : `Total Value at Selling (${settings.currency})`,
      isAr ? 'سياسة الاسترجاع' : 'Return Policy',
      isAr ? 'تاريخ آخر تحديث' : 'Last Updated'
    ];

    const formatCell = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = filteredProducts.map(p => {
      const unitLabel = p.unit === 'piece' ? (isAr ? 'قطعة' : 'Piece') :
                        p.unit === 'kg' ? (isAr ? 'كيلو' : 'Kg') :
                        p.unit === 'box' ? (isAr ? 'صندوق' : 'Box') : (isAr ? 'متر' : 'Meter');
      const totalCost = (p.costPrice || 0) * (p.stock || 0);
      const totalSelling = (p.sellingPrice || 0) * (p.stock || 0);
      const margin = p.sellingPrice > 0 ? (((p.sellingPrice - (p.costPrice || 0)) / p.sellingPrice) * 100).toFixed(1) + '%' : '0%';
      const updatedDate = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US') : '';

      return [
        formatCell(p.sku || ''),
        formatCell(p.barcode || ''),
        formatCell(p.nameAr || ''),
        formatCell(p.nameEn || ''),
        formatCell(p.category || ''),
        formatCell(unitLabel),
        formatCell(p.stock || 0),
        formatCell(p.minStock || 0),
        formatCell(p.costPrice || 0),
        formatCell(p.sellingPrice || 0),
        formatCell(margin),
        formatCell(totalCost.toFixed(2)),
        formatCell(totalSelling.toFixed(2)),
        formatCell(p.returnPolicy || ''),
        formatCell(updatedDate)
      ].join(',');
    });

    const csvContent = [headers.map(formatCell).join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = isAr ? `تقرير_المخزون_${dateStr}.csv` : `Inventory_Report_${dateStr}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewModal = () => {
    if (userRole !== 'admin') {
      alert(isAr ? 'عفواً! إضافة المنتجات مخصصة للمدير فقط.' : 'Access Denied! Adding products is restricted to Admins.');
      return;
    }
    const autoSku = `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    setEditingProduct({
      id: '',
      sku: autoSku,
      nameAr: '',
      nameEn: '',
      barcode: `6281001${Math.floor(10000 + Math.random() * 90000)}`,
      category: 'مواد غذائية',
      costPrice: 10,
      sellingPrice: 20,
      stock: 50,
      minStock: 10,
      unit: 'piece',
      returnPolicy: '7_days',
      updatedAt: new Date().toISOString()
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert(isAr ? 'عفواً! تعديل المنتجات مخصص للمدير فقط.' : 'Access Denied! Editing products is restricted to Admins.');
      return;
    }
    if (!editingProduct) return;
    if (!editingProduct.nameAr || !editingProduct.barcode) {
      alert(isAr ? 'يرجى كتابة الاسم والباركود!' : 'Please enter Name and Barcode!');
      return;
    }
    setIsSaving(true);
    try {
      const success = await onSaveProduct(editingProduct);
      if (success) {
        setIsModalOpen(false);
        setEditingProduct(null);
      }
    } catch (err: any) {
      alert(err.message || (isAr ? 'خطأ في حفظ الصنف' : 'Error saving product'));
    } finally {
      setIsSaving(false);
    }
  };

  const quickStockAdjust = async (product: Product, delta: number) => {
    if (userRole !== 'admin') {
      alert(isAr ? 'عفواً! تعديل المخزون مخصص للمدير فقط.' : 'Access Denied! Stock modification is restricted to Admins.');
      return;
    }
    const updated = { ...product, stock: Math.max(0, product.stock + delta) };
    await onSaveProduct(updated);
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {userRole !== 'admin' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900 font-bold shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{isAr ? 'وضع البائع (الكاشير): صلاحيتك تقتصر على عرض المخزون والبحث في الأصناف فقط. أزرار الإضافة والتعديل والحذف مخصصة للمدير.' : 'Cashier Mode: Read-only access to view and search inventory. Add, edit, and delete actions require Admin privileges.'}</span>
          </div>
        </div>
      )}
      {/* Header Controls */}
      <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-indigo-600" />
            <span>{isAr ? 'إدارة المخزون والمنتجات' : 'Inventory & Product Management'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isAr ? `إجمالي الأصناف بالمستودع: ${products.length} صنف` : `Total warehouse catalog items: ${products.length}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* User-Defined Low Stock Threshold Selector */}
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{isAr ? 'حد تنبيه النواقص:' : 'Alert Threshold:'}</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="10000"
                value={customLowStockThreshold}
                onChange={(e) => setCustomLowStockThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-xl text-center font-black text-xs text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title={isAr ? 'حدد الكمية التي يعتبر الصنف دونها منخفض المخزون' : 'Set stock quantity threshold for low stock alert'}
              />
              <span className="text-[11px] font-bold text-slate-500">{isAr ? 'قطعة' : 'qty'}</span>
            </div>
            {/* Quick preset buttons */}
            <div className="flex items-center gap-1 ml-1 rtl:mr-1 rtl:ml-0 border-l rtl:border-l-0 rtl:border-r border-slate-200 pl-1 rtl:pr-1 rtl:pl-0">
              {[5, 10, 20].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCustomLowStockThreshold(val)}
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                    customLowStockThreshold === val
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                  title={isAr ? `تعيين الحد على ≤ ${val}` : `Set threshold to ≤ ${val}`}
                >
                  ≤{val}
                </button>
              ))}
            </div>
          </div>

          {/* Low Stock Filter Toggle */}
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              filterLowStock 
                ? 'bg-amber-500 text-white border border-amber-600 shadow-md' 
                : 'bg-white/60 hover:bg-white/80 text-slate-700 border border-white/80 shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${filterLowStock ? 'text-white animate-bounce' : 'text-amber-600'}`} />
            <span>{isAr ? 'نواقص المخزون فقط' : 'Low Stock Only'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              filterLowStock ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-800'
            }`}>
              {products.filter(p => p.stock <= customLowStockThreshold || p.stock <= p.minStock).length}
            </span>
          </button>

          {/* Barcode Studio Button - Accessible to BOTH Admin and Cashier as requested */}
          <button
            onClick={() => {
              setSelectedBarcodeProduct(products[0] || null);
              setCustomBarcodeVal(products[0]?.barcode || '');
              setBarcodeMode('existing');
              setIsBarcodeStudioOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-purple-200 border border-purple-500 transition transform active:scale-95"
          >
            <Package className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span>{isAr ? '🏷️ عمل الباركود للأصناف (جديد / قديم)' : '🏷️ Barcode Studio (New / Old)'}</span>
          </button>

          {/* Export CSV Report Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-200 border border-emerald-500 transition transform active:scale-95 cursor-pointer"
            title={isAr ? 'تصدير قائمة المنتجات المعروضة كملف CSV للتقارير الخارجية (متوافق مع Excel)' : 'Export current product list as a CSV file for external reporting (Excel compatible)'}
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>{isAr ? '📊 تصدير CSV (Excel)' : '📊 Export CSV'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-700/80 text-emerald-100">
              {filteredProducts.length}
            </span>
          </button>

          {/* Add New Product - Admin Only */}
          {userRole === 'admin' && (
            <button
              onClick={handleOpenNewModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-200 border border-indigo-500 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة صنف جديد' : 'Add New Product'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-8 relative">
          <Search className="absolute top-3.5 left-3.5 w-4 h-4 text-slate-400 rtl:right-3.5 rtl:left-auto" />
          <input
            type="text"
            placeholder={isAr ? 'ابحث في المخزون بالاسم أو الباركود...' : 'Search inventory by name or barcode...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/60 border border-white/80 rounded-2xl py-2.5 px-10 text-sm text-slate-800 placeholder-slate-400 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Filter className="absolute top-3.5 left-3.5 w-4 h-4 text-slate-400 rtl:right-3.5 rtl:left-auto pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white/60 border border-white/80 rounded-2xl py-2.5 px-10 text-sm text-slate-800 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-indigo-400 transition appearance-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? (isAr ? '📁 كل التصنيفات' : '📁 All Categories') : cat}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            title={isAr ? 'إضافة أيقونة ومجموعة أصناف جديدة' : 'Add Category Group / Icon'}
            className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl shadow-md transition transform active:scale-95 flex items-center gap-1 cursor-pointer flex-shrink-0"
          >
            <Layers className="w-4 h-4" />
            <span className="text-xs font-bold hidden xl:inline">{isAr ? '+ أيقونة' : '+ Icon'}</span>
          </button>
        </div>
      </div>

      {/* Inventory Table (Soft Glass Card Table) */}
      <div className="bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-sm">
            <thead className="bg-white/60 text-slate-500 text-xs uppercase border-b border-slate-200/60 font-bold">
              <tr>
                <th className="py-4 px-4 font-bold">{isAr ? 'الصنف / الباركود' : 'Product / Barcode'}</th>
                <th className="py-4 px-4 font-bold">{isAr ? 'التصنيف' : 'Category'}</th>
                <th className="py-4 px-4 text-center font-bold">{isAr ? 'التكلفة' : 'Cost'}</th>
                <th className="py-4 px-4 text-center font-bold">{isAr ? 'سعر البيع' : 'Selling Price'}</th>
                <th className="py-4 px-4 text-center font-bold">{isAr ? 'هامش الربح' : 'Margin'}</th>
                <th className="py-4 px-4 text-center font-bold">{isAr ? 'المخزون والحد الأدنى' : 'Stock & Threshold'}</th>
                <th className="py-4 px-4 text-center font-bold">{isAr ? 'الباركود والملصقات' : 'Barcode & Labels'}</th>
                {userRole === 'admin' && (
                  <>
                    <th className="py-4 px-4 text-center font-bold">{isAr ? 'تعديل سريع' : 'Quick Adjust'}</th>
                    <th className="py-4 px-4 text-center font-bold">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'admin' ? 9 : 7} className="py-16 text-center text-slate-500 font-medium">
                    {isAr ? 'لا توجد أصناف مطابقة للبحث' : 'No inventory items match current filter'}
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                {filteredProducts.map(prod => {
                  const margin = prod.sellingPrice - prod.costPrice;
                  const marginPercent = Math.round((margin / prod.sellingPrice) * 100) || 0;
                  const isLow = prod.stock <= customLowStockThreshold || prod.stock <= prod.minStock;

                  return (
                    <motion.tr layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} key={prod.id} className={`transition ${
                      isLow 
                        ? 'bg-amber-50/90 hover:bg-amber-100/90 border-s-4 border-amber-500 shadow-2xs' 
                        : 'hover:bg-white/60'
                    }`}>
                      {/* Name & Barcode */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.nameEn} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-lg shrink-0">
                              📦
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-bold text-slate-800">{isAr ? prod.nameAr : prod.nameEn}</div>
                              {isLow && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-xs animate-pulse">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{isAr ? 'مخزون منخفض!' : 'Low Stock!'}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">🏷️ {prod.barcode}</span>
                              {prod.sku && (
                                <span className="text-xs font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">📦 SKU: {prod.sku}</span>
                              )}
                            </div>
                            <div 
                              onClick={() => {
                                setSelectedBarcodeProduct(prod);
                                setCustomBarcodeVal(prod.barcode);
                                setBarcodeMode('existing');
                                setIsBarcodeStudioOpen(true);
                              }}
                              title={isAr ? 'انقر لفتح استوديو الباركود والطباعة' : 'Click to open Barcode Studio & print'}
                              className="mt-1.5 inline-block bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs cursor-pointer hover:border-purple-400 hover:shadow-sm transition group"
                            >
                              <JsBarcodeRenderer value={prod.barcode} height={20} width={1.1} displayValue={false} className="opacity-90 group-hover:opacity-100 max-h-5" />
                            </div>
                            {prod.returnPolicy && prod.returnPolicy !== '7_days' && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                {prod.returnPolicy === 'no_return' ? (isAr ? '🚫 غير قابل للاسترجاع' : '🚫 Non-returnable') :
                                 prod.returnPolicy === 'exchange_only' ? (isAr ? '🔀 استبدال فقط' : '🔀 Exchange only') :
                                 prod.returnPolicy === '14_days' ? (isAr ? '🔄 استرجاع 14 يوم' : '🔄 14 Days return') : `🔄 ${prod.returnPolicy}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-3 py-1 rounded-full bg-white/80 text-slate-700 text-xs border border-white shadow-sm font-semibold">
                          {prod.category}
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-600">
                        {prod.costPrice} <span className="text-xs text-slate-500">{settings.currency}</span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {prod.sellingPrice} <span className="text-xs text-indigo-600">{settings.currency}</span>
                      </td>

                      {/* Margin */}
                      <td className="py-3.5 px-4 text-center font-semibold">
                        <span className="text-emerald-600 font-bold">+{margin} {settings.currency}</span>
                        <span className="block text-[11px] text-slate-500">({marginPercent}%)</span>
                      </td>

                      {/* Stock Level */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition transform ${
                            isLow ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md scale-105 animate-pulse' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-white" />}
                            <span>{prod.stock} {prod.unit === 'kg' ? (isAr ? 'كجم' : 'kg') : (isAr ? 'قطعة' : 'pcs')}</span>
                          </span>
                          {isLow ? (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                              {isAr ? `⚠️ أقل من الحد (≤${customLowStockThreshold})` : `⚠️ Below threshold (≤${customLowStockThreshold})`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 mt-1">{isAr ? 'حد التنبيه:' : 'Min threshold:'} {prod.minStock}</span>
                          )}
                        </div>
                      </td>

                      {/* Barcode Label Button - Available to BOTH Admin and Cashier */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedBarcodeProduct(prod);
                            setCustomBarcodeVal(prod.barcode);
                            setBarcodeMode('existing');
                            setIsBarcodeStudioOpen(true);
                          }}
                          title={isAr ? 'توليد وطباعة ملصقات الباركود لهذا الصنف' : 'Generate & print barcode labels'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black shadow-xs transition transform active:scale-95 whitespace-nowrap"
                        >
                          <Package className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                          <span>{isAr ? '🏷️ الباركود' : '🏷️ Barcode'}</span>
                        </button>
                      </td>

                      {/* Quick Adjust Buttons & Actions - Admin Only */}
                      {userRole === 'admin' && (
                        <>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => quickStockAdjust(prod, 10)}
                                title={isAr ? 'إضافة +10 للمخزون' : 'Add +10 stock'}
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-sm transition"
                              >
                                +10
                              </button>
                              <button
                                onClick={() => quickStockAdjust(prod, -1)}
                                title={isAr ? 'سحب -1 من المخزون' : 'Remove -1 stock'}
                                className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition"
                              >
                                -1
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {confirmDeleteId === prod.id ? (
                                <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-150">
                                  <button
                                    onClick={async () => {
                                      await onDeleteProduct(prod.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition"
                                  >
                                    {isAr ? 'تأكيد الحذف' : 'Confirm'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="p-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingProduct(prod);
                                      setIsModalOpen(true);
                                    }}
                                    className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm transition"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(prod.id)}
                                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-sm transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </motion.tr>
                  );
                })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      <AnimatePresence>
      {isModalOpen && editingProduct && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.form initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} onSubmit={handleSaveForm} className="bg-slate-900 text-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
              <span>{Boolean(editingProduct.id) ? (isAr ? 'تعديل بيانات الصنف' : 'Edit Product') : (isAr ? 'إضافة صنف جديد' : 'Add New Product')}</span>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-sm font-normal">✕</button>
            </h3>

            {/* Arabic & English Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">{isAr ? 'اسم المنتج (عربي):' : 'Product Name (Arabic):'}</label>
                <input
                  type="text"
                  required
                  value={editingProduct.nameAr}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nameAr: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">{isAr ? 'اسم المنتج (إنجليزي):' : 'Product Name (English):'}</label>
                <input
                  type="text"
                  value={editingProduct.nameEn}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nameEn: e.target.value || editingProduct.nameAr })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* SKU, Barcode & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-300 font-semibold">{isAr ? 'الرمز الداخلي (SKU):' : 'Internal SKU:'}</label>
                  <button
                    type="button"
                    onClick={() => {
                      const autoSku = `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
                      setEditingProduct({ ...editingProduct, sku: autoSku });
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold"
                  >
                    🎲 {isAr ? 'توليد' : 'Gen'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: SKU-1001' : 'e.g. SKU-1001'}
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm font-mono uppercase text-amber-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-300 font-semibold">{isAr ? 'الباركود (Barcode):' : 'Barcode:'}</label>
                  <button
                    type="button"
                    onClick={() => {
                      const skuVal = editingProduct.sku;
                      if (skuVal) {
                        let numPart = skuVal.replace(/\D/g, '');
                        if (!numPart || numPart.length < 4) {
                          numPart = Math.floor(1000 + Math.random() * 9000).toString();
                        }
                        const autoBarcode = `200${numPart.padStart(6, '0')}`;
                        setEditingProduct({ ...editingProduct, barcode: autoBarcode });
                      } else {
                        const autoGen = `6281001${Math.floor(10000 + Math.random() * 90000)}`;
                        setEditingProduct({ ...editingProduct, barcode: autoGen });
                      }
                    }}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold"
                    title={isAr ? 'توليد باركود من الـ SKU أو تلقائي' : 'Generate barcode from SKU'}
                  >
                    ⚡ {isAr ? 'من الـ SKU' : 'From SKU'}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editingProduct.barcode}
                  onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-300 font-semibold">{isAr ? 'التصنيف (Category):' : 'Category:'}</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>+ {isAr ? 'أيقونة جديدة' : 'New Icon'}</span>
                  </button>
                </div>
                <select
                  value={editingProduct.category}
                  onChange={(e) => {
                    if (e.target.value === 'NEW_CAT') {
                      setIsCategoryModalOpen(true);
                    } else {
                      setEditingProduct({ ...editingProduct, category: e.target.value });
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {categories.filter(c => c !== 'all').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="NEW_CAT">✨ + {isAr ? 'إضافة مجموعة بأيقونة جديدة...' : 'Add new category icon...'}</option>
                </select>
              </div>
            </div>

            {/* Cost & Selling Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">{isAr ? 'سعر التكلفة (Cost):' : 'Cost Price:'}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingProduct.costPrice}
                  onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">{isAr ? 'سعر البيع (Selling):' : 'Selling Price:'}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingProduct.sellingPrice}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Stock & Min Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">{isAr ? 'المخزون الحالي:' : 'Current Stock:'}</label>
                <input
                  type="number"
                  required
                  value={editingProduct.stock}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">{isAr ? 'حد التنبيه (Min):' : 'Min Threshold:'}</label>
                <input
                  type="number"
                  required
                  value={editingProduct.minStock}
                  onChange={(e) => setEditingProduct({ ...editingProduct, minStock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-amber-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">{isAr ? 'وحدة القياس:' : 'Unit:'}</label>
                <select
                  value={editingProduct.unit}
                  onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="piece">{isAr ? 'قطعة (Piece)' : 'Piece'}</option>
                  <option value="kg">{isAr ? 'كيلوجرام (Kg)' : 'Kg'}</option>
                  <option value="box">{isAr ? 'كرتونة / علبة (Box)' : 'Box'}</option>
                </select>
              </div>
            </div>

            {/* Return Policy for Product */}
            <div className="mt-3">
              <label className="text-xs text-purple-300 font-semibold block mb-1">{isAr ? '🔄 سياسة الارجاع والاستبدال لهذا الصنف:' : '🔄 Item Return Policy:'}</label>
              <select
                value={editingProduct.returnPolicy || '7_days'}
                onChange={(e) => setEditingProduct({ ...editingProduct, returnPolicy: e.target.value })}
                className="w-full bg-slate-800 border border-purple-500/40 rounded-xl p-2.5 text-xs text-purple-200 font-bold focus:outline-none focus:border-purple-500"
              >
                <option value="7_days">{isAr ? '🔄 استرجاع واستبدال خلال 7 أيام (افتراضي)' : '🔄 7 Days Return & Exchange (Default)'}</option>
                <option value="14_days">{isAr ? '🔄 استرجاع واستبدال خلال 14 يوم' : '🔄 14 Days Return & Exchange'}</option>
                <option value="exchange_only">{isAr ? '🔀 استبدال فقط خلال 3 أيام' : '🔀 3 Days Exchange Only'}</option>
                <option value="no_return">{isAr ? '🚫 غير قابل للاسترجاع أو الاستبدال (استهلاكي / غذائي)' : '🚫 Non-returnable (Consumable/Food)'}</option>
              </select>
            </div>

            {/* Product Image Selection & Capture Section */}
            <div className="mt-3 p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs text-indigo-300 font-bold flex items-center gap-1.5">
                  <span>{isAr ? '🖼️ صورة المنتج (كاميرا، رفع أو جاهز):' : '🖼️ Product Image (Camera, Upload or Preset):'}</span>
                </label>
                {editingProduct.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ ...editingProduct, imageUrl: undefined })}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-extrabold flex items-center gap-1 bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-800/50 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isAr ? 'حذف الصورة' : 'Remove Image'}</span>
                  </button>
                )}
              </div>

              {/* Current Image Display or Camera Preview */}
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                {isCameraActive ? (
                  <div className="w-full flex flex-col items-center bg-black rounded-xl p-2 border border-slate-600">
                    {cameraError ? (
                      <div className="text-xs text-rose-400 p-4 text-center font-bold">{cameraError}</div>
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full max-h-48 object-contain rounded-lg bg-black"
                      />
                    )}
                    <div className="flex gap-2 mt-2 w-full">
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        disabled={!!cameraError}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{isAr ? 'التقاط الصورة الآن 📸' : 'Snap Photo Now 📸'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {editingProduct.imageUrl ? (
                        <img
                          src={editingProduct.imageUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 w-full flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCameraActive(true);
                          setCameraError(null);
                        }}
                        className="flex-1 min-w-[120px] py-2.5 px-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-indigo-400" />
                        <span>{isAr ? 'كاميرا الجهاز 📷' : 'Camera 📷'}</span>
                      </button>

                      <label className="flex-1 min-w-[120px] py-2.5 px-3 bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span>{isAr ? 'رفع ملف صورة 📁' : 'Upload File 📁'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* Local Placeholder Presets */}
              <div className="mt-3 pt-2.5 border-t border-slate-700/60">
                <span className="text-[11px] text-slate-400 font-medium block mb-2">
                  {isAr ? 'أو اختر صورة جاهزة حسب قسم المنتج:' : 'Or choose a preset placeholder image:'}
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {PLACEHOLDER_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, imageUrl: preset.url })}
                      title={isAr ? preset.labelAr : preset.labelEn}
                      className={`relative p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                        editingProduct.imageUrl === preset.url
                          ? 'bg-indigo-600/40 border-indigo-500 ring-1 ring-indigo-400 shadow-sm'
                          : 'bg-slate-900/60 border-slate-700 hover:bg-slate-700/60'
                      }`}
                    >
                      <img src={preset.url} alt="preset" className="w-9 h-9 rounded-lg object-cover bg-slate-800" referrerPolicy="no-referrer" />
                      <span className="text-[9px] truncate w-full text-center text-slate-300 font-bold">
                        {(isAr ? preset.labelAr : preset.labelEn).split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex gap-3 pt-3 border-t border-slate-800 mt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-500/25 transition"
              >
                {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الصنف' : 'Save Product')}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-sm transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
      </AnimatePresence>

      {/* BARCODE STUDIO MODAL (New & Old Products - Accessible to both Admin and Cashier) */}
      <AnimatePresence>
      {isBarcodeStudioOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto print:hidden">
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Package className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>{isAr ? '🏷️ استوديو وطباعة الباركود' : '🏷️ Barcode Studio & Label Printer'}</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-extrabold">
                      {isAr ? 'متاح للمدير والبائع' : 'Admin & Cashier'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr ? 'إنشاء، توليد وتحديث الباركود للأصناف الجديدة والقديمة مع طباعة الملصقات' : 'Generate, update barcodes for new/existing products and print retail stickers'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBarcodeStudioOpen(false)}
                className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {/* Mode Selection Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800">
              <button
                onClick={() => {
                  setBarcodeMode('existing');
                  if (!selectedBarcodeProduct && products.length > 0) {
                    setSelectedBarcodeProduct(products[0]);
                    setCustomBarcodeVal(products[0].barcode);
                  }
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                  barcodeMode === 'existing'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>📦</span>
                <span>{isAr ? 'للأصناف القديمة (الموجودة بالمخزون)' : 'Existing Products in Stock'}</span>
              </button>
              <button
                onClick={() => {
                  setBarcodeMode('new');
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                  barcodeMode === 'new'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>✨</span>
                <span>{isAr ? 'لصنف جديد (توليد سريع وإضافة)' : 'New Product Quick Barcode'}</span>
              </button>
              <button
                onClick={() => {
                  setBarcodeMode('sku');
                  if (!selectedBarcodeProduct && products.length > 0) {
                    setSelectedBarcodeProduct(products[0]);
                    setSkuInputVal(products[0].sku || `SKU-${products[0].id.slice(-4) || '1001'}`);
                  } else if (selectedBarcodeProduct) {
                    setSkuInputVal(selectedBarcodeProduct.sku || `SKU-${selectedBarcodeProduct.id.slice(-4) || '1001'}`);
                  }
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                  barcodeMode === 'sku'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>⚡</span>
                <span>{isAr ? 'توليد من SKU (الرمز الداخلي)' : 'Generate from SKU'}</span>
              </button>
            </div>

            {/* Content for Existing Products Mode */}
            {barcodeMode === 'existing' ? (
              <div className="space-y-5">
                {/* Select Product */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    {isAr ? 'اختر الصنف من المخزون:' : 'Select Product from Inventory:'}
                  </label>
                  <select
                    value={selectedBarcodeProduct?.id || ''}
                    onChange={(e) => {
                      const found = products.find(p => p.id === e.target.value);
                      if (found) {
                        setSelectedBarcodeProduct(found);
                        setCustomBarcodeVal(found.barcode);
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-bold focus:outline-none focus:border-purple-500"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {isAr ? p.nameAr : p.nameEn} ({p.sellingPrice} {settings.currency}) - [{p.barcode}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Edit / Generate Barcode for selected product */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <label className="text-xs text-slate-300 font-bold block">
                    {isAr ? 'رقم الباركود الحالي / تعديل الباركود:' : 'Current / New Barcode Value:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={customBarcodeVal}
                      onChange={(e) => setCustomBarcodeVal(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-mono tracking-widest text-amber-300 font-bold focus:outline-none focus:border-purple-500 min-w-[200px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const autoGen = `6281001${Math.floor(10000 + Math.random() * 90000)}`;
                        setCustomBarcodeVal(autoGen);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-300 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span>🎲</span>
                      <span>{isAr ? 'توليد تلقائي' : 'Auto Generate'}</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedBarcodeProduct) return;
                      const updated = { ...selectedBarcodeProduct, barcode: customBarcodeVal };
                      const success = await onSaveProduct(updated);
                      if (success) {
                        setSelectedBarcodeProduct(updated);
                        alert(isAr ? 'تم تحديث باركود الصنف بنجاح! 💾' : 'Product barcode updated successfully! 💾');
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isAr ? '💾 حفظ وتحديث رقم الباركود لهذا الصنف في المخزون' : '💾 Save & Update Barcode to Inventory Item'}</span>
                  </button>
                </div>
              </div>
            ) : barcodeMode === 'new' ? (
              /* Content for New Product Mode */
              <div className="space-y-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div className="text-xs text-purple-300 font-bold flex items-center gap-1 mb-2">
                  <span>✨</span>
                  <span>{isAr ? 'إنشاء وتوليد باركود لصنف جديد مع إمكانية إضافته مباشرة:' : 'Generate barcode for new item and add directly:'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-bold">{isAr ? 'اسم الصنف الجديد (عربي):' : 'New Item Name (Ar):'}</label>
                    <input
                      type="text"
                      placeholder={isAr ? 'مثال: قهوة تركية فاخرة' : 'e.g. Premium Turkish Coffee'}
                      value={newBarcodeNameAr}
                      onChange={(e) => setNewBarcodeNameAr(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-bold">{isAr ? 'سعر البيع:' : 'Selling Price:'}</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newBarcodePrice}
                      onChange={(e) => setNewBarcodePrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">{isAr ? 'رقم الباركود المولد تلقائياً للصنف الجديد:' : 'Auto Generated Barcode:'}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedNewBarcode}
                      onChange={(e) => setGeneratedNewBarcode(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-base font-mono tracking-widest text-amber-300 font-bold focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setGeneratedNewBarcode(`6281001${Math.floor(10000 + Math.random() * 90000)}`)}
                      className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-300 text-xs font-bold transition flex items-center gap-1"
                    >
                      <span>🎲</span>
                      <span>{isAr ? 'رقم آخر' : 'Regenerate'}</span>
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newBarcodeNameAr) {
                      alert(isAr ? 'يرجى كتابة اسم الصنف الجديد أولاً!' : 'Please enter item name first!');
                      return;
                    }
                    const newProd: Product = {
                      id: Date.now().toString(),
                      nameAr: newBarcodeNameAr,
                      nameEn: newBarcodeNameEn || newBarcodeNameAr,
                      barcode: generatedNewBarcode,
                      category: newBarcodeCategory,
                      costPrice: newBarcodeCost,
                      sellingPrice: newBarcodePrice,
                      stock: newBarcodeStock,
                      minStock: 5,
                      unit: 'piece',
                      returnPolicy: '7_days',
                      updatedAt: new Date().toISOString()
                    };
                    const success = await onSaveProduct(newProd);
                    if (success) {
                      alert(isAr ? 'تم إضافة الصنف الجديد مع الباركود إلى المخزون بنجاح! 📦✨' : 'New product with barcode added to inventory! 📦✨');
                      setSelectedBarcodeProduct(newProd);
                      setCustomBarcodeVal(generatedNewBarcode);
                      setBarcodeMode('existing');
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? '➕ حفظ الصنف الجديد مع هذا الباركود في المخزون الآن' : '➕ Save New Product with Barcode to Inventory'}</span>
                </button>
              </div>
            ) : (
              /* Content for SKU Mode */
              <div className="space-y-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5 mb-1">
                  <span>⚡</span>
                  <span>{isAr ? 'توليد وطباعة باركود مخصص بناءً على رمز الصنف الداخلي (SKU):' : 'Generate & print custom barcode based on internal SKU:'}</span>
                </div>

                {/* Select Product */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    {isAr ? 'اختر الصنف لربطه وتوليد باركود الـ SKU:' : 'Select Product to generate SKU barcode:'}
                  </label>
                  <select
                    value={selectedBarcodeProduct?.id || ''}
                    onChange={(e) => {
                      const found = products.find(p => p.id === e.target.value);
                      if (found) {
                        setSelectedBarcodeProduct(found);
                        setSkuInputVal(found.sku || `SKU-${found.id.slice(-4) || '1001'}`);
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {isAr ? p.nameAr : p.nameEn} ({p.sellingPrice} {settings.currency}) {p.sku ? `[SKU: ${p.sku}]` : ''} - [{p.barcode}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* SKU Code Input & Gen Rule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {isAr ? 'قيمة رمز الصنف الداخلي (SKU):' : 'Internal SKU Value:'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. SKU-1001, COF-COL-01"
                        value={skuInputVal}
                        onChange={(e) => setSkuInputVal(e.target.value.toUpperCase())}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono tracking-wider text-amber-300 font-bold uppercase focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setSkuInputVal(`SKU-${Math.floor(1000 + Math.random() * 9000)}`)}
                        className="px-3 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>🎲</span>
                        <span>{isAr ? 'توليد' : 'Gen'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      {isAr ? 'نمط وقاعدة تحويل الـ SKU إلى باركود:' : 'SKU to Barcode Conversion Rule:'}
                    </label>
                    <select
                      value={skuBarcodeRule}
                      onChange={(e) => setSkuBarcodeRule(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="numeric_ean">{isAr ? '1. رقمي تجاري مخصص (يبدأ بـ 200... متوافق مع كافة الموازين والقوارئ)' : '1. Numeric Retail Barcode (Starts with 200... EAN compatible)'}</option>
                      <option value="exact_sku">{isAr ? '2. مطابق لنص الـ SKU حرفياً (لأجهزة الليزر والكاميرات الحديثة)' : '2. Exact SKU String (Matches SKU characters exactly)'}</option>
                    </select>
                  </div>
                </div>

                {/* Apply and Save button */}
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedBarcodeProduct) return;
                    if (!skuInputVal.trim()) {
                      alert(isAr ? 'يرجى كتابة رمز الصنف الداخلي SKU أولاً!' : 'Please enter SKU value first!');
                      return;
                    }
                    const genBarcode = getSkuGeneratedBarcode(skuInputVal, skuBarcodeRule);
                    const updated: Product = {
                      ...selectedBarcodeProduct,
                      sku: skuInputVal.trim(),
                      barcode: genBarcode
                    };
                    const success = await onSaveProduct(updated);
                    if (success) {
                      setSelectedBarcodeProduct(updated);
                      setCustomBarcodeVal(genBarcode);
                      alert(isAr ? `تم حفظ وربط الـ SKU والباركود الجديد (${genBarcode}) بالصنف بنجاح! 💾✨` : `SKU & Barcode (${genBarcode}) applied to item successfully! 💾✨`);
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAr ? '💾 حفظ وتطبيق باركود الـ SKU على هذا الصنف في المخزون' : '💾 Apply & Save SKU Barcode to Inventory Item'}</span>
                </button>
              </div>
            )}

            {/* Barcode Visual Preview Box */}
            <div className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center shadow-inner">
              <div className="text-xs font-extrabold text-slate-700 tracking-wide mb-1">
                {settings.storeNameAr || (isAr ? 'اسم المتجر' : 'Store Name')}
              </div>
              <div className="text-base font-black text-black mb-1 text-center max-w-sm truncate">
                {barcodeMode === 'sku'
                  ? (selectedBarcodeProduct ? (isAr ? selectedBarcodeProduct.nameAr : selectedBarcodeProduct.nameEn) : (isAr ? 'صنف SKU' : 'SKU Item'))
                  : barcodeMode === 'existing'
                  ? (selectedBarcodeProduct ? (isAr ? selectedBarcodeProduct.nameAr : selectedBarcodeProduct.nameEn) : 'اسم الصنف')
                  : (newBarcodeNameAr || (isAr ? 'صنف جديد' : 'New Item'))}
              </div>
              {(barcodeMode === 'sku' ? skuInputVal : selectedBarcodeProduct?.sku) && (
                <div className="text-[11px] font-mono font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300 mb-1">
                  📦 SKU: {barcodeMode === 'sku' ? skuInputVal : selectedBarcodeProduct?.sku}
                </div>
              )}
              <div className="h-16 flex items-end justify-center gap-[1.5px] px-4 w-full max-w-xs overflow-hidden bg-white my-1">
                {renderBarcodeBars(
                  barcodeMode === 'sku'
                    ? getSkuGeneratedBarcode(skuInputVal, skuBarcodeRule)
                    : barcodeMode === 'existing'
                    ? (customBarcodeVal || '0000000')
                    : generatedNewBarcode
                )}
              </div>
              <div className="text-sm font-mono font-extrabold tracking-[0.2em] text-black">
                {barcodeMode === 'sku'
                  ? getSkuGeneratedBarcode(skuInputVal, skuBarcodeRule)
                  : barcodeMode === 'existing'
                  ? (customBarcodeVal || '0000000')
                  : generatedNewBarcode}
              </div>
              <div className="mt-2 pt-1 border-t border-slate-300 text-xs font-black text-emerald-700 flex items-center gap-1">
                <span>{isAr ? 'السعر: ' : 'Price: '}</span>
                <span className="text-sm">
                  {barcodeMode === 'sku' || barcodeMode === 'existing' ? (selectedBarcodeProduct?.sellingPrice || 0) : newBarcodePrice} {settings.currency}
                </span>
              </div>
            </div>

            {/* Label Style Selector */}
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <label className="text-xs text-slate-300 font-bold whitespace-nowrap flex items-center gap-1.5">
                <span>🎨</span>
                <span>{isAr ? 'تصميم وقالب الطباعة:' : 'Label Format Style:'}</span>
              </label>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setLabelStyle('sticker')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold border transition ${
                    labelStyle === 'sticker'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isAr ? '🏷️ ملصق باركود صغير (3x2 سم)' : '🏷️ Small Sticker (3x2 cm)'}
                </button>
                <button
                  type="button"
                  onClick={() => setLabelStyle('shelf')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold border transition ${
                    labelStyle === 'shelf'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isAr ? '📋 بطاقة سعر الرف (6x4 سم كبيرة)' : '📋 Shelf Price Tag (6x4 cm)'}
                </button>
              </div>
            </div>

            {/* Barcode Encoding Format Selector */}
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <label className="text-xs text-slate-300 font-bold whitespace-nowrap flex items-center gap-1.5">
                <span>⚡</span>
                <span>{isAr ? 'نظام التشفير (JsBarcode):' : 'Barcode Encoding Format:'}</span>
              </label>
              <div className="flex gap-1.5 w-full sm:w-auto flex-wrap">
                {(['CODE128', 'EAN13', 'CODE39', 'UPC'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setBarcodeFormat(fmt)}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      barcodeFormat === fmt
                        ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {fmt === 'CODE128' ? (isAr ? 'CODE-128 (الشائع للمتاجر)' : 'CODE-128 (Standard)') : fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Print Quantity & Print Trigger */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-slate-300 font-bold whitespace-nowrap">
                  {isAr ? 'عدد الملصقات للطباعة:' : 'Labels Quantity:'}
                </label>
                <select
                  value={barcodeLabelCount}
                  onChange={(e) => setBarcodeLabelCount(parseInt(e.target.value) || 12)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-purple-500"
                >
                  <option value={1}>{isAr ? '1 ملصق (مفرد)' : '1 Label'}</option>
                  <option value={6}>{isAr ? '6 ملصقات (نصف ورقة)' : '6 Labels'}</option>
                  <option value={12}>{isAr ? '12 ملصق (ورقة كاملة)' : '12 Labels'}</option>
                  <option value={24}>{isAr ? '24 ملصق (ورقتين)' : '24 Labels'}</option>
                  <option value={48}>{isAr ? '48 ملصق' : '48 Labels'}</option>
                </select>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsBarcodeStudioOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex-1 sm:flex-initial"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-purple-500/30 transition flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                >
                  <span>🖨️</span>
                  <span>{isAr ? 'طباعة ملصقات الباركود الآن' : 'Print Barcode Labels'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* PRINTABLE BARCODE LABELS CONTAINER (Hidden normally, rendered on window.print()) */}
      <div className="print-barcode-container hidden print:block print:fixed print:inset-0 print:bg-white print:z-[999999] print:p-4 print:overflow-visible">
        <div className="text-center mb-4 font-black text-lg border-b pb-2 text-black">
          {isAr ? `ملصقات باركود: ` : `Barcode Labels: `} {barcodeMode === 'sku' ? (selectedBarcodeProduct ? (isAr ? selectedBarcodeProduct.nameAr : selectedBarcodeProduct.nameEn) : 'صنف SKU') : barcodeMode === 'existing' ? (selectedBarcodeProduct ? (isAr ? selectedBarcodeProduct.nameAr : selectedBarcodeProduct.nameEn) : 'صنف') : (newBarcodeNameAr || (isAr ? 'صنف جديد' : 'New Product'))}
          <span className="text-xs font-normal block text-slate-600">{labelStyle === 'shelf' ? (isAr ? 'قالب: بطاقة رفوف الأسعار الكبيرة (6x4 سم)' : 'Format: Shelf Price Tag') : (isAr ? 'قالب: ملصق باركود صغير (3x2 سم)' : 'Format: Small Sticker')}</span>
        </div>
        <div className={labelStyle === 'shelf' ? "grid grid-cols-2 gap-6" : "grid grid-cols-3 gap-4"}>
          {Array.from({ length: barcodeLabelCount }).map((_, idx) => {
            const prodName = barcodeMode === 'sku'
              ? (selectedBarcodeProduct ? (isAr ? selectedBarcodeProduct.nameAr : selectedBarcodeProduct.nameEn) : (isAr ? 'صنف SKU' : 'SKU Item'))
              : barcodeMode === 'existing'
              ? (selectedBarcodeProduct ? (isAr ? selectedBarcodeProduct.nameAr : selectedBarcodeProduct.nameEn) : 'صنف')
              : (newBarcodeNameAr || (isAr ? 'صنف جديد' : 'New Product'));
            const prodCode = barcodeMode === 'sku'
              ? getSkuGeneratedBarcode(skuInputVal, skuBarcodeRule)
              : barcodeMode === 'existing'
              ? (customBarcodeVal || selectedBarcodeProduct?.barcode || '0000000')
              : generatedNewBarcode;
            const prodPrice = barcodeMode === 'sku' || barcodeMode === 'existing'
              ? (selectedBarcodeProduct?.sellingPrice || 0)
              : newBarcodePrice;
            const prodCat = barcodeMode === 'sku' || barcodeMode === 'existing'
              ? selectedBarcodeProduct?.category
              : newBarcodeCategory;
            const prodSku = barcodeMode === 'sku' ? skuInputVal : selectedBarcodeProduct?.sku;

            if (labelStyle === 'shelf') {
              return (
                <div key={idx} className="border-4 border-black p-4 rounded-2xl text-center flex flex-col items-center justify-between break-inside-avoid bg-white shadow-none min-h-[160px]">
                  <div className="w-full flex justify-between items-center border-b-2 border-black pb-1.5 mb-2">
                    <span className="text-xs font-black text-black">{settings.storeNameAr || (isAr ? 'المتجر' : 'Store')}</span>
                    <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-bold">{prodCat || (isAr ? 'صنف عام' : 'General')}</span>
                  </div>
                  <div className="text-lg font-black text-black leading-tight w-full my-1">{prodName || 'صنف'}</div>
                  {prodSku && (
                    <div className="text-xs font-mono font-extrabold text-black bg-slate-100 border border-black/30 px-2 py-0.5 rounded-md my-0.5">
                      SKU: {prodSku}
                    </div>
                  )}
                  <div className="my-2 bg-black text-white px-4 py-2 rounded-xl w-full flex items-center justify-center gap-2">
                    <span className="text-xs font-bold">{isAr ? 'السعر:' : 'PRICE:'}</span>
                    <span className="text-3xl font-black font-mono tracking-tight">{prodPrice || 0}</span>
                    <span className="text-xs font-bold">{settings.currency}</span>
                  </div>
                  <div className="w-full flex items-center justify-between pt-1 border-t border-black/20 text-black mt-1">
                    <div className="flex items-end justify-center gap-[1px] h-8 overflow-hidden bg-white">
                      {renderBarcodeBars(prodCode)}
                    </div>
                    <span className="text-xs font-mono font-bold tracking-wider">{prodCode}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="border-2 border-black p-3 rounded-xl text-center flex flex-col items-center justify-center break-inside-avoid bg-white">
                <div className="text-[11px] font-bold text-slate-800 mb-0.5">{settings.storeNameAr || (isAr ? 'المتجر' : 'Store')}</div>
                <div className="text-sm font-black text-black truncate w-full mb-0.5">{prodName || 'صنف'}</div>
                {prodSku && (
                  <div className="text-[10px] font-mono font-bold text-black bg-slate-100 border border-black/30 px-1.5 py-0.5 rounded mb-1">
                    SKU: {prodSku}
                  </div>
                )}
                <div className="my-1 flex items-end justify-center gap-[1px] h-12 overflow-hidden w-full px-2 bg-white">
                  {renderBarcodeBars(prodCode)}
                </div>
                <div className="text-xs font-mono font-bold tracking-widest text-black">{prodCode}</div>
                <div className="mt-1 text-xs font-extrabold text-black border-t border-black/30 pt-1 w-full">
                  {isAr ? 'السعر: ' : 'Price: '} {prodPrice || 0} {settings.currency}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
