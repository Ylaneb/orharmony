import { supabase } from '../supabase'

export const assignmentsService = {
  async create(assignmentData: {
    doctor_id: string
    operating_room_id: string
    date: string
    shift_type: 'morning' | 'evening'
    role: 'Primary' | 'Secondary'
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('assignments')
      .insert([assignmentData])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getByWeek(weekStart: string) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .gte('date', weekStart)
      .lte('date', weekEnd.toISOString().split('T')[0])
    if (error) throw error
    return data || []
  },

  async update(id: string, assignmentData: {
    doctor_id: string
    operating_room_id: string
    date: string
    shift_type: 'morning' | 'evening'
    role: 'Primary' | 'Secondary'
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('assignments')
      .update(assignmentData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
} 