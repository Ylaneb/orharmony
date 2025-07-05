import { supabase } from '@/lib/supabase'
import type { Surgery, CreateSurgeryData, UpdateSurgeryData, SurgeryConflict } from '@/lib/data/surgeries'

export const surgeriesService = {
  // Get all surgeries with room and doctor information
  async getAll(): Promise<Surgery[]> {
    const { data, error } = await supabase
      .from('surgeries')
      .select(`
        *,
        operating_rooms!inner(room_number),
        main_doctor:doctors!surgeries_main_doctor_id_fkey(name, specialty),
        secondary_doctor:doctors!surgeries_secondary_doctor_id_fkey(name, specialty)
      `)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Get surgeries for a specific date range
  async getByDateRange(startDate: string, endDate: string): Promise<Surgery[]> {
    const { data, error } = await supabase
      .from('surgeries')
      .select(`
        *,
        operating_rooms!inner(room_number),
        main_doctor:doctors!surgeries_main_doctor_id_fkey(name, specialty),
        secondary_doctor:doctors!surgeries_secondary_doctor_id_fkey(name, specialty)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Get surgeries for a specific room
  async getByRoom(roomId: string): Promise<Surgery[]> {
    const { data, error } = await supabase
      .from('surgeries')
      .select(`
        *,
        operating_rooms!inner(room_number),
        main_doctor:doctors!surgeries_main_doctor_id_fkey(name, specialty),
        secondary_doctor:doctors!surgeries_secondary_doctor_id_fkey(name, specialty)
      `)
      .eq('room_id', roomId)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Get a single surgery by ID
  async getById(id: string): Promise<Surgery | null> {
    const { data, error } = await supabase
      .from('surgeries')
      .select(`
        *,
        operating_rooms!inner(room_number),
        main_doctor:doctors!surgeries_main_doctor_id_fkey(name, specialty),
        secondary_doctor:doctors!surgeries_secondary_doctor_id_fkey(name, specialty)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Check for scheduling conflicts
  async checkConflict(surgeryData: CreateSurgeryData): Promise<SurgeryConflict | null> {
    const { data, error } = await supabase
      .from('surgeries')
      .select('id')
      .eq('room_id', surgeryData.room_id)
      .eq('date', surgeryData.date)
      .eq('time_slot', surgeryData.time_slot)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }
    
    if (data) {
      return {
        room_id: surgeryData.room_id,
        date: surgeryData.date,
        time_slot: surgeryData.time_slot,
        existing_surgery_id: data.id
      }
    }
    
    return null
  },

  // Create a new surgery
  async create(surgeryData: CreateSurgeryData): Promise<Surgery> {
    // First check for conflicts
    const conflict = await this.checkConflict(surgeryData)
    if (conflict) {
      throw new Error(`This time slot is already booked for this room on ${surgeryData.date}`)
    }

    const { data, error } = await supabase
      .from('surgeries')
      .insert(surgeryData)
      .select(`
        *,
        operating_rooms!inner(room_number),
        main_doctor:doctors!surgeries_main_doctor_id_fkey(name, specialty),
        secondary_doctor:doctors!surgeries_secondary_doctor_id_fkey(name, specialty)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  // Update a surgery
  async update(id: string, surgeryData: UpdateSurgeryData): Promise<Surgery> {
    // If updating room, date, or time_slot, check for conflicts
    if (surgeryData.room_id || surgeryData.date || surgeryData.time_slot) {
      const currentSurgery = await this.getById(id)
      if (!currentSurgery) {
        throw new Error('Surgery not found')
      }

      const checkData: CreateSurgeryData = {
        room_id: surgeryData.room_id || currentSurgery.room_id,
        date: surgeryData.date || currentSurgery.date,
        time_slot: surgeryData.time_slot || currentSurgery.time_slot,
        surgery_type: currentSurgery.surgery_type, // Use existing surgery type for conflict check
        main_doctor_id: currentSurgery.main_doctor_id,
        secondary_doctor_id: currentSurgery.secondary_doctor_id
      }

      const conflict = await this.checkConflict(checkData)
      if (conflict && conflict.existing_surgery_id !== id) {
        throw new Error(`This time slot is already booked for this room on ${checkData.date}`)
      }
    }

    const { data, error } = await supabase
      .from('surgeries')
      .update(surgeryData)
      .eq('id', id)
      .select(`
        *,
        operating_rooms!inner(room_number),
        main_doctor:doctors!surgeries_main_doctor_id_fkey(name, specialty),
        secondary_doctor:doctors!surgeries_secondary_doctor_id_fkey(name, specialty)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  // Delete a surgery
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('surgeries')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get surgeries for a specific week (Monday to Sunday)
  async getByWeek(weekStart: string): Promise<Surgery[]> {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    const { data, error } = await supabase
      .from('surgeries')
      .select(`
        *,
        operating_rooms!inner(room_number),
        main_doctor:doctors!surgeries_main_doctor_id_fkey(name, specialty),
        secondary_doctor:doctors!surgeries_secondary_doctor_id_fkey(name, specialty)
      `)
      .gte('date', weekStart)
      .lte('date', weekEnd.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Get available time slots for a specific room and date
  async getAvailableSlots(roomId: string, date: string): Promise<('morning' | 'evening')[]> {
    const { data, error } = await supabase
      .from('surgeries')
      .select('time_slot')
      .eq('room_id', roomId)
      .eq('date', date)
    
    if (error) throw error
    
    const bookedSlots = data?.map(s => s.time_slot) || []
    const allSlots: ('morning' | 'evening')[] = ['morning', 'evening']
    
    return allSlots.filter(slot => !bookedSlots.includes(slot))
  }
} 