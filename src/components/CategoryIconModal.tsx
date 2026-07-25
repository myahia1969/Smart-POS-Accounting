/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, Sparkles, Plus, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';

interface CategoryIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCategory: (categoryWithIcon: string) => Promise<boolean> | void;
  lang: Language;
  existingCategories?: string[];
}

const ICONS_GRID = [
  // Cleaning & Hygiene
  { emoji: '🧼', labelAr: 'مواد تنظيف', labelEn: 'Cleaning' },
  { emoji: '🧹', labelAr: 'أدوات نظافة', labelEn: 'Brooms & Tools' },
  { emoji: '🧴', labelAr: 'عناية ومستحضرات', labelEn: 'Lotions & Care' },
  { emoji: '🧽', labelAr: 'إسفنج وتنظيف', labelEn: 'Sponges' },
  { emoji: '🪣', labelAr: 'دلاء ومساحات', labelEn: 'Buckets' },
  // Food & Drinks
  { emoji: '🍔', labelAr: 'مأكولات وسريعة', labelEn: 'Fast Food' },
  { emoji: '🍕', labelAr: 'معجنات وفطائر', labelEn: 'Pizza & Bakery' },
  { emoji: '☕', labelAr: 'مشروبات وقهوة', labelEn: 'Coffee & Tea' },
  { emoji: '🧃', labelAr: 'عصائر ومرطبات', labelEn: 'Juices' },
  { emoji: '🥛', labelAr: 'ألبان وأجبان', labelEn: 'Dairy' },
  { emoji: '🥩', labelAr: 'لحوم ودواجن', labelEn: 'Meat & Poultry' },
  { emoji: '🥦', labelAr: 'خضروات وفواكه', labelEn: 'Produce' },
  { emoji: '🍞', labelAr: 'مخابز وحلويات', labelEn: 'Bread & Sweets' },
  { emoji: '🍬', labelAr: 'سكاكر وشوكولاتة', labelEn: 'Candy & Snacks' },
  // Electronics & Hardware
  { emoji: '📱', labelAr: 'هواتف وإكسسوارات', labelEn: 'Phones' },
  { emoji: '💻', labelAr: 'كمبيوتر وشاشات', labelEn: 'Computers' },
  { emoji: '🔋', labelAr: 'بطاريات وشواحن', labelEn: 'Batteries' },
  { emoji: '💡', labelAr: 'إنارة وكهرباء', labelEn: 'Lighting' },
  { emoji: '🛠️', labelAr: 'أدوات وصيانة', labelEn: 'Hardware & Tools' },
  { emoji: '⚙️', labelAr: 'قطع غيار ومعدات', labelEn: 'Spare Parts' },
  // Fashion & Beauty
  { emoji: '👕', labelAr: 'ملابس وأزياء', labelEn: 'Clothing' },
  { emoji: '👗', labelAr: 'فساتين ونسائي', labelEn: 'Dresses' },
  { emoji: '👟', labelAr: 'أحذية وحقائب', labelEn: 'Shoes & Bags' },
  { emoji: '💍', labelAr: 'مجوهرات وإكسسوارات', labelEn: 'Jewelry' },
  { emoji: '💄', labelAr: 'تجميل ومكياج', labelEn: 'Cosmetics' },
  // Health & Home
  { emoji: '💊', labelAr: 'صيدلية وأدوية', labelEn: 'Pharmacy' },
  { emoji: '🩹', labelAr: 'إسعافات ومستلزمات', labelEn: 'First Aid' },
  { emoji: '🏠', labelAr: 'أدوات منزلية', labelEn: 'Home Goods' },
  { emoji: '🛏️', labelAr: 'مفروشات وسجاد', labelEn: 'Furniture' },
  { emoji: '📦', labelAr: 'صناديق وتغليف', labelEn: 'Packaging' },
  { emoji: '📚', labelAr: 'قرطاسية ومكتبية', labelEn: 'Stationery' },
  { emoji: '🎨', labelAr: 'ألعاب وهدايا', labelEn: 'Toys & Gifts' },
  { emoji: '⭐', labelAr: 'أصناف مميزة', labelEn: 'Featured' },
  { emoji: '🔥', labelAr: 'عروض وتخفيضات', labelEn: 'Deals' }
];

export const CategoryIconModal: React.FC<CategoryIconModalProps> = ({
  isOpen,
  onClose,
  onSaveCategory,
  lang,
  existingCategories = []
}) => {
  const isAr = lang === 'ar';
  const [selectedEmoji, setSelectedEmoji] = useState('🧼');
  const [categoryName, setCategoryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectPreset = (preset: typeof ICONS_GRID[0]) => {
    setSelectedEmoji(preset.emoji);
    if (!categoryName.trim()) {
      setCategoryName(isAr ? preset.labelAr : preset.labelEn);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      alert(isAr ? 'يرجى إدخال اسم لمجموعة الأصناف!' : 'Please enter a category group name!');
      return;
    }

    const fullCatName = `${selectedEmoji} ${categoryName.trim()}`;
    if (existingCategories.includes(fullCatName)) {
      alert(isAr ? 'هذه المجموعة موجودة بالفعل!' : 'This category group already exists!');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveCategory(fullCatName);
      setCategoryName('');
      onClose();
    } catch (err: any) {
      alert(err.message || (isAr ? 'حدث خطأ في حفظ المجموعة' : 'Error saving category group'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            className="bg-white/95 backdrop-blur-xl border border-white rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">
                {isAr ? 'إضافة أيقونة ومجموعة أصناف جديدة' : 'Add New Category Icon & Group'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'اختر أيقونة معبرة (مثل مواد تنظيف 🧼) واكتب اسم التصنيف الجديد' : 'Pick an icon and type the new product category group name'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Category Name Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              {isAr ? 'اسم مجموعة الأصناف * (مثال: مواد تنظيف وعناية)' : 'Category Group Name * (e.g. Cleaning Supplies)'}
            </label>
            <div className="flex gap-2">
              <div className="w-14 h-11 bg-slate-100 border border-slate-300 rounded-2xl flex items-center justify-center text-2xl font-bold select-none shadow-inner">
                {selectedEmoji}
              </div>
              <input
                type="text"
                required
                placeholder={isAr ? 'اكتب اسم المجموعة هنا...' : 'Type group name here...'}
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Live Button Preview */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col gap-1.5 items-center">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-700">
              {isAr ? 'معاينة أيقونة الزر في نقطة البيع:' : 'POS Button Preview:'}
            </span>
            <div className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-500/20 border border-indigo-400 flex items-center gap-1.5 transform scale-105">
              <span>{selectedEmoji}</span>
              <span>{categoryName.trim() || (isAr ? 'اسم المجموعة الجديدة' : 'New Group Name')}</span>
            </div>
          </div>

          {/* Emojis Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              {isAr ? 'اختر أيقونة من القائمة المقترحة:' : 'Select icon from list:'}
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-2xl no-scrollbar">
              {ICONS_GRID.map((item, index) => {
                const isSelected = selectedEmoji === item.emoji;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectPreset(item)}
                    title={isAr ? item.labelAr : item.labelEn}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-105'
                        : 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200/80'
                    }`}
                  >
                    <span className="text-xl">{item.emoji}</span>
                    <span className="text-[9px] truncate w-full text-center mt-0.5 font-bold">
                      {isAr ? item.labelAr : item.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-200/80">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl text-xs shadow-lg shadow-indigo-500/30 transition transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {isSaving
                  ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                  : (isAr ? 'حفظ وإضافة المجموعة للزر' : 'Save Category Group')}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
