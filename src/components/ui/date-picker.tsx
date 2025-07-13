"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DayPicker } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import "react-day-picker/dist/style.css"

interface DatePickerProps {
  label?: string
  placeholder?: string
  value?: Date
  onValueChange?: (date: Date | undefined) => void
  error?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  className?: string
}

export function DatePicker({
  label,
  placeholder = "Pick a date",
  value,
  onValueChange,
  error,
  disabled = false,
  minDate,
  maxDate,
  className
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState<Date>(value || new Date())

  React.useEffect(() => {
    if (value) {
      setCurrentMonth(value)
    }
  }, [value])

  const handleDateSelect = (date: Date | undefined) => {
    console.log('Date selected:', date)
    
    // Don't allow past dates
    if (date && date < new Date(new Date().setHours(0, 0, 0, 0))) {
      return
    }
    
    onValueChange?.(date)
    setOpen(false)
  }

  // Debug: Log today's date
  React.useEffect(() => {
    const today = new Date()
    console.log('Today is:', today.toDateString())
  }, [])

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
        </Label>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full h-12 justify-start text-left font-normal text-base",
              !value && "text-muted-foreground",
              error && "border-red-500 focus:ring-red-500",
              !error && "focus:ring-blue-500"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : placeholder}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent align="start" className="w-auto p-0 border-0 shadow-2xl">
          {/* Header */}
          <div className="p-3 bg-gradient-to-br from-gray-50 to-blue-50 rounded-t-lg border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                {label || "Select Date"}
              </h3>
              <button
                className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center"
                onClick={() => {
                  const today = new Date()
                  setCurrentMonth(today)
                  if (!value) {
                    onValueChange?.(today)
                  }
                }}
                type="button"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                Today
              </button>
            </div>
          </div>
          
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
              selected={value}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              fromYear={minDate?.getFullYear() || new Date().getFullYear() - 1}
              toYear={maxDate?.getFullYear() || new Date().getFullYear() + 2}
              disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
              modifiers={{ today: new Date() }}
              modifiersClassNames={{ today: "!bg-blue-100 !text-blue-900 !font-semibold !ring-2 !ring-blue-300 !border-2 !border-blue-400 !shadow-lg !z-10" }}
              className="p-0"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "hidden", // Hide the built-in caption since we have our own
                caption_label: "text-sm font-medium",
                nav: "hidden", // Hide the built-in navigation
                nav_button: "hidden",
                nav_button_previous: "hidden",
                nav_button_next: "hidden",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(
                  "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                ),
                day_range_end: "day-range-end",
                day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white",
                day_today: "!bg-blue-100 !text-blue-900 !font-semibold !ring-2 !ring-blue-300 !border-2 !border-blue-400 !shadow-lg !z-10",
                day_outside: "day-outside text-gray-400 opacity-50 aria-selected:bg-accent/50 aria-selected:text-gray-400 aria-selected:opacity-30",
                day_disabled: "text-gray-400 opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
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