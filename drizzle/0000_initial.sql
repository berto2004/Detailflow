PRAGMA foreign_keys = ON;

-- Better Auth
CREATE TABLE user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  emailVerified INTEGER DEFAULT 0 NOT NULL,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX user_email_uq ON user(email);

CREATE TABLE session (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX session_token_uq ON session(token);
CREATE INDEX session_user_idx ON session(userId);

CREATE TABLE account (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  idToken TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX account_user_idx ON account(userId);
CREATE UNIQUE INDEX account_provider_account_uq ON account(providerId, accountId);

CREATE TABLE verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX verification_identifier_idx ON verification(identifier);

-- DetailFlow tenant model
CREATE TABLE organizations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT DEFAULT 'trial' NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX organizations_slug_uq ON organizations(slug);

CREATE TABLE members (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  auth_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'technician' NOT NULL,
  active INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX members_org_user_uq ON members(organization_id, auth_user_id);
CREATE INDEX members_user_idx ON members(auth_user_id);

CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX customers_org_idx ON customers(organization_id);
CREATE INDEX customers_org_phone_idx ON customers(organization_id, phone);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX vehicles_org_idx ON vehicles(organization_id);
CREATE UNIQUE INDEX vehicles_org_plate_uq ON vehicles(organization_id, plate_number);
CREATE INDEX vehicles_customer_idx ON vehicles(customer_id);

CREATE TABLE services (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  active INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX services_org_idx ON services(organization_id);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  scheduled_at INTEGER NOT NULL,
  status TEXT DEFAULT 'booked' NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX bookings_org_scheduled_idx ON bookings(organization_id, scheduled_at);

CREATE TABLE work_orders (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  assigned_member_id TEXT REFERENCES members(id),
  status TEXT DEFAULT 'inspection' NOT NULL,
  subtotal INTEGER DEFAULT 0 NOT NULL,
  discount INTEGER DEFAULT 0 NOT NULL,
  total INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX work_orders_org_status_idx ON work_orders(organization_id, status);

CREATE TABLE work_order_items (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  unit_price INTEGER NOT NULL,
  line_total INTEGER NOT NULL
);
CREATE INDEX work_order_items_org_wo_idx ON work_order_items(organization_id, work_order_id);

CREATE TABLE job_photos (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  object_key TEXT NOT NULL,
  caption TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX job_photos_org_wo_idx ON job_photos(organization_id, work_order_id);
