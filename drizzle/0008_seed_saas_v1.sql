-- ============================================================
-- DetailFlow SaaS Entitlement Seed v1
-- ============================================================

-- ------------------------------------------------------------
-- PLANS
-- ------------------------------------------------------------

INSERT OR IGNORE INTO plans (
  id,
  code,
  name,
  description,
  price_monthly,
  price_yearly,
  currency,
  active,
  sort_order,
  created_at,
  updated_at
) VALUES
  (
    'plan_starter',
    'starter',
    'Starter',
    'Untuk bisnis yang baru mulai digitalisasi operasional.',
    0,
    0,
    'IDR',
    1,
    10,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'plan_pro',
    'pro',
    'Pro',
    'Untuk bisnis dengan operasional yang sedang berkembang.',
    0,
    0,
    'IDR',
    1,
    20,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'plan_business',
    'business',
    'Business',
    'Untuk operasional bisnis yang lebih besar dan multi-outlet.',
    0,
    0,
    'IDR',
    1,
    30,
    unixepoch() * 1000,
    unixepoch() * 1000
  );

-- ------------------------------------------------------------
-- FEATURES
-- ------------------------------------------------------------

INSERT OR IGNORE INTO features (
  id,
  code,
  name,
  description,
  type,
  active,
  created_at,
  updated_at
) VALUES
  (
    'feature_users',
    'users',
    'Users',
    'Jumlah user yang dapat aktif dalam organisasi.',
    'limit',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'feature_customers',
    'customers',
    'Customers',
    'Jumlah customer yang dapat disimpan.',
    'limit',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'feature_work_orders',
    'work_orders',
    'Work Orders',
    'Jumlah work order yang dapat dibuat per bulan.',
    'limit',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'feature_storage',
    'storage',
    'Storage',
    'Quota penyimpanan foto dan asset.',
    'limit',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'feature_inspection',
    'inspection',
    'Digital Inspection',
    'Fitur inspeksi digital kendaraan.',
    'boolean',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'feature_invoice',
    'invoice',
    'Invoice',
    'Pembuatan invoice.',
    'boolean',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'feature_payments',
    'payments',
    'Payments',
    'Pencatatan pembayaran invoice.',
    'boolean',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'feature_reports_basic',
    'reports_basic',
    'Basic Reports',
    'Laporan operasional dasar.',
    'boolean',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'feature_reports_advanced',
    'reports_advanced',
    'Advanced Reports',
    'Laporan dan analitik lanjutan.',
    'boolean',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'feature_custom_branding',
    'custom_branding',
    'Custom Branding',
    'Logo dan branding bisnis.',
    'boolean',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'feature_multi_outlet',
    'multi_outlet',
    'Multi Outlet',
    'Pengelolaan beberapa outlet.',
    'boolean',
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  );

-- ------------------------------------------------------------
-- PLAN FEATURES
-- ------------------------------------------------------------

-- STARTER

INSERT OR IGNORE INTO plan_features (
  id,
  plan_id,
  feature_id,
  enabled,
  limit_value,
  unlimited,
  created_at,
  updated_at
) VALUES
  (
    'pf_starter_users',
    'plan_starter',
    'feature_users',
    1,
    2,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_starter_customers',
    'plan_starter',
    'feature_customers',
    1,
    200,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_starter_work_orders',
    'plan_starter',
    'feature_work_orders',
    1,
    100,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_starter_storage',
    'plan_starter',
    'feature_storage',
    1,
    1073741824,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_starter_inspection',
    'plan_starter',
    'feature_inspection',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_starter_invoice',
    'plan_starter',
    'feature_invoice',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_starter_payments',
    'plan_starter',
    'feature_payments',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_starter_reports_basic',
    'plan_starter',
    'feature_reports_basic',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_starter_reports_advanced',
    'plan_starter',
    'feature_reports_advanced',
    0,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_starter_custom_branding',
    'plan_starter',
    'feature_custom_branding',
    0,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_starter_multi_outlet',
    'plan_starter',
    'feature_multi_outlet',
    0,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  );

-- PRO

INSERT OR IGNORE INTO plan_features (
  id,
  plan_id,
  feature_id,
  enabled,
  limit_value,
  unlimited,
  created_at,
  updated_at
) VALUES
  (
    'pf_pro_users',
    'plan_pro',
    'feature_users',
    1,
    5,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_pro_customers',
    'plan_pro',
    'feature_customers',
    1,
    1000,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_pro_work_orders',
    'plan_pro',
    'feature_work_orders',
    1,
    500,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_pro_storage',
    'plan_pro',
    'feature_storage',
    1,
    10737418240,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_pro_inspection',
    'plan_pro',
    'feature_inspection',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_pro_invoice',
    'plan_pro',
    'feature_invoice',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_pro_payments',
    'plan_pro',
    'feature_payments',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_pro_reports_basic',
    'plan_pro',
    'feature_reports_basic',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_pro_reports_advanced',
    'plan_pro',
    'feature_reports_advanced',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_pro_custom_branding',
    'plan_pro',
    'feature_custom_branding',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_pro_multi_outlet',
    'plan_pro',
    'feature_multi_outlet',
    0,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  );

-- BUSINESS

INSERT OR IGNORE INTO plan_features (
  id,
  plan_id,
  feature_id,
  enabled,
  limit_value,
  unlimited,
  created_at,
  updated_at
) VALUES
  (
    'pf_business_users',
    'plan_business',
    'feature_users',
    1,
    15,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_business_customers',
    'plan_business',
    'feature_customers',
    1,
    NULL,
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_business_work_orders',
    'plan_business',
    'feature_work_orders',
    1,
    NULL,
    1,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_business_storage',
    'plan_business',
    'feature_storage',
    1,
    53687091200,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_business_inspection',
    'plan_business',
    'feature_inspection',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_business_invoice',
    'plan_business',
    'feature_invoice',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_business_payments',
    'plan_business',
    'feature_payments',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_business_reports_basic',
    'plan_business',
    'feature_reports_basic',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_business_reports_advanced',
    'plan_business',
    'feature_reports_advanced',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_business_custom_branding',
    'plan_business',
    'feature_custom_branding',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'pf_business_multi_outlet',
    'plan_business',
    'feature_multi_outlet',
    1,
    NULL,
    0,
    unixepoch() * 1000,
    unixepoch() * 1000
  );