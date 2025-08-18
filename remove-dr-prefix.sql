-- Remove "Dr" prefix from all doctor names
-- Run this script in your Supabase SQL Editor

-- First, let's see the current doctor names
SELECT id, name FROM doctors ORDER BY name;

-- Update all doctor names to remove "Dr" prefix
-- This handles various formats: "Dr.", "Dr ", "Dr. ", etc.
UPDATE doctors 
SET name = TRIM(
  REGEXP_REPLACE(
    name, 
    '^Dr\.?\s*', 
    '', 
    'i'  -- case insensitive
  )
)
WHERE name ILIKE 'Dr%';

-- Also handle cases where there might be extra spaces after removing "Dr"
UPDATE doctors 
SET name = TRIM(name)
WHERE name LIKE ' %' OR name LIKE '% ';

-- Verify the changes
SELECT id, name FROM doctors ORDER BY name;

-- Optional: Show a summary of changes
SELECT 
  COUNT(*) as total_doctors,
  COUNT(CASE WHEN name NOT LIKE 'Dr%' THEN 1 END) as doctors_without_dr,
  COUNT(CASE WHEN name LIKE 'Dr%' THEN 1 END) as doctors_still_with_dr
FROM doctors;
