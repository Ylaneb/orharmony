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
import { SURGERY_TYPES, TIME_SLOTS, type Surgery, type CreateSurgeryData } from '@/lib/data/surgeries'
import { useEffect, useState } from 'react'

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

  const fetchData = async (weekStart: string) => {
    setLoading(true)
    try {
      const [surgeriesData, roomsData] = await Promise.all([
        surgeriesService.getByWeek(weekStart),
        operatingRoomsService.getAll()
      ])
      setSurgeries(surgeriesData)
      setOperatingRooms(roomsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const weekDays = getWeekDays(currentWeek)

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
        time_slot: selectedSurgery.time_slot,
        surgery_type: selectedSurgery.surgery_type,
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
                        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="room_id">Operating Room *</Label>
                              <Select 
                                value={formData.room_id} 
                                onValueChange={(value) => handleInputChange('room_id', value)}
                              >
                                <SelectTrigger className={validationErrors.room_id ? 'border-red-500' : ''}>
                                  <SelectValue placeholder="Select a room" />
                                </SelectTrigger>
                                <SelectContent>
                                  {operatingRooms.map((room) => (
                                    <SelectItem key={room.id} value={room.id}>
                                      {room.room_number}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {validationErrors.room_id && (
                                <p className="text-sm text-red-500">{validationErrors.room_id}</p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="date">Date *</Label>
                              <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => handleInputChange('date', e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className={validationErrors.date ? 'border-red-500' : ''}
                              />
                              {validationErrors.date && (
                                <p className="text-sm text-red-500">{validationErrors.date}</p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="time_slot">Time Slot *</Label>
                              <Select 
                                value={formData.time_slot} 
                                onValueChange={(value: 'morning' | 'evening') => handleInputChange('time_slot', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_SLOTS.map((slot) => (
                                    <SelectItem key={slot.value} value={slot.value}>
                                      {slot.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="surgery_type">Surgery Type *</Label>
                              <Select 
                                value={formData.surgery_type} 
                                onValueChange={(value) => handleInputChange('surgery_type', value)}
                              >
                                <SelectTrigger className={validationErrors.surgery_type ? 'border-red-500' : ''}>
                                  <SelectValue placeholder="Select surgery type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SURGERY_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {validationErrors.surgery_type && (
                                <p className="text-sm text-red-500">{validationErrors.surgery_type}</p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="notes">Notes</Label>
                              <Textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                placeholder="Additional notes about the surgery..."
                                rows={3}
                              />
                            </div>
                          </div>
                          
                          <SheetFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={isSubmitting || Object.keys(validationErrors).length > 0}
                            >
                              {isSubmitting ? 'Scheduling...' : 'Schedule Surgery'}
                            </Button>
                          </SheetFooter>
                        </form>
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

                {/* Weekly Schedule Grid */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b">
                    <div className="grid grid-cols-8 gap-px">
                      <div className="p-3 font-medium text-sm">Room</div>
                      {weekDays.map((day) => (
                        <div key={day.date} className="p-3 text-center">
                          <div className={`text-sm font-medium ${day.isToday ? 'text-blue-600' : ''}`}>
                            {day.dayName}
                          </div>
                          <div className={`text-xs ${day.isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                            {day.dayNumber}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading schedule...</div>
                  ) : (
                    <div className="divide-y">
                      {operatingRooms.map((room) => (
                        <div key={room.id} className="grid grid-cols-8 gap-px">
                          <div className="p-3 bg-gray-50 border-r">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{room.room_number}</span>
                            </div>
                          </div>
                          {weekDays.map((day) => (
                            <div key={day.date} className="min-h-[120px] p-2 space-y-1">
                              {/* Morning Slot */}
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
                                    setFormData(prev => ({
                                      ...prev,
                                      room_id: room.id,
                                      date: day.date,
                                      time_slot: 'morning'
                                    }))
                                    setIsSheetOpen(true)
                                  }
                                }}
                              >
                                {getSurgeryForSlot(room.id, day.date, 'morning') && (
                                  <div className="h-full flex items-center justify-center text-xs font-medium text-blue-700">
                                    Morning
                                  </div>
                                )}
                              </div>
                              
                              {/* Evening Slot */}
                              <div 
                                className={`h-12 rounded border-2 border-dashed cursor-pointer transition-colors ${
                                  getSurgeryForSlot(room.id, day.date, 'evening')
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => {
                                  const surgery = getSurgeryForSlot(room.id, day.date, 'evening')
                                  if (surgery) {
                                    openSurgeryDetail(surgery)
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      room_id: room.id,
                                      date: day.date,
                                      time_slot: 'evening'
                                    }))
                                    setIsSheetOpen(true)
                                  }
                                }}
                              >
                                {getSurgeryForSlot(room.id, day.date, 'evening') && (
                                  <div className="h-full flex items-center justify-center text-xs font-medium text-blue-700">
                                    Evening
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
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
                      <Label htmlFor="edit_time_slot">Time Slot</Label>
                      <Select 
                        value={editFormData.time_slot} 
                        onValueChange={(value: 'morning' | 'evening') => handleEditInputChange('time_slot', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Label className="text-sm font-medium text-muted-foreground">Time Slot</Label>
                        <Badge variant="outline" className="text-sm">
                          <Clock className="h-3 w-3 mr-1" />
                          {selectedSurgery.time_slot === 'morning' ? 'Morning (8AM-12PM)' : 'Evening (2PM-6PM)'}
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
    </SidebarProvider>
  )
} 