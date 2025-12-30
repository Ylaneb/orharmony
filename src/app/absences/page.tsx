"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isToday, isSaturday, isAfter, isBefore, isEqual, differenceInDays, max, min, parseISO, addDays, subDays } from "date-fns"
import { ChevronLeft, ChevronRight, RotateCcw, Maximize2, Minimize2 } from "lucide-react"
import { timeOffRequestsRealtimeService } from "@/lib/services/time-off-requests-realtime"
import { timeOffRequestsService } from "@/lib/services/time-off-requests"
import { optimizedAbsencesService } from "@/lib/services/optimized-absences"
import { useRealtimeUpdates, type RealtimeEvent } from "@/lib/services/realtime-client"
import { PendingRequestsWidget } from "@/components/pending-requests-widget"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { cn } from "@/lib/utils"
import { useAbsenceGrid } from "@/hooks/use-absence-grid"
import { DateRange } from "react-day-picker"

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
  const [popoverTargetCell, setPopoverTargetCell] = useState<{doctorId: string, date: Date} | null>(null)
  const [pendingRequestPopoverCell, setPendingRequestPopoverCell] = useState<{doctorId: string, date: Date, request: any} | null>(null)
  const [partialApprovalMode, setPartialApprovalMode] = useState<{requestId: string, originalRange: {from: Date, to: Date}} | null>(null)
  const [partialApprovalRange, setPartialApprovalRange] = useState<{from: Date | null, to: Date | null}>({from: null, to: null})
  const [selectedDateForSummary, setSelectedDateForSummary] = useState<Date | null>(null)
  const [selectedDoctorForSummary, setSelectedDoctorForSummary] = useState<string | null>(null)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  
  // Simple loading state for immediate feedback
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // New spreadsheet-like state
  const [focusedCell, setFocusedCell] = useState<{ doctorId: string; day: Date } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())

  const { doctors, absences, pendingRequests, holidays, loading, error, fetchData, lastUpdate } = useAbsenceGrid(month)

  // Real-time updates integration
  const handleRealtimeUpdate = useCallback((event: RealtimeEvent) => {
    console.log('Real-time update received:', event)
    
    // Clear cache when receiving real-time updates to ensure fresh data
    // This is critical for immediate visibility of approved requests
    optimizedAbsencesService.clearCache()
    
    // Refresh data when we receive real-time updates
    // This ensures the grid stays in sync with the database
    fetchData()
  }, [fetchData])

  const { isConnected: isRealtimeConnected, error: realtimeError } = useRealtimeUpdates(handleRealtimeUpdate)

  // Memoize days array to prevent recalculation
  const days = useMemo(() => 
    eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), 
    [month]
  )

  // Use absences directly since real-time updates will refresh the data
  const allAbsences = useMemo(() => absences, [absences])

  // Use pending requests directly since real-time updates will refresh the data
  const allPendingRequests = useMemo(() => pendingRequests, [pendingRequests])

  // Real-time updates will handle data synchronization automatically

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
  }, [focusedCell, doctors, days, handleCellClick])

  // Add keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

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
        // Reset partial approval state when closing popover
        setPartialApprovalMode(null)
        setPartialApprovalRange({from: null, to: null})
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
        className={cn(
          "p-1",
          partialApprovalMode?.requestId === pendingRequestPopoverCell?.request?.id ? "w-[400px] max-w-[90vw]" : "w-[100px]"
        )}
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
                                    onClick={async () => {
                    if (absence) {
                      // Handle update - REAL-TIME UPDATE
                      setIsActionLoading(`update_${absence.id}`)
                      
                      try {
                        await timeOffRequestsRealtimeService.update(absence.id, { type })
                        await fetchData()
                        // Real-time updates will automatically refresh the data
                      } catch (error) {
                        console.error("Failed to update absence:", error)
                        alert("Failed to update absence.")
                      } finally {
                        setIsActionLoading(null)
                        setRangeSelection({ doctorId: null, startDate: null, endDate: null })
                        setPopoverTargetCell(null)
                      }
                    } else if (rangeSelection.startDate && rangeSelection.endDate && rangeSelection.doctorId) {
                      // Handle create - REAL-TIME UPDATE
                      const start = rangeSelection.startDate < rangeSelection.endDate ? rangeSelection.startDate : rangeSelection.endDate
                      const end = rangeSelection.startDate < rangeSelection.endDate ? rangeSelection.endDate : rangeSelection.startDate

                      const startDateStr = format(start, 'yyyy-MM-dd')
                      const endDateStr = format(end, 'yyyy-MM-dd')
                      
                      setIsActionLoading(`create_${Date.now()}`)
                      
                      try {
                        // Check for conflicts before creating the absence
                        const conflicts = await timeOffRequestsService.checkForConflicts(
                          rangeSelection.doctorId,
                          startDateStr,
                          endDateStr
                        )
                        
                        if (conflicts.length > 0) {
                          // Format conflict details for error message
                          const conflictMessages = conflicts.map(conflict => {
                            const statusLabel = conflict.status === 'approved' ? 'approved absence' : 'pending request'
                            const typeLabel = conflict.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || ''
                            const startDateFormatted = format(new Date(conflict.startDate), 'MMM d, yyyy')
                            const endDateFormatted = format(new Date(conflict.endDate), 'MMM d, yyyy')
                            
                            return `${statusLabel}${typeLabel ? ` (${typeLabel})` : ''} from ${startDateFormatted} to ${endDateFormatted}`
                          })
                          
                          alert(`Cannot create absence: This conflicts with an existing request: ${conflictMessages.join('; ')}. Please choose different dates.`)
                          setIsActionLoading(null)
                          return
                        }
                        
                        const newAbsence = {
                          doctor_id: rangeSelection.doctorId,
                          request_start_date: startDateStr,
                          request_end_date: endDateStr,
                          type: type,
                          reason: 'Added from absence report',
                          status: 'approved' as "approved",
                        }
                        
                        await timeOffRequestsRealtimeService.create(newAbsence)
                        await fetchData()
                        // Real-time updates will automatically refresh the data
                      } catch (error) {
                        console.error('Failed to create absence:', error)
                        alert(`Failed to create absence: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
                      } finally {
                        setIsActionLoading(null)
                        setRangeSelection({ doctorId: null, startDate: null, endDate: null })
                        setPopoverTargetCell(null)
                      }
                    }
                  }}
                >
                  {isActionLoading === `update_${absence?.id}` ? "Saving..." : `${ABSENCE_EMOJIS[type]} ${type.replace(/_/g, ' ')}`}
                </Button>
              ))}
              {/* Delete option - only shown when editing existing absences */}
              {absence && (
                <>
                  <hr className="my-1" />
                  <Button
                    variant="destructive"
                    className="w-full justify-center h-7 text-xs font-semibold"
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to delete this absence?")) {
                        // Handle delete - REAL-TIME UPDATE
                        setIsActionLoading(`delete_${absence.id}`)
                        
                        try {
                          await timeOffRequestsRealtimeService.delete(absence.id)
                          await fetchData()
                          // Real-time updates will automatically refresh the data
                        } catch (error) {
                          console.error("Failed to delete absence:", error)
                          alert("Failed to delete absence.")
                        } finally {
                          setIsActionLoading(null)
                          setRangeSelection({ doctorId: null, startDate: null, endDate: null })
                          setPopoverTargetCell(null)
                        }
                      }
                    }}
                  >
                    {isActionLoading === `delete_${absence?.id}` ? "Deleting..." : "Delete Absence"}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* POPOVER TYPE 2: Pending Request Management Popover */
          /* This popover appears when clicking on pending requests (❓) - shows approve/reject options */
          isPendingPopoverOpen ? (
            (() => {
              const request = pendingRequestPopoverCell?.request
              const isPartialMode = partialApprovalMode?.requestId === request?.id
              const originalRange = request ? {
                from: new Date(request.request_start_date + 'T00:00:00'),
                to: new Date(request.request_end_date + 'T23:59:59')
              } : null
              
              if (!request) return null
              
              return (
                <div className="flex flex-col gap-2 p-2">
                  {!isPartialMode ? (
                    <>
                      {/* Request details */}
                      <div className="pb-2 border-b">
                        <div className="text-xs font-semibold mb-1">Pending Request</div>
                        <div className="text-xs text-gray-600">
                          {format(originalRange!.from, 'MMM d, yyyy')} - {format(originalRange!.to, 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-gray-600 capitalize">
                          {request.type?.replace(/_/g, ' ')}
                        </div>
                      </div>
                      
                      {/* Approve button - changes status to approved */}
                      <Button
                        variant="default"
                        className="w-full justify-center h-7 text-xs"
                        onClick={() => {
                          if (request.id) {
                            handlePendingRequestStatusUpdate(request.id, 'approved')
                          }
                        }}
                      >
                        {isActionLoading === `status_${request.id}` ? "Approving..." : "Approve All"}
                      </Button>
                      
                      {/* Approve Partially button */}
                      <Button
                        variant="outline"
                        className="w-full justify-center h-7 text-xs"
                        onClick={() => {
                          if (request.id && originalRange) {
                            setPartialApprovalMode({
                              requestId: request.id,
                              originalRange: originalRange
                            })
                            setPartialApprovalRange({
                              from: originalRange.from,
                              to: originalRange.to
                            })
                          }
                        }}
                      >
                        Approve Partially
                      </Button>
                      
                      {/* Reject button - changes status to rejected */}
                      <Button
                        variant="destructive"
                        className="w-full justify-center h-7 text-xs"
                        onClick={() => {
                          if (request.id) {
                            handlePendingRequestStatusUpdate(request.id, 'rejected')
                          }
                        }}
                      >
                        {isActionLoading === `status_${request.id}` ? "Rejecting..." : "Reject"}
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Partial Approval Mode */}
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-semibold mb-1">Approve Partially</div>
                          <div className="text-xs text-gray-600 mb-2">
                            Original: {format(originalRange!.from, 'MMM d, yyyy')} - {format(originalRange!.to, 'MMM d, yyyy')}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs font-medium mb-1">Select dates to approve:</div>
                          <DateRangePicker
                            value={{
                              from: partialApprovalRange.from || undefined,
                              to: partialApprovalRange.to || undefined
                            }}
                            onValueChange={(range: DateRange) => {
                              if (range?.from && range?.to) {
                                // Ensure selected range is within original range
                                const from = max([range.from, originalRange!.from])
                                const to = min([range.to, originalRange!.to])
                                setPartialApprovalRange({from, to})
                              }
                            }}
                            minDate={originalRange!.from}
                            maxDate={originalRange!.to}
                            maxRange={differenceInDays(originalRange!.to, originalRange!.from) + 1}
                            showQuickSelect={false}
                          />
                        </div>
                        
                        {partialApprovalRange.from && partialApprovalRange.to && (
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div>Selected: {format(partialApprovalRange.from, 'MMM d, yyyy')} - {format(partialApprovalRange.to, 'MMM d, yyyy')}</div>
                            <div>
                              ({differenceInDays(partialApprovalRange.to, partialApprovalRange.from) + 1} day{differenceInDays(partialApprovalRange.to, partialApprovalRange.from) !== 0 ? 's' : ''})
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => {
                              setPartialApprovalMode(null)
                              setPartialApprovalRange({from: null, to: null})
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 text-xs"
                            disabled={!partialApprovalRange.from || !partialApprovalRange.to || isActionLoading?.startsWith('partial_')}
                            onClick={() => {
                              if (request.id && partialApprovalRange.from && partialApprovalRange.to) {
                                handlePartialApproval(
                                  request.id,
                                  format(partialApprovalRange.from, 'yyyy-MM-dd'),
                                  format(partialApprovalRange.to, 'yyyy-MM-dd')
                                )
                              }
                            }}
                          >
                            {isActionLoading?.startsWith('partial_') ? "Approving..." : "Confirm"}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })()
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

// Helper function to get absence type counts for a specific day
const getAbsenceTypeCountsForDay = useCallback((day: Date): Record<AbsenceType, number> => {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0)
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)
  
  const counts: Record<AbsenceType, number> = {
    vacation: 0,
    sick_leave: 0,
    personal: 0,
    conference: 0,
    other: 0
  }
  
  allAbsences.forEach((absence) => {
    const startDate = new Date(absence.request_start_date + 'T00:00:00')
    const endDate = new Date(absence.request_end_date + 'T23:59:59')
    
    // Check if absence overlaps with the day
    if (startDate <= dayEnd && endDate >= dayStart) {
      const absenceType = absence.type as AbsenceType
      if (absenceType && counts.hasOwnProperty(absenceType)) {
        counts[absenceType] = (counts[absenceType] || 0) + 1
      }
    }
  })
  
  return counts
}, [allAbsences])

// Helper function to get absence type day counts for a doctor in current month (displayed month)
const getDoctorAbsenceCountsForMonth = useCallback((doctorId: string, targetMonth: Date): Record<AbsenceType, number> => {
  const monthStart = startOfMonth(targetMonth)
  const monthEnd = endOfMonth(targetMonth)
  const monthStartDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate(), 0, 0, 0)
  const monthEndDate = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59)
  
  const counts: Record<AbsenceType, number> = {
    vacation: 0,
    sick_leave: 0,
    personal: 0,
    conference: 0,
    other: 0
  }
  
  allAbsences.forEach((absence) => {
    if (absence.doctor_id !== doctorId) return
    
    const startDate = new Date(absence.request_start_date + 'T00:00:00')
    const endDate = new Date(absence.request_end_date + 'T23:59:59')
    
    // Check if absence overlaps with the month
    if (startDate <= monthEndDate && endDate >= monthStartDate) {
      // Calculate the overlap: find the intersection of absence range and month range
      const overlapStart = max([startDate, monthStartDate])
      const overlapEnd = min([endDate, monthEndDate])
      
      // Count days in the overlap (inclusive)
      const daysCount = differenceInDays(overlapEnd, overlapStart) + 1
      
      if (daysCount > 0) {
        const absenceType = absence.type as AbsenceType
        if (absenceType && counts.hasOwnProperty(absenceType)) {
          counts[absenceType] = (counts[absenceType] || 0) + daysCount
        }
      }
    }
  })
  
  return counts
}, [allAbsences])

// Helper function to get absence type day counts for a doctor in past 12 months (aggregated)
const getDoctorAbsenceCountsForPastYear = useCallback((doctorId: string): Record<AbsenceType, number> => {
  const today = new Date()
  const oneYearAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1) // 12 months ago (including current month)
  const yearStart = startOfMonth(oneYearAgo)
  const yearStartDate = new Date(yearStart.getFullYear(), yearStart.getMonth(), yearStart.getDate(), 0, 0, 0)
  const todayEndDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
  
  const counts: Record<AbsenceType, number> = {
    vacation: 0,
    sick_leave: 0,
    personal: 0,
    conference: 0,
    other: 0
  }
  
  allAbsences.forEach((absence) => {
    if (absence.doctor_id !== doctorId) return
    
    const startDate = new Date(absence.request_start_date + 'T00:00:00')
    const endDate = new Date(absence.request_end_date + 'T23:59:59')
    
    // Check if absence overlaps with the past 12 months
    if (startDate <= todayEndDate && endDate >= yearStartDate) {
      // Calculate the overlap: find the intersection of absence range and past year range
      const overlapStart = max([startDate, yearStartDate])
      const overlapEnd = min([endDate, todayEndDate])
      
      // Count days in the overlap (inclusive)
      const daysCount = differenceInDays(overlapEnd, overlapStart) + 1
      
      if (daysCount > 0) {
        const absenceType = absence.type as AbsenceType
        if (absenceType && counts.hasOwnProperty(absenceType)) {
          counts[absenceType] = (counts[absenceType] || 0) + daysCount
        }
      }
    }
  })
  
  return counts
}, [allAbsences])

// Memoize pending request lookup function
const getPendingRequestForDay = useCallback((doctorId: string, day: Date) => {
  const result = allPendingRequests.find(
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
}, [allPendingRequests])

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

// Memoize doctor rows - sorted by specialist status (specialists first) with color coding and separation
const doctorRows = useMemo(() => {
  // Sort doctors: specialists first, then interns (within each group, sort by name)
  const sortedDoctors = [...doctors].sort((a, b) => {
    const aIsSpecialist = a.is_specialist ?? false
    const bIsSpecialist = b.is_specialist ?? false
    
    // Specialists come first
    if (aIsSpecialist && !bIsSpecialist) return -1
    if (!aIsSpecialist && bIsSpecialist) return 1
    
    // Within the same group, sort alphabetically by name
    return a.name.localeCompare(b.name)
  })
  
  // Find the index where interns start (first non-specialist)
  const firstInternIndex = sortedDoctors.findIndex(doc => !(doc.is_specialist ?? false))
  const hasSpecialists = firstInternIndex > 0
  const hasInterns = firstInternIndex !== -1
  
  return sortedDoctors.map((doc, index) => {
    const isSpecialist = doc.is_specialist ?? false
    const isFirstIntern = index === firstInternIndex && hasSpecialists && hasInterns
    const nameColorClass = isSpecialist ? 'text-blue-900' : 'text-gray-700'
    
    const isDoctorSelected = selectedDoctorForSummary === doc.id
    const currentMonthCounts = getDoctorAbsenceCountsForMonth(doc.id, month)
    const pastYearCounts = getDoctorAbsenceCountsForPastYear(doc.id)
    const currentMonthTotal = Object.values(currentMonthCounts).reduce((sum, count) => sum + count, 0)
    const pastYearTotal = Object.values(pastYearCounts).reduce((sum, count) => sum + count, 0)
    
    return (
      <div key={doc.id} className="contents">
        <Popover 
          open={isDoctorSelected}
          onOpenChange={(open) => setSelectedDoctorForSummary(open ? doc.id : null)}
        >
          <PopoverTrigger asChild>
            <div 
              className={`py-0.5 px-1.5 border-r border-gray-300 border-b border-gray-200 bg-gray-50 font-medium sticky left-0 z-20 flex items-center text-xs shadow-sm min-h-[20px] cursor-pointer hover:bg-gray-100 transition-colors ${isFirstIntern ? 'border-t-2 border-gray-400' : ''}`}
              title={`Click to see absence summary for ${doc.name}`}
            >
              <div className={`truncate ${nameColorClass}`}>{doc.name}</div>
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 p-4 max-h-[80vh] overflow-y-auto" 
            side="right" 
            align="start"
            sideOffset={5}
          >
            <div className="space-y-4">
              {/* Header */}
              <div>
                <h3 className="font-semibold text-base mb-1">{doc.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${isSpecialist ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                    {isSpecialist ? 'Specialist' : 'Intern'}
                  </span>
                </div>
              </div>
              
              {/* Current Month Section */}
              <div>
                <h4 className="font-semibold text-sm mb-2 text-gray-700">
                  Current Month: {format(month, 'MMMM yyyy')}
                </h4>
                {currentMonthTotal === 0 ? (
                  <p className="text-sm text-gray-500">No absences this month</p>
                ) : (
                  <>
                    <div className="space-y-1.5 mb-2">
                      {(Object.keys(currentMonthCounts) as AbsenceType[]).map((type) => {
                        const count = currentMonthCounts[type]
                        if (count === 0) return null
                        
                        return (
                          <div 
                            key={type} 
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span>{ABSENCE_EMOJIS[type]}</span>
                              <span className={ABSENCE_COLORS[type].split(' ')[1] || 'text-gray-700'}>
                                {type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-900">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>Total Days</span>
                        <span className="text-gray-900">{currentMonthTotal}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Past Year Section */}
              <div>
                <h4 className="font-semibold text-sm mb-2 text-gray-700">
                  Past 12 Months
                </h4>
                {pastYearTotal === 0 ? (
                  <p className="text-sm text-gray-500">No absences in the past year</p>
                ) : (
                  <>
                    <div className="space-y-1.5 mb-2">
                      {(Object.keys(pastYearCounts) as AbsenceType[]).map((type) => {
                        const count = pastYearCounts[type]
                        if (count === 0) return null
                        
                        return (
                          <div 
                            key={type} 
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span>{ABSENCE_EMOJIS[type]}</span>
                              <span className={ABSENCE_COLORS[type].split(' ')[1] || 'text-gray-700'}>
                                {type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-900">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>Total Days</span>
                        <span className="text-gray-900">{pastYearTotal}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
    )
  })
}, 
  [doctors, days, month, selectedDoctorForSummary, getAbsenceForDay, getHolidayForDay, getPendingRequestForDay, getDoctorAbsenceCountsForMonth, getDoctorAbsenceCountsForPastYear, AbsenceCellComponent]
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
    setIsRefreshing(true)
    try {
      // Clear cache to force fresh data fetch
      optimizedAbsencesService.clearCache()
      await fetchData()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
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

  // Function to handle partial approval of a pending request
  const handlePartialApproval = useCallback(async (requestId: string, approvedStartDate: string, approvedEndDate: string) => {
    if (!requestId || !approvedStartDate || !approvedEndDate) return
    
    const pendingRequest = pendingRequests.find(req => req.id === requestId)
    if (!pendingRequest) return
    
    setIsActionLoading(`partial_${requestId}`)
    
    try {
      const originalStart = new Date(pendingRequest.request_start_date + 'T00:00:00')
      const originalEnd = new Date(pendingRequest.request_end_date + 'T23:59:59')
      const approvedStart = new Date(approvedStartDate + 'T00:00:00')
      const approvedEnd = new Date(approvedEndDate + 'T23:59:59')
      
      // Validate that approved dates are within original request dates
      if (approvedStart < originalStart || approvedEnd > originalEnd) {
        alert('Selected dates must be within the original request date range.')
        setIsActionLoading(null)
        return
      }
      
      // Check for conflicts on the approved dates (exclude the original request)
      const conflicts = await timeOffRequestsService.checkForConflicts(
        pendingRequest.doctor_id,
        approvedStartDate,
        approvedEndDate,
        requestId // Exclude the original request from conflict check
      )
      
      if (conflicts.length > 0) {
        const conflictMessages = conflicts.map(conflict => {
          const statusLabel = conflict.status === 'approved' ? 'approved absence' : 'pending request'
          const typeLabel = conflict.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || ''
          const startDateFormatted = format(new Date(conflict.startDate), 'MMM d, yyyy')
          const endDateFormatted = format(new Date(conflict.endDate), 'MMM d, yyyy')
          return `${statusLabel}${typeLabel ? ` (${typeLabel})` : ''} from ${startDateFormatted} to ${endDateFormatted}`
        })
        alert(`Cannot approve these dates: This conflicts with an existing request: ${conflictMessages.join('; ')}.`)
        setIsActionLoading(null)
        return
      }
      
      // Calculate remaining dates
      const remainingDates: {from: Date, to: Date}[] = []
      
      // Before approved dates
      if (approvedStart > originalStart) {
        const beforeEnd = subDays(approvedStart, 1)
        remainingDates.push({from: originalStart, to: beforeEnd})
      }
      
      // After approved dates
      if (approvedEnd < originalEnd) {
        const afterStart = addDays(approvedEnd, 1)
        remainingDates.push({from: afterStart, to: originalEnd})
      }
      
      // Create approved request for selected dates
      await timeOffRequestsRealtimeService.create({
        doctor_id: pendingRequest.doctor_id,
        request_start_date: approvedStartDate,
        request_end_date: approvedEndDate,
        type: pendingRequest.type,
        reason: pendingRequest.reason || 'Partially approved from pending request',
        notes: pendingRequest.notes || '',
        status: 'approved'
      })
      
      // Handle remaining dates
      if (remainingDates.length === 0) {
        // No remaining dates - delete the original request (fully approved)
        await timeOffRequestsRealtimeService.delete(requestId)
      } else if (remainingDates.length === 1) {
        // Single remaining date range - update original request
        const remaining = remainingDates[0]
        await timeOffRequestsRealtimeService.update(requestId, {
          request_start_date: format(remaining.from!, 'yyyy-MM-dd'),
          request_end_date: format(remaining.to!, 'yyyy-MM-dd')
        })
      } else {
        // Multiple remaining date ranges - update first, create new for others
        const firstRemaining = remainingDates[0]
        await timeOffRequestsRealtimeService.update(requestId, {
          request_start_date: format(firstRemaining.from!, 'yyyy-MM-dd'),
          request_end_date: format(firstRemaining.to!, 'yyyy-MM-dd')
        })
        
        // Create new pending requests for additional remaining ranges
        for (let i = 1; i < remainingDates.length; i++) {
          const remaining = remainingDates[i]
          await timeOffRequestsRealtimeService.create({
            doctor_id: pendingRequest.doctor_id,
            request_start_date: format(remaining.from!, 'yyyy-MM-dd'),
            request_end_date: format(remaining.to!, 'yyyy-MM-dd'),
            type: pendingRequest.type,
            reason: pendingRequest.reason || 'Remaining dates from partial approval',
            notes: pendingRequest.notes || '',
            status: 'pending'
          })
        }
      }
      
      // Clear cache and refresh
      optimizedAbsencesService.clearCache()
      await fetchData()
      
      // Reset partial approval state
      setPartialApprovalMode(null)
      setPartialApprovalRange({from: null, to: null})
      setPendingRequestPopoverCell(null)
    } catch (error) {
      console.error('Failed to partially approve request:', error)
      alert(`Failed to partially approve request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsActionLoading(null)
    }
  }, [pendingRequests, fetchData])
  
  // Function to update the status of a pending request
  const handlePendingRequestStatusUpdate = useCallback(async (requestId: string, newStatus: 'approved' | 'rejected') => {
    if (!requestId) return
    
    // Find the pending request
    const pendingRequest = pendingRequests.find(req => req.id === requestId)
    if (!pendingRequest) return
    
    // Handle status change - REAL-TIME UPDATE
    setIsActionLoading(`status_${requestId}`)
    
    // Close the popover immediately
    setPendingRequestPopoverCell(null)
    
    try {
      // Update the pending request status
      await timeOffRequestsRealtimeService.updateStatus(requestId, newStatus)
      
      // Clear cache immediately to ensure fresh data is fetched
      // This ensures the newly approved request appears in the table right away
      optimizedAbsencesService.clearCache()
      
      await fetchData()
      // Real-time updates will also trigger a refresh, but we refresh immediately here for instant feedback
    } catch (error) {
      console.error(`Failed to ${newStatus} pending request:`, error)
      alert(`Failed to ${newStatus} request. Please try again.`)
    } finally {
      setIsActionLoading(null)
    }
  }, [pendingRequests, fetchData])

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader 
          title={`Absence Report - ${format(month, 'MMMM yyyy')}`}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
            <div className="px-4 pt-4 lg:px-6 lg:pt-6">
              <PendingRequestsWidget />
            </div>
            {/* Header */}
            <div className="px-4 lg:px-6">
              <div className="flex items-center justify-between mb-6 w-full flex-wrap gap-4">
                <div>
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
                    {/* Real-time connection status indicator */}
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md text-xs">
                      <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                           title={isRealtimeConnected ? 'Real-time connected' : 'Real-time disconnected'} />
                      <span className={isRealtimeConnected ? 'text-green-700' : 'text-red-700'}>
                        {isRealtimeConnected ? 'Live' : 'Offline'}
                      </span>
                    </div>
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRefresh} 
                      disabled={isRefreshing || loading}
                      className="group"
                      title={isRefreshing ? "Refreshing..." : "Refresh data"}
                    >
                      <RotateCcw className={`h-4 w-4 transition-transform duration-200 ${isRefreshing ? 'animate-spin' : 'group-hover:scale-110 group-hover:-rotate-180'}`} />
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
                      {/* Date headers with refined styling - clickable for summary popover */}
                      {days.map((day) => {
                        const holiday = getHolidayForDay(day)
                        const isDateSelected = selectedDateForSummary ? isEqual(day, selectedDateForSummary) : false
                        const absenceCounts = getAbsenceTypeCountsForDay(day)
                        const totalAbsences = Object.values(absenceCounts).reduce((sum, count) => sum + count, 0)
                        
                        return (
                          <Popover 
                            key={day.toISOString()}
                            open={isDateSelected}
                            onOpenChange={(open) => setSelectedDateForSummary(open ? day : null)}
                          >
                            <PopoverTrigger asChild>
                              <div
                                className={`py-0.5 px-0.5 border-r border-gray-200 font-medium text-center text-[10px] relative flex flex-col justify-center min-h-[20px] cursor-pointer transition-colors ${
                                  isSaturday(day) && !holiday ? "bg-gray-50" : "bg-white"
                                } ${
                                  isToday(day) && !holiday ? "bg-blue-50 border-blue-200" : ""
                                } ${
                                  holiday ? HOLIDAY_COLOR : ""
                                } ${
                                  !holiday ? "hover:bg-gray-100" : ""
                                }`}
                                title={holiday ? holiday.name : `Click to see absence summary for ${format(day, "MMMM d, yyyy")}`}
                              >
                                <div className="font-bold text-[9px] truncate text-gray-600">
                                  {format(day, "EEE")}
                                </div>
                                <div className="text-[11px] font-semibold truncate text-gray-900">
                                  {format(day, "d")}
                                </div>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-64 p-3" 
                              side="bottom" 
                              align="start"
                              sideOffset={5}
                            >
                              <div className="space-y-2">
                                <h3 className="font-semibold text-sm mb-3">
                                  {format(day, "MMMM d, yyyy")}
                                </h3>
                                
                                {totalAbsences === 0 ? (
                                  <p className="text-sm text-gray-500">No absences on this day</p>
                                ) : (
                                  <>
                                    <div className="space-y-1.5">
                                      {(Object.keys(absenceCounts) as AbsenceType[]).map((type) => {
                                        const count = absenceCounts[type]
                                        if (count === 0) return null
                                        
                                        return (
                                          <div 
                                            key={type} 
                                            className="flex items-center justify-between text-sm"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span>{ABSENCE_EMOJIS[type]}</span>
                                              <span className={ABSENCE_COLORS[type].split(' ')[1] || 'text-gray-700'}>
                                                {type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                              </span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{count}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                    
                                    <div className="pt-2 mt-2 border-t border-gray-200">
                                      <div className="flex items-center justify-between text-sm font-semibold">
                                        <span>Total</span>
                                        <span className="text-gray-900">{totalAbsences}</span>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
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