import { useState } from 'react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { SheetFooter } from './ui/sheet'

interface AssignDoctorFormProps {
  initialValues: {
    doctor_id: string
    operating_room_id: string
    date: string
    shift_type: 'morning' | 'evening'
    role: 'Primary' | 'Secondary'
    notes?: string
  }
  doctors: Array<{ id: string; name: string }>
  rooms: Array<{ id: string; room_number: string }>
  onSubmit: (values: { doctor_id: string; operating_room_id: string; date: string; shift_type: 'morning' | 'evening'; role: 'Primary' | 'Secondary'; notes?: string }) => void
  onCancel: () => void
  isSubmitting?: boolean
  validationErrors?: { [key: string]: string }
}

export function AssignDoctorForm({
  initialValues,
  doctors,
  rooms,
  onSubmit,
  onCancel,
  isSubmitting = false,
  validationErrors = {}
}: AssignDoctorFormProps) {
  const [form, setForm] = useState(initialValues)

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="doctor_id">Doctor *</Label>
          <Select
            value={form.doctor_id}
            onValueChange={value => handleChange('doctor_id', value)}
          >
            <SelectTrigger className={validationErrors.doctor_id ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map(doc => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.doctor_id && (
            <p className="text-sm text-red-500">{validationErrors.doctor_id}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="operating_room_id">Operating Room *</Label>
          <Select
            value={form.operating_room_id}
            onValueChange={value => handleChange('operating_room_id', value)}
          >
            <SelectTrigger className={validationErrors.operating_room_id ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map(room => (
                <SelectItem key={room.id} value={room.id}>
                  {room.room_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.operating_room_id && (
            <p className="text-sm text-red-500">{validationErrors.operating_room_id}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            type="date"
            value={form.date}
            onChange={e => handleChange('date', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className={validationErrors.date ? 'border-red-500' : ''}
          />
          {validationErrors.date && (
            <p className="text-sm text-red-500">{validationErrors.date}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="shift_type">Shift Type *</Label>
          <Select
            value={form.shift_type}
            onValueChange={value => handleChange('shift_type', value as 'morning' | 'evening')}
          >
            <SelectTrigger className={validationErrors.shift_type ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.shift_type && (
            <p className="text-sm text-red-500">{validationErrors.shift_type}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select
            value={form.role}
            onValueChange={value => handleChange('role', value as 'Primary' | 'Secondary')}
          >
            <SelectTrigger className={validationErrors.role ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Primary">Primary</SelectItem>
              <SelectItem value="Secondary">Secondary</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.role && (
            <p className="text-sm text-red-500">{validationErrors.role}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input
            type="text"
            value={form.notes || ''}
            onChange={e => handleChange('notes', e.target.value)}
            placeholder="Additional notes (optional)"
          />
        </div>
      </div>
      <SheetFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Assigning...' : 'Assign Doctor'}
        </Button>
      </SheetFooter>
    </form>
  )
} 