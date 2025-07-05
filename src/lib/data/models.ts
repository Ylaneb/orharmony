// OR Harmony Database Models for Supabase
// Enhanced version based on existing Firebase models

export interface Doctor {
  id: string
  name: string
  employee_id: string
  specialty: string
  contact_email: string
  contact_telephone: string
  is_active: boolean
  permissions: {
    manage_timeoff: boolean
    manage_shifts: boolean
    manage_assignments: boolean
    view_reports: boolean
    manage_doctors: boolean
  }
  avatar_url?: string
  created_date: string
  updated_date: string
  created_by?: string
}

export interface OperatingRoom {
  id: string
  room_number: string
  location?: string
  specialty?: string
  notes?: string
  is_active: boolean
  created_date: string
  updated_date: string
  created_by?: string
}

export interface Surgery {
  id: string
  patient_name: string
  patient_id: string
  doctor_id: string
  operating_room_id: string
  date: string
  shift_type: 'morning' | 'afternoon' | 'night'
  start_time: string
  end_time: string
  estimated_duration: number // in minutes
  surgery_type: string
  priority: 'low' | 'medium' | 'high' | 'emergency'
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  notes: string
  anesthesiologist_id?: string
  nurse_ids: string[]
  created_date: string
  updated_date: string
  created_by: string
}

export interface Assignment {
  id: string
  doctor_id: string
  operating_room_id: string
  surgery_id?: string
  date: string
  shift_type: 'morning' | 'afternoon' | 'night'
  role: 'surgeon' | 'assistant' | 'anesthesiologist' | 'nurse'
  start_time: string
  end_time: string
  status: 'confirmed' | 'pending' | 'cancelled'
  created_date: string
  updated_date: string
  created_by: string
}

export interface TimeOffRequest {
  id: string
  doctor_id: string
  request_start_date: string
  request_end_date: string
  reason: string
  type: 'vacation' | 'sick_leave' | 'personal' | 'conference' | 'other'
  notes: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  processed_by?: string
  processed_at?: string
  created_date: string
  updated_date: string
  created_by: string
}

export interface ApprovedTimeOff {
  id: string
  doctor_id: string
  start_date: string
  end_date: string
  reason: string
  original_request_id: string
  created_date: string
  updated_date: string
  created_by: string
}

export interface AbsenceReport {
  id: string
  doctor_id: string
  date: string
  type: 'absent' | 'late' | 'early_departure'
  reason?: string
  reported_by: string
  reported_at: string
  verified: boolean
  notes?: string
  created_date: string
  updated_date: string
}

export interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'doctor' | 'nurse' | 'manager'
  avatar_url?: string
  last_login?: string
  created_date: string
  updated_date: string
}

// Dashboard statistics
export interface DashboardStats {
  total_doctors: number
  active_doctors: number
  total_operating_rooms: number
  available_operating_rooms: number
  scheduled_surgeries: number
  surgeries_in_progress: number
  pending_assignments: number
  pending_time_off_requests: number
}

// Search and filter types
export interface SearchFilters {
  date_range?: {
    start: string
    end: string
  }
  status?: string
  specialty?: string
  operating_room_type?: string
  priority?: string
  doctor_id?: string
}

// API response types
export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// Supabase specific types
export interface Database {
  public: {
    Tables: {
      doctors: {
        Row: Doctor
        Insert: Omit<Doctor, 'id' | 'created_date' | 'updated_date'>
        Update: Partial<Omit<Doctor, 'id' | 'created_date' | 'updated_date'>>
      }
      operating_rooms: {
        Row: OperatingRoom
        Insert: Omit<OperatingRoom, 'id' | 'created_date' | 'updated_date'>
        Update: Partial<Omit<OperatingRoom, 'id' | 'created_date' | 'updated_date'>>
      }
      surgeries: {
        Row: Surgery
        Insert: Omit<Surgery, 'id' | 'created_date' | 'updated_date'>
        Update: Partial<Omit<Surgery, 'id' | 'created_date' | 'updated_date'>>
      }
      assignments: {
        Row: Assignment
        Insert: Omit<Assignment, 'id' | 'created_date' | 'updated_date'>
        Update: Partial<Omit<Assignment, 'id' | 'created_date' | 'updated_date'>>
      }
      time_off_requests: {
        Row: TimeOffRequest
        Insert: Omit<TimeOffRequest, 'id' | 'created_date' | 'updated_date'>
        Update: Partial<Omit<TimeOffRequest, 'id' | 'created_date' | 'updated_date'>>
      }
      approved_time_off: {
        Row: ApprovedTimeOff
        Insert: Omit<ApprovedTimeOff, 'id' | 'created_date' | 'updated_date'>
        Update: Partial<Omit<ApprovedTimeOff, 'id' | 'created_date' | 'updated_date'>>
      }
      absence_reports: {
        Row: AbsenceReport
        Insert: Omit<AbsenceReport, 'id' | 'created_date' | 'updated_date'>
        Update: Partial<Omit<AbsenceReport, 'id' | 'created_date' | 'updated_date'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_date' | 'updated_date'>
        Update: Partial<Omit<User, 'id' | 'created_date' | 'updated_date'>>
      }
    }
  }
} 