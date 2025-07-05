-- Update surgeries table to include doctor assignments
-- Add main_doctor_id and secondary_doctor_id columns

ALTER TABLE surgeries 
ADD COLUMN main_doctor_id UUID REFERENCES doctors(id),
ADD COLUMN secondary_doctor_id UUID REFERENCES doctors(id);

-- Add constraint to prevent same doctor being assigned twice
ALTER TABLE surgeries 
ADD CONSTRAINT surgeries_different_doctors 
CHECK (main_doctor_id != secondary_doctor_id);

-- Add constraint to ensure both doctors are assigned
ALTER TABLE surgeries 
ADD CONSTRAINT surgeries_doctors_required 
CHECK (main_doctor_id IS NOT NULL AND secondary_doctor_id IS NOT NULL);

-- Update existing surgeries with placeholder doctor IDs (you'll need to update these with real doctor IDs)
-- This is just for demonstration - in production you'd want to handle this more carefully
UPDATE surgeries 
SET 
  main_doctor_id = (SELECT id FROM doctors LIMIT 1),
  secondary_doctor_id = (SELECT id FROM doctors WHERE id != (SELECT id FROM doctors LIMIT 1) LIMIT 1)
WHERE main_doctor_id IS NULL OR secondary_doctor_id IS NULL; 