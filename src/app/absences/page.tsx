"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isToday, isSaturday } from "date-fns"
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { optimizedAbsencesService } from '@/lib/services/optimized-absences'

const ABSENCE_COLORS: Record<string, string> = {
  vacation: "bg-yellow-200 text-yellow-800",
  sick_leave: "bg-red-200 text-red-800",
  personal: "bg-blue-200 text-blue-800",
  conference: "bg-green-200 text-green-800",
  other: "bg-gray-200 text-gray-800",
}

const HOLIDAY_COLOR = "bg-purple-200 text-purple-900 border-purple-400"

// Custom hook for data fetching with caching
function useAbsenceData(month: Date) {
  const [doctors, setDoctors] = useState<any[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([])

  // Memoize date range to prevent unnecessary recalculations
  const dateRange = useMemo(() => ({
    start: format(startOfMonth(month), 'yyyy-MM-dd'),
    end: format(endOfMonth(month), 'yyyy-MM-dd')
  }), [month])

  // Fetch data with caching
  useEffect(() => {
    let isMounted = true
    
    async function fetchData() {
      if (!isMounted) return
      
      setLoading(true)
      setError(null)
      
      try {
        // Parallel API calls for better performance
        const [docs, offs, holidaysData] = await Promise.all([
          optimizedAbsencesService.getActiveDoctors(),
          optimizedAbsencesService.getApprovedForRange(dateRange.start, dateRange.end),
          fetchHolidays(month)
        ])
        
        if (!isMounted) return
        
        setDoctors(docs)
        setAbsences(offs)
        setHolidays(holidaysData)
      } catch (err: any) {
        if (isMounted) {
        setError(err.message || 'Failed to fetch data')
        }
      } finally {
        if (isMounted) {
        setLoading(false)
        }
      }
    }

    fetchData()
    
    return () => {
      isMounted = false
    }
  }, [month, dateRange])

  return { doctors, absences, holidays, loading, error }
}

// Optimized holiday fetching with caching
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

// Memoized cell component for better performance
const AbsenceCell = React.memo(({ 
  doctorId, 
  day, 
  absence, 
  holiday, 
  isHovered, 
  onMouseEnter, 
  onMouseLeave 
}: {
  doctorId: string
  day: Date
  absence: any
  holiday: any
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) => {
  const cellClasses = useMemo(() => {
    const baseClasses = "p-1 border-b text-center flex items-center justify-center text-xs md:text-sm relative"
    const absenceClass = absence ? ABSENCE_COLORS[absence.type] : ""
    const holidayClass = holiday ? HOLIDAY_COLOR : ""
    const saturdayClass = isSaturday(day) && !holiday ? "bg-gray-100" : ""
    const todayClass = isToday(day) && !holiday ? "bg-blue-100 border-blue-300" : ""
    const hoverClass = isHovered ? "after:absolute after:inset-0 after:border-2 after:border-blue-200 after:pointer-events-none" : ""
    
    return `${baseClasses} ${absenceClass} ${holidayClass} ${saturdayClass} ${todayClass} ${hoverClass}`.trim()
  }, [absence, holiday, day, isHovered])

  return (
    <div
      className={cellClasses}
      style={{ minWidth: 0 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={holiday ? holiday.name : undefined}
    >
      {absence ? <span className="sr-only">{absence.type.replace("_", " ")}</span> : ""}
    </div>
  )
})

AbsenceCell.displayName = 'AbsenceCell'

export default function AbsenceReportPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [hoveredCell, setHoveredCell] = useState<{ doctorId: string; day: Date } | null>(null)
  
  // Memoize days array to prevent recalculation
  const days = useMemo(() => 
    eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), 
    [month]
  )

  const { doctors, absences, holidays, loading, error } = useAbsenceData(month)

  // Memoize absence lookup function
  const getAbsenceForDay = useCallback((doctorId: string, day: Date) => {
    const result = absences.find(
      (a) => {
        // Normalize dates to avoid timezone issues
        const startDate = new Date(a.request_start_date + 'T00:00:00')
        const endDate = new Date(a.request_end_date + 'T23:59:59')
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0)
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)
        
        const doctorMatches = a.doctor_id === doctorId
        const dateMatches = startDate <= dayEnd && endDate >= dayStart
        
        return doctorMatches && dateMatches
      }
    )
    return result
  }, [absences])

  // Memoize holiday lookup function
  const getHolidayForDay = useCallback((day: Date) => {
    const d = format(day, 'yyyy-MM-dd')
    return holidays.find(h => h.date === d)
  }, [holidays])

  // Memoize grid template columns
  const gridTemplateColumns = useMemo(() => 
    `minmax(120px,1.5fr) repeat(${days.length}, 1fr)`, 
    [days.length]
  )

  // Memoize header cells
  const headerCells = useMemo(() => 
    days.map((day) => {
      const holiday = getHolidayForDay(day)
      return (
        <div
          key={day.toISOString()}
          className={`p-2 border-b font-bold text-center text-xs md:text-sm sticky top-0 z-30 shadow relative ${
            isSaturday(day) && !holiday ? "bg-gray-100" : ""
          } ${
            isToday(day) && !holiday ? "bg-blue-100 border-blue-300" : ""
          } ${
            holiday ? HOLIDAY_COLOR : ""
          } ${
            hoveredCell && hoveredCell.day.getTime() === day.getTime() ? "after:absolute after:inset-0 after:border-2 after:border-blue-200 after:pointer-events-none" : ""
          }`}
          style={{ minWidth: 0 }}
          title={holiday ? holiday.name : undefined}
        >
          {format(day, "d")}
        </div>
      )
    }), 
    [days, getHolidayForDay, hoveredCell]
  )

  // Memoize doctor rows
  const doctorRows = useMemo(() => 
    doctors.map((doc) => [
      <div 
        key={doc.id + "-name"} 
        className={`p-2 border-b bg-gray-50 font-medium sticky left-0 z-20 flex items-center text-xs md:text-sm shadow relative ${
          hoveredCell && hoveredCell.doctorId === doc.id ? "after:absolute after:inset-0 after:border-2 after:border-blue-200 after:pointer-events-none" : ""
        }`}
        style={{ minWidth: 0, wordBreak: "break-word" }}
      >
        {doc.name}
      </div>,
      ...days.map((day) => {
        const absence = getAbsenceForDay(doc.id, day)
        const holiday = getHolidayForDay(day)
                 const isHovered = !!(hoveredCell && 
           (hoveredCell.doctorId === doc.id || hoveredCell.day.getTime() === day.getTime()))
        
        return (
          <AbsenceCell
            key={doc.id + "-" + day.toISOString()}
            doctorId={doc.id}
            day={day}
            absence={absence}
            holiday={holiday}
            isHovered={isHovered}
            onMouseEnter={() => setHoveredCell({ doctorId: doc.id, day })}
            onMouseLeave={() => setHoveredCell(null)}
          />
        )
      })
    ]), 
    [doctors, days, getAbsenceForDay, getHolidayForDay, hoveredCell]
  )

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {/* Header */}
            <div className="px-4 lg:px-6">
              <div className="flex items-center justify-between mb-6 w-full flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl font-bold">
                    Absence Report - {format(month, 'MMMM yyyy')}
                  </h1>
                  <p className="text-muted-foreground">Overview of all approved absences by doctor</p>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <div className="flex flex-wrap gap-2 order-2 md:order-1">
                    {Object.entries(ABSENCE_COLORS).map(([type, color]) => (
                      <span key={type} className={`inline-block px-2 py-1 rounded text-xs font-semibold ${color}`}>{type.replace('_', ' ')}</span>
                    ))}
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${HOLIDAY_COLOR}`}>Jewish Holiday</span>
                  </div>
                  <div className="flex gap-2 order-1 md:order-2">
                    <Button variant="outline" size="sm" onClick={() => setMonth(subMonths(month, 1))} className="group">
                      <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:-translate-x-0.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setMonth(addMonths(month, 1))} className="group">
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:translate-x-0.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="group">
                      <RotateCcw className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-180" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {/* Loading/Error States */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-lg text-gray-500">Loading...</div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center text-lg text-red-500">{error}</div>
            ) : (
              <div className="flex-1 px-4 lg:px-6 pb-8 w-full">
                {/* Date Number Row */}
                <div
                  className="grid"
                  style={{
                      gridTemplateColumns: gridTemplateColumns,
                    width: "100%",
                    minWidth: 0,
                  }}
                >
                  <div className="bg-white"></div>
                    {headerCells}
                </div>
                {/* Main Grid */}
                <div
                  className="grid w-full"
                  style={{
                      gridTemplateColumns: gridTemplateColumns,
                    width: "100%",
                    minWidth: 0,
                    overflowX: "hidden",
                  }}
                >
                  {/* Doctor Name Column and Absence Cells */}
                    {doctorRows}
                        </div>
                </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 