import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Загружает актуальные цены из таблицы materials_catalog в Supabase.
 * При отсутствии сети возвращает сохраненный оффлайн-кэш из localStorage.
 */
export async function fetchLiveMaterialsCatalog() {
  if (!supabase) {
    const cached = localStorage.getItem('smetapro_cached_catalog');
    return { data: cached ? JSON.parse(cached) : null, source: cached ? 'offline-cache' : 'local-default' };
  }

  try {
    const { data, error } = await supabase
      .from('materials_catalog')
      .select('*');

    if (error) throw error;

    if (data && data.length > 0) {
      const catalogMap = {};
      data.forEach((row) => {
        catalogMap[row.id] = row;
      });
      localStorage.setItem('smetapro_cached_catalog', JSON.stringify(catalogMap));
      return { data: catalogMap, source: 'supabase-live' };
    }
  } catch (err) {
    console.warn('Оффлайн-режим: не удалось загрузить прайс из Supabase, используем локальный кэш.', err);
    const cached = localStorage.getItem('smetapro_cached_catalog');
    if (cached) {
      return { data: JSON.parse(cached), source: 'offline-cache' };
    }
  }

  return { data: null, source: 'local-default' };
}
