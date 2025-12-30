import { supabase } from '../supabase'

export const timeOffRequestsService = {
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
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('time_off_requests')
      .delete()
      .eq('id', id)
    if (error) throw error
    return true
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
    // For a request to overlap with the range [startDate, endDate]:
    // - request_start_date <= endDate AND request_end_date >= startDate
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
    // Returns all pending requests that overlap the given range
    // For a request to overlap with the range [startDate, endDate]:
    // - request_start_date <= endDate AND request_end_date >= startDate
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
    // Returns ALL pending requests regardless of date range
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*, doctors(name)')
      .eq('status', 'pending')
      .order('request_start_date', { ascending: true })
    if (error) throw error
    return data || []
  },

  // Check for conflicts with existing requests (approved or pending)
  // Returns array of conflicting requests with details
  async checkForConflicts(doctorId: string, startDate: string, endDate: string, excludeRequestId?: string) {
    // Check for approved absences and pending requests that overlap with the new date range
    // Overlap logic: requestStart <= newEnd AND requestEnd >= newStart
    let query = supabase
      .from('time_off_requests')
      .select('id, request_start_date, request_end_date, status, type, doctor_id')
      .eq('doctor_id', doctorId)
      .in('status', ['approved', 'pending']) // Only check approved and pending, ignore rejected
      .lte('request_start_date', endDate) // requestStart <= newEnd
      .gte('request_end_date', startDate) // requestEnd >= newStart
    
    const { data, error } = await query
    
    if (error) throw error
    
    // If updating an existing request, exclude it from conflict check
    let conflicts = data || []
    if (excludeRequestId) {
      conflicts = conflicts.filter(req => req.id !== excludeRequestId)
    }
    
    // Format conflicts for user-friendly error messages
    return conflicts.map(req => ({
      id: req.id,
      startDate: req.request_start_date,
      endDate: req.request_end_date,
      status: req.status,
      type: req.type
    }))
  }
} 