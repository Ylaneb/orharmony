import { supabase } from '../supabase'
import type { Doctor } from '../data/models'

export const doctorsService = {
  // Get all doctors
  async getAll() {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },

  // Get active doctors only
  async getActive() {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data
  },

  // Get doctor by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create new doctor
  async create(doctor: Omit<Doctor, 'id' | 'created_date' | 'updated_date'>) {
    const { data, error } = await supabase
      .from('doctors')
      .insert(doctor)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update doctor
  async update(id: string, updates: Partial<Omit<Doctor, 'id' | 'created_date' | 'updated_date'>>) {
    const { data, error } = await supabase
      .from('doctors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Soft delete doctor (set is_active to false)
  async softDelete(id: string) {
    const { data, error } = await supabase
      .from('doctors')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Hard delete doctor (permanently remove from database)
  async delete(id: string) {
    const { error } = await supabase
      .from('doctors')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return { success: true }
  },

  // Get doctors by specialty
  async getBySpecialty(specialty: string) {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('specialty', specialty)
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data
  },

  // Search doctors
  async search(query: string) {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .or(`name.ilike.%${query}%,employee_id.ilike.%${query}%,specialty.ilike.%${query}%`)
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data
  }
} 