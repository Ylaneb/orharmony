-- Update is_specialist field to true for the following specialists
-- This script updates doctors based on their Hebrew names

UPDATE doctors 
SET is_specialist = true
WHERE name IN (
  'אוסטרובסקי',
  'איסרליס',
  'אשכנזי',
  'בוכמן',
  'בן ארי',
  'בן עמרם',
  'בשמוט',
  'גיאבר',
  'ג''ברין',
  'פרופ'' גוזל',
  'גורנקו',
  'גילעדי',
  'גראס',
  'העוזי',
  'הרמן',
  'זיגלמן',
  'זלדין',
  'חלימי',
  'יוסילביץ''',
  'פרופ'' יוסקוביץ',
  'כהן ק.',
  'לב א.',
  'לב ע.',
  'מירושניצ''ניקו',
  'נחתומי',
  'פדייב',
  'פופוב',
  'פלדמן',
  'פרוינדליך',
  'קורנייבסקי',
  'קיען',
  'רוננסון',
  'רייחנשטיין',
  'שטלין'
);

-- Verify the update
SELECT 
  name, 
  employee_id, 
  specialty, 
  is_specialist,
  is_active
FROM doctors 
WHERE is_specialist = true
ORDER BY name;

