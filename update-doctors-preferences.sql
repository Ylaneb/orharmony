-- Add specialty preferences to doctors table
-- Run this in your Supabase SQL Editor

-- Add specialty_preferences column to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialty_preferences JSONB DEFAULT '[]'::jsonb;

-- Update existing doctors with default preferences based on their current specialty
UPDATE doctors 
SET specialty_preferences = jsonb_build_array(
  jsonb_build_object('specialty', specialty, 'preference', 1)
)
WHERE specialty_preferences IS NULL OR specialty_preferences = '[]'::jsonb;

-- Create surgery-specialty mapping table for reference
CREATE TABLE IF NOT EXISTS surgery_specialty_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  surgery_type TEXT NOT NULL UNIQUE,
  primary_specialty TEXT NOT NULL,
  secondary_specialties TEXT[],
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common surgery-specialty mappings
INSERT INTO surgery_specialty_mapping (surgery_type, primary_specialty, secondary_specialties) VALUES
  ('Orthopedic Surgery', 'Orthopedics', ARRAY['General Surgery', 'Emergency Medicine']),
  ('Cardiac Surgery', 'Cardiology', ARRAY['General Surgery']),
  ('Neurological Surgery', 'Neurology', ARRAY['General Surgery']),
  ('General Surgery', 'General Surgery', ARRAY['Emergency Medicine']),
  ('Emergency Surgery', 'Emergency Medicine', ARRAY['General Surgery']),
  ('Trauma Surgery', 'Emergency Medicine', ARRAY['General Surgery', 'Orthopedics']),
  ('Vascular Surgery', 'Cardiology', ARRAY['General Surgery']),
  ('Pediatric Surgery', 'Pediatrics', ARRAY['General Surgery']),
  ('Dermatological Surgery', 'Dermatology', ARRAY['General Surgery']),
  ('Ophthalmological Surgery', 'Ophthalmology', ARRAY['General Surgery']),
  ('ENT Surgery', 'ENT', ARRAY['General Surgery']),
  ('Urological Surgery', 'Urology', ARRAY['General Surgery']),
  ('Gynecological Surgery', 'Gynecology', ARRAY['General Surgery']),
  ('Oncological Surgery', 'Oncology', ARRAY['General Surgery']),
  ('Plastic Surgery', 'Plastic Surgery', ARRAY['General Surgery']),
  ('Thoracic Surgery', 'Cardiology', ARRAY['General Surgery']),
  ('Abdominal Surgery', 'General Surgery', ARRAY['Emergency Medicine']),
  ('Laparoscopic Surgery', 'General Surgery', ARRAY['Emergency Medicine']),
  ('Minimally Invasive Surgery', 'General Surgery', ARRAY['Emergency Medicine']),
  ('Robotic Surgery', 'General Surgery', ARRAY['Emergency Medicine'])
ON CONFLICT (surgery_type) DO UPDATE SET
  primary_specialty = EXCLUDED.primary_specialty,
  secondary_specialties = EXCLUDED.secondary_specialties;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_doctors_specialty_preferences ON doctors USING GIN (specialty_preferences);
CREATE INDEX IF NOT EXISTS idx_surgery_specialty_mapping_surgery_type ON surgery_specialty_mapping(surgery_type);

-- Verify the changes
SELECT 
  name,
  specialty,
  specialty_preferences
FROM doctors 
LIMIT 5; 