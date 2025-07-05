"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Phone, Mail, MessageCircle, Plus, User, IdCard, Stethoscope, Mail as MailIcon, Phone as PhoneIcon } from 'lucide-react'
import { doctorsService } from '@/lib/services/doctors'
import { useEffect, useState } from 'react'

interface DoctorFormData {
  name: string
  employee_id: string
  specialty: string
  contact_email: string
  contact_telephone: string
  is_active: boolean
  permissions: {
    manage_timeoff: boolean
    manage_shifts: boolean
    manage_assignments: boolean
    view_reports: boolean
    manage_doctors: boolean
  }
}

const specialties = [
  'Cardiology',
  'Neurology', 
  'Orthopedics',
  'General Surgery',
  'Emergency Medicine',
  'Pediatrics',
  'Oncology',
  'Dermatology',
  'Psychiatry',
  'Radiology',
  'Anesthesiology',
  'Urology',
  'Gynecology',
  'Ophthalmology',
  'ENT',
  'Other'
]

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState<DoctorFormData>({
    name: '',
    employee_id: '',
    specialty: '',
    contact_email: '',
    contact_telephone: '',
    is_active: true,
    permissions: {
      manage_timeoff: false,
      manage_shifts: false,
      manage_assignments: false,
      view_reports: false,
      manage_doctors: false
    }
  })
  const [formData, setFormData] = useState<DoctorFormData>({
    name: '',
    employee_id: '',
    specialty: '',
    contact_email: '',
    contact_telephone: '',
    is_active: true,
    permissions: {
      manage_timeoff: false,
      manage_shifts: false,
      manage_assignments: false,
      view_reports: false,
      manage_doctors: false
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})

  useEffect(() => {
    async function fetchDoctors() {
      setLoading(true)
      const data = await doctorsService.getAll()
      setDoctors(data)
      setLoading(false)
    }
    fetchDoctors()
  }, [])

  const filteredDoctors = doctors.filter((doc) => {
    const q = search.toLowerCase()
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.employee_id.toLowerCase().includes(q)
    )
  })

  const createWhatsAppLink = (phoneNumber: string) => {
    // Remove any non-digit characters and ensure it starts with country code
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    // If it doesn't start with a country code, assume it's US (+1)
    const formattedNumber = cleanNumber.startsWith('1') ? cleanNumber : `1${cleanNumber}`
    return `https://wa.me/${formattedNumber}`
  }

  const openDoctorDetail = (doctor: any) => {
    setSelectedDoctor(doctor)
    setIsDetailSheetOpen(true)
    setIsEditing(false)
  }

  const startEditing = () => {
    console.log('startEditing called')
    if (selectedDoctor) {
      console.log('Starting edit for doctor:', selectedDoctor)
      setEditFormData({
        name: selectedDoctor.name,
        employee_id: selectedDoctor.employee_id,
        specialty: selectedDoctor.specialty,
        contact_email: selectedDoctor.contact_email,
        contact_telephone: selectedDoctor.contact_telephone,
        is_active: selectedDoctor.is_active,
        permissions: selectedDoctor.permissions || {
          manage_timeoff: false,
          manage_shifts: false,
          manage_assignments: false,
          view_reports: false,
          manage_doctors: false
        }
      })
      setIsEditing(true)
      console.log('Edit mode enabled, isEditing should be true')
    } else {
      console.log('No selectedDoctor available')
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleDeleteDoctor = async () => {
    if (!selectedDoctor) return
    
    if (!confirm(`Are you sure you want to delete Dr. ${selectedDoctor.name}? This action cannot be undone.`)) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      console.log('Deleting doctor:', selectedDoctor.id)
      
      // Delete doctor from database
      await doctorsService.delete(selectedDoctor.id)
      
      console.log('Doctor deleted successfully')
      
      // Remove doctor from the list
      setDoctors(prev => prev.filter(doctor => doctor.id !== selectedDoctor.id))
      
      // Close the detail sheet
      setIsDetailSheetOpen(false)
      setSelectedDoctor(null)
      setIsEditing(false)
      
      // Show success message
      alert('Doctor deleted successfully!')
      
    } catch (error) {
      console.error('Error deleting doctor:', error)
      alert(`Error deleting doctor: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditInputChange = (field: string, value: string | boolean) => {
    if (field.startsWith('permissions.')) {
      const permissionKey = field.split('.')[1] as keyof DoctorFormData['permissions']
      setEditFormData(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [permissionKey]: value as boolean
        }
      }))
    } else {
      setEditFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }

    if (field.startsWith('permissions.')) {
      const permissionKey = field.split('.')[1] as keyof DoctorFormData['permissions']
      setFormData(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [permissionKey]: value as boolean
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))

      // Real-time validation for email and phone
      if (field === 'contact_email' && typeof value === 'string') {
        const existingEmail = doctors.find(doctor => 
          doctor.contact_email.toLowerCase() === value.toLowerCase()
        )
        if (existingEmail) {
          setValidationErrors(prev => ({
            ...prev,
            contact_email: 'This email is already registered'
          }))
        }
      }

      if (field === 'contact_telephone' && typeof value === 'string') {
        const existingPhone = doctors.find(doctor => 
          doctor.contact_telephone.replace(/\D/g, '') === value.replace(/\D/g, '')
        )
        if (existingPhone) {
          setValidationErrors(prev => ({
            ...prev,
            contact_telephone: 'This phone number is already registered'
          }))
        }
      }

      if (field === 'employee_id' && typeof value === 'string') {
        const existingEmployeeId = doctors.find(doctor => 
          doctor.employee_id.toLowerCase() === value.toLowerCase()
        )
        if (existingEmployeeId) {
          setValidationErrors(prev => ({
            ...prev,
            employee_id: 'This employee ID is already registered'
          }))
        }
      }
    }
  }

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Validate required fields
      if (!editFormData.name || !editFormData.employee_id || !editFormData.specialty || 
          !editFormData.contact_email || !editFormData.contact_telephone) {
        throw new Error('Please fill in all required fields')
      }

      // Check for duplicate email (excluding current doctor)
      const existingEmail = doctors.find(doctor => 
        doctor.id !== selectedDoctor.id && 
        doctor.contact_email.toLowerCase() === editFormData.contact_email.toLowerCase()
      )
      if (existingEmail) {
        throw new Error(`A doctor with email "${editFormData.contact_email}" already exists`)
      }

      // Check for duplicate phone number (excluding current doctor)
      const existingPhone = doctors.find(doctor => 
        doctor.id !== selectedDoctor.id && 
        doctor.contact_telephone.replace(/\D/g, '') === editFormData.contact_telephone.replace(/\D/g, '')
      )
      if (existingPhone) {
        throw new Error(`A doctor with phone number "${editFormData.contact_telephone}" already exists`)
      }

      // Check for duplicate employee ID (excluding current doctor)
      const existingEmployeeId = doctors.find(doctor => 
        doctor.id !== selectedDoctor.id && 
        doctor.employee_id.toLowerCase() === editFormData.employee_id.toLowerCase()
      )
      if (existingEmployeeId) {
        throw new Error(`A doctor with employee ID "${editFormData.employee_id}" already exists`)
      }

      console.log('Updating doctor with data:', {
        id: selectedDoctor.id,
        updates: {
          name: editFormData.name,
          employee_id: editFormData.employee_id,
          specialty: editFormData.specialty,
          contact_email: editFormData.contact_email,
          contact_telephone: editFormData.contact_telephone,
          is_active: editFormData.is_active,
          permissions: editFormData.permissions
        }
      })
      
      // Update doctor data
      const updatedDoctor = await doctorsService.update(selectedDoctor.id, {
        name: editFormData.name,
        employee_id: editFormData.employee_id,
        specialty: editFormData.specialty,
        contact_email: editFormData.contact_email,
        contact_telephone: editFormData.contact_telephone,
        is_active: editFormData.is_active,
        permissions: editFormData.permissions
      })
      
      console.log('Doctor updated successfully:', updatedDoctor)
      
      // Update the doctor in the list
      setDoctors(prev => prev.map(doctor => 
        doctor.id === selectedDoctor.id ? updatedDoctor : doctor
      ))
      
      // Update the selected doctor
      setSelectedDoctor(updatedDoctor)
      
      // Exit edit mode
      setIsEditing(false)
      
      // Show success message
      alert('Doctor updated successfully!')
      
    } catch (error) {
      console.error('Error updating doctor:', error)
      alert(`Error updating doctor: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Validate required fields
      if (!formData.name || !formData.employee_id || !formData.specialty || 
          !formData.contact_email || !formData.contact_telephone) {
        throw new Error('Please fill in all required fields')
      }

      // Check for duplicate email
      const existingEmail = doctors.find(doctor => 
        doctor.contact_email.toLowerCase() === formData.contact_email.toLowerCase()
      )
      if (existingEmail) {
        throw new Error(`A doctor with email "${formData.contact_email}" already exists`)
      }

      // Check for duplicate phone number
      const existingPhone = doctors.find(doctor => 
        doctor.contact_telephone.replace(/\D/g, '') === formData.contact_telephone.replace(/\D/g, '')
      )
      if (existingPhone) {
        throw new Error(`A doctor with phone number "${formData.contact_telephone}" already exists`)
      }

      // Check for duplicate employee ID
      const existingEmployeeId = doctors.find(doctor => 
        doctor.employee_id.toLowerCase() === formData.employee_id.toLowerCase()
      )
      if (existingEmployeeId) {
        throw new Error(`A doctor with employee ID "${formData.employee_id}" already exists`)
      }

      // Create doctor data object
      const doctorData = {
        name: formData.name,
        employee_id: formData.employee_id,
        specialty: formData.specialty,
        contact_email: formData.contact_email,
        contact_telephone: formData.contact_telephone,
        is_active: formData.is_active,
        permissions: formData.permissions
        // created_by will be set by database trigger or auth context
      }

      console.log('Creating doctor with data:', doctorData)
      
      const newDoctor = await doctorsService.create(doctorData)
      
      console.log('Doctor created successfully:', newDoctor)
      
      // Add the new doctor to the list
      setDoctors(prev => [...prev, newDoctor])
      
      // Reset form and close sheet
      setFormData({
        name: '',
        employee_id: '',
        specialty: '',
        contact_email: '',
        contact_telephone: '',
        is_active: true,
        permissions: {
          manage_timeoff: false,
          manage_shifts: false,
          manage_assignments: false,
          view_reports: false,
          manage_doctors: false
        }
      })
      setIsSheetOpen(false)
      
      // Show success message (you can replace this with a toast notification)
      alert('Doctor added successfully!')
      
    } catch (error) {
      console.error('Error creating doctor:', error)
      alert(`Error creating doctor: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="p-0">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h1 className="text-3xl font-bold">Doctors Directory</h1>
                      <p className="text-muted-foreground">Interactive contact list and overview</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">Import Doctors</Button>
                      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Doctor
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Add New Doctor</SheetTitle>
                            <SheetDescription>
                              Fill in the details to add a new doctor to the system.
                            </SheetDescription>
                          </SheetHeader>
                          <form onSubmit={handleSubmit} className="space-y-6 mt-6 pb-6">
                            <div className="space-y-4">
                              {/* Basic Information */}
                              <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                  <User className="h-5 w-5" />
                                  Basic Information
                                </h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input
                                      id="name"
                                      value={formData.name}
                                      onChange={(e) => handleInputChange('name', e.target.value)}
                                      placeholder="Dr. John Smith"
                                      required
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="employee_id">Employee ID *</Label>
                                    <div className="relative">
                                      <IdCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        id="employee_id"
                                        value={formData.employee_id}
                                        onChange={(e) => handleInputChange('employee_id', e.target.value)}
                                        placeholder="EMP001"
                                        className={`pl-10 ${validationErrors.employee_id ? 'border-red-500' : ''}`}
                                        required
                                      />
                                    </div>
                                    {validationErrors.employee_id && (
                                      <p className="text-sm text-red-500">{validationErrors.employee_id}</p>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="specialty">Specialty *</Label>
                                    <Select value={formData.specialty} onValueChange={(value) => handleInputChange('specialty', value)}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select specialty" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {specialties.map((specialty) => (
                                          <SelectItem key={specialty} value={specialty}>
                                            <div className="flex items-center gap-2">
                                              <Stethoscope className="h-4 w-4" />
                                              {specialty}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  

                                </div>
                              </div>
                              
                              {/* Contact Information */}
                              <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                  <MailIcon className="h-5 w-5" />
                                  Contact Information
                                </h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="contact_email">Email *</Label>
                                    <div className="relative">
                                      <MailIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        id="contact_email"
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={(e) => handleInputChange('contact_email', e.target.value)}
                                        placeholder="doctor@hospital.com"
                                        className={`pl-10 ${validationErrors.contact_email ? 'border-red-500' : ''}`}
                                        required
                                      />
                                    </div>
                                    {validationErrors.contact_email && (
                                      <p className="text-sm text-red-500">{validationErrors.contact_email}</p>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="contact_telephone">Phone Number *</Label>
                                    <div className="relative">
                                      <PhoneIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        id="contact_telephone"
                                        type="tel"
                                        value={formData.contact_telephone}
                                        onChange={(e) => handleInputChange('contact_telephone', e.target.value)}
                                        placeholder="+1-555-0101"
                                        className={`pl-10 ${validationErrors.contact_telephone ? 'border-red-500' : ''}`}
                                        required
                                      />
                                    </div>
                                    {validationErrors.contact_telephone && (
                                      <p className="text-sm text-red-500">{validationErrors.contact_telephone}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Status and Permissions */}
                              <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Status & Permissions</h3>
                                
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="is_active"
                                      checked={formData.is_active}
                                      onCheckedChange={(checked) => handleInputChange('is_active', checked as boolean)}
                                    />
                                    <Label htmlFor="is_active">Active Doctor</Label>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <Label className="text-sm font-medium">Permissions</Label>
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id="manage_timeoff"
                                          checked={formData.permissions.manage_timeoff}
                                          onCheckedChange={(checked) => handleInputChange('permissions.manage_timeoff', checked as boolean)}
                                        />
                                        <Label htmlFor="manage_timeoff" className="text-sm">Manage Time Off</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id="manage_shifts"
                                          checked={formData.permissions.manage_shifts}
                                          onCheckedChange={(checked) => handleInputChange('permissions.manage_shifts', checked as boolean)}
                                        />
                                        <Label htmlFor="manage_shifts" className="text-sm">Manage Shifts</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id="manage_assignments"
                                          checked={formData.permissions.manage_assignments}
                                          onCheckedChange={(checked) => handleInputChange('permissions.manage_assignments', checked as boolean)}
                                        />
                                        <Label htmlFor="manage_assignments" className="text-sm">Manage Assignments</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id="view_reports"
                                          checked={formData.permissions.view_reports}
                                          onCheckedChange={(checked) => handleInputChange('permissions.view_reports', checked as boolean)}
                                        />
                                        <Label htmlFor="view_reports" className="text-sm">View Reports</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id="manage_doctors"
                                          checked={formData.permissions.manage_doctors}
                                          onCheckedChange={(checked) => handleInputChange('permissions.manage_doctors', checked as boolean)}
                                        />
                                        <Label htmlFor="manage_doctors" className="text-sm">Manage Doctors</Label>
                                      </div>
                                    </div>
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
                                {isSubmitting ? 'Adding...' : 'Add Doctor'}
                              </Button>
                            </SheetFooter>
                          </form>
                        </SheetContent>
                      </Sheet>

                      {/* Doctor Detail Sheet */}
                      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
                        <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto">
                          {selectedDoctor && (
                            <>
                              <SheetHeader>
                                <SheetTitle className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-2xl font-bold text-gray-600">
                                    {selectedDoctor.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold">{selectedDoctor.name}</div>
                                    <div className="text-sm text-muted-foreground">#{selectedDoctor.employee_id}</div>
                                  </div>
                                </SheetTitle>
                                <SheetDescription>
                                  {isEditing ? 'Edit doctor information' : `Detailed information about Dr. ${selectedDoctor.name}`}
                                </SheetDescription>
                              </SheetHeader>
                              
                              {isEditing ? (
                                // Edit Form
                                <form id="edit-doctor-form" onSubmit={handleUpdateDoctor} className="space-y-6 mt-6">
                                  <div className="space-y-4">
                                    {/* Basic Information */}
                                    <div className="space-y-4">
                                      <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Basic Information
                                      </h3>
                                      
                                      <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_name">Full Name *</Label>
                                          <Input
                                            id="edit_name"
                                            value={editFormData.name}
                                            onChange={(e) => handleEditInputChange('name', e.target.value)}
                                            placeholder="Dr. John Smith"
                                            required
                                          />
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_employee_id">Employee ID *</Label>
                                          <div className="relative">
                                            <IdCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                              id="edit_employee_id"
                                              value={editFormData.employee_id}
                                              onChange={(e) => handleEditInputChange('employee_id', e.target.value)}
                                              placeholder="EMP001"
                                              className="pl-10"
                                              required
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_specialty">Specialty *</Label>
                                          <Select value={editFormData.specialty} onValueChange={(value) => handleEditInputChange('specialty', value)}>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select specialty" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {specialties.map((specialty) => (
                                                <SelectItem key={specialty} value={specialty}>
                                                  <div className="flex items-center gap-2">
                                                    <Stethoscope className="h-4 w-4" />
                                                    {specialty}
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Contact Information */}
                                    <div className="space-y-4">
                                      <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <MailIcon className="h-5 w-5" />
                                        Contact Information
                                      </h3>
                                      
                                      <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_contact_email">Email *</Label>
                                          <div className="relative">
                                            <MailIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                              id="edit_contact_email"
                                              type="email"
                                              value={editFormData.contact_email}
                                              onChange={(e) => handleEditInputChange('contact_email', e.target.value)}
                                              placeholder="doctor@hospital.com"
                                              className="pl-10"
                                              required
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_contact_telephone">Phone Number *</Label>
                                          <div className="relative">
                                            <PhoneIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                              id="edit_contact_telephone"
                                              type="tel"
                                              value={editFormData.contact_telephone}
                                              onChange={(e) => handleEditInputChange('contact_telephone', e.target.value)}
                                              placeholder="+1-555-0101"
                                              className="pl-10"
                                              required
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Status and Permissions */}
                                    <div className="space-y-4">
                                      <h3 className="text-lg font-semibold">Status & Permissions</h3>
                                      
                                      <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id="edit_is_active"
                                            checked={editFormData.is_active}
                                            onCheckedChange={(checked) => handleEditInputChange('is_active', checked as boolean)}
                                          />
                                          <Label htmlFor="edit_is_active">Active Doctor</Label>
                                        </div>
                                        
                                        <div className="space-y-3">
                                          <Label className="text-sm font-medium">Permissions</Label>
                                          <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id="edit_manage_timeoff"
                                                checked={editFormData.permissions.manage_timeoff}
                                                onCheckedChange={(checked) => handleEditInputChange('permissions.manage_timeoff', checked as boolean)}
                                              />
                                              <Label htmlFor="edit_manage_timeoff" className="text-sm">Manage Time Off</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id="edit_manage_shifts"
                                                checked={editFormData.permissions.manage_shifts}
                                                onCheckedChange={(checked) => handleEditInputChange('permissions.manage_shifts', checked as boolean)}
                                              />
                                              <Label htmlFor="edit_manage_shifts" className="text-sm">Manage Shifts</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id="edit_manage_assignments"
                                                checked={editFormData.permissions.manage_assignments}
                                                onCheckedChange={(checked) => handleEditInputChange('permissions.manage_assignments', checked as boolean)}
                                              />
                                              <Label htmlFor="edit_manage_assignments" className="text-sm">Manage Assignments</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id="edit_view_reports"
                                                checked={editFormData.permissions.view_reports}
                                                onCheckedChange={(checked) => handleEditInputChange('permissions.view_reports', checked as boolean)}
                                              />
                                              <Label htmlFor="edit_view_reports" className="text-sm">View Reports</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id="edit_manage_doctors"
                                                checked={editFormData.permissions.manage_doctors}
                                                onCheckedChange={(checked) => handleEditInputChange('permissions.manage_doctors', checked as boolean)}
                                              />
                                              <Label htmlFor="edit_manage_doctors" className="text-sm">Manage Doctors</Label>
                                            </div>
                                          </div>
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
                                    <User className="h-5 w-5" />
                                    Basic Information
                                  </h3>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                                      <div className="text-lg font-medium">{selectedDoctor.name}</div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-muted-foreground">Employee ID</Label>
                                      <div className="text-lg font-medium">#{selectedDoctor.employee_id}</div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-muted-foreground">Specialty</Label>
                                      <div className="flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4 text-muted-foreground" />
                                        <Badge variant="secondary">{selectedDoctor.specialty}</Badge>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                      <Badge variant={selectedDoctor.is_active ? "default" : "destructive"}>
                                        {selectedDoctor.is_active ? 'Active' : 'Inactive'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Contact Information */}
                                <div className="space-y-4">
                                  <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <MailIcon className="h-5 w-5" />
                                    Contact Information
                                  </h3>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                                      <div className="flex items-center gap-2">
                                        <MailIcon className="h-4 w-4 text-muted-foreground" />
                                        <a 
                                          href={`mailto:${selectedDoctor.contact_email}`}
                                          className="text-blue-600 hover:underline"
                                        >
                                          {selectedDoctor.contact_email}
                                        </a>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                                      <div className="flex items-center gap-2">
                                        <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                                        <a 
                                          href={`tel:${selectedDoctor.contact_telephone}`}
                                          className="text-blue-600 hover:underline"
                                        >
                                          {selectedDoctor.contact_telephone}
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-3 pt-2">
                                    <Button variant="outline" size="sm" asChild>
                                      <a href={`tel:${selectedDoctor.contact_telephone}`}>
                                        <Phone className="h-4 w-4 mr-2" />
                                        Call
                                      </a>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                      <a href={`mailto:${selectedDoctor.contact_email}`}>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Email
                                      </a>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                      <a 
                                        href={createWhatsAppLink(selectedDoctor.contact_telephone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        WhatsApp
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Permissions */}
                                <div className="space-y-4">
                                  <h3 className="text-lg font-semibold">Permissions</h3>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${selectedDoctor.permissions?.manage_timeoff ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className="text-sm">Manage Time Off</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${selectedDoctor.permissions?.manage_shifts ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className="text-sm">Manage Shifts</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${selectedDoctor.permissions?.manage_assignments ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className="text-sm">Manage Assignments</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${selectedDoctor.permissions?.view_reports ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className="text-sm">View Reports</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${selectedDoctor.permissions?.manage_doctors ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className="text-sm">Manage Doctors</span>
                                    </div>
                                  </div>
                                </div>
                                
                                                                 {/* System Information */}
                                 <div className="space-y-4">
                                   <h3 className="text-lg font-semibold">System Information</h3>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                       <Label className="text-sm font-medium text-muted-foreground">Doctor ID</Label>
                                       <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                                         {selectedDoctor.id}
                                       </div>
                                     </div>
                                     
                                     <div className="space-y-2">
                                       <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                                       <div className="text-sm">
                                         {new Date(selectedDoctor.created_date).toLocaleDateString()}
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
                                      form="edit-doctor-form"
                                      disabled={isSubmitting}
                                    >
                                      {isSubmitting ? 'Updating...' : 'Update Doctor'}
                                    </Button>
                                    <Button 
                                      type="button" 
                                      variant="destructive" 
                                      onClick={handleDeleteDoctor}
                                      disabled={isSubmitting}
                                    >
                                      {isSubmitting ? 'Deleting...' : 'Delete Doctor'}
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
                                      <User className="h-4 w-4 mr-2" />
                                      Edit Doctor
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
                  <div className="flex items-center gap-4 mb-4">
                    <Input
                      placeholder="Search doctors by name, specialty, or ID..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="max-w-md"
                    />
                    <span className="text-sm text-muted-foreground">{filteredDoctors.length} of {doctors.length} doctors</span>
                  </div>
                  <div className="space-y-4">
                    {loading ? (
                      <div>Loading...</div>
                    ) : filteredDoctors.length === 0 ? (
                      <div>No doctors found.</div>
                    ) : (
                                            filteredDoctors.map((doctor) => (
                        <Card 
                          key={doctor.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => openDoctorDetail(doctor)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-xl font-bold text-gray-600">
                                {doctor.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-lg">{doctor.name}</div>
                                <div className="text-xs text-muted-foreground">#{doctor.employee_id}</div>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="secondary">{doctor.specialty}</Badge>
                                  <Badge variant={doctor.is_active ? "default" : "destructive"}>
                                    {doctor.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={`tel:${doctor.contact_telephone}`} title="Call">
                                    <Phone className="h-5 w-5" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={`mailto:${doctor.contact_email}`} title="Email">
                                    <Mail className="h-5 w-5" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <a 
                                    href={createWhatsAppLink(doctor.contact_telephone)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    title="Text via WhatsApp"
                                  >
                                    <MessageCircle className="h-5 w-5" />
                                  </a>
                                </Button>
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
