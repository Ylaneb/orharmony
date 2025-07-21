import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { SheetFooter } from './ui/sheet'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2, Zap, Users, Star, CheckCircle, AlertTriangle, Brain } from 'lucide-react'
import { smartAssignmentsService, type AssignmentRecommendation } from '@/lib/services/smart-assignments'

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
  surgeryType?: string // Optional surgery type for smart assignment
  onSubmit: (values: { doctor_id: string; operating_room_id: string; date: string; shift_type: 'morning' | 'evening'; role: 'Primary' | 'Secondary'; notes?: string }) => void
  onCancel: () => void
  isSubmitting?: boolean
  validationErrors?: { [key: string]: string }
}

export function AssignDoctorForm({
  initialValues,
  doctors,
  rooms,
  surgeryType: initialSurgeryType,
  onSubmit,
  onCancel,
  isSubmitting = false,
  validationErrors = {}
}: AssignDoctorFormProps) {
  const [form, setForm] = useState(initialValues)
  const [surgeryType, setSurgeryType] = useState(initialSurgeryType || '')
  const [recommendations, setRecommendations] = useState<AssignmentRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [showSmartAssignment, setShowSmartAssignment] = useState(false)
  const [error, setError] = useState<string>('')

  const surgeryTypes = smartAssignmentsService.getSurgeryTypes()

  const loadRecommendations = useCallback(async () => {
    if (!surgeryType || !form.date || !form.shift_type) return
    
    setLoading(true)
    setError('')
    
    try {
      const recs = await smartAssignmentsService.getRecommendations(surgeryType, form.date, form.shift_type)
      setRecommendations(recs)
      setShowSmartAssignment(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }, [surgeryType, form.date, form.shift_type])

  // Auto-load recommendations if surgery type is provided
  useEffect(() => {
    if (initialSurgeryType && form.date && form.shift_type) {
      setSurgeryType(initialSurgeryType)
      loadRecommendations()
    }
  }, [initialSurgeryType, form.date, form.shift_type, loadRecommendations])

  // Load recommendations when surgery type changes
  useEffect(() => {
    if (surgeryType && form.date && form.shift_type) {
      loadRecommendations()
    }
  }, [surgeryType, form.date, form.shift_type, loadRecommendations])

  const handleSmartAssign = async (doctorId: string) => {
    setForm(prev => ({ ...prev, doctor_id: doctorId }))
    setShowSmartAssignment(false)
  }

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'bg-green-100 text-green-800 border-green-200'
      case 'preferred': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMatchTypeIcon = (matchType: string) => {
    switch (matchType) {
      case 'exact': return <CheckCircle className="h-4 w-4" />
      case 'preferred': return <Star className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Smart Assignment Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Smart Assignment</h3>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="surgery_type" className="text-sm font-medium">Surgery Type</Label>
            <Select value={surgeryType} onValueChange={setSurgeryType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select surgery type for smart recommendations" />
              </SelectTrigger>
              <SelectContent>
                {surgeryTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {surgeryType && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Required Specialty:</strong> {smartAssignmentsService.getSpecialtyMapping(surgeryType).primarySpecialty}
                <br />
                <span className="text-sm">Doctors will be ranked by their preference for this specialty (1 = highest priority)</span>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-pulse"></div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-sm font-medium text-gray-700">Analyzing Available Doctors</div>
            <div className="text-xs text-gray-500">Ranking by specialty preferences and availability...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Smart Recommendations */}
      {showSmartAssignment && recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold">Recommended Doctors</h4>
            <Badge variant="outline" className="text-xs">
              {recommendations.length} available
            </Badge>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recommendations.slice(0, 5).map((rec, index) => (
              <Card 
                key={rec.doctorId} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                  form.doctor_id === rec.doctorId 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => handleSmartAssign(rec.doctorId)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        rec.matchType === 'exact' ? 'bg-green-100 text-green-600' :
                        rec.matchType === 'preferred' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getMatchTypeIcon(rec.matchType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-sm">{rec.doctorName}</div>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              Best Match
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mb-1">
                          {rec.specialty} • Preference: <span className="font-medium">{rec.preference}/10</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {rec.reasons.slice(0, 2).join(' • ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      {form.doctor_id === rec.doctorId && (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Manual Assignment Form */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Manual Assignment</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="doctor_id" className="text-sm font-medium">Doctor *</Label>
              <Select
                value={form.doctor_id}
                onValueChange={value => handleChange('doctor_id', value)}
              >
                <SelectTrigger className={`h-9 ${validationErrors.doctor_id ? 'border-red-500' : ''}`}>
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
                <p className="text-xs text-red-500">{validationErrors.doctor_id}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="operating_room_id" className="text-sm font-medium">Room *</Label>
                <Select
                  value={form.operating_room_id}
                  onValueChange={value => handleChange('operating_room_id', value)}
                >
                  <SelectTrigger className={`h-9 ${validationErrors.operating_room_id ? 'border-red-500' : ''}`}>
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
                  <p className="text-xs text-red-500">{validationErrors.operating_room_id}</p>
                )}
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-sm font-medium">Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => handleChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`h-9 ${validationErrors.date ? 'border-red-500' : ''}`}
                />
                {validationErrors.date && (
                  <p className="text-xs text-red-500">{validationErrors.date}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shift_type" className="text-sm font-medium">Shift *</Label>
                <Select
                  value={form.shift_type}
                  onValueChange={value => handleChange('shift_type', value as 'morning' | 'evening')}
                >
                  <SelectTrigger className={`h-9 ${validationErrors.shift_type ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.shift_type && (
                  <p className="text-xs text-red-500">{validationErrors.shift_type}</p>
                )}
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-sm font-medium">Role *</Label>
                <Select
                  value={form.role}
                  onValueChange={value => handleChange('role', value as 'Primary' | 'Secondary')}
                >
                  <SelectTrigger className={`h-9 ${validationErrors.role ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.role && (
                  <p className="text-xs text-red-500">{validationErrors.role}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
              <Input
                type="text"
                value={form.notes || ''}
                onChange={e => handleChange('notes', e.target.value)}
                placeholder="Additional notes (optional)"
                className="h-9"
              />
            </div>
          </div>
          
          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-9">
              {isSubmitting ? 'Assigning...' : 'Assign Doctor'}
            </Button>
          </SheetFooter>
        </form>
      </div>
    </div>
  )
} 