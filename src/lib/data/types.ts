// Core entity types for OR Harmony system

export interface Doctor {
  id: string
  name: string
  email: string
  phone: string
  specialty: string
  licenseNumber: string
  status: 'active' | 'inactive' | 'on_leave'
  hireDate: string
  avatar?: string
}

export interface OperatingRoom {
  id: string
  name: string
  number: string
  type: 'general' | 'cardiac' | 'neurology' | 'orthopedic' | 'emergency'
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning'
  equipment: string[]
  capacity: number
  floor: string
  wing: string
}

export interface Surgery {
  id: string
  patientName: string
  patientId: string
  surgeryType: string
  scheduledDate: string
  estimatedDuration: number // in minutes
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  operatingRoomId: string
  surgeonId: string
  anesthesiologistId?: string
  nurses: string[] // nurse IDs
  priority: 'low' | 'medium' | 'high' | 'emergency'
  notes?: string
}

export interface Assignment {
  id: string
  doctorId: string
  operatingRoomId: string
  surgeryId?: string
  date: string
  shift: 'morning' | 'afternoon' | 'night'
  role: 'surgeon' | 'assistant' | 'anesthesiologist' | 'nurse'
  status: 'confirmed' | 'pending' | 'cancelled'
  startTime: string
  endTime: string
}

export interface TimeOffRequest {
  id: string
  doctorId: string
  requestDate: string
  startDate: string
  endDate: string
  reason: string
  type: 'vacation' | 'sick_leave' | 'personal' | 'conference' | 'other'
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedDate?: string
  notes?: string
}

export interface AbsenceReport {
  id: string
  doctorId: string
  date: string
  type: 'absent' | 'late' | 'early_departure'
  reason?: string
  reportedBy: string
  reportedAt: string
  verified: boolean
  notes?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'doctor' | 'nurse' | 'manager'
  avatar?: string
  lastLogin?: string
}

// Dashboard statistics
export interface DashboardStats {
  totalDoctors: number
  activeDoctors: number
  totalOperatingRooms: number
  availableOperatingRooms: number
  scheduledSurgeries: number
  surgeriesInProgress: number
  pendingAssignments: number
  pendingTimeOffRequests: number
}

// Search and filter types
export interface SearchFilters {
  dateRange?: {
    start: string
    end: string
  }
  status?: string
  specialty?: string
  operatingRoomType?: string
  priority?: string
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
  totalPages: number
} 