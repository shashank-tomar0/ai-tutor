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

-- 3. Create skills table (self-referencing tree for adaptive learning)
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'mathematics',
  parent_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  difficulty INT CHECK (difficulty BETWEEN 1 AND 10) DEFAULT 1,
  icon TEXT DEFAULT '📚',
  order_index INT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create skill prerequisites (DAG for learning dependencies)
CREATE TABLE IF NOT EXISTS skill_prerequisites (
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  requires_skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, requires_skill_id)
);

-- 5. Create user skills progress (per-user mastery tracking)
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  mastery_level NUMERIC(3,2) CHECK (mastery_level BETWEEN 0 AND 1) DEFAULT 0,
  attempts INT DEFAULT 0,
  successful_attempts INT DEFAULT 0,
  last_practiced TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, skill_id)
);

-- 6. Create interventions table (existing, adding skill_id)
CREATE TABLE IF NOT EXISTS interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  student_name TEXT,
  concept TEXT,
  struggle TEXT,
  breakthrough TEXT,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- 8. Create non-restrictive policies for quick demo access
CREATE POLICY "Allow all public access user_profiles" ON user_profiles FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access session_replays" ON session_replays FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access skills" ON skills FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access skill_prerequisites" ON skill_prerequisites FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access user_skills" ON user_skills FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access interventions" ON interventions FOR ALL TO public USING (true) WITH CHECK (true);

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_parent ON skills(parent_id);
CREATE INDEX IF NOT EXISTS idx_skills_subject ON skills(subject);
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_interventions_user ON interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_skill ON interventions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_prereqs_requires ON skill_prerequisites(requires_skill_id);

-- 10. Seed data for math skill tree
-- Root subjects
INSERT INTO skills (id, name, subject, difficulty, icon, order_index, description) VALUES
('11111111-1111-1111-1111-111111111111', 'Arithmetic', 'mathematics', 1, '🔢', 1, 'Foundation: numbers and basic operations'),
('22222222-2222-2222-2222-222222222222', 'Algebra', 'mathematics', 4, '🔤', 2, 'Variables, equations, and functions'),
('33333333-3333-3333-3333-333333333333', 'Geometry', 'mathematics', 4, '📐', 3, 'Shapes, angles, and spatial reasoning'),
('44444444-4444-4444-4444-444444444444', 'Trigonometry', 'mathematics', 6, '📐', 4, 'Triangle relationships and periodic functions'),
('55555555-5555-5555-5555-555555555555', 'Calculus', 'mathematics', 8, '∫', 5, 'Limits, derivatives, and integrals'),
('66666666-6666-6666-6666-666666666666', 'Statistics & Probability', 'mathematics', 5, '📊', 6, 'Data analysis and uncertainty'),
('77777777-7777-7777-7777-777777777777', 'Computer Science Basics', 'computer_science', 3, '💻', 7, 'Logic, algorithms, and programming fundamentals')
ON CONFLICT (id) DO NOTHING;

-- Arithmetic children
INSERT INTO skills (id, name, subject, parent_id, difficulty, icon, order_index, description) VALUES
('11111111-1111-1111-1111-111111111112', 'Addition & Subtraction', 'mathematics', '11111111-1111-1111-1111-111111111111', 1, '➕', 1, 'Basic operations with whole numbers'),
('11111111-1111-1111-1111-111111111113', 'Multiplication & Division', 'mathematics', '11111111-1111-1111-1111-111111111111', 2, '✖️', 2, 'Times tables and division facts'),
('11111111-1111-1111-1111-111111111114', 'Fractions', 'mathematics', '11111111-1111-1111-1111-111111111111', 3, '🍰', 3, 'Parts of a whole, equivalent fractions'),
('11111111-1111-1111-1111-111111111115', 'Decimals & Percentages', 'mathematics', '11111111-1111-1111-1111-111111111111', 3, '💯', 4, 'Decimal place value and percent conversion'),
('11111111-1111-1111-1111-111111111116', 'Negative Numbers', 'mathematics', '11111111-1111-1111-1111-111111111111', 3, '➖', 5, 'Integers and absolute value'),
('11111111-1111-1111-1111-111111111117', 'Order of Operations', 'mathematics', '11111111-1111-1111-1111-111111111111', 3, '📝', 6, 'PEMDAS/BODMAS rules')
ON CONFLICT (id) DO NOTHING;

