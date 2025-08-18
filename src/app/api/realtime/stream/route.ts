import { NextRequest } from 'next/server'
import { realtimeManager } from '@/lib/services/realtime-server'

// Force dynamic rendering for Server-Sent Events
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Generate unique client ID
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Create readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Add client to real-time manager
      realtimeManager.addClient(clientId, controller)
      
      // Send initial connection message
      const initialEvent = {
        type: 'connection_established',
        data: { clientId, message: 'Connected to real-time updates' },
        timestamp: Date.now()
      }
      
      controller.enqueue(`data: ${JSON.stringify(initialEvent)}\n\n`)
      
      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`)
        } catch (error) {
          clearInterval(heartbeat)
          realtimeManager.removeClient(clientId)
        }
      }, 30000) // Send heartbeat every 30 seconds
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        realtimeManager.removeClient(clientId)
      })
    },
    
    cancel() {
      realtimeManager.removeClient(clientId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}
