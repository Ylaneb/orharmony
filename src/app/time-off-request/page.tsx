"use client"

import { useState, useEffect } from 'react'
import { timeOffRequestsService } from '@/lib/services/time-off-requests'
import { doctorsService } from '@/lib/services/doctors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
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

export default function TimeOffRequestPage() {
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    doctor_id: '',
    type: '',
    reason: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [oneDay, setOneDay] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)


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

  useEffect(() => {
    if (oneDay && startDate) {
      setEndDate(startDate)
    }
  }, [oneDay, startDate])

  // Real-time validation when dates change
  useEffect(() => {
    const errors: { [key: string]: string } = {}
    
    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      errors.request_end_date = 'End date must be after start date'
    }
    
    // Validate future dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (startDate && startDate < today) {
      errors.request_start_date = 'Start date cannot be in the past'
    }
    if (endDate && endDate < today) {
      errors.request_end_date = 'End date cannot be in the past'
    }
    
    // Update validation errors
    setValidationErrors(prev => ({
      ...prev,
      ...errors
    }))
  }, [startDate, endDate])

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
    if (!startDate) errors.request_start_date = 'Start date is required'
    if (!endDate) errors.request_end_date = 'End date is required'
    if (!form.type) errors.type = 'Type is required'
    
    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      errors.request_end_date = 'End date must be after start date'
    }
    
    // Validate future dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (startDate && startDate < today) {
      errors.request_start_date = 'Start date cannot be in the past'
    }
    if (endDate && endDate < today) {
      errors.request_end_date = 'End date cannot be in the past'
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
      await timeOffRequestsService.create({
        doctor_id: form.doctor_id,
        request_start_date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
        request_end_date: endDate ? format(endDate, 'yyyy-MM-dd') : '',
        reason: form.reason,
        type: form.type as any,
        notes: form.notes
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
      type: '',
      reason: '',
      notes: ''
    })
    setStartDate(undefined)
    setEndDate(undefined)
    setOneDay(false)
    setValidationErrors({})
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Time Off</h1>
          <p className="text-gray-600">Submit your time off request for approval</p>
        </div>
        
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Time Off Request Form
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Doctor Selection Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                  <span>Doctor Information</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor_id" className="text-sm font-medium">Doctor *</Label>
                  <Select value={form.doctor_id} onValueChange={v => handleChange('doctor_id', v)}>
                    <SelectTrigger className={cn(
                      "h-12 text-base",
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
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {validationErrors.doctor_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Date Selection Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                  <ClockIcon className="h-5 w-5 text-green-600" />
                  <span>Date Range</span>
                </div>
                
                {/* One Day Toggle */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox 
                    id="one_day" 
                    checked={oneDay} 
                    onCheckedChange={checked => setOneDay(!!checked)} 
                  />
                  <Label htmlFor="one_day" className="text-sm font-medium cursor-pointer">
                    Single day request
                  </Label>
                </div>

                {/* Date Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DatePicker
                    label="Start Date *"
                    placeholder="Pick a start date"
                    value={startDate}
                    onValueChange={setStartDate}
                    error={validationErrors.request_start_date}
                    minDate={new Date()}
                  />

                  {!oneDay && (
                    <DatePicker
                      label="End Date *"
                      placeholder="Pick an end date"
                      value={endDate}
                      onValueChange={setEndDate}
                      error={validationErrors.request_end_date}
                      minDate={startDate || new Date()}
                    />
                  )}
                </div>
              </div>

              {/* Request Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                  <FileTextIcon className="h-5 w-5 text-purple-600" />
                  <span>Request Details</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm font-medium">Type *</Label>
                    <Select value={form.type} onValueChange={v => handleChange('type', v)}>
                      <SelectTrigger className={cn(
                        "h-12 text-base",
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
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        {validationErrors.type}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-medium">Reason</Label>
                  <Textarea 
                    value={form.reason} 
                    onChange={e => handleChange('reason', e.target.value)} 
                    rows={3} 
                    className="text-base resize-none focus:ring-blue-500"
                    placeholder="Briefly describe the reason for your time off request..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">Additional Notes</Label>
                  <Textarea 
                    value={form.notes} 
                    onChange={e => handleChange('notes', e.target.value)} 
                    rows={3} 
                    className="text-base resize-none focus:ring-blue-500"
                    placeholder="Any additional information or special requirements..."
                  />
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm font-medium">Request submitted successfully!</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
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