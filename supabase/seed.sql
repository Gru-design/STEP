-- ============================================================
-- STEP Seed Data
-- Demo tenant, users, teams, and team_members
-- ============================================================

-- 1. Tenant
INSERT INTO tenants (id, name, plan, report_visibility)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'デモ株式会社',
  'free',
  'team'
);

-- 2. Users
-- NOTE: In production these are created via auth.users trigger.
--       For seeding we insert directly into public.users.

-- admin: 田中太郎
INSERT INTO users (id, tenant_id, email, role, name, phone, bio)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'admin@demo.com',
  'admin',
  '田中太郎',
  '090-1234-5678',
  'テナント管理者'
);

-- manager: 鈴木花子
INSERT INTO users (id, tenant_id, email, role, name, slack_id, calendar_url, bio)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'manager@demo.com',
  'manager',
  '鈴木花子',
  'U_SUZUKI',
  'https://calendly.com/suzuki',
  '営業マネージャー'
);

-- member1: 佐藤一郎
INSERT INTO users (id, tenant_id, email, role, name, phone)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'member1@demo.com',
  'member',
  '佐藤一郎',
  '090-1111-2222'
);

-- member2: 高橋美咲
INSERT INTO users (id, tenant_id, email, role, name, slack_id)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'member2@demo.com',
  'member',
  '高橋美咲',
  'U_TAKAHASHI'
);

-- member3: 山田健太
INSERT INTO users (id, tenant_id, email, role, name, calendar_url)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  'member3@demo.com',
  'member',
  '山田健太',
  'https://calendly.com/yamada'
);

-- 3. Teams

-- 営業第一チーム (manager: 鈴木花子)
INSERT INTO teams (id, tenant_id, name, manager_id)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '営業第一チーム',
  '33333333-3333-3333-3333-333333333333'
);

-- 営業第二チーム (no manager assigned)
INSERT INTO teams (id, tenant_id, name)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  '営業第二チーム'
);

-- 4. Team Members

-- 営業第一チーム: 鈴木花子 (manager), 佐藤一郎, 高橋美咲
INSERT INTO team_members (team_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'manager'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'member');

-- 営業第二チーム: 山田健太
INSERT INTO team_members (team_id, user_id, role) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 'member');
