import { supabase } from '../supabase'
import { realtimeManager } from './realtime-server'

export const timeOffRequestsRealtimeService = {
  async create(requestData: {
    doctor_id: string
    request_start_date: string
    request_end_date: string
    reason: string
    type: 'vacation' | 'sick_leave' | 'personal' | 'conference' | 'other'
    notes?: string
    status?: 'pending' | 'approved' | 'rejected'
  }) {
    const { data, error } = await supabase
      .from('time_off_requests')
      .insert([
        {
          ...requestData,
          status: requestData.status || 'pending'
        }
      ])
      .select()
      .single()
    
    if (error) throw error
    
    // Trigger real-time update
    realtimeManager.triggerUpdate('absence_created', data)
    
    return data
  },

  async getAll() {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select(`*, doctors(name)`)
      .order('request_start_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
    const { data, error } = await supabase
      .from('time_off_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    // Trigger real-time update
    realtimeManager.triggerUpdate('status_changed', data)
    
    return data
  },

  async update(id: string, updateData: Partial<{
    request_start_date: string
    request_end_date: string
    reason: string
    type: 'vacation' | 'sick_leave' | 'personal' | 'conference' | 'other'
    notes: string
    status: 'pending' | 'approved' | 'rejected'
  }>) {
    const { data, error } = await supabase
      .from('time_off_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    // Trigger real-time update
    realtimeManager.triggerUpdate('absence_updated', data)
    
    return data
  },

  async delete(id: string) {
    // Get the record before deleting for real-time notification
    const { data: recordToDelete } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('id', id)
      .single()
    
    const { error } = await supabase
      .from('time_off_requests')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    // Trigger real-time update with the deleted record
    if (recordToDelete) {
      realtimeManager.triggerUpdate('absence_deleted', recordToDelete)
    }
    
    return true
  },

  async getApprovedForDate(date: string) {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('status', 'approved')
      .lte('request_start_date', date)
      .gte('request_end_date', date)
    if (error) throw error
    return data || []
  },

  async getApprovedForRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('status', 'approved')
      .lte('request_start_date', endDate)
      .gte('request_end_date', startDate)
      .order('request_start_date', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getPendingForRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*, doctors(name)')
      .eq('status', 'pending')
      .lte('request_start_date', endDate)
      .gte('request_end_date', startDate)
      .order('request_start_date', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getAllPending() {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*, doctors(name)')
      .eq('status', 'pending')
      .order('request_start_date', { ascending: true })
    if (error) throw error
    return data || []
  }
}
