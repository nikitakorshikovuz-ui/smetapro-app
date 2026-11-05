import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Ruler, Layers, ShoppingCart, FileText, Mic, Plus, Trash2, Check,
  AlertTriangle, Truck, Building2, Eye, EyeOff, Printer, Sparkles,
  Zap, Droplets, Sofa, DoorOpen, Maximize2, Info, ChevronRight,
  Package, Scale, Calendar, ShieldCheck, ArrowUpDown, RefreshCw,
  CheckCircle2, Sliders, Home, HelpCircle, Download, Compass, Move,
  Box, RotateCw, Camera, Sun, Palette, Code, Copy
} from 'lucide-react';

// --- ХУК СОХРАНЕНИЯ ДАННЫХ В ПАМЯТИ ТЕЛЕФОНА (OFFLINE-FIRST) ---
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
    } catch {
      // ignore storage quota errors
    }
  }, [key, value]);
  return [value, setValue];
}

// --- СПРАВОЧНИКИ И ГОТОВЫЕ 3D-ШАБЛОНЫ ПОМЕЩЕНИЙ ---

const ROOM_PRESETS = [
  {
    id: 'living_20',
    name: 'Гостиная 20 м² (Стандарт)',
    voiceText: '«Комната 5 на 4 метра, потолок 2.75, одно большое окно, одна дверь, на пол кварцвинил елочкой, стены под покраску, диван, шкаф-купе, ТВ-зона и розетки»',
    length: 5.0,
    width: 4.0,
    height: 2.75,
    openings: [
      { id: 'op1', type: 'door', wall: 'bottom', offset: 0.7, width: 0.9, height: 2.1, sillHeight: 0, name: 'Дверь входная в комнату' },
      { id: 'op2', type: 'window', wall: 'top', offset: 1.5, width: 1.8, height: 1.5, sillHeight: 0.85, name: 'Окно двухстворчатое' }
    ],
    points: [
      { id: 'p1', type: 'socket', x: 0.15, y: 0.7, z: 0.3, label: 'Розетки у дивана (H=30см)' },
      { id: 'p2', type: 'socket', x: 0.15, y: 3.3, z: 0.3, label: 'Розетка под торшер (H=30см)' },
      { id: 'p3', type: 'socket', x: 4.85, y: 2.2, z: 0.65, label: 'ТВ-зона: 4 розетки + LAN (H=65см)' },
      { id: 'p4', type: 'switch', x: 1.85, y: 3.85, z: 0.9, label: 'Выключатель 2-кл у двери (H=90см)' },
      { id: 'p5', type: 'light', x: 2.5, y: 2.0, z: 2.75, label: 'Люстра / Трековый свет' }
    ],
    furniture: [
      { id: 'f1', type: 'sofa', name: 'Диван угловой Лофт', x: 0.25, y: 1.0, w: 2.3, d: 1.0, h: 0.85, color: '#4f46e5', basePrice: 68000 },
      { id: 'f2', type: 'wardrobe', name: 'Шкаф-купе (ЛДСП Egger)', x: 3.1, y: 0.15, w: 1.7, d: 0.6, h: 2.6, color: '#d97706', basePrice: 88000 },
      { id: 'f3', type: 'tv_stand', name: 'Тумба ТВ подвесная + панель', x: 4.35, y: 1.4, w: 0.45, d: 1.8, h: 0.55, color: '#0284c7', basePrice: 38000 }
    ],
    config: {
      screedThickness: 40,
      floorType: 'quartzvinyl',
      floorLayout: 'diagonal',
      wallPlasterThickness: 15,
      wallFinish: 'paint',
      ceilingType: 'stretch_shadow'
    }
  },
  {
    id: 'kitchen_studio',
    name: 'Кухня-гостиная 26 м²',
    voiceText: '«Кухня-студия 6.5 на 4 метра, потолок 2.85, два панорамных окна, на пол керамогранит 60х60, стены под покраску, кухонный гарнитур с техникой и выводы воды»',
    length: 6.5,
    width: 4.0,
    height: 2.85,
    openings: [
      { id: 'op1', type: 'door', wall: 'bottom', offset: 1.0, width: 1.1, height: 2.2, sillHeight: 0, name: 'Портал в коридор' },
      { id: 'op2', type: 'window', wall: 'top', offset: 1.1, width: 1.9, height: 1.7, sillHeight: 0.75, name: 'Окно панорамное 1' },
      { id: 'op3', type: 'window', wall: 'top', offset: 3.8, width: 1.9, height: 1.7, sillHeight: 0.75, name: 'Окно панорамное 2' }
    ],
    points: [
      { id: 'p1', type: 'water', x: 0.15, y: 0.8, z: 0.55, label: 'Водорозетки мойка + ПММ (H=55см)' },
      { id: 'p2', type: 'socket', x: 0.15, y: 1.6, z: 1.1, label: 'Фартук: 4 розетки рабочей зоны (H=110см)' },
      { id: 'p3', type: 'socket', x: 0.15, y: 2.5, z: 0.3, label: 'Силовой вывод варочной 32А (H=30см)' },
      { id: 'p4', type: 'socket', x: 6.3, y: 2.0, z: 0.6, label: 'ТВ-зона гостиной (H=60см)' },
      { id: 'p5', type: 'switch', x: 2.35, y: 3.85, z: 0.9, label: 'Проходной выключатель (H=90см)' },
      { id: 'p6', type: 'light', x: 2.0, y: 2.0, z: 2.85, label: 'Подвес над столом' },
      { id: 'p7', type: 'light', x: 4.7, y: 2.0, z: 2.85, label: 'Трековая система гостиной' }
    ],
    furniture: [
      { id: 'f1', type: 'kitchen', name: 'Кухонный гарнитур (МДФ + Blum)', x: 0.15, y: 0.2, w: 0.65, d: 3.2, h: 2.4, color: '#059669', basePrice: 215000 },
      { id: 'f2', type: 'sofa', name: 'Диван модульный', x: 3.6, y: 0.35, w: 2.4, d: 1.05, h: 0.85, color: '#4f46e5', basePrice: 95000 },
      { id: 'f3', type: 'desk', name: 'Обеденный стол на 6 персон', x: 1.7, y: 1.5, w: 1.5, d: 0.9, h: 0.76, color: '#b45309', basePrice: 44000 }
    ],
    config: {
      screedThickness: 50,
      floorType: 'tile60',
      floorLayout: 'straight',
      wallPlasterThickness: 20,
      wallFinish: 'paint',
      ceilingType: 'gkl_paint'
    }
  },
  {
    id: 'bedroom_wardrobe',
    name: 'Спальня с гардеробной 16 м²',
    voiceText: '«Спальня 4 на 4 метра, потолок 2.70, окно 1.6 м, ламинат 33 класс прямой укладкой, обои под покраску, двуспальная кровать и большой встроенный шкаф»',
    length: 4.0,
    width: 4.0,
    height: 2.7,
    openings: [
      { id: 'op1', type: 'door', wall: 'bottom', offset: 0.5, width: 0.8, height: 2.1, sillHeight: 0, name: 'Дверь межкомнатная' },
      { id: 'op2', type: 'window', wall: 'top', offset: 1.2, width: 1.6, height: 1.4, sillHeight: 0.85, name: 'Окно в спальне' }
    ],
    points: [
      { id: 'p1', type: 'socket', x: 0.15, y: 0.7, z: 0.6, label: 'Тумба Лев: розетка + бра (H=60см)' },
      { id: 'p2', type: 'socket', x: 0.15, y: 3.1, z: 0.6, label: 'Тумба Прав: розетка + бра (H=60см)' },
      { id: 'p3', type: 'switch', x: 1.5, y: 3.85, z: 0.9, label: 'Выключатель у входа (H=90см)' },
      { id: 'p4', type: 'light', x: 2.0, y: 2.0, z: 2.7, label: 'Основная люстра' }
    ],
    furniture: [
      { id: 'f1', type: 'bed', name: 'Кровать 180×200 с изголовьем', x: 0.15, y: 0.95, w: 2.1, d: 1.9, h: 0.95, color: '#7c3aed', basePrice: 76000 },
      { id: 'f2', type: 'wardrobe', name: 'Гардеробный шкаф до потолка', x: 3.2, y: 0.2, w: 0.65, d: 2.8, h: 2.65, color: '#d97706', basePrice: 118000 }
    ],
    config: {
      screedThickness: 30,
      floorType: 'laminate33',
      floorLayout: 'straight',
      wallPlasterThickness: 12,
      wallFinish: 'wallpaper',
      ceilingType: 'stretch_shadow'
    }
  }
];

const TIER_MULTIPLIERS = {
  econom: {
    id: 'econom',
    name: 'Эконом (Бюджет)',
    desc: 'Базовые смеси (Волма, Старатели), ламинат/плитка РФ, мебель ЛДСП База',
    matFactor: 0.78,
    furnFactor: 0.75,
    brands: {
      plaster: 'Волма Слой (30 кг)',
      screed: 'Пескобетон М300 Русеан (40 кг)',
      primer: 'Грунтовка Лакра / Оптимист (10 л)',
      putty: 'Шпаклевка Ветонит LR+ (20 кг)',
      paint: 'Краска Dulux Базовая (9 л)',
      tileGlue: 'Клей плиточный Юнис Плюс (25 кг)',
      laminate: 'Ламинат Kronostar 33 кл.',
      quartz: 'Кварцвинил Alpine Floor База',
      tile: 'Керамогранит Cersanit 60х60'
    }
  },
  standard: {
    id: 'standard',
    name: 'Стандарт (Оптимум Прораба)',
    desc: 'Проверенные бренды: Knauf, Ceresit, Tarkett, ЛДСП Egger + фурнитура Boyard/Hettich',
    matFactor: 1.0,
    furnFactor: 1.0,
    brands: {
      plaster: 'Штукатурка Knauf Ротбанд (30 кг)',
      screed: 'Стяжка Weber.Vetonit 5000 (25 кг)',
      primer: 'Грунтовка Knauf Тифенгрунд (10 л)',
      putty: 'Шпаклевка паста Danogips SuperFinish (17 кг)',
      paint: 'Краска Tikkurila Euro Power 7 (9 л)',
      tileGlue: 'Клей Ceresit CM 14 Extra (25 кг)',
      laminate: 'Ламинат Tarkett Navigator 33 кл.',
      quartz: 'Кварцвинил SPC Fargo Comfort',
      tile: 'Керамогранит Kerama Marazzi 60х60'
    }
  },
  premium: {
    id: 'premium',
    name: 'Премиум (Дизайнерский)',
    desc: 'Топовые эластичные составы Litokol, краски Little Greene/Caparol, МДФ эмаль + Blum',
    matFactor: 1.42,
    furnFactor: 1.55,
    brands: {
      plaster: 'Штукатурка Knauf Гольдбанд / Диамант (30 кг)',
      screed: 'Стяжка быстротвердеющая Ceresit CN 88 (25 кг)',
      primer: 'Грунтовка концентрат Ceresit CT 17 (10 л)',
      putty: 'Шпаклевка Semin Sem Joint Compound (25 кг)',
      paint: 'Краска моющаяся Caparol Amphibolin (10 л)',
      tileGlue: 'Клей эластичный Litokol Litoflex K80 (25 кг)',
      laminate: 'Ламинат Quick-Step Impressive Ultra',
      quartz: 'Кварцвинил Moduleo Бельгия',
      tile: 'Керамогранит Italon 60х60 ректификат'
    }
  }
};

const VENDORS = [
  {
    id: 'lemana',
    name: 'Лемана ПРО (Крупный DIY)',
    badge: 'Мин. розничная цена на черновуху',
    priceIndex: 0.97,
    furnitureIndex: 0.92,
    stockPercent: 94,
    missingNote: 'Нет 1 позиции (Клей СВП) — автозамена на аналог Dexter',
    baseDelivery: 2400,
    perTonDelivery: 1200,
    climbPerKgFloor: 1.8,
    climbLiftPerKg: 0.7,
    contractorRebate: 0.06,
    deliveryTime: 'Завтра с 09:00 до 14:00'
  },
  {
    id: 'petrovich',
    name: 'СТД «Петрович» / СтройБаза Экспресс',
    badge: 'Лучший сервис и доставка за 4 часа',
    priceIndex: 1.02,
    furnitureIndex: 1.05,
    stockPercent: 100,
    missingNote: '100% позиций в наличии на одном складе',
    baseDelivery: 1900,
    perTonDelivery: 1100,
    climbPerKgFloor: 1.6,
    climbLiftPerKg: 0.6,
    contractorRebate: 0.10,
    deliveryTime: 'Сегодня через 4 часа (слот в 2 часа)'
  },
  {
    id: 'b2b_direct',
    name: 'ОптСклад «СтройКомплект» + Цех Мебели',
    badge: 'Прямой опт от дилера и распил с фабрики',
    priceIndex: 0.91,
    furnitureIndex: 0.86,
    stockPercent: 98,
    missingNote: 'Корпусная мебель под заказ по вашим размерам (7 дней)',
    baseDelivery: 3200,
    perTonDelivery: 950,
    climbPerKgFloor: 1.5,
    climbLiftPerKg: 0.5,
    contractorRebate: 0.14,
    deliveryTime: 'Черновуха завтра, мебель — 7 раб. дней'
  }
];

const WALL_COLORS = [
  { id: 'warm_sand', name: 'Теплый песок', hex: '#e5dec9' },
  { id: 'nordic_grey', name: 'Сканди серый', hex: '#cbd5e1' },
  { id: 'sage_green', name: 'Шалфей', hex: '#cbd5c0' },
  { id: 'loft_concrete', name: 'Лофт Бетон', hex: '#94a3b8' },
  { id: 'graphite_dark', name: 'Графит', hex: '#475569' }
];

