import { supabase } from '../supabase'
import { doctorsService } from './doctors'
import { timeOffRequestsService } from './time-off-requests'
import { assignmentsService } from './assignments'
import type { Doctor, DoctorPreference } from '../data/models'

export interface AssignmentRecommendation {
  doctorId: string
  doctorName: string
  specialty: string
  preference: number
  matchType: 'exact' | 'preferred' | 'available'
  score: number
  reasons: string[]
}

export interface SurgerySpecialtyMapping {
  surgeryType: string
  primarySpecialty: string
  secondarySpecialties: string[]
}

// Surgery to specialty mapping
const SURGERY_SPECIALTY_MAP: { [key: string]: SurgerySpecialtyMapping } = {
  'Orthopedic Surgery': {
    surgeryType: 'Orthopedic Surgery',
    primarySpecialty: 'Orthopedics',
    secondarySpecialties: ['General Surgery', 'Emergency Medicine']
  },
  'Cardiac Surgery': {
    surgeryType: 'Cardiac Surgery',
    primarySpecialty: 'Cardiology',
    secondarySpecialties: ['General Surgery']
  },
  'Neurological Surgery': {
    surgeryType: 'Neurological Surgery',
    primarySpecialty: 'Neurology',
    secondarySpecialties: ['General Surgery']
  },
  'General Surgery': {
    surgeryType: 'General Surgery',
    primarySpecialty: 'General Surgery',
    secondarySpecialties: ['Emergency Medicine']
  },
  'Emergency Surgery': {
    surgeryType: 'Emergency Surgery',
    primarySpecialty: 'Emergency Medicine',
    secondarySpecialties: ['General Surgery']
  },
  'Trauma Surgery': {
    surgeryType: 'Trauma Surgery',
    primarySpecialty: 'Emergency Medicine',
    secondarySpecialties: ['General Surgery', 'Orthopedics']
  },
  'Vascular Surgery': {
    surgeryType: 'Vascular Surgery',
    primarySpecialty: 'Cardiology',
    secondarySpecialties: ['General Surgery']
  },
  'Pediatric Surgery': {
    surgeryType: 'Pediatric Surgery',
    primarySpecialty: 'Pediatrics',
    secondarySpecialties: ['General Surgery']
  },
  'Dermatological Surgery': {
    surgeryType: 'Dermatological Surgery',
    primarySpecialty: 'Dermatology',
    secondarySpecialties: ['General Surgery']
  },
  'Ophthalmological Surgery': {
    surgeryType: 'Ophthalmological Surgery',
    primarySpecialty: 'Ophthalmology',
    secondarySpecialties: ['General Surgery']
  },
  'ENT Surgery': {
    surgeryType: 'ENT Surgery',
    primarySpecialty: 'ENT',
    secondarySpecialties: ['General Surgery']
  },
  'Urological Surgery': {
    surgeryType: 'Urological Surgery',
    primarySpecialty: 'Urology',
    secondarySpecialties: ['General Surgery']
  },
  'Gynecological Surgery': {
    surgeryType: 'Gynecological Surgery',
    primarySpecialty: 'Gynecology',
    secondarySpecialties: ['General Surgery']
  },
  'Oncological Surgery': {
    surgeryType: 'Oncological Surgery',
    primarySpecialty: 'Oncology',
    secondarySpecialties: ['General Surgery']
  },
  'Plastic Surgery': {
    surgeryType: 'Plastic Surgery',
    primarySpecialty: 'Plastic Surgery',
    secondarySpecialties: ['General Surgery']
  },
  'Thoracic Surgery': {
    surgeryType: 'Thoracic Surgery',
    primarySpecialty: 'Cardiology',
    secondarySpecialties: ['General Surgery']
  },
  'Abdominal Surgery': {
    surgeryType: 'Abdominal Surgery',
    primarySpecialty: 'General Surgery',
    secondarySpecialties: ['Emergency Medicine']
  },
  'Laparoscopic Surgery': {
    surgeryType: 'Laparoscopic Surgery',
    primarySpecialty: 'General Surgery',
    secondarySpecialties: ['Emergency Medicine']
  },
  'Minimally Invasive Surgery': {
    surgeryType: 'Minimally Invasive Surgery',
    primarySpecialty: 'General Surgery',
    secondarySpecialties: ['Emergency Medicine']
  },
  'Robotic Surgery': {
    surgeryType: 'Robotic Surgery',
    primarySpecialty: 'General Surgery',
    secondarySpecialties: ['Emergency Medicine']
  }
}

