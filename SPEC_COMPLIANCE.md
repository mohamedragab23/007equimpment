# توافق المشروع مع المواصفات

**نظام إدارة مخزون معدات طلبات - وكالة 007**

---

## 1. واجهة تسجيل الدخول والأمان

| المتطلب | الحالة | الملاحظات |
|--------|--------|-----------|
| تسجيل دخول آمن (Username/Password) | ✅ | صفحة Login، API `/api/auth/login` |
| جلسات آمنة | ✅ | Flask session، HTTPOnly cookie، secret_key |
| تسجيل خروج تلقائي بعد عدم نشاط | ✅ | 30 دقيقة في AuthContext (قابل من config) |
| تشفير كلمات المرور | ✅ | bcrypt للمشرفين الجدد، SHA256 للتوافق مع الإدمن |

---

## 2. نظام إدارة الصلاحيات

| المستوى | الحالة | الصلاحيات |
|--------|--------|-----------|
| المسؤول (Admin) | ✅ | كامل: userManagement, permissionManagement, viewAllData, editAllRecords, auditLog، وجميع الوحدات |
| مدير المخازن | ✅ | المخزون، الطلبيات، تسليم/استرداد/تبديل، إثبات التسليم |
| مدير الحسابات | ✅ | الخصومات، الحوافز، الشقق، الموتوسيكلات |
| المشرف (Supervisor) | ✅ | مخزون المشرف، تسليم/استرداد، الخصومات، الطلبيات، تبديل، إثبات التسليم (عرض/إضافة بدون تعديل كامل) |

- **إظهار/إخفاء ديناميكي:** `canView(user, section)` و `SECTION_PERMISSION` في EquipmentManagementSystem.
- **صفحة إدارة الصلاحيات:** للمسؤول فقط، عرض الوحدات والصلاحيات الحالية.
- **سجل التغييرات والأنشطة:** للمسؤول فقط، عرض PermissionsLog من Google Sheets (وقت، نوع العملية، المستخدم، الهدف، التفاصيل، الحالة، IP).

---

## 3. الهيكل التقني (Backend)

| المجلد/الوحدة | الحالة |
|---------------|--------|
| api/auth | ✅ مصادقة وجلسات |
| api/sync | ✅ مزامنة Google Sheets وحالة الاتصال |
| api/supervisors | ✅ إدارة المشرفين |
| api/equipment | ✅ تسليم، استرداد، تبديل صناديق |
| api/orders | ✅ الطلبيات |
| api/deductions | ✅ الخصومات + استيراد Excel |
| api/apartments | ✅ إدارة الشقق |
| api/motorcycles | ✅ إدارة الموتوسيكلات |
| api/utils | password, sheets_config, audit, supabase_service |

---

## 4. قاعدة البيانات (Google Sheets - 11 ورقة)

| الورقة | الحالة | الاستخدام |
|--------|--------|-----------|
| Users | ✅ | مستخدمون (اختياري مع users.json) |
| Supervisors | ✅ | مشرفون، مصادقة، مخزون مشرف |
| Zones | ✅ | المناطق |
| MainInventory | ✅ | مخزون رئيسي |
| ZoneInventory | ✅ | مخزون مناطق، خصم عند التسليم |
| Deductions | ✅ | خصومات + تعيين Excel |
| Orders | ✅ | طلبيات، تسليم، استرداد |
| EquipmentExchange | ✅ | طلبات تبديل صناديق |
| Apartments | ✅ | إدارة الشقق |
| Motorcycles | ✅ | إدارة الموتوسيكلات |
| PermissionsLog | ✅ | سجل تدقيق (audit) |

---

## 5. وحدات النظام الرئيسية

| الوحدة | الحالة | الملاحظات |
|--------|--------|-----------|
| تسليم المعدات | ✅ | صورة إلزامية، خصم مخزون مشرف/منطقة، Orders، إشعار (PermissionsLog) |
| استرداد المعدات | ✅ | طلب استرداد، موافقة مدير المخازن، إضافة للمخزون |
| نظام الطلبيات | ✅ | إنشاء، عرض، موافقة/رفض |
| تبديل الصناديق | ✅ | طلب + صورة، موافقة مدير المخازن |
| إدارة الخصومات | ✅ | إضافة مفردة، استيراد Excel (تعيين الأعمدة حسب المواصفات) |
| مخزون الزونات | ✅ | عرض مجمع من مخزون المشرفين + خصم ZoneInventory عند التسليم |
| إدارة الشقق | ✅ | إضافة شقة، تسكين طيار (owner_name, address, zone, rent, rider_code, move_in_date...) |
| إدارة الموتوسيكلات | ✅ | إضافة موتوسيكل، تأجير طيار (license_plate, rental_price, model, year, rider_code, start_date, end_date) |
| الحوافز | ✅ | واجهة placeholder لمدير الحسابات (قيد التطوير) |
| سجل التغييرات والأنشطة | ✅ | واجهة عرض سجل التدقيق (PermissionsLog) للمسؤول فقط |

---

## 6. إعدادات النظام (config)

- **zones:** 9 مناطق (القاهرة، الإسكندرية، أسيوط، بورسعيد، المنيا، الغردقة، دمنهور، المحلة، المنصورة) ✅
- **equipment_types:** باوتش نارية/هوائية، تيشرت، جاكيت، خوذه ✅
- **permission_modules:** جميع الوحدات المذكورة في المواصفات ✅
- **roles:** admin, warehouse_manager, accounts_manager, supervisor ✅
- **google_sheets:** sync_interval 300، backup_enabled، versioning ✅
- **session:** inactivity_timeout_minutes 30 ✅