-- Algebra children
INSERT INTO skills (id, name, subject, parent_id, difficulty, icon, order_index, description) VALUES
('22222222-2222-2222-2222-222222222222', 'Variables & Expressions', 'mathematics', '22222222-2222-2222-2222-222222222222', 4, '𝑥', 1, 'Understanding variables and algebraic notation'),
('22222222-2222-2222-2222-222222222223', 'Linear Equations', 'mathematics', '22222222-2222-2222-2222-222222222222', 5, '📏', 2, 'Solving ax + b = c'),
('22222222-2222-2222-2222-222222222224', 'Systems of Equations', 'mathematics', '22222222-2222-2222-2222-222222222222', 6, '🔗', 3, 'Solving multiple equations together'),
('22222222-2222-2222-2222-222222222225', 'Quadratic Equations', 'mathematics', '22222222-2222-2222-2222-222222222222', 6, '📈', 4, 'ax² + bx + c = 0'),
('22222222-2222-2222-2222-222222222226', 'Polynomials', 'mathematics', '22222222-2222-2222-2222-222222222222', 7, '🧮', 5, 'Operations with polynomials'),
('22222222-2222-2222-2222-222222222227', 'Functions & Graphs', 'mathematics', '22222222-2222-2222-2222-222222222222', 5, '📊', 6, 'Domain, range, and function notation')
ON CONFLICT (id) DO NOTHING;

-- Geometry children
INSERT INTO skills (id, name, subject, parent_id, difficulty, icon, order_index, description) VALUES
('33333333-3333-3333-3333-333333333332', 'Angles & Lines', 'mathematics', '33333333-3333-3333-3333-333333333333', 4, '∠', 1, 'Angle types, parallel/perpendicular lines'),
('33333333-3333-3333-3333-333333333333', 'Triangles', 'mathematics', '33333333-3333-3333-3333-333333333333', 5, '🔺', 2, 'Triangle types, angle sum, congruence'),
('33333333-3333-3333-3333-333333333334', 'Circles', 'mathematics', '33333333-3333-3333-3333-333333333333', 6, '⭕', 3, 'Radius, diameter, circumference, area'),
('33333333-3333-3333-3333-333333333335', 'Polygons & Quadrilaterals', 'mathematics', '33333333-3333-3333-3333-333333333333', 5, '🔷', 4, 'Properties of 4+ sided shapes'),
('33333333-3333-3333-3333-333333333336', 'Area & Perimeter', 'mathematics', '33333333-3333-3333-3333-333333333333', 5, '📏', 5, 'Calculating area and perimeter'),
('33333333-3333-3333-3333-333333333337', 'Volume & Surface Area', 'mathematics', '33333333-3333-3333-3333-333333333333', 6, '📦', 6, '3D shapes and their measurements')
ON CONFLICT (id) DO NOTHING;

-- Trigonometry children
INSERT INTO skills (id, name, subject, parent_id, difficulty, icon, order_index, description) VALUES
('44444444-4444-4444-4444-444444444442', 'Right Triangle Trig', 'mathematics', '44444444-4444-4444-4444-444444444444', 6, '📐', 1, 'SOH CAH TOA'),
('44444444-4444-4444-4444-444444444443', 'Unit Circle', 'mathematics', '44444444-4444-4444-4444-444444444444', 7, '⭕', 2, 'Angles in radians, sin/cos on unit circle'),
('44444444-4444-4444-4444-444444444444', 'Trig Identities', 'mathematics', '44444444-4444-4444-4444-444444444444', 7, '🔄', 3, 'Pythagorean, angle sum, double angle'),
('44444444-4444-4444-4444-444444444445', 'Graphing Trig Functions', 'mathematics', '44444444-4444-4444-4444-444444444444', 7, '📈', 4, 'Sine, cosine, tangent waves')
ON CONFLICT (id) DO NOTHING;

