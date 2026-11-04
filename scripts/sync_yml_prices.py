#!/usr/bin/env python3
"""
Скрипт автоматической синхронизации цен из YML/XML фидов строительных баз в Supabase.
Можно запускать по расписанию (cron) или через GitHub Actions.
Установка зависимостей: pip install requests supabase
"""
import os
import xml.etree.ElementTree as ET
import requests
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "your-service-role-key")

# Сопоставление артикулов (SKU) поставщика с внутренними ID нашей базы
SKU_MAPPING = {
    "1004582": "plaster_rotband",
    "1002319": "screed_mix",
    "1043210": "cable_vvg_3x25",
    "1088412": "putty_finish",
    "1011904": "primer_deep",
}

def sync_store_yml(yml_url: str, price_column: str):
    print(f"[*] Загрузка YML-фида: {yml_url}")
    response = requests.get(yml_url, timeout=45)
    response.raise_for_status()
    root = ET.fromstring(response.content)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    updated_count = 0

    for offer in root.findall(".//offer"):
        sku = offer.get("id")
        if sku in SKU_MAPPING:
            price_node = offer.find("price")
            if price_node is not None and price_node.text:
                price_val = float(price_node.text.strip())
                internal_id = SKU_MAPPING[sku]
                supabase.table("materials_catalog").update({
                    price_column: price_val,
                    "updated_at": "now()"
                }).eq("id", internal_id).execute()
                updated_count += 1
                print(f"  [+] Обновлен {internal_id}: {price_val} руб. ({price_column})")

    print(f"[✓] Синхронизация завершена. Обновлено позиций: {updated_count}")

if __name__ == "__main__":
    # Пример вызова для обновления колонок цен разных поставщиков
    # sync_store_yml("https://partner-feed-example.ru/petrovich.xml", "store_petrovich_price")
    print("Скрипт готов к работе. Укажите актуальные ссылки на YML-фиды и ключи Supabase.")
