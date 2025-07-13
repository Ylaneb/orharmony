// Test script to verify all absence types are working
// Run this in browser console to test the absence type handling

function testAbsenceTypes() {
  console.log('Testing absence type handling...')
  
  // Test data with all types
  const testAbsences = [
    {
      doctor_id: 'test-doctor-1',
      request_start_date: '2024-12-15',
      request_end_date: '2024-12-15',
      type: 'vacation',
      status: 'approved'
    },
    {
      doctor_id: 'test-doctor-2',
      request_start_date: '2024-12-16',
      request_end_date: '2024-12-16',
      type: 'sick_leave',
      status: 'approved'
    },
    {
      doctor_id: 'test-doctor-3',
      request_start_date: '2024-12-17',
      request_end_date: '2024-12-17',
      type: 'personal',
      status: 'approved'
    },
    {
      doctor_id: 'test-doctor-4',
      request_start_date: '2024-12-18',
      request_end_date: '2024-12-18',
      type: 'conference',
      status: 'approved'
    },
    {
      doctor_id: 'test-doctor-5',
      request_start_date: '2024-12-19',
      request_end_date: '2024-12-19',
      type: 'other',
      status: 'approved'
    }
  ]
  
  // Test the color mapping
  const ABSENCE_COLORS = {
    vacation: "bg-yellow-200 text-yellow-800",
    sick_leave: "bg-red-200 text-red-800",
    personal: "bg-blue-200 text-blue-800",
    conference: "bg-green-200 text-green-800",
    other: "bg-gray-200 text-gray-800",
  }
  
  console.log('Testing color mapping for each type:')
  testAbsences.forEach(absence => {
    const hasColor = ABSENCE_COLORS[absence.type]
    console.log(`${absence.type}: ${hasColor ? '✅' : '❌'} ${hasColor || 'NO COLOR'}`)
  })
  
  // Test date range logic
  console.log('\nTesting date range logic:')
  const testDay = new Date('2024-12-15')
  testAbsences.forEach(absence => {
    const startDate = new Date(absence.request_start_date + 'T00:00:00')
    const endDate = new Date(absence.request_end_date + 'T23:59:59')
    const dayStart = new Date(testDay.getFullYear(), testDay.getMonth(), testDay.getDate(), 0, 0, 0)
    const dayEnd = new Date(testDay.getFullYear(), testDay.getMonth(), testDay.getDate(), 23, 59, 59)
    
    const dateMatches = startDate <= dayEnd && endDate >= dayStart
    console.log(`${absence.type} (${absence.request_start_date}): ${dateMatches ? '✅' : '❌'}`)
  })
  
  // Test doctor matching
  console.log('\nTesting doctor matching:')
  const testDoctorId = 'test-doctor-1'
  testAbsences.forEach(absence => {
    const doctorMatches = absence.doctor_id === testDoctorId
    console.log(`${absence.type} (${absence.doctor_id}): ${doctorMatches ? '✅' : '❌'}`)
  })
  
  // Summary
  console.log('\nSummary:')
  const allTypesHaveColors = testAbsences.every(absence => ABSENCE_COLORS[absence.type])
  console.log(`All types have colors: ${allTypesHaveColors ? '✅' : '❌'}`)
  
  const allTypesAreApproved = testAbsences.every(absence => absence.status === 'approved')
  console.log(`All types are approved: ${allTypesAreApproved ? '✅' : '❌'}`)
  
  console.log('\nExpected absence types:', Object.keys(ABSENCE_COLORS))
  console.log('Test absence types:', testAbsences.map(a => a.type))
}

// Run the test
testAbsenceTypes() 