// --- КОМПОНЕНТ ИНТЕРАКТИВНОГО 3D-ДВИЖКА (THREE.JS WEBGL) ---
function Room3DViewport({
  length,
  width,
  height,
  openings,
  points,
  furniture,
  floorType,
  wallColorHex,
  visibleLayers,
  selectedItemId,
  onSelectItem,
  collisions
}) {
  const mountRef = useRef(null);
  const [threeLoaded, setThreeLoaded] = useState(typeof window !== 'undefined' && !!window.THREE);
  const [cameraPreset, setCameraPreset] = useState('iso'); // 'iso' | 'top' | 'inside' | 'xray'
  const [showOpenZones, setShowOpenZones] = useState(true);
  const [lightMode, setLightMode] = useState('day'); // 'day' | 'evening'

  // Состояние сферической камеры для плавного вращения мышкой и пальцем на Android
  const camStateRef = useRef({
    theta: 0.75,
    phi: 0.95,
    radius: Math.max(length, width) * 1.65,
    targetX: 0,
    targetY: height * 0.35,
    targetZ: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0
  });

  // Подгрузка Three.js с CDN
  useEffect(() => {
    if (window.THREE) {
      setThreeLoaded(true);
      return;
    }
    const existing = document.getElementById('threejs-cdn-script');
    if (existing) {
      existing.addEventListener('load', () => setThreeLoaded(true));
      return;
    }
    const script = document.createElement('script');
    script.id = 'threejs-cdn-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = () => setThreeLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Переключение пресетов камеры
  const applyCameraPreset = (preset) => {
    setCameraPreset(preset);
    const maxDim = Math.max(length, width);
    if (preset === 'iso') {
      camStateRef.current.theta = 0.78;
      camStateRef.current.phi = 0.98;
      camStateRef.current.radius = maxDim * 1.65;
      camStateRef.current.targetY = height * 0.35;
    } else if (preset === 'top') {
      camStateRef.current.theta = 0.01;
      camStateRef.current.phi = 0.15;
      camStateRef.current.radius = maxDim * 1.85;
      camStateRef.current.targetY = 0;
    } else if (preset === 'inside') {
      camStateRef.current.theta = 0.4;
      camStateRef.current.phi = 1.42;
      camStateRef.current.radius = maxDim * 0.62;
      camStateRef.current.targetY = 1.35;
    } else if (preset === 'xray') {
      camStateRef.current.theta = -0.65;
      camStateRef.current.phi = 1.05;
      camStateRef.current.radius = maxDim * 1.55;
      camStateRef.current.targetY = height * 0.35;
    }
  };

  // Сборка и обновление 3D-сцены при любом изменении размеров, мебели или розеток
  useEffect(() => {
    if (!threeLoaded || !mountRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const container = mountRef.current;
    const w = container.clientWidth || 640;
    const h = container.clientHeight || 440;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightMode === 'day' ? 0x0f172a : 0x070a12);

    const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Освещение
    const ambientLight = new THREE.AmbientLight(
      lightMode === 'day' ? 0xffffff : 0xffdcb5,
      lightMode === 'day' ? 0.72 : 0.35
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, lightMode === 'day' ? 0.65 : 0.25);
    dirLight.position.set(length * 1.2, height * 2.8, width * 1.4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Точечные светильники из плана комнаты
    points
      .filter((p) => p.type === 'light')
      .forEach((lt) => {
        const ptLight = new THREE.PointLight(0xffe8b0, lightMode === 'evening' ? 1.1 : 0.45, 8);
        ptLight.position.set(lt.x - length / 2, height - 0.15, lt.y - width / 2);
        scene.add(ptLight);
      });

    // Вспомогательная сетка вокруг комнаты
    const gridHelper = new THREE.GridHelper(Math.max(length, width) + 4, (Math.max(length, width) + 4) * 2, 0x334155, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 1. ПОЛ ПОМЕЩЕНИЯ
    const floorColors = {
      quartzvinyl: 0xb88655,
      laminate33: 0x9c6b3b,
      tile60: 0x94a3b8
    };
    const floorGeo = new THREE.BoxGeometry(length, 0.08, width);
    const floorMat = new THREE.MeshStandardMaterial({
      color: floorColors[floorType] || 0xb88655,
      roughness: floorType === 'tile60' ? 0.25 : 0.55,
      metalness: 0.05
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.04, 0);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Сетка раскладки плитки или досок на полу
    const floorLinesGeo = new THREE.EdgesGeometry(floorGeo);
    const floorLines = new THREE.LineSegments(
      floorLinesGeo,
      new THREE.LineBasicMaterial({ color: 0x475569 })
    );
    floorMesh.add(floorLines);

    // 2. СТЕНЫ ПОМЕЩЕНИЯ (Задняя и Левая — сплошные, Передняя и Правая — полупрозрачные для обзора)
    const wallThick = 0.12;
    const isXray = cameraPreset === 'xray';
    const solidWallMat = new THREE.MeshStandardMaterial({
      color: wallColorHex || '#cbd5e1',
      roughness: 0.75,
      transparent: isXray,
      opacity: isXray ? 0.28 : 1.0
    });
    const cutawayWallMat = new THREE.MeshStandardMaterial({
      color: wallColorHex || '#cbd5e1',
      roughness: 0.75,
      transparent: true,
      opacity: cameraPreset === 'inside' ? 0.85 : 0.18
    });

    // Северная стена (Top: z = -width/2)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(length + wallThick * 2, height, wallThick), solidWallMat);
    northWall.position.set(0, height / 2, -width / 2 - wallThick / 2);
    scene.add(northWall);

    // Западная стена (Left: x = -length/2)
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, width), solidWallMat);
    westWall.position.set(-length / 2 - wallThick / 2, height / 2, 0);
    scene.add(westWall);

    // Южная стена (Bottom: z = +width/2) — полупрозрачная для удобного обзора
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(length + wallThick * 2, height, wallThick), cutawayWallMat);
    southWall.position.set(0, height / 2, width / 2 + wallThick / 2);
    scene.add(southWall);

    // Восточная стена (Right: x = +length/2) — полупрозрачная
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, width), cutawayWallMat);
    eastWall.position.set(length / 2 + wallThick / 2, height / 2, 0);
    scene.add(eastWall);

    // 3. ОКНА И ДВЕРИ В 3D
    if (visibleLayers.construct) {
      openings.forEach((op) => {
        const isWin = op.type === 'window';
        const opH = op.height || (isWin ? 1.5 : 2.1);
        const sill = isWin ? (op.sillHeight ?? 0.85) : 0;
        const centerY = sill + opH / 2;

        const meshGeo = new THREE.BoxGeometry(op.width, opH, wallThick + 0.04);
        const meshMat = new THREE.MeshStandardMaterial({
          color: isWin ? 0x38bdf8 : 0xd97706,
          transparent: isWin,
          opacity: isWin ? 0.55 : 0.92,
          roughness: isWin ? 0.1 : 0.6
        });
        const opMesh = new THREE.Mesh(meshGeo, meshMat);

        const posAlong = -length / 2 + op.offset + op.width / 2;
        const zWall = op.wall === 'bottom' ? width / 2 + wallThick / 2 : -width / 2 - wallThick / 2;
        opMesh.position.set(posAlong, centerY, zWall);
        scene.add(opMesh);

        // Рама проема
        const frameEdges = new THREE.LineSegments(
          new THREE.EdgesGeometry(meshGeo),
          new THREE.LineBasicMaterial({ color: isWin ? 0xe0f2fe : 0x78350f })
        );
        opMesh.add(frameEdges);

        // Зона открывания двери на полу
        if (!isWin && showOpenZones) {
          const arcGeo = new THREE.RingGeometry(0.05, op.width, 24, 1, 0, Math.PI / 2);
          const arcMat = new THREE.MeshBasicMaterial({
            color: 0xfb923c,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3
          });
          const arcMesh = new THREE.Mesh(arcGeo, arcMat);
          arcMesh.rotation.x = -Math.PI / 2;
          arcMesh.rotation.z = Math.PI / 2;
          arcMesh.position.set(-length / 2 + op.offset, 0.015, width / 2);
          scene.add(arcMesh);
        }
      });
    }

    // 4. 3D-МОДЕЛИ КОРПУСНОЙ И МЯГКОЙ МЕБЕЛИ С ПРОВЕРКОЙ КОЛЛИЗИЙ
    if (visibleLayers.furniture) {
      furniture.forEach((f) => {
        const isSel = selectedItemId === f.id;
        const hasCollision = collisions.some((c) => c.furnitureId === f.id);
        const fh = f.h || (f.type === 'wardrobe' ? 2.55 : f.type === 'kitchen' ? 2.35 : f.type === 'sofa' ? 0.85 : 0.8);

        const group = new THREE.Group();
        const centerX = -length / 2 + f.x + f.w / 2;
        const centerZ = -width / 2 + f.y + f.d / 2;
        group.position.set(centerX, 0, centerZ);

        const mainColor = hasCollision
          ? 0xef4444
          : isSel
          ? 0xf59e0b
          : f.color || 0x6366f1;

        if (f.type === 'sofa') {
          // Сиденье дивана + спинка + подлокотники
          const baseMesh = new THREE.Mesh(
            new THREE.BoxGeometry(f.w, fh * 0.48, f.d),
            new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.8 })
          );
          baseMesh.position.y = (fh * 0.48) / 2;
          group.add(baseMesh);

          const backMesh = new THREE.Mesh(
            new THREE.BoxGeometry(f.w, fh * 0.52, Math.min(0.25, f.d * 0.25)),
            new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.85 })
          );
          backMesh.position.set(0, fh * 0.74, -f.d / 2 + Math.min(0.25, f.d * 0.25) / 2);
          group.add(backMesh);
        } else if (f.type === 'kitchen') {
          // Нижние тумбы (H=85см) + Столешница + Верхние шкафы до потолка
          const lowerH = 0.86;
          const lowerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(f.w, lowerH, f.d),
            new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.5 })
          );
          lowerMesh.position.y = lowerH / 2;
          group.add(lowerMesh);

          // Столешница
          const topPlate = new THREE.Mesh(
            new THREE.BoxGeometry(f.w + 0.02, 0.04, f.d + 0.02),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 })
          );
          topPlate.position.y = lowerH + 0.02;
          group.add(topPlate);

          // Верхние антресольные модули (на высоте 1.45 м)
          const upperH = Math.max(0.6, fh - 1.45);
          const upperMesh = new THREE.Mesh(
            new THREE.BoxGeometry(f.w * 0.6, upperH, f.d),
            new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.45 })
          );
          upperMesh.position.set(-f.w * 0.2, 1.45 + upperH / 2, 0);
          group.add(upperMesh);
        } else if (f.type === 'bed') {
          // Каркас кровати + белый матрас + высокое изголовье
          const frameMesh = new THREE.Mesh(
            new THREE.BoxGeometry(f.w, 0.35, f.d),
            new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.7 })
          );
          frameMesh.position.y = 0.175;
          group.add(frameMesh);

          const mattressMesh = new THREE.Mesh(
            new THREE.BoxGeometry(f.w * 0.92, 0.22, f.d * 0.92),
            new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 })
          );
          mattressMesh.position.y = 0.42;
          group.add(mattressMesh);

          const headBoard = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, fh, f.d),
            new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.75 })
          );
          headBoard.position.set(-f.w / 2 + 0.07, fh / 2, 0);
          group.add(headBoard);
        } else {
          // Корпусной шкаф-купе / стол / ТВ-тумба
          const boxGeo = new THREE.BoxGeometry(f.w, fh, f.d);
          const boxMesh = new THREE.Mesh(
            boxGeo,
            new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.45 })
          );
          boxMesh.position.y = fh / 2;
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(boxGeo),
            new THREE.LineBasicMaterial({ color: isSel ? 0xfef08a : 0x1e293b })
          );
          boxMesh.add(edges);
          group.add(boxMesh);
        }

        // Зона открывания фасадов / выдвижных ящиков (50 см перед мебелью)
        if (showOpenZones && (f.type === 'wardrobe' || f.type === 'kitchen')) {
          const zoneGeo = new THREE.PlaneGeometry(f.w, 0.55);
          const zoneMat = new THREE.MeshBasicMaterial({
            color: hasCollision ? 0xef4444 : 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.22
          });
          const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
          zoneMesh.rotation.x = -Math.PI / 2;
          zoneMesh.position.set(0, 0.02, f.d / 2 + 0.275);
          group.add(zoneMesh);
        }

        scene.add(group);
      });
    }

    // 5. 3D-ТОЧКИ ЭЛЕКТРИКИ, СВЕТА И САНТЕХНИКИ НА РЕАЛЬНЫХ ВЫСОТАХ (Z)
    points.forEach((pt) => {
      if (pt.type === 'water' && !visibleLayers.plumbing) return;
      if (pt.type !== 'water' && !visibleLayers.electric) return;

      const defaultZ =
        pt.type === 'light'
          ? height - 0.05
          : pt.type === 'switch'
          ? 0.9
          : pt.type === 'water'
          ? 0.55
          : 0.3;
      const mountH = pt.z !== undefined ? pt.z : defaultZ;

      const colorMap = {
        socket: 0xef4444,
        switch: 0x3b82f6,
        light: 0xeab308,
        water: 0x06b6d4
      };

      const px = -length / 2 + pt.x;
      const pz = -width / 2 + pt.y;
      const isPtSelected = selectedItemId === pt.id;

      const sphereGeo = new THREE.SphereGeometry(isPtSelected ? 0.14 : 0.095, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: colorMap[pt.type] || 0xef4444,
        emissive: colorMap[pt.type] || 0xef4444,
        emissiveIntensity: pt.type === 'light' ? 0.8 : 0.35
      });
      const ptMesh = new THREE.Mesh(sphereGeo, sphereMat);
      ptMesh.position.set(px, mountH, pz);
      scene.add(ptMesh);

      // Лазерный отвес от точки до пола (показывает высоту монтажа)
      if (pt.type !== 'light') {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(px, 0, pz),
          new THREE.Vector3(px, mountH, pz)
        ]);
        const lineMat = new THREE.LineDashedMaterial({
          color: colorMap[pt.type] || 0xef4444,
          dashSize: 0.08,
          gapSize: 0.05
        });
        const verticalLine = new THREE.Line(lineGeo, lineMat);
        verticalLine.computeLineDistances();
        scene.add(verticalLine);
      }
    });

    // Функция обновления позиции камеры и рендера
    let reqId;
    const updateCameraAndRender = () => {
      const st = camStateRef.current;
      const cx = st.targetX + st.radius * Math.sin(st.phi) * Math.sin(st.theta);
      const cy = st.targetY + st.radius * Math.cos(st.phi);
      const cz = st.targetZ + st.radius * Math.sin(st.phi) * Math.cos(st.theta);
      camera.position.set(cx, Math.max(0.25, cy), cz);
      camera.lookAt(st.targetX, st.targetY, st.targetZ);
      renderer.render(scene, camera);
      reqId = requestAnimationFrame(updateCameraAndRender);
    };
    updateCameraAndRender();

    // Обработчики мыши и тач-экрана для вращения 3D-комнаты
    const domEl = renderer.domElement;
    const onPointerDown = (e) => {
      camStateRef.current.isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      camStateRef.current.lastX = clientX;
      camStateRef.current.lastY = clientY;
    };
    const onPointerMove = (e) => {
      if (!camStateRef.current.isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - camStateRef.current.lastX;
      const dy = clientY - camStateRef.current.lastY;
      camStateRef.current.lastX = clientX;
      camStateRef.current.lastY = clientY;

      camStateRef.current.theta -= dx * 0.008;
      camStateRef.current.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.04, camStateRef.current.phi - dy * 0.008));
    };
    const onPointerUp = () => {
      camStateRef.current.isDragging = false;
    };
    const onWheel = (e) => {
      e.preventDefault();
      camStateRef.current.radius = Math.max(2.2, Math.min(18, camStateRef.current.radius + e.deltaY * 0.005));
    };

    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    domEl.addEventListener('touchmove', onPointerMove, { passive: true });
    domEl.addEventListener('touchend', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(reqId);
      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('touchstart', onPointerDown);
      domEl.removeEventListener('touchmove', onPointerMove);
      domEl.removeEventListener('touchend', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [
    threeLoaded,
    length,
    width,
    height,
    openings,
    points,
    furniture,
    floorType,
    wallColorHex,
    visibleLayers,
    selectedItemId,
    cameraPreset,
    showOpenZones,
    lightMode,
    collisions
  ]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col">
      {/* Верхняя панель управления 3D-камерой и светом */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900/95 border-b border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
            <Camera className="w-3.5 h-3.5 text-amber-400" /> Ракурс 3D:
          </span>
          {[
            { id: 'iso', label: 'Изометрия' },
            { id: 'inside', label: 'Изнутри комнаты' },
            { id: 'top', label: 'Сверху 90°' },
            { id: 'xray', label: 'Рентген стен' }
          ].map((cam) => (
            <button
              key={cam.id}
              onClick={() => applyCameraPreset(cam.id)}
              className={`px-2.5 py-1 rounded-lg font-medium border transition ${
                cameraPreset === cam.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {cam.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOpenZones(!showOpenZones)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
              showOpenZones
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {showOpenZones ? 'Зоны открывания: ВКЛ' : 'Зоны открывания: ВЫКЛ'}
          </button>
          <button
            onClick={() => setLightMode(lightMode === 'day' ? 'evening' : 'day')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1 text-[11px]"
          >
            <Sun className="w-3.5 h-3.5" />
            {lightMode === 'day' ? 'Дневной свет' : 'Вечерний свет'}
          </button>
        </div>
      </div>

      {/* Интерактивный WebGL контейнер */}
      <div className="relative w-full h-[380px] sm:h-[440px]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Легенда поверх 3D-окна */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 flex items-center gap-3">
            <span>Вращение: зажмите мышь / палец</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Масштаб: колесо / 2 пальца</span>
          </div>

          <div className="bg-slate-950/85 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-2.5">
            <span className="flex items-center gap-1 text-red-300">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Розетки (H=30/110см)
            </span>
            <span className="flex items-center gap-1 text-blue-300">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Выкл. (H=90см)
            </span>
            <span className="flex items-center gap-1 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Вода (H=55см)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Навигация по вкладкам
  const [activeTab, setActiveTab] = useState('plan'); // 'plan' | 'pies' | 'market' | 'estimate'
  // Режим отображения в Модуле 1: '2d' | '3d' | 'split'
  const [viewportMode, setViewportMode] = useState('split');
  const [wallColorHex, setWallColorHex] = useStickyState('#cbd5e1', 'smeta_wall_color');

  // Геометрия помещения (с сохранением в localStorage телефона)
  const [length, setLength] = useStickyState(5.0, 'smeta_room_len');
  const [width, setWidth] = useStickyState(4.0, 'smeta_room_wid');
  const [height, setHeight] = useStickyState(2.75, 'smeta_room_h');

  // Проемы (Двери и Окна)
  const [openings, setOpenings] = useStickyState(ROOM_PRESETS[0].openings, 'smeta_openings');

  // Точки инженерки (Розетки, Выключатели, Свет, Сантехника с высотой монтажа Z)
  const [points, setPoints] = useStickyState(ROOM_PRESETS[0].points, 'smeta_points');

  // Мебель и корпусняк на плане (с 3D-высотой h)
  const [furniture, setFurniture] = useStickyState(ROOM_PRESETS[0].furniture, 'smeta_furniture');

  // Интерактивность 2D/3D-холста
  const [visibleLayers, setVisibleLayers] = useState({
    construct: true,
    electric: true,
    plumbing: true,
    furniture: true
  });
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'add_socket' | 'add_switch' | 'add_light' | 'add_water'
  const [selectedItemId, setSelectedItemId] = useState(null);

  // Параметры «Пирогов отделки» (Модуль 2)
  const [screedThickness, setScreedThickness] = useStickyState(40, 'smeta_screed_mm');
  const [floorType, setFloorType] = useStickyState('quartzvinyl', 'smeta_floor_type');
  const [floorLayout, setFloorLayout] = useStickyState('diagonal', 'smeta_floor_layout');
  const [includeSkirting, setIncludeSkirting] = useState(true);

  const [wallPlasterThickness, setWallPlasterThickness] = useStickyState(15, 'smeta_plaster_mm');
  const [wallFinish, setWallFinish] = useStickyState('paint', 'smeta_wall_finish');

  const [ceilingType, setCeilingType] = useStickyState('stretch_shadow', 'smeta_ceil_type');

  // Маркетплейс и логистика (Модуль 3)
  const [priceTier, setPriceTier] = useState('standard');
  const [selectedVendorId, setSelectedVendorId] = useState('petrovich');
  const [floorNumber, setFloorNumber] = useState(7);
  const [hasCargoLift, setHasCargoLift] = useState(true);

  // Живая смета и План-график (Модуль 4)
  const [viewMode, setViewMode] = useState('client');
  const [showFormulaDetails, setShowFormulaDetails] = useState(true);
  const [completedStages, setCompletedStages] = useState(['stage1']);

  // Модальные окна
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [activePresetVoice, setActivePresetVoice] = useState(ROOM_PRESETS[0]);
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showGithubHelperModal, setShowGithubHelperModal] = useState(false);

  const svgRef = useRef(null);

  // Применение готового 3D-пресета комнаты
  const applyPreset = (preset) => {
    setLength(preset.length);
    setWidth(preset.width);
    setHeight(preset.height);
    setOpenings(preset.openings);
    setPoints(preset.points);
    setFurniture(preset.furniture);
    setScreedThickness(preset.config.screedThickness);
    setFloorType(preset.config.floorType);
    setFloorLayout(preset.config.floorLayout);
    setWallPlasterThickness(preset.config.wallPlasterThickness);
    setWallFinish(preset.config.wallFinish);
    setCeilingType(preset.config.ceilingType);
    setSelectedItemId(null);
    setShowVoiceModal(false);
  };

  // --- АВТОМАТИЧЕСКИЙ ДЕТЕКТОР 3D-КОЛЛИЗИЙ (ШКАФ ПЕРЕКРЫЛ ВЫКЛЮЧАТЕЛЬ / РОЗЕТКУ) ---
  const collisions = useMemo(() => {
    const list = [];
    furniture.forEach((f) => {
      const fh = f.h || 0.85;
      points.forEach((pt) => {
        if (pt.type === 'light') return;
        const insideX = pt.x >= f.x - 0.12 && pt.x <= f.x + f.w + 0.12;
        const insideY = pt.y >= f.y - 0.12 && pt.y <= f.y + f.d + 0.12;
        const ptZ = pt.z ?? 0.3;
        if (insideX && insideY && ptZ < fh) {
          // Если это выключатель или высокий шкаф перекрыл розетку
          if (pt.type === 'switch' || f.type === 'wardrobe') {
            list.push({
              id: `${f.id}_${pt.id}`,
              furnitureId: f.id,
              pointId: pt.id,
              message: `Конфликт 3D: «${f.name}» (высота ${fh}м) перекрывает доступ к точке «${pt.label}» (высота ${ptZ}м)!`
            });
          }
        }
      });
    });
    return list;
  }, [furniture, points]);

  // --- МАТЕМАТИЧЕСКОЕ ЯДРО (КАСКАДНЫЙ ПЕРЕСЧЕТ) ---
  const metrics = useMemo(() => {
    const floorArea = +(length * width).toFixed(2);
    const perimeter = +(2 * (length + width)).toFixed(2);
    const grossWallArea = +(perimeter * height).toFixed(2);

    const openingsArea = +openings.reduce((acc, op) => acc + op.width * op.height, 0).toFixed(2);
    const doorsWidthSum = +openings
      .filter((op) => op.type === 'door')
      .reduce((acc, op) => acc + op.width, 0)
      .toFixed(2);

    const slopesLinearMeters = +openings
      .reduce((acc, op) => acc + op.height * 2 + op.width, 0)
      .toFixed(2);

    const netWallArea = Math.max(0, +(grossWallArea - openingsArea).toFixed(2));
    const netSkirtingLinear = Math.max(0, +(perimeter - doorsWidthSum).toFixed(2));
    const roomVolume = +(floorArea * height).toFixed(2);

    const socketsCount = points.filter((p) => p.type === 'socket').length;
    const switchesCount = points.filter((p) => p.type === 'switch').length;
    const lightsCount = points.filter((p) => p.type === 'light').length;
    const waterCount = points.filter((p) => p.type === 'water').length;

    return {
      floorArea,
      perimeter,
      grossWallArea,
      openingsArea,
      doorsWidthSum,
      slopesLinearMeters,
      netWallArea,
      netSkirtingLinear,
      roomVolume,
      socketsCount,
      switchesCount,
      lightsCount,
      waterCount,
      totalElectricPoints: socketsCount + switchesCount + lightsCount
    };
  }, [length, width, height, openings, points]);

  // --- РАСЧЕТ ПОЗИЦИЙ СМЕТЫ (МАТЕРИАЛЫ С КРАТНОСТЬЮ ТАРЫ + РАБОТЫ) ---
  const calculation = useMemo(() => {
    const tier = TIER_MULTIPLIERS[priceTier];
    const vendor = VENDORS.find((v) => v.id === selectedVendorId) || VENDORS[0];
    const mFactor = tier.matFactor * vendor.priceIndex;
    const fFactor = tier.furnFactor * vendor.furnitureIndex;

    const items = [];
    const works = [];

    // 1. ЧЕРНОВОЙ ПОЛ (СТЯЖКА + ГРУНТОВКА + ДЕМПФЕР)
    if (screedThickness > 0) {
      const rawScreedKg = +(metrics.floorArea * screedThickness * 1.8 * 1.05).toFixed(1);
      const bagSizeKg = 25;
      const bagsCount = Math.ceil(rawScreedKg / bagSizeKg);
      const bagPrice = Math.round(440 * mFactor);

      items.push({
        id: 'mat_screed',
        section: 'Черновые материалы (Пол и Стены)',
        name: tier.brands.screed,
        isHiddenConsumable: false,
        rawNeed: `${rawScreedKg} кг (слой ${screedThickness} мм)`,
        packInfo: `Мешок ${bagSizeKg} кг`,
        packsCount: bagsCount,
        unit: 'меш.',
        pricePerPack: bagPrice,
        totalPrice: bagsCount * bagPrice,
        weightKg: bagsCount * bagSizeKg,
        formula: `⌈ (${metrics.floorArea} м² × ${screedThickness} мм × 1.8 кг × 1.05 запас) / ${bagSizeKg} кг ⌉ = ${bagsCount} меш.`
      });

      const damperRolls = Math.ceil((metrics.perimeter * 1.05) / 25);
      const damperPrice = Math.round(480 * mFactor);
      items.push({
        id: 'mat_damper',
        section: 'Черновые материалы (Пол и Стены)',
        name: 'Демпферная кромочная лента (100 мм, рулон 25 м)',
        isHiddenConsumable: true,
        rawNeed: `${metrics.perimeter} пог. м`,
        packInfo: 'Рулон 25 м',
        packsCount: damperRolls,
        unit: 'рул.',
        pricePerPack: damperPrice,
        totalPrice: damperRolls * damperPrice,
        weightKg: damperRolls * 0.8,
        formula: `⌈ (${metrics.perimeter} м × 1.05) / 25 м в рулоне ⌉ = ${damperRolls} рул. (скрытый расходник)`
      });

      works.push({
        id: 'work_screed',
        section: 'Черновые работы',
        name: `Устройство стяжки пола по маякам (слой ${screedThickness} мм)`,
        volume: metrics.floorArea,
        unit: 'м²',
        rate: screedThickness > 50 ? 950 : 780,
        totalPrice: Math.round(metrics.floorArea * (screedThickness > 50 ? 950 : 780))
      });
    }

    // 2. ЧЕРНОВЫЕ СТЕНЫ (ШТУКАТУРКА ПО МАЯКАМ + ГРУНТОВКА + МАЯКИ)
    if (wallPlasterThickness > 0) {
      const rawPlasterKg = +(metrics.netWallArea * wallPlasterThickness * 0.85 * 1.05).toFixed(1);
      const bagSizeKg = 30;
      const bagsCount = Math.ceil(rawPlasterKg / bagSizeKg);
      const bagPrice = Math.round(620 * mFactor);

      items.push({
        id: 'mat_plaster',
        section: 'Черновые материалы (Пол и Стены)',
        name: tier.brands.plaster,
        isHiddenConsumable: false,
        rawNeed: `${rawPlasterKg} кг (слой ${wallPlasterThickness} мм)`,
        packInfo: `Мешок ${bagSizeKg} кг`,
        packsCount: bagsCount,
        unit: 'меш.',
        pricePerPack: bagPrice,
        totalPrice: bagsCount * bagPrice,
        weightKg: bagsCount * bagSizeKg,
        formula: `⌈ (${metrics.netWallArea} м² чист. стен × ${wallPlasterThickness} мм × 0.85 кг × 1.05) / 30 кг ⌉ = ${bagsCount} меш.`
      });

      const beaconsCount = Math.ceil(metrics.perimeter / 1.3) + 2;
      const beaconPrice = Math.round(95 * mFactor);
      items.push({
        id: 'mat_beacons',
        section: 'Черновые материалы (Пол и Стены)',
        name: 'Профиль маячковый 6 мм (3 м) + Уголок перфорированный с сеткой',
        isHiddenConsumable: true,
        rawNeed: `Шаг установки 1.3 м + ${metrics.slopesLinearMeters} м откосов`,
        packInfo: 'Штука 3 м',
        packsCount: beaconsCount,
        unit: 'шт.',
        pricePerPack: beaconPrice,
        totalPrice: beaconsCount * beaconPrice,
        weightKg: beaconsCount * 0.35,
        formula: `⌈ ${metrics.perimeter} м периметра / 1.3 м шаг ⌉ + откосы = ${beaconsCount} шт. (скрытый расходник)`
      });

      works.push({
        id: 'work_plaster',
        section: 'Черновые работы',
        name: `Выравнивание стен по маякам под 90° (слой ${wallPlasterThickness} мм)`,
        volume: metrics.netWallArea,
        unit: 'м²',
        rate: 850,
        totalPrice: Math.round(metrics.netWallArea * 850)
      });
    }

    // 3. ГРУНТОВКА ГЛУБОКОГО ПРОНИКНОВЕНИЯ
    const totalPrimeArea = +(metrics.floorArea + metrics.netWallArea * 2).toFixed(1);
    const rawPrimerLiters = +(totalPrimeArea * 0.18).toFixed(1);
    const primerCanisters = Math.ceil(rawPrimerLiters / 10);
    const primerPrice = Math.round(1150 * mFactor);
    items.push({
      id: 'mat_primer',
      section: 'Черновые материалы (Пол и Стены)',
      name: tier.brands.primer,
      isHiddenConsumable: true,
      rawNeed: `${rawPrimerLiters} л (площадь грунтования ${totalPrimeArea} м²)`,
      packInfo: 'Канистра 10 л',
      packsCount: primerCanisters,
      unit: 'кан.',
      pricePerPack: primerPrice,
      totalPrice: primerCanisters * primerPrice,
      weightKg: primerCanisters * 10.5,
      formula: `⌈ ((${metrics.floorArea} м² пол + ${metrics.netWallArea} м² × 2 цикла стены) × 0.18 л/м²) / 10 л ⌉ = ${primerCanisters} кан.`
    });

    // 4. ЧИСТОВОЕ ПОКРЫТИЕ ПОЛА + РАСХОДНИКИ
    const layoutFactor = floorLayout === 'diagonal' ? 1.12 : 1.05;
    const layoutText = floorLayout === 'diagonal' ? '+12% (Диагональ/Елочка)' : '+5% (Прямая раскладка)';
    const rawFloorCoverArea = +(metrics.floorArea * layoutFactor).toFixed(2);

    if (floorType === 'tile60') {
      const packSizeM2 = 1.44;
      const packsCount = Math.ceil(rawFloorCoverArea / packSizeM2);
      const packPrice = Math.round(2550 * mFactor);
      items.push({
        id: 'mat_floor_tile',
        section: 'Чистовая отделка',
        name: `${tier.brands.tile} (в пачке ${packSizeM2} м²)`,
        isHiddenConsumable: false,
        rawNeed: `${rawFloorCoverArea} м² с учетом ${layoutText}`,
        packInfo: `Упаковка ${packSizeM2} м²`,
        packsCount,
        unit: 'уп.',
        pricePerPack: packPrice,
        totalPrice: packsCount * packPrice,
        weightKg: +(packsCount * 31).toFixed(1),
        formula: `⌈ (${metrics.floorArea} м² × ${layoutFactor}) / ${packSizeM2} м² в пачке ⌉ = ${packsCount} уп. (фактически ${+(packsCount * packSizeM2).toFixed(2)} м²)`
      });

      const rawGlueKg = +(metrics.floorArea * 4.8 * 1.05).toFixed(1);
      const glueBags = Math.ceil(rawGlueKg / 25);
      const gluePrice = Math.round(790 * mFactor);
      items.push({
        id: 'mat_tile_glue',
        section: 'Чистовая отделка',
        name: `${tier.brands.tileGlue} + Система выравнивания плитки (СВП) и Затирка`,
        isHiddenConsumable: true,
        rawNeed: `${rawGlueKg} кг клея + 1 уп. СВП (500 шт) + 2 кг затирки`,
        packInfo: 'Мешок 25 кг + компл.',
        packsCount: glueBags,
        unit: 'компл.',
        pricePerPack: gluePrice + 350,
        totalPrice: glueBags * (gluePrice + 350),
        weightKg: glueBags * 25 + 3,
        formula: `⌈ (${metrics.floorArea} м² × 4.8 кг/м²) / 25 кг ⌉ = ${glueBags} меш. + СВП и эпоксидная/цементная затирка`
      });

      works.push({
        id: 'work_floor_tile',
        section: 'Чистовая отделка (Работы)',
        name: `Укладка керамогранита 60х60 с затиркой швов (${floorLayout === 'diagonal' ? 'по диагонали' : 'прямая'})`,
        volume: metrics.floorArea,
        unit: 'м²',
        rate: floorLayout === 'diagonal' ? 2100 : 1750,
        totalPrice: Math.round(metrics.floorArea * (floorLayout === 'diagonal' ? 2100 : 1750))
      });
    } else {
      const isQuartz = floorType === 'quartzvinyl';
      const packSizeM2 = isQuartz ? 2.15 : 1.98;
      const packsCount = Math.ceil(rawFloorCoverArea / packSizeM2);
      const packPrice = Math.round((isQuartz ? 3650 : 2350) * mFactor);

      items.push({
        id: 'mat_floor_lam',
        section: 'Чистовая отделка',
        name: `${isQuartz ? tier.brands.quartz : tier.brands.laminate} (пачка ${packSizeM2} м²)`,
        isHiddenConsumable: false,
        rawNeed: `${rawFloorCoverArea} м² с учетом ${layoutText}`,
        packInfo: `Упаковка ${packSizeM2} м²`,
        packsCount,
        unit: 'уп.',
        pricePerPack: packPrice,
        totalPrice: packsCount * packPrice,
        weightKg: +(packsCount * 16.5).toFixed(1),
        formula: `⌈ (${metrics.floorArea} м² × ${layoutFactor}) / ${packSizeM2} м² в пачке ⌉ = ${packsCount} уп. (фактически ${+(packsCount * packSizeM2).toFixed(2)} м²)`
      });

      const underlayPacks = Math.ceil((metrics.floorArea * 1.05) / 10);
      const underlayPrice = Math.round(1450 * mFactor);
      items.push({
        id: 'mat_underlay',
        section: 'Чистовая отделка',
        name: 'Подложка демпфирующая под замковые покрытия (уп. 10 м²) + пароизоляция',
        isHiddenConsumable: true,
        rawNeed: `${+(metrics.floorArea * 1.05).toFixed(1)} м²`,
        packInfo: 'Пачка 10 м²',
        packsCount: underlayPacks,
        unit: 'уп.',
        pricePerPack: underlayPrice,
        totalPrice: underlayPacks * underlayPrice,
        weightKg: underlayPacks * 2.5,
        formula: `⌈ (${metrics.floorArea} м² × 1.05) / 10 м² в пачке ⌉ = ${underlayPacks} уп. (скрытый расходник)`
      });

      works.push({
        id: 'work_floor_lam',
        section: 'Чистовая отделка (Работы)',
        name: `Укладка ${isQuartz ? 'кварцвинила SPC' : 'ламината 33 кл.'} на подложку (${floorLayout === 'diagonal' ? 'елочка/диагональ' : 'прямая'})`,
        volume: metrics.floorArea,
        unit: 'м²',
        rate: floorLayout === 'diagonal' ? 950 : 650,
        totalPrice: Math.round(metrics.floorArea * (floorLayout === 'diagonal' ? 950 : 650))
      });
    }

    // 5. ПЛИНТУС МДФ/ДЮРОПОЛИМЕР
    if (includeSkirting) {
      const rawSkirtingM = +(metrics.netSkirtingLinear * 1.08).toFixed(1);
      const planksCount = Math.ceil(rawSkirtingM / 2.4);
      const plankPrice = Math.round(780 * mFactor);
      items.push({
        id: 'mat_skirting',
        section: 'Чистовая отделка',
        name: 'Плинтус напольный МДФ / Дюрополимер 80 мм (хлыст 2.4 м) + жидкие гвозди',
        isHiddenConsumable: false,
        rawNeed: `${metrics.netSkirtingLinear} пог. м (периметр минус двери ${metrics.doorsWidthSum} м)`,
        packInfo: 'Профиль 2.4 м',
        packsCount: planksCount,
        unit: 'шт.',
        pricePerPack: plankPrice,
        totalPrice: planksCount * plankPrice,
        weightKg: planksCount * 1.6,
        formula: `⌈ ((${metrics.perimeter} м − ${metrics.doorsWidthSum} м двери) × 1.08 на торцовку 45°) / 2.4 м ⌉ = ${planksCount} хлыстов`
      });

      works.push({
        id: 'work_skirting',
        section: 'Чистовая отделка (Работы)',
        name: 'Монтаж напольного плинтуса с запилом углов под 45° и герметизацией',
        volume: metrics.netSkirtingLinear,
        unit: 'пог. м',
        rate: 450,
        totalPrice: Math.round(metrics.netSkirtingLinear * 450)
      });
    }

    // 6. ЧИСТОВАЯ ОТДЕЛКА СТЕН
    const rawPuttyKg = +(metrics.netWallArea * 1.6 * 1.05).toFixed(1);
    const puttyBuckets = Math.ceil(rawPuttyKg / 17);
    const puttyPrice = Math.round(2100 * mFactor);
    items.push({
      id: 'mat_putty',
      section: 'Чистовая отделка',
      name: `${tier.brands.putty} + Стеклохолст малярный «Паутинка» 40 г/м²`,
      isHiddenConsumable: true,
      rawNeed: `${rawPuttyKg} кг финишной пасты на ${metrics.netWallArea} м² стен`,
      packInfo: 'Ведро 17 кг',
      packsCount: puttyBuckets,
      unit: 'вед.',
      pricePerPack: puttyPrice,
      totalPrice: puttyBuckets * puttyPrice,
      weightKg: puttyBuckets * 17.5,
      formula: `⌈ (${metrics.netWallArea} м² × 1.6 кг/м² × 1.05) / 17 кг ⌉ = ${puttyBuckets} вед. (подготовка стен)`
    });

    if (wallFinish === 'paint') {
      const rawPaintLiters = +(metrics.netWallArea * 0.25 * 1.05).toFixed(1);
      const paintBuckets = Math.ceil(rawPaintLiters / 9);
      const paintPrice = Math.round(6900 * mFactor);
      items.push({
        id: 'mat_wall_paint',
        section: 'Чистовая отделка',
        name: `${tier.brands.paint} (колерованная, ведро 9 л)`,
        isHiddenConsumable: false,
        rawNeed: `${rawPaintLiters} л (покраска в 2 слоя)`,
        packInfo: 'Ведро 9 л',
        packsCount: paintBuckets,
        unit: 'вед.',
        pricePerPack: paintPrice,
        totalPrice: paintBuckets * paintPrice,
        weightKg: paintBuckets * 12,
        formula: `⌈ (${metrics.netWallArea} м² × 0.25 л в 2 слоя × 1.05) / 9 л ⌉ = ${paintBuckets} вед.`
      });

      works.push({
        id: 'work_wall_paint',
        section: 'Чистовая отделка (Работы)',
        name: 'Шпаклевание под лампу Лосева (К4), поклейка стеклохолста и покраска в 2 слоя',
        volume: metrics.netWallArea,
        unit: 'м²',
        rate: 1350,
        totalPrice: Math.round(metrics.netWallArea * 1350)
      });
    } else if (wallFinish === 'wallpaper') {
      const rollsCount = Math.ceil((metrics.netWallArea * 1.1) / 22);
      const rollPrice = Math.round(3400 * mFactor);
      items.push({
        id: 'mat_wallpaper',
        section: 'Чистовая отделка',
        name: 'Обои антивандальные флизелиновые (рулон 1.06×25 м) + спецклей Quelyd',
        isHiddenConsumable: false,
        rawNeed: `${metrics.netWallArea} м² чистых стен (+10% подгонка полотен)`,
        packInfo: 'Рулон 25 м',
        packsCount: rollsCount,
        unit: 'рул.',
        pricePerPack: rollPrice,
        totalPrice: rollsCount * rollPrice,
        weightKg: rollsCount * 4.5,
        formula: `⌈ (${metrics.netWallArea} м² × 1.10) / 22 м² полезной площади рулона ⌉ = ${rollsCount} рул.`
      });

      works.push({
        id: 'work_wallpaper',
        section: 'Чистовая отделка (Работы)',
        name: 'Финишная шпаклевка стен и поклейка флизелиновых обоев без видимых швов',
        volume: metrics.netWallArea,
        unit: 'м²',
        rate: 890,
        totalPrice: Math.round(metrics.netWallArea * 890)
      });
    } else {
      const decorBuckets = Math.ceil((metrics.netWallArea * 1.08) / 12);
      const decorPrice = Math.round(5800 * mFactor);
      items.push({
        id: 'mat_decor',
        section: 'Чистовая отделка',
        name: 'Декоративная штукатурка «Шелк / Травертин» + кварцевый грунт и воск (15 кг)',
        isHiddenConsumable: false,
        rawNeed: `${metrics.netWallArea} м²`,
        packInfo: 'Комплект 15 кг',
        packsCount: decorBuckets,
        unit: 'компл.',
        pricePerPack: decorPrice,
        totalPrice: decorBuckets * decorPrice,
        weightKg: decorBuckets * 16,
        formula: `⌈ (${metrics.netWallArea} м² × 1.08) / 12 м² на ведро ⌉ = ${decorBuckets} компл.`
      });

      works.push({
        id: 'work_decor',
        section: 'Чистовая отделка (Работы)',
        name: 'Нанесение декоративной штукатурки кельмой с защитной лессировкой воском',
        volume: metrics.netWallArea,
        unit: 'м²',
        rate: 1650,
        totalPrice: Math.round(metrics.netWallArea * 1650)
      });
    }

    // 7. ПОТОЛОК
    if (ceilingType === 'stretch_shadow') {
      const ceilPricePerM2 = Math.round(1450 * mFactor);
      items.push({
        id: 'mat_ceil_stretch',
        section: 'Потолочная система',
        name: 'Полотно натяжное MSD Evolution + Теневой профиль EuroKraab по периметру',
        isHiddenConsumable: false,
        rawNeed: `${metrics.floorArea} м² + ${metrics.perimeter} пог. м профиля + ${metrics.lightsCount} закладных`,
        packInfo: 'Комплект на комнату',
        packsCount: 1,
        unit: 'компл.',
        pricePerPack: Math.round(metrics.floorArea * ceilPricePerM2),
        totalPrice: Math.round(metrics.floorArea * ceilPricePerM2),
        weightKg: +(metrics.floorArea * 0.6).toFixed(1),
        formula: `${metrics.floorArea} м² полотна + ${metrics.perimeter} м теневого примыкания EuroKraab`
      });

      works.push({
        id: 'work_ceil_stretch',
        section: 'Чистовая отделка (Работы)',
        name: 'Монтаж теневого натяжного потолка с обводом углов и установкой светильников',
        volume: metrics.floorArea,
        unit: 'м²',
        rate: 1100,
        totalPrice: Math.round(metrics.floorArea * 1100)
      });
    } else {
      const gklSheets = Math.ceil((metrics.floorArea * 1.12) / 3.0);
      const sheetPrice = Math.round(1380 * mFactor);
      items.push({
        id: 'mat_ceil_gkl',
        section: 'Потолочная система',
        name: 'Гипсокартон Knauf ВГКЛ 9.5 мм (лист 3 м²) + металлокаркас ПП 60×27, крабы и подвесы',
        isHiddenConsumable: false,
        rawNeed: `${+(metrics.floorArea * 1.12).toFixed(1)} м² с учетом раскроя +12%`,
        packInfo: 'Лист 3 м² + профиль',
        packsCount: gklSheets,
        unit: 'компл.',
        pricePerPack: sheetPrice,
        totalPrice: gklSheets * sheetPrice,
        weightKg: gklSheets * 26,
        formula: `⌈ (${metrics.floorArea} м² × 1.12 запас раскроя) / 3.0 м² площадь листа ⌉ = ${gklSheets} комплектов`
      });

      works.push({
        id: 'work_ceil_gkl',
        section: 'Чистовая отделка (Работы)',
        name: 'Монтаж потолка из ГКЛ на металлокаркасе, заделка швов Knauf Uniflott и покраска',
        volume: metrics.floorArea,
        unit: 'м²',
        rate: 2200,
        totalPrice: Math.round(metrics.floorArea * 2200)
      });
    }

    // 8. ИНЖЕНЕРКА (ЭЛЕКТРИКА И САНТЕХНИКА С УЧЕТОМ 3D-ВЫСОТ ПОДЪЕМА КАБЕЛЯ)
    if (metrics.totalElectricPoints > 0) {
      const cableMeters = +(
        points
          .filter((p) => p.type !== 'water')
          .reduce((acc, p) => acc + 5.5 + (height - (p.z ?? 0.3)), 0)
      ).toFixed(1);
      const cableCoils = Math.ceil(cableMeters / 50);
      const mechUnitPrice = Math.round(890 * mFactor);

      items.push({
        id: 'mat_electric_pts',
        section: 'Инженерка (Электрика и Сантехника)',
        name: 'Подрозетники глубокие + Механизмы розеток/выключателей + Кабель ВВГнг(А)-LS ГОСТ',
        isHiddenConsumable: false,
        rawNeed: `${metrics.socketsCount} роз., ${metrics.switchesCount} выкл., ${metrics.lightsCount} свет (~${cableMeters} м трассы с учетом спусков по 3D-высотам)`,
        packInfo: `Комплект на точку + ${cableCoils} бухт по 50м`,
        packsCount: metrics.totalElectricPoints,
        unit: 'точек',
        pricePerPack: mechUnitPrice,
        totalPrice: metrics.totalElectricPoints * mechUnitPrice + cableCoils * Math.round(4200 * mFactor),
        weightKg: +(metrics.totalElectricPoints * 1.2 + cableCoils * 6.5).toFixed(1),
        formula: `${metrics.totalElectricPoints} точек на 3D-модели + ⌈ ${cableMeters} м кабеля с учетом высот H / 50 м бухта ⌉`
      });

      works.push({
        id: 'work_electric',
        section: 'Инженерные работы',
        name: 'Алмазное штробление, прокладка кабеля по ГОСТ, вмазка подрозетников и чистовой монтаж',
        volume: metrics.totalElectricPoints,
        unit: 'точ.',
        rate: 1850,
        totalPrice: metrics.totalElectricPoints * 1850
      });
    }

    if (metrics.waterCount > 0) {
      const waterPrice = Math.round(4600 * mFactor);
      items.push({
        id: 'mat_plumbing',
        section: 'Инженерка (Электрика и Сантехника)',
        name: 'Трубы сшитый полиэтилен Rehau / Stout + водорозетки и отводы канализации Ostendorf',
        isHiddenConsumable: false,
        rawNeed: `${metrics.waterCount} узлов водоразбора на плане`,
        packInfo: 'Узел подключения',
        packsCount: metrics.waterCount,
        unit: 'узл.',
        pricePerPack: waterPrice,
        totalPrice: metrics.waterCount * waterPrice,
        weightKg: metrics.waterCount * 4.5,
        formula: `${metrics.waterCount} сантех. узла на плане × комплект фитингов и труб ХВС/ГВС`
      });

      works.push({
        id: 'work_plumbing',
        section: 'Инженерные работы',
        name: 'Разводка водоснабжения (ХВС/ГВС) и канализации с опрессовкой системы',
        volume: metrics.waterCount,
        unit: 'узл.',
        rate: 4200,
        totalPrice: metrics.waterCount * 4200
      });
    }

    // 9. МЕБЕЛЬ И КОРПУСНЯК (С 3D-ОБЪЕМА)
    furniture.forEach((f) => {
      const fh = f.h || 0.85;
      const itemPrice = Math.round(f.basePrice * fFactor);
      const areaM2 = +(f.w * f.d).toFixed(2);
      items.push({
        id: `furn_${f.id}`,
        section: 'Мебель и Корпусняк (3D-модели)',
        name: `${f.name} (Ш×Г×В: ${f.w}×${f.d}×${fh} м)`,
        isHiddenConsumable: false,
        rawNeed: `Пятно застройки ${areaM2} м², высота корпуса ${fh} м`,
        packInfo: 'Комплект в упаковке',
        packsCount: 1,
        unit: 'шт.',
        pricePerPack: itemPrice,
        totalPrice: itemPrice,
        weightKg: Math.round(f.w * f.d * fh * 38 + 30),
        formula: `Расчет по 3D-габариту ${f.w}×${f.d}×${fh} м с учетом сегмента фурнитуры (${tier.name})`
      });
    });

    if (furniture.length > 0) {
      const totalFurnCost = items
        .filter((i) => i.section.includes('Мебель'))
        .reduce((acc, i) => acc + i.totalPrice, 0);
      works.push({
        id: 'work_furniture_assembly',
        section: 'Сборка и монтаж мебели',
        name: `Профессиональная сборка, подгонка в ниши и навеска корпусной мебели (${furniture.length} поз.)`,
        volume: furniture.length,
        unit: 'изд.',
        rate: Math.round((totalFurnCost * 0.08) / furniture.length),
        totalPrice: Math.round(totalFurnCost * 0.08)
      });
    }

    // ИТОГИ И ЛОГИСТИКА
    const totalWeightKg = Math.round(items.reduce((acc, i) => acc + i.weightKg, 0));
    const totalWeightTons = +(totalWeightKg / 1000).toFixed(2);

    const materialsRetailCost = items.reduce((acc, i) => acc + i.totalPrice, 0);
    const worksTotalCost = works.reduce((acc, w) => acc + w.totalPrice, 0);

    const calcVendorLogistics = (v) => {
      const delivery = Math.round(v.baseDelivery + totalWeightTons * v.perTonDelivery);
      const climb = hasCargoLift
        ? Math.round(totalWeightKg * v.climbLiftPerKg)
        : Math.round(totalWeightKg * v.climbPerKgFloor * Math.max(1, floorNumber));
      return {
        delivery,
        climb,
        totalLogistics: delivery + climb
      };
    };

    const currentLogistics = calcVendorLogistics(vendor);
    const contractorDiscountAmount = Math.round(materialsRetailCost * vendor.contractorRebate);
    const netMaterialsForContractor = materialsRetailCost - contractorDiscountAmount;

    const grandTotalClient = materialsRetailCost + worksTotalCost + currentLogistics.totalLogistics;
    const grandTotalContractorNet = netMaterialsForContractor + worksTotalCost + currentLogistics.totalLogistics;

    const vendorComparison = VENDORS.map((v) => {
      const ratioMat = v.priceIndex / vendor.priceIndex;
      const ratioFurn = v.furnitureIndex / vendor.furnitureIndex;

      const vMatCost = Math.round(
        items.reduce((acc, item) => {
          const isFurn = item.section.includes('Мебель');
          return acc + item.totalPrice * (isFurn ? ratioFurn : ratioMat);
        }, 0)
      );
      const vLog = calcVendorLogistics(v);
      const vRebate = Math.round(vMatCost * v.contractorRebate);

      return {
        ...v,
        cartCost: vMatCost,
        logistics: vLog,
        totalWithDelivery: vMatCost + vLog.totalLogistics,
        rebateAmount: vRebate
      };
    });

    return {
      items,
      works,
      totalWeightKg,
      totalWeightTons,
      materialsRetailCost,
      worksTotalCost,
      currentLogistics,
      contractorDiscountAmount,
      netMaterialsForContractor,
      grandTotalClient,
      grandTotalContractorNet,
      vendorComparison,
      currentVendor: vendor,
      currentTier: tier
    };
  }, [
    metrics,
    points,
    height,
    screedThickness,
    floorType,
    floorLayout,
    includeSkirting,
    wallPlasterThickness,
    wallFinish,
    ceilingType,
    furniture,
    priceTier,
    selectedVendorId,
    floorNumber,
    hasCargoLift
  ]);

  // --- ОБРАБОТЧИКИ 2D/3D-ПЛАНА ---
  const handleCanvasClick = (e) => {
    if (activeTool === 'select') {
      setSelectedItemId(null);
      return;
    }

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const pad = 45;
    const scale = 72;
    const svgWidth = length * scale + pad * 2;
    const svgHeight = width * scale + pad * 2;

    const clickX = ((e.clientX - rect.left) / rect.width) * svgWidth - pad;
    const clickY = ((e.clientY - rect.top) / rect.height) * svgHeight - pad;

    const meterX = Math.max(0.15, Math.min(length - 0.15, +(clickX / scale).toFixed(2)));
    const meterY = Math.max(0.15, Math.min(width - 0.15, +(clickY / scale).toFixed(2)));

    const toolMap = {
      add_socket: { type: 'socket', z: 0.3, label: 'Розетка 220В (H=30см)' },
      add_switch: { type: 'switch', z: 0.9, label: 'Выключатель света (H=90см)' },
      add_light: { type: 'light', z: height, label: 'Точка освещения (Потолок)' },
      add_water: { type: 'water', z: 0.55, label: 'Вывод воды ГВС/ХВС (H=55см)' }
    };

    const meta = toolMap[activeTool];
    if (meta) {
      const newPoint = {
        id: `pt_${Date.now()}`,
        type: meta.type,
        x: meterX,
        y: meterY,
        z: meta.z,
        label: meta.label
      };
      setPoints((prev) => [...prev, newPoint]);
      setSelectedItemId(newPoint.id);
      setActiveTool('select');
    }
  };

  const addFurniturePreset = (presetType) => {
    const presets = {
      wardrobe: { name: 'Шкаф-купе корпусной (ЛДСП Egger)', w: 1.8, d: 0.6, h: 2.55, color: '#d97706', basePrice: 88000 },
      bed: { name: 'Кровать двуспальная 160×200', w: 2.05, d: 1.75, h: 0.95, color: '#7c3aed', basePrice: 72000 },
      sofa: { name: 'Диван прямой 3-местный', w: 2.2, d: 0.95, h: 0.85, color: '#4f46e5', basePrice: 64000 },
      kitchen: { name: 'Кухонный гарнитур (МДФ + техника)', w: 2.6, d: 0.6, h: 2.4, color: '#059669', basePrice: 175000 },
      desk: { name: 'Рабочий стол + тумба', w: 1.4, d: 0.65, h: 0.76, color: '#0284c7', basePrice: 31000 }
    };
    const item = presets[presetType];
    if (!item) return;

    const newFurn = {
      id: `f_${Date.now()}`,
      type: presetType,
      name: item.name,
      x: +(length / 2 - item.w / 2).toFixed(2),
      y: +(width / 2 - item.d / 2).toFixed(2),
      w: item.w,
      d: item.d,
      h: item.h,
      color: item.color,
      basePrice: item.basePrice
    };
    setFurniture((prev) => [...prev, newFurn]);
    setSelectedItemId(newFurn.id);
  };

  const addOpening = (type) => {
    const isDoor = type === 'door';
    const newOp = {
      id: `op_${Date.now()}`,
      type,
      wall: isDoor ? 'bottom' : 'top',
      offset: 0.6,
      width: isDoor ? 0.9 : 1.5,
      height: isDoor ? 2.1 : 1.5,
      sillHeight: isDoor ? 0 : 0.85,
      name: isDoor ? 'Дверной проем' : 'Оконный проем'
    };
    setOpenings((prev) => [...prev, newOp]);
  };

  const moveSelectedItem = (dx, dy) => {
    if (!selectedItemId) return;
    setFurniture((prev) =>
      prev.map((f) =>
        f.id === selectedItemId
          ? {
              ...f,
              x: Math.max(0.1, Math.min(length - f.w - 0.1, +(f.x + dx).toFixed(2))),
              y: Math.max(0.1, Math.min(width - f.d - 0.1, +(f.y + dy).toFixed(2)))
            }
          : f
      )
    );
    setPoints((prev) =>
      prev.map((p) =>
        p.id === selectedItemId
          ? {
              ...p,
              x: Math.max(0.1, Math.min(length - 0.1, +(p.x + dx).toFixed(2))),
              y: Math.max(0.1, Math.min(width - 0.1, +(p.y + dy).toFixed(2)))
            }
          : p
      )
    );
  };

  const updateSelectedElevationOrHeight = (deltaH) => {
    if (!selectedItemId) return;
    setFurniture((prev) =>
      prev.map((f) =>
        f.id === selectedItemId
          ? { ...f, h: Math.max(0.4, Math.min(height - 0.05, +((f.h || 0.85) + deltaH).toFixed(2))) }
          : f
      )
    );
    setPoints((prev) =>
      prev.map((p) =>
        p.id === selectedItemId
          ? { ...p, z: Math.max(0.15, Math.min(height, +((p.z ?? 0.3) + deltaH).toFixed(2))) }
          : p
      )
    );
  };

  const rotateSelectedFurniture = () => {
    if (!selectedItemId) return;
    setFurniture((prev) =>
      prev.map((f) =>
        f.id === selectedItemId
          ? {
              ...f,
              w: f.d,
              d: f.w
            }
          : f
      )
    );
  };

  const deleteSelectedItem = () => {
    if (!selectedItemId) return;
    setFurniture((prev) => prev.filter((f) => f.id !== selectedItemId));
    setPoints((prev) => prev.filter((p) => p.id !== selectedItemId));
    setSelectedItemId(null);
  };

  const selectedEntity = useMemo(() => {
    return (
      furniture.find((f) => f.id === selectedItemId) ||
      points.find((p) => p.id === selectedItemId) ||
      null
    );
  }, [selectedItemId, furniture, points]);

  const formatRub = (val) => new Intl.NumberFormat('ru-RU').format(Math.round(val)) + ' ₽';

  // --- РЕНДЕР 2D-ЧЕРТЕЖА ПОМЕЩЕНИЯ ---
  const render2DCanvas = () => {
    const pad = 45;
    const scale = 72;
    const roomW = length * scale;
    const roomH = width * scale;
    const svgW = roomW + pad * 2;
    const svgH = roomH + pad * 2;

    return (
      <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">2D-Чертеж (1 кл. = 0.5 м)</span>
            {activeTool !== 'select' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                Кликните на план для установки точки
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>S: <strong className="text-white">{metrics.floorArea} м²</strong></span>
            <span>Стены: <strong className="text-white">{metrics.netWallArea} м²</strong></span>
          </div>
        </div>

        <div className="w-full overflow-x-auto flex justify-center p-2 sm:p-4">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgW} ${svgH}`}
            onClick={handleCanvasClick}
            className={`w-full max-w-[650px] h-auto select-none ${
              activeTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'
            }`}
          >
            <defs>
              <pattern id="smallGrid" width={scale * 0.5} height={scale * 0.5} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${scale * 0.5} 0 L 0 0 0 ${scale * 0.5}`}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="1"
                />
              </pattern>
              <pattern id="meterGrid" width={scale} height={scale} patternUnits="userSpaceOnUse">
                <rect width={scale} height={scale} fill="url(#smallGrid)" />
                <path
                  d={`M ${scale} 0 L 0 0 0 ${scale}`}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1.2"
                />
              </pattern>
            </defs>

            <g transform={`translate(${pad}, ${pad})`}>
              <rect
                x="0"
                y="0"
                width={roomW}
                height={roomH}
                fill="url(#meterGrid)"
                stroke="#94a3b8"
                strokeWidth="6"
              />

              {/* Размерные линии */}
              <g className="text-[11px] fill-amber-400 font-mono font-bold">
                <line x1="0" y1="-18" x2={roomW} y2="-18" stroke="#f59e0b" strokeWidth="1.5" />
                <line x1="0" y1="-24" x2="0" y2="-12" stroke="#f59e0b" strokeWidth="1.5" />
                <line x1={roomW} y1="-24" x2={roomW} y2="-12" stroke="#f59e0b" strokeWidth="1.5" />
                <rect x={roomW / 2 - 36} y="-28" width="72" height="18" rx="4" fill="#0f172a" />
                <text x={roomW / 2} y="-15" textAnchor="middle">
                  {length.toFixed(2)} м
                </text>

                <line x1="-18" y1="0" x2="-18" y2={roomH} stroke="#f59e0b" strokeWidth="1.5" />
                <line x1="-24" y1="0" x2="-12" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
                <line x1="-24" y1={roomH} x2="-12" y2={roomH} stroke="#f59e0b" strokeWidth="1.5" />
                <text
                  x="-24"
                  y={roomH / 2}
                  textAnchor="middle"
                  transform={`rotate(-90, -24, ${roomH / 2})`}
                >
                  {width.toFixed(2)} м
                </text>
              </g>

              {/* СЛОЙ 1: ПРОЕМЫ */}
              {visibleLayers.construct &&
                openings.map((op) => {
                  const opPx = op.width * scale;
                  const offPx = Math.min(op.offset * scale, (op.wall === 'top' || op.wall === 'bottom' ? roomW : roomH) - opPx);

                  if (op.type === 'window') {
                    const yPos = op.wall === 'bottom' ? roomH - 4 : -4;
                    return (
                      <g key={op.id}>
                        <rect
                          x={offPx}
                          y={yPos}
                          width={opPx}
                          height="8"
                          fill="#38bdf8"
                          stroke="#0284c7"
                          strokeWidth="1.5"
                        />
                        <text
                          x={offPx + opPx / 2}
                          y={op.wall === 'bottom' ? roomH + 16 : -8}
                          textAnchor="middle"
                          className="text-[9px] fill-sky-300 font-mono"
                        >
                          Окно {op.width}×{op.height}м
                        </text>
                      </g>
                    );
                  } else {
                    const yPos = op.wall === 'top' ? -4 : roomH - 4;
                    return (
                      <g key={op.id}>
                        <rect
                          x={offPx}
                          y={yPos}
                          width={opPx}
                          height="8"
                          fill="#fb923c"
                          stroke="#ea580c"
                          strokeWidth="1.5"
                        />
                        {op.wall === 'bottom' && (
                          <path
                            d={`M ${offPx} ${roomH} L ${offPx} ${roomH - opPx} A ${opPx} ${opPx} 0 0 1 ${
                              offPx + opPx
                            } ${roomH}`}
                            fill="rgba(251, 146, 60, 0.14)"
                            stroke="#fb923c"
                            strokeDasharray="3 3"
                            strokeWidth="1.2"
                          />
                        )}
                        <text
                          x={offPx + opPx / 2}
                          y={op.wall === 'bottom' ? roomH + 16 : -8}
                          textAnchor="middle"
                          className="text-[9px] fill-orange-300 font-mono"
                        >
                          Дверь {op.width}×{op.height}м
                        </text>
                      </g>
                    );
                  }
                })}

              {/* СЛОЙ 2: МЕБЕЛЬ И КОРПУСНЯК */}
              {visibleLayers.furniture &&
                furniture.map((f) => {
                  const isSel = selectedItemId === f.id;
                  const hasCol = collisions.some((c) => c.furnitureId === f.id);
                  const fx = f.x * scale;
                  const fy = f.y * scale;
                  const fw = f.w * scale;
                  const fd = f.d * scale;

                  return (
                    <g
                      key={f.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemId(f.id);
                      }}
                      className="cursor-pointer transition-opacity hover:opacity-95"
                    >
                      <rect
                        x={fx}
                        y={fy}
                        width={fw}
                        height={fd}
                        rx="6"
                        fill={
                          hasCol
                            ? 'rgba(239, 68, 68, 0.35)'
                            : isSel
                            ? 'rgba(245, 158, 11, 0.30)'
                            : 'rgba(99, 102, 241, 0.24)'
                        }
                        stroke={hasCol ? '#ef4444' : isSel ? '#f59e0b' : '#818cf8'}
                        strokeWidth={isSel || hasCol ? '2.5' : '1.5'}
                      />
                      <line
                        x1={fx + 4}
                        y1={fy + 4}
                        x2={fx + fw - 4}
                        y2={fy + 4}
                        stroke={isSel ? '#fbbf24' : '#a5b4fc'}
                        strokeWidth="2"
                      />
                      <text
                        x={fx + fw / 2}
                        y={fy + fd / 2 - 3}
                        textAnchor="middle"
                        className="text-[9.5px] fill-white font-semibold pointer-events-none"
                      >
                        {f.name.split(' ')[0]}
                      </text>
                      <text
                        x={fx + fw / 2}
                        y={fy + fd / 2 + 9}
                        textAnchor="middle"
                        className="text-[8px] fill-indigo-200 font-mono pointer-events-none"
                      >
                        {f.w}×{f.d}×{f.h || 0.85}м
                      </text>
                    </g>
                  );
                })}

              {/* СЛОЙ 3 И 4: ЭЛЕКТРИКА И САНТЕХНИКА */}
              {points.map((pt) => {
                if (pt.type === 'water' && !visibleLayers.plumbing) return null;
                if (pt.type !== 'water' && !visibleLayers.electric) return null;

                const px = pt.x * scale;
                const py = pt.y * scale;
                const isSel = selectedItemId === pt.id;

                const styleMap = {
                  socket: { color: '#ef4444', code: 'Р' },
                  switch: { color: '#3b82f6', code: 'В' },
                  light: { color: '#eab308', code: 'С' },
                  water: { color: '#06b6d4', code: 'ГВС' }
                };
                const st = styleMap[pt.type] || styleMap.socket;

                return (
                  <g
                    key={pt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemId(pt.id);
                    }}
                    className="cursor-pointer"
                  >
                    {isSel && (
                      <circle
                        cx={px}
                        cy={py}
                        r="14"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeDasharray="3 2"
                      />
                    )}
                    <circle
                      cx={px}
                      cy={py}
                      r="9.5"
                      fill={st.color}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    <text
                      x={px}
                      y={py + 3}
                      textAnchor="middle"
                      className="text-[8px] fill-white font-bold pointer-events-none"
                    >
                      {st.code}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 lg:pb-6">
      {/* ВЕРХНЯЯ ШАПКА ПРОРАБА И КЛИЕНТА */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Логотип и название */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Box className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  СметаПро <span className="text-amber-400 font-semibold text-sm">3D CAD & Estimate</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  2D + 3D WebGL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Полевой 3D-обмер • Проверка коллизий мебели и розеток • Агрегатор стройбаз
              </p>
            </div>
          </div>

          {/* Кнопки AI-голоса, GitHub-инструкции и Живая смета */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setShowGithubHelperModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
              title="Как перенести эту 3D-версию в твой GitHub и собрать новый APK"
            >
              <Code className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Обновить APK в GitHub</span>
            </button>

            <button
              onClick={() => setShowVoiceModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition"
            >
              <Mic className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>AI-Замер (3D-Шаблоны)</span>
            </button>

            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Итого ({viewMode === 'client' ? 'Розница' : 'Себестоимость'})
                </div>
                <div className="text-base sm:text-lg font-extrabold text-amber-400 font-mono">
                  {formatRub(
                    viewMode === 'client'
                      ? calculation.grandTotalClient
                      : calculation.grandTotalContractorNet
                  )}
                </div>
              </div>
              <div className="h-7 w-[1px] bg-slate-800 hidden sm:block" />
              <div className="hidden sm:block text-right">
                <div className="text-[10px] text-slate-400">Тоннаж</div>
                <div className="text-xs font-bold text-slate-200 font-mono">
                  {calculation.totalWeightKg} кг ({calculation.totalWeightTons} т)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Десктопная навигация по 4 модулям */}
        <div className="max-w-7xl mx-auto mt-3 hidden md:grid grid-cols-4 gap-2">
          {[
            { id: 'plan', icon: Box, step: '1. Обмер, 2D и 3D-Модель', sub: `${metrics.floorArea} м² • ${furniture.length} 3D-моделей` },
            { id: 'pies', icon: Layers, step: '2. Конструктор «Пирогов»', sub: `Стяжка ${screedThickness}мм • Стены ${wallPlasterThickness}мм` },
            { id: 'market', icon: ShoppingCart, step: '3. Сравнение стройбаз', sub: `${calculation.currentVendor.name.split(' ')[0]} • ${calculation.currentTier.name.split(' ')[0]}` },
            { id: 'estimate', icon: FileText, step: '4. Живая смета и График', sub: `${calculation.items.length} поз. SKU • План работ` }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition ${
                  active
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    active ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{tab.step}</div>
                  <div className="text-[11px] text-slate-400 truncate">{tab.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main className="max-w-7xl w-full mx-auto px-4 pt-4 flex-1">
        {/* ==================== МОДУЛЬ 1: ОБМЕР, 2D-ЧЕРТЕЖ И 3D-МОДЕЛИРОВАНИЕ ==================== */}
        {activeTab === 'plan' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Левая колонка: Ввод габаритов, проемов и 3D-каталог мебели */}
            <div className="lg:col-span-4 space-y-4">
              {/* Карточка габаритов */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Ruler className="w-4 h-4" /> Габариты помещения (2D + 3D)
                  </h2>
                  <span className="text-[11px] text-slate-400 font-mono">V = {metrics.roomVolume} м³</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Длина L (м)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.5"
                      max="15"
                      value={length}
                      onChange={(e) => setLength(Math.max(1.5, Math.min(15, parseFloat(e.target.value) || 2)))}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-sm font-bold font-mono text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Ширина W (м)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.5"
                      max="15"
                      value={width}
                      onChange={(e) => setWidth(Math.max(1.5, Math.min(15, parseFloat(e.target.value) || 2)))}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-sm font-bold font-mono text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Потолок H (м)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="2.2"
                      max="5.0"
                      value={height}
                      onChange={(e) => setHeight(Math.max(2.2, Math.min(5.0, parseFloat(e.target.value) || 2.5)))}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-sm font-bold font-mono text-white outline-none"
                    />
                  </div>
                </div>

                {/* Выкрасы стен в 3D */}
                <div className="pt-2 border-t border-slate-800/80">
                  <label className="block text-[11px] text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-400" /> Выкрас стен в 3D-объеме:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {WALL_COLORS.map((wc) => (
                      <button
                        key={wc.id}
                        onClick={() => setWallColorHex(wc.hex)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition ${
                          wallColorHex === wc.hex
                            ? 'bg-slate-800 border-amber-400 text-white font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-slate-600"
                          style={{ backgroundColor: wc.hex }}
                        />
                        <span>{wc.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Управление проемами (Окна и двери) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-orange-400" /> Окна и Двери (−{metrics.openingsArea} м²)
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => addOpening('window')}
                      className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Окно
                    </button>
                    <button
                      onClick={() => addOpening('door')}
                      className="px-2 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 text-xs font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Дверь
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {openings.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800/90 px-2.5 py-1.5 rounded-xl text-xs"
                    >
                      <span className="font-medium text-slate-200 truncate">{op.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="4.0"
                          value={op.width}
                          onChange={(e) => {
                            const val = Math.max(0.5, parseFloat(e.target.value) || 0.8);
                            setOpenings((prev) =>
                              prev.map((item) => (item.id === op.id ? { ...item, width: val } : item))
                            );
                          }}
                          className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center font-mono text-white"
                        />
                        <span className="text-slate-500">×</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="3.0"
                          value={op.height}
                          onChange={(e) => {
                            const val = Math.max(0.5, parseFloat(e.target.value) || 1.5);
                            setOpenings((prev) =>
                              prev.map((item) => (item.id === op.id ? { ...item, height: val } : item))
                            );
                          }}
                          className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center font-mono text-white"
                        />
                        <button
                          onClick={() => setOpenings((prev) => prev.filter((item) => item.id !== op.id))}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Инструменты добавления 3D-мебели и корпусняка */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Sofa className="w-4 h-4 text-indigo-400" /> Добавить 3D-мебель в объем и смету
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'wardrobe', label: '+ Шкаф-купе (H=2.55м)' },
                    { type: 'kitchen', label: '+ Кухня МДФ (H=2.40м)' },
                    { type: 'sofa', label: '+ Диван угловой' },
                    { type: 'bed', label: '+ Кровать 160×200' },
                    { type: 'desk', label: '+ Стол / ТВ-зона' }
                  ].map((btn) => (
                    <button
                      key={btn.type}
                      onClick={() => addFurniturePreset(btn.type)}
                      className="px-2.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-xs font-medium text-left truncate transition"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Правая колонка: Переключатель 2D / 3D / Сплит-экран + Интерактивная сцена */}
            <div className="lg:col-span-8 space-y-4">
              {/* Верхний пульт: Режим 2D / 3D / 2D+3D и слои */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Переключатель 2D / 3D / Сплит */}
                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {[
                      { id: '2d', label: '2D Чертеж' },
                      { id: '3d', label: '3D Объем (WebGL)' },
                      { id: 'split', label: '2D + 3D Экран' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setViewportMode(m.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          viewportMode === m.id
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Слои */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'construct', label: 'Окна/Двери' },
                      { key: 'electric', label: `Электрика (${metrics.totalElectricPoints})` },
                      { key: 'plumbing', label: `Вода (${metrics.waterCount})` },
                      { key: 'furniture', label: `3D-Мебель (${furniture.length})` }
                    ].map((layer) => {
                      const active = visibleLayers[layer.key];
                      return (
                        <button
                          key={layer.key}
                          onClick={() =>
                            setVisibleLayers((prev) => ({ ...prev, [layer.key]: !prev[layer.key] }))
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition ${
                            active
                              ? 'bg-slate-800 text-white border-slate-600'
                              : 'bg-slate-950 text-slate-500 border-slate-800 line-through'
                          }`}
                        >
                          <Check className={`w-3 h-3 ${active ? 'text-amber-400' : 'opacity-0'}`} />
                          {layer.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Кнопки добавления инженерных точек с высотой от пола */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400 mr-1">Точки в 2D/3D:</span>
                  {[
                    { id: 'select', label: 'Курсор', color: 'bg-slate-800 text-slate-200' },
                    { id: 'add_socket', label: '+ Розетка (H=30см)', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
                    { id: 'add_switch', label: '+ Выключатель (H=90см)', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                    { id: 'add_light', label: '+ Свет (Потолок)', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
                    { id: 'add_water', label: '+ Вода (H=55см)', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTool(t.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                        activeTool === t.id
                          ? 'ring-2 ring-amber-400 bg-amber-500 text-slate-950 border-amber-400'
                          : `${t.color} border-slate-700 hover:opacity-90`
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Блок предупреждений о 3D-коллизиях (если шкаф перекрыл выключатель или розетку) */}
              {collisions.length > 0 && (
                <div className="bg-red-950/60 border border-red-500/60 rounded-2xl p-3 space-y-1">
                  {collisions.map((col) => (
                    <div key={col.id} className="flex items-center gap-2 text-xs text-red-200 font-medium">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{col.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Отображение 2D и/или 3D сцены */}
              {viewportMode === '2d' && render2DCanvas()}
              {viewportMode === '3d' && (
                <Room3DViewport
                  length={length}
                  width={width}
                  height={height}
                  openings={openings}
                  points={points}
                  furniture={furniture}
                  floorType={floorType}
                  wallColorHex={wallColorHex}
                  visibleLayers={visibleLayers}
                  selectedItemId={selectedItemId}
                  onSelectItem={setSelectedItemId}
                  collisions={collisions}
                />
              )}
              {viewportMode === 'split' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {render2DCanvas()}
                  <Room3DViewport
                    length={length}
                    width={width}
                    height={height}
                    openings={openings}
                    points={points}
                    furniture={furniture}
                    floorType={floorType}
                    wallColorHex={wallColorHex}
                    visibleLayers={visibleLayers}
                    selectedItemId={selectedItemId}
                    onSelectItem={setSelectedItemId}
                    collisions={collisions}
                  />
                </div>
              )}

              {/* Панель точного позиционирования выбранного 3D-объекта или точки (X, Y и высота Z/H) */}
              {selectedEntity && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/40 rounded-2xl text-xs">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <Move className="w-4 h-4" />
                    <span>
                      Выбрано: «{selectedEntity.name || selectedEntity.label}» •{' '}
                      {selectedEntity.w
                        ? `Высота корпуса: ${selectedEntity.h || 0.85} м`
                        : `Высота монтажа от пола: ${selectedEntity.z ?? 0.3} м`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => moveSelectedItem(-0.2, 0)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700"
                    >
                      ← X
                    </button>
                    <button
                      onClick={() => moveSelectedItem(0.2, 0)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700"
                    >
                      X →
                    </button>
                    <button
                      onClick={() => moveSelectedItem(0, -0.2)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700"
                    >
                      ↑ Y
                    </button>
                    <button
                      onClick={() => moveSelectedItem(0, 0.2)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700"
                    >
                      ↓ Y
                    </button>
                    <button
                      onClick={() => updateSelectedElevationOrHeight(0.15)}
                      className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded"
                      title="Увеличить высоту в 3D (+15 см)"
                    >
                      + Высота 3D
                    </button>
                    <button
                      onClick={() => updateSelectedElevationOrHeight(-0.15)}
                      className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded"
                      title="Уменьшить высоту в 3D (-15 см)"
                    >
                      − Высота 3D
                    </button>
                    {selectedEntity.w && (
                      <button
                        onClick={rotateSelectedFurniture}
                        className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded"
                      >
                        Повернуть 90°
                      </button>
                    )}
                    <button
                      onClick={deleteSelectedItem}
                      className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Удалить
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== МОДУЛЬ 2: КОНСТРУКТОР ПИРОГОВ ОТДЕЛКИ ==================== */}
        {activeTab === 'pies' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 space-y-4">
              {/* УЗЕЛ 1: ПОЛ */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Пирог №1 • Площадь {metrics.floorArea} м²
                    </span>
                    <h3 className="text-base font-bold text-white">Черновой и чистовой пол</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300">
                    Слой стяжки: {screedThickness} мм
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300">Толщина стяжки пола по маякам (10–100 мм):</span>
                    <span className="font-mono font-bold text-white">{screedThickness} мм</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={screedThickness}
                    onChange={(e) => setScreedThickness(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-2">Чистовое покрытие пола (обновляет 3D-сцену):</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'quartzvinyl', title: 'Кварцвинил SPC', sub: 'Пачка 2.15 м² + подложка' },
                      { id: 'tile60', title: 'Керамогранит 60×60', sub: 'Пачка 1.44 м² + СВП и клей' },
                      { id: 'laminate33', title: 'Ламинат 33 класс', sub: 'Пачка 1.98 м² + подложка' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setFloorType(opt.id)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          floorType === opt.id
                            ? 'bg-amber-500/15 border-amber-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5">Способ укладки (коэф. подрезки):</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setFloorLayout('straight')}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold ${
                          floorLayout === 'straight'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        Прямая (+5%)
                      </button>
                      <button
                        onClick={() => setFloorLayout('diagonal')}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold ${
                          floorLayout === 'diagonal'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        Диагональ / Елка (+12%)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2.5 p-2.5 w-full rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeSkirting}
                        onChange={(e) => setIncludeSkirting(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-200">Плинтус МДФ 80 мм</div>
                        <div className="text-[10px] text-slate-400">
                          {metrics.netSkirtingLinear} пог. м (минус двери)
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* УЗЕЛ 2: СТЕНЫ */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Пирог №2 • Чистая площадь {metrics.netWallArea} м²
                    </span>
                    <h3 className="text-base font-bold text-white">Выравнивание и отделка стен</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300">
                    Слой штукатурки: {wallPlasterThickness} мм
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300">Средний слой гипсовой штукатурки по маякам (10–30 мм):</span>
                    <span className="font-mono font-bold text-white">{wallPlasterThickness} мм</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="30"
                    step="2"
                    value={wallPlasterThickness}
                    onChange={(e) => setWallPlasterThickness(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-2">Финишное покрытие стен:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'paint', title: 'Покраска в 2 слоя', sub: 'Стеклохолст + паста К4' },
                      { id: 'wallpaper', title: 'Обои под покраску', sub: 'Флизелин 1.06м + клей' },
                      { id: 'decor_plaster', title: 'Декор. штукатурка', sub: 'Травертин / Мокрый шелк' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setWallFinish(opt.id)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          wallFinish === opt.id
                            ? 'bg-emerald-500/15 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* УЗЕЛ 3: ПОТОЛОК */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Пирог №3 • Потолок {metrics.floorArea} м²
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setCeilingType('stretch_shadow')}
                    className={`p-3 rounded-xl border text-left transition ${
                      ceilingType === 'stretch_shadow'
                        ? 'bg-indigo-500/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Натяжной с теневым профилем</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      MSD Evolution + профиль EuroKraab
                    </div>
                  </button>
                  <button
                    onClick={() => setCeilingType('gkl_paint')}
                    className={`p-3 rounded-xl border text-left transition ${
                      ceilingType === 'gkl_paint'
                        ? 'bg-indigo-500/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Гипсокартон (ГКЛ) под покраску</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Листы Knauf на каркасе ПП 60×27
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Правая часть: Расшифровка формул СНиП и кратности заводской тары */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Package className="w-4 h-4" /> Перевод м² и 3D-объемов в упаковки (CEIL)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Автоматический учет «скрытых» расходников и округление до целых пачек и мешков
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium"
                  >
                    {showFormulaDetails ? 'Скрыть формулы' : 'Показать формулы'}
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {calculation.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{item.name}</span>
                            {item.isHiddenConsumable && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Авто-расходник пирога
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Чистая потребность: <span className="text-slate-200">{item.rawNeed}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-extrabold text-emerald-400 font-mono">
                            К закупке: {item.packsCount} {item.unit}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {formatRub(item.totalPrice)} ({item.weightKg} кг)
                          </div>
                        </div>
                      </div>

                      {showFormulaDetails && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-300/90">
                          Формула: {item.formula}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="text-xs text-slate-400">
                    Всего позиций SKU: <strong className="text-white">{calculation.items.length}</strong> • Общий тоннаж: <strong className="text-white">{calculation.totalWeightTons} т</strong>
                  </div>
                  <button
                    onClick={() => setActiveTab('market')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                  >
                    <span>Сравнить цены в магазинах</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== МОДУЛЬ 3: МАРКЕТПЛЕЙС И СРАВНЕНИЕ КОРЗИН ==================== */}
        {activeTab === 'market' && (
          <div className="space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                  1. Ценовой сегмент материалов и фурнитуры (Пересчет всей сметы в 1 тап)
                </h2>
                <p className="text-xs text-slate-400">
                  Подбирает аналоги по всем {calculation.items.length} позициям без изменения геометрии и 3D-модели
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.values(TIER_MULTIPLIERS).map((t) => {
                  const active = priceTier === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setPriceTier(t.id)}
                      className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        active
                          ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/50'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{t.name}</span>
                          {active && (
                            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                              Выбрано
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{t.desc}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono">
                        Смеси: {t.brands.plaster.split(' ')[1]} • Пол: {t.brands.quartz.split(' ')[2]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Логистика и подъем */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-5 space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Расчет доставки и разгрузки на этаж
                  </h3>
                  <p className="text-xs text-slate-400">
                    Черновые смеси и 3D-мебель весят <strong className="text-white">{calculation.totalWeightKg} кг ({calculation.totalWeightTons} т)</strong>:
                  </p>
                </div>

                <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                    <label className="block text-[11px] text-slate-400">Этаж объекта:</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        min="1"
                        max="45"
                        value={floorNumber}
                        onChange={(e) => setFloorNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-bold font-mono text-white"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center">
                    <label className="flex items-center gap-2.5 cursor-pointer w-full">
                      <input
                        type="checkbox"
                        checked={hasCargoLift}
                        onChange={(e) => setHasCargoLift(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-white">Грузовой лифт</div>
                        <div className="text-[10px] text-slate-400">
                          {hasCargoLift ? 'Пронос до квартиры' : 'Ручной подъем'}
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-center">
                    <div className="text-[11px] text-slate-400">Доставка + подъем ({calculation.totalWeightTons} т):</div>
                    <div className="text-sm font-extrabold text-sky-400 font-mono mt-0.5">
                      {formatRub(calculation.currentLogistics.totalLogistics)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Сравнение корзин в 3 поставщиках */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {calculation.vendorComparison.map((v) => {
                const isSelected = selectedVendorId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVendorId(v.id)}
                    className={`rounded-2xl border p-4 cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/40 shadow-lg'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {v.badge}
                          </span>
                          <h3 className="text-base font-extrabold text-white mt-1.5">{v.name}</h3>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                            isSelected
                              ? 'bg-amber-500 border-amber-400 text-slate-950'
                              : 'border-slate-700 text-transparent'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>

                      <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Материалы и мебель по списку:</span>
                          <span className="font-mono font-bold text-white">{formatRub(v.cartCost)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">
                            Доставка ({calculation.totalWeightTons} т) + подъем на {floorNumber} эт.:
                          </span>
                          <span className="font-mono font-semibold text-sky-400">
                            +{formatRub(v.logistics.totalLogistics)}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-800 flex justify-between items-baseline">
                          <span className="text-xs font-bold text-slate-200">Итого с доставкой:</span>
                          <span className="text-lg font-extrabold text-amber-400 font-mono">
                            {formatRub(v.totalWithDelivery)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Наличие по смете:</span>
                          <span
                            className={`font-bold ${
                              v.stockPercent === 100 ? 'text-emerald-400' : 'text-amber-300'
                            }`}
                          >
                            {v.stockPercent}% позиций
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                          {v.missingNote}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div className="text-[11px] text-emerald-400 font-medium">
                        Бонус прораба ({Math.round(v.contractorRebate * 100)}%):{' '}
                        <strong className="font-mono">{formatRub(v.rebateAmount)}</strong>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVendorId(v.id);
                          setActiveTab('estimate');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        К смете
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== МОДУЛЬ 4: ЖИВАЯ СМЕТА И ГРАФИК РАБОТ ==================== */}
        {activeTab === 'estimate' && (
          <div className="space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setViewMode('client')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                    viewMode === 'client'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Глазами Заказчика (Розница КП)</span>
                </button>
                <button
                  onClick={() => setViewMode('contractor')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                    viewMode === 'contractor'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  <EyeOff className="w-4 h-4" />
                  <span>Режим Прораба (Скрытая скидка и маржа)</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowPrintPreview(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Печать КП / PDF</span>
                </button>
                <button
                  onClick={() => setOrderSuccessModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Заказать комплектацию в 1 клик</span>
                </button>
              </div>
            </div>

            {/* 4 Сводные плашки бюджета */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Материалы + 3D-Мебель (Розница)</div>
                <div className="text-xl font-extrabold text-white font-mono mt-1">
                  {formatRub(calculation.materialsRetailCost)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Поставщик: <strong className="text-slate-200">{calculation.currentVendor.name}</strong>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Строительно-монтажные работы</div>
                <div className="text-xl font-extrabold text-indigo-400 font-mono mt-1">
                  {formatRub(calculation.worksTotalCost)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Включая черновуху, чистовую, инженерку и сборку
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Логистика и подъем на {floorNumber} этаж</div>
                <div className="text-xl font-extrabold text-sky-400 font-mono mt-1">
                  {formatRub(calculation.currentLogistics.totalLogistics)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Общий вес: {calculation.totalWeightKg} кг
                </div>
              </div>

              {viewMode === 'contractor' ? (
                <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4">
                  <div className="text-xs text-emerald-300 font-semibold">
                    Агентская комиссия прораба от базы
                  </div>
                  <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
                    +{formatRub(calculation.contractorDiscountAmount)}
                  </div>
                  <div className="text-[11px] text-emerald-200/80 mt-1">
                    Чистая закупка: {formatRub(calculation.netMaterialsForContractor)}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4">
                  <div className="text-xs text-amber-300 font-semibold">ИТОГО ПО ПРОЕКТУ «ПОД КЛЮЧ»</div>
                  <div className="text-xl font-extrabold text-amber-400 font-mono mt-1">
                    {formatRub(calculation.grandTotalClient)}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    Цена за м² по полу: {formatRub(calculation.grandTotalClient / metrics.floorArea)}/м²
                  </div>
                </div>
              )}
            </div>

            {/* Таблицы материалов и работ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Спецификация материалов и 3D-мебели (К закупке в упаковках)
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">{calculation.items.length} SKU</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                        <th className="py-2.5 px-3">Наименование / Бренд</th>
                        <th className="py-2.5 px-2 text-right">Кратность</th>
                        <th className="py-2.5 px-2 text-right">Цена</th>
                        <th className="py-2.5 px-3 text-right">Сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {calculation.items.map((item) => {
                        const displaySum =
                          viewMode === 'contractor'
                            ? Math.round(item.totalPrice * (1 - calculation.currentVendor.contractorRebate))
                            : item.totalPrice;
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-100">{item.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {item.section} • {item.rawNeed}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {item.packsCount} {item.unit}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-300 whitespace-nowrap">
                              {formatRub(item.pricePerPack)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                              {formatRub(displaySum)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Ведомость строительно-монтажных работ
                    </h3>
                    <span className="text-xs text-indigo-300 font-mono font-bold">
                      {formatRub(calculation.worksTotalCost)}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-800/70 text-xs">
                    {calculation.works.map((w) => (
                      <div key={w.id} className="p-3 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-200">{w.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Объем: {w.volume} {w.unit} × {formatRub(w.rate)}/{w.unit}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-white shrink-0">
                          {formatRub(w.totalPrice)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* МОБИЛЬНАЯ НИЖНЯЯ НАВИГАЦИЯ (ANDROID STYLE) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 grid grid-cols-4 py-1.5 px-2">
        {[
          { id: 'plan', icon: Box, label: '1. 2D + 3D' },
          { id: 'pies', icon: Layers, label: '2. Пироги' },
          { id: 'market', icon: ShoppingCart, label: '3. Базы цен' },
          { id: 'estimate', icon: FileText, label: '4. Смета' }
        ].map((nav) => {
          const Icon = nav.icon;
          const active = activeTab === nav.id;
          return (
            <button
              key={nav.id}
              onClick={() => setActiveTab(nav.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-xl ${
                active ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{nav.label}</span>
            </button>
          );
        })}
      </nav>

      {/* МОДАЛЬНОЕ ОКНО: ИНСТРУКЦИЯ ПО ОБНОВЛЕНИЮ APK НА GITHUB */}
      {showGithubHelperModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Как перенести 3D-модуль в твой APK и на Vercel
                  </h3>
                  <p className="text-xs text-slate-400">
                    Обновление без потери настроек за 30 секунд
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGithubHelperModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <ol className="text-xs text-slate-300 space-y-2.5 list-decimal pl-4">
              <li>
                Скопируй весь код из этого окна редактора справа и замени им содержимое файла{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 font-mono">
                  src/App.jsx
                </code>{' '}
                в твоем VS Code (или прямо на сайте GitHub через карандашик редактирования файла{' '}
                <code className="text-amber-300 font-mono">src/App.jsx</code>).
              </li>
              <li>
                В VS Code слева в разделе <strong>Система управления версиями</strong> напиши сообщение{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300 font-mono">
                  add 3d engine
                </code>
                , нажми <strong>Фиксация</strong> и затем <strong>Синхронизировать изменения</strong>.
              </li>
              <li>
                Через 2 минуты во вкладке <strong>Actions</strong> твоего репозитория на GitHub автоматически соберется новый{' '}
                <strong>SmetaPro-Android-APK</strong> уже с полноценным 3D-режимом!
              </li>
            </ol>

            <div className="flex justify-end">
              <button
                onClick={() => setShowGithubHelperModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
              >
                Понятно, закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: ГОЛОСОВОЙ AI-ЗАМЕР НА ОБЪЕКТЕ */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">AI-Голосовой ввод 2D + 3D замера</h3>
                  <p className="text-xs text-slate-400">
                    Автоматическое построение 3D-коробки, мебели и розеток по голосу
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Выберите готовый 3D-проект помещения для мгновенной загрузки:
              </label>
              {ROOM_PRESETS.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => setActivePresetVoice(pr)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    activePresetVoice.id === pr.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>{pr.name}</span>
                    <span className="font-mono text-[11px] text-indigo-300">
                      {pr.length}×{pr.width}×{pr.height} м
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic mt-1">{pr.voiceText}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowVoiceModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={() => applyPreset(activePresetVoice)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Загрузить в 2D + 3D</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: ПРЕДПРОСМОТР ПЕЧАТНОГО КП ДЛЯ ЗАКАЗЧИКА */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Официальное коммерческое предложение • СметаПро 3D CAD
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Смета на ремонтно-отделочные работы и комплектацию мебелью
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Габариты помещения: {length}×{width} м (S пола = {metrics.floorArea} м², H = {height} м, S чистых стен = {metrics.netWallArea} м²)
                </p>
              </div>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Закрыть
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="text-slate-500">Материалы и мебель:</div>
                <div className="text-sm font-extrabold text-slate-900 font-mono">
                  {formatRub(calculation.materialsRetailCost)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Стоимость работ:</div>
                <div className="text-sm font-extrabold text-slate-900 font-mono">
                  {formatRub(calculation.worksTotalCost)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Доставка и подъем ({calculation.totalWeightTons} т):</div>
                <div className="text-sm font-extrabold text-slate-900 font-mono">
                  {formatRub(calculation.currentLogistics.totalLogistics)}
                </div>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-2">Позиция (Материалы и 3D-Мебель)</th>
                    <th className="p-2 text-right">Кол-во</th>
                    <th className="p-2 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {calculation.items.map((i) => (
                    <tr key={i.id}>
                      <td className="p-2 font-medium">{i.name}</td>
                      <td className="p-2 text-right font-mono">
                        {i.packsCount} {i.unit}
                      </td>
                      <td className="p-2 text-right font-mono font-bold">{formatRub(i.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="text-sm font-extrabold text-slate-900">
                ИТОГО К ОПЛАТЕ: <span className="text-amber-600 font-mono">{formatRub(calculation.grandTotalClient)}</span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Отправить на печать / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: ЗАКАЗ ОТПРАВЛЕН ПОСТАВЩИКУ */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-white">
              Заявка на комплектацию сформирована!
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Спецификация из <strong>{calculation.items.length} позиций SKU</strong> (общий вес{' '}
              <strong>{calculation.totalWeightKg} кг</strong>) передана в{' '}
              <strong className="text-amber-400">{calculation.currentVendor.name}</strong>.
            </p>
            <button
              onClick={() => setOrderSuccessModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
            >
              Отлично, вернуться к проекту
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
