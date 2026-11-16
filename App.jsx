import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Layers, ShoppingCart, FileSpreadsheet, Plus, Trash2, RotateCw,
  CheckCircle2, Building2, Eye, EyeOff, RefreshCw, Printer,
  AlertTriangle, ExternalLink, Send, Database, X, Copy, Check, Home, Palette, Zap
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(e);
    }
  }, [key, value]);
  return [value, setValue];
}

// Данные проекта Квартиры №1161 по чертежу БТИ (60.6 м²)
const APT_1161_ROOMS = [
  { id: 'r4', num: '4', name: 'Гостиная / Жилая', area: 18.8, x: 0, y: 0, w: 3.43, d: 5.29, color: '#1e293b' },
  { id: 'r5', num: '5', name: 'Кухня-столовая', area: 12.2, x: 3.43, y: 0, w: 3.33, d: 3.66, color: '#172554' },
  { id: 'r6', num: '6', name: 'Мастер-спальня', area: 16.0, x: 6.76, y: 0, w: 3.07, d: 5.22, color: '#1e1b4b' },
  { id: 'r7', num: '7', name: 'Коридор', area: 2.2, x: 3.43, y: 3.66, w: 2.23, d: 1.0, color: '#0f172a' },
  { id: 'r1', num: '1', name: 'Прихожая', area: 2.8, x: 3.43, y: 4.66, w: 1.67, d: 1.68, color: '#0f172a' },
  { id: 'r2', num: '2', name: 'Ванная комната', area: 5.6, x: 5.10, y: 4.66, w: 2.53, d: 2.21, color: '#083344' },
  { id: 'r3', num: '3', name: 'Санузел / Постирочная', area: 3.0, x: 7.63, y: 5.22, w: 2.12, d: 1.53, color: '#083344' }
];

const APT_1161_FURNITURE = [
  { id: 'f1', room: '4', name: 'Угловой диван Лофт', x: 0.25, y: 1.2, w: 2.4, d: 1.6, h: 0.85, color: '#6366f1', price: 68000 },
  { id: 'f2', room: '4', name: 'ТВ-тумба + Панель', x: 2.85, y: 1.4, w: 0.45, d: 2.0, h: 0.55, color: '#f59e0b', price: 32000 },
  { id: 'f3', room: '4', name: 'Рабочий стол у окна', x: 0.4, y: 0.15, w: 1.4, d: 0.65, h: 0.75, color: '#38bdf8', price: 24000 },
  { id: 'f4', room: '4', name: 'Шкаф-купе встроенный', x: 0.2, y: 4.5, w: 2.1, d: 0.65, h: 2.6, color: '#818cf8', price: 74000 },
  { id: 'f5', room: '5', name: 'Кухонный гарнитур Г-обр.', x: 3.55, y: 2.95, w: 3.1, d: 0.6, h: 2.4, color: '#10b981', price: 165000 },
  { id: 'f6', room: '5', name: 'Обеденный стол на 4–6 перс.', x: 4.3, y: 1.1, w: 1.4, d: 0.9, h: 0.76, color: '#f59e0b', price: 38000 },
  { id: 'f7', room: '6', name: 'Кровать King-Size 180×200', x: 7.65, y: 1.4, w: 2.05, d: 1.9, h: 0.95, color: '#ec4899', price: 72000 },
  { id: 'f8', room: '6', name: 'Гардеробный шкаф Egger', x: 6.9, y: 4.45, w: 2.6, d: 0.65, h: 2.6, color: '#818cf8', price: 86000 },
  { id: 'f9', room: '2', name: 'Ванна акриловая 170×75', x: 5.2, y: 6.0, w: 1.7, d: 0.75, h: 0.6, color: '#06b6d4', price: 34000 },
  { id: 'f10', room: '2', name: 'Тумба с раковиной 100 см', x: 6.95, y: 4.8, w: 0.55, d: 1.0, h: 0.85, color: '#22d3ee', price: 28000 },
  { id: 'f11', room: '3', name: 'Колонна Стиральная + Сушильная', x: 8.95, y: 5.35, w: 0.65, d: 0.65, h: 1.75, color: '#38bdf8', price: 95000 }
];

