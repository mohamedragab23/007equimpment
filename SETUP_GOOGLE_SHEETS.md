# إعداد Google Sheets API - نظام وكالة 007

## 1. إنشاء مشروع في Google Cloud

1. ادخل إلى [Google Cloud Console](https://console.cloud.google.com/).
2. أنشئ مشروعاً جديداً أو اختر مشروعاً موجوداً.
3. فعّل الواجهات التالية:
   - **Google Sheets API**: من "APIs & Services" → "Library" → ابحث عن "Google Sheets API" → Enable.
   - **Google Drive API**: بنفس الطريقة ابحث عن "Google Drive API" → Enable.

## 2. إنشاء Service Account وحفظ ملف الاعتماد

1. من **APIs & Services** → **Credentials** → **Create Credentials** → **Service account**.
2. أدخل اسماً (مثلاً: `007-equipment-sheets`).
3. بعد الإنشاء، ادخل إلى الحساب → تبويب **Keys** → **Add Key** → **Create new key** → اختر **JSON** ثم تنزيل الملف.
4. انقل الملف المُنزَل إلى مجلد المشروع وسمّه **`credentials.json`** في الجذر:
   ```
   d:\Download\007equimpment-main\credentials.json
   ```
5. **مهم:** أضف `credentials.json` إلى `.gitignore` حتى لا يُرفع إلى Git (الملف يحتوي مفاتيح سرية).

## 3. إنشاء ملف Google Sheets وربطه

1. أنشئ ملف Google Sheets جديد من [sheets.new](https://sheets.new) أو من Drive.
2. افتح الملف → **مشاركة** (Share).
3. أضف البريد الإلكتروني الخاص بحساب الخدمة (موجود داخل `credentials.json` تحت المفتاح **`client_email`**، يشبه:
   `xxxx@xxxx.iam.gserviceaccount.com`).
4. أعطِ الصلاحية **Editor** (محرر) لهذا البريد.
5. انسخ **معرف الملف (Spreadsheet ID)** من الرابط:
   ```
   https://docs.google.com/spreadsheets/d/ هنا_معرف_الملف /edit
   ```

## 4. تعيين متغيرات البيئة

عند تشغيل الـ Backend (Flask)، عيّن معرف الملف:

**Windows (PowerShell):**
```powershell
$env:GOOGLE_SHEETS_SPREADSHEET_ID="معرف_الملف_الذي_نسخته"
```

**Windows (CMD):**
```cmd
set GOOGLE_SHEETS_SPREADSHEET_ID=معرف_الملف_الذي_نسخته
```

**اختياري:** إذا وضعت `credentials.json` في مسار آخر:
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\credentials.json"
```

## 5. الأوراق الـ 11 داخل الملف

النظام يتوقع وجود الأوراق التالية (بأسمائها الإنجليزية). إذا لم تكن موجودة، سيحاول البرنامج إنشاءها عند أول اتصال:

| # | اسم الورقة (Sheet) | الوظيفة |
|---|--------------------|----------|
| 1 | Users | المستخدمون (تسجيل دخول وصلاحيات) |
| 2 | Supervisors | المشرفون ومخزونهم |
| 3 | Zones | المناطق |
| 4 | MainInventory | المخزون الرئيسي |
| 5 | ZoneInventory | مخزون كل زون (مجمع) |
| 6 | Deductions | الخصومات |
| 7 | Orders | الطلبيات |
| 8 | EquipmentExchange | طلبات تبديل الصناديق |
| 9 | Apartments | إدارة الشقق |
| 10 | Motorcycles | إدارة الموتوسيكلات |
| 11 | PermissionsLog | سجل التغييرات والأنشطة (Audit Log) |

رؤوس الأعمدة لكل ورقة مُعرّفة في الكود (`api/utils/sheets_config.py`) ويتم كتابة الصف الأول تلقائياً عند **إنشاء** الورقة من البرنامج لأول مرة.

## 6. التحقق من الاتصال

بعد تشغيل Flask مع تعيين `GOOGLE_SHEETS_SPREADSHEET_ID` ووجود `credentials.json`:

- أي استدعاء لـ `get_sheets_service()` سيفتح الملف ويضمن وجود الأوراق الـ 11.
- إن لم يُعيّن المعرف أو لم يوجد الملف، الخدمة ترجع `None` والنظام يعمل بدون Google Sheets (بيانات محلية فقط).

## 7. أمان

- لا ترفع `credentials.json` إلى أي مستودع عام.
- تأكد أن `.gitignore` يحتوي سطراً: `credentials.json`.

## 8. نظام المزامنة الثنائية

المشروع يتضمن نظام مزامنة ثنائية الاتجاه (سحب من الشيت، دفع إلى الشيت، أو مزامنة كاملة مع دمج).

### المكتبات المستخدمة

- **gspread** و **google-auth** (موجودان في `requirements.txt`). لا حاجة لـ `oauth2client` (قديم).
- تثبيت التبعيات: `pip install -r requirements.txt`

### تشغيل المزامنة من سطر الأوامر

من جذر المشروع (مع تعيين `.env` أو متغيرات البيئة):

```powershell
$env:PYTHONPATH = "D:\Download\007equimpment-main"
python scripts/main_sync.py
```

ثم اختر:
- **1** — سحب من Google Sheets → المشروع (حفظ في `data/*.json`)
- **2** — دفع من المشروع → Google Sheets
- **3** — مزامنة ثنائية كاملة (دمج ثم تحديث الشيت والملفات المحلية)

### مزامنة من الواجهة (للمسؤول)

يمكن للمسؤول استدعاء مزامنة كاملة عبر API:

```http
POST /api/sync/full-sync
Content-Type: application/json
Body: { "mode": "sheets_to_project" }   أو  "project_to_sheets"  أو  "bidirectional"
```

(يتطلب تسجيل دخول كـ admin.)