---

## 7. واجهة المستخدم

- لوحة تحكم حسب الصلاحية ✅
- صفحة إدارة الصلاحيات (للمسؤول) ✅
- مخزون الزونات ✅
- صفحة المشرفين ✅
- شريط تنقل ديناميكي (القائمة الجانبية حسب canView) ✅
- أزرار تظهر/تختفي حسب الصلاحية ✅
- إشعارات داخلية (نجاح/خطأ في النماذج) ✅

---

## 8. نقاط المراجعة والاختبار

- [x] نظام المصادقة يعمل (تسجيل دخول، جلسة، خروج تلقائي)
- [x] الصلاحيات تطبق ديناميكياً (عرض الأقسام حسب الدور)
- [x] المزامنة مع Google Sheets (قراءة/كتابة للأوراق المطلوبة)
- [x] استيراد Excel للخصومات (تعيين الأعمدة: كود المندوب، اسم المندوب، المبلغ، الدورات، ملاحظات، الزون)
- [x] مخزون الزونات (عرض مجمع + خصم ZoneInventory عند التسليم)
- [x] جميع الوحدات مرتبطة بالصلاحيات

---

## 9. للتحقق الفوري (إعداد التشغيل)

### 1. ملف `credentials.json`
- **المسار المطلوب:** جذر المشروع، أي:
  - `D:\Download\007equimpment-main\credentials.json`
- **التحقق في PowerShell:**
  ```powershell
  cd D:\Download\007equimpment-main
  dir credentials.json
  ```
- إذا لم يكن موجوداً: اتبع خطوات `SETUP_GOOGLE_SHEETS.md` لإنشاء مشروع Google Cloud وتنزيل الملف.

### 2. متغير البيئة `GOOGLE_SHEETS_SPREADSHEET_ID`
- **الطريقة المفضلة:** إنشاء ملف `.env` في جذر المشروع يحتوي على:
  ```
  GOOGLE_SHEETS_SPREADSHEET_ID=1rtGy7p7BXTg2_EkaZIYAzunMS2g43oq02AlkKhakDkc
  ```
  التطبيق يقرأ هذا الملف تلقائياً عند التشغيل (عبر python-dotenv).
- **بديل:** التعيين يدوياً في PowerShell قبل تشغيل Backend:
  ```powershell
  $env:GOOGLE_SHEETS_SPREADSHEET_ID="معرف_الملف_الذي_نسخته_من_رابط_Google_Sheets"
  ```
- **مشاركة الورقة:** شارك ملف Google Sheets مع الـ `client_email` الموجود داخل `credentials.json`.

### 3. إضافة المشرف — ماذا يظهر للمستخدم؟
- **عند النجاح:** رسالة خضراء مثل "تمت إضافة المشرف بنجاح." أو "تمت الإضافة (البيانات محفوظة محلياً لأن Google Sheets غير متصل)".
- **عند الخطأ:** رسالة حمراء تحتوي نص الخطأ من الخادم (مثلاً: "فشل حفظ المشرف"، أو رسالة الـ API).
- **في Console المتصفح:** يمكنك تشغيل:
  ```javascript
  fetch('/api/supervisors', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({
      code: "SUP001", name: "اختبار", username: "test", password: "1234"
    })
  }).then(r => r.json()).then(console.log).catch(console.error);
  ```
  لرؤية الرد الخام من الخادم.

### 4. Fallback عند عدم اتصال Google Sheets
- إضافة المشرفين، الخصومات، الشقق، الموتوسيكلات: إذا فشل الاتصال بـ Sheets، يحفظ الـ Backend محلياً (ملفات JSON في `api/data/` أو مشابه) ويرد برسالة توضح أن الحفظ كان محلياً.

### 5. لماذا لا تظهر بيانات Google Sheets في المشروع؟
- **التحقق من الاتصال:** افتح في المتصفح: `http://127.0.0.1:5000/api/sync/status`  
  إذا كان `connected: false` ستجد حقل `error` أو `message` يشرح السبب (مثلاً: عدم مشاركة الملف مع حساب الخدمة، أو عدم وجود credentials).
- **مشاركة الملف:** شارك ملف Google Sheets مع البريد الموجود داخل `credentials.json` تحت المفتاح `client_email` (صلاحية محرر أو قارئ).
- **أسماء الأوراق:** التطبيق يربط أسماء التابات المنطقية (مثل EquipmentExchange، MainInventory) بأسماء التابات الفعلية في الشيت عبر `SHEET_NAME_ALIASES` (مثل Box_Exchanges، Inventory). إذا كان اسم التاب في الشيت مختلفاً، أضفه في `api/utils/sheets_config.py`.
- **رؤوس الأعمدة و duplicate headers:** التطبيق يقرأ كل التابات الـ 11 برؤوس ثابتة (`SHEET_EXPECTED_HEADERS` / `SHEET_HEADERS`) لتجنب أخطاء "duplicate headers" أو "unknown headers" من gspread. ترتيب الأعمدة في الشيت يجب أن يطابق ترتيب `SHEET_HEADERS` لكل تاب.
- **حد الطلبات (429):** أداة "تشخيص Google Sheets" تفحص التابات الـ 11 الرئيسية فقط مع تأخير بين الطلبات لتجنب تجاوز حد Google (Read requests per minute).

---

*آخر مراجعة: وفق المواصفات المقدمة.*
