import React from 'react'

interface DebugAbsencesProps {
  absences: any[]
  doctors: any[]
  month: Date
}

export function DebugAbsences({ absences, doctors, month }: DebugAbsencesProps) {
  const singleDayRequests = absences.filter(a => a.request_start_date === a.request_end_date)
  const multiDayRequests = absences.filter(a => a.request_start_date !== a.request_end_date)
  
  // Group by type
  const absencesByType = absences.reduce((acc, absence) => {
    acc[absence.type] = (acc[absence.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Check for missing types
  const expectedTypes = ['vacation', 'sick_leave', 'personal', 'conference', 'other']
  const missingTypes = expectedTypes.filter(type => !absencesByType[type])
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg mb-4">
      <h3 className="font-bold mb-2">Debug Information</h3>
      <div className="text-sm space-y-2">
        <div>
          <strong>Total Absences:</strong> {absences.length}
        </div>
        <div>
          <strong>Single-day Requests:</strong> {singleDayRequests.length}
        </div>
        <div>
          <strong>Multi-day Requests:</strong> {multiDayRequests.length}
        </div>
        <div>
          <strong>Active Doctors:</strong> {doctors.length}
        </div>
        <div>
          <strong>Month:</strong> {month.toISOString().split('T')[0].substring(0, 7)}
        </div>
        
        <div className="mt-4">
          <strong>Absences by Type:</strong>
          <ul className="list-disc list-inside ml-4">
            {expectedTypes.map(type => (
              <li key={type} className={absencesByType[type] ? 'text-green-600' : 'text-red-600'}>
                {type.replace('_', ' ')}: {absencesByType[type] || 0}
              </li>
            ))}
          </ul>
        </div>
        
        {missingTypes.length > 0 && (
          <div className="mt-4 p-2 bg-yellow-100 rounded">
            <strong>Missing Types:</strong> {missingTypes.join(', ')}
          </div>
        )}
        
        {singleDayRequests.length > 0 && (
          <div className="mt-4">
            <strong>Single-day Requests:</strong>
            <ul className="list-disc list-inside ml-4">
              {singleDayRequests.map((absence, index) => (
                <li key={index}>
                  Doctor: {absence.doctor_id}, Date: {absence.request_start_date}, Type: {absence.type}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {multiDayRequests.length > 0 && (
          <div className="mt-4">
            <strong>Multi-day Requests:</strong>
            <ul className="list-disc list-inside ml-4">
              {multiDayRequests.slice(0, 5).map((absence, index) => (
                <li key={index}>
                  Doctor: {absence.doctor_id}, Start: {absence.request_start_date}, End: {absence.request_end_date}, Type: {absence.type}
                </li>
              ))}
              {multiDayRequests.length > 5 && (
                <li>... and {multiDayRequests.length - 5} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
} 