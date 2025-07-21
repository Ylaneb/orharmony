import { supabase } from '../supabase'

// Simple in-memory cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const optimizedAbsencesService = {
  // Get approved absences for a date range with caching
  async getApprovedForRange(startDate: string, endDate: string) {
    const cacheKey = `absences_${startDate}_${endDate}`
    const now = Date.now()
    
    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data
    }
    
    try {
      // Always use the time_off_requests table with status = 'approved'
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('status', 'approved')
        .lte('request_start_date', endDate)
        .gte('request_end_date', startDate)
        .order('request_start_date', { ascending: true })
      
      if (error) throw error
      
      const result = data || []
      
      // Debug: Log the types found in the query
      const typesFound = Array.from(new Set(result.map((r: any) => r.type)))
      console.log('Absences query result:', {
        total: result.length,
        typesFound,
        dateRange: { startDate, endDate }
      })
      
      // Cache the result
      cache.set(cacheKey, { data: result, timestamp: now })
      
      return result
    } catch (error) {
      // If there's an error, return an empty array
      console.error('Error fetching approved absences:', error)
      return []
    }
  },

  // Get active doctors with caching
  async getActiveDoctors() {
    const cacheKey = 'active_doctors'
    const now = Date.now()
    
    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data
    }
    
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    
    const result = data || []
    
    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: now })
    
    return result
  },

  // Clear cache (useful for testing or when data changes)
  clearCache() {
    cache.clear()
  },

  // Get cache statistics
  getCacheStats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    }
  }
} 