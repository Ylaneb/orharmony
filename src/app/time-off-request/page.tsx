"use client"

import { useState, useEffect } from 'react'
import { timeOffRequestsService } from '@/lib/services/time-off-requests'
import { doctorsService } from '@/lib/services/doctors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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
    request_start_date: '',
    request_end_date: '',
    reason: '',
    type: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSuccess(false)
    setError('')
    // Validate required fields
    const errors: { [key: string]: string } = {}
    if (!form.doctor_id) errors.doctor_id = 'Doctor is required'
    if (!startDate) errors.request_start_date = 'Start date is required'
    if (!endDate) errors.request_end_date = 'End date is required'
    if (!form.type) errors.type = 'Type is required'
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setIsSubmitting(false)
      return
    }
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
      setForm({
        doctor_id: '',
        request_start_date: '',
        request_end_date: '',
        reason: '',
        type: '',
        notes: ''
      })
      setStartDate(undefined)
      setEndDate(undefined)
      setOneDay(false)
      setValidationErrors({})
    } catch (err: any) {
      setError(err.message || 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Request Time Off</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="doctor_id">Doctor *</Label>
              <Select value={form.doctor_id} onValueChange={v => handleChange('doctor_id', v)}>
                <SelectTrigger className={validationErrors.doctor_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.doctor_id && <p className="text-sm text-red-500">{validationErrors.doctor_id}</p>}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox id="one_day" checked={oneDay} onCheckedChange={checked => setOneDay(!!checked)} />
              <Label htmlFor="one_day">One day</Label>
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground',
                      validationErrors.request_start_date ? 'border-red-500' : ''
                    )}
                  >
                    {startDate ? format(startDate, 'PPP') : 'Pick a start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    fromYear={1960}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
              {validationErrors.request_start_date && <p className="text-sm text-red-500">{validationErrors.request_start_date}</p>}
            </div>
            {!oneDay && (
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground',
                        validationErrors.request_end_date ? 'border-red-500' : ''
                      )}
                    >
                      {endDate ? format(endDate, 'PPP') : 'Pick an end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      fromYear={1960}
                      toYear={2030}
                    />
                  </PopoverContent>
                </Popover>
                {validationErrors.request_end_date && <p className="text-sm text-red-500">{validationErrors.request_end_date}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={form.type} onValueChange={v => handleChange('type', v)}>
                <SelectTrigger className={validationErrors.type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OFF_TYPES.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.type && <p className="text-sm text-red-500">{validationErrors.type}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea value={form.reason} onChange={e => handleChange('reason', e.target.value)} rows={2} className={validationErrors.reason ? 'border-red-500' : ''} />
              {validationErrors.reason && <p className="text-sm text-red-500">{validationErrors.reason}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={2} />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">Request submitted successfully!</div>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 