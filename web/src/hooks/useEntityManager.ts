'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from './useToast';
import { useSupabaseRealtime } from './useSupabaseRealtime';

export function useEntityManager<T extends { id: number }>(
  tableName: string,
  getFn: () => Promise<T[]>
) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const fetchData = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setIsLoading(true);
      setError(null);
      const data = await getFn();
      setItems(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al conectar con Supabase.';
      setError(message);
      showToast(message, 'error');
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, [getFn, showToast]);

  // Initial data load
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Supabase Realtime Subscription Hook
  useSupabaseRealtime(tableName, useCallback(() => {
    fetchData(false);
  }, [fetchData]));

  const openCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEdit = (item: T) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const openDelete = (id: number) => {
    setDeletingId(id);
  };

  const executeDelete = async (deleteFn: (id: number) => Promise<void>, successMessage: string) => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      const targetId = deletingId;
      setItems((prev) => prev.filter((i) => i.id !== targetId));
      await deleteFn(targetId);
      showToast(successMessage, 'success');
      setDeletingId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar.';
      showToast(message, 'error');
      fetchData(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    items,
    setItems,
    isLoading,
    error,
    setError,
    isModalOpen,
    setIsModalOpen,
    editingItem,
    deletingId,
    setDeletingId,
    isDeleting,
    toast,
    showToast,
    hideToast,
    fetchData,
    openCreate,
    openEdit,
    openDelete,
    executeDelete,
  };
}
