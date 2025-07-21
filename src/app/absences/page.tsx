"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isToday, isSaturday, isAfter, isBefore, isEqual } from "date-fns"
import { ChevronLeft, ChevronRight, RotateCcw, Maximize2, Minimize2 } from "lucide-react"
import { optimizedAbsencesService } from '@/lib/services/optimized-absences'
import { timeOffRequestsService } from "@/lib/services/time-off-requests"
import { PendingRequestsWidget } from "@/components/pending-requests-widget"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Define types for better type safety
type AbsenceType = "vacation" | "sick_leave" | "personal" | "conference" | "other"

const ABSENCE_COLORS: Record<AbsenceType, string> = {
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
  const fetchData = useCallback(async () => {
    let isMounted = true
    
    async function doFetch() {
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

    doFetch()
    
    return () => {
      isMounted = false
    }
  }, [dateRange, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { doctors, absences, holidays, loading, error, fetchData }
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

export default function AbsenceReportPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [hoveredCell, setHoveredCell] = useState<{ doctorId: string; day: Date } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [rangeSelection, setRangeSelection] = useState<{
    doctorId: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }>({
    doctorId: null,
    startDate: null,
    endDate: null
  })
  const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [popoverTargetCell, setPopoverTargetCell] = useState<{doctorId: string, date: Date} | null>(null)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const [pendingAbsence, setPendingAbsence] = useState<any | null>(null)

  const { doctors, absences, holidays, loading, error, fetchData } = useAbsenceData(month)

  // Optimistic UI: add pendingAbsence to absences
  const allAbsences = useMemo(() => {
    if (pendingAbsence) return [...absences, pendingAbsence]
    return absences
  }, [absences, pendingAbsence])

  // Function to handle cell click for range selection
  const handleCellClick = useCallback((doctorId: string, date: Date) => {
    const { doctorId: currentDoctor, startDate, endDate } = rangeSelection

    // If clicking a different doctor's row, always reset and start a new selection.
    if (currentDoctor && doctorId !== currentDoctor) {
      setRangeSelection({ doctorId, startDate: date, endDate: null })
      setPopoverTargetCell(null)
      return
    }

    // If a full range is already selected...
    if (startDate && endDate) {
      // ...and the user clicks the end date again, open the popover by setting the target.
      if (isEqual(date, endDate) || isEqual(date, startDate)) {
        setPopoverTargetCell({ doctorId, date });
        return
      }
      // ...otherwise, clicking any other date starts a new selection.
      else {
        setRangeSelection({ doctorId, startDate: date, endDate: null })
        setPopoverTargetCell(null)
        return
      }
    }

    // If only a start date is set, this click sets the end date.
    if (startDate && !endDate) {
      // Handle if the end date is before the start date by swapping them.
      if (isBefore(date, startDate)) {
        setRangeSelection({ doctorId, startDate: date, endDate: startDate })
      } else {
        setRangeSelection(prev => ({ ...prev, endDate: date }))
      }
      setPopoverTargetCell(null)
      return
    }
    
    // If no selection exists, this click starts one.
    if (!startDate) {
      setRangeSelection({ doctorId, startDate: date, endDate: null })
      setPopoverTargetCell(null)
      return
    }
  }, [rangeSelection])

  // Function to check if a cell is within the selected range
  const isInSelectedRange = useCallback((doctorId: string, date: Date) => {
    if (!rangeSelection.startDate || !rangeSelection.doctorId || rangeSelection.doctorId !== doctorId) {
      return false
    }

    if (!rangeSelection.endDate) {
      return isEqual(date, rangeSelection.startDate)
    }

    const start = rangeSelection.startDate < rangeSelection.endDate ? rangeSelection.startDate : rangeSelection.endDate
    const end = rangeSelection.startDate < rangeSelection.endDate ? rangeSelection.endDate : rangeSelection.startDate

    return (isEqual(date, start) || isEqual(date, end) || (isAfter(date, start) && isBefore(date, end)))
  }, [rangeSelection])

  // Function to handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  // Define AbsenceCell as a named function component
  function AbsenceCellComponent({
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
  }) {
    const isSelected = isInSelectedRange(doctorId, day)
    const isPopoverTarget = popoverTargetCell?.doctorId === doctorId && popoverTargetCell?.date && isEqual(day, popoverTargetCell.date)

    const cellClasses = useMemo(() => {
      const baseClasses = "py-0.5 px-1 border-b text-center flex items-center justify-center text-xs relative"
      const absenceClass = absence ? ABSENCE_COLORS[absence.type as AbsenceType] : ""
      const holidayClass = holiday ? HOLIDAY_COLOR : ""
      const saturdayClass = isSaturday(day) && !holiday ? "bg-gray-100" : ""
      const selectedClass = isSelected ? "bg-blue-100 border-blue-300" : ""
      const hoverClass = isHovered ? "after:absolute after:inset-0 after:border-2 after:border-blue-200 after:pointer-events-none" : ""
      return `${baseClasses} ${absenceClass} ${holidayClass} ${saturdayClass} ${selectedClass} ${hoverClass}`.trim()
    }, [absence, holiday, day, isHovered, isSelected])

    const isEndOfRange = Boolean(
      rangeSelection.startDate && rangeSelection.endDate &&
        popoverTargetCell &&
        ((isEqual(day, rangeSelection.endDate) && isEqual(day, popoverTargetCell.date) && doctorId === popoverTargetCell.doctorId) ||
         (isEqual(day, rangeSelection.startDate) && isEqual(day, popoverTargetCell.date) && doctorId === popoverTargetCell.doctorId))
    )

    return (
      <Popover
        key={doctorId + '-' + day.toISOString() + '-' + (isEndOfRange ? 'open' : 'closed')}
        open={isEndOfRange}
        onOpenChange={(open) => {
          if (!open) setPopoverTargetCell(null)
        }}
      >
        <PopoverTrigger asChild>
          <div
            className={cellClasses}
            onClick={() => {
              if (absence) return
              // If this is the end of the selected range, always set popover target (force new object)
              if (
                rangeSelection.startDate && rangeSelection.endDate &&
                (isEqual(day, rangeSelection.endDate) || isEqual(day, rangeSelection.startDate))
              ) {
                setPopoverTargetCell({ doctorId, date: new Date(day) })
                return
              }
              handleCellClick(doctorId, day)
            }}
            style={{ cursor: absence ? 'default' : 'pointer' }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            title={holiday ? holiday.name : undefined}
          >
            {absence ? <span className="sr-only">{absence.type.replace("_", " ")}</span> : ""}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2">
          <div className="space-y-2">
            <h3 className="font-medium text-sm px-2 py-1.5">Select Absence Type</h3>
            <div className="space-y-1">
              {(Object.keys(ABSENCE_COLORS) as AbsenceType[]).map(type => (
                <Button
                  key={type}
                  variant="ghost"
                  className={cn("w-full justify-start h-8 font-semibold", ABSENCE_COLORS[type])}
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!rangeSelection.startDate || !rangeSelection.endDate || !rangeSelection.doctorId) return
                    
                    setIsSubmitting(true)
                    
                    try {
                      const start = rangeSelection.startDate < rangeSelection.endDate ? rangeSelection.startDate : rangeSelection.endDate
                      const end = rangeSelection.startDate < rangeSelection.endDate ? rangeSelection.endDate : rangeSelection.startDate

                      const newAbsence = {
                        doctor_id: rangeSelection.doctorId,
                        request_start_date: format(start, 'yyyy-MM-dd'),
                        request_end_date: format(end, 'yyyy-MM-dd'),
                        type: type,
                        reason: 'Added from absence report',
                        status: 'approved' as "approved",
                      }
                      setPendingAbsence(newAbsence)
                      await timeOffRequestsService.create(newAbsence)
                      setPendingAbsence(null)
                      await fetchData()
                    } catch (error) {
                      setPendingAbsence(null)
                      console.error('Failed to create absence:', error)
                      alert('Failed to create absence. Please try again.')
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                >
                  {isSubmitting ? "Saving..." : type.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }
  const AbsenceCell = React.memo(AbsenceCellComponent)
  AbsenceCell.displayName = 'AbsenceCell'

  // Cleanup overflow style on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Memoize days array to prevent recalculation
  const days = useMemo(() => 
    eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), 
    [month]
  )

  // Memoize holiday lookup function
  const getHolidayForDay = useCallback((day: Date) => {
    const d = format(day, 'yyyy-MM-dd')
    return holidays.find(h => h.date === d)
  }, [holidays])

  // Memoize grid template columns
  const gridTemplateColumns = useMemo(() => 
    `minmax(120px,1.5fr) repeat(${days.length}, minmax(40px, 1fr))`, 
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

  // Memoize absence lookup function
  const getAbsenceForDay = useCallback((doctorId: string, day: Date) => {
    const result = allAbsences.find(
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
  }, [allAbsences])

  // Memoize doctor rows
  const doctorRows = useMemo(() => 
    doctors.map((doc) => [
      <div 
        key={doc.id + "-name"} 
        className={`py-1.5 px-3 border-b border-r bg-gray-50 font-medium sticky left-0 z-20 flex items-center text-xs sm:text-sm ${
          hoveredCell && hoveredCell.doctorId === doc.id ? "after:absolute after:inset-0 after:border-2 after:border-blue-200 after:pointer-events-none" : ""
        }`}
      >
        <div className="truncate" title={doc.name}>{doc.name}</div>
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
    [doctors, days, getAbsenceForDay, getHolidayForDay, hoveredCell, AbsenceCell]
  )
  
  // Preserve scroll position
  const saveScroll = () => {
    if (gridContainerRef.current) {
      sessionStorage.setItem('absenceGridScroll', gridContainerRef.current.scrollLeft.toString())
    }
  }
  const restoreScroll = () => {
    if (gridContainerRef.current) {
      const scroll = sessionStorage.getItem('absenceGridScroll')
      if (scroll) gridContainerRef.current.scrollLeft = parseInt(scroll, 10)
    }
  }

  // Call restoreScroll after data loads
  useEffect(() => {
    if (!loading) {
      setTimeout(restoreScroll, 0)
    }
  }, [loading])

  // Save scroll before refresh
  const handleRefresh = async () => {
    saveScroll()
    await fetchData()
  }

  // In the popover's onClick handler for type selection:
  // setPendingAbsence({ ...newAbsenceData }) before the API call
  // After the API call, setPendingAbsence(null) and refresh

  // Skeleton loader
  const skeletonRows = useMemo(() => {
    return Array.from({ length: doctors.length || 5 }).map((_, i) => (
      <div key={i} className="flex">
        <div className="py-0.5 px-2 border-b bg-gray-100 w-32 h-6 animate-pulse rounded" />
        {Array.from({ length: days.length || 20 }).map((_, j) => (
          <div key={j} className="py-0.5 px-1 border-b bg-gray-100 h-6 w-10 animate-pulse rounded" />
        ))}
      </div>
    ))
  }, [doctors.length, days.length])

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
            <div className="px-4 pt-4 lg:px-6 lg:pt-6">
              <PendingRequestsWidget />
            </div>
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
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="group">
                      <RotateCcw className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-180" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={toggleFullscreen} className="group">
                      {isFullscreen ? (
                        <Minimize2 className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      ) : (
                        <Maximize2 className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      )}
                    </Button>
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
                {/* Grid Container */}
                <div className={cn(
                  "relative overflow-auto rounded-lg border shadow-sm",
                  isFullscreen ? "fixed inset-0 z-50 bg-white" : "max-h-[calc(100vh-200px)]",
                  loading ? "grid grid-cols-1" : "" // Show skeleton when loading
                )}
                ref={gridContainerRef}
                >
                  {/* Container for both header and content */}
                  <div className="relative min-w-[640px]">
                    {/* Fixed header row */}
                    <div
                      className="grid sticky top-0 bg-white z-30"
                      style={{
                        gridTemplateColumns: gridTemplateColumns,
                        width: "100%",
                      }}
                    >
                      {/* Corner cell - sticky both ways */}
                      <div 
                        className={cn(
                          "py-1.5 px-3 font-medium text-sm border-b border-r sticky left-0 bg-white z-40 flex items-center",
                          isFullscreen && "cursor-pointer hover:bg-gray-50"
                        )}
                        onClick={isFullscreen ? toggleFullscreen : undefined}
                        title={isFullscreen ? "Click to exit fullscreen" : undefined}
                      >
                        <div className="truncate font-semibold">Doctor</div>
                      </div>
                      {/* Date headers */}
                      {days.map((day) => {
                        const holiday = getHolidayForDay(day)
                        return (
                          <div
                            key={day.toISOString()}
                            className={`py-1.5 px-1.5 border-b font-medium text-center text-xs relative flex flex-col justify-center ${
                              isSaturday(day) && !holiday ? "bg-gray-100" : "bg-white"
                            } ${
                              isToday(day) && !holiday ? "bg-blue-100 border-blue-300" : ""
                            } ${
                              holiday ? HOLIDAY_COLOR : ""
                            } ${
                              hoveredCell && hoveredCell.day.getTime() === day.getTime() ? "after:absolute after:inset-0 after:border-2 after:border-blue-200 after:pointer-events-none" : ""
                            }`}
                            title={holiday ? holiday.name : undefined}
                          >
                            <div className="font-bold text-[11px] sm:text-xs truncate">
                              {format(day, "EEE")}
                            </div>
                            <div className="text-[13px] sm:text-sm font-semibold truncate">
                              {format(day, "d")}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Scrollable content */}
                    <div className="relative">
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: gridTemplateColumns,
                          width: "100%",
                        }}
                      >
                        {/* Doctor rows with sticky names */}
                        {loading ? skeletonRows : doctorRows}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 