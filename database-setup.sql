-- ====================================
-- CryptoMine Pro - Supabase Tables
-- انسخ هذا الكود في SQL Editor واضغط Run
-- ====================================

-- حذف الجداول القديمة إن وجدت
DROP TABLE IF EXISTS mining_notifications CASCADE;
DROP TABLE IF EXISTS mining_messages CASCADE;
DROP TABLE IF EXISTS mining_transactions CASCADE;
DROP TABLE IF EXISTS mining_devices CASCADE;
DROP TABLE IF EXISTS mining_users CASCADE;

-- 1. جدول المستخدمين
CREATE TABLE mining_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  referral_code TEXT,
  referred_by TEXT,
  referral_earnings NUMERIC DEFAULT 0,
  total_deposits NUMERIC DEFAULT 0,
  total_withdrawals NUMERIC DEFAULT 0,
  created_at BIGINT,
  last_login BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول الأجهزة
CREATE TABLE mining_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id INTEGER NOT NULL,
  is_running BOOLEAN DEFAULT false,
  start_time BIGINT,
  duration INTEGER,
  total_earned NUMERIC DEFAULT 0,
  is_gift BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول المعاملات المالية
CREATE TABLE mining_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  wallet_address TEXT,
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول الرسائل
CREATE TABLE mining_messages (
  id TEXT PRIMARY KEY,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول الإشعارات
CREATE TABLE mining_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- تفعيل RLS وإضافة سياسات عامة
-- ====================================

ALTER TABLE mining_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON mining_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON mining_devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON mining_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON mining_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON mining_notifications FOR ALL USING (true) WITH CHECK (true);
