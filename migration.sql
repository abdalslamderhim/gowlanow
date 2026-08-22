-- تشغيل هذا الملف مرة واحدة داخل SQL console بلوحة Netlify (Database → production → SQL console)
-- كل الأوامر آمنة للتكرار (IF NOT EXISTS) — يعني ما راح تكسر شي لو شغّلتيه أكثر من مرة بالغلط.

-- جدول الأخبار: نضيف أي عمود ناقص لجدول articles الموجود مسبقًا بدون حذف أي بيانات
ALTER TABLE articles ADD COLUMN IF NOT EXISTS category    TEXT DEFAULT 'محلي';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt     TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS body        TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS image       TEXT DEFAULT 'assets/studio.jpg';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'draft';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS breaking    BOOLEAN DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured    BOOLEAN DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS reporter    TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS views       INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS time_label  TEXT DEFAULT 'الآن';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT now();
ALTER TABLE articles ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- جدول المراسلين
ALTER TABLE reporters ADD COLUMN IF NOT EXISTS name    TEXT;
ALTER TABLE reporters ADD COLUMN IF NOT EXISTS role    TEXT DEFAULT 'مراسل جولة';
ALTER TABLE reporters ADD COLUMN IF NOT EXISTS region  TEXT DEFAULT '';
ALTER TABLE reporters ADD COLUMN IF NOT EXISTS active  BOOLEAN DEFAULT true;

-- سجل تتبّع بسيط (اختياري حاليًا، غير مستخدم من الكود بعد — جاهز لمرحلة قادمة)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id BIGINT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- بيانات تجريبية أولية — تُضاف فقط إذا كان الجدول فاضيًا تمامًا (ما راح تكرر لو شغّلتيه مرتين)
INSERT INTO articles (title, category, excerpt, body, image, status, breaking, featured, reporter, views, time_label)
SELECT * FROM (VALUES
  ('جولة تتابع آخر المستجدات من الميدان','محلي','تغطية مستمرة لأبرز الأحداث والوقائع مع تحديثات من مراسلي جولة.','تتابع قناة جولة الحدث من الميدان وتنقل التفاصيل أولاً بأول.','assets/studio.jpg','published',true,true,'أحمد محمد',1840,'الآن'),
  ('تغطية ميدانية: تفاصيل جديدة من قلب الحدث','تغطيات جولة','مراسلو جولة في الميدان لنقل الصورة كاملة.','تقرير ميداني مصور يضع الحدث في سياقه.','assets/studio.jpg','published',false,false,'محمد عمر',1320,'قبل 18 دقيقة'),
  ('تقرير جولة: قراءة في المشهد وأبرز ما يجب معرفته','تقارير','سياق وتحليل ومصادر تساعدك على فهم القصة.','تقرير تحليلي من إعداد فريق جولة.','assets/studio.jpg','published',false,false,'علي إبراهيم',760,'قبل ساعة')
) AS v(title,category,excerpt,body,image,status,breaking,featured,reporter,views,time_label)
WHERE NOT EXISTS (SELECT 1 FROM articles);

INSERT INTO reporters (name, role, region, active)
SELECT * FROM (VALUES
  ('أحمد محمد','مراسل ميداني','الوسط',true),
  ('محمد عمر','مراسل جولة','الشرق',true),
  ('علي إبراهيم','مراسل وتصوير','الغرب',true),
  ('سارة أحمد','محررة ميدانية','الشمال',true)
) AS v(name,role,region,active)
WHERE NOT EXISTS (SELECT 1 FROM reporters);
