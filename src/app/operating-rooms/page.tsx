"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Building2, MapPin, Activity } from 'lucide-react'
import { operatingRoomsService } from '@/lib/services/operating-rooms'
import { useEffect, useState } from 'react'

interface OperatingRoomFormData {
  room_number: string
  location: string
  specialty: string
  notes: string
  is_active: boolean
}

const specialties = [
  'General Surgery',
  'Cardiac Surgery',
  'Neurology',
  'Orthopedics',
  'Emergency Surgery',
  'Pediatric Surgery',
  'Robotic Surgery',
  'Other'
]

export default function OperatingRoomsPage() {
  const [operatingRooms, setOperatingRooms] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState<OperatingRoomFormData>({
    room_number: '',
    location: '',
    specialty: '',
    notes: '',
    is_active: true
  })
  const [formData, setFormData] = useState<OperatingRoomFormData>({
    room_number: '',
    location: '',
    specialty: '',
    notes: '',
    is_active: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})

  useEffect(() => {
    async function fetchOperatingRooms() {
      setLoading(true)
      try {
        console.log('Page: Starting to fetch operating rooms...')
        const data = await operatingRoomsService.getAll()
        console.log('Page: Operating rooms data received:', data)
        setOperatingRooms(data || [])
      } catch (error) {
        console.error('Page: Error fetching operating rooms:', error)
        setOperatingRooms([])
      }
      setLoading(false)
    }
    fetchOperatingRooms()
  }, [])

  const filteredRooms = operatingRooms.filter((room) => {
    const q = search.toLowerCase()
    return (
      room.room_number.toLowerCase().includes(q) ||
      (room.location && room.location.toLowerCase().includes(q)) ||
      (room.specialty && room.specialty.toLowerCase().includes(q))
    )
  })

  const openRoomDetail = (room: any) => {
    setSelectedRoom(room)
    setIsDetailSheetOpen(true)
    setIsEditing(false)
  }

  const startEditing = () => {
    if (selectedRoom) {
      setEditFormData({
        room_number: selectedRoom.room_number,
        location: selectedRoom.location || '',
        specialty: selectedRoom.specialty || '',
        notes: selectedRoom.notes || '',
        is_active: selectedRoom.is_active
      })
      setIsEditing(true)
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return
    
    if (!confirm(`Are you sure you want to delete ${selectedRoom.room_number}? This action cannot be undone.`)) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await operatingRoomsService.delete(selectedRoom.id)
      setOperatingRooms(prev => prev.filter(room => room.id !== selectedRoom.id))
      setIsDetailSheetOpen(false)
      setSelectedRoom(null)
      setIsEditing(false)
      alert('Operating room deleted successfully!')
    } catch (error) {
      console.error('Error deleting room:', error)
      alert(`Error deleting room: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditInputChange = (field: string, value: string | boolean) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    if (field === 'room_number' && typeof value === 'string') {
      const existingRoom = operatingRooms.find(room => 
        room.room_number.toLowerCase() === value.toLowerCase()
      )
      if (existingRoom) {
        setValidationErrors(prev => ({
          ...prev,
          room_number: 'This room number is already registered'
        }))
      }
    }
  }

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (!editFormData.room_number) {
        throw new Error('Please fill in all required fields')
      }

      const existingRoom = operatingRooms.find(room => 
        room.id !== selectedRoom.id && 
        room.room_number.toLowerCase() === editFormData.room_number.toLowerCase()
      )
      if (existingRoom) {
        throw new Error(`A room with number "${editFormData.room_number}" already exists`)
      }

      const updatedRoom = await operatingRoomsService.update(selectedRoom.id, {
        room_number: editFormData.room_number,
        location: editFormData.location,
        specialty: editFormData.specialty,
        notes: editFormData.notes,
        is_active: editFormData.is_active
      })
      
      setOperatingRooms(prev => prev.map(room => 
        room.id === selectedRoom.id ? updatedRoom : room
      ))
      setSelectedRoom(updatedRoom)
      setIsEditing(false)
      alert('Operating room updated successfully!')
    } catch (error) {
      console.error('Error updating room:', error)
      alert(`Error updating room: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (!formData.room_number) {
        throw new Error('Please fill in all required fields')
      }

      const existingRoom = operatingRooms.find(room => 
        room.room_number.toLowerCase() === formData.room_number.toLowerCase()
      )
      if (existingRoom) {
        throw new Error(`A room with number "${formData.room_number}" already exists`)
      }

      const newRoom = await operatingRoomsService.create({
        room_number: formData.room_number,
        location: formData.location,
        specialty: formData.specialty,
        notes: formData.notes,
        is_active: formData.is_active
      })
      
      setOperatingRooms(prev => [...prev, newRoom])
      setFormData({
        room_number: '',
        location: '',
        specialty: '',
        notes: '',
        is_active: true
      })
      setIsSheetOpen(false)
      alert('Operating room added successfully!')
    } catch (error) {
      console.error('Error creating room:', error)
      alert(`Error creating room: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-2 py-2 md:gap-3 md:py-3">
              <div className="px-3 lg:px-4">
                <div className="p-0">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h1 className="text-lg font-bold">Operating Rooms</h1>
                      <p className="text-muted-foreground text-xs">Manage surgical suites and equipment</p>
                    </div>
                    <div className="flex gap-2">
                      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                          <Button size="sm" className="h-7 px-2 text-xs">
                            <Plus className="h-3 w-3 mr-1.5" />
                            Add Room
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[320px] sm:w-[420px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle className="text-sm">Add New Operating Room</SheetTitle>
                            <SheetDescription className="text-xs">
                              Fill in the details to add a new operating room to the system.
                            </SheetDescription>
                          </SheetHeader>
                          <form onSubmit={handleSubmit} className="space-y-4 mt-4 pb-4">
                            <div className="space-y-3">
                              {/* Basic Information */}
                              <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                                  <Building2 className="h-4 w-4" />
                                  Basic Information
                                </h3>
                                
                                <div className="grid grid-cols-1 gap-3">
                                  <div className="space-y-1.5">
                                    <Label htmlFor="room_number" className="text-xs">Room Number *</Label>
                                    <div className="relative">
                                      <MapPin className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                                      <Input
                                        id="room_number"
                                        value={formData.room_number}
                                        onChange={(e) => handleInputChange('room_number', e.target.value)}
                                        placeholder="OR-101"
                                        className={`pl-8 h-8 text-xs ${validationErrors.room_number ? 'border-red-500' : ''}`}
                                        required
                                      />
                                    </div>
                                    {validationErrors.room_number && (
                                      <p className="text-sm text-red-500">{validationErrors.room_number}</p>
                                    )}
                                  </div>
                                  
                                                                    <div className="space-y-1.5">
                                    <Label htmlFor="location" className="text-xs">Location</Label>
                                    <Input
                                      id="location"
                                      value={formData.location}
                                      onChange={(e) => handleInputChange('location', e.target.value)}
                                      placeholder="Main Building, Floor 2"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    <Label htmlFor="specialty" className="text-xs">Specialty</Label>
                                    <Select value={formData.specialty} onValueChange={(value) => handleInputChange('specialty', value)}>
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Select specialty" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {specialties.map((specialty) => (
                                          <SelectItem key={specialty} value={specialty} className="text-xs">
                                            {specialty}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    <Label htmlFor="notes" className="text-xs">Notes</Label>
                                    <Textarea
                                      id="notes"
                                      value={formData.notes}
                                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('notes', e.target.value)}
                                      placeholder="Additional notes about the room..."
                                      rows={2}
                                      className="text-xs"
                                    />
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="is_active"
                                      checked={formData.is_active}
                                      onCheckedChange={(checked) => handleInputChange('is_active', checked as boolean)}
                                      className="h-3 w-3"
                                    />
                                    <Label htmlFor="is_active" className="text-xs">Active Room</Label>
                                  </div>
                                </div>
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
                                {isSubmitting ? 'Adding...' : 'Add Room'}
                              </Button>
                            </SheetFooter>
                          </form>
                        </SheetContent>
                      </Sheet>

                      {/* Room Detail Sheet */}
                      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
                        <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto">
                          {selectedRoom && (
                            <>
                              <SheetHeader>
                                <SheetTitle className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                                    <Building2 className="h-8 w-8" />
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold">#{selectedRoom.room_number}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {selectedRoom.location || 'No location specified'}
                                    </div>
                                  </div>
                                </SheetTitle>
                                <SheetDescription>
                                  {isEditing ? 'Edit room information' : `Detailed information about room ${selectedRoom.room_number}`}
                                </SheetDescription>
                              </SheetHeader>
                              
                              {isEditing ? (
                                // Edit Form
                                <form id="edit-room-form" onSubmit={handleUpdateRoom} className="space-y-6 mt-6">
                                  <div className="space-y-4">
                                    <div className="space-y-4">
                                      <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Basic Information
                                      </h3>
                                      
                                      <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_room_number">Room Number *</Label>
                                          <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                              id="edit_room_number"
                                              value={editFormData.room_number}
                                              onChange={(e) => handleEditInputChange('room_number', e.target.value)}
                                              placeholder="OR-101"
                                              className="pl-10"
                                              required
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_location">Location</Label>
                                          <Input
                                            id="edit_location"
                                            value={editFormData.location}
                                            onChange={(e) => handleEditInputChange('location', e.target.value)}
                                            placeholder="Main Building, Floor 2"
                                          />
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_specialty">Specialty</Label>
                                          <Select value={editFormData.specialty} onValueChange={(value) => handleEditInputChange('specialty', value)}>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select specialty" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {specialties.map((specialty) => (
                                                <SelectItem key={specialty} value={specialty}>
                                                  {specialty}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_notes">Notes</Label>
                                          <Textarea
                                            id="edit_notes"
                                            value={editFormData.notes}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleEditInputChange('notes', e.target.value)}
                                            placeholder="Additional notes about the room..."
                                            rows={3}
                                          />
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id="edit_is_active"
                                            checked={editFormData.is_active}
                                            onCheckedChange={(checked) => handleEditInputChange('is_active', checked as boolean)}
                                          />
                                          <Label htmlFor="edit_is_active">Active Room</Label>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </form>
                              ) : (
                                // View Mode
                                <div className="space-y-6 mt-6">
                                  {/* Basic Information */}
                                  <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                      <Building2 className="h-5 w-5" />
                                      Basic Information
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium text-muted-foreground">Room Number</Label>
                                        <div className="text-lg font-medium">#{selectedRoom.room_number}</div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                                        <div className="text-lg font-medium">
                                          {selectedRoom.location || 'Not specified'}
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium text-muted-foreground">Specialty</Label>
                                        <div className="text-lg font-medium">
                                          {selectedRoom.specialty || 'Not specified'}
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                        <Badge variant={selectedRoom.is_active ? "default" : "destructive"}>
                                          {selectedRoom.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Notes */}
                                  {selectedRoom.notes && (
                                    <div className="space-y-4">
                                      <h3 className="text-lg font-semibold">Notes</h3>
                                      <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm">{selectedRoom.notes}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* System Information */}
                                  <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">System Information</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium text-muted-foreground">Room ID</Label>
                                        <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                                          {selectedRoom.id}
                                        </div>
                                      </div>
                                      
                                                                              <div className="space-y-2">
                                          <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                                          <div className="text-sm">
                                            {new Date(selectedRoom.created_date).toLocaleDateString()}
                                          </div>
                                        </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <SheetFooter className="mt-6">
                                {isEditing ? (
                                  <>
                                    <Button type="button" variant="outline" onClick={cancelEditing}>
                                      Cancel
                                    </Button>
                                    <Button 
                                      type="submit" 
                                      form="edit-room-form"
                                      disabled={isSubmitting}
                                    >
                                      {isSubmitting ? 'Updating...' : 'Update Room'}
                                    </Button>
                                    <Button 
                                      type="button" 
                                      variant="destructive" 
                                      onClick={handleDeleteRoom}
                                      disabled={isSubmitting}
                                    >
                                      {isSubmitting ? 'Deleting...' : 'Delete Room'}
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <SheetClose asChild>
                                      <Button variant="outline">Close</Button>
                                    </SheetClose>
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        startEditing()
                                      }}
                                    >
                                      <Building2 className="h-4 w-4 mr-2" />
                                      Edit Room
                                    </Button>
                                  </>
                                )}
                              </SheetFooter>
                            </>
                          )}
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <Input
                      placeholder="Search rooms by name, number, or equipment..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="max-w-md h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">{filteredRooms.length} of {operatingRooms.length} rooms</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
                    {loading ? (
                      <div className="text-xs">Loading...</div>
                    ) : filteredRooms.length === 0 ? (
                      <div className="text-xs">No operating rooms found.</div>
                    ) : (
                      filteredRooms.map((room) => (
                        <Card 
                          key={room.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => openRoomDetail(room)}
                        >
                          <CardContent className="p-2 h-20 flex flex-col justify-center">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 mb-1">
                              <Building2 className="h-3 w-3" />
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-xs mb-0.5">#{room.room_number}</div>
                              <div className="text-[9px] text-muted-foreground mb-1">
                                {room.location || 'No location'}
                              </div>
                              <div className="flex gap-0.5 justify-center">
                                {room.specialty && (
                                  <Badge variant="secondary" className="text-[8px] px-0.5 py-0">{room.specialty}</Badge>
                                )}
                                <Badge variant={room.is_active ? "default" : "destructive"} className="text-[8px] px-0.5 py-0">
                                  {room.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
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