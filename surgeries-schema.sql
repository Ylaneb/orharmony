-- Surgeries Table Schema for OR Harmony - Complete Reset
-- This script will drop and recreate the surgeries table with proper structure

-- Drop existing table if it exists (WARNING: This will delete all existing data)
DROP TABLE IF EXISTS surgeries CASCADE;

-- Create surgeries table with correct structure
CREATE TABLE surgeries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL CHECK (time_slot IN ('morning', 'evening')),
  surgery_type TEXT NOT NULL,
  notes TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to prevent double-booking
-- This ensures no two surgeries can be scheduled for the same room, date, and time slot
ALTER TABLE surgeries 
ADD CONSTRAINT unique_room_date_timeslot 
UNIQUE (room_id, date, time_slot);

-- Add foreign key constraint to ensure room exists in operating_rooms table
ALTER TABLE surgeries 
ADD CONSTRAINT fk_surgeries_room 
FOREIGN KEY (room_id) REFERENCES operating_rooms(id);

-- Add check constraint for valid dates (no past dates)
ALTER TABLE surgeries 
ADD CONSTRAINT check_valid_date 
CHECK (date >= CURRENT_DATE);

-- Add check constraint for valid time slots
ALTER TABLE surgeries 
ADD CONSTRAINT check_valid_timeslot 
CHECK (time_slot IN ('morning', 'evening'));

-- Create indexes for better query performance
CREATE INDEX idx_surgeries_room_date ON surgeries(room_id, date);
CREATE INDEX idx_surgeries_date ON surgeries(date);
CREATE INDEX idx_surgeries_room_id ON surgeries(room_id);

-- Enable Row Level Security (RLS)
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow all authenticated users to read surgeries
CREATE POLICY "Allow authenticated users to read surgeries" ON surgeries
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert surgeries
CREATE POLICY "Allow authenticated users to insert surgeries" ON surgeries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update surgeries
CREATE POLICY "Allow authenticated users to update surgeries" ON surgeries
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete surgeries
CREATE POLICY "Allow authenticated users to delete surgeries" ON surgeries
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create a function to update the updated_date timestamp
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_date
CREATE TRIGGER update_surgeries_updated_date 
  BEFORE UPDATE ON surgeries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_date_column();

-- Insert sample data for testing (only if operating_rooms table has data)
-- You may need to adjust the room_id values based on your actual operating_rooms data
INSERT INTO surgeries (room_id, date, time_slot, surgery_type, notes) 
SELECT 
  o.id as room_id,
  CURRENT_DATE + INTERVAL '1 day' as date,
  'morning' as time_slot,
  'Cardiac Surgery' as surgery_type,
  'Patient: John Doe, Surgeon: Dr. Smith' as notes
FROM operating_rooms o 
WHERE o.room_number = 'OR-101'
LIMIT 1
ON CONFLICT (room_id, date, time_slot) DO NOTHING;

INSERT INTO surgeries (room_id, date, time_slot, surgery_type, notes) 
SELECT 
  o.id as room_id,
  CURRENT_DATE + INTERVAL '1 day' as date,
  'evening' as time_slot,
  'Orthopedic Surgery' as surgery_type,
  'Knee replacement surgery' as notes
FROM operating_rooms o 
WHERE o.room_number = 'OR-102'
LIMIT 1
ON CONFLICT (room_id, date, time_slot) DO NOTHING;

INSERT INTO surgeries (room_id, date, time_slot, surgery_type, notes) 
SELECT 
  o.id as room_id,
  CURRENT_DATE + INTERVAL '2 days' as date,
  'morning' as time_slot,
  'General Surgery' as surgery_type,
  'Appendectomy' as notes
FROM operating_rooms o 
WHERE o.room_number = 'OR-103'
LIMIT 1
ON CONFLICT (room_id, date, time_slot) DO NOTHING;

INSERT INTO surgeries (room_id, date, time_slot, surgery_type, notes) 
SELECT 
  o.id as room_id,
  CURRENT_DATE + INTERVAL '2 days' as date,
  'evening' as time_slot,
  'Neurology' as surgery_type,
  'Brain tumor removal' as notes
FROM operating_rooms o 
WHERE o.room_number = 'OR-101'
LIMIT 1
ON CONFLICT (room_id, date, time_slot) DO NOTHING; 