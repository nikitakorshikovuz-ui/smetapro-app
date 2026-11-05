import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Ruler, Layers, ShoppingCart, FileSpreadsheet, Mic, Plus, Trash2, RotateCw,
  CheckCircle2, Truck, Building2, Eye, EyeOff, RefreshCw, Printer, Sparkles,
  Box, AlertTriangle, ExternalLink, Send, Database, Settings, X, Copy, Check
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Хук энергонезависимого сохранения проекта в памяти смартфона
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
      console.warn('Storage error:', e);
    }
  }, [key, value]);

  return [value, setValue];
}

// Эталонный каталог по умолчанию (используется до синхронизации с Supabase и при отсутствии сети)
const DEFAULT_CATALOG = {
  screed_mix: {
    id: 'screed_mix',
    category: 'Черновой пол',
    name: 'Пескобетон М300 Русеан / Ровнитель (мешок 40 кг)',
    searchQuery: 'Пескобетон М300 40 кг',
    unit: 'меш.',
    pack_size: 40,
    unit_weight_kg: 40,
    store_petrovich_price: 365,
    store_leroy_price: 348,
    store_saturn_price: 335
  },
  damper_tape: {
    id: 'damper_tape',
    category: 'Черновой пол',
    name: 'Демпферная кромочная лента 100 мм (рулон 25 м)',
    searchQuery: 'Демпферная лента 100 мм 25 м',
    unit: 'рул.',
    pack_size: 25,
    unit_weight_kg: 0.8,
    store_petrovich_price: 450,
    store_leroy_price: 390,
    store_saturn_price: 410
  },
  plaster_rotband: {
    id: 'plaster_rotband',
    category: 'Черновые стены',
    name: 'Штукатурка гипсовая Knauf Ротбанд / Волма Слой (30 кг)',
    searchQuery: 'Штукатурка гипсовая Knauf Ротбанд 30 кг',
    unit: 'меш.',
    pack_size: 30,
    unit_weight_kg: 30,
    store_petrovich_price: 595,
    store_leroy_price: 568,
    store_saturn_price: 545
  },
  beacons_6mm: {
    id: 'beacons_6mm',
    category: 'Черновые стены',
    name: 'Маяк штукатурный оцинкованный 6 мм (3 м)',
    searchQuery: 'Маяк штукатурный 6 мм 3 м',
    unit: 'шт.',
    pack_size: 1,
    unit_weight_kg: 0.25,
    store_petrovich_price: 95,
    store_leroy_price: 78,
    store_saturn_price: 82
  },
  primer_deep: {
    id: 'primer_deep',
    category: 'Грунтовки',
    name: 'Грунтовка глубокого проникновения Knauf Тифенгрунд (10 л)',
    searchQuery: 'Грунтовка Knauf Тифенгрунд 10 л',
    unit: 'кан.',
    pack_size: 10,
    unit_weight_kg: 10.5,
    store_petrovich_price: 1390,
    store_leroy_price: 1290,
    store_saturn_price: 1340
  },
  putty_finish: {
    id: 'putty_finish',
    category: 'Чистовые стены',
    name: 'Шпаклевка полимерная финишная Weber Vetonit LR+ (20 кг)',
    searchQuery: 'Шпаклевка Vetonit LR+ 20 кг',
    unit: 'меш.',
    pack_size: 20,
    unit_weight_kg: 20,
    store_petrovich_price: 1180,
    store_leroy_price: 1090,
    store_saturn_price: 1120
  },
  wall_finish_unit: {
    id: 'wall_finish_unit',
    category: 'Чистовые стены',
    name: 'Краска интерьерная моющаяся Dulux / Tikkurila (ведро 9 л)',
    searchQuery: 'Краска интерьерная Dulux 9 л',
    unit: 'ведро',
    pack_size: 9,
    unit_weight_kg: 12,
    store_petrovich_price: 5890,
    store_leroy_price: 5490,
    store_saturn_price: 5650
  },
  floor_finish_pack: {
    id: 'floor_finish_pack',
    category: 'Чистовой пол',
    name: 'Кварцвинил / Ламинат 33 класс фаска 4V (уп. 2.15 м²)',
    searchQuery: 'Кварцвинил ламинат 33 класс упаковка',
    unit: 'уп.',
    pack_size: 2.15,
    unit_weight_kg: 16.5,
    store_petrovich_price: 3150,
    store_leroy_price: 2890,
    store_saturn_price: 2990
  },
  underlay_pack: {
    id: 'underlay_pack',
    category: 'Чистовой пол',
    name: 'Подложка демпфирующая XPS 3 мм (уп. 5.5 м²)',
    searchQuery: 'Подложка под ламинат 3 мм',
    unit: 'уп.',
    pack_size: 5.5,
    unit_weight_kg: 1.5,
    store_petrovich_price: 890,
    store_leroy_price: 790,
    store_saturn_price: 840
  },
  cable_vvg_3x25: {
    id: 'cable_vvg_3x25',
    category: 'Электрика',
    name: 'Кабель силовой ВВГнг(А)-LS 3х2.5 ГОСТ (бухта 100 м)',
    searchQuery: 'Кабель ВВГнг-LS 3х2.5 100 м',
    unit: 'бухта',
    pack_size: 100,
    unit_weight_kg: 13.5,
    store_petrovich_price: 8450,
    store_leroy_price: 7990,
    store_saturn_price: 7850
  },
  socket_box: {
    id: 'socket_box',
    category: 'Электрика',
    name: 'Подрозетник Schneider Electric 68х45 + механизм розетки',
    searchQuery: 'Розетка Schneider Electric встраиваемая',
    unit: 'компл.',
    pack_size: 1,
    unit_weight_kg: 0.2,
    store_petrovich_price: 480,
    store_leroy_price: 430,
    store_saturn_price: 450
  }
};

