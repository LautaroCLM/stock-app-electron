'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Plus, Search, Check, Loader2, X, Layers } from 'lucide-react';
import { categoryWebService } from '@/lib/services/categoryWebService';

interface CategorySelectProps {
  value: string;
  onChange: (categoryName: string) => void;
  categories: string[];
  onCategoryCreated?: (newCategoryName: string) => void;
  disabled?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  categories,
  onCategoryCreated,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const newCatInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setSearchQuery('');
        setError(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search or new category input when opened
  useEffect(() => {
    if (isOpen && !isCreating) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else if (isOpen && isCreating) {
      setTimeout(() => newCatInputRef.current?.focus(), 100);
    }
  }, [isOpen, isCreating]);

  // Filter categories by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    return categories.filter((cat) =>
      cat.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [categories, searchQuery]);

  const handleSelect = (categoryName: string) => {
    onChange(categoryName);
    setIsOpen(false);
    setSearchQuery('');
    setError(null);
  };

  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setError('Ingrese un nombre de categoría válido.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const createdName = await categoryWebService.createCategory(trimmed);
      
      // Notify parent to refresh categories
      if (onCategoryCreated) {
        await onCategoryCreated(createdName);
      }

      // Automatically select newly created category
      onChange(createdName);

      // Reset state
      setNewCatName('');
      setIsCreating(false);
      setIsOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la categoría.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
        Categoría
      </label>

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setIsCreating(false);
            setError(null);
          }
        }}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 shadow-sm hover:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
      >
        <span className="truncate flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <span className={value ? 'font-medium' : 'text-slate-400 dark:text-slate-500'}>
            {value || 'Seleccionar categoría...'}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {!isCreating ? (
            /* Mode 1: List & Search */
            <div className="flex flex-col max-h-72">
              {/* Search Bar */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar categoría..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-1"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:text-slate-600 dark:hover:text-slate-300 text-slate-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Scrollable Categories List */}
              <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 max-h-44">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => {
                    const isSelected = value.toLowerCase() === cat.toLowerCase();
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleSelect(cat)}
                        className={`w-full px-3 py-2 text-xs font-medium rounded-xl flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                    No se encontraron categorías.
                  </div>
                )}
              </div>

              {/* Action Button: Create New Category */}
              <button
                type="button"
                onClick={() => {
                  setIsCreating(true);
                  setNewCatName(searchQuery.trim());
                  setError(null);
                }}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4 text-blue-500" />
                <span>Crear nueva categoría...</span>
              </button>
            </div>
          ) : (
            /* Mode 2: Inline Creation Form */
            <form onSubmit={handleCreateCategory} className="p-3.5 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  Nueva Categoría
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-[11px] text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div>
                <input
                  ref={newCatInputRef}
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ej: Herramientas Eléctricas"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newCatName.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Crear Categoría</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
