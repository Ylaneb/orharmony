// Surgery Types for OR Harmony
export interface Surgery {
  id: string
  room_id: string
  date: string
  time_slot: 'morning' | 'evening'
  surgery_type: string
  notes?: string
  created_date: string
  updated_date: string
  operating_rooms?: {
    room_number: string
  }
}

export interface CreateSurgeryData {
  room_id: string
  date: string
  time_slot: 'morning' | 'evening'
  surgery_type: string
  notes?: string
}

export interface UpdateSurgeryData {
  room_id?: string
  date?: string
  time_slot?: 'morning' | 'evening'
  surgery_type?: string
  notes?: string
}

export interface SurgeryConflict {
  room_id: string
  date: string
  time_slot: 'morning' | 'evening'
  existing_surgery_id: string
}

// Surgery types for dropdown
export const SURGERY_TYPES = [
  'Cardiac Surgery',
  'Orthopedic Surgery',
  'General Surgery',
  'Neurology',
  'Pediatric Surgery',
  'Emergency Surgery',
  'Robotic Surgery',
  'Laparoscopic Surgery',
  'Endoscopic Surgery',
  'Other'
] as const

export type SurgeryType = typeof SURGERY_TYPES[number]

// Time slot options
export const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (8AM-12PM)' },
  { value: 'evening', label: 'Evening (2PM-6PM)' }
] as const 