"use client"

import { useState, useEffect, useRef } from 'react'
import { timeOffRequestsService } from '@/lib/services/time-off-requests'
import { doctorsService } from '@/lib/services/doctors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { UserIcon, FileTextIcon, ClockIcon } from 'lucide-react'

const TIME_OFF_TYPES = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' }
]

const TIME_OFF_REASONS = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' }
]

export default function TimeOffRequestPage() {
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    doctor_id: '',
    type: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Smooth scroll behavior setup
  useEffect(() => {
    // Enable smooth scrolling for the entire page
    document.documentElement.style.scrollBehavior = 'smooth'
    
    // Add CSS for better scroll performance
    const style = document.createElement('style')
    style.setAttribute('data-smooth-scroll', 'true')
    style.textContent = `
      html {
        scroll-behavior: smooth;
      }
      body {
        overflow-x: hidden;
      }
      .calendar-container {
        transform: translateZ(0);
        will-change: transform;
      }
      @media (max-width: 768px) {
        .calendar-container {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) translateZ(0) !important;
          max-height: 90vh;
          overflow-y: auto;
        }
      }
    `
    document.head.appendChild(style)
    
    // Optimize viewport for mobile
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    }
    
    return () => {
      document.documentElement.style.scrollBehavior = 'auto'
      const existingStyle = document.head.querySelector('style[data-smooth-scroll="true"]')
      if (existingStyle) {
        existingStyle.remove()
      }
      // Restore original viewport
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1')
      }
    }
  }, [])

  // Handle calendar open/close to prevent layout shifts
  useEffect(() => {
    if (isCalendarOpen) {
      // Add padding to prevent content jump when calendar opens
      document.body.style.paddingBottom = '400px'
      document.body.style.transition = 'padding-bottom 0.3s ease'
      
      // Ensure the viewport is properly positioned
      const viewportHeight = window.innerHeight
      const containerTop = containerRef.current?.getBoundingClientRect().top || 0
      
      if (containerTop < 0) {
        // Smooth scroll to bring the container into view
        setTimeout(() => {
          containerRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          })
        }, 50)
      }
    } else {
      // Remove padding when calendar closes
      document.body.style.paddingBottom = '0'
    }

    return () => {
      document.body.style.paddingBottom = '0'
      document.body.style.transition = ''
    }
  }, [isCalendarOpen])

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const data = await doctorsService.getAll()
        setDoctors(data.map((doc: any) => ({ id: doc.id, name: doc.name })))
      } catch {
        setDoctors([])
      }
    }
    fetchDoctors()
  }, [])

  // Real-time validation when dates change
  useEffect(() => {
    const errors: { [key: string]: string } = {}
    
    // Validate date range
    if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
      errors.dateRange = 'End date must be after start date'
    }
    
    // Validate future dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dateRange.from && dateRange.from < today) {
      errors.dateRange = 'Start date cannot be in the past'
    }
    if (dateRange.to && dateRange.to < today) {
      errors.dateRange = 'End date cannot be in the past'
    }
    
    // Validate maximum range (30 days)
    if (dateRange.from && dateRange.to) {
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 30) {
        errors.dateRange = 'Time off request cannot exceed 30 days'
      }
    }
    
    // Update validation errors
    setValidationErrors(prev => ({
      ...prev,
      ...errors
    }))
  }, [dateRange])

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    
    if (!form.doctor_id) errors.doctor_id = 'Doctor is required'
    if (!dateRange.from) errors.dateRange = 'Start date is required'
    if (!dateRange.to) errors.dateRange = 'End date is required'
    if (!form.type) errors.type = 'Type is required'
    
    // Validate date range
    if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
      errors.dateRange = 'End date must be after start date'
    }
    
    // Validate future dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dateRange.from && dateRange.from < today) {
      errors.dateRange = 'Start date cannot be in the past'
    }
    if (dateRange.to && dateRange.to < today) {
      errors.dateRange = 'End date cannot be in the past'
    }
    
    // Validate maximum range (30 days)
    if (dateRange.from && dateRange.to) {
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 30) {
        errors.dateRange = 'Time off request cannot exceed 30 days'
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    setSuccess(false)
    setError('')
    
    try {
      const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
      const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
      
      // Check for conflicts before creating the request
      const conflicts = await timeOffRequestsService.checkForConflicts(
        form.doctor_id,
        startDate,
        endDate
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
        
        setError(`This request conflicts with an existing request: ${conflictMessages.join('; ')}. Please choose different dates.`)
        setIsSubmitting(false)
        return
      }
      
      await timeOffRequestsService.create({
        doctor_id: form.doctor_id,
        request_start_date: startDate,
        request_end_date: endDate,
        reason: 'Time off request',
        type: form.type as any
      })
      
      setSuccess(true)
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({
      doctor_id: '',
      type: ''
    })
    setDateRange({
      from: undefined,
      to: undefined
    } as DateRange)
    setValidationErrors({})
  }

  // Handle calendar state changes
  const handleCalendarOpenChange = (open: boolean) => {
    setIsCalendarOpen(open)
    
    if (open && containerRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
          if (!isVisible) {
            containerRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest',
              inline: 'nearest'
            })
          }
        }
      })
    }
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-3 sm:py-6 sm:px-4"
      style={{ 
        scrollBehavior: 'smooth',
        willChange: 'scroll-position'
      }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Request Time Off</h1>
          <p className="text-sm sm:text-base text-gray-600">Submit your time off request for approval</p>
        </div>
        
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Time Off Request Form
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Doctor Selection Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-700">
                  <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <span>Doctor Information</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor_id" className="text-sm font-medium">Doctor *</Label>
                  <Select value={form.doctor_id} onValueChange={v => handleChange('doctor_id', v)}>
                    <SelectTrigger className={cn(
                      "h-10 sm:h-12 text-sm sm:text-base",
                      validationErrors.doctor_id ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                    )}>
                      <SelectValue placeholder="Select a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.doctor_id && (
                    <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {validationErrors.doctor_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Date Selection Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-700">
                  <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span>Date Range</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select Date Range *</Label>
                  <div className="relative">
                    <DateRangePicker
                      placeholder="Pick a date range"
                      value={dateRange}
                      onValueChange={setDateRange}
                      error={validationErrors.dateRange}
                      minDate={new Date()}
                      maxRange={30} // Maximum 30 days for time off requests
                      showQuickSelect={true}
                      onOpenChange={handleCalendarOpenChange}
                    />
                  </div>
                  {validationErrors.dateRange && (
                    <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {validationErrors.dateRange}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Maximum 30 days allowed for time off requests
                  </p>
                </div>
              </div>

              {/* Request Details Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-700">
                  <FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  <span>Request Details</span>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-sm font-medium">Type *</Label>
                  <Select value={form.type} onValueChange={v => handleChange('type', v)}>
                    <SelectTrigger className={cn(
                      "h-10 sm:h-12 text-sm sm:text-base",
                      validationErrors.type ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                    )}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OFF_TYPES.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.type && (
                    <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {validationErrors.type}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-xs sm:text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-xs sm:text-sm font-medium">Request submitted successfully!</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 sm:pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs sm:text-sm">Submitting...</span>
                    </div>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 