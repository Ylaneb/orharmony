"use client"

import { useState, useEffect } from 'react'

// Types for real-time events
export type RealtimeEvent = {
  type: 'absence_created' | 'absence_updated' | 'absence_deleted' | 'status_changed'
  data: any
  timestamp: number
}

// Client-side real-time hook
export function useRealtimeUpdates(callback: (event: RealtimeEvent) => void) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const eventSource = new EventSource('/api/realtime/stream')
    
    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }
    
    eventSource.onmessage = (event) => {
      try {
        const realtimeEvent: RealtimeEvent = JSON.parse(event.data)
        callback(realtimeEvent)
      } catch (error) {
        console.error('Error parsing real-time event:', error)
      }
    }
    
    eventSource.onerror = (error) => {
      setIsConnected(false)
      setError('Connection lost. Retrying...')
    }
    
    return () => {
      eventSource.close()
    }
  }, [callback])

  return { isConnected, error }
}