const APT_1161_SOCKETS = [
  { id: 's1', name: 'Блок ТВ (4×220В + LAN)', x: 3.25, y: 2.2, z: 0.4, type: 'tv' },
  { id: 's2', name: 'Розетки у дивана (2×220В + USB)', x: 0.2, y: 2.8, z: 0.3, type: 'power' },
  { id: 's3', name: 'Рабочее место (3×220В)', x: 1.1, y: 0.15, z: 0.9, type: 'power' },
  { id: 's4', name: 'Фартук кухни (4×220В IP44)', x: 4.8, y: 3.55, z: 1.1, type: 'kitchen' },
  { id: 's5', name: 'Силовой вывод варочной 32А', x: 5.8, y: 3.55, z: 0.3, type: 'heavy' },
  { id: 's6', name: 'Холодильник + ПММ (2×220В)', x: 3.65, y: 3.55, z: 0.3, type: 'kitchen' },
  { id: 's7', name: 'Прикроватный блок Лев. (2×220В + Выкл)', x: 9.7, y: 1.25, z: 0.6, type: 'power' },
  { id: 's8', name: 'Прикроватный блок Прав. (2×220В + Выкл)', x: 9.7, y: 3.45, z: 0.6, type: 'power' },
  { id: 's9', name: 'ТВ в спальне (3×220В)', x: 6.85, y: 2.3, z: 1.3, type: 'tv' },
  { id: 's10', name: 'Зеркало + Фен IP44', x: 7.45, y: 5.3, z: 1.1, type: 'wet' },
  { id: 's11', name: 'Стиральная + Сушильная IP44', x: 9.55, y: 5.65, z: 0.6, type: 'wet' },
  { id: 's12', name: 'Щит + Роутер Wi-Fi 6', x: 3.55, y: 5.9, z: 1.8, type: 'net' }
];

const DESIGN_STYLES = {
  minimal: {
    name: 'Современный Минимализм (Tactile Warm)',
    wallHex: '#e2e8f0',
    floorHex: '#94a3b8',
    accentHex: '#f59e0b',
    wallsDesc: 'Матовая моющаяся краска Tikkurila Harmony (оттенок Теплый Камень) + теневой профиль Eurokraab',
    floorDesc: 'Инженерный кварцвинил 43 класс (Дуб Скандинавский Серый, укладка единым контуром без порогов)',
    lightDesc: 'Магнитные шинопроводы 48V + скрытая теплая LED-подсветка шторных ниш 3000K'
  },
  scandi: {
    name: 'Скандинавский Натуральный',
    wallHex: '#f8fafc',
    floorHex: '#d6a87c',
    accentHex: '#10b981',
    wallsDesc: 'Стеклохолст + краска Dulux Diamond Белый Стокгольм, акцентные рейки из светлого ясеня',
    floorDesc: 'Кварцвинил / Ламинат Egger 33 класс (Дуб Натуральный Медовый, раскладка английской елочкой)',
    lightDesc: 'Накладные цилиндрические споты + подвесные светильники над обеденным столом'
  },
  neoclassic: {
    name: 'Современная Неоклассика',
    wallHex: '#f5f5f4',
    floorHex: '#b48a64',
    accentHex: '#a855f7',
    wallsDesc: 'Молдинги Orac Decor под покраску в тон стен + крупноформатный керамогранит под мрамор Calacatta',
    floorDesc: 'Паркетная доска / Кварцвинил под французскую елку + высокий МДФ-плинтус 100 мм',
    lightDesc: 'Латунные бра у кровати, трековая система и центральная дизайнерская люстра в гостиной'
  }
};

