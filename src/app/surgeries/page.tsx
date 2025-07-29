"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Calendar, Clock, Building2, AlertCircle, User, CheckCircle, Zap, Users, Check } from 'lucide-react'
import { surgeriesService } from '@/lib/services/surgeries'
import { operatingRoomsService } from '@/lib/services/operating-rooms'
import { SURGERY_TYPES, SLOT_TYPES, type Surgery, type CreateSurgeryData } from '@/lib/data/surgeries'
import { useEffect, useState, useCallback } from 'react'
import { ScheduleSurgeryForm } from '@/components/schedule-surgery-form'
import { AssignDoctorForm } from '@/components/assign-doctor-form'
import { doctorsService } from '@/lib/services/doctors'
import { assignmentsService } from '@/lib/services/assignments'
import { timeOffRequestsService } from '@/lib/services/time-off-requests'

// Force dynamic rendering to prevent build-time date issues
export const dynamic = 'force-dynamic'

interface SurgeryFormData {
  room_id: string
  date: string
  time_slot: 'morning' | 'evening'
  surgery_type: string
  notes: string
}

export default function SurgeriesPage() {
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [operatingRooms, setOperatingRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentWeek, setCurrentWeek] = useState<string>('')
  const [formData, setFormData] = useState<SurgeryFormData>({
    room_id: '',
    date: '',
    time_slot: 'morning',
    surgery_type: '',
    notes: ''
  })
  const [editFormData, setEditFormData] = useState<SurgeryFormData>({
    room_id: '',
    date: '',
    time_slot: 'morning',
    surgery_type: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [isDoctorAssignSheetOpen, setIsDoctorAssignSheetOpen] = useState(false)
  const [doctorAssignFormData, setDoctorAssignFormData] = useState({
    doctor_id: '',
    operating_room_id: '',
    date: '',
    shift_type: 'morning' as 'morning' | 'evening',
    role: 'Primary' as 'Primary' | 'Secondary',
    notes: ''
  })
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([])
  const [isDoctorAssignSubmitting, setIsDoctorAssignSubmitting] = useState(false)
  const [doctorAssignValidationErrors, setDoctorAssignValidationErrors] = useState<{ [key: string]: string }>({})
  const [assignments, setAssignments] = useState<any[]>([])
  const [previousWeekSurgeries, setPreviousWeekSurgeries] = useState<Surgery[]>([])
  // Add state for selected assignment and edit mode
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null)
  const [isAssignmentDetailSheetOpen, setIsAssignmentDetailSheetOpen] = useState(false)
  const [isEditingAssignment, setIsEditingAssignment] = useState(false)
  const [quickAddingSlot, setQuickAddingSlot] = useState<string | null>(null)
  // Add state for editDoctors
  const [editDoctors, setEditDoctors] = useState<{ id: string; name: string }[]>([])
  // Add state for selected surgery type for smart assignment
  const [selectedSurgeryType, setSelectedSurgeryType] = useState<string>('')

  // Get current week (Today + next 6 days) - client-side only
  const getCurrentWeek = () => {
    if (typeof window === 'undefined') return '2024-01-01' // Fallback for SSR
    const today = new Date()
    // Use a safer date formatting method
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const dayOfMonth = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${dayOfMonth}`
  }

  // Generate week days (7 days starting from weekStart) - client-side only
  const getWeekDays = (weekStart: string) => {
    if (typeof window === 'undefined') return [] // Fallback for SSR
    const days = []
    const start = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      // Use safer date formatting
      const year = day.getFullYear()
      const month = String(day.getMonth() + 1).padStart(2, '0')
      const dayOfMonth = String(day.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${dayOfMonth}`
      
      days.push({
        date: dateString,
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: day.getDate(),
        isToday: day.toDateString() === new Date().toDateString()
      })
    }
    return days
  }

  // New: Filter available doctors for assignment
  const getAvailableDoctors = useCallback(async (date: string, shift_type: 'morning' | 'evening') => {
    // 1. Get all active doctors
    const allDoctors = await doctorsService.getActive()
    // 2. Get all approved time off requests for this date
    const timeOffs = await timeOffRequestsService.getApprovedForDate(date)
    const unavailableDoctorIds = new Set(timeOffs.map((t: any) => t.doctor_id))
    // 3. Get all assignments for this date and shift
    const assignedDoctorIds = new Set(assignments
      .filter(a => a.date === date && a.shift_type === shift_type)
      .map(a => a.doctor_id))
    // 4. Filter out unavailable doctors
    return allDoctors.filter((doc: any) =>
      !unavailableDoctorIds.has(doc.id) && !assignedDoctorIds.has(doc.id)
    ).map((doc: any) => ({ id: doc.id, name: doc.name }))
  }, [assignments])

  useEffect(() => {
    const weekStart = getCurrentWeek()
    setCurrentWeek(weekStart)
    fetchData(weekStart)
  }, [])

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const data = await doctorsService.getAll()
        setDoctors(data.map((doc: any) => ({ id: doc.id, name: doc.name })))
      } catch (e) {
        setDoctors([])
      }
    }
    fetchDoctors()
  }, [])

  useEffect(() => {
    if (selectedAssignment && isEditingAssignment) {
      (async () => {
        const available = await getAvailableDoctors(selectedAssignment.date, selectedAssignment.shift_type)
        // Always include the currently assigned doctor in the list
        if (selectedAssignment.doctor_id && !available.some(d => d.id === selectedAssignment.doctor_id)) {
          const current = doctors.find(d => d.id === selectedAssignment.doctor_id)
          if (current) available.push({ id: current.id, name: current.name })
        }
        setEditDoctors(available)
      })()
    }
  }, [selectedAssignment, isEditingAssignment, doctors, getAvailableDoctors])

  const fetchData = async (weekStart: string) => {
    setLoading(true)
    try {
      const prevWeekStartDate = new Date(weekStart)
      prevWeekStartDate.setDate(prevWeekStartDate.getDate() - 7)
      const prevWeekStart = prevWeekStartDate.toISOString().split('T')[0]

      const [surgeriesData, prevSurgeriesData, roomsData, assignmentsData] = await Promise.all([
        surgeriesService.getByWeek(weekStart),
        surgeriesService.getByWeek(prevWeekStart),
        operatingRoomsService.getAll(),
        assignmentsService.getByWeek(weekStart)
      ])
      
      // Sort rooms by room_number in ascending (croissant) order.
      const sortedRooms = roomsData.sort((a: any, b: any) => 
        String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true })
      )
      
      setSurgeries(surgeriesData)
      setPreviousWeekSurgeries(prevSurgeriesData)
      setOperatingRooms(sortedRooms)
      setAssignments(assignmentsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const weekDays = getWeekDays(currentWeek)

  const getSuggestionForSlot = (roomId: string, date: string, timeSlot: 'morning' | 'evening') => {
    const prevDate = new Date(date)
    prevDate.setDate(prevDate.getDate() - 7)
    const prevDateString = prevDate.toISOString().split('T')[0]

    return previousWeekSurgeries.find(s =>
      s.room_id === roomId &&
      s.date === prevDateString &&
      s.time_slot === timeSlot
    )
  }

  const getAssignmentForSlot = (roomId: string, date: string, shiftType: 'morning' | 'evening') => {
    return assignments.filter(a =>
      a.operating_room_id === roomId &&
      a.date === date &&
      a.shift_type === shiftType
    )
  }

  const getPrimaryDoctor = (assignments: any[]) => {
    return assignments.find(a => a.role === 'Primary')
  }

  const getSecondaryDoctor = (assignments: any[]) => {
    return assignments.find(a => a.role === 'Secondary')
  }

  // Don't render calendar until we have week data
  if (loading || !currentWeek || weekDays.length === 0) {
    return (
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading surgeries schedule...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const getSurgeryForSlot = (roomId: string, date: string, timeSlot: 'morning' | 'evening') => {
    return surgeries.find(s =>
      s.room_id === roomId &&
      s.date === date &&
      s.time_slot === timeSlot
    )
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear validation error when user starts typing
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
    
    try {
      // Validate required fields
      const errors: {[key: string]: string} = {}
      if (!formData.room_id) errors.room_id = 'Room is required'
      if (!formData.date) errors.date = 'Date is required'
      if (!formData.surgery_type) errors.surgery_type = 'Surgery type is required'
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        setIsSubmitting(false)
        return
      }

      await surgeriesService.create({
        room_id: formData.room_id,
        date: formData.date,
        time_slot: formData.time_slot,
        surgery_type: formData.surgery_type,
        notes: formData.notes
      })
      
      setIsSheetOpen(false)
      setFormData({
        room_id: '',
        date: '',
        time_slot: 'morning',
        surgery_type: '',
        notes: ''
      })
      setValidationErrors({})
      await fetchData(currentWeek) // Refetch data
      
    } catch (error) {
      console.error('Error creating surgery:', error)
      alert(`Error creating surgery: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openSurgeryDetail = (surgery: Surgery) => {
    setSelectedSurgery(surgery)
    setIsDetailSheetOpen(true)
    setIsEditing(false)
  }

  const startEditing = () => {
    if (selectedSurgery) {
      setEditFormData({
        room_id: selectedSurgery.room_id,
        date: selectedSurgery.date,
        time_slot: selectedSurgery.time_slot || 'morning',
        surgery_type: selectedSurgery.surgery_type || '',
        notes: selectedSurgery.notes || ''
      })
      setIsEditing(true)
    }
  }

  const handleEditInputChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUpdateSurgery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSurgery) return
    
    setIsSubmitting(true)
    
    try {
      const updatedSurgery = await surgeriesService.update(selectedSurgery.id, {
        room_id: editFormData.room_id,
        date: editFormData.date,
        time_slot: editFormData.time_slot,
        surgery_type: editFormData.surgery_type,
        notes: editFormData.notes
      })
      
      setSurgeries(prev => prev.map(s => s.id === selectedSurgery.id ? updatedSurgery : s))
      setSelectedSurgery(updatedSurgery)
      setIsEditing(false)
      await fetchData(currentWeek) // Refetch data
      
    } catch (error) {
      console.error('Error updating surgery:', error)
      alert(`Error updating surgery: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSurgery = async () => {
    if (!selectedSurgery) return
    
    if (!confirm(`Are you sure you want to delete this surgery? This action cannot be undone.`)) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await surgeriesService.delete(selectedSurgery.id)
      setIsDetailSheetOpen(false)
      setSelectedSurgery(null)
      setIsEditing(false)
      await fetchData(currentWeek) // Refetch data
      
    } catch (error) {
      console.error('Error deleting surgery:', error)
      alert(`Error deleting surgery: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeek)
    if (direction === 'prev') {
      current.setDate(current.getDate() - 7)
    } else {
      current.setDate(current.getDate() + 7)
    }
    // Use safer date formatting
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    const dayOfMonth = String(current.getDate()).padStart(2, '0')
    const newWeekStart = `${year}-${month}-${dayOfMonth}`
    setCurrentWeek(newWeekStart)
    fetchData(newWeekStart)
  }

  // New: Open assign doctor sheet with filtered doctors
  const openDoctorAssignSheet = async (roomId: string, date: string, shift_type: 'morning' | 'evening') => {
    // Get the surgery for this slot to determine surgery type
    const surgery = getSurgeryForSlot(roomId, date, shift_type)
    const surgeryType = surgery?.surgery_type || ''
    
    setIsDoctorAssignSheetOpen(true)
    setDoctorAssignFormData({
      doctor_id: '',
      operating_room_id: roomId,
      date,
      shift_type,
      role: 'Primary',
      notes: ''
    })
    // Fetch available doctors for this slot
    const availableDoctors = await getAvailableDoctors(date, shift_type)
    setDoctors(availableDoctors)
    
    // Store surgery type for the form
    setSelectedSurgeryType(surgeryType)
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold">Surgery Schedule</h1>
                    <p className="text-muted-foreground">Manage operating room schedules and surgery assignments</p>
                  </div>
                  <div className="flex gap-2">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                      <SheetTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Schedule Surgery
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle>Schedule New Surgery</SheetTitle>
                          <SheetDescription>
                            Fill in the details to schedule a new surgery.
                          </SheetDescription>
                        </SheetHeader>
                        <ScheduleSurgeryForm
                          initialValues={{
                            room_id: formData.room_id || '',
                            date: formData.date || '',
                            time_slot: formData.time_slot || 'morning',
                            surgery_type: formData.surgery_type || '',
                            notes: formData.notes || ''
                          }}
                          rooms={operatingRooms}
                          onSubmit={async (values) => {
                            setIsSubmitting(true)
                            const errors: { [key: string]: string } = {}
                            if (!values.room_id) errors.room_id = 'Room is required'
                            if (!values.date) errors.date = 'Date is required'
                            if (!values.time_slot) errors.time_slot = 'Time slot is required'
                            if (!values.surgery_type) errors.surgery_type = 'Surgery type is required'
                            setValidationErrors(errors)
                            if (Object.keys(errors).length > 0) {
                              setIsSubmitting(false)
                              return
                            }
                            try {
                              const newSurgery = await surgeriesService.create({
                                room_id: values.room_id,
                                date: values.date,
                                time_slot: values.time_slot,
                                surgery_type: values.surgery_type,
                                notes: values.notes
                              })
                              setSurgeries(prev => [...prev, newSurgery])
                              setIsSheetOpen(false)
                              setFormData({
                                room_id: '',
                                date: '',
                                time_slot: 'morning',
                                surgery_type: '',
                                notes: ''
                              })
                              setValidationErrors({})
                            } catch (error) {
                              alert(`Error creating surgery: ${error instanceof Error ? error.message : 'Unknown error'}`)
                            } finally {
                              setIsSubmitting(false)
                            }
                          }}
                          onCancel={() => setIsSheetOpen(false)}
                          isSubmitting={isSubmitting}
                          validationErrors={validationErrors}
                        />
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>

                {/* Week Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                      Previous Week
                    </Button>
                    <span className="text-sm font-medium">
                      {new Date(currentWeek).toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })} - {new Date(new Date(currentWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric' 
                      })}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                      Next Week
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const today = getCurrentWeek()
                      setCurrentWeek(today)
                      fetchData(today)
                    }}
                  >
                    Today
                  </Button>
                </div>

                {/* Weekly Schedule Grid - Inverted Layout */}
                <div className="border rounded-lg overflow-x-auto">
                  <div className="bg-gray-50 border-b">
                    <div className="flex">
                      <div className="w-32 p-3 font-medium text-sm border-r sticky left-0 bg-gray-50 z-10">Day</div>
                      <div className="flex-1 grid gap-px" style={{ gridTemplateColumns: `repeat(${operatingRooms.length}, minmax(200px, 1fr))` }}>
                        {operatingRooms.map((room) => (
                          <div key={room.id} className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium">{room.room_number}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading schedule...</div>
                  ) : (
                    <div className="divide-y">
                      {weekDays.map((day) => (
                        <div key={day.date} className="flex">
                          <div className="w-32 p-3 bg-gray-50 border-r sticky left-0 z-10">
                            <div className="text-center">
                              <div className={`text-sm font-medium ${day.isToday ? 'text-blue-600' : ''}`}>
                                {day.dayName}
                              </div>
                              <div className={`text-xs ${day.isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                                {day.dayNumber}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 grid gap-px" style={{ gridTemplateColumns: `repeat(${operatingRooms.length}, minmax(200px, 1fr))` }}>
                            {operatingRooms.map((room) => {
                              const morningSlotId = `${room.id}-${day.date}-morning`
                              const eveningSlotId = `${room.id}-${day.date}-evening`
                              const isQuickAddingMorning = quickAddingSlot === morningSlotId
                              const isQuickAddingEvening = quickAddingSlot === eveningSlotId

                              return (
                              <div key={room.id} className="min-h-[300px] p-2 space-y-1">
                                {/* Morning Surgery Schedule */}
                                  {(() => {
                                    const surgery = getSurgeryForSlot(room.id, day.date, 'morning')
                                    const suggestion = !surgery ? getSuggestionForSlot(room.id, day.date, 'morning') : null

                                    return (
                                <div
                                        className={`h-12 rounded border-2 border-dashed cursor-pointer transition-colors relative ${
                                          isQuickAddingMorning
                                            ? 'border-blue-300 bg-blue-100'
                                            : surgery
                                      ? 'border-blue-200 bg-blue-50'
                                            : suggestion
                                            ? 'border-gray-300 bg-gray-50 opacity-90 hover:opacity-100'
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                  onClick={() => {
                                          if (isQuickAddingMorning || surgery) {
                                            if (surgery) openSurgeryDetail(surgery)
                                            return
                                          }
                                          // Open sheet for empty or suggestion
                                      setFormData({
                                        room_id: room.id,
                                        date: day.date,
                                        time_slot: 'morning',
                                            surgery_type: suggestion?.surgery_type || '',
                                            notes: '',
                                      })
                                      setIsSheetOpen(true)
                                  }}
                                >
                                        {isQuickAddingMorning ? (
                                          <div className="h-full flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                          </div>
                                        ) : surgery ? (
                                      <div className="h-full flex items-center justify-center text-xs font-medium text-blue-700">
                                        {surgery.surgery_type}
                                      </div>
                                        ) : suggestion ? (
                                          <div className="h-full flex items-center justify-center text-xs font-medium text-gray-500 relative w-full">
                                            <span title={`Suggested: ${suggestion.surgery_type}. Click slot to edit/schedule.`}>
                                              {suggestion.surgery_type}
                                            </span>
                                            <button
                                              className="absolute bottom-1 right-1 p-0.5 rounded-full bg-green-200 text-green-700 hover:bg-green-300 transition-colors"
                                              title={`Quick schedule ${suggestion.surgery_type}`}
                                              onClick={async (e) => {
                                                e.stopPropagation()
                                                setQuickAddingSlot(morningSlotId)
                                                try {
                                                  await surgeriesService.create({
                                                    room_id: room.id,
                                                    date: day.date,
                                                    time_slot: 'morning',
                                                    surgery_type: suggestion.surgery_type,
                                                    notes: '',
                                                  })
                                                  await fetchData(currentWeek)
                                                } catch (err) {
                                                  alert('Failed to quick-schedule surgery.')
                                                } finally {
                                                  setQuickAddingSlot(null)
                                                }
                                              }}
                                            >
                                              <Check className="h-4 w-4" />
                                              <span className="sr-only">Confirm suggestion</span>
                                            </button>
                                </div>
                                        ) : null}
                                      </div>
                                    )
                                  })()}
                                {/* Morning Primary Doctor Assignment */}
                                <div
                                  className={`h-12 rounded border-2 border-dashed cursor-pointer transition-colors bg-white hover:border-gray-300 hover:bg-gray-50`}
                                  onClick={() => {
                                    const assignments = getAssignmentForSlot(room.id, day.date, 'morning')
                                    const primary = getPrimaryDoctor(assignments)
                                    if (primary) {
                                      setSelectedAssignment(primary)
                                      setIsAssignmentDetailSheetOpen(true)
                                      setIsEditingAssignment(false)
                                    } else {
                                      openDoctorAssignSheet(room.id, day.date, 'morning')
                                    }
                                  }}
                                >
                                  {(() => {
                                    const assignments = getAssignmentForSlot(room.id, day.date, 'morning')
                                    const primary = getPrimaryDoctor(assignments)
                                    
                                    if (primary) {
                                      const doctor = doctors.find(d => d.id === primary.doctor_id)
                                      return (
                                        <div className="h-full flex items-center justify-center text-xs font-medium text-blue-700">
                                          <User className="h-4 w-4 mr-1" />
                                          {doctor ? doctor.name : 'Unknown Doctor'}
                                        </div>
                                      )
                                    }
                                    return (
                                      <div className="h-full flex items-center justify-center text-xs font-medium text-gray-500">
                                        Primary Doctor
                                      </div>
                                    )
                                  })()}
                                </div>
                                {/* Morning Secondary Doctor Assignment */}
                                <div
                                  className={`h-12 rounded border-2 border-dashed cursor-pointer transition-colors bg-white hover:border-gray-300 hover:bg-gray-50`}
                                  onClick={() => {
                                    const assignments = getAssignmentForSlot(room.id, day.date, 'morning')
                                    const secondary = getSecondaryDoctor(assignments)
                                    if (secondary) {
                                      setSelectedAssignment(secondary)
                                      setIsAssignmentDetailSheetOpen(true)
                                      setIsEditingAssignment(false)
                                    } else {
                                      // Open assignment form with Secondary role pre-selected
                                      setDoctorAssignFormData({
                                        doctor_id: '',
                                        operating_room_id: room.id,
                                        date: day.date,
                                        shift_type: 'morning',
                                        role: 'Secondary',
                                        notes: ''
                                      })
                                      setIsDoctorAssignSheetOpen(true)
                                    }
                                  }}
                                >
                                  {(() => {
                                    const assignments = getAssignmentForSlot(room.id, day.date, 'morning')
                                    const secondary = getSecondaryDoctor(assignments)
                                    
                                    if (secondary) {
                                      const doctor = doctors.find(d => d.id === secondary.doctor_id)
                                      return (
                                        <div className="h-full flex items-center justify-center text-xs font-medium text-gray-700">
                                          <User className="h-4 w-4 mr-1" />
                                          {doctor ? doctor.name : 'Unknown Doctor'}
                                        </div>
                                      )
                                    }
                                    return (
                                      <div className="h-full flex items-center justify-center text-xs font-medium text-gray-500">
                                        Secondary Doctor
                                      </div>
                                    )
                                  })()}
                                </div>
                                {/* Evening Surgery Schedule */}
                                  {(() => {
                                    const surgery = getSurgeryForSlot(room.id, day.date, 'evening')
                                    const suggestion = !surgery ? getSuggestionForSlot(room.id, day.date, 'evening') : null

                                    return (
                                <div
                                        className={`h-12 rounded border-2 border-dashed cursor-pointer transition-colors relative ${
                                          isQuickAddingEvening
                                            ? 'border-blue-300 bg-blue-100'
                                            : surgery
                                      ? 'border-blue-200 bg-blue-50'
                                            : suggestion
                                            ? 'border-gray-300 bg-gray-50 opacity-90 hover:opacity-100'
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                  onClick={() => {
                                          if (isQuickAddingEvening || surgery) {
                                            if (surgery) openSurgeryDetail(surgery)
                                            return
                                          }
                                          // Open sheet for empty or suggestion
                                      setFormData({
                                        room_id: room.id,
                                        date: day.date,
                                        time_slot: 'evening',
                                            surgery_type: suggestion?.surgery_type || '',
                                            notes: '',
                                      })
                                      setIsSheetOpen(true)
                                  }}
                                >
                                        {isQuickAddingEvening ? (
                                          <div className="h-full flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                          </div>
                                        ) : surgery ? (
                                      <div className="h-full flex items-center justify-center text-xs font-medium text-blue-700">
                                        {surgery.surgery_type}
                                      </div>
                                        ) : suggestion ? (
                                          <div className="h-full flex items-center justify-center text-xs font-medium text-gray-500 relative w-full">
                                            <span title={`Suggested: ${suggestion.surgery_type}. Click slot to edit/schedule.`}>
                                              {suggestion.surgery_type}
                                            </span>
                                            <button
                                              className="absolute bottom-1 right-1 p-0.5 rounded-full bg-green-200 text-green-700 hover:bg-green-300 transition-colors"
                                              title={`Quick schedule ${suggestion.surgery_type}`}
                                              onClick={async (e) => {
                                                e.stopPropagation()
                                                setQuickAddingSlot(eveningSlotId)
                                                try {
                                                  await surgeriesService.create({
                                                    room_id: room.id,
                                                    date: day.date,
                                                    time_slot: 'evening',
                                                    surgery_type: suggestion.surgery_type,
                                                    notes: '',
                                                  })
                                                  await fetchData(currentWeek)
                                                } catch (err) {
                                                  alert('Failed to quick-schedule surgery.')
                                                } finally {
                                                  setQuickAddingSlot(null)
                                                }
                                              }}
                                            >
                                              <Check className="h-4 w-4" />
                                              <span className="sr-only">Confirm suggestion</span>
                                            </button>
                                </div>
                                        ) : null}
                                      </div>
                                    )
                                  })()}
                                {/* Evening Doctor Assignment */}
                                <div
                                  className={`h-12 rounded border-2 border-dashed cursor-pointer transition-colors bg-white hover:border-gray-300 hover:bg-gray-50`}
                                  onClick={() => {
                                    const assignment = getAssignmentForSlot(room.id, day.date, 'evening')
                                    if (assignment.length > 0) {
                                      setSelectedAssignment(assignment[0]) // Select the first assignment for editing
                                      setIsAssignmentDetailSheetOpen(true)
                                      setIsEditingAssignment(false)
                                    } else {
                                      openDoctorAssignSheet(room.id, day.date, 'evening')
                                    }
                                  }}
                                >
                                  {(() => {
                                    const assignments = getAssignmentForSlot(room.id, day.date, 'evening')
                                    const primary = getPrimaryDoctor(assignments)
                                    const secondary = getSecondaryDoctor(assignments)
                                    
                                    if (primary) {
                                      const doctor = doctors.find(d => d.id === primary.doctor_id)
                                      return (
                                        <div className="h-full flex items-center justify-center text-xs font-medium text-blue-700">
                                          <User className="h-4 w-4 mr-1" />
                                          {doctor ? doctor.name : 'Unknown Doctor'}
                                        </div>
                                      )
                                    } else if (secondary) {
                                      const doctor = doctors.find(d => d.id === secondary.doctor_id)
                                      return (
                                        <div className="h-full flex items-center justify-center text-xs font-medium text-gray-700">
                                          <User className="h-4 w-4 mr-1" />
                                          {doctor ? doctor.name : 'Unknown Doctor'}
                                        </div>
                                      )
                                    }
                                    return null
                                  })()}
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Surgery Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="w-[95vw] max-w-[500px] sm:w-[500px] md:w-[600px] overflow-y-auto">
          {selectedSurgery && (
            <>
              <SheetHeader className="pb-3">
                <SheetTitle className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold truncate">{selectedSurgery.surgery_type}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      Room {selectedSurgery.operating_rooms?.room_number} • {new Date(selectedSurgery.date).toLocaleDateString()}
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              
              {isEditing ? (
                // Edit Form
                <div className="flex-1 overflow-y-auto px-1">
                  <form onSubmit={handleUpdateSurgery} className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_surgery_type" className="text-sm font-medium">Surgery Type *</Label>
                        <Select 
                          value={editFormData.surgery_type} 
                          onValueChange={(value) => handleEditInputChange('surgery_type', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SURGERY_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit_room_id" className="text-sm font-medium">Room *</Label>
                          <Select 
                            value={editFormData.room_id} 
                            onValueChange={(value) => handleEditInputChange('room_id', value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {operatingRooms.map((room) => (
                                <SelectItem key={room.id} value={room.id}>
                                  {room.room_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label htmlFor="edit_date" className="text-sm font-medium">Date *</Label>
                          <Input
                            type="date"
                            value={editFormData.date}
                            onChange={(e) => handleEditInputChange('date', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="h-9"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="edit_notes" className="text-sm font-medium">Notes</Label>
                        <Textarea
                          value={editFormData.notes}
                          onChange={(e) => handleEditInputChange('notes', e.target.value)}
                          placeholder="Additional notes about the surgery..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                    </div>
                    
                    <SheetFooter className="pt-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-9">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting} className="h-9">
                        {isSubmitting ? 'Updating...' : 'Update Surgery'}
                      </Button>
                    </SheetFooter>
                  </form>
                </div>
              ) : (
                // View Mode
                <div className="flex-1 overflow-y-auto px-1 space-y-4">
                  {/* Surgery Details Section */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Surgery Details
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-muted-foreground">Surgery Type</Label>
                        <div className="text-base font-medium">{selectedSurgery.surgery_type}</div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-muted-foreground">Room</Label>
                        <div className="text-base font-medium">#{selectedSurgery.operating_rooms?.room_number}</div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                        <div className="text-base font-medium">
                          {new Date(selectedSurgery.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-muted-foreground">Time Slot</Label>
                        <Badge variant="outline" className="text-sm">
                          <Clock className="h-3 w-3 mr-1" />
                          {selectedSurgery.time_slot === 'morning' ? 'Morning' : 'Evening'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {selectedSurgery.notes && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Notes</h3>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm">{selectedSurgery.notes}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">System Information</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-muted-foreground">Surgery ID</Label>
                        <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                          {selectedSurgery.id}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                        <div className="text-sm">
                          {new Date(selectedSurgery.created_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <SheetFooter className="flex flex-col sm:flex-row gap-2">
                {!isEditing ? (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full sm:w-auto h-9">Close</Button>
                    </SheetClose>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => startEditing()}
                      className="w-full sm:w-auto h-9"
                    >
                      Edit Surgery
                    </Button>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={handleDeleteSurgery}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto h-9"
                    >
                      {isSubmitting ? 'Deleting...' : 'Delete Surgery'}
                    </Button>
                  </>
                ) : null}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign Doctor Sheet */}
      <Sheet open={isDoctorAssignSheetOpen} onOpenChange={setIsDoctorAssignSheetOpen}>
        <SheetContent className="w-[95vw] max-w-[500px] sm:w-[500px] md:w-[600px] overflow-y-auto">
          <SheetHeader className="pb-3">
            <SheetTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold">Assign Doctor</div>
                <div className="text-sm text-muted-foreground">
                  Assign a doctor to this room, date, and shift
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <AssignDoctorForm
              initialValues={doctorAssignFormData}
              doctors={doctors}
              rooms={operatingRooms}
              surgeryType={selectedSurgeryType}
              onSubmit={async (values) => {
                setIsDoctorAssignSubmitting(true)
                const errors: { [key: string]: string } = {}
                if (!values.doctor_id) errors.doctor_id = 'Doctor is required'
                if (!values.operating_room_id) errors.operating_room_id = 'Room is required'
                if (!values.date) errors.date = 'Date is required'
                if (!values.shift_type) errors.shift_type = 'Shift is required'
                if (!values.role) errors.role = 'Role is required'
                setDoctorAssignValidationErrors(errors)
                if (Object.keys(errors).length > 0) {
                  setIsDoctorAssignSubmitting(false)
                  return
                }
                try {
                  const newAssignment = await assignmentsService.create(values)
                  setAssignments(prev => [...prev, newAssignment])
                  
                  // Refresh doctors data to ensure we have the latest doctor information
                  const allDoctors = await doctorsService.getAll()
                  setDoctors(allDoctors.map((doc: any) => ({ id: doc.id, name: doc.name })))
                  
                  setIsDoctorAssignSheetOpen(false)
                  setDoctorAssignFormData({
                    doctor_id: '',
                    operating_room_id: '',
                    date: '',
                    shift_type: 'morning',
                    role: 'Primary',
                    notes: ''
                  })
                  setDoctorAssignValidationErrors({})
                  setSelectedSurgeryType('')
                  // Optionally: fetchData(currentWeek) in background for sync
                } catch (error) {
                  alert(`Error creating assignment: ${error instanceof Error ? error.message : 'Unknown error'}`)
                } finally {
                  setIsDoctorAssignSubmitting(false)
                }
              }}
              onCancel={() => {
                setIsDoctorAssignSheetOpen(false)
                setSelectedSurgeryType('')
              }}
              isSubmitting={isDoctorAssignSubmitting}
              validationErrors={doctorAssignValidationErrors}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Assignment Detail Sheet */}
      <Sheet open={isAssignmentDetailSheetOpen} onOpenChange={setIsAssignmentDetailSheetOpen}>
        <SheetContent className="w-[95vw] max-w-[500px] sm:w-[500px] md:w-[600px] overflow-y-auto">
          {selectedAssignment && !isEditingAssignment && (
            <>
              <SheetHeader className="pb-3">
                <SheetTitle className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold truncate">
                      Doctor Assignments
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      Room {operatingRooms.find(r => r.id === selectedAssignment.operating_room_id)?.room_number} • {new Date(selectedAssignment.date).toLocaleDateString()}
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto px-1 space-y-6">
                {/* Doctor Assignments Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Assigned Doctors
                  </h3>
                  
                  {(() => {
                    const assignments = getAssignmentForSlot(selectedAssignment.operating_room_id, selectedAssignment.date, selectedAssignment.shift_type)
                    const primary = getPrimaryDoctor(assignments)
                    const secondary = getSecondaryDoctor(assignments)
                    
                    return (
                      <div className="space-y-3">
                        {/* Primary Doctor */}
                        {primary && (() => {
                          const doctor = doctors.find(d => d.id === primary.doctor_id)
                          return doctor ? (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <User className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-lg font-semibold text-gray-900">{doctor.name}</h4>
                                    <Badge variant="default" className="text-xs bg-blue-600">
                                      Primary
                                    </Badge>
                                    <Badge variant="default" className="text-xs bg-green-600">
                                      Active
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600 mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Doctor ID:</span>
                                      <Badge variant="outline" className="text-xs">
                                        {doctor.id}
                                      </Badge>
                                    </div>
                                  </div>
                                  {primary.notes && (
                                    <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                                      <strong>Notes:</strong> {primary.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : null
                        })()}
                        
                        {/* Secondary Doctor */}
                        {secondary && (() => {
                          const doctor = doctors.find(d => d.id === secondary.doctor_id)
                          return doctor ? (
                            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <User className="h-6 w-6 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-lg font-semibold text-gray-900">{doctor.name}</h4>
                                    <Badge variant="secondary" className="text-xs">
                                      Secondary
                                    </Badge>
                                    <Badge variant="default" className="text-xs bg-green-600">
                                      Active
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600 mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Doctor ID:</span>
                                      <Badge variant="outline" className="text-xs">
                                        {doctor.id}
                                      </Badge>
                                    </div>
                                  </div>
                                  {secondary.notes && (
                                    <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                                      <strong>Notes:</strong> {secondary.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : null
                        })()}
                        
                        {/* No assignments message */}
                        {!primary && !secondary && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                            <div className="text-gray-500">
                              <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm">No doctors assigned to this slot</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Assignment Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Assignment Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-muted-foreground">Room</Label>
                      <div className="text-base font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        {operatingRooms.find(r => r.id === selectedAssignment.operating_room_id)?.room_number}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                      <div className="text-base font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {new Date(selectedAssignment.date).toLocaleDateString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-muted-foreground">Shift</Label>
                      <Badge variant="outline" className="text-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        {selectedAssignment.shift_type === 'morning' ? 'Morning' : 'Evening'}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                      <Badge variant={selectedAssignment.role === 'Primary' ? 'default' : 'secondary'} className="text-sm">
                        {selectedAssignment.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Assignment Status */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Assignment Status
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-green-900">Confirmed Assignment</div>
                        <div className="text-sm text-green-700">
                          Doctor is assigned and available for this shift
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                {selectedAssignment.notes && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      Notes
                    </h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{selectedAssignment.notes}</p>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditingAssignment(true)}
                      className="h-10 flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      Edit Assignment
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        // TODO: Implement view doctor profile
                        alert('Doctor profile view coming soon!')
                      }}
                      className="h-10 flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>

              <SheetFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <SheetClose asChild>
                  <Button variant="outline" className="w-full sm:w-auto h-9">Close</Button>
                </SheetClose>
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
                      setIsSubmitting(true)
                      try {
                        await assignmentsService.delete(selectedAssignment.id)
                        setAssignments(prev => prev.filter(a => a.id !== selectedAssignment.id))
                        setIsAssignmentDetailSheetOpen(false)
                        setSelectedAssignment(null)
                        setIsEditingAssignment(false)
                      } catch (error) {
                        alert(`Error deleting assignment: ${error instanceof Error ? error.message : 'Unknown error'}`)
                      } finally {
                        setIsSubmitting(false)
                      }
                    }
                  }} 
                  className="w-full sm:w-auto h-9"
                >
                  Delete Assignment
                </Button>
              </SheetFooter>
            </>
          )}
          
          {selectedAssignment && isEditingAssignment && (
            <div className="flex-1 overflow-y-auto px-1">
              <AssignDoctorForm
                initialValues={selectedAssignment}
                doctors={editDoctors}
                rooms={operatingRooms}
                onSubmit={async (values) => {
                  setIsSubmitting(true)
                  try {
                    const updatedAssignment = await assignmentsService.update(selectedAssignment.id, values)
                    setAssignments(prev => prev.map(a => a.id === updatedAssignment.id ? updatedAssignment : a))
                    setIsEditingAssignment(false)
                    setIsAssignmentDetailSheetOpen(false)
                    setSelectedAssignment(null)
                  } catch (error) {
                    alert(`Error updating assignment: ${error instanceof Error ? error.message : 'Unknown error'}`)
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                onCancel={() => setIsEditingAssignment(false)}
                isSubmitting={isSubmitting}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  )
} 