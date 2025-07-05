import { supabase } from '../supabase'
import type { OperatingRoom } from '../data/models'

export const operatingRoomsService = {
  // Get all operating rooms
  async getAll() {
    console.log('Fetching operating rooms from Supabase...')
    const { data, error } = await supabase
      .from('operating_rooms')
      .select('*')
      .order('room_number')
    
    if (error) {
      console.error('Error fetching operating rooms:', error)
      throw error
    }
    
    console.log('Operating rooms fetched successfully:', data)
    return data
  },

  // Get active operating rooms only
  async getActive() {
    const { data, error } = await supabase
      .from('operating_rooms')
      .select('*')
      .eq('is_active', true)
      .order('room_number')
    
    if (error) throw error
    return data
  },

  // Get operating room by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('operating_rooms')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create new operating room
  async create(room: Omit<OperatingRoom, 'id' | 'created_date' | 'updated_date'>) {
    const { data, error } = await supabase
      .from('operating_rooms')
      .insert(room)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update operating room
  async update(id: string, updates: Partial<Omit<OperatingRoom, 'id' | 'created_date' | 'updated_date'>>) {
    const { data, error } = await supabase
      .from('operating_rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Soft delete operating room (set is_active to false)
  async softDelete(id: string) {
    const { data, error } = await supabase
      .from('operating_rooms')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Hard delete operating room (permanently remove from database)
  async delete(id: string) {
    const { error } = await supabase
      .from('operating_rooms')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return { success: true }
  },

  // Get operating rooms by specialty
  async getBySpecialty(specialty: string) {
    const { data, error } = await supabase
      .from('operating_rooms')
      .select('*')
      .eq('specialty', specialty)
      .eq('is_active', true)
      .order('room_number')
    
    if (error) throw error
    return data
  },

  // Search operating rooms
  async search(query: string) {
    const { data, error } = await supabase
      .from('operating_rooms')
      .select('*')
      .or(`room_number.ilike.%${query}%,location.ilike.%${query}%,specialty.ilike.%${query}%`)
      .eq('is_active', true)
      .order('room_number')
    
    if (error) throw error
    return data
  }
} 