const DEFAULT_CATALOG = {
  screed_mix: { id: 'screed_mix', name: 'Пескобетон М300 Русеан (мешок 40 кг)', searchQuery: 'Пескобетон М300 40 кг', unit: 'меш.', unit_weight_kg: 40, store_petrovich_price: 365, store_leroy_price: 348, store_saturn_price: 335 },
  damper_tape: { id: 'damper_tape', name: 'Демпферная лента 100 мм (рулон 25 м)', searchQuery: 'Демпферная лента 100 мм', unit: 'рул.', unit_weight_kg: 0.8, store_petrovich_price: 450, store_leroy_price: 390, store_saturn_price: 410 },
  plaster_rotband: { id: 'plaster_rotband', name: 'Штукатурка гипсовая Knauf Ротбанд (30 кг)', searchQuery: 'Штукатурка Knauf Ротбанд 30 кг', unit: 'меш.', unit_weight_kg: 30, store_petrovich_price: 595, store_leroy_price: 568, store_saturn_price: 545 },
  primer_deep: { id: 'primer_deep', name: 'Грунтовка Knauf Тифенгрунд (10 л)', searchQuery: 'Грунтовка Knauf Тифенгрунд 10 л', unit: 'кан.', unit_weight_kg: 10.5, store_petrovich_price: 1390, store_leroy_price: 1290, store_saturn_price: 1340 },
  putty_finish: { id: 'putty_finish', name: 'Шпаклевка финишная Vetonit LR+ (20 кг)', searchQuery: 'Шпаклевка Vetonit LR+ 20 кг', unit: 'меш.', unit_weight_kg: 20, store_petrovich_price: 1180, store_leroy_price: 1090, store_saturn_price: 1120 },
  wall_finish_unit: { id: 'wall_finish_unit', name: 'Краска моющаяся Dulux / Tikkurila (9 л)', searchQuery: 'Краска интерьерная Dulux 9 л', unit: 'ведро', unit_weight_kg: 12, store_petrovich_price: 5890, store_leroy_price: 5490, store_saturn_price: 5650 },
  floor_finish_pack: { id: 'floor_finish_pack', name: 'Кварцвинил / Ламинат 33 класс (уп. 2.15 м²)', searchQuery: 'Кварцвинил ламинат 33 класс', unit: 'уп.', unit_weight_kg: 16.5, store_petrovich_price: 3150, store_leroy_price: 2890, store_saturn_price: 2990 },
  cable_vvg_3x25: { id: 'cable_vvg_3x25', name: 'Кабель ВВГнг(А)-LS 3х2.5 ГОСТ (бухта 100 м)', searchQuery: 'Кабель ВВГнг-LS 3х2.5 100 м', unit: 'бухта', unit_weight_kg: 13.5, store_petrovich_price: 8450, store_leroy_price: 7990, store_saturn_price: 7850 },
  socket_box: { id: 'socket_box', name: 'Подрозетник Schneider + механизм розетки', searchQuery: 'Розетка Schneider Electric', unit: 'компл.', unit_weight_kg: 0.2, store_petrovich_price: 480, store_leroy_price: 430, store_saturn_price: 450 }
};

const STORE_PROVIDERS = [
  { id: 'petrovich', name: 'СТД «Петрович»', badge: 'Доставка за 2 часа • Клуб Друзей', baseTruck: 2400, cashbackPct: 0.08, buildSearchUrl: (q) => `https://petrovich.ru/search/?q=${encodeURIComponent(q)}` },
  { id: 'leroy', name: 'Лемана ПРО (Леруа Мерлен)', badge: 'Низкие цены DIY • Доставка от 1 дня', baseTruck: 2900, cashbackPct: 0.05, buildSearchUrl: (q) => `https://lemanapro.ru/search/?q=${encodeURIComponent(q)}` },
  { id: 'saturn', name: 'Сатурн СтройБаза / ВсеИнструменты', badge: 'Опт для бригад и комплектации', baseTruck: 2600, cashbackPct: 0.10, buildSearchUrl: (q) => `https://www.vseinstrumenti.ru/search/?what=${encodeURIComponent(q)}` }
];

