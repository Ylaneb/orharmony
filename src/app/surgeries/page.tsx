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
import { Plus, Calendar, Clock, Building2, AlertCircle } from 'lucide-react'
import { surgeriesService } from '@/lib/services/surgeries'
import { operatingRoomsService } from '@/lib/services/operating-rooms'
import { SURGERY_TYPES, SLOT_TYPES, type Surgery, type CreateSurgeryData } from '@/lib/data/surgeries'
import { useEffect, useState } from 'react'
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
  // Add state for selected assignment and edit mode
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null)
  const [isAssignmentDetailSheetOpen, setIsAssignmentDetailSheetOpen] = useState(false)
  const [isEditingAssignment, setIsEditingAssignment] = useState(false)
  // Add state for editDoctors
  const [editDoctors, setEditDoctors] = useState<{ id: string; name: string }[]>([])

  // Get current week (Monday to Sunday) - client-side only
  const getCurrentWeek = () => {
    if (typeof window === 'undefined') return '2024-01-01' // Fallback for SSR
    const today = new Date()
    const monday = new Date(today)
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    monday.setDate(diff)
    // Use a safer date formatting method
    const year = monday.getFullYear()
    const month = String(monday.getMonth() + 1).padStart(2, '0')
    const dayOfMonth = String(monday.getDate()).padStart(2, '0')
    return `${year}-${month}-${dayOfMonth}`
  }

  // Generate week days - client-side only
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
  }, [selectedAssignment, isEditingAssignment])

  const fetchData = async (weekStart: string) => {
    setLoading(true)
    try {
      const [surgeriesData, roomsData, assignmentsData] = await Promise.all([
        surgeriesService.getByWeek(weekStart),
        operatingRoomsService.getAll(),
        assignmentsService.getByWeek(weekStart)
      ])
      setSurgeries(surgeriesData)
      setOperatingRooms(roomsData)
      setAssignments(assignmentsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const weekDays = getWeekDays(currentWeek)

  const getAssignmentForSlot = (roomId: string, date: string, shiftType: 'morning' | 'evening') => {
    return assignments.find(a =>
      a.operating_room_id === roomId &&
      a.date === date &&
      a.shift_type === shiftType
    )
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

      const newSurgery = await surgeriesService.create({
        room_id: formData.room_id,
        date: formData.date,
        time_slot: formData.time_slot,
        surgery_type: formData.surgery_type,
        notes: formData.notes
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
      setSurgeries(prev => prev.filter(s => s.id !== selectedSurgery.id))
      setIsDetailSheetOpen(false)
      setSelectedSurgery(null)
      setIsEditing(false)
      
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

  // New: Filter available doctors for assignment
  const getAvailableDoctors = async (date: string, shift_type: 'morning' | 'evening') => {
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
  }

  // New: Open assign doctor sheet with filtered doctors
  const openDoctorAssignSheet = async (roomId: string, date: string, shift_type: 'morning' | 'evening') => {
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
                      setCurrentWeek(getCurrentWeek())
                      fetchData(getCurrentWeek())
                    }}
                  >
                    Today
                  </Button>
                </div>

                {/* Weekly Schedule Grid - Inverted Layout */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b">
                    <div className="flex">
                      <div className="w-32 p-3 font-medium text-sm border-r">Day</div>
                      <div className="flex-1 grid gap-px" style={{ gridTemplateColumns: `repeat(${operatingRooms.length}, 1fr)` }}>
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
                          <div className="w-32 p-3 bg-gray-50 border-r">
                            <div className="text-center">
                              <div className={`text-sm font-medium ${day.isToday ? 'text-blue-600' : ''}`}>
                                {day.dayName}
                              </div>
                              <div className={`text-xs ${day.isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                                {day.dayNumber}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 grid gap-px" style={{ gridTemplateColumns: `repeat(${operatingRooms.length}, 1fr)` }}>
                            {operatingRooms.map((room) => (
                              <div key={room.id} className="min-h-[120px] p-2 space-y-1">
                                {/* Slot 1: Surgery Schedule */}
                                <div
                                  className={`h-12 rounded border-2 border-dashed cursor-pointer transition-colors ${
                                    getSurgeryForSlot(room.id, day.date, 'morning')
                                      ? 'border-blue-200 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                  onClick={() => {
                                    const surgery = getSurgeryForSlot(room.id, day.date, 'morning')
                                    if (surgery) {
                                      openSurgeryDetail(surgery)
                                    } else {
                                      setFormData({
                                        room_id: room.id,
                                        date: day.date,
                                        time_slot: 'morning',
                                        surgery_type: '',
                                        notes: ''
                                      })
                                      setIsSheetOpen(true)
                                    }
                                  }}
                                >
                                  {(() => {
                                    const surgery = getSurgeryForSlot(room.id, day.date, 'morning')
                                    return surgery ? (
                                      <div className="h-full flex items-center justify-center text-xs font-medium text-blue-700">
                                        {surgery.surgery_type}
                                      </div>
                                    ) : null
                                  })()}
                                </div>
                                {/* Slot 2: Doctor Assignment */}
                                <div
                                  className={`h-12 rounded border-2 border-dashed cursor-pointer transition-colors bg-white hover:border-gray-300 hover:bg-gray-50`}
                                  onClick={() => {
                                    const assignment = getAssignmentForSlot(room.id, day.date, 'morning')
                                    if (assignment) {
                                      setSelectedAssignment(assignment)
                                      setIsAssignmentDetailSheetOpen(true)
                                      setIsEditingAssignment(false)
                                    } else {
                                      openDoctorAssignSheet(room.id, day.date, 'morning')
                                    }
                                  }}
                                >
                                  {/* Display doctor name if assigned, else show nothing for now */}
                                  {/* Example: getDoctorAssignment(room.id, day.date, 'morning') */}
                                  {(() => {
                                    const assignment = getAssignmentForSlot(room.id, day.date, 'morning')
                                    if (assignment) {
                                      const doctor = doctors.find(d => d.id === assignment.doctor_id)
                                      return (
                                        <div className="h-full flex items-center justify-center text-xs font-medium text-blue-700">
                                          {doctor ? doctor.name : 'Assigned'}
                                        </div>
                                      )
                                    }
                                    return null
                                  })()}
                                </div>
                              </div>
                            ))}
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
        <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto">
          {selectedSurgery && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{selectedSurgery.surgery_type}</div>
                    <div className="text-sm text-muted-foreground">
                      Room {selectedSurgery.operating_rooms?.room_number} • {new Date(selectedSurgery.date).toLocaleDateString()}
                    </div>
                  </div>
                </SheetTitle>
                <SheetDescription>
                  {isEditing ? 'Edit surgery details' : 'Surgery information and details'}
                </SheetDescription>
              </SheetHeader>
              
              {isEditing ? (
                // Edit Form
                <form onSubmit={handleUpdateSurgery} className="space-y-6 mt-6">
                  <div className="space-y-4">
                                                <div className="space-y-2">
                              <Label htmlFor="edit_room_id">Operating Room</Label>
                              <Select 
                                value={editFormData.room_id} 
                                onValueChange={(value) => handleEditInputChange('room_id', value)}
                              >
                                <SelectTrigger>
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit_date">Date</Label>
                      <Input
                        type="date"
                        value={editFormData.date}
                        onChange={(e) => handleEditInputChange('date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit_surgery_type">Surgery Type</Label>
                      <Select 
                        value={editFormData.surgery_type} 
                        onValueChange={(value) => handleEditInputChange('surgery_type', value)}
                      >
                        <SelectTrigger>
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit_notes">Notes</Label>
                      <Textarea
                        value={editFormData.notes}
                        onChange={(e) => handleEditInputChange('notes', e.target.value)}
                        placeholder="Additional notes about the surgery..."
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <SheetFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Updating...' : 'Update Surgery'}
                    </Button>
                  </SheetFooter>
                </form>
              ) : (
                // View Mode
                <div className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Surgery Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Surgery Type</Label>
                        <div className="text-lg font-medium">{selectedSurgery.surgery_type}</div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Room</Label>
                        <div className="text-lg font-medium">#{selectedSurgery.operating_rooms?.room_number}</div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                        <div className="text-lg font-medium">
                          {new Date(selectedSurgery.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Slot Type</Label>
                        <Badge variant="outline" className="text-sm">
                          <Clock className="h-3 w-3 mr-1" />
                          {selectedSurgery.time_slot === 'morning' ? 'Morning' : 'Evening'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {selectedSurgery.notes && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Notes</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm">{selectedSurgery.notes}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">System Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Surgery ID</Label>
                        <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                          {selectedSurgery.id}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                        <div className="text-sm">
                          {new Date(selectedSurgery.created_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <SheetFooter>
                {!isEditing ? (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline">Close</Button>
                    </SheetClose>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => startEditing()}
                    >
                      Edit Surgery
                    </Button>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={handleDeleteSurgery}
                      disabled={isSubmitting}
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
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Assign Doctor</SheetTitle>
            <SheetDescription>
              Assign a doctor to this room, date, and shift.
            </SheetDescription>
          </SheetHeader>
          <AssignDoctorForm
            initialValues={doctorAssignFormData}
            doctors={doctors}
            rooms={operatingRooms}
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
                // Optionally: fetchData(currentWeek) in background for sync
              } catch (error) {
                alert(`Error creating assignment: ${error instanceof Error ? error.message : 'Unknown error'}`)
              } finally {
                setIsDoctorAssignSubmitting(false)
              }
            }}
            onCancel={() => setIsDoctorAssignSheetOpen(false)}
            isSubmitting={isDoctorAssignSubmitting}
            validationErrors={doctorAssignValidationErrors}
          />
        </SheetContent>
      </Sheet>

      {/* Assignment Detail Sheet */}
      <Sheet open={isAssignmentDetailSheetOpen} onOpenChange={setIsAssignmentDetailSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto">
          {selectedAssignment && !isEditingAssignment && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const doctor = doctors.find(d => d.id === selectedAssignment.doctor_id)
                        return doctor ? doctor.name : 'Assigned Doctor'
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Room {operatingRooms.find(r => r.id === selectedAssignment.operating_room_id)?.room_number} • {new Date(selectedAssignment.date).toLocaleDateString()}
                    </div>
                  </div>
                </SheetTitle>
                <SheetDescription>
                  Assignment information and details
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Assignment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Doctor</Label>
                      <div className="text-lg font-medium">
                        {(() => {
                          const doctor = doctors.find(d => d.id === selectedAssignment.doctor_id)
                          return doctor ? doctor.name : selectedAssignment.doctor_id
                        })()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Room</Label>
                      <div className="text-lg font-medium">
                        {operatingRooms.find(r => r.id === selectedAssignment.operating_room_id)?.room_number}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                      <div className="text-lg font-medium">
                        {new Date(selectedAssignment.date).toLocaleDateString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Shift</Label>
                      <Badge variant="outline" className="text-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        {selectedAssignment.shift_type === 'morning' ? 'Morning' : 'Evening'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                      <div className="text-lg font-medium">{selectedAssignment.role}</div>
                    </div>
                  </div>
                </div>
                {selectedAssignment.notes && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Notes</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm">{selectedAssignment.notes}</p>
                    </div>
                  </div>
                )}
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="outline">Close</Button>
                </SheetClose>
                <Button type="button" variant="outline" onClick={() => setIsEditingAssignment(true)}>
                  Edit Assignment
                </Button>
                <Button type="button" variant="destructive" onClick={async () => {
                  if (confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
                    setIsSubmitting(true)
                    try {
                      await assignmentsService.delete(selectedAssignment.id)
                      setAssignments(prev => prev.filter(a => a.id !== selectedAssignment.id))
                      setIsAssignmentDetailSheetOpen(false)
                      setSelectedAssignment(null)
                      setIsEditingAssignment(false)
                      // Optionally: fetchData(currentWeek) in background for sync
                    } catch (error) {
                      alert(`Error deleting assignment: ${error instanceof Error ? error.message : 'Unknown error'}`)
                    } finally {
                      setIsSubmitting(false)
                    }
                  }
                }}>
                  Delete Assignment
                </Button>
              </SheetFooter>
            </>
          )}
          {selectedAssignment && isEditingAssignment && (
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
                  // Optionally: fetchData(currentWeek) in background for sync
                } catch (error) {
                  alert(`Error updating assignment: ${error instanceof Error ? error.message : 'Unknown error'}`)
                } finally {
                  setIsSubmitting(false)
                }
              }}
              onCancel={() => setIsEditingAssignment(false)}
              isSubmitting={isSubmitting}
            />
          )}
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  )
} 