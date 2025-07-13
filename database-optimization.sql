-- Database Optimization for Absences Page Performance
-- Run this in your Supabase SQL Editor

-- 1. Add indexes for time_off_requests table
-- These indexes will significantly improve query performance for the absences page

-- Index for status + date range queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status_dates 
ON time_off_requests(status, request_start_date, request_end_date);

-- Index for doctor_id lookups
CREATE INDEX IF NOT EXISTS idx_time_off_requests_doctor_id 
ON time_off_requests(doctor_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_time_off_requests_date_range 
ON time_off_requests(request_start_date, request_end_date);

-- 2. Add indexes for doctors table
-- Index for active doctors query
CREATE INDEX IF NOT EXISTS idx_doctors_active 
ON doctors(is_active, name);

-- Index for name sorting
CREATE INDEX IF NOT EXISTS idx_doctors_name 
ON doctors(name);

-- 3. Optimize the time_off_requests table structure
-- Add a computed column for easier date range queries
ALTER TABLE time_off_requests 
ADD COLUMN IF NOT EXISTS date_range tsrange 
GENERATED ALWAYS AS (
  tsrange(
    request_start_date::timestamp, 
    request_end_date::timestamp, 
    '[]'
  )
) STORED;

-- Index for the computed date range column
CREATE INDEX IF NOT EXISTS idx_time_off_requests_date_range_tsrange 
ON time_off_requests USING GIST (date_range);

-- 4. Add partial indexes for better performance
-- Index for only approved requests (most common filter)
CREATE INDEX IF NOT EXISTS idx_time_off_requests_approved_only 
ON time_off_requests(doctor_id, request_start_date, request_end_date) 
WHERE status = 'approved';

-- 5. Analyze tables to update statistics
ANALYZE time_off_requests;
ANALYZE doctors;

-- 6. Create a materialized view for frequently accessed data
-- This can be refreshed periodically for even better performance
CREATE MATERIALIZED VIEW IF NOT EXISTS approved_absences_summary AS
SELECT 
  doctor_id,
  request_start_date,
  request_end_date,
  type,
  reason,
  notes
FROM time_off_requests 
WHERE status = 'approved'
ORDER BY request_start_date;

-- Drop and recreate to ensure correct structure
DROP MATERIALIZED VIEW IF EXISTS approved_absences_summary;
CREATE MATERIALIZED VIEW approved_absences_summary AS
SELECT 
  doctor_id,
  request_start_date,
  request_end_date,
  type,
  reason,
  notes
FROM time_off_requests 
WHERE status = 'approved'
ORDER BY request_start_date;

-- Index for the materialized view
CREATE INDEX IF NOT EXISTS idx_approved_absences_summary_dates 
ON approved_absences_summary(request_start_date, request_end_date);

-- 7. Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_approved_absences_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW approved_absences_summary;
END;
$$ LANGUAGE plpgsql;

-- 8. Create a trigger to automatically refresh the materialized view
-- when time_off_requests table is updated
CREATE OR REPLACE FUNCTION trigger_refresh_absences_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh the materialized view asynchronously
  PERFORM pg_notify('refresh_absences_summary', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_refresh_absences_summary ON time_off_requests;
CREATE TRIGGER trigger_refresh_absences_summary
  AFTER INSERT OR UPDATE OR DELETE ON time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_absences_summary();

-- 9. Verify the indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('time_off_requests', 'doctors')
ORDER BY tablename, indexname;

-- 10. Performance monitoring query
-- Run this to see the current performance of your queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM time_off_requests 
WHERE status = 'approved' 
  AND (request_start_date <= '2024-12-31' AND request_end_date >= '2024-12-01')
ORDER BY request_start_date; 