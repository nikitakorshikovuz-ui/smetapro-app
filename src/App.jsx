import React, { useState, useEffect, useMemo } from 'react';
import {
  Ruler, Layers, ShoppingCart, FileSpreadsheet, Mic, Plus, Trash2, RotateCw,
  CheckCircle2, Truck, Building2, Eye, EyeOff, RefreshCw, Settings, Printer, Sparkles, Database
} from 'lucide-react';
import { fetchLiveMaterialsCatalog } from './services/supabaseClient';
import { parseRoomVoiceTextWithDeepSeek, startNativeVoiceRecognition } from './services/deepseekVoice';

// Универсальный хук сохранения состояния в localStorage (Offline-First для стройплощадки)
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
      console.warn('Ошибка записи в localStorage', e);
    }
  }, [key, value]);

  return [value, setValue];
}

const VOICE_PRESETS = [
  {
    title: 'Гостиная 20 м² (Новостройка в бетоне)',
    prompt: 'Комната 5.4 на 3.8 метра, потолок 2.85, одно окно, одна дверь. Стяжка 50 мм, штукатурка по маякам 20 мм, кварцвинил елочкой, стандарт.',
    data: { name: 'Гостиная 20.5 м² (Бетон)', length: 5.4, width: 3.8, height: 2.85, doors: 1, windows: 1, screedThickness: 50, plasterThickness: 20, layoutAngle: 'diagonal', tier: 'standard' }
  },
  {
    title: 'Спальня 14 м² (Вторичка под косметику)',
    prompt: 'Спальня 4.2 на 3.4 метра, высота 2.65, ровный пол 15 мм наливной, штукатурка 10 мм, прямая укладка ламината.',
    data: { name: 'Спальня 14.3 м²', length: 4.2, width: 3.4, height: 2.65, doors: 1, windows: 1, screedThickness: 15, plasterThickness: 10, layoutAngle: 'straight', tier: 'econom' }
  },
  {
    title: 'Кухня-столовая 28 м² (Загородный дом)',
    prompt: 'Кухня-гостиная в коттедже 7 на 4 метра, потолки 3.10, два панорамных окна, две двери, стяжка 70 мм по теплому полу, штукатурка 25 мм, премиум.',
    data: { name: 'Кухня-столовая 28 м² (Коттедж)', length: 7.0, width: 4.0, height: 3.1, doors: 2, windows: 2, screedThickness: 70, plasterThickness: 25, layoutAngle: 'diagonal', tier: 'premium' }
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('cad');
  const [room, setRoom] = useStickyState({
    name: 'Гостиная 19.7 м² (ЖК Светлый)',
    length: 5.2,
    width: 3.8,
    height: 2.75,
    doors: 1,
    windows: 1
  }, 'smetapro_room');

  const [screedThickness, setScreedThickness] = useStickyState(45, 'smetapro_screed');
  const [plasterThickness, setPlasterThickness] = useStickyState(15, 'smetapro_plaster');
  const [layoutAngle, setLayoutAngle] = useStickyState('straight', 'smetapro_angle');
  const [tier, setTier] = useStickyState('standard', 'smetapro_tier');
  const [floorLevel, setFloorLevel] = useStickyState(5, 'smetapro_floor');
  const [hasCargoLift, setHasCargoLift] = useStickyState(true, 'smetapro_lift');
  const [selectedStoreId, setSelectedStoreId] = useStickyState('petrovich', 'smetapro_store');
  const [foremanMode, setForemanMode] = useStickyState(false, 'smetapro_foreman');

  // 2D-элементы на плане (инженерные точки и мебель)
  const [elements, setElements] = useStickyState([
    { id: 'el-1', kind: 'point', type: 'socket', label: 'Р', name: 'Розетка 220В', x: 0.8, y: 0.25 },
    { id: 'el-2', kind: 'point', type: 'socket', label: 'Р', name: 'Блок розеток ТВ', x: 2.6, y: 0.25 },
    { id: 'el-3', kind: 'point', type: 'switch', label: 'В', name: 'Выключатель 2-кл', x: 0.35, y: 3.4 },
    { id: 'el-4', kind: 'point', type: 'light', label: 'С', name: 'Люстра / Трековый свет', x: 2.6, y: 1.9 },
    { id: 'el-5', kind: 'furniture', type: 'wardrobe', name: 'Шкаф-купе ЛДСП Egger', w: 2.2, h: 0.65, x: 2.8, y: 0.1, price: 64000, weight: 145 },
    { id: 'el-6', kind: 'furniture', type: 'sofa', name: 'Диван угловой Лофт', w: 2.4, h: 1.0, x: 1.2, y: 2.5, price: 52000, weight: 85 }
  ], 'smetapro_elements');

  const [pendingTool, setPendingTool] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);

  // Живая синхронизация с Supabase и AI
  const [liveCatalog, setLiveCatalog] = useState(null);
  const [catalogSource, setCatalogSource] = useState('local-default');
  const [showApiModal, setShowApiModal] = useState(false);
  const [customDeepseekKey, setCustomDeepseekKey] = useStickyState('', 'smetapro_deepseek_key');
  const [voiceInputText, setVoiceInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState('');

  const syncPrices = async () => {
    const res = await fetchLiveMaterialsCatalog();
    setLiveCatalog(res.data);
    setCatalogSource(res.source);
  };

  useEffect(() => {
    syncPrices();
  }, []);

  // Расчет чистой геометрии помещения
  const geometry = useMemo(() => {
    const floorArea = +(room.length * room.width).toFixed(2);
    const perimeter = +((room.length + room.width) * 2).toFixed(2);
    const openingsArea = +(room.doors * 1.8 + room.windows * 2.25).toFixed(2);
    const netWallArea = Math.max(0, +(perimeter * room.height - openingsArea).toFixed(2));
    const plinthLength = Math.max(0, +(perimeter - room.doors * 0.9).toFixed(2));
    return { floorArea, perimeter, openingsArea, netWallArea, plinthLength };
  }, [room]);

  // Инженерный расчет материалов с учетом запаса на подрезку и кратности заводской упаковки
  const bom = useMemo(() => {
    const tierMultiplier = tier === 'econom' ? 0.82 : tier === 'premium' ? 1.38 : 1.0;
    const cutWaste = layoutAngle === 'diagonal' ? 1.12 : 1.05;

    const getPrice = (id, storeKey, fallback) => {
      if (liveCatalog && liveCatalog[id] && liveCatalog[id][storeKey]) {
        return Math.round(Number(liveCatalog[id][storeKey]) * tierMultiplier);
      }
      return Math.round(fallback * tierMultiplier);
    };

    const socketsCount = elements.filter(e => e.type === 'socket' || e.type === 'switch').length;
    const lightCount = elements.filter(e => e.type === 'light').length;
    const waterCount = elements.filter(e => e.type === 'water').length;
    const furnitureList = elements.filter(e => e.kind === 'furniture');

    // 1. Пескобетон М300 для стяжки: ~1.9 кг на 1 м² при 1 мм слоя. Мешок 25 кг.
    const screedTotalKg = geometry.floorArea * screedThickness * 1.9 * 1.03;
    const screedBags = Math.ceil(screedTotalKg / 25);

    // 2. Демпферная лента по периметру (рулон 25 м)
    const damperRolls = Math.ceil((geometry.perimeter * 1.05) / 25);

    // 3. Штукатурка гипсовая Ротбанд: ~0.85 кг на 1 м² при 1 мм слоя. Мешок 30 кг.
    const plasterTotalKg = geometry.netWallArea * plasterThickness * 0.85 * 1.05;
    const plasterBags = Math.ceil(plasterTotalKg / 30);

    // 4. Маяки штукатурные (шаг 1.3 м)
    const beaconsCount = Math.ceil(geometry.perimeter / 1.3);

    // 5. Грунтовка глубокого проникновения (пол + стены в 2 слоя, 0.2 л/м², канистра 10 л)
    const primerLiters = (geometry.floorArea + geometry.netWallArea * 2) * 0.18;
    const primerCans = Math.ceil(primerLiters / 10);

    // 6. Чистовое покрытие пола (упаковка 2.15 м²)
    const finishFloorPacks = Math.ceil((geometry.floorArea * cutWaste) / 2.15);

    // 7. Подложка (упаковка 5.5 м²)
    const underlayPacks = Math.ceil((geometry.floorArea * 1.05) / 5.5);

    // 8. Шпаклевка финишная (1.2 кг/м² в 2 слоя, мешок 20 кг)
    const puttyBags = Math.ceil((geometry.netWallArea * 2.2) / 20);

    // 9. Краска интерьерная (1 ведро 9 л на 45 м² в 2 слоя)
    const paintBuckets = Math.max(1, Math.ceil(geometry.netWallArea / 42));

    // 10. Электрика (кабель бухтами по 100 м + подрозетники)
    const totalPoints = socketsCount + lightCount;
    const cableMeters = totalPoints * 7.5 + geometry.perimeter * 0.8;
    const cableCoils = Math.max(1, Math.ceil(cableMeters / 100));

    const items = [
      {
        id: 'screed_mix',
        name: `Пескобетон М300 / Стяжка пола (слой ${screedThickness} мм, мешок 25 кг)`,
        formula: `CEIL((${geometry.floorArea} м² × ${screedThickness} мм × 1.9 кг × 1.03) / 25 кг)`,
        qty: screedBags,
        unit: 'меш.',
        weightKg: screedBags * 25,
        prices: {
          petrovich: getPrice('screed_mix', 'store_petrovich_price', 340),
          leroy: getPrice('screed_mix', 'store_leroy_price', 315),
          saturn: getPrice('screed_mix', 'store_saturn_price', 295)
        }
      },
      {
        id: 'damper_tape',
        name: 'Демпферная кромочная лента 100 мм (рулон 25 м)',
        formula: `CEIL((${geometry.perimeter} пог.м × 1.05) / 25 м)`,
        qty: damperRolls,
        unit: 'рул.',
        weightKg: +(damperRolls * 0.8).toFixed(1),
        prices: {
          petrovich: getPrice('damper_tape', 'store_petrovich_price', 490),
          leroy: getPrice('damper_tape', 'store_leroy_price', 420),
          saturn: getPrice('damper_tape', 'store_saturn_price', 450)
        }
      },
      {
        id: 'plaster_rotband',
        name: `Штукатурка гипсовая Knauf Ротбанд (слой ${plasterThickness} мм, мешок 30 кг)`,
        formula: `CEIL((${geometry.netWallArea} м² × ${plasterThickness} мм × 0.85 кг × 1.05) / 30 кг)`,
        qty: plasterBags,
        unit: 'меш.',
        weightKg: plasterBags * 30,
        prices: {
          petrovich: getPrice('plaster_rotband', 'store_petrovich_price', 595),
          leroy: getPrice('plaster_rotband', 'store_leroy_price', 568),
          saturn: getPrice('plaster_rotband', 'store_saturn_price', 550)
        }
      },
      {
        id: 'beacons_6mm',
        name: 'Маяк штукатурный оцинкованный 6 мм (3 м)',
        formula: `CEIL(${geometry.perimeter} м / шаг 1.3 м)`,
        qty: beaconsCount,
        unit: 'шт.',
        weightKg: +(beaconsCount * 0.25).toFixed(1),
        prices: {
          petrovich: getPrice('beacons_6mm', 'store_petrovich_price', 95),
          leroy: getPrice('beacons_6mm', 'store_leroy_price', 78),
          saturn: getPrice('beacons_6mm', 'store_saturn_price', 82)
        }
      },
      {
        id: 'primer_deep',
        name: 'Грунтовка глубокого проникновения Knauf Тифенгрунд (канистра 10 л)',
        formula: `CEIL((${geometry.floorArea + geometry.netWallArea * 2} м² × 0.18 л) / 10 л)`,
        qty: primerCans,
        unit: 'кан.',
        weightKg: +(primerCans * 10.5).toFixed(1),
        prices: {
          petrovich: getPrice('primer_deep', 'store_petrovich_price', 1390),
          leroy: getPrice('primer_deep', 'store_leroy_price', 1290),
          saturn: getPrice('primer_deep', 'store_saturn_price', 1340)
        }
      },
      {
        id: 'putty_finish',
        name: 'Шпаклевка полимерная финишная Vetonit LR+ (мешок 20 кг)',
        formula: `CEIL((${geometry.netWallArea} м² × 2.2 кг) / 20 кг)`,
        qty: puttyBags,
        unit: 'меш.',
        weightKg: puttyBags * 20,
        prices: {
          petrovich: getPrice('putty_finish', 'store_petrovich_price', 1180),
          leroy: getPrice('putty_finish', 'store_leroy_price', 1090),
          saturn: getPrice('putty_finish', 'store_saturn_price', 1120)
        }
      },
      {
        id: 'wall_finish_unit',
        name: 'Краска моющаяся интерьерная Dulux / Tikkurila (база 9 л)',
        formula: `CEIL(${geometry.netWallArea} м² / 42 м² на ведро)`,
        qty: paintBuckets,
        unit: 'ведро',
        weightKg: paintBuckets * 12,
        prices: {
          petrovich: getPrice('wall_finish_unit', 'store_petrovich_price', 5890),
          leroy: getPrice('wall_finish_unit', 'store_leroy_price', 5490),
          saturn: getPrice('wall_finish_unit', 'store_saturn_price', 5650)
        }
      },
      {
        id: 'floor_finish_pack',
        name: `Кварцвинил / Ламинат 33 кл. (${layoutAngle === 'diagonal' ? 'укладка елочкой/диагональ +12%' : 'прямая укладка +5%'}, уп. 2.15 м²)`,
        formula: `CEIL((${geometry.floorArea} м² × ${cutWaste}) / 2.15 м²)`,
        qty: finishFloorPacks,
        unit: 'уп.',
        weightKg: +(finishFloorPacks * 16.5).toFixed(1),
        prices: {
          petrovich: getPrice('floor_finish_pack', 'store_petrovich_price', 3150),
          leroy: getPrice('floor_finish_pack', 'store_leroy_price', 2890),
          saturn: getPrice('floor_finish_pack', 'store_saturn_price', 2990)
        }
      },
      {
        id: 'underlay_pack',
        name: 'Подложка демпфирующая XPS 3 мм (уп. 5.5 м²)',
        formula: `CEIL((${geometry.floorArea} м² × 1.05) / 5.5 м²)`,
        qty: underlayPacks,
        unit: 'уп.',
        weightKg: +(underlayPacks * 1.5).toFixed(1),
        prices: {
          petrovich: getPrice('underlay_pack', 'store_petrovich_price', 890),
          leroy: getPrice('underlay_pack', 'store_leroy_price', 790),
          saturn: getPrice('underlay_pack', 'store_saturn_price', 840)
        }
      },
      {
        id: 'cable_vvg_3x25',
        name: `Кабель ВВГнг(А)-LS 3х2.5 ГОСТ (${Math.round(cableMeters)} м трассы -> бухта 100 м)`,
        formula: `CEIL(${Math.round(cableMeters)} пог.м / 100 м)`,
        qty: cableCoils,
        unit: 'бухта',
        weightKg: +(cableCoils * 13.5).toFixed(1),
        prices: {
          petrovich: getPrice('cable_vvg_3x25', 'store_petrovich_price', 8450),
          leroy: getPrice('cable_vvg_3x25', 'store_leroy_price', 7990),
          saturn: getPrice('cable_vvg_3x25', 'store_saturn_price', 7850)
        }
      },
      {
        id: 'socket_box',
        name: 'Подрозетники 68х45 + механизмы розеток/выключателей',
        formula: `По точкам на 2D-плане (${totalPoints} шт.)`,
        qty: Math.max(1, totalPoints),
        unit: 'компл.',
        weightKg: +(Math.max(1, totalPoints) * 0.2).toFixed(1),
        prices: {
          petrovich: getPrice('socket_box', 'store_petrovich_price', 480),
          leroy: getPrice('socket_box', 'store_leroy_price', 430),
          saturn: getPrice('socket_box', 'store_saturn_price', 450)
        }
      }
    ];

    // Добавляем мебель из 2D-разметки в спецификацию
    furnitureList.forEach((f) => {
      items.push({
        id: f.id,
        name: `Мебель по проекту: ${f.name} (${f.w}×${f.h} м)`,
        formula: 'Индивидуальный распил / фабричный модуль (1 шт.)',
        qty: 1,
        unit: 'компл.',
        weightKg: f.weight || 90,
        prices: {
          petrovich: Math.round(f.price * tierMultiplier),
          leroy: Math.round(f.price * 0.96 * tierMultiplier),
          saturn: Math.round(f.price * 0.98 * tierMultiplier)
        }
      });
    });

    const totalWeightKg = Math.round(items.reduce((acc, item) => acc + item.weightKg, 0));
    const totalWeightTons = +(totalWeightKg / 1000).toFixed(2);

    // Работы мастеров
    const works = [
      { name: 'Устройство цементно-песчаной стяжки пола по маякам', qty: geometry.floorArea, unit: 'м²', rate: 850 },
      { name: 'Выравнивание стен гипсовой штукатуркой по маякам 90°', qty: geometry.netWallArea, unit: 'м²', rate: 790 },
      { name: 'Шпаклевание, шлифовка и покраска стен в 2 слоя', qty: geometry.netWallArea, unit: 'м²', rate: 920 },
      { name: `Укладка чистового пола (${layoutAngle === 'diagonal' ? 'диагональ/елочка' : 'прямая'}) + плинтус`, qty: geometry.floorArea, unit: 'м²', rate: layoutAngle === 'diagonal' ? 880 : 650 },
      { name: 'Штробление, прокладка кабеля и монтаж электроточек', qty: Math.max(1, totalPoints + waterCount), unit: 'точ.', rate: 1350 },
      { name: 'Сборка и монтаж корпусной мебели по проекту', qty: furnitureList.length, unit: 'ед.', rate: 4800 }
    ];

    const totalWorksCost = Math.round(works.reduce((acc, w) => acc + w.qty * w.rate, 0));

    return { items, works, totalWeightKg, totalWeightTons, totalWorksCost };
  }, [geometry, screedThickness, plasterThickness, layoutAngle, tier, elements, liveCatalog]);

  // Сравнение магазинов с доставкой и подъемом на этаж
  const storesComparison = useMemo(() => {
    const stores = [
      { id: 'petrovich', name: 'СТД «Петрович»', badge: 'Доставка за 2 часа • Все в наличии', baseTruck: 2400, cashbackPct: 0.08 },
      { id: 'leroy', name: 'Лемана ПРО (Леруа)', badge: 'Низкая розница • Доставка завтра', baseTruck: 2900, cashbackPct: 0.05 },
      { id: 'saturn', name: 'Сатурн СтройБаза + МебельЦех', badge: 'Опт для бригад • Скидка на смесь', baseTruck: 2600, cashbackPct: 0.10 }
    ];

    return stores.map((st) => {
      const materialsSum = bom.items.reduce((acc, it) => acc + it.qty * it.prices[st.id], 0);
      // Расчет разгрузки и подъема по тоннажу
      const unloadingCost = hasCargoLift
        ? Math.round(bom.totalWeightTons * 1450)
        : Math.round(bom.totalWeightTons * 950 * floorLevel);
      const logisticsTotal = st.baseTruck + unloadingCost;
      const grandTotalMaterials = materialsSum + logisticsTotal;
      const foremanBonus = Math.round(materialsSum * st.cashbackPct);

      return {
        ...st,
        materialsSum,
        logisticsTotal,
        grandTotalMaterials,
        foremanBonus
      };
    });
  }, [bom, floorLevel, hasCargoLift]);

  const activeStore = storesComparison.find((s) => s.id === selectedStoreId) || storesComparison[0];

  // Обработка клика по 2D-холсту для добавления инженерной точки
  const handleCanvasClick = (e) => {
    if (!pendingTool) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * room.length;
    const clickY = ((e.clientY - rect.top) / rect.height) * room.width;

    const newItem = {
      id: `pt-${Date.now()}`,
      kind: 'point',
      type: pendingTool.type,
      label: pendingTool.label,
      name: pendingTool.name,
      x: +clickX.toFixed(2),
      y: +clickY.toFixed(2)
    };
    setElements([...elements, newItem]);
    setPendingTool(null);
  };

  const addFurniture = (preset) => {
    const newFurn = {
      id: `furn-${Date.now()}`,
      kind: 'furniture',
      type: preset.type,
      name: preset.name,
      w: preset.w,
      h: preset.h,
      x: +(room.length / 2 - preset.w / 2).toFixed(2),
      y: +(room.width / 2 - preset.h / 2).toFixed(2),
      price: preset.price,
      weight: preset.weight
    };
    setElements([...elements, newFurn]);
    setSelectedElementId(newFurn.id);
  };

  const moveSelected = (dx, dy) => {
    if (!selectedElementId) return;
    setElements(elements.map(el => {
      if (el.id !== selectedElementId) return el;
      return {
        ...el,
        x: Math.max(0, Math.min(room.length - (el.w || 0.2), +(el.x + dx).toFixed(2))),
        y: Math.max(0, Math.min(room.width - (el.h || 0.2), +(el.y + dy).toFixed(2)))
      };
    }));
  };

  const rotateSelected = () => {
    if (!selectedElementId) return;
    setElements(elements.map(el => {
      if (el.id !== selectedElementId || el.kind !== 'furniture') return el;
      return { ...el, w: el.h, h: el.w };
    }));
  };

  const deleteSelected = () => {
    if (!selectedElementId) return;
    setElements(elements.filter(el => el.id !== selectedElementId));
    setSelectedElementId(null);
  };

  const handleRunDeepSeekParse = async () => {
    if (!voiceInputText.trim()) return;
    setAiLoading(true);
    setAiStatusMsg('Отправка голосового описания в DeepSeek API...');
    try {
      const parsed = await parseRoomVoiceTextWithDeepSeek(voiceInputText, customDeepseekKey);
      setRoom({
        name: parsed.name || 'Объект по голосовому замеру',
        length: Number(parsed.length) || 5.0,
        width: Number(parsed.width) || 3.8,
        height: Number(parsed.height) || 2.75,
        doors: Number(parsed.doors ?? 1),
        windows: Number(parsed.windows ?? 1)
      });
      if (parsed.screedThickness) setScreedThickness(Number(parsed.screedThickness));
      if (parsed.plasterThickness) setPlasterThickness(Number(parsed.plasterThickness));
      if (parsed.layoutAngle) setLayoutAngle(parsed.layoutAngle);
      if (parsed.tier) setTier(parsed.tier);
      setAiStatusMsg('Параметры успешно распознаны и применены к чертежу и смете!');
    } catch (err) {
      setAiStatusMsg(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleMicRecord = () => {
    setIsListening(true);
    setAiStatusMsg('Говорите размеры помещения и список работ...');
    startNativeVoiceRecognition(
      (transcript) => {
        setVoiceInputText(transcript);
        setIsListening(false);
        setAiStatusMsg('Речь распознана! Нажмите «Рассчитать через DeepSeek» или выберите пресет.');
      },
      (errMsg) => {
        setIsListening(false);
        setAiStatusMsg(errMsg);
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Верхний навбар */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg shadow-amber-500/20">
              СП
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight">СметаПро CAD</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {catalogSource === 'supabase-live' ? 'Supabase Live API' : catalogSource === 'offline-cache' ? 'Оффлайн-кэш БД' : 'Локальная БД (Offline-First)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">{room.name} • S пола: {geometry.floorArea} м² • S стен: {geometry.netWallArea} м²</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowApiModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold transition shadow"
            >
              <Mic className="w-4 h-4" />
              AI-Голосовой замер & API
            </button>

            <button
              onClick={() => setForemanMode(!foremanMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                foremanMode
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {foremanMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {foremanMode ? 'Режим Прораба (Комиссия)' : 'Глазами Заказчика'}
            </button>
          </div>
        </div>

        {/* Переключатель 4 модулей */}
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto border-t border-slate-800/80">
          {[
            { id: 'cad', label: '1. Обмер и 2D-Разметка', icon: Ruler },
            { id: 'pies', label: '2. Пироги и Формулы СНиП', icon: Layers },
            { id: 'stores', label: '3. Магазины и Доставка', icon: ShoppingCart },
            { id: 'estimate', label: '4. Итоговая Смета и PDF', icon: FileSpreadsheet }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition ${
                  active
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Основной контент */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Левая и центральная зона (8 колонок) */}
        <div className="lg:col-span-8 space-y-6">
          {activeTab === 'cad' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-amber-400" />
                  Габариты помещения и интерактивный 2D-чертеж
                </h2>
                <span className="text-xs text-slate-400">Автосохранение на устройстве включено</span>
              </div>

              {/* Ползунки размеров */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs text-slate-400 flex justify-between">
                    <span>Длина стены A (м)</span>
                    <span className="font-bold text-amber-400">{room.length} м</span>
                  </label>
                  <input
                    type="range" min="2.0" max="12.0" step="0.1"
                    value={room.length}
                    onChange={(e) => setRoom({ ...room, length: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 flex justify-between">
                    <span>Ширина стены B (м)</span>
                    <span className="font-bold text-amber-400">{room.width} м</span>
                  </label>
                  <input
                    type="range" min="2.0" max="10.0" step="0.1"
                    value={room.width}
                    onChange={(e) => setRoom({ ...room, width: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 flex justify-between">
                    <span>Высота потолка H (м)</span>
                    <span className="font-bold text-amber-400">{room.height} м</span>
                  </label>
                  <input
                    type="range" min="2.4" max="4.2" step="0.05"
                    value={room.height}
                    onChange={(e) => setRoom({ ...room, height: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 mt-1"
                  />
                </div>
              </div>

              {/* Панель добавления инженерных точек и мебели */}
              <div className="flex flex-wrap gap-2 items-center">
                {[
                  { type: 'socket', label: 'Р', name: 'Розетка 220В', color: 'bg-blue-600 hover:bg-blue-500' },
                  { type: 'switch', label: 'В', name: 'Выключатель', color: 'bg-emerald-600 hover:bg-emerald-500' },
                  { type: 'light', label: 'С', name: 'Точка света', color: 'bg-amber-600 hover:bg-amber-500' },
                  { type: 'water', label: 'ГВС', name: 'Водорозетка', color: 'bg-cyan-600 hover:bg-cyan-500' }
                ].map((tool) => (
                  <button
                    key={tool.type}
                    onClick={() => setPendingTool(pendingTool?.type === tool.type ? null : tool)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                      pendingTool?.type === tool.type ? 'ring-2 ring-white ' + tool.color : tool.color
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> {tool.name} ({tool.label})
                  </button>
                ))}

                <button
                  onClick={() => addFurniture({ type: 'wardrobe', name: 'Шкаф-купе Egger', w: 2.0, h: 0.6, price: 62000, weight: 140 })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700"
                >
                  + Шкаф-купе
                </button>
                <button
                  onClick={() => addFurniture({ type: 'kitchen', name: 'Кухонный гарнитур МДФ', w: 2.6, h: 0.65, price: 115000, weight: 210 })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700"
                >
                  + Кухня
                </button>
              </div>

              {pendingTool && (
                <div className="text-xs bg-amber-500/15 border border-amber-500/40 text-amber-300 px-3 py-2 rounded-lg">
                  Режим установки: кликните в любое место на 2D-плане комнаты ниже, чтобы поставить «{pendingTool.name}».
                </div>
              )}

              {/* Интерактивный 2D Холст */}
              <div className="relative bg-slate-950 border-2 border-slate-700 rounded-xl p-6 flex items-center justify-center overflow-hidden">
                <div
                  onClick={handleCanvasClick}
                  style={{
                    width: '100%',
                    maxWidth: '560px',
                    aspectRatio: `${room.length} / ${room.width}`,
                    backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                  className="relative border-4 border-amber-500/80 bg-slate-900/90 rounded shadow-inner cursor-crosshair"
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono text-amber-400">
                    {room.length} м
                  </div>
                  <div className="absolute top-1/2 -left-10 -translate-y-1/2 -rotate-90 text-xs font-mono text-amber-400">
                    {room.width} м
                  </div>

                  {elements.map((el) => {
                    const leftPct = (el.x / room.length) * 100;
                    const topPct = (el.y / room.width) * 100;
                    const isSelected = selectedElementId === el.id;

                    if (el.kind === 'furniture') {
                      const widthPct = (el.w / room.length) * 100;
                      const heightPct = (el.h / room.width) * 100;
                      return (
                        <div
                          key={el.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                          style={{ left: `${leftPct}%`, top: `${topPct}%`, width: `${widthPct}%`, height: `${heightPct}%` }}
                          className={`absolute rounded flex items-center justify-center text-[11px] font-semibold text-center p-1 cursor-pointer transition ${
                            isSelected
                              ? 'bg-amber-500/40 border-2 border-amber-300 text-white z-20'
                              : 'bg-indigo-950/80 border border-indigo-400/60 text-indigo-200 hover:border-amber-400'
                          }`}
                        >
                          {el.name}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={el.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                        title={el.name}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold cursor-pointer shadow-md transition ${
                          isSelected ? 'ring-2 ring-white scale-110 z-20 ' : ''
                        }${
                          el.type === 'socket' ? 'bg-blue-600 text-white' :
                          el.type === 'switch' ? 'bg-emerald-600 text-white' :
                          el.type === 'light' ? 'bg-amber-500 text-slate-950' : 'bg-cyan-600 text-white'
                        }`}
                      >
                        {el.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Управление выбранным на чертеже элементом */}
              {selectedElementId && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-300">
                    Выбран объект: <b>{elements.find(e => e.id === selectedElementId)?.name}</b>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => moveSelected(-0.2, 0)} className="px-2.5 py-1 bg-slate-800 rounded text-xs">←</button>
                    <button onClick={() => moveSelected(0.2, 0)} className="px-2.5 py-1 bg-slate-800 rounded text-xs">→</button>
                    <button onClick={() => moveSelected(0, -0.2)} className="px-2.5 py-1 bg-slate-800 rounded text-xs">↑</button>
                    <button onClick={() => moveSelected(0, 0.2)} className="px-2.5 py-1 bg-slate-800 rounded text-xs">↓</button>
                    <button onClick={rotateSelected} className="px-2.5 py-1 bg-slate-800 rounded text-xs flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5" /> 90°
                    </button>
                    <button onClick={deleteSelected} className="px-2.5 py-1 bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded text-xs flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Удалить
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pies' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                Конструктор строительных «пирогов» и проверка формул расхода
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs text-slate-400 flex justify-between">
                    <span>Толщина стяжки пола (мм)</span>
                    <span className="font-bold text-amber-400">{screedThickness} мм</span>
                  </label>
                  <input
                    type="range" min="10" max="100" step="5"
                    value={screedThickness}
                    onChange={(e) => setScreedThickness(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 flex justify-between">
                    <span>Толщина штукатурки стен (мм)</span>
                    <span className="font-bold text-amber-400">{plasterThickness} мм</span>
                  </label>
                  <input
                    type="range" min="10" max="40" step="5"
                    value={plasterThickness}
                    onChange={(e) => setPlasterThickness(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Раскладка чистового пола (запас на подрезку)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setLayoutAngle('straight')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                        layoutAngle === 'straight' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Прямая (+5%)
                    </button>
                    <button
                      onClick={() => setLayoutAngle('diagonal')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                        layoutAngle === 'diagonal' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Диагональ / Елочка (+12%)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ценовой сегмент материалов</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['econom', 'standard', 'premium'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTier(t)}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold border capitalize ${
                          tier === t ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {t === 'econom' ? 'Эконом' : t === 'standard' ? 'Стандарт' : 'Премиум'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {bom.items.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{item.name}</div>
                      <div className="text-xs font-mono text-amber-400/90 mt-0.5">Формула: {item.formula}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">{item.qty} {item.unit}</span>
                      <div className="text-xs text-slate-400">{item.weightKg} кг • {(item.qty * item.prices[selectedStoreId]).toLocaleString('ru-RU')} ₽</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stores' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-amber-400" />
                  Агрегатор цен поставщиков и расчет тоннажа доставки
                </h2>
                <button
                  onClick={syncPrices}
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Синхронизировать прайс БД
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs text-slate-400 flex justify-between">
                    <span>Этаж подъема на объекте</span>
                    <span className="font-bold text-amber-400">{floorLevel} этаж</span>
                  </label>
                  <input
                    type="range" min="1" max="25"
                    value={floorLevel}
                    onChange={(e) => setFloorLevel(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 mt-2"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Грузовой лифт на объекте</div>
                    <div className="text-xs text-slate-400">Влияет на тариф разгрузки {bom.totalWeightTons} т</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasCargoLift}
                    onChange={(e) => setHasCargoLift(e.target.checked)}
                    className="w-5 h-5 accent-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {storesComparison.map((st) => {
                  const isSelected = st.id === selectedStoreId;
                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStoreId(st.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        isSelected ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-amber-400" />
                            <span className="font-bold text-base">{st.name}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{st.badge}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-amber-400">
                            {st.grandTotalMaterials.toLocaleString('ru-RU')} ₽
                          </div>
                          <div className="text-xs text-slate-400">
                            Товары: {st.materialsSum.toLocaleString('ru-RU')} ₽ + Доставка и подъем: {st.logisticsTotal.toLocaleString('ru-RU')} ₽
                          </div>
                          {foremanMode && (
                            <div className="text-xs text-emerald-400 font-semibold mt-1">
                              Партнерский кэшбэк прораба: +{st.foremanBonus.toLocaleString('ru-RU')} ₽
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'estimate' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold">Итоговая ведомость материалов и работ</h2>
                  <p className="text-xs text-slate-400">Поставщик: {activeStore.name} • Объект: {room.name}</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="no-print flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  <Printer className="w-4 h-4" /> Экспорт / Печать PDF
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2">Наименование позиции (с кратностью упаковки)</th>
                      <th className="py-2 text-right">Кол-во</th>
                      <th className="py-2 text-right">Цена</th>
                      <th className="py-2 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {bom.items.map((item) => {
                      const unitPrice = item.prices[selectedStoreId];
                      return (
                        <tr key={item.id}>
                          <td className="py-2.5 pr-2 font-medium">{item.name}</td>
                          <td className="py-2.5 text-right whitespace-nowrap">{item.qty} {item.unit}</td>
                          <td className="py-2.5 text-right whitespace-nowrap">{unitPrice.toLocaleString('ru-RU')} ₽</td>
                          <td className="py-2.5 text-right font-semibold whitespace-nowrap">{(item.qty * unitPrice).toLocaleString('ru-RU')} ₽</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-bold pt-2 border-t border-slate-800">Строительно-монтажные работы (СМР)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2">Этап работ</th>
                      <th className="py-2 text-right">Объем</th>
                      <th className="py-2 text-right">Расценка</th>
                      <th className="py-2 text-right">Итого</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {bom.works.map((w, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-2">{w.name}</td>
                        <td className="py-2 text-right whitespace-nowrap">{w.qty} {w.unit}</td>
                        <td className="py-2 text-right whitespace-nowrap">{w.rate.toLocaleString('ru-RU')} ₽</td>
                        <td className="py-2 text-right font-semibold whitespace-nowrap">{Math.round(w.qty * w.rate).toLocaleString('ru-RU')} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Правая сводная колонка — Живая смета (4 колонки) */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 sticky top-28">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Сводка по проекту</span>
              <span className="text-xs text-amber-400 font-semibold">{activeStore.name}</span>
            </div>

            <div className="space-y-2 text-xs border-b border-slate-800 pb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Материалы и мебель (с запасом):</span>
                <span className="font-semibold">{activeStore.materialsSum.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Доставка и подъем ({bom.totalWeightTons} т):</span>
                <span className="font-semibold">{activeStore.logisticsTotal.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Работы мастеров (СМР):</span>
                <span className="font-semibold">{bom.totalWorksCost.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Итого бюджет ремонта «Под ключ»:</div>
              <div className="text-2xl font-black text-amber-400 mt-0.5">
                {(activeStore.grandTotalMaterials + bom.totalWorksCost).toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                ≈ {Math.round((activeStore.grandTotalMaterials + bom.totalWorksCost) / geometry.floorArea).toLocaleString('ru-RU')} ₽ за м² по полу
              </div>
            </div>

            {foremanMode && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <div className="text-xs font-bold text-emerald-300">Скрытая панель Прораба / Комплектатора</div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Агентская скидка от поставщика:</span>
                  <span className="font-bold text-emerald-400">+{activeStore.foremanBonus.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Доход по смете работ:</span>
                  <span className="font-bold text-emerald-400">+{bom.totalWorksCost.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <Truck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Общий вес: <b>{bom.totalWeightKg} кг</b> ({bom.totalWeightTons} т). Требуется Газель Next / Валдай 3 т.</span>
            </div>
          </div>
        </aside>
      </main>

      {/* Модальное окно Голосового AI-замера (DeepSeek API) и Пресетов */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Голосовой AI-замер (DeepSeek API) & Пресеты
              </h3>
              <button onClick={() => setShowApiModal(false)} className="text-xs text-slate-400 hover:text-white">Закрыть ✕</button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Быстрые тестовые объекты в 1 клик:</label>
              <div className="space-y-1.5">
                {VOICE_PRESETS.map((pr, idx) => (
                  <button
                    key={idx}
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
                      setShowApiModal(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition"
                  >
                    <div className="text-xs font-bold text-amber-400">{pr.title}</div>
                    <div className="text-[11px] text-slate-400">«{pr.prompt}»</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-3">
              <label className="text-xs text-slate-300 font-semibold block">
                Живой голосовой ввод (Web Speech + DeepSeek API):
              </label>
              <textarea
                rows={2}
                value={voiceInputText}
                onChange={(e) => setVoiceInputText(e.target.value)}
                placeholder="Надиктуйте или введите: Комната 6 на 4 метра, потолок 2.9, стяжка 60 мм, штукатурка 20 мм..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs text-slate-100"
              />
              <input
                type="password"
                value={customDeepseekKey}
                onChange={(e) => setCustomDeepseekKey(e.target.value)}
                placeholder="DeepSeek API Key (sk-...) — либо укажите в .env"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-slate-300"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleMicRecord}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                    isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Mic className="w-4 h-4" /> {isListening ? 'Слушаю...' : 'Записать голос'}
                </button>
                <button
                  onClick={handleRunDeepSeekParse}
                  disabled={aiLoading}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {aiLoading ? 'Анализ...' : 'Рассчитать через DeepSeek'}
                </button>
              </div>
              {aiStatusMsg && <p className="text-xs text-amber-300">{aiStatusMsg}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
