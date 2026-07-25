/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, AlertTriangle, Edit, Trash2, Check, RefreshCw, Filter, ArrowUpDown, Layers } from 'lucide-react';
import { Product, SystemSettings, Language } from '../types';
import { CategoryIconModal } from './CategoryIconModal';

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
  
  // Modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Barcode Studio Modal state (Accessible to both Admin and Cashier as requested)
  const [isBarcodeStudioOpen, setIsBarcodeStudioOpen] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState<'existing' | 'new'>('existing');
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<Product | null>(null);
  const [barcodeLabelCount, setBarcodeLabelCount] = useState<number>(12);
  const [customBarcodeVal, setCustomBarcodeVal] = useState<string>('');

  // New Product quick creation from Barcode Studio
  const [newBarcodeNameAr, setNewBarcodeNameAr] = useState('');
  const [newBarcodeNameEn, setNewBarcodeNameEn] = useState('');
  const [newBarcodeCategory, setNewBarcodeCategory] = useState('مواد غذائية');
  const [newBarcodePrice, setNewBarcodePrice] = useState<number>(15);
  const [newBarcodeCost, setNewBarcodeCost] = useState<number>(10);
  const [newBarcodeStock, setNewBarcodeStock] = useState<number>(50);
  const [generatedNewBarcode, setGeneratedNewBarcode] = useState(`6281001${Math.floor(10000 + Math.random() * 90000)}`);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const renderBarcodeBars = (code: string) => {
    const bars: { width: number; isBlack: boolean }[] = [];
    let seed = 0;
    for (let i = 0; i < code.length; i++) {
      seed += code.charCodeAt(i) * (i + 1);
    }
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 2, isBlack: false });
    for (let i = 0; i < 24; i++) {
      const val = (seed + i * 17) % 4 + 1;
      bars.push({ width: val, isBlack: i % 2 === 0 });
    }
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    for (let i = 0; i < 24; i++) {
      const val = (seed + i * 23) % 4 + 1;
      bars.push({ width: val, isBlack: i % 2 !== 0 });
    }
    bars.push({ width: 2, isBlack: false });
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });
    return bars.map((b, idx) => (
      <div
        key={idx}
        style={{ width: `${b.width * 2}px` }}
        className={`h-full ${b.isBlack ? 'bg-black' : 'bg-transparent'}`}
      />
    ));
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
        p.barcode.includes(searchTerm);
      const matchStock = !filterLowStock || p.stock <= p.minStock;
      return matchCat && matchSearch && matchStock;
    });
  }, [products, selectedCategory, searchTerm, filterLowStock]);

  const handleOpenNewModal = () => {
    if (userRole !== 'admin') {
      alert(isAr ? 'عفواً! إضافة المنتجات مخصصة للمدير فقط.' : 'Access Denied! Adding products is restricted to Admins.');
      return;
    }
    setEditingProduct({
      id: '',
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
          {/* Low Stock Filter Toggle */}
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
              filterLowStock 
                ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-md' 
                : 'bg-white/60 hover:bg-white/80 text-slate-700 border border-white/80 shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{isAr ? 'نواقص المخزون فقط' : 'Low Stock Only'}</span>
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
                filteredProducts.map(prod => {
                  const margin = prod.sellingPrice - prod.costPrice;
                  const marginPercent = Math.round((margin / prod.sellingPrice) * 100) || 0;
                  const isLow = prod.stock <= prod.minStock;

                  return (
                    <tr key={prod.id} className="hover:bg-white/60 transition">
                      {/* Name & Barcode */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{isAr ? prod.nameAr : prod.nameEn}</div>
                        <div className="text-xs font-mono text-indigo-600 mt-0.5">{prod.barcode}</div>
                        {prod.returnPolicy && prod.returnPolicy !== '7_days' && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            {prod.returnPolicy === 'no_return' ? (isAr ? '🚫 غير قابل للاسترجاع' : '🚫 Non-returnable') :
                             prod.returnPolicy === 'exchange_only' ? (isAr ? '🔀 استبدال فقط' : '🔀 Exchange only') :
                             prod.returnPolicy === '14_days' ? (isAr ? '🔄 استرجاع 14 يوم' : '🔄 14 Days return') : `🔄 ${prod.returnPolicy}`}
                          </span>
                        )}
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
                          <span className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm ${
                            isLow ? 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isLow && <AlertTriangle className="w-3 h-3" />}
                            <span>{prod.stock} {prod.unit === 'kg' ? (isAr ? 'كجم' : 'kg') : (isAr ? 'قطعة' : 'pcs')}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 mt-1">{isAr ? 'حد التنبيه:' : 'Min threshold:'} {prod.minStock}</span>
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveForm} className="bg-slate-900 text-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
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

            {/* Barcode & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">{isAr ? 'الباركود (Barcode):' : 'Barcode:'}</label>
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
          </form>
        </div>
      )}

      {/* BARCODE STUDIO MODAL (New & Old Products - Accessible to both Admin and Cashier) */}
      {isBarcodeStudioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn print:hidden">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
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
            ) : (
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
            )}

            {/* Barcode Visual Preview Box */}
            <div className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center shadow-inner">
              <div className="text-xs font-extrabold text-slate-700 tracking-wide mb-1">
                {settings.storeNameAr || (isAr ? 'اسم المتجر' : 'Store Name')}
              </div>
              <div className="text-base font-black text-black mb-2 text-center max-w-sm truncate">
                {barcodeMode === 'existing'
                  ? (selectedBarcodeProduct ? (isAr ? selectedBarcodeProduct.nameAr : selectedBarcodeProduct.nameEn) : 'اسم الصنف')
                  : (newBarcodeNameAr || (isAr ? 'صنف جديد' : 'New Item'))}
              </div>
              <div className="h-16 flex items-end justify-center gap-[1.5px] px-4 w-full max-w-xs overflow-hidden bg-white my-1">
                {renderBarcodeBars(barcodeMode === 'existing' ? (customBarcodeVal || '0000000') : generatedNewBarcode)}
              </div>
              <div className="text-sm font-mono font-extrabold tracking-[0.2em] text-black">
                {barcodeMode === 'existing' ? (customBarcodeVal || '0000000') : generatedNewBarcode}
              </div>
              <div className="mt-2 pt-1 border-t border-slate-300 text-xs font-black text-emerald-700 flex items-center gap-1">
                <span>{isAr ? 'السعر: ' : 'Price: '}</span>
                <span className="text-sm">
                  {barcodeMode === 'existing' ? (selectedBarcodeProduct?.sellingPrice || 0) : newBarcodePrice} {settings.currency}
                </span>
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
          </div>
        </div>
      )}

      {/* PRINTABLE BARCODE LABELS CONTAINER (Hidden normally, rendered on window.print()) */}
      <div className="print-barcode-container hidden print:block print:fixed print:inset-0 print:bg-white print:z-[999999] print:p-4 print:overflow-visible">
        <div className="text-center mb-4 font-black text-lg border-b pb-2 text-black">
          {isAr ? `ملصقات باركود: ` : `Barcode Labels: `} {barcodeMode === 'existing' ? (selectedBarcodeProduct ? (isAr ? selectedBarcodeProduct.nameAr : selectedBarcodeProduct.nameEn) : 'صنف') : (newBarcodeNameAr || (isAr ? 'صنف جديد' : 'New Product'))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: barcodeLabelCount }).map((_, idx) => {
            const prodName = barcodeMode === 'existing' ? (selectedBarcodeProduct ? (isAr ? selectedBarcodeProduct.nameAr : selectedBarcodeProduct.nameEn) : 'صنف') : (newBarcodeNameAr || (isAr ? 'صنف جديد' : 'New Product'));
            const prodCode = barcodeMode === 'existing' ? (customBarcodeVal || selectedBarcodeProduct?.barcode || '0000000') : generatedNewBarcode;
            const prodPrice = barcodeMode === 'existing' ? selectedBarcodeProduct?.sellingPrice : newBarcodePrice;
            return (
              <div key={idx} className="border-2 border-black p-3 rounded-xl text-center flex flex-col items-center justify-center break-inside-avoid bg-white">
                <div className="text-[11px] font-bold text-slate-800 mb-0.5">{settings.storeNameAr || (isAr ? 'المتجر' : 'Store')}</div>
                <div className="text-sm font-black text-black truncate w-full mb-1">{prodName || 'صنف'}</div>
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