-- Calculus children
INSERT INTO skills (id, name, subject, parent_id, difficulty, icon, order_index, description) VALUES
('55555555-5555-5555-5555-555555555552', 'Limits', 'mathematics', '55555555-5555-5555-5555-555555555555', 8, '🎯', 1, 'Understanding limits and continuity'),
('55555555-5555-5555-5555-555555555553', 'Derivatives', 'mathematics', '55555555-5555-5555-5555-555555555555', 8, '📉', 2, 'Rates of change and differentiation rules'),
('55555555-5555-5555-5555-555555555554', 'Integrals', 'mathematics', '55555555-5555-5555-5555-555555555555', 8, '∫', 3, 'Area under curve and antiderivatives'),
('55555555-5555-5555-5555-555555555555', 'Applications of Calculus', 'mathematics', '55555555-5555-5555-5555-555555555555', 9, '🚀', 4, 'Optimization, related rates, motion')
ON CONFLICT (id) DO NOTHING;

-- Statistics children
INSERT INTO skills (id, name, subject, parent_id, difficulty, icon, order_index, description) VALUES
('66666666-6666-6666-6666-666666666662', 'Mean, Median, Mode', 'mathematics', '66666666-6666-6666-6666-666666666666', 4, '📊', 1, 'Measures of central tendency'),
('66666666-6666-6666-6666-666666666663', 'Standard Deviation', 'mathematics', '66666666-6666-6666-6666-666666666666', 5, '📏', 2, 'Measuring spread'),
('66666666-6666-6666-6666-666666666664', 'Probability Basics', 'mathematics', '66666666-6666-6666-6666-666666666666', 4, '🎲', 3, 'Simple and compound probability'),
('66666666-6666-6666-6666-666666666665', 'Distributions', 'mathematics', '66666666-6666-6666-6666-666666666666', 6, '🔔', 4, 'Normal, binomial, Poisson distributions')
ON CONFLICT (id) DO NOTHING;

-- CS Basics children
INSERT INTO skills (id, name, subject, parent_id, difficulty, icon, order_index, description) VALUES
('77777777-7777-7777-7777-777777777772', 'Variables & Types', 'computer_science', '77777777-7777-7777-7777-777777777777', 3, '📦', 1, 'Data types and variables in code'),
('77777777-7777-7777-7777-777777777773', 'Control Flow', 'computer_science', '77777777-7777-7777-7777-777777777777', 3, '🔀', 2, 'If/else, loops, conditions'),
('77777777-7777-7777-7777-777777777774', 'Functions', 'computer_science', '77777777-7777-7777-7777-777777777777', 4, '📦', 3, 'Defining and calling functions'),
('77777777-7777-7777-7777-777777777775', 'Arrays & Lists', 'computer_science', '77777777-7777-7777-7777-777777777777', 4, '📋', 4, 'Working with collections'),
('77777777-7777-7777-7777-777777777776', 'Basic Algorithms', 'computer_science', '77777777-7777-7777-7777-777777777777', 5, '⚙️', 5, 'Sorting, searching, Big O')
ON CONFLICT (id) DO NOTHING;

-- Prerequisites (learning dependencies)
-- Algebra requires Arithmetic
INSERT INTO skill_prerequisites (skill_id, requires_skill_id) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111113'),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111114'),
('22222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222223'),
('22222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222223'),
('22222222-2222-2222-2222-222222222226', '22222222-2222-2222-2222-222222222223'),
('22222222-2222-2222-2222-222222222227', '22222222-2222-2222-2222-222222222223')
ON CONFLICT DO NOTHING;

-- Geometry requires Arithmetic
INSERT INTO skill_prerequisites (skill_id, requires_skill_id) VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111'),
('33333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333'),
('33333333-3333-3333-3333-333333333335', '33333333-3333-3333-3333-333333333333'),
('33333333-3333-3333-3333-333333333336', '33333333-3333-3333-3333-333333333333'),
('33333333-3333-3333-3333-333333333337', '33333333-3333-3333-3333-333333333336')
ON CONFLICT DO NOTHING;

-- Trigonometry requires Geometry + Algebra
INSERT INTO skill_prerequisites (skill_id, requires_skill_id) VALUES
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333'),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Calculus requires Trigonometry + Algebra
INSERT INTO skill_prerequisites (skill_id, requires_skill_id) VALUES
('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444'),
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Statistics requires Arithmetic
INSERT INTO skill_prerequisites (skill_id, requires_skill_id) VALUES
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111'),
('66666666-6666-6666-6666-666666666663', '66666666-6666-6666-6666-666666666662')
ON CONFLICT DO NOTHING;

-- CS Basics has no hard prereqs (beginner-friendly)