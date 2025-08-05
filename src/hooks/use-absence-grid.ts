import { useState, useEffect, useMemo, useCallback } from "react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { optimizedAbsencesService } from '@/lib/services/optimized-absences'
import { timeOffRequestsService } from "@/lib/services/time-off-requests"

export function useAbsenceGrid(month: Date) {
  const [doctors, setDoctors] = useState<any[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Memoize date range to prevent unnecessary recalculations
  const dateRange = useMemo(() => ({
    start: format(startOfMonth(month), 'yyyy-MM-dd'),
    end: format(endOfMonth(month), 'yyyy-MM-dd')
  }), [month])

  // Optimized data fetching with caching
  const fetchData = useCallback(async (isBackground = false) => {
    let isMounted = true
    
    async function doFetch() {
      if (!isMounted) return
      
      if (!isBackground) {
        setLoading(true)
        setError(null)
      }
      
      try {
        // Parallel API calls for better performance
        const [docs, offs, allPending, holidaysData] = await Promise.all([
          optimizedAbsencesService.getActiveDoctors(),
          optimizedAbsencesService.getApprovedForRange(dateRange.start, dateRange.end),
          timeOffRequestsService.getAllPending(),
          fetchHolidays(month)
        ])
        
        // Filter pending requests for the current month view
        const pending = allPending.filter(p => {
          const startDate = new Date(p.request_start_date + 'T00:00:00')
          const endDate = new Date(p.request_end_date + 'T23:59:59')
          const monthStart = new Date(dateRange.start + 'T00:00:00')
          const monthEnd = new Date(dateRange.end + 'T23:59:59')
          return startDate <= monthEnd && endDate >= monthStart
        })
        
        if (!isMounted) return
        
        setDoctors(docs)
        setAbsences(offs)
        setPendingRequests(pending)
        setHolidays(holidaysData)
        setLastUpdate(new Date())
      } catch (err: any) {
        if (isMounted && !isBackground) {
          setError(err.message || 'Failed to fetch data')
        }
      } finally {
        if (isMounted && !isBackground) {
          setLoading(false)
        }
      }
    }

    doFetch()
    
    return () => {
      isMounted = false
    }
  }, [dateRange, month])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Live updates every 30 seconds (silent background updates)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true) // Background update
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchData])

  return { 
    doctors, 
    absences, 
    pendingRequests, 
    holidays, 
    loading, 
    error, 
    fetchData,
    lastUpdate 
  }
}

// Helper for fetching holidays
async function fetchHolidays(month: Date): Promise<{ date: string; name: string }[]> {
  const year = month.getFullYear()
  const m = month.getMonth() + 1
  const url = `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&year=${year}&month=${m}&c=on&geo=none`
  
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch holidays')
    const data = await res.json()
    
    return (data.items || [])
      .filter((item: any) => item.category === 'holiday')
      .map((item: any) => ({ date: item.date, name: item.title }))
  } catch {
    return []
  }
}