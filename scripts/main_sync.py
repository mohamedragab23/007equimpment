# -*- coding: utf-8 -*-
"""
برنامج تشغيل المزامنة الثنائية مع Google Sheets
تشغيل من جذر المشروع: python scripts/main_sync.py
"""
import json
import os
import sys

# إضافة جذر المشروع إلى المسار
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# تحميل .env إن وُجد
_env_path = os.path.join(ROOT, '.env')
if os.path.isfile(_env_path):
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_path)
    except ImportError:
        pass

from api.sync.bidirectional_sync import (
    GoogleSheetsBidirectionalSync,
    load_project_data,
    save_project_data,
)

DATA_DIR = os.path.join(ROOT, 'data')


def main():
    credentials_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') or os.path.join(ROOT, 'credentials.json')
    spreadsheet_id = os.environ.get('GOOGLE_SHEETS_SPREADSHEET_ID', '')

    if not os.path.isfile(credentials_path):
        print('❌ ملف الاعتمادات غير موجود:', credentials_path)
        print('   ضع credentials.json في جذر المشروع أو عيّن GOOGLE_APPLICATION_CREDENTIALS')
        return 1
    if not spreadsheet_id:
        print('❌ لم يتم تعيين GOOGLE_SHEETS_SPREADSHEET_ID')
        print('   ضعه في ملف .env أو: $env:GOOGLE_SHEETS_SPREADSHEET_ID="معرف_الملف"')
        return 1

    print('🔧 تهيئة نظام المزامنة...')
    sync_system = GoogleSheetsBidirectionalSync(
        credentials_path=credentials_path,
        spreadsheet_id=spreadsheet_id,
    )

    print('📂 تحميل بيانات المشروع من', DATA_DIR, '...')
    project_data = load_project_data(DATA_DIR)

    print()
    print('=' * 50)
    print('نظام المزامنة الثنائية - اختر الوضع:')
    print('1. سحب من Google Sheets → المشروع')
    print('2. دفع من المشروع → Google Sheets')
    print('3. مزامنة ثنائية كاملة (دمج ثم تحديث الشيت والمشروع)')
    print('=' * 50)

    try:
        choice = input('اختر رقم الوضع (1-3): ').strip()
    except EOFError:
        choice = '1'

    if choice == '1':
        project_data = sync_system.sync_from_sheets_to_project(project_data)
        save_project_data(DATA_DIR, project_data)
        print('✅ تم سحب البيانات من Google Sheets وحفظها في المشروع')
    elif choice == '2':
        sync_system.sync_from_project_to_sheets(project_data)
        print('✅ تم دفع البيانات من المشروع إلى Google Sheets')
    elif choice == '3':
        synced = sync_system.bidirectional_sync(project_data)
        save_project_data(DATA_DIR, synced)
        print('✅ اكتملت المزامنة الثنائية وحُفظت البيانات في المشروع')
    else:
        print('❌ اختيار غير صالح')
        return 1

    report = sync_system.get_sync_report()
    print()
    print('📊 تقرير المزامنة:')
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
