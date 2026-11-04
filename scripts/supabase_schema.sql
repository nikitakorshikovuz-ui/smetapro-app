-- SQL-скрипт инициализации базы данных SmetaPro в Supabase (PostgreSQL)
-- Выполните этот код во вкладке SQL Editor вашего проекта Supabase

CREATE TABLE IF NOT EXISTS materials_catalog (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  pack_size NUMERIC NOT NULL DEFAULT 1,
  unit_weight_kg NUMERIC NOT NULL DEFAULT 1,
  store_petrovich_price NUMERIC NOT NULL,
  store_leroy_price NUMERIC NOT NULL,
  store_saturn_price NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включаем публичное чтение прайсов для приложения (RLS)
ALTER TABLE materials_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to materials_catalog"
  ON materials_catalog
  FOR SELECT
  USING (true);

-- Заполняем стартовыми эталонными позициями
INSERT INTO materials_catalog (id, category, name, unit, pack_size, unit_weight_kg, store_petrovich_price, store_leroy_price, store_saturn_price)
VALUES
  ('screed_mix', 'Черновой пол', 'Пескобетон М300 / Ровнитель (мешок 25 кг)', 'меш.', 25, 25, 340, 315, 295),
  ('primer_deep', 'Грунтовки', 'Грунтовка глубокого проникновения Knauf Тифенгрунд (10 л)', 'канистра', 10, 10.5, 1390, 1290, 1340),
  ('damper_tape', 'Черновой пол', 'Демпферная кромочная лента 100мм (рулон 25 м)', 'рул.', 25, 0.8, 490, 420, 450),
  ('plaster_rotband', 'Черновые стены', 'Штукатурка гипсовая Knauf Ротбанд (мешок 30 кг)', 'меш.', 30, 30, 595, 568, 550),
  ('beacons_6mm', 'Черновые стены', 'Маяк штукатурный оцинкованный 6 мм (3 м)', 'шт.', 1, 0.25, 95, 78, 82),
  ('putty_finish', 'Чистовые стены', 'Шпаклевка полимерная финишная Weber Vetonit LR+ (20 кг)', 'меш.', 20, 20, 1180, 1090, 1120),
  ('floor_finish_pack', 'Чистовой пол', 'Кварцвинил / Ламинат 33 класс фаска 4V (уп. 2.15 м²)', 'уп.', 2.15, 16.5, 3150, 2890, 2990),
  ('underlay_pack', 'Чистовой пол', 'Подложка хвойная / XPS 3 мм (уп. 5.5 м²)', 'уп.', 5.5, 1.5, 890, 790, 840),
  ('wall_finish_unit', 'Чистовые стены', 'Краска интерьерная моющаяся Dulux / Tikkurila (база 9 л)', 'ведро', 9, 12.0, 5890, 5490, 5650),
  ('cable_vvg_3x25', 'Электрика', 'Кабель силовой ВВГнг(А)-LS 3х2.5 ГОСТ (бухта 100 м)', 'бухта', 100, 13.5, 8450, 7990, 7850),
  ('socket_box', 'Электрика', 'Подрозетник Schneider Electric 68х45 мм + механизм', 'компл.', 1, 0.2, 480, 430, 450)
ON CONFLICT (id) DO NOTHING;
