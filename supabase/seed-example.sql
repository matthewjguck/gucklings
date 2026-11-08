-- Gucklings Family Seed Example
-- COPY THIS FILE AND REPLACE WITH REAL PHONE NUMBERS
-- KEEP THE REAL VERSION PRIVATE (DO NOT COMMIT TO GIT)
--
-- This is just an example - use supabase/seed-family.sql (which is gitignored)
-- for your actual family phone numbers

-- All family members use the same passcode for simplicity
-- Passcode: Gucklings2024! (change after first login)

INSERT INTO profiles (id, phone_number, passcode_hash, display_name, created_at)
VALUES
  (gen_random_uuid(), '+1-555-111-1111', 'Gucklings2024!', 'Family Member 1', NOW()),
  (gen_random_uuid(), '+1-555-222-2222', 'Gucklings2024!', 'Family Member 2', NOW()),
  (gen_random_uuid(), '+1-555-333-3333', 'Gucklings2024!', 'Family Member 3', NOW()),
  (gen_random_uuid(), '+1-555-444-4444', 'Gucklings2024!', 'Family Member 4', NOW()),
  (gen_random_uuid(), '+1-555-555-5555', 'Gucklings2024!', 'Family Member 5', NOW()),
  (gen_random_uuid(), '+1-555-666-6666', 'Gucklings2024!', 'Family Member 6', NOW());

-- Create family relationships (all accepted, forming a family circle)
INSERT INTO friends (id, requester_id, addressee_id, status, created_at)
SELECT
  gen_random_uuid(),
  p1.id,
  p2.id,
  'accepted',
  NOW()
FROM
  (SELECT id FROM profiles WHERE display_name = 'Family Member 1') p1,
  (SELECT id FROM profiles WHERE display_name IN ('Family Member 2', 'Family Member 3', 'Family Member 4', 'Family Member 5', 'Family Member 6')) p2
WHERE p1.id != p2.id

UNION ALL

SELECT
  gen_random_uuid(),
  p1.id,
  p2.id,
  'accepted',
  NOW()
FROM
  (SELECT id FROM profiles WHERE display_name = 'Family Member 2') p1,
  (SELECT id FROM profiles WHERE display_name IN ('Family Member 3', 'Family Member 4', 'Family Member 5', 'Family Member 6')) p2
WHERE p1.id != p2.id

UNION ALL

SELECT
  gen_random_uuid(),
  p1.id,
  p2.id,
  'accepted',
  NOW()
FROM
  (SELECT id FROM profiles WHERE display_name = 'Family Member 3') p1,
  (SELECT id FROM profiles WHERE display_name IN ('Family Member 4', 'Family Member 5', 'Family Member 6')) p2
WHERE p1.id != p2.id

UNION ALL

SELECT
  gen_random_uuid(),
  p1.id,
  p2.id,
  'accepted',
  NOW()
FROM
  (SELECT id FROM profiles WHERE display_name = 'Family Member 4') p1,
  (SELECT id FROM profiles WHERE display_name IN ('Family Member 5', 'Family Member 6')) p2
WHERE p1.id != p2.id

UNION ALL

SELECT
  gen_random_uuid(),
  p1.id,
  p2.id,
  'accepted',
  NOW()
FROM
  (SELECT id FROM profiles WHERE display_name = 'Family Member 5') p1,
  (SELECT id FROM profiles WHERE display_name = 'Family Member 6') p2
WHERE p1.id != p2.id;
