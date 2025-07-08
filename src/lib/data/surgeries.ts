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
  doctors?: {
    name: string
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
  doctor_id?: string
  notes?: string
}

export interface SurgeryConflict {
  room_id: string
  date: string
  slot_type: 'surgery_type' | 'doctor_assignment'
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

// Slot type options
export const SLOT_TYPES = [
  { value: 'surgery_type', label: 'Surgery Type' },
  { value: 'doctor_assignment', label: 'Doctor Assignment' }
] as const 