# СметаПро (SmetaPro CAD & Estimate) — Web + Android APK Starter Kit

Готовый к деплою репозиторий мобильного и веб-приложения для обмера помещений, 2D-разметки инженерных точек и мебели, честного расчета строительных «пирогов» по СНиП с кратностью заводской тары и агрегацией цен поставщиков.

## Состав архива
- `src/App.jsx` — Полный интерактивный интерфейс (4 модуля: 2D-CAD, Пироги и формулы, Магазины и тоннаж, Смета + PDF) с Offline-First сохранением в `localStorage`.
- `src/services/supabaseClient.js` — Клиент живой синхронизации прайс-листов из облачной БД Supabase с автоматическим откатом в оффлайн-кэш на стройплощадке.
- `src/services/deepseekVoice.js` — Интеграция встроенного микрофона (`webkitSpeechRecognition`) и **DeepSeek API** для перевода голосового замера в параметры чертежа и сметы.
- `.github/workflows/build-apk.yml` — Автоматический пайплайн GitHub Actions, который при каждом `git push` сам собирает установочный Android-файл `app-debug.apk` без необходимости ставить Android Studio.
- `scripts/supabase_schema.sql` — Готовый SQL-скрипт создания таблицы `materials_catalog` и стартовых цен.
- `scripts/sync_yml_prices.py` — Python-скрипт для автоматического парсинга YML/XML фидов стройбаз в базу Supabase.

## Быстрый старт (Запуск за 2 минуты)

1. Распакуйте архив и установите зависимости:
   ```bash
   npm install
   npm run dev
   ```
2. Для публикации в Web и автоматической сборки Android `.apk`:
   - Создайте новый репозиторий на GitHub и запушьте код:
     ```bash
     git init
     git add .
     git commit -m "Initial SmetaPro release"
     git branch -M main
     git remote add origin https://github.com/ВАШ_ЛОГИН/smetapro-app.git
     git push -u origin main
     ```
   - Откройте вкладку **Actions** в вашем репозитории на GitHub — через 2 минуты скачайте готовый `SmetaPro-Android-APK` прямо на телефон.
   - Подключите этот же репозиторий к **Vercel** или **Netlify** для мгновенной публикации веб-версии.
