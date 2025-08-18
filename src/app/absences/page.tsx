"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isToday, isSaturday, isAfter, isBefore, isEqual } from "date-fns"
import { ChevronLeft, ChevronRight, RotateCcw, Maximize2, Minimize2 } from "lucide-react"
import { timeOffRequestsService } from "@/lib/services/time-off-requests"
import { PendingRequestsWidget } from "@/components/pending-requests-widget"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useAbsenceGrid } from "@/hooks/use-absence-grid"

// Define types for better type safety
type AbsenceType = "vacation" | "sick_leave" | "personal" | "conference" | "other"

const ABSENCE_COLORS: Record<AbsenceType, string> = {
  vacation: "bg-yellow-200 text-yellow-800",
  sick_leave: "bg-red-200 text-red-800",
  personal: "bg-blue-200 text-blue-800",
  conference: "bg-green-200 text-green-800",
  other: "bg-gray-200 text-gray-800",
}

const ABSENCE_EMOJIS: Record<AbsenceType, string> = {
  vacation: "🏖️",
  sick_leave: "🏥",
  personal: "👤",
  conference: "🎓",
  other: "📝",
}

const HOLIDAY_COLOR = "bg-purple-200 text-purple-900 border-purple-400"



export default function AbsenceReportPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

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
  const [pendingRequestPopoverCell, setPendingRequestPopoverCell] = useState<{doctorId: string, date: Date, request: any} | null>(null)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const [pendingAbsence, setPendingAbsence] = useState<any | null>(null)
  const [localAbsences, setLocalAbsences] = useState<any[]>([])
  
  // New spreadsheet-like state
  const [focusedCell, setFocusedCell] = useState<{ doctorId: string; day: Date } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())

  const { doctors, absences, pendingRequests, holidays, loading, error, fetchData, lastUpdate } = useAbsenceGrid(month)

  // Memoize days array to prevent recalculation
  const days = useMemo(() => 
    eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), 
    [month]
  )

  // Optimistic UI: add pendingAbsence and local absences to absences
  const allAbsences = useMemo(() => {
    const baseAbsences = [...absences, ...localAbsences]
    if (pendingAbsence) return [...baseAbsences, pendingAbsence]
    return baseAbsences
  }, [absences, localAbsences, pendingAbsence])

  // Sync local absences with fetched data to avoid duplicates
  useEffect(() => {
    if (absences.length > 0 && localAbsences.length > 0) {
      // Remove local absences that are now in the fetched data
      const fetchedIds = new Set(absences.map(a => a.id))
      setLocalAbsences(prev => prev.filter(local => !fetchedIds.has(local.id)))
    }
  }, [absences])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!focusedCell) return

    const currentDoctorIndex = doctors.findIndex(d => d.id === focusedCell.doctorId)
    const currentDayIndex = days.findIndex(d => isEqual(d, focusedCell.day))
    
    let newDoctorIndex = currentDoctorIndex
    let newDayIndex = currentDayIndex

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        newDoctorIndex = Math.max(0, currentDoctorIndex - 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        newDoctorIndex = Math.min(doctors.length - 1, currentDoctorIndex + 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        newDayIndex = Math.max(0, currentDayIndex - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        newDayIndex = Math.min(days.length - 1, currentDayIndex + 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedCell) {
          handleCellClick(focusedCell.doctorId, focusedCell.day)
        }
        break
      case 'Escape':
        setIsEditing(false)
        setFocusedCell(null)
        break
    }

    if (newDoctorIndex !== currentDoctorIndex || newDayIndex !== currentDayIndex) {
      const newDoctor = doctors[newDoctorIndex]
      const newDay = days[newDayIndex]
      if (newDoctor && newDay) {
        setFocusedCell({ doctorId: newDoctor.id, day: newDay })
      }
    }
  }, [focusedCell, doctors, days])

  // Add keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Function to handle cell click for range selection
  const handleCellClick = useCallback((doctorId: string, date: Date) => {
    // Set focused cell
    setFocusedCell({ doctorId, day: date })
    
    const { doctorId: currentDoctor, startDate, endDate } = rangeSelection

    // If clicking a different doctor's row, reset and start new selection
    if (currentDoctor && doctorId !== currentDoctor) {
      setRangeSelection({ doctorId, startDate: date, endDate: null })
      setPopoverTargetCell(null)
      return
    }

    // If no start date is set, this click sets the start date
    if (!startDate) {
      setRangeSelection({ doctorId, startDate: date, endDate: null })
      setPopoverTargetCell(null)
      return
    }

    // If start date is set but no end date, this click sets the end date
    if (startDate && !endDate) {
      let endDateToSet = date
      
      // If the clicked date is before the start date, swap them
      if (isBefore(date, startDate)) {
        endDateToSet = startDate
        setRangeSelection({ doctorId, startDate: date, endDate: endDateToSet })
      } else {
        setRangeSelection({ doctorId, startDate, endDate: date })
      }
      
      // Open the popover for type selection
      setPopoverTargetCell({ doctorId, date: endDateToSet })
      return
    }

    // If both dates are set, clicking any date starts a new selection
    if (startDate && endDate) {
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
  pendingRequest
}: {
  doctorId: string
  day: Date
  absence: any
  holiday: any
  pendingRequest: any
}) {
  const cellRef = useRef<HTMLDivElement>(null)
  const isSelected = isInSelectedRange(doctorId, day)
  const isPopoverTarget = popoverTargetCell?.doctorId === doctorId && popoverTargetCell?.date && isEqual(day, popoverTargetCell.date)
  const isFocused = focusedCell?.doctorId === doctorId && focusedCell?.day && isEqual(day, focusedCell.day)

  const cellClasses = useMemo(() => {
    const baseClasses = "py-0 px-0 border-r border-gray-200 text-center flex items-center justify-center text-[10px] relative transition-all duration-150 min-h-[20px] border-b border-gray-200"
    const absenceClass = absence ? ABSENCE_COLORS[absence.type as AbsenceType] : ""
    const holidayClass = holiday ? HOLIDAY_COLOR : ""
    const pendingClass = pendingRequest ? "bg-gray-50 text-gray-500 border-gray-200 opacity-70 hover:bg-gray-100 hover:opacity-90 cursor-pointer" : ""
    const saturdayClass = isSaturday(day) && !holiday && !pendingRequest ? "bg-gray-50" : ""
    const selectedClass = isSelected ? "bg-blue-100 border-blue-300 ring-2 ring-blue-200 ring-offset-1" : ""
    const hoverClass = ""
    const clickableClass = !absence && !holiday && !pendingRequest ? "hover:bg-blue-50 hover:border-blue-200 cursor-pointer" : ""
    const focusedClass = isFocused ? "ring-2 ring-blue-400 ring-offset-1" : ""
    const optimisticClass = absence && !absence.id ? "opacity-80 animate-pulse" : ""
    return `${baseClasses} ${absenceClass} ${holidayClass} ${pendingClass} ${saturdayClass} ${selectedClass} ${hoverClass} ${clickableClass} ${focusedClass} ${optimisticClass}`.trim()
  }, [absence, holiday, pendingRequest, day, isSelected, isFocused])

  const isAbsencePopoverOpen = 
    rangeSelection.startDate && rangeSelection.endDate &&
    popoverTargetCell &&
    popoverTargetCell.doctorId === doctorId && 
    popoverTargetCell.date && 
    isEqual(day, popoverTargetCell.date)

  const isPendingPopoverOpen = 
    pendingRequestPopoverCell?.doctorId === doctorId && 
    pendingRequestPopoverCell?.date && 
    isEqual(day, pendingRequestPopoverCell.date)

  const isPopoverOpen = isAbsencePopoverOpen || isPendingPopoverOpen

  const onPopoverOpenChange = (open: boolean) => {
    if (!open) {
      if (isAbsencePopoverOpen) {
        setPopoverTargetCell(null)
        setRangeSelection({ doctorId: null, startDate: null, endDate: null })
      }
      if (isPendingPopoverOpen) {
        setPendingRequestPopoverCell(null)
      }
    }
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={onPopoverOpenChange}>
      <PopoverTrigger asChild>
        <div
          ref={cellRef}
          className={cellClasses}
          onClick={() => {
            if (pendingRequest) {
              setPendingRequestPopoverCell({ doctorId, date: day, request: pendingRequest })
              return
            }
            if (absence) {
              const start = new Date(absence.request_start_date + 'T00:00:00')
              const end = new Date(absence.request_end_date + 'T00:00:00')
              setRangeSelection({ doctorId, startDate: start, endDate: end })
              setPopoverTargetCell({ doctorId, date: day })
              return
            }
            if (holiday) return
            handleCellClick(doctorId, day)
          }}
          onDoubleClick={() => {
            if (absence || holiday || pendingRequest) return
            handleCellDoubleClick(doctorId, day)
          }}
          style={{ cursor: holiday ? 'default' : 'pointer' }}
          title={
            holiday ? holiday.name : 
            absence ? `${ABSENCE_EMOJIS[absence.type as AbsenceType]} ${absence.type.replace("_", " ")}` :
            pendingRequest ? `❓ Pending ${pendingRequest.type.replace("_", " ")} - Click to manage` :
            undefined
          }
        >
          {absence ? (
            <span className="text-xs" title={`${ABSENCE_EMOJIS[absence.type as AbsenceType]} ${absence.type.replace("_", " ")}`}>
              {ABSENCE_EMOJIS[absence.type as AbsenceType]}
            </span>
          ) : pendingRequest ? (
            <span className="text-xs opacity-60" title={`❓ Pending ${pendingRequest.type.replace("_", " ")}`}>
              ❓
            </span>
          ) : ""}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[100px] p-1" 
        side="right" 
        align="start"
        sideOffset={5}
      >
        {/* POPOVER TYPE 1A: Create New Absence Popover */}
        {/* POPOVER TYPE 1B: Edit Existing Absence Popover */}
        {/* These popovers appear when:
            1A. Creating new absences (absence is null) - shows "Select Absence Type" title, no delete button
            1B. Editing existing absences (absence exists) - shows "Edit Absence" title, includes delete button */}
        {isAbsencePopoverOpen ? (
          <div className="space-y-1">
            <h3 className="font-medium text-xs px-1.5 py-1">{absence ? "Edit Absence" : "Select Absence Type"}</h3>
            <div className="space-y-1">
              {/* Absence type buttons: Vacation, Sick Leave, Personal, Conference, Other */}
              {(Object.keys(ABSENCE_COLORS) as AbsenceType[]).map(type => (
                <Button
                  key={type}
                  variant="ghost"
                  className={cn("w-full justify-start h-7 text-xs font-semibold", ABSENCE_COLORS[type])}
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (absence) {
                      // Handle update
                      setIsSubmitting(true)
                      try {
                        await timeOffRequestsService.update(absence.id, { type })
                        await fetchData()
                        setRangeSelection({ doctorId: null, startDate: null, endDate: null })
                        setPopoverTargetCell(null)
                      } catch (error) {
                        console.error("Failed to update absence:", error)
                        alert("Failed to update absence.")
                      } finally {
                        setIsSubmitting(false)
                      }
                    } else if (rangeSelection.startDate && rangeSelection.endDate && rangeSelection.doctorId) {
                      // Handle create
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
                        saveScroll()
                        setPendingAbsence(newAbsence)
                        
                        try {
                          const createdAbsence = await timeOffRequestsService.create(newAbsence)
                          setLocalAbsences(prev => [...prev, createdAbsence])
                          setPendingAbsence(null)
                          fetchData()
                        } catch (error) {
                          setPendingAbsence(null)
                          throw error
                        }
                        
                        setRangeSelection({ doctorId: null, startDate: null, endDate: null })
                        setPopoverTargetCell(null)
                      } catch (error) {
                        setPendingAbsence(null)
                        console.error('Failed to create absence:', error)
                        alert(`Failed to create absence: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
                      } finally {
                        setIsSubmitting(false)
                      }
                    }
                  }}
                >
                  {isSubmitting ? "Saving..." : `${ABSENCE_EMOJIS[type]} ${type.replace(/_/g, ' ')}`}
                </Button>
              ))}
              {/* Delete option - only shown when editing existing absences */}
              {absence && (
                <>
                  <hr className="my-1" />
                  <Button
                    variant="destructive"
                    className="w-full justify-center h-7 text-xs font-semibold"
                    disabled={isSubmitting}
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to delete this absence?")) {
                        setIsSubmitting(true)
                        try {
                          await timeOffRequestsService.delete(absence.id)
                          await fetchData()
                          setRangeSelection({ doctorId: null, startDate: null, endDate: null })
                          setPopoverTargetCell(null)
                        } catch (error) {
                          console.error("Failed to delete absence:", error)
                          alert("Failed to delete absence.")
                        } finally {
                          setIsSubmitting(false)
                        }
                      }
                    }}
                  >
                    {isSubmitting ? "Deleting..." : "Delete Absence"}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* POPOVER TYPE 2: Pending Request Management Popover */
          /* This popover appears when clicking on pending requests (❓) - shows approve/reject options */
          isPendingPopoverOpen ? (
           <div className="flex flex-col gap-1 p-1">
             {/* Status indicator - disabled button showing "Pending" */}
             <Button
               variant="outline"
               className="w-full justify-start h-7 text-xs"
               disabled
             >
               Pending
             </Button>
             {/* Approve button - changes status to approved */}
             <Button
               variant="default"
               className="w-full justify-center h-7 text-xs"
               disabled={isSubmitting}
               onClick={() => {
                 if (pendingRequestPopoverCell?.request?.id) {
                   handlePendingRequestStatusUpdate(pendingRequestPopoverCell.request.id, 'approved')
                 }
               }}
             >
               {isSubmitting ? "Approving..." : "Approve"}
             </Button>
             {/* Reject button - changes status to rejected */}
             <Button
               variant="destructive"
               className="w-full justify-center h-7 text-xs"
               disabled={isSubmitting}
               onClick={() => {
                 if (pendingRequestPopoverCell?.request?.id) {
                   handlePendingRequestStatusUpdate(pendingRequestPopoverCell.request.id, 'rejected')
                 }
               }}
             >
               {isSubmitting ? "Rejecting..." : "Reject"}
             </Button>
           </div>
        ) : null
        )}
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

// Memoize holiday lookup function
const getHolidayForDay = useCallback((day: Date) => {
  const d = format(day, 'yyyy-MM-dd')
  return holidays.find(h => h.date === d)
}, [holidays])

// Memoize grid template columns
const gridTemplateColumns = useMemo(() => 
  `minmax(80px,1fr) repeat(${days.length}, minmax(24px, 1fr))`, 
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
        }`}
        style={{ minWidth: 0 }}
        title={holiday ? holiday.name : undefined}
      >
        {format(day, "d")}
      </div>
    )
  }), 
  [days, getHolidayForDay]
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

// Memoize pending request lookup function
const getPendingRequestForDay = useCallback((doctorId: string, day: Date) => {
  const result = pendingRequests.find(
    (p) => {
      // Normalize dates to avoid timezone issues
      const startDate = new Date(p.request_start_date + 'T00:00:00')
      const endDate = new Date(p.request_end_date + 'T23:59:59')
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0)
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)
      const doctorMatches = p.doctor_id === doctorId
      const dateMatches = startDate <= dayEnd && endDate >= dayStart
      

      
      return doctorMatches && dateMatches
    }
  )
  return result
}, [pendingRequests])

// Function to handle accepting pending requests (removed - no longer needed)
// const handleAcceptPendingRequest = useCallback(async (pendingRequest: any) => {
//   if (!pendingRequest) return
//   
//   // Save current scroll position
//   saveScroll()
//   
//   setIsSubmitting(true)
//   
//   try {
//     // Update the pending request status to approved
//     await timeOffRequestsService.updateStatus(pendingRequest.id, 'approved')
//     
//     // Refresh data to reflect the change
//     await fetchData()
//   } catch (error) {
//     console.error('Failed to accept pending request:', error)
//     alert('Failed to accept request. Please try again.')
//   } finally {
//       setIsSubmitting(false)
//   }
// }, [fetchData])

// Double-click handler for editing
const handleCellDoubleClick = useCallback((doctorId: string, date: Date) => {
  const absence = getAbsenceForDay(doctorId, date)
  const holiday = getHolidayForDay(date)
  const pendingRequest = getPendingRequestForDay(doctorId, date)
  
  // Only allow editing if no absence, holiday, or pending request exists
  if (!absence && !holiday && !pendingRequest) {
    setFocusedCell({ doctorId, day: date })
    setRangeSelection({ doctorId, startDate: date, endDate: null })
    setPopoverTargetCell({ doctorId, date })
  }
}, [getAbsenceForDay, getHolidayForDay, getPendingRequestForDay])

// Memoize doctor rows
const doctorRows = useMemo(() => 
  doctors.map((doc) => (
    <div key={doc.id} className="contents">
      <div 
        className="py-0.5 px-1.5 border-r border-gray-300 border-b border-gray-200 bg-gray-50 font-medium sticky left-0 z-20 flex items-center text-xs shadow-sm min-h-[20px]"
      >
        <div className="truncate text-gray-900" title={doc.name}>{doc.name}</div>
      </div>
      {days.map((day) => {
        const absence = getAbsenceForDay(doc.id, day)
        const holiday = getHolidayForDay(day)
        const pendingRequest = getPendingRequestForDay(doc.id, day)
        return (
          <AbsenceCellComponent
            key={doc.id + "-" + day.toISOString()}
            doctorId={doc.id}
            day={day}
            absence={absence}
            holiday={holiday}
            pendingRequest={pendingRequest}
          />
        )
      })}
    </div>
  )), 
  [doctors, days, getAbsenceForDay, getHolidayForDay, AbsenceCellComponent]
)
  
  // Preserve scroll position (both horizontal and vertical)
  const saveScroll = () => {
    if (gridContainerRef.current) {
      const scrollData = {
        scrollLeft: gridContainerRef.current.scrollLeft,
        scrollTop: gridContainerRef.current.scrollTop,
        timestamp: Date.now()
      }
      sessionStorage.setItem('absenceGridScroll', JSON.stringify(scrollData))
    }
  }
  
  const restoreScroll = () => {
    if (gridContainerRef.current) {
      const scrollData = sessionStorage.getItem('absenceGridScroll')
      if (scrollData) {
        try {
          const { scrollLeft, scrollTop, timestamp } = JSON.parse(scrollData)
          // Only restore if the data is less than 1 hour old
          if (Date.now() - timestamp < 3600000) {
            gridContainerRef.current.scrollLeft = scrollLeft
            gridContainerRef.current.scrollTop = scrollTop
          }
        } catch (error) {
          console.warn('Failed to restore scroll position:', error)
        }
      }
    }
  }

  // Call restoreScroll after data loads
  useEffect(() => {
    if (!loading) {
      setTimeout(restoreScroll, 0)
    }
  }, [loading])

  // Auto-save scroll position on scroll
  useEffect(() => {
    const gridContainer = gridContainerRef.current
    if (!gridContainer) return

    const handleScroll = () => {
      saveScroll()
    }

    gridContainer.addEventListener('scroll', handleScroll)
    return () => gridContainer.removeEventListener('scroll', handleScroll)
  }, [])

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
      <div key={i} className="contents">
        <div className="py-0.5 px-1.5 border-r border-gray-300 bg-gray-100 w-24 h-4 animate-pulse rounded" />
        {Array.from({ length: days.length || 20 }).map((_, j) => (
          <div key={j} className="py-0 px-0 border-r border-gray-200 bg-gray-100 h-4 w-6 animate-pulse rounded" />
        ))}
      </div>
    ))
  }, [doctors.length, days.length])

  // Function to update the status of a pending request
  const handlePendingRequestStatusUpdate = useCallback(async (requestId: string, newStatus: 'approved' | 'rejected') => {
    if (!requestId) return
    
    // Save current scroll position
    saveScroll()
    
    setIsSubmitting(true)
    
    try {
      // Update the pending request status
      await timeOffRequestsService.updateStatus(requestId, newStatus)
      
      // Refresh data to reflect the change
      await fetchData()
      
      // Close the popover
      setPendingRequestPopoverCell(null)
    } catch (error) {
      console.error(`Failed to ${newStatus} pending request:`, error)
      alert(`Failed to ${newStatus} request. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }, [fetchData])

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
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Spreadsheet Controls:</span> Use arrow keys to navigate, double-click to edit, Enter/Space to select range
                  </div>
                  {rangeSelection.doctorId && rangeSelection.startDate && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-700">
                        <strong>Selection:</strong> {doctors.find(d => d.id === rangeSelection.doctorId)?.name} - 
                        {rangeSelection.startDate && format(rangeSelection.startDate, 'MMM dd')}
                        {rangeSelection.endDate && ` to ${format(rangeSelection.endDate, 'MMM dd')}`}
                        {!rangeSelection.endDate && ' (click to select end date)'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <div className="flex flex-wrap gap-2 order-2 md:order-1">
                    {Object.entries(ABSENCE_COLORS).map(([type, color]) => (
                      <span key={type} className={`inline-block px-2 py-1 rounded text-xs font-semibold ${color}`}>
                        {ABSENCE_EMOJIS[type as AbsenceType]} {type.replace('_', ' ')}
                      </span>
                    ))}
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${HOLIDAY_COLOR}`}>🕯️ Jewish Holiday</span>
                    <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-500 border-gray-300 opacity-60">❓ Pending Request</span>
                  </div>
                  <div className="flex gap-2 order-1 md:order-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      saveScroll()
                      setMonth(subMonths(month, 1))
                    }} className="group">
                      <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:-translate-x-0.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      saveScroll()
                      setMonth(addMonths(month, 1))
                    }} className="group">
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
                  "relative overflow-auto rounded-lg border border-gray-200 shadow-sm bg-white",
                  isFullscreen ? "fixed inset-0 z-50 bg-white" : "max-h-[calc(100vh-200px)]",
                  loading ? "grid grid-cols-1" : "" // Show skeleton when loading
                )}
                ref={gridContainerRef}
                >
                  {/* Container for both header and content */}
                  <div className="relative min-w-[640px] bg-white">
                    {/* Fixed header row with refined borders */}
                <div
                      className="grid sticky top-0 bg-white z-30 border-b-2 border-gray-300 gap-0"
                  style={{
                      gridTemplateColumns: gridTemplateColumns,
                    width: "100%",
                      }}
                    >
                      {/* Corner cell - sticky both ways with refined styling */}
                      <div 
                        className={cn(
                          "py-0.5 px-1.5 font-medium text-sm border-r border-gray-300 border-b border-gray-200 sticky left-0 bg-white z-40 flex items-center shadow-sm min-h-[20px]",
                          isFullscreen && "cursor-pointer hover:bg-gray-50"
                        )}
                        onClick={isFullscreen ? toggleFullscreen : undefined}
                        title={isFullscreen ? "Click to exit fullscreen" : undefined}
                >
                        <div className="truncate font-semibold text-gray-900">Doctor</div>
                      </div>
                      {/* Date headers with refined styling */}
                      {days.map((day) => {
                        const holiday = getHolidayForDay(day)
                        return (
                          <div
                            key={day.toISOString()}
                            className={`py-0.5 px-0.5 border-r border-gray-200 font-medium text-center text-[10px] relative flex flex-col justify-center min-h-[20px] ${
                              isSaturday(day) && !holiday ? "bg-gray-50" : "bg-white"
                            } ${
                              isToday(day) && !holiday ? "bg-blue-50 border-blue-200" : ""
                            } ${
                              holiday ? HOLIDAY_COLOR : ""
                            }`}
                            title={holiday ? holiday.name : undefined}
                          >
                            <div className="font-bold text-[9px] truncate text-gray-600">
                              {format(day, "EEE")}
                            </div>
                            <div className="text-[11px] font-semibold truncate text-gray-900">
                              {format(day, "d")}
                            </div>
                          </div>
                        )
                      })}
                </div>

                    {/* Scrollable content */}
                    <div className="relative">
                <div
                        className="grid auto-rows-min border-l border-gray-200 gap-0"
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