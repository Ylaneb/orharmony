-- Update the timeoff_type enum to include the new absence types
-- Run this in your Supabase SQL Editor

-- Note: In PostgreSQL, you can only add values to an enum, not remove them
-- The old values (sick_leave, personal, conference, other) will remain in the enum
-- but won't be used by the application anymore

-- Add the new enum values
-- If a value already exists, you'll get an error which you can safely ignore
DO $$ 
BEGIN
    -- Check and add each new value only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'miluim' AND enumtypid = 'timeoff_type'::regtype) THEN
        ALTER TYPE timeoff_type ADD VALUE 'miluim';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pain' AND enumtypid = 'timeoff_type'::regtype) THEN
        ALTER TYPE timeoff_type ADD VALUE 'pain';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'after_shift' AND enumtypid = 'timeoff_type'::regtype) THEN
        ALTER TYPE timeoff_type ADD VALUE 'after_shift';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'post_friday' AND enumtypid = 'timeoff_type'::regtype) THEN
        ALTER TYPE timeoff_type ADD VALUE 'post_friday';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'part_time' AND enumtypid = 'timeoff_type'::regtype) THEN
        ALTER TYPE timeoff_type ADD VALUE 'part_time';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'external_rotations' AND enumtypid = 'timeoff_type'::regtype) THEN
        ALTER TYPE timeoff_type ADD VALUE 'external_rotations';
    END IF;
END $$;

-- Verify the enum values (should now include all new types)
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'timeoff_type'::regtype 
ORDER BY enumsortorder;

