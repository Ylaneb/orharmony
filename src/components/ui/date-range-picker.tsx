"use client"

import * as React from "react"
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, isSameDay, isToday, isWeekend } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DayPicker, DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import "react-day-picker/dist/style.css"

interface DateRangePickerProps {
  label?: string
  placeholder?: string
  value?: DateRange
  onValueChange?: (range: DateRange) => void
  onOpenChange?: (open: boolean) => void
  error?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  className?: string
  showQuickSelect?: boolean
  maxRange?: number // Maximum number of days allowed in range
}

export function DateRangePicker({
  label,
  placeholder = "Pick a date range",
  value,
  onValueChange,
  onOpenChange,
  error,
  disabled = false,
  minDate,
  maxDate,
  className,
  showQuickSelect = true,
  maxRange
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState<Date>(value?.from || new Date())
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(value)
  const [isSelecting, setIsSelecting] = React.useState(false)

  React.useEffect(() => {
    if (value?.from) {
      setCurrentMonth(value.from)
    }
  }, [value?.from])

  React.useEffect(() => {
    setTempRange(value)
  }, [value])

  // Handle open state changes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
    
    if (!newOpen) {
      // Reset temporary range when closing
      setTempRange(value)
      setIsSelecting(false)
    }
  }

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range) return

    // Validate range constraints
    const today = new Date(new Date().setHours(0, 0, 0, 0))
    
    // Don't allow past dates
    if (range.from && range.from < today) {
      range.from = today
    }
    if (range.to && range.to < today) {
      range.to = today
    }

    // Check max range constraint
    if (maxRange && range.from && range.to) {
      const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > maxRange) {
        range.to = addDays(range.from, maxRange - 1)
      }
    }

    setTempRange(range)
    setIsSelecting(true)
    
    // If we have both start and end dates, complete the selection
    if (range.from && range.to) {
      // Auto-close after a brief delay to show the selection
      setTimeout(() => {
        onValueChange?.(range)
        setOpen(false)
        setIsSelecting(false)
      }, 200)
    }
  }

  const handleDayClick = (day: Date) => {
    const today = new Date(new Date().setHours(0, 0, 0, 0))
    
    // Don't allow past dates
    if (day < today) return

    if (!tempRange?.from) {
      // First click - start the range
      const newRange = { from: day, to: undefined }
      setTempRange(newRange)
      setIsSelecting(true)
    } else if (!tempRange.to) {
      // Second click - complete the range
      let endDate = day
      
      // Ensure end date is not before start date
      if (day < tempRange.from) {
        endDate = tempRange.from
      }
      
      // Apply max range constraint
      if (maxRange) {
        const daysDiff = Math.ceil((endDate.getTime() - tempRange.from.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff > maxRange) {
          endDate = addDays(tempRange.from, maxRange - 1)
        }
      }
      
      const completedRange = { from: tempRange.from, to: endDate }
      setTempRange(completedRange)
      
      // Auto-close after brief delay
      setTimeout(() => {
        onValueChange?.(completedRange)
        setOpen(false)
        setIsSelecting(false)
      }, 200)
    } else {
      // Additional click - start over with new date
      const newRange = { from: day, to: undefined }
      setTempRange(newRange)
      setIsSelecting(true)
    }
  }

  const handleApplyRange = () => {
    if (tempRange) {
      onValueChange?.(tempRange)
      setOpen(false)
      setIsSelecting(false)
    }
  }

  const handleClearRange = () => {
    const emptyRange = { from: undefined, to: undefined }
    setTempRange(emptyRange)
    onValueChange?.(emptyRange)
    setOpen(false)
    setIsSelecting(false)
  }

  const quickSelectOptions = [
    { label: "Today", range: { from: new Date(), to: new Date() } },
    { label: "This Week", range: { from: startOfWeek(new Date()), to: endOfWeek(new Date()) } },
    { label: "Next Week", range: { from: startOfWeek(addWeeks(new Date(), 1)), to: endOfWeek(addWeeks(new Date(), 1)) } },
    { label: "Next Month", range: { from: new Date(), to: addMonths(new Date(), 1) } },
    { label: "3 Days", range: { from: new Date(), to: addDays(new Date(), 2) } },
    { label: "1 Week", range: { from: new Date(), to: addDays(new Date(), 6) } },
  ]

  const handleQuickSelect = (range: DateRange) => {
    // Apply constraints to quick select ranges
    const today = new Date(new Date().setHours(0, 0, 0, 0))
    
    if (range.from && range.from < today) {
      range.from = today
    }
    if (range.to && range.to < today) {
      range.to = today
    }

    // Apply max range constraint
    if (maxRange && range.from && range.to) {
      const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > maxRange) {
        range.to = addDays(range.from, maxRange - 1)
      }
    }

    setTempRange(range)
    onValueChange?.(range)
    
    // Auto-close after brief delay to show the selection
    setTimeout(() => {
      setOpen(false)
      setIsSelecting(false)
    }, 200)
  }

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return placeholder
    
    if (range.from && range.to) {
      if (isSameDay(range.from, range.to)) {
        return format(range.from, "PPP")
      }
      const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
      return `${format(range.from, "MMM dd")} - ${format(range.to, "MMM dd, yyyy")} (${daysDiff} days)`
    }
    
    return format(range.from, "PPP")
  }

  const getRangeInfo = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return null
    
    const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
    const weekends = Array.from({ length: daysDiff + 1 }, (_, i) => {
      const date = addDays(range.from!, i)
      return isWeekend(date)
    }).filter(Boolean).length
    
    return { days: daysDiff + 1, weekends }
  }

  const rangeInfo = getRangeInfo(tempRange)

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
        </Label>
      )}
      
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full h-12 justify-start text-left font-normal text-base relative group",
              !value?.from && "text-muted-foreground",
              error && "border-red-500 focus:ring-red-500",
              !error && "focus:ring-blue-500",
              "hover:bg-gray-50 transition-colors"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            <span className="flex-1 text-left">{formatDateRange(value)}</span>
            {value?.from && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleClearRange()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent align="center" className="w-auto p-0 border-0 shadow-2xl calendar-container">
          {/* Header */}
          <div className="p-3 bg-gradient-to-br from-gray-50 to-blue-50 rounded-t-lg border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  {label || "Select Date Range"}
                </h3>
                {tempRange?.from && !tempRange?.to && (
                  <p className="text-xs text-blue-600 mt-1">
                    Click to select end date
                  </p>
                )}
                {!tempRange?.from && (
                  <p className="text-xs text-gray-500 mt-1">
                    Click to start date range
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isSelecting && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearRange}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleApplyRange}
                  disabled={!tempRange?.from || !tempRange?.to}
                  className="h-6 px-3 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Apply
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Select Options */}
          {showQuickSelect && (
            <div className="p-3 bg-gray-50 border-b border-gray-100">
              <div className="flex flex-wrap gap-1">
                {quickSelectOptions.map((option, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    onClick={() => handleQuickSelect(option.range)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Range Info */}
          {rangeInfo && (
            <div className="p-2 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center justify-between text-xs text-blue-700">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {rangeInfo.days} days
                </span>
                {rangeInfo.weekends > 0 && (
                  <span className="text-blue-600">
                    {rangeInfo.weekends} weekend{rangeInfo.weekends > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Selection State Indicator */}
          {tempRange?.from && !tempRange?.to && (
            <div className="p-2 bg-yellow-50 border-b border-yellow-100">
              <div className="flex items-center justify-between text-xs text-yellow-700">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Start: {format(tempRange.from, "MMM dd, yyyy")}
                </span>
                <span className="text-yellow-600 font-medium">
                  Select end date
                </span>
              </div>
            </div>
          )}
          
          {/* Month Navigation Section */}
          <div className="p-3 bg-white border-b border-gray-100">
            <div className="flex items-center justify-between">
              <button
                className="h-7 w-7 p-0 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                  setCurrentMonth(newMonth)
                }}
                disabled={minDate && new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1) < minDate}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <span className="text-sm font-medium text-gray-700">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              
              <button
                className="h-7 w-7 p-0 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  setCurrentMonth(newMonth)
                }}
                disabled={maxDate && new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1) > maxDate}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Calendar */}
          <div className="p-3">
            <DayPicker
              mode="single"
              selected={tempRange?.from}
              onSelect={(day) => day && handleDayClick(day)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              numberOfMonths={2}
              fromYear={minDate?.getFullYear() || new Date().getFullYear() - 1}
              toYear={maxDate?.getFullYear() || new Date().getFullYear() + 2}
              disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
              modifiers={{ 
                today: new Date(),
                weekend: (date) => isWeekend(date),
                rangeStart: tempRange?.from,
                rangeEnd: tempRange?.to,
                inRange: (date) => {
                  if (!tempRange?.from || !tempRange?.to) return false
                  return date >= tempRange.from && date <= tempRange.to
                }
              }}
              modifiersClassNames={{ 
                today: "!bg-blue-100 !text-blue-900 !font-semibold !ring-2 !ring-blue-300 !border-2 !border-blue-400 !shadow-lg !z-10",
                weekend: "text-red-600",
                rangeStart: "!bg-blue-600 !text-white !font-semibold",
                rangeEnd: "!bg-blue-600 !text-white !font-semibold",
                inRange: "!bg-blue-200 !text-blue-900"
              }}
              className="p-0"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "hidden",
                caption_label: "text-sm font-medium",
                nav: "hidden",
                nav_button: "hidden",
                nav_button_previous: "hidden",
                nav_button_next: "hidden",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(
                  "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-blue-100 rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                ),
                day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white",
                day_today: "!bg-blue-100 !text-blue-900 !font-semibold !ring-2 !ring-blue-300 !border-2 !border-blue-400 !shadow-lg !z-10",
                day_outside: "day-outside text-gray-400 opacity-50 aria-selected:bg-accent/50 aria-selected:text-gray-400 aria-selected:opacity-30",
                day_disabled: "text-gray-400 opacity-50 cursor-not-allowed",
                day_hidden: "invisible",
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
      
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
          {error}
        </p>
      )}
    </div>
  )
} 