-- Add is_specialist field to doctors table
-- Run this in your Supabase SQL Editor

-- Add is_specialist column to doctors table (defaults to false for existing records)
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS is_specialist BOOLEAN DEFAULT false NOT NULL;

-- Add a comment to document the field
COMMENT ON COLUMN doctors.is_specialist IS 'Indicates if the doctor is a specialist (true) or an intern (false). Specialists appear in the first part of absence reports with dark blue names, interns appear in the lower part with dark grey names.';

-- Optional: Update existing doctors - you may want to set specific doctors as specialists
-- UPDATE doctors SET is_specialist = true WHERE employee_id IN ('EMP001', 'EMP002', ...);

