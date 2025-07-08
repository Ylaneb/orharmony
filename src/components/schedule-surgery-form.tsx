import { useState } from 'react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { SheetFooter } from './ui/sheet'
import { SURGERY_TYPES } from '@/lib/data/surgeries'

interface ScheduleSurgeryFormProps {
  initialValues: {
    room_id: string
    date: string
    time_slot: 'morning' | 'evening'
    surgery_type: string
    notes: string
  }
  rooms: Array<{ id: string; room_number: string }>
  onSubmit: (values: { room_id: string; date: string; time_slot: 'morning' | 'evening'; surgery_type: string; notes: string }) => void
  onCancel: () => void
  isSubmitting?: boolean
  validationErrors?: { [key: string]: string }
}

export function ScheduleSurgeryForm({
  initialValues,
  rooms,
  onSubmit,
  onCancel,
  isSubmitting = false,
  validationErrors = {}
}: ScheduleSurgeryFormProps) {
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
          <Label htmlFor="room_id">Operating Room *</Label>
          <Select
            value={form.room_id}
            onValueChange={value => handleChange('room_id', value)}
          >
            <SelectTrigger className={validationErrors.room_id ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select a room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map(room => (
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
          <Label htmlFor="time_slot">Time Slot *</Label>
          <Select
            value={form.time_slot}
            onValueChange={value => handleChange('time_slot', value)}
          >
            <SelectTrigger className={validationErrors.time_slot ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select time slot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.time_slot && (
            <p className="text-sm text-red-500">{validationErrors.time_slot}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="surgery_type">Surgery Type *</Label>
          <Select
            value={form.surgery_type}
            onValueChange={value => handleChange('surgery_type', value)}
          >
            <SelectTrigger className={validationErrors.surgery_type ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select surgery type" />
            </SelectTrigger>
            <SelectContent>
              {SURGERY_TYPES.map(type => (
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
            value={form.notes}
            onChange={e => handleChange('notes', e.target.value)}
            placeholder="Additional notes about the surgery..."
            rows={3}
          />
        </div>
      </div>
      <SheetFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Scheduling...' : 'Schedule Surgery'}
        </Button>
      </SheetFooter>
    </form>
  )
} 