export const smartAssignmentsService = {
  // Get specialty mapping for a surgery type
  getSpecialtyMapping(surgeryType: string): SurgerySpecialtyMapping {
    return SURGERY_SPECIALTY_MAP[surgeryType] || {
      surgeryType,
      primarySpecialty: 'General Surgery',
      secondarySpecialties: ['Emergency Medicine']
    }
  },

  // Calculate assignment score for a doctor - optimized for preference ranking
  calculateAssignmentScore(doctor: Doctor, surgeryType: string): AssignmentRecommendation {
    const specialtyMapping = this.getSpecialtyMapping(surgeryType)
    const preferences = doctor.specialty_preferences || []
    
    // Find doctor's preference for the primary specialty
    const primaryPreference = preferences.find(p => p.specialty === specialtyMapping.primarySpecialty)
    const preference = primaryPreference?.preference || 10 // Default to lowest preference
    
    let matchType: 'exact' | 'preferred' | 'available' = 'available'
    let score = 0
    const reasons: string[] = []
    
    // Primary scoring based on preference rank (1-10 scale)
    // Lower preference number = higher priority
    const preferenceScore = 100 - (preference - 1) * 10 // 100 for preference 1, 90 for preference 2, etc.
    
    // Secondary scoring based on specialty match (bonus points)
    let specialtyBonus = 0
    let specialtyMatch = ''
    
    if (doctor.specialty === specialtyMapping.primarySpecialty) {
      specialtyBonus = 20
      specialtyMatch = 'Primary specialty match'
      matchType = 'exact'
    } else if (specialtyMapping.secondarySpecialties.includes(doctor.specialty)) {
      specialtyBonus = 10
      specialtyMatch = 'Secondary specialty match'
      matchType = 'preferred'
    } else {
      specialtyBonus = 0
      specialtyMatch = 'No specialty match'
      matchType = 'available'
    }
    
    // Final score prioritizes preference rank with specialty bonus
    score = preferenceScore + specialtyBonus
    
    // Build reasons array
    reasons.push(`Preference rank: ${preference}/10`)
    reasons.push(specialtyMatch)
    
    // Add additional context for high-preference doctors
    if (preference <= 3) {
      reasons.push('High priority preference')
    } else if (preference <= 5) {
      reasons.push('Medium priority preference')
    } else {
      reasons.push('Low priority preference')
    }
    
    return {
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      preference,
      matchType,
      score,
      reasons
    }
  },

  // Get available doctors for a specific date and shift
  async getAvailableDoctors(date: string, shift: 'morning' | 'evening'): Promise<Doctor[]> {
    // Get all active doctors
    const allDoctors = await doctorsService.getActive()
    
    // Get doctors on time off
    const timeOffs = await timeOffRequestsService.getApprovedForDate(date)
    const unavailableDoctorIds = new Set(timeOffs.map((t: any) => t.doctor_id))
    
    // Get already assigned doctors for this date and shift
    const assignments = await assignmentsService.getByWeek(date)
    const assignedDoctorIds = new Set(
      assignments
        .filter((a: any) => a.date === date && a.shift_type === shift)
        .map((a: any) => a.doctor_id)
    )
    
    // Filter out unavailable and already assigned doctors
    return allDoctors.filter((doctor: Doctor) =>
      !unavailableDoctorIds.has(doctor.id) && !assignedDoctorIds.has(doctor.id)
    )
  },

  // Get recommendations for a surgery
  async getRecommendations(surgeryType: string, date: string, shift: 'morning' | 'evening'): Promise<AssignmentRecommendation[]> {
    const availableDoctors = await this.getAvailableDoctors(date, shift)
    
    // Calculate scores for each doctor
    const recommendations = availableDoctors.map(doctor => 
      this.calculateAssignmentScore(doctor, surgeryType)
    )
    
    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score)
    
    return recommendations
  },

  // Auto-assign the best doctor for a surgery
  async autoAssignDoctor(surgeryType: string, roomId: string, date: string, shift: 'morning' | 'evening') {
    const recommendations = await this.getRecommendations(surgeryType, date, shift)
    
    if (recommendations.length === 0) {
      return {
        success: false,
        error: 'No available doctors for this surgery'
      }
    }
    
    const bestMatch = recommendations[0]
    
    try {
      const assignment = await assignmentsService.create({
        doctor_id: bestMatch.doctorId,
        operating_room_id: roomId,
        date,
        shift_type: shift,
        role: 'Primary',
        notes: `Auto-assigned: ${bestMatch.matchType} match (${bestMatch.specialty}) - Score: ${bestMatch.score}`
      })
      
      return {
        success: true,
        assignment,
        recommendation: bestMatch,
        alternatives: recommendations.slice(1, 5) // Show top 5 alternatives
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  // Get all surgery types for dropdown
  getSurgeryTypes(): string[] {
    return Object.keys(SURGERY_SPECIALTY_MAP)
  },

  // Get all specialties for preference selection
  getSpecialties(): string[] {
    const specialties = new Set<string>()
    Object.values(SURGERY_SPECIALTY_MAP).forEach(mapping => {
      specialties.add(mapping.primarySpecialty)
      mapping.secondarySpecialties.forEach(specialty => specialties.add(specialty))
    })
    return Array.from(specialties).sort()
  }
} 