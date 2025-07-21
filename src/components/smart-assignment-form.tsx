import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2, Zap, Users, Star, StarOff, CheckCircle, AlertTriangle } from 'lucide-react'
import { smartAssignmentsService, type AssignmentRecommendation } from '@/lib/services/smart-assignments'

interface SmartAssignmentFormProps {
  roomId: string
  date: string
  shift: 'morning' | 'evening'
  onAssignmentCreated: (assignment: any) => void
  onCancel: () => void
}

export function SmartAssignmentForm({
  roomId,
  date,
  shift,
  onAssignmentCreated,
  onCancel
}: SmartAssignmentFormProps) {
  const [surgeryType, setSurgeryType] = useState('')
  const [recommendations, setRecommendations] = useState<AssignmentRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [error, setError] = useState<string>('')

  const surgeryTypes = smartAssignmentsService.getSurgeryTypes()

  const loadRecommendations = useCallback(async () => {
    if (!surgeryType) return
    
    setLoading(true)
    setError('')
    
    try {
      const recs = await smartAssignmentsService.getRecommendations(surgeryType, date, shift)
      setRecommendations(recs)
      
      // Auto-select the best match
      if (recs.length > 0) {
        setSelectedDoctor(recs[0].doctorId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }, [surgeryType, date, shift])

  useEffect(() => {
    loadRecommendations()
  }, [loadRecommendations])

  const handleAutoAssign = async () => {
    if (!surgeryType) {
      setError('Please select a surgery type first')
      return
    }

    setAutoAssigning(true)
    setError('')

    try {
      const result = await smartAssignmentsService.autoAssignDoctor(surgeryType, roomId, date, shift)
      
      if (result.success) {
        onAssignmentCreated(result.assignment)
      } else {
        setError(result.error || 'Auto-assignment failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-assignment failed')
    } finally {
      setAutoAssigning(false)
    }
  }

  const handleManualAssign = async () => {
    if (!selectedDoctor) {
      setError('Please select a doctor')
      return
    }

    setAutoAssigning(true)
    setError('')

    try {
      const assignment = await smartAssignmentsService.autoAssignDoctor(surgeryType, roomId, date, shift)
      onAssignmentCreated(assignment)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setAutoAssigning(false)
    }
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
      {/* Surgery Type Selection */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="surgery-type" className="text-sm font-medium">Surgery Type *</Label>
          <Select value={surgeryType} onValueChange={setSurgeryType}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select surgery type" />
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
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-pulse"></div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-sm font-medium text-gray-700">Analyzing Available Doctors</div>
            <div className="text-xs text-gray-500">Checking availability, preferences, and specialty matches...</div>
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

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recommended Doctors</h3>
              <p className="text-sm text-gray-600 mt-1">
                {recommendations.length} doctor{recommendations.length !== 1 ? 's' : ''} available for this surgery
              </p>
            </div>
            <Button 
              onClick={handleAutoAssign}
              disabled={autoAssigning}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {autoAssigning ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Auto-Assign Best Match
            </Button>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <Card 
                key={rec.doctorId} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedDoctor === rec.doctorId 
                    ? 'ring-2 ring-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' 
                    : 'hover:border-blue-200'
                }`}
                onClick={() => setSelectedDoctor(rec.doctorId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        rec.matchType === 'exact' ? 'bg-green-100 text-green-600' :
                        rec.matchType === 'preferred' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getMatchTypeIcon(rec.matchType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-gray-900">{rec.doctorName}</div>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              Best Match
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {rec.specialty} • Score: <span className="font-medium text-gray-900">{rec.score}</span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          {rec.reasons.map((reason, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              {reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      {selectedDoctor === rec.doctorId && (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          {selectedDoctor && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button 
                onClick={handleManualAssign}
                disabled={autoAssigning}
                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700"
              >
                {autoAssigning ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Assign Selected Doctor
              </Button>
              <Button variant="outline" onClick={onCancel} className="h-10">
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No Recommendations */}
      {!loading && !error && recommendations.length === 0 && surgeryType && (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">No Available Doctors</h3>
            <p className="text-sm text-gray-600 mt-1">
              No doctors are available for this surgery type on {new Date(date).toLocaleDateString()} ({shift} shift).
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 