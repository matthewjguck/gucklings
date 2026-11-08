-- Gucklings Family Seed Data
-- Run this AFTER schema.sql to pre-populate family members
-- All family members use the same passcode for simplicity

-- Store the passcode in a comment for reference
-- Passcode: Gucklings2024!
-- (Change this to something more secure, then update all rows below)

INSERT INTO profiles (id, phone_number, passcode_hash, display_name, created_at)
VALUES
  (gen_random_uuid(), '+1-903-445-7839', 'Gucklings2024!', 'Chris', NOW()),
  (gen_random_uuid(), '+1-903-445-5904', 'Gucklings2024!', 'Matthew', NOW()),
  (gen_random_uuid(), '+1-903-445-6139', 'Gucklings2024!', 'Stephanie', NOW()),
  (gen_random_uuid(), '+1-903-445-4552', 'Gucklings2024!', 'Cookie', NOW()),
  (gen_random_uuid(), '+1-903-240-7786', 'Gucklings2024!', 'Mom', NOW()),
  (gen_random_uuid(), '+1-903-220-8120', 'Gucklings2024!', 'Dad', NOW());

-- Create family relationships (all accepted, forming a family circle)
INSERT INTO friends (id, requester_id, addressee_id, status, created_at)
SELECT
  gen_random_uuid(),
  p1.id,
  p2.id,
  'accepted',
  NOW()
FROM
  (SELECT id FROM profiles WHERE display_name = 'Chris') p1,
  (SELECT id FROM profiles WHERE display_name IN ('Matthew', 'Stephanie', 'Cookie', 'Mom', 'Dad')) p2
WHERE p1.id != p2.id

UNION ALL

SELECT
  gen_random_uuid(),
  p1.id,
  p2.id,
  'accepted',
  NOW()
FROM
  (SELECT id FROM profiles WHERE display_name = 'Matthew') p1,
  (SELECT id FROM profiles WHERE display_name IN ('Stephanie', 'Cookie', 'Mom', 'Dad')) p2
WHERE p1.id != p2.id

UNION ALL

SELECT
  gen_random_uuid(),
  p1.id,
  p2.id,
  'accepted',
  NOW()
FROM
  (SELECT id FROM profiles WHERE display_name = 'Stephanie') p1,
  (SELECT id FROM profiles WHERE display_name IN ('Cookie', 'Mom', 'Dad')) p2
WHERE p1.id != p2.id

UNION ALL

SELECT
  gen_random_uuid(),
  p1.id,
  p2.id,
  'accepted',
  NOW()
FROM
  (SELECT id FROM profiles WHERE display_name = 'Cookie') p1,
  (SELECT id FROM profiles WHERE display_name IN ('Mom', 'Dad')) p2
WHERE p1.id != p2.id

UNION ALL

SELECT
  gen_random_uuid(),
  p1.id,
  p2.id,
  'accepted',
  NOW()
FROM
  (SELECT id FROM profiles WHERE display_name = 'Mom') p1,
  (SELECT id FROM profiles WHERE display_name = 'Dad') p2
WHERE p1.id != p2.id;
