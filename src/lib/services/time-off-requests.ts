import { supabase } from '../supabase'

export const timeOffRequestsService = {
  async create(requestData: {
    doctor_id: string
    request_start_date: string
    request_end_date: string
    reason: string
    type: 'vacation' | 'sick_leave' | 'personal' | 'conference' | 'other'
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('time_off_requests')
      .insert([
        {
          ...requestData,
          status: 'pending'
        }
      ])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getAll() {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select(`*, doctors(name)`) // join doctor name if possible
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
    return data
  },

  async getApprovedForDate(date: string) {
    // Returns all approved requests where the date is between start and end
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
    // Returns all approved requests that overlap the given range
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('status', 'approved')
      .or(`and(request_start_date.lte.${endDate},request_end_date.gte.${startDate})`)
    if (error) throw error
    return data || []
  }
} 