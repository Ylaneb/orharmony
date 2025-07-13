import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent } from './ui/card'
import { Plus, X, Star, StarOff } from 'lucide-react'
import type { DoctorPreference } from '@/lib/data/models'
import { smartAssignmentsService } from '@/lib/services/smart-assignments'

interface PreferenceEditorProps {
  preferences: DoctorPreference[]
  onChange: (preferences: DoctorPreference[]) => void
  maxPreferences?: number
  showErrorsOnSubmit?: boolean
}

export function PreferenceEditor({ 
  preferences, 
  onChange, 
  maxPreferences = 10,
  showErrorsOnSubmit = false
}: PreferenceEditorProps) {
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([])
  const [usedSpecialties, setUsedSpecialties] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    // Get all available specialties
    const specialties = smartAssignmentsService.getSpecialties()
    setAvailableSpecialties(specialties)
    // Track which specialties are already used
    const used = new Set(preferences.map(p => p.specialty))
    setUsedSpecialties(used)
    // Only validate on submit or if not empty
    if (submitted || showErrorsOnSubmit) validatePreferences(preferences)
    // eslint-disable-next-line
  }, [preferences, submitted, showErrorsOnSubmit])

  const getAvailableSpecialties = () => {
    return availableSpecialties.filter(specialty => !usedSpecialties.has(specialty))
  }

  const getNextAvailableRank = () => {
    for (let i = 1; i <= maxPreferences; i++) {
      if (!preferences.some(p => p.preference === i)) return i
    }
    return preferences.length + 1
  }

  const addPreference = () => {
    const specialtiesLeft = getAvailableSpecialties()
    if (preferences.length < maxPreferences && specialtiesLeft.length > 0) {
      const newPreference: DoctorPreference = {
        specialty: specialtiesLeft[0],
        preference: getNextAvailableRank()
      }
      // Use setTimeout to prevent immediate re-render that might close the form
      setTimeout(() => {
        onChange([...preferences, newPreference])
      }, 0)
    }
  }

  const removePreference = (index: number) => {
    const newPreferences = preferences.filter((_, i) => i !== index)
    onChange(newPreferences)
  }

  const updateSpecialty = (index: number, specialty: string) => {
    const newPreferences = [...preferences]
    newPreferences[index].specialty = specialty
    onChange(newPreferences)
  }

  const updateRank = (index: number, rank: number) => {
    const newPreferences = [...preferences]
    newPreferences[index].preference = rank
    onChange(newPreferences)
  }

  const validatePreferences = (prefs: DoctorPreference[]) => {
    const ranks = prefs.map(p => p.preference)
    const specialties = prefs.map(p => p.specialty)
    const errors: string[] = []
    // Check for duplicate ranks
    const rankSet = new Set(ranks)
    if (rankSet.size !== ranks.length) {
      errors.push('Each specialty must have a unique ranking (1-10).')
    }
    // Check for out-of-range
    if (ranks.some(r => r < 1 || r > 10)) {
      errors.push('Rankings must be between 1 and 10.')
    }
    // Only show empty specialty error on submit
    if ((submitted || showErrorsOnSubmit) && specialties.some(s => !s)) {
      errors.push('Please select a specialty for each preference.')
    }
    setErrors(errors)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    validatePreferences(preferences)
  }

  const getPreferenceColor = (preference: number) => {
    if (preference <= 3) return 'bg-green-100 text-green-800 border-green-200'
    if (preference <= 6) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPreferenceIcon = (preference: number) => {
    if (preference <= 3) return <Star className="h-4 w-4" />
    return <StarOff className="h-4 w-4" />
  }

  const canAddPreference = preferences.length < maxPreferences && getAvailableSpecialties().length > 0 && getNextAvailableRank() <= 10

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Specialty Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Set a unique ranking (1 = highest, 10 = lowest) for each specialty. No duplicates allowed.
          </p>
        </div>
        {canAddPreference && (
          <Button type="button" variant="outline" size="sm" onClick={addPreference} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Preference
          </Button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="text-sm text-red-600 space-y-1 p-3 bg-red-50 rounded-md border border-red-200">
          {errors.map((err, i) => <div key={i}>{err}</div>)}
        </div>
      )}

      {preferences.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              No preferences set. Add your specialty preferences to help with automatic assignments.
            </p>
            <Button type="button" onClick={addPreference} disabled={!canAddPreference}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Preference
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {preferences.map((pref, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Badge 
                    variant="secondary" 
                    className={`w-8 h-8 flex items-center justify-center shrink-0 ${getPreferenceColor(pref.preference)}`}
                  >
                    {getPreferenceIcon(pref.preference)}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-muted-foreground shrink-0">
                        Specialty
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <Select
                        value={pref.specialty}
                        onValueChange={(value) => updateSpecialty(index, value)}
                      >
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                        <SelectContent>
                          {[pref.specialty, ...getAvailableSpecialties()].filter((v, i, arr) => v && arr.indexOf(v) === i).map(specialty => (
                            <SelectItem key={specialty} value={specialty}>
                              {specialty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground shrink-0">Rank</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={pref.preference}
                          onChange={e => updateRank(index, Math.max(1, Math.min(10, Number(e.target.value))))}
                          className="w-16 border rounded px-2 py-1 text-center"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePreference(index)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {preferences.length > 0 && (
        <div className="text-xs text-muted-foreground p-3 bg-blue-50 rounded-md border border-blue-200">
          <p>💡 <strong>Tip:</strong> Preferences 1-3 are considered high priority and will be prioritized for matching surgeries.</p>
        </div>
      )}
    </div>
  )
} 