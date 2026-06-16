-- SQL SCHEMA FOR NEWTON AI TUTOR ENTERPRISE FEATURES
-- Run this in your Supabase SQL Editor to set up tables and Row Level Security policies.

-- 1. Create user profiles table (for RBAC)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT CHECK (role IN ('student', 'teacher')) DEFAULT 'student',
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create session replays table
CREATE TABLE IF NOT EXISTS session_replays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  student_name TEXT,
  concept TEXT,
  events JSONB,
  canvas_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_replays ENABLE ROW LEVEL SECURITY;

-- 4. Create non-restrictive policies for quick demo access
CREATE POLICY "Allow all public access user_profiles" ON user_profiles FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access session_replays" ON session_replays FOR ALL TO public USING (true) WITH CHECK (true);