// Ссылки на реальные онлайн-витрины поставщиков для мгновенной проверки цен и заказа
const STORE_PROVIDERS = [
  {
    id: 'petrovich',
    name: 'СТД «Петрович»',
    priceField: 'store_petrovich_price',
    badge: 'Экспресс-доставка за 2 часа • Клуб Друзей',
    baseTruck: 2400,
    cashbackPct: 0.08,
    buildSearchUrl: (q) => `https://petrovich.ru/search/?q=${encodeURIComponent(q)}`
  },
  {
    id: 'leroy',
    name: 'Лемана ПРО (Леруа Мерлен)',
    priceField: 'store_leroy_price',
    badge: 'Низкие розничные цены DIY • Доставка от 1 дня',
    baseTruck: 2900,
    cashbackPct: 0.05,
    buildSearchUrl: (q) => `https://lemanapro.ru/search/?q=${encodeURIComponent(q)}`
  },
  {
    id: 'saturn',
    name: 'Сатурн СтройБаза / ВсеИнструменты',
    priceField: 'store_saturn_price',
    badge: 'Оптовый прайс для бригад • Комплектация',
    baseTruck: 2600,
    cashbackPct: 0.10,
    buildSearchUrl: (q) => `https://www.vseinstrumenti.ru/search/?what=${encodeURIComponent(q)}`
  }
];