export default function App() {
  const [projectMode, setProjectMode] = useStickyState('apt1161', 'smetapro_project_mode');
  const [activeTab, setActiveTab] = useState('cad');
  const [designStyleKey, setDesignStyleKey] = useStickyState('minimal', 'smetapro_design_style');
  const [cam3D, setCam3D] = useState({ yaw: 34, pitch: 32, zoom: 1.0, showSockets: true, showFurniture: true });

  const [selectedStoreId, setSelectedStoreId] = useStickyState('leroy', 'smetapro_store_id');
  const [floorLevel, setFloorLevel] = useStickyState(7, 'smetapro_floor_lvl');
  const [hasCargoLift, setHasCargoLift] = useStickyState(true, 'smetapro_cargo_lift');
  const [screedThickness, setScreedThickness] = useStickyState(45, 'smetapro_screed_mm');
  const [plasterThickness, setPlasterThickness] = useStickyState(18, 'smetapro_plaster_mm');

  const [customRoom, setCustomRoom] = useStickyState({ name: 'Своё помещение', length: 5.5, width: 3.8, height: 2.8 }, 'smetapro_custom_room');

  const cleanSupabaseUrl = (raw) => (raw || '').trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  const [customSbUrl, setCustomSbUrl] = useStickyState(cleanSupabaseUrl(import.meta.env.VITE_SUPABASE_URL), 'smetapro_sb_url_v4');
  const [customSbKey, setCustomSbKey] = useStickyState((import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(), 'smetapro_sb_key_v4');
  const [catalog, setCatalog] = useStickyState(DEFAULT_CATALOG, 'smetapro_catalog_v4');
  const [syncState, setSyncState] = useState({ status: 'idle', lastTime: null, error: null });
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [copiedSpec, setCopiedSpec] = useState(false);

  const syncLivePricesFromSupabase = async () => {
    const validUrl = cleanSupabaseUrl(customSbUrl || import.meta.env.VITE_SUPABASE_URL);
    const validKey = (customSbKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (validUrl !== customSbUrl) setCustomSbUrl(validUrl);

    if (!validUrl || !validKey) {
      setSyncState({ status: 'offline', lastTime: null, error: 'Введите Project URL и Publishable Key' });
      return;
    }

    setSyncState({ status: 'loading', lastTime: null, error: null });
    try {
      const sb = createClient(validUrl, validKey);
      const { data, error } = await sb.from('materials_catalog').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        const nextCat = { ...DEFAULT_CATALOG };
        data.forEach((r) => {
          nextCat[r.id] = { ...(nextCat[r.id] || {}), ...r, searchQuery: nextCat[r.id]?.searchQuery || r.name };
        });
        setCatalog(nextCat);
      }
      setSyncState({ status: 'online', lastTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), error: null });
    } catch (err) {
      setSyncState({ status: 'error', lastTime: null, error: err.message });
    }
  };

  useEffect(() => {
    syncLivePricesFromSupabase();
  }, []);

  const calculation = useMemo(() => {
    const isApt = projectMode === 'apt1161';
    const totalFloorArea = isApt ? 60.6 : +(customRoom.length * customRoom.width).toFixed(2);
    const totalPerimeter = isApt ? 64.5 : +((customRoom.length + customRoom.width) * 2).toFixed(2);
    const wallHeight = isApt ? 2.8 : customRoom.height;
    const netWallArea = isApt ? 148.0 : Math.max(0, +(totalPerimeter * wallHeight - 4.0).toFixed(2));
    const socketsTotal = isApt ? 42 : 12;

    const getCat = (id) => catalog[id] || DEFAULT_CATALOG[id];
    const getPrice = (id, field) => Math.round(Number(getCat(id)?.[field] || DEFAULT_CATALOG[id]?.[field] || 500));

    const screedBags = Math.ceil((totalFloorArea * screedThickness * 1.9 * 1.03) / 40);
    const damperRolls = Math.ceil((totalPerimeter * 1.05) / 25);
    const plasterBags = Math.ceil((netWallArea * plasterThickness * 0.85 * 1.05) / 30);
    const primerCans = Math.ceil(((totalFloorArea + netWallArea * 2) * 0.18) / 10);
    const puttyBags = Math.ceil((netWallArea * 2.2) / 20);
    const paintBuckets = Math.max(1, Math.ceil(netWallArea / 42));
    const floorPacks = Math.ceil((totalFloorArea * 1.08) / 2.15);
    const cableCoils = Math.max(1, Math.ceil((socketsTotal * 7.5) / 100));

    const makeRow = (id, qty, formula) => {
      const c = getCat(id);
      return {
        id,
        name: c.name,
        searchQuery: c.searchQuery || c.name,
        unit: c.unit,
        qty,
        formula,
        weightKg: +(qty * Number(c.unit_weight_kg || 1)).toFixed(1),
        prices: {
          petrovich: getPrice(id, 'store_petrovich_price'),
          leroy: getPrice(id, 'store_leroy_price'),
          saturn: getPrice(id, 'store_saturn_price')
        }
      };
    };

    const items = [
      makeRow('screed_mix', screedBags, `Стяжка ${totalFloorArea} м² × ${screedThickness} мм`),
      makeRow('damper_tape', damperRolls, `Периметр ${totalPerimeter} м`),
      makeRow('plaster_rotband', plasterBags, `Стены ${netWallArea} м² × ${plasterThickness} мм`),
      makeRow('primer_deep', primerCans, `Грунтование в 2 слоя`),
      makeRow('putty_finish', puttyBags, `Финишная подготовка под покраску`),
      makeRow('wall_finish_unit', paintBuckets, `Покраска стен (${DESIGN_STYLES[designStyleKey].name})`),
      makeRow('floor_finish_pack', floorPacks, `Напольное покрытие с запасом +8%`),
      makeRow('cable_vvg_3x25', cableCoils, `Электромонтаж (${socketsTotal} электроточек)`),
      makeRow('socket_box', socketsTotal, `Подрозетники и механизмы по проекту`)
    ];

    if (isApt) {
      APT_1161_FURNITURE.forEach((f) => {
        items.push({
          id: f.id,
          name: `Мебель (Пом. №${f.room}): ${f.name} (${f.w}×${f.d} м)`,
          searchQuery: f.name,
          unit: 'шт.',
          qty: 1,
          formula: `По 3D-плану Квартиры №1161`,
          weightKg: 65,
          prices: { petrovich: f.price, leroy: Math.round(f.price * 0.95), saturn: Math.round(f.price * 0.97) }
        });
      });
    }

    const totalWeightKg = Math.round(items.reduce((s, i) => s + i.weightKg, 0));
    const totalWeightTons = +(totalWeightKg / 1000).toFixed(2);
    const totalWorksCost = Math.round(totalFloorArea * 11500);

    const stores = STORE_PROVIDERS.map((st) => {
      const materialsSum = items.reduce((s, it) => s + it.qty * it.prices[st.id], 0);
      const unloading = hasCargoLift ? Math.round(totalWeightTons * 1450) : Math.round(totalWeightTons * 950 * floorLevel);
      const logisticsCost = st.baseTruck + unloading;
      const totalWithDelivery = materialsSum + logisticsCost;
      return {
        ...st,
        materialsSum,
        logisticsCost,
        totalWithDelivery,
        foremanCommission: Math.round(materialsSum * st.cashbackPct),
        grandTotalProject: totalWithDelivery + totalWorksCost
      };
    });

    return { totalFloorArea, netWallArea, socketsTotal, items, totalWeightKg, totalWeightTons, totalWorksCost, stores };
  }, [projectMode, customRoom, screedThickness, plasterThickness, catalog, designStyleKey, floorLevel, hasCargoLift]);

  const currentStore = calculation.stores.find((s) => s.id === selectedStoreId) || calculation.stores[0];
  const activeStyle = DESIGN_STYLES[designStyleKey];

  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const yaw = (cam3D.yaw * Math.PI) / 180;
    const pitch = (cam3D.pitch * Math.PI) / 180;
    const scale = 36 * cam3D.zoom;
    const cx = 4.9;
    const cy = 3.4;

    const project = (x, y, z) => {
      const dx = x - cx;
      const dy = y - cy;
      const rx = dx * Math.cos(yaw) - dy * Math.sin(yaw);
      const ry = dx * Math.sin(yaw) + dy * Math.cos(yaw);
      return {
        x: W / 2 + rx * scale,
        y: H * 0.62 + (ry * Math.sin(pitch) - z * Math.cos(pitch)) * scale
      };
    };

    const drawPolygon = (pts, fill, stroke = '#475569', lw = 1.5) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    };

    APT_1161_ROOMS.forEach((r) => {
      const p0 = project(r.x, r.y, 0);
      const p1 = project(r.x + r.w, r.y, 0);
      const p2 = project(r.x + r.w, r.y + r.d, 0);
      const p3 = project(r.x, r.y + r.d, 0);
      drawPolygon([p0, p1, p2, p3], activeStyle.floorHex + '44', '#94a3b8', 2);

      const w0 = project(r.x, r.y, 2.75);
      const w1 = project(r.x + r.w, r.y, 2.75);
      const w2 = project(r.x + r.w, r.y + r.d, 2.75);
      const w3 = project(r.x, r.y + r.d, 2.75);
      drawPolygon([p0, p1, w1, w0], activeStyle.wallHex + '22', '#64748b', 1);
      drawPolygon([p0, p3, w3, w0], activeStyle.wallHex + '18', '#64748b', 1);
      drawPolygon([w0, w1, w2, w3], null, 'rgba(245, 158, 11, 0.3)', 1);

      const center = project(r.x + r.w / 2, r.y + r.d / 2, 0);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`№${r.num} (${r.area} м²)`, center.x, center.y);
    });

    if (cam3D.showFurniture) {
      APT_1161_FURNITURE.forEach((f) => {
        const b0 = project(f.x, f.y, 0), b1 = project(f.x + f.w, f.y, 0), b2 = project(f.x + f.w, f.y + f.d, 0), b3 = project(f.x, f.y + f.d, 0);
        const t0 = project(f.x, f.y, f.h), t1 = project(f.x + f.w, f.y, f.h), t2 = project(f.x + f.w, f.y + f.d, f.h), t3 = project(f.x, f.y + f.d, f.h);
        drawPolygon([b0, b1, t1, t0], f.color + '66', f.color, 1.2);
        drawPolygon([b1, b2, t2, t1], f.color + '55', f.color, 1.2);
        drawPolygon([b3, b2, t2, t3], f.color + '77', f.color, 1.2);
        drawPolygon([t0, t1, t2, t3], f.color + '99', '#ffffff', 1.4);
      });
    }

    if (cam3D.showSockets) {
      APT_1161_SOCKETS.forEach((s) => {
        const pFloor = project(s.x, s.y, 0);
        const p3d = project(s.x, s.y, s.z);
        ctx.save();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = '#fbbf24';
        ctx.beginPath(); ctx.moveTo(pFloor.x, pFloor.y); ctx.lineTo(p3d.x, p3d.y); ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(p3d.x, p3d.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = s.type === 'heavy' ? '#ef4444' : s.type === 'wet' ? '#06b6d4' : '#2563eb';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }
    ctx.textAlign = 'start';
  }, [cam3D, designStyleKey, activeTab, projectMode]);

  const generateOrderText = () => {
    const lines = [
      `📋 ПРОЕКТ И СМЕТА — ${projectMode === 'apt1161' ? 'Квартира №1161 (60.6 м²)' : customRoom.name}`,
      `Дизайн-концепция: ${activeStyle.name}`,
      `База комплектации: ${currentStore.name}`,
      `Общий вес материалов: ${calculation.totalWeightTons} т (этаж ${floorLevel})`,
      `----------------------------------------`
    ];
    calculation.items.forEach((it, idx) => {
      const p = it.prices[selectedStoreId];
      lines.push(`${idx + 1}. ${it.name} — ${it.qty} ${it.unit} × ${p} ₽ = ${(it.qty * p).toLocaleString('ru-RU')} ₽`);
    });
    lines.push(`----------------------------------------`);
    lines.push(`ИТОГО МАТЕРИАЛЫ И МЕБЕЛЬ: ${currentStore.materialsSum.toLocaleString('ru-RU')} ₽`);
    lines.push(`ДОСТАВКА И ПОДЪЕМ: ${currentStore.logisticsCost.toLocaleString('ru-RU')} ₽`);
    lines.push(`РАБОТЫ ПО ПРОЕКТУ: ${calculation.totalWorksCost.toLocaleString('ru-RU')} ₽`);
    lines.push(`ВСЕГО ПОД КЛЮЧ: ${currentStore.grandTotalProject.toLocaleString('ru-RU')} ₽`);
    return lines.join('\n');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight">
                СметаПро <span className="text-amber-400">3D CAD & Design</span>
              </h1>
              <div className="text-[11px] text-slate-400">
                {projectMode === 'apt1161' ? 'Квартира №1161 (60.6 м² • 7 помещений)' : `${customRoom.name} (${calculation.totalFloorArea} м²)`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex">
              <button
                onClick={() => setProjectMode('apt1161')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  projectMode === 'apt1161' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Квартира №1161 (3D)
              </button>
              <button
                onClick={() => setProjectMode('custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  projectMode === 'custom' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Свой замер
              </button>
            </div>

            <button
              onClick={() => setShowCloudModal(true)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                syncState.status === 'online'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-amber-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              {syncState.status === 'online' ? 'Supabase Live' : 'Онлайн API'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-4 space-y-4">
        {activeTab === 'cad' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-400" />
                    3D-Проект Квартиры №1161: Мебель, Розетки и Дизайн
                  </h2>
                  <p className="text-xs text-slate-400">
                    Помещения: №4 Гостиная (18.8 м²), №5 Кухня (12.2 м²), №6 Спальня (16.0 м²), №1 Прихожая (2.8 м²), №7 Коридор (2.2 м²), №2 Ванная (5.6 м²), №3 Санузел (3.0 м²)
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => setCam3D((c) => ({ ...c, yaw: c.yaw - 18 }))} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-bold">⟲ Вращать</button>
                  <button onClick={() => setCam3D((c) => ({ ...c, yaw: c.yaw + 18 }))} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-bold">⟳ Вращать</button>
                  <button onClick={() => setCam3D((c) => ({ ...c, showSockets: !c.showSockets }))} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${cam3D.showSockets ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    ⚡ Розетки ({APT_1161_SOCKETS.length} узлов)
                  </button>
                  <button onClick={() => setCam3D((c) => ({ ...c, showFurniture: !c.showFurniture }))} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${cam3D.showFurniture ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    🛋 Мебель ({APT_1161_FURNITURE.length} поз.)
                  </button>
                </div>
              </div>

              <canvas
                ref={canvasRef}
                width={760}
                height={420}
                className="w-full h-auto bg-slate-950 rounded-xl border border-slate-800"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                Дизайн-проект интерьера (переключение отделки в 3D и смете):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {Object.entries(DESIGN_STYLES).map(([key, st]) => (
                  <button
                    key={key}
                    onClick={() => setDesignStyleKey(key)}
                    className={`p-3 rounded-xl border text-left transition ${
                      designStyleKey === key ? 'bg-amber-500/15 border-amber-500' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-400">{st.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{st.wallsDesc}</div>
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div><b>Стены:</b> {activeStyle.wallsDesc}</div>
                <div><b>Пол:</b> {activeStyle.floorDesc}</div>
                <div><b>Освещение:</b> {activeStyle.lightDesc}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Карта привязки розеток и высот монтажа (Квартира №1161):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {APT_1161_SOCKETS.map((s) => (
                  <div key={s.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-100">{s.name}</div>
                      <div className="text-[11px] text-slate-400">Координаты: X={s.x} м, Y={s.y} м</div>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-bold">
                      H = {Math.round(s.z * 100)} см
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pies' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h2 className="text-base font-bold">Строительные пироги и нормы расхода</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Толщина стяжки пола:</span>
                  <b className="text-amber-400">{screedThickness} мм</b>
                </div>
                <input type="range" min="20" max="90" step="5" value={screedThickness} onChange={(e) => setScreedThickness(Number(e.target.value))} className="w-full accent-amber-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Слой штукатурки по маякам:</span>
                  <b className="text-amber-400">{plasterThickness} мм</b>
                </div>
                <input type="range" min="10" max="35" step="5" value={plasterThickness} onChange={(e) => setPlasterThickness(Number(e.target.value))} className="w-full accent-amber-500" />
              </div>
            </div>
            <div className="space-y-2">
              {calculation.items.map((it) => (
                <div key={it.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-slate-100">{it.name}</div>
                    <div className="text-slate-400">{it.formula}</div>
                  </div>
                  <div className="text-right font-bold text-emerald-400">
                    {it.qty} {it.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stores' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold">Сравнение цен стройбаз и прямой заказ</h2>
              <button onClick={syncLivePricesFromSupabase} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-xs font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Синхронизировать Supabase
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {calculation.stores.map((st) => (
                <div
                  key={st.id}
                  onClick={() => setSelectedStoreId(st.id)}
                  className={`p-4 rounded-2xl border cursor-pointer ${
                    st.id === selectedStoreId ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm">{st.name}</div>
                      <div className="text-xs text-slate-400">{st.badge}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-amber-400">{st.totalWithDelivery.toLocaleString('ru-RU')} ₽</div>
                      <div className="text-[11px] text-slate-400">С доставкой ({calculation.totalWeightTons} т)</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 divide-y divide-slate-800">
              {calculation.items.map((it) => (
                <div key={it.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-slate-400">{it.qty} {it.unit} × {it.prices[selectedStoreId].toLocaleString('ru-RU')} ₽</div>
                  </div>
                  <a
                    href={currentStore.buildSearchUrl(it.searchQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center gap-1 shrink-0"
                  >
                    На сайт <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'estimate' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold">Итоговая смета проекта</h2>
              <button onClick={() => setShowOrderModal(true)} className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Поделиться / Отправить в Telegram
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between"><span>Материалы и мебель:</span><b>{currentStore.materialsSum.toLocaleString('ru-RU')} ₽</b></div>
              <div className="flex justify-between"><span>Доставка и подъем ({calculation.totalWeightTons} т):</span><b>{currentStore.logisticsCost.toLocaleString('ru-RU')} ₽</b></div>
              <div className="flex justify-between"><span>Строительно-монтажные работы:</span><b>{calculation.totalWorksCost.toLocaleString('ru-RU')} ₽</b></div>
              <div className="flex justify-between text-sm font-black text-amber-400 pt-2 border-t border-slate-800">
                <span>ИТОГО ПО ПРОЕКТУ:</span>
                <span>{currentStore.grandTotalProject.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {showCloudModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Настройка Supabase Live API</h3>
              <button onClick={() => setShowCloudModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <input
              type="text"
              value={customSbUrl}
              onChange={(e) => setCustomSbUrl(cleanSupabaseUrl(e.target.value))}
              placeholder="https://rfdwxmbpjnhvavmoxzpq.supabase.co"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs"
            />
            <input
              type="password"
              value={customSbKey}
              onChange={(e) => setCustomSbKey(e.target.value)}
              placeholder="Publishable / Anon Key"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs"
            />
            {syncState.error && <div className="text-xs text-rose-400">{syncState.error}</div>}
            <button onClick={syncLivePricesFromSupabase} className="w-full py-2.5 rounded-xl bg-emerald-600 font-bold text-xs">
              Проверить и загрузить цены
            </button>
          </div>
        </div>
      )}

      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Отправка сметы и 3D-проекта</h3>
              <button onClick={() => setShowOrderModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <textarea readOnly rows={8} value={generateOrderText()} className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-[11px] font-mono" />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(generateOrderText()); setCopiedSpec(true); }}
                className="py-2.5 rounded-xl bg-slate-800 text-xs font-bold flex items-center justify-center gap-1"
              >
                {copiedSpec ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedSpec ? 'Скопировано!' : 'Скопировать текст'}
              </button>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent('https://petrovich.ru')}&text=${encodeURIComponent(generateOrderText())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Send className="w-4 h-4" /> В Telegram
              </a>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 border-t border-slate-800">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {[
            { id: 'cad', label: '1. 3D Проект', icon: Box },
            { id: 'pies', label: '2. Пироги', icon: Layers },
            { id: 'stores', label: '3. Магазины', icon: ShoppingCart },
            { id: 'estimate', label: '4. Смета', icon: FileSpreadsheet }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-2.5 flex flex-col items-center gap-1 text-[11px] font-bold ${
                  activeTab === t.id ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
