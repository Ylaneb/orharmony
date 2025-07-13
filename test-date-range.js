// Test script to verify date range overlap logic
// Run this in browser console to test the logic

function testDateRangeOverlap() {
  console.log('Testing date range overlap logic...')
  
  // Test cases
  const testCases = [
    {
      name: 'Single day request within range',
      requestStart: '2024-12-15',
      requestEnd: '2024-12-15',
      rangeStart: '2024-12-01',
      rangeEnd: '2024-12-31',
      expected: true
    },
    {
      name: 'Single day request outside range',
      requestStart: '2024-12-15',
      requestEnd: '2024-12-15',
      rangeStart: '2024-12-16',
      rangeEnd: '2024-12-31',
      expected: false
    },
    {
      name: 'Multi-day request overlapping start',
      requestStart: '2024-12-10',
      requestEnd: '2024-12-20',
      rangeStart: '2024-12-15',
      rangeEnd: '2024-12-31',
      expected: true
    },
    {
      name: 'Multi-day request overlapping end',
      requestStart: '2024-12-25',
      requestEnd: '2024-12-30',
      rangeStart: '2024-12-01',
      rangeEnd: '2024-12-26',
      expected: true
    }
  ]
  
  testCases.forEach(testCase => {
    const { requestStart, requestEnd, rangeStart, rangeEnd, expected } = testCase
    
    // Test the logic we're using in the database query
    const dbLogic = requestStart <= rangeEnd && requestEnd >= rangeStart
    
    // Test the logic we're using in the component
    const startDate = new Date(requestStart)
    const endDate = new Date(requestEnd)
    const rangeStartDate = new Date(rangeStart)
    const rangeEndDate = new Date(rangeEnd)
    
    const componentLogic = startDate <= rangeEndDate && endDate >= rangeStartDate
    
    console.log(`${testCase.name}:`)
    console.log(`  Request: ${requestStart} to ${requestEnd}`)
    console.log(`  Range: ${rangeStart} to ${rangeEnd}`)
    console.log(`  Database logic: ${dbLogic} (expected: ${expected})`)
    console.log(`  Component logic: ${componentLogic} (expected: ${expected})`)
    console.log(`  Pass: ${dbLogic === expected && componentLogic === expected}`)
    console.log('')
  })
}

// Run the test
testDateRangeOverlap() 