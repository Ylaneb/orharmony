-- Check absence types in the database
-- Run this in your Supabase SQL Editor

-- 1. Check all absence types in the database
SELECT 
  type,
  COUNT(*) as count,
  MIN(request_start_date) as earliest_date,
  MAX(request_end_date) as latest_date
FROM time_off_requests 
WHERE status = 'approved'
GROUP BY type
ORDER BY count DESC;

-- 2. Check for any null or invalid types
SELECT 
  type,
  COUNT(*) as count
FROM time_off_requests 
WHERE status = 'approved' 
  AND (type IS NULL OR type = '')
GROUP BY type;

-- 3. Check for any types that don't match expected values
SELECT DISTINCT type
FROM time_off_requests 
WHERE status = 'approved'
  AND type NOT IN ('vacation', 'sick_leave', 'personal', 'conference', 'other')
ORDER BY type;

-- 4. Check recent absences to see what's being created
SELECT 
  id,
  doctor_id,
  request_start_date,
  request_end_date,
  type,
  status,
  created_date
FROM time_off_requests 
WHERE status = 'approved'
  AND created_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_date DESC
LIMIT 20;

-- 5. Check if there are any case sensitivity issues
SELECT 
  LOWER(type) as normalized_type,
  COUNT(*) as count
FROM time_off_requests 
WHERE status = 'approved'
GROUP BY LOWER(type)
ORDER BY count DESC;

-- 6. Check the materialized view
SELECT 
  type,
  COUNT(*) as count
FROM approved_absences_summary
GROUP BY type
ORDER BY count DESC;

-- 7. Compare materialized view with original table
SELECT 
  'original_table' as source,
  type,
  COUNT(*) as count
FROM time_off_requests 
WHERE status = 'approved'
GROUP BY type

UNION ALL

SELECT 
  'materialized_view' as source,
  type,
  COUNT(*) as count
FROM approved_absences_summary
GROUP BY type

ORDER BY type, source; 