const ROOM_PRESETS = [
  {
    title: 'Гостиная 26 м² (Новостройка в бетоне)',
    data: { name: 'Гостиная 26 м² (Бетон)', length: 6.5, width: 4.0, height: 2.85, doors: 1, windows: 1, screedThickness: 50, plasterThickness: 20, layoutAngle: 'diagonal', tier: 'standard' }
  },
  {
    title: 'Спальня 15.2 м² (Косметический ремонт)',
    data: { name: 'Спальня 15.2 м²', length: 4.0, width: 3.8, height: 2.7, doors: 1, windows: 1, screedThickness: 20, plasterThickness: 10, layoutAngle: 'straight', tier: 'econom' }
  },
  {
    title: 'Кухня-гостиная 32 м² (Загородный дом)',
    data: { name: 'Кухня-гостиная 32 м² (Коттедж)', length: 8.0, width: 4.0, height: 3.1, doors: 2, windows: 2, screedThickness: 70, plasterThickness: 25, layoutAngle: 'diagonal', tier: 'premium' }
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('cad');
  const [viewMode, setViewMode] = useState('split'); // '2d' | '3d' | 'split'
  const [camAngle, setCamAngle] = useState({ yaw: 38, pitch: 28, zoom: 1.0 });

  const [room, setRoom] = useStickyState({
    name: 'Гостиная 26 м² (ЖК Светлый)',
    length: 6.5,
    width: 4.0,
    height: 2.85,
    doors: 1,
    windows: 1
  }, 'smetapro_v3_room');

  const [screedThickness, setScreedThickness] = useStickyState(50, 'smetapro_v3_screed');
  const [plasterThickness, setPlasterThickness] = useStickyState(20, 'smetapro_v3_plaster');
  const [layoutAngle, setLayoutAngle] = useStickyState('straight', 'smetapro_v3_angle');
  const [tier, setTier] = useStickyState('standard', 'smetapro_v3_tier');
  const [floorLevel, setFloorLevel] = useStickyState(5, 'smetapro_v3_floor');
  const [hasCargoLift, setHasCargoLift] = useStickyState(true, 'smetapro_v3_lift');
  const [selectedStoreId, setSelectedStoreId] = useStickyState('leroy', 'smetapro_v3_store');
  const [foremanMode, setForemanMode] = useStickyState(false, 'smetapro_v3_foreman');

  // Объекты на 2D/3D плане с высотами монтажа Z (в метрах)
  const [elements, setElements] = useStickyState([
    { id: 'el-1', kind: 'point', type: 'socket', label: 'Р', name: 'Розетка 220В', x: 1.1, y: 0.2, z: 0.3 },
    { id: 'el-2', kind: 'point', type: 'socket', label: 'Р', name: 'Блок розеток ТВ', x: 3.2, y: 0.2, z: 0.9 },
    { id: 'el-3', kind: 'point', type: 'switch', label: 'В', name: 'Выключатель света', x: 0.4, y: 3.6, z: 0.9 },
    { id: 'el-4', kind: 'point', type: 'water', label: 'ГВС', name: 'Вывод воды / Радиатор', x: 5.8, y: 0.3, z: 0.5 },
    { id: 'el-5', kind: 'furniture', type: 'wardrobe', name: 'Шкаф-купе ЛДСП Egger', w: 2.2, d: 0.65, h: 2.4, x: 3.8, y: 0.15, price: 68000, weight: 145 },
    { id: 'el-6', kind: 'furniture', type: 'sofa', name: 'Диван угловой Велюр', w: 2.4, d: 1.05, h: 0.85, x: 1.4, y: 2.6, price: 54000, weight: 85 }
  ], 'smetapro_v3_elements');

  const [pendingTool, setPendingTool] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);

  // Живая облачная БД Supabase + ручные настройки ключей
  const [customSbUrl, setCustomSbUrl] = useStickyState(import.meta.env.VITE_SUPABASE_URL || '', 'smetapro_sb_url');
  const [customSbKey, setCustomSbKey] = useStickyState(import.meta.env.VITE_SUPABASE_ANON_KEY || '', 'smetapro_sb_key');
  const [customDeepseekKey, setCustomDeepseekKey] = useStickyState(import.meta.env.VITE_DEEPSEEK_API_KEY || '', 'smetapro_ds_key');

  const [catalog, setCatalog] = useStickyState(DEFAULT_CATALOG, 'smetapro_v3_catalog');
  const [syncState, setSyncState] = useState({ status: 'idle', source: 'local', lastTime: null, error: null });
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [copiedSpec, setCopiedSpec] = useState(false);

  // Функция живой синхронизации с таблицей materials_catalog в Supabase
  const syncLivePricesFromSupabase = async () => {
    const activeUrl = (customSbUrl || import.meta.env.VITE_SUPABASE_URL || '').trim();
    const activeKey = (customSbKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

    if (!activeUrl || !activeKey) {
      setSyncState({
        status: 'offline',
        source: 'local',
        lastTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        error: 'Не указаны ключи Supabase (работаем по встроенному прайсу)'
      });
      return;
    }

    setSyncState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const sb = createClient(activeUrl, activeKey);
      const { data, error } = await sb.from('materials_catalog').select('*');
      if (error) throw error;

      if (data && data.length > 0) {
        const merged = { ...DEFAULT_CATALOG };
        data.forEach((row) => {
          merged[row.id] = {
            ...(merged[row.id] || {}),
            ...row,
            searchQuery: merged[row.id]?.searchQuery || row.name
          };
        });
        setCatalog(merged);
        setSyncState({
          status: 'online',
          source: 'supabase',
          lastTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          error: null
        });
      } else {
        setSyncState({
          status: 'online',
          source: 'supabase-empty',
          lastTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          error: 'Таблица materials_catalog пуста, запустите SQL-скрипт'
        });
      }
    } catch (err) {
      setSyncState({
        status: 'error',
        source: 'cache',
        lastTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        error: err.message || 'Ошибка соединения с Supabase'
      });
    }
  };

  useEffect(() => {
    syncLivePricesFromSupabase();
  }, []);

  // Расчет чистой геометрии комнаты
  const geometry = useMemo(() => {
    const floorArea = +(room.length * room.width).toFixed(2);
    const perimeter = +((room.length + room.width) * 2).toFixed(2);
    const openingsArea = +(room.doors * 1.8 + room.windows * 2.25).toFixed(2);
    const netWallArea = Math.max(0, +(perimeter * room.height - openingsArea).toFixed(2));
    return { floorArea, perimeter, openingsArea, netWallArea };
  }, [room]);

  // Детектор строительных 3D-коллизий (перекрытие розеток/выключателей крупной мебелью)
  const collisions = useMemo(() => {
    const list = [];
    const points = elements.filter((e) => e.kind === 'point');
    const furniture = elements.filter((e) => e.kind === 'furniture');

    points.forEach((pt) => {
      furniture.forEach((fn) => {
        const overlapX = pt.x >= fn.x - 0.15 && pt.x <= fn.x + fn.w + 0.15;
        const overlapY = pt.y >= fn.y - 0.15 && pt.y <= fn.y + fn.d + 0.15;
        const overlapZ = (pt.z || 0.3) <= (fn.h || 2.0);
        if (overlapX && overlapY && overlapZ) {
          list.push({
            pointId: pt.id,
            furnId: fn.id,
            message: `Коллизия: «${fn.name}» перекрывает точку «${pt.name}» (высота ${Math.round((pt.z || 0.3) * 100)} см)`
          });
        }
      });
    });
    return list;
  }, [elements]);

  // Расчет сметы материалов с учетом запаса на подрезку и кратности упаковок
  const calculation = useMemo(() => {
    const tierMult = tier === 'econom' ? 0.85 : tier === 'premium' ? 1.35 : 1.0;
    const cutWaste = layoutAngle === 'diagonal' ? 1.12 : 1.05;

    const getCatalogItem = (id) => catalog[id] || DEFAULT_CATALOG[id];
    const getStorePrice = (id, storeKey) => {
      const item = getCatalogItem(id);
      const raw = Number(item?.[storeKey] || DEFAULT_CATALOG[id]?.[storeKey] || 500);
      return Math.round(raw * tierMult);
    };

    const socketsCount = elements.filter((e) => e.type === 'socket' || e.type === 'switch').length;
    const waterCount = elements.filter((e) => e.type === 'water').length;
    const furnitureList = elements.filter((e) => e.kind === 'furniture');

    // Формулы расхода с округлением вверх до заводской тары
    const screedBags = Math.ceil((geometry.floorArea * screedThickness * 1.9 * 1.03) / 40);
    const damperRolls = Math.ceil((geometry.perimeter * 1.05) / 25);
    const plasterBags = Math.ceil((geometry.netWallArea * plasterThickness * 0.85 * 1.05) / 30);
    const beaconsCount = Math.ceil(geometry.perimeter / 1.3);
    const primerCans = Math.ceil(((geometry.floorArea + geometry.netWallArea * 2) * 0.18) / 10);
    const puttyBags = Math.ceil((geometry.netWallArea * 2.2) / 20);
    const paintBuckets = Math.max(1, Math.ceil(geometry.netWallArea / 42));
    const floorPacks = Math.ceil((geometry.floorArea * cutWaste) / 2.15);
    const underlayPacks = Math.ceil((geometry.floorArea * 1.05) / 5.5);
    const cableMeters = Math.max(1, socketsCount) * 7.5 + geometry.perimeter * 0.8;
    const cableCoils = Math.max(1, Math.ceil(cableMeters / 100));

    const buildRow = (id, qty, customFormula) => {
      const cat = getCatalogItem(id);
      return {
        id,
        name: cat.name,
        searchQuery: cat.searchQuery || cat.name,
        unit: cat.unit,
        qty,
        formula: customFormula,
        weightKg: +(qty * Number(cat.unit_weight_kg || 1)).toFixed(1),
        prices: {
          petrovich: getStorePrice(id, 'store_petrovich_price'),
          leroy: getStorePrice(id, 'store_leroy_price'),
          saturn: getStorePrice(id, 'store_saturn_price')
        }
      };
    };

    const items = [
      buildRow('screed_mix', screedBags, `${geometry.floorArea} м² × ${screedThickness} мм (мешки по 40 кг)`),
      buildRow('damper_tape', damperRolls, `Периметр ${geometry.perimeter} пог.м (рулон 25 м)`),
      buildRow('plaster_rotband', plasterBags, `Стены ${geometry.netWallArea} м² × слой ${plasterThickness} мм`),
      buildRow('beacons_6mm', beaconsCount, `Шаг маяков 1.3 м по периметру`),
      buildRow('primer_deep', primerCans, `Грунтование пола и стен в 2 слоя`),
      buildRow('putty_finish', puttyBags, `Финишное шпаклевание ${geometry.netWallArea} м²`),
      buildRow('wall_finish_unit', paintBuckets, `Покраска стен в 2 слоя (${geometry.netWallArea} м²)`),
      buildRow('floor_finish_pack', floorPacks, `Пол ${geometry.floorArea} м² × запас ${layoutAngle === 'diagonal' ? '+12%' : '+5%'}`),
      buildRow('underlay_pack', underlayPacks, `Подложка под чистовой пол`),
      buildRow('cable_vvg_3x25', cableCoils, `Трасса ${Math.round(cableMeters)} м (бухта 100 м)`),
      buildRow('socket_box', Math.max(1, socketsCount), `Точки на 2D/3D плане: ${Math.max(1, socketsCount)} шт.`)
    ];

    furnitureList.forEach((f) => {
      items.push({
        id: f.id,
        name: `3D-Мебель: ${f.name} (${f.w}×${f.d}×${f.h} м)`,
        searchQuery: f.name,
        unit: 'компл.',
        qty: 1,
        formula: 'Корпусный модуль по 3D-разметке',
        weightKg: f.weight || 110,
        prices: {
          petrovich: Math.round(f.price * tierMult),
          leroy: Math.round(f.price * 0.95 * tierMult),
          saturn: Math.round(f.price * 0.97 * tierMult)
        }
      });
    });

    const totalWeightKg = Math.round(items.reduce((sum, i) => sum + i.weightKg, 0));
    const totalWeightTons = +(totalWeightKg / 1000).toFixed(2);

    const works = [
      { name: 'Устройство цементно-песчаной стяжки пола по маякам', qty: geometry.floorArea, unit: 'м²', rate: 850 },
      { name: 'Выравнивание стен гипсовой штукатуркой по маякам 90°', qty: geometry.netWallArea, unit: 'м²', rate: 790 },
      { name: 'Шпаклевание, шлифовка и покраска стен в 2 слоя', qty: geometry.netWallArea, unit: 'м²', rate: 920 },
      { name: `Укладка чистового пола (${layoutAngle === 'diagonal' ? 'диагональ/елочка' : 'прямая'}) + плинтус`, qty: geometry.floorArea, unit: 'м²', rate: layoutAngle === 'diagonal' ? 880 : 650 },
      { name: 'Алмазное штробление, прокладка кабеля по ГОСТ и вмазка подрозетников', qty: Math.max(1, socketsCount), unit: 'точ.', rate: 1850 },
      { name: 'Разводка водоснабжения (ХВС/ГВС) и канализации с опрессовкой', qty: Math.max(1, waterCount), unit: 'уз.', rate: 4200 },
      { name: 'Сборка и установка корпусной мебели по 3D-проекту', qty: furnitureList.length, unit: 'ед.', rate: 5200 }
    ];

    const totalWorksCost = Math.round(works.reduce((sum, w) => sum + w.qty * w.rate, 0));

    const stores = STORE_PROVIDERS.map((st) => {
      const materialsSum = items.reduce((sum, it) => sum + it.qty * it.prices[st.id], 0);
      const unloadingCost = hasCargoLift
        ? Math.round(totalWeightTons * 1450)
        : Math.round(totalWeightTons * 950 * floorLevel);
      const logisticsCost = st.baseTruck + unloadingCost;
      const totalWithDelivery = materialsSum + logisticsCost;
      const foremanCommission = Math.round(materialsSum * st.cashbackPct);
      return {
        ...st,
        materialsSum,
        logisticsCost,
        totalWithDelivery,
        foremanCommission,
        grandTotalProject: totalWithDelivery + totalWorksCost
      };
    });

    return { items, works, totalWeightKg, totalWeightTons, totalWorksCost, stores };
  }, [geometry, screedThickness, plasterThickness, layoutAngle, tier, elements, catalog, floorLevel, hasCargoLift]);

  const currentStore = calculation.stores.find((s) => s.id === selectedStoreId) || calculation.stores[0];

  // Изометрический 3D-рендер на HTML5 Canvas (работает мгновенно на любом Android без внешних скриптов)
  const canvas3dRef = useRef(null);

  useEffect(() => {
    const canvas = canvas3dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const yawRad = (camAngle.yaw * Math.PI) / 180;
    const pitchRad = (camAngle.pitch * Math.PI) / 180;
    const scale = Math.min(W, H) / (Math.max(room.length, room.width, room.height) * 1.65) * camAngle.zoom;

    const cx = room.length / 2;
    const cy = room.width / 2;

    const project = (x, y, z) => {
      const dx = x - cx;
      const dy = y - cy;
      const rx = dx * Math.cos(yawRad) - dy * Math.sin(yawRad);
      const ry = dx * Math.sin(yawRad) + dy * Math.cos(yawRad);
      const px = W / 2 + rx * scale;
      const py = H * 0.68 + (ry * Math.sin(pitchRad) - z * Math.cos(pitchRad)) * scale;
      return { x: px, y: py };
    };

    const drawPoly = (pts, fill, stroke = '#475569', lineWidth = 1.5) => {
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    // 1. Пол комнаты
    const f0 = project(0, 0, 0);
    const f1 = project(room.length, 0, 0);
    const f2 = project(room.length, room.width, 0);
    const f3 = project(0, room.width, 0);
    drawPoly([f0, f1, f2, f3], '#1e293b', '#f59e0b', 2);

    // Сетка пола 1x1 м
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 1;
    for (let x = 1; x < room.length; x++) {
      const pA = project(x, 0, 0);
      const pB = project(x, room.width, 0);
      ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y); ctx.stroke();
    }
    for (let y = 1; y < room.width; y++) {
      const pA = project(0, y, 0);
      const pB = project(room.length, y, 0);
      ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y); ctx.stroke();
    }

    // 2. Дальние стены в полупрозрачном объеме
    const w0 = project(0, 0, room.height);
    const w1 = project(room.length, 0, room.height);
    const w2 = project(room.length, room.width, room.height);
    const w3 = project(0, room.width, room.height);

    drawPoly([f0, f1, w1, w0], 'rgba(30, 41, 59, 0.55)', '#64748b', 1.2);
    drawPoly([f0, f3, w3, w0], 'rgba(15, 23, 42, 0.55)', '#64748b', 1.2);
    drawPoly([w0, w1, w2, w3], null, 'rgba(245, 158, 11, 0.35)', 1);

    // 3. Отрисовка 3D-мебели (параллелепипеды)
    elements.filter((e) => e.kind === 'furniture').forEach((fn) => {
      const hasCol = collisions.some((c) => c.furnId === fn.id);
      const isSel = selectedElementId === fn.id;
      const x0 = fn.x, x1 = fn.x + fn.w;
      const y0 = fn.y, y1 = fn.y + fn.d;
      const z0 = 0, z1 = fn.h || 2.0;

      const b0 = project(x0, y0, z0), b1 = project(x1, y0, z0), b2 = project(x1, y1, z0), b3 = project(x0, y1, z0);
      const t0 = project(x0, y0, z1), t1 = project(x1, y0, z1), t2 = project(x1, y1, z1), t3 = project(x0, y1, z1);

      const baseFill = hasCol ? 'rgba(239, 68, 68, 0.45)' : isSel ? 'rgba(245, 158, 11, 0.45)' : 'rgba(79, 70, 229, 0.42)';
      const strokeCol = hasCol ? '#ef4444' : isSel ? '#fbbf24' : '#818cf8';

      drawPoly([b0, b1, t1, t0], baseFill, strokeCol, 1.4);
      drawPoly([b1, b2, t2, t1], baseFill, strokeCol, 1.4);
      drawPoly([b3, b2, t2, t3], baseFill, strokeCol, 1.4);
      drawPoly([b0, b3, t3, t0], baseFill, strokeCol, 1.4);
      drawPoly([t0, t1, t2, t3], baseFill, strokeCol, 1.8);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(fn.name.slice(0, 16), t0.x + 4, t0.y + 12);
    });

    // 4. Отрисовка инженерных точек на высоте Z с лазерным отвесом до пола
    elements.filter((e) => e.kind === 'point').forEach((pt) => {
      const zVal = pt.z || 0.3;
      const pFloor = project(pt.x, pt.y, 0);
      const p3d = project(pt.x, pt.y, zVal);
      const hasCol = collisions.some((c) => c.pointId === pt.id);

      // Лазерный отвес от точки до пола
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = hasCol ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(pFloor.x, pFloor.y);
      ctx.lineTo(p3d.x, p3d.y);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(p3d.x, p3d.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = hasCol ? '#dc2626' : pt.type === 'socket' ? '#2563eb' : pt.type === 'switch' ? '#059669' : '#0891b2';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pt.label, p3d.x, p3d.y + 3);
      ctx.textAlign = 'start';
    });
  }, [room, elements, camAngle, selectedElementId, collisions, activeTab, viewMode]);

  const handle2DCanvasClick = (e) => {
    if (!pendingTool) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * room.length;
    const clickY = ((e.clientY - rect.top) / rect.height) * room.width;

    const newPt = {
      id: `pt-${Date.now()}`,
      kind: 'point',
      type: pendingTool.type,
      label: pendingTool.label,
      name: pendingTool.name,
      x: +clickX.toFixed(2),
      y: +clickY.toFixed(2),
      z: pendingTool.defaultZ || 0.3
    };
    setElements([...elements, newPt]);
    setSelectedElementId(newPt.id);
    setPendingTool(null);
  };

  const add3DFurniture = (preset) => {
    const item = {
      id: `fn-${Date.now()}`,
      kind: 'furniture',
      ...preset,
      x: +(room.length / 2 - preset.w / 2).toFixed(2),
      y: +(room.width / 2 - preset.d / 2).toFixed(2)
    };
    setElements([...elements, item]);
    setSelectedElementId(item.id);
  };

  const updateSelectedElement = (patch) => {
    if (!selectedElementId) return;
    setElements(elements.map((el) => (el.id === selectedElementId ? { ...el, ...patch } : el)));
  };

  const selectedEl = elements.find((e) => e.id === selectedElementId);

  // Формирование текстовой спецификации для отправки в Telegram / WhatsApp / Поставщику
  const generateOrderText = () => {
    const lines = [
      `📋 ЗАЯВКА НА КОМПЛЕКТАЦИЮ — СметаПро 3D`,
      `Объект: ${room.name} (${room.length}×${room.width} м, H=${room.height} м, S пола=${geometry.floorArea} м²)`,
      `Выбранная база: ${currentStore.name}`,
      `Общий вес партии: ${calculation.totalWeightKg} кг (${calculation.totalWeightTons} т), этаж: ${floorLevel}`,
      `----------------------------------------`
    ];
    calculation.items.forEach((it, idx) => {
      const p = it.prices[selectedStoreId];
      lines.push(`${idx + 1}. ${it.name} — ${it.qty} ${it.unit} × ${p} ₽ = ${(it.qty * p).toLocaleString('ru-RU')} ₽`);
    });
    lines.push(`----------------------------------------`);
    lines.push(`ИТОГО МАТЕРИАЛЫ: ${currentStore.materialsSum.toLocaleString('ru-RU')} ₽`);
    lines.push(`ДОСТАВКА И ПОДЪЕМ: ${currentStore.logisticsCost.toLocaleString('ru-RU')} ₽`);
    lines.push(`РАБОТЫ МАСТЕРОВ: ${calculation.totalWorksCost.toLocaleString('ru-RU')} ₽`);
    lines.push(`ВСЕГО ПО ПРОЕКТУ: ${currentStore.grandTotalProject.toLocaleString('ru-RU')} ₽`);
    return lines.join('\n');
  };

  const copyOrderToClipboard = () => {
    navigator.clipboard.writeText(generateOrderText());
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Верхняя панель без отладочных кнопок */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight">
                СметаПро <span className="text-amber-400">3D CAD & Estimate</span>
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>S пола: {geometry.floorArea} м²</span>
                <span>•</span>
                <span>S стен: {geometry.netWallArea} м²</span>
              </div>
            </div>
          </div>

          {/* Живой индикатор статуса онлайн-базы цен */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowCloudModal(true)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                syncState.status === 'online'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-amber-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              {syncState.status === 'online' ? 'Онлайн: Supabase Live' : 'Настроить Онлайн API'}
            </button>

            <div className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Итого ({currentStore.name})</div>
              <div className="text-sm font-black text-amber-400">
                {currentStore.grandTotalProject.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Основной контейнер */}
      <main className="max-w-6xl mx-auto p-3 sm:p-4 space-y-4">
        {/* ВКЛАДКА 1: 2D + 3D МОДЕЛИРОВАНИЕ */}
        {activeTab === 'cad' && (
          <div className="space-y-4">
            {/* Быстрые шаблоны и переключатель 2D / 3D / Сплит */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {ROOM_PRESETS.map((pr, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setRoom({
                        name: pr.data.name,
                        length: pr.data.length,
                        width: pr.data.width,
                        height: pr.data.height,
                        doors: pr.data.doors,
                        windows: pr.data.windows
                      });
                      setScreedThickness(pr.data.screedThickness);
                      setPlasterThickness(pr.data.plasterThickness);
                      setLayoutAngle(pr.data.layoutAngle);
                      setTier(pr.data.tier);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                  >
                    {pr.title}
                  </button>
                ))}
              </div>

              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                {[
                  { id: '2d', label: '2D Чертеж' },
                  { id: '3d', label: '3D Объем' },
                  { id: 'split', label: '2D + 3D' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setViewMode(m.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      viewMode === m.id ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ползунки габаритов комнаты */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Длина помещения (м):</span>
                  <span className="font-bold text-amber-400">{room.length} м</span>
                </div>
                <input
                  type="range" min="2.5" max="12" step="0.1"
                  value={room.length}
                  onChange={(e) => setRoom({ ...room, length: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Ширина помещения (м):</span>
                  <span className="font-bold text-amber-400">{room.width} м</span>
                </div>
                <input
                  type="range" min="2.0" max="10" step="0.1"
                  value={room.width}
                  onChange={(e) => setRoom({ ...room, width: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Высота потолка (м):</span>
                  <span className="font-bold text-amber-400">{room.height} м</span>
                </div>
                <input
                  type="range" min="2.4" max="4.0" step="0.05"
                  value={room.height}
                  onChange={(e) => setRoom({ ...room, height: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* Кнопки добавления 3D-мебели и точек электрики */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap gap-2 items-center">
              {[
                { type: 'socket', label: 'Р', name: 'Розетка 220В', defaultZ: 0.3, cls: 'bg-blue-600' },
                { type: 'switch', label: 'В', name: 'Выключатель', defaultZ: 0.9, cls: 'bg-emerald-600' },
                { type: 'water', label: 'ГВС', name: 'Водорозетка', defaultZ: 0.6, cls: 'bg-cyan-600' }
              ].map((t) => (
                <button
                  key={t.type}
                  onClick={() => setPendingTool(pendingTool?.type === t.type ? null : t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1 ${t.cls} ${
                    pendingTool?.type === t.type ? 'ring-2 ring-white' : ''
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" /> {t.name}
                </button>
              ))}

              <button
                onClick={() => add3DFurniture({ type: 'wardrobe', name: 'Шкаф-купе 3D', w: 2.0, d: 0.6, h: 2.4, price: 64000, weight: 140 })}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                + 3D Шкаф-купе
              </button>
              <button
                onClick={() => add3DFurniture({ type: 'sofa', name: 'Диван 3D', w: 2.2, d: 1.0, h: 0.85, price: 52000, weight: 85 })}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                + 3D Диван
              </button>
              <button
                onClick={() => add3DFurniture({ type: 'kitchen', name: 'Кухня МДФ 3D', w: 2.8, d: 0.65, h: 2.2, price: 118000, weight: 210 })}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                + 3D Кухня
              </button>
            </div>

            {pendingTool && (
              <div className="bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs px-3 py-2 rounded-xl">
                Нажмите в любую точку на 2D-плане ниже, чтобы разместить «{pendingTool.name}» на высоте {pendingTool.defaultZ * 100} см.
              </div>
            )}

            {/* Предупреждения о 3D-коллизиях */}
            {collisions.length > 0 && (
              <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 space-y-1">
                {collisions.map((c, idx) => (
                  <div key={idx} className="text-xs text-rose-300 flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{c.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Сетка 2D и 3D видовых экранов */}
            <div className={`grid gap-4 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {(viewMode === '2d' || viewMode === 'split') && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <div className="w-full flex justify-between items-center mb-2 text-xs text-slate-400">
                    <span>2D-Разметка (кликните для выбора или установки)</span>
                    <span className="font-mono text-amber-400">{room.length} × {room.width} м</span>
                  </div>
                  <div
                    onClick={handle2DCanvasClick}
                    style={{
                      width: '100%',
                      maxWidth: '460px',
                      aspectRatio: `${room.length} / ${room.width}`,
                      backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                      backgroundSize: '18px 18px'
                    }}
                    className="relative border-4 border-amber-500/80 bg-slate-950 rounded-lg cursor-crosshair overflow-hidden"
                  >
                    {elements.map((el) => {
                      const leftPct = (el.x / room.length) * 100;
                      const topPct = (el.y / room.width) * 100;
                      const isSel = selectedElementId === el.id;

                      if (el.kind === 'furniture') {
                        return (
                          <div
                            key={el.id}
                            onClick={(ev) => { ev.stopPropagation(); setSelectedElementId(el.id); }}
                            style={{
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: `${(el.w / room.length) * 100}%`,
                              height: `${(el.d / room.width) * 100}%`
                            }}
                            className={`absolute rounded flex items-center justify-center text-[10px] font-bold text-center p-1 cursor-pointer ${
                              isSel ? 'bg-amber-500/40 border-2 border-amber-300 text-white z-20' : 'bg-indigo-900/70 border border-indigo-400 text-indigo-100'
                            }`}
                          >
                            {el.name}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={el.id}
                          onClick={(ev) => { ev.stopPropagation(); setSelectedElementId(el.id); }}
                          style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer ${
                            isSel ? 'ring-2 ring-white scale-110 z-20 ' : ''
                          }${el.type === 'socket' ? 'bg-blue-600' : el.type === 'switch' ? 'bg-emerald-600' : 'bg-cyan-600'}`}
                        >
                          {el.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(viewMode === '3d' || viewMode === 'split') && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-slate-400 font-medium">3D-Модель помещения в объеме</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCamAngle((c) => ({ ...c, yaw: c.yaw - 20 }))}
                        className="px-2 py-1 rounded bg-slate-800 text-xs hover:bg-slate-700"
                      >
                        ⟲ Повернуть
                      </button>
                      <button
                        onClick={() => setCamAngle((c) => ({ ...c, yaw: c.yaw + 20 }))}
                        className="px-2 py-1 rounded bg-slate-800 text-xs hover:bg-slate-700"
                      >
                        ⟳ Повернуть
                      </button>
                      <button
                        onClick={() => setCamAngle({ yaw: 38, pitch: 28, zoom: 1.0 })}
                        className="px-2 py-1 rounded bg-slate-800 text-xs hover:bg-slate-700"
                      >
                        Сброс 3D
                      </button>
                    </div>
                  </div>
                  <canvas
                    ref={canvas3dRef}
                    width={520}
                    height={340}
                    className="w-full h-auto bg-slate-950 rounded-xl border border-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Пульт управления выбранным 3D-объектом или точкой */}
            {selectedEl && (
              <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-slate-400">Выбрано: </span>
                  <strong className="text-amber-400">{selectedEl.name}</strong>
                  {selectedEl.kind === 'point' && (
                    <span className="ml-2 text-emerald-400">Высота от пола: {Math.round((selectedEl.z || 0.3) * 100)} см</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button onClick={() => updateSelectedElement({ x: Math.max(0, +(selectedEl.x - 0.2).toFixed(2)) })} className="px-2.5 py-1 bg-slate-800 rounded text-xs">← X</button>
                  <button onClick={() => updateSelectedElement({ x: Math.min(room.length - 0.3, +(selectedEl.x + 0.2).toFixed(2)) })} className="px-2.5 py-1 bg-slate-800 rounded text-xs">→ X</button>
                  <button onClick={() => updateSelectedElement({ y: Math.max(0, +(selectedEl.y - 0.2).toFixed(2)) })} className="px-2.5 py-1 bg-slate-800 rounded text-xs">↑ Y</button>
                  <button onClick={() => updateSelectedElement({ y: Math.min(room.width - 0.3, +(selectedEl.y + 0.2).toFixed(2)) })} className="px-2.5 py-1 bg-slate-800 rounded text-xs">↓ Y</button>
                  {selectedEl.kind === 'point' && (
                    <>
                      <button onClick={() => updateSelectedElement({ z: Math.min(room.height - 0.1, +((selectedEl.z || 0.3) + 0.15).toFixed(2)) })} className="px-2.5 py-1 bg-indigo-600/40 border border-indigo-400/40 rounded text-xs">+ Высота 3D</button>
                      <button onClick={() => updateSelectedElement({ z: Math.max(0.15, +((selectedEl.z || 0.3) - 0.15).toFixed(2)) })} className="px-2.5 py-1 bg-indigo-600/40 border border-indigo-400/40 rounded text-xs">− Высота 3D</button>
                    </>
                  )}
                  {selectedEl.kind === 'furniture' && (
                    <button onClick={() => updateSelectedElement({ w: selectedEl.d, d: selectedEl.w })} className="px-2.5 py-1 bg-slate-800 rounded text-xs flex items-center gap-1">
                      <RotateCw className="w-3 h-3" /> Повернуть 90°
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setElements(elements.filter((el) => el.id !== selectedElementId));
                      setSelectedElementId(null);
                    }}
                    className="px-2.5 py-1 bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Удалить
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ВКЛАДКА 2: СТРОИТЕЛЬНЫЕ ПИРОГИ */}
        {activeTab === 'pies' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-5">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Настройка толщины слоев и строительных пирогов
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Толщина стяжки пола (10–100 мм):</span>
                  <span className="font-bold text-amber-400">{screedThickness} мм</span>
                </div>
                <input
                  type="range" min="10" max="100" step="5"
                  value={screedThickness}
                  onChange={(e) => setScreedThickness(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Средний слой гипсовой штукатурки (10–40 мм):</span>
                  <span className="font-bold text-amber-400">{plasterThickness} мм</span>
                </div>
                <input
                  type="range" min="10" max="40" step="5"
                  value={plasterThickness}
                  onChange={(e) => setPlasterThickness(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1.5">Схема укладки напольного покрытия:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLayoutAngle('straight')}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      layoutAngle === 'straight' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Прямая (+5% запас)
                  </button>
                  <button
                    onClick={() => setLayoutAngle('diagonal')}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      layoutAngle === 'diagonal' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    По диагонали / Елочка (+12%)
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1.5">Ценовой сегмент материалов:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'econom', label: 'Эконом' },
                    { id: 'standard', label: 'Стандарт' },
                    { id: 'premium', label: 'Премиум' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTier(t.id)}
                      className={`py-2 rounded-xl text-xs font-bold border ${
                        tier === t.id ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {calculation.items.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs sm:text-sm font-semibold">{item.name}</div>
                    <div className="text-[11px] text-slate-400">{item.formula} • Вес: {item.weightKg} кг</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-emerald-400">{item.qty} {item.unit}</div>
                    <div className="text-xs text-slate-400">
                      {(item.qty * item.prices[selectedStoreId]).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 3: ОНЛАЙН-БАЗЫ ЦЕН И ПРЯМОЙ ВЫХОД В МАГАЗИНЫ */}
        {activeTab === 'stores' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-amber-400" />
                  Сравнение корзин в магазинах и живая синхронизация цен
                </h2>
                <p className="text-xs text-slate-400">
                  Источник цен: {syncState.status === 'online' ? 'Облачная БД Supabase (Live)' : 'Локальный прайс'}
                  {syncState.lastTime ? ` • обновлено в ${syncState.lastTime}` : ''}
                </p>
              </div>

              <button
                onClick={syncLivePricesFromSupabase}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncState.status === 'loading' ? 'animate-spin' : ''}`} />
                Обновить цены из Supabase
              </button>
            </div>

            {/* Логистика и подъем на этаж */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Этаж подъема ({calculation.totalWeightTons} т груза):</span>
                  <span className="font-bold text-amber-400">{floorLevel} этаж</span>
                </div>
                <input
                  type="range" min="1" max="25"
                  value={floorLevel}
                  onChange={(e) => setFloorLevel(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">Наличие грузового лифта</div>
                  <div className="text-[11px] text-slate-400">Снижает стоимость подъема мешков и мебели</div>
                </div>
                <input
                  type="checkbox"
                  checked={hasCargoLift}
                  onChange={(e) => setHasCargoLift(e.target.checked)}
                  className="w-5 h-5 accent-amber-500"
                />
              </div>
            </div>

            {/* Карточки 3 магазинов с мгновенным переключением */}
            <div className="grid grid-cols-1 gap-3">
              {calculation.stores.map((st) => {
                const isSelected = st.id === selectedStoreId;
                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStoreId(st.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                      isSelected ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-400" />
                          <span className="font-bold text-sm sm:text-base">{st.name}</span>
                          {isSelected && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                              Выбран
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{st.badge}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-black text-amber-400">
                          {st.totalWithDelivery.toLocaleString('ru-RU')} ₽
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Материалы: {st.materialsSum.toLocaleString('ru-RU')} ₽ + Доставка: {st.logisticsCost.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Прямые ссылки на каждый товар в выбранном онлайн-магазине */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Прямой переход к товарам на сайте «{currentStore.name}»:</span>
                <span className="text-[11px] text-amber-400">Нажмите на позицию для проверки цены на сайте</span>
              </div>
              <div className="divide-y divide-slate-800/70">
                {calculation.items.map((item) => {
                  const unitPrice = item.prices[selectedStoreId];
                  const url = currentStore.buildSearchUrl(item.searchQuery);
                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="pr-2">
                        <div className="font-semibold text-slate-100">{item.name}</div>
                        <div className="text-slate-400">
                          {item.qty} {item.unit} × {unitPrice.toLocaleString('ru-RU')} ₽ ={' '}
                          <b className="text-slate-200">{(item.qty * unitPrice).toLocaleString('ru-RU')} ₽</b>
                        </div>
                      </div>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 font-bold flex items-center gap-1 transition"
                      >
                        На сайт <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА 4: ИТОГОВАЯ СМЕТА И ОТПРАВКА ЗАКАЗА */}
        {activeTab === 'estimate' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">Полная смета ремонта и комплектации</h2>
                <p className="text-xs text-slate-400">
                  {room.name} • База: {currentStore.name} • Вес: {calculation.totalWeightTons} т
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setForemanMode(!foremanMode)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  {foremanMode ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {foremanMode ? 'Скрыть доход прораба' : 'Режим Прораба'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Печать / PDF
                </button>
              </div>
            </div>

            {/* Сводные карточки бюджета */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">Материалы и 3D-мебель:</div>
                <div className="text-lg font-black text-slate-100 mt-0.5">
                  {currentStore.materialsSum.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">Стоимость работ (СМР):</div>
                <div className="text-lg font-black text-slate-100 mt-0.5">
                  {calculation.totalWorksCost.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">Доставка и подъем ({calculation.totalWeightTons} т):</div>
                <div className="text-lg font-black text-amber-400 mt-0.5">
                  {currentStore.logisticsCost.toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>

            {foremanMode && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="text-emerald-300 font-bold">
                  Скрытая агентская комиссия от поставщика «{currentStore.name}»:
                </span>
                <span className="text-sm font-black text-emerald-400">
                  +{currentStore.foremanCommission.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            )}

            {/* Таблица материалов */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Ведомость закупки материалов и мебели
              </h3>
              <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 px-3">
                {calculation.items.map((it) => {
                  const price = it.prices[selectedStoreId];
                  return (
                    <div key={it.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-semibold text-slate-100">{it.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {it.qty} {it.unit} × {price.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                      <div className="font-bold text-slate-100 whitespace-nowrap">
                        {(it.qty * price).toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Таблица работ */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Строительно-монтажные работы
              </h3>
              <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 px-3">
                {calculation.works.map((w, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-semibold text-slate-100">{w.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Объем: {w.qty} {w.unit} × {w.rate.toLocaleString('ru-RU')} ₽/{w.unit}
                      </div>
                    </div>
                    <div className="font-bold text-slate-100 whitespace-nowrap">
                      {Math.round(w.qty * w.rate).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Кнопка реальной отправки заказа и комплектации */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => setShowOrderModal(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Send className="w-4 h-4" />
                Оформить комплектацию / Отправить в Telegram или магазин
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Модальное окно живого подключения Supabase (проверка и ввод ключей) */}
      {showCloudModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                Онлайн-синхронизация цен (Supabase)
              </h3>
              <button onClick={() => setShowCloudModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div>
                Статус: <b className={syncState.status === 'online' ? 'text-emerald-400' : 'text-amber-400'}>
                  {syncState.status === 'online' ? 'Подключено к Supabase Live' : 'Ожидание ключей / Локальный кэш'}
                </b>
              </div>
              {syncState.error && <div className="text-rose-400">{syncState.error}</div>}
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Project URL (VITE_SUPABASE_URL):</label>
                <input
                  type="text"
                  value={customSbUrl}
                  onChange={(e) => setCustomSbUrl(e.target.value)}
                  placeholder="https://xxxxxx.supabase.co"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Publishable / Anon Key (VITE_SUPABASE_ANON_KEY):</label>
                <input
                  type="password"
                  value={customSbKey}
                  onChange={(e) => setCustomSbKey(e.target.value)}
                  placeholder="sb_publishable_... или eyJhbGci..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-slate-100"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={syncLivePricesFromSupabase}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Проверить и загрузить цены
              </button>
              <button
                onClick={() => setShowCloudModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно реальной выгрузки заказа (Telegram / WhatsApp / Сайт поставщика) */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Отправка спецификации и заказ в «{currentStore.name}»
              </h3>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              readOnly
              rows={8}
              value={generateOrderText()}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-[11px] font-mono text-slate-200"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={copyOrderToClipboard}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                {copiedSpec ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedSpec ? 'Скопировано в буфер!' : 'Скопировать смету'}
              </button>

              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(currentStore.buildSearchUrl('Стройматериалы'))}&text=${encodeURIComponent(generateOrderText())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" /> Отправить в Telegram
              </a>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(generateOrderText())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                Отправить в WhatsApp
              </a>

              <a
                href={currentStore.buildSearchUrl('Штукатурка Ротбанд')}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5"
              >
                Перейти в {currentStore.name} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Нижняя мобильная навигация */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {[
            { id: 'cad', label: '1. 2D + 3D', icon: Box },
            { id: 'pies', label: '2. Пироги', icon: Layers },
            { id: 'stores', label: '3. Базы цен', icon: ShoppingCart },
            { id: 'estimate', label: '4. Смета', icon: FileSpreadsheet }
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition ${
                  active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
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
