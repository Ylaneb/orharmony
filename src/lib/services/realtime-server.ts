import { supabase } from '@/lib/supabase'

// Types for real-time events
export type RealtimeEvent = {
  type: 'absence_created' | 'absence_updated' | 'absence_deleted' | 'status_changed'
  data: any
  timestamp: number
}

// Server-side real-time manager
class RealtimeManager {
  private clients: Map<string, ReadableStreamDefaultController> = new Map()
  private supabaseSubscription: any = null

  constructor() {
    this.setupSupabaseRealtime()
  }

  // Set up Supabase real-time subscriptions
  private setupSupabaseRealtime() {
    this.supabaseSubscription = supabase
      .channel('time_off_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_off_requests'
        },
        (payload) => {
          this.handleDatabaseChange(payload)
        }
      )
      .subscribe()
  }

  // Handle database changes and broadcast to all clients
  private handleDatabaseChange(payload: any) {
    const event: RealtimeEvent = {
      type: this.getEventType(payload),
      data: payload.new || payload.old,
      timestamp: Date.now()
    }

    this.broadcastToAllClients(event)
  }

  // Determine event type from Supabase payload
  private getEventType(payload: any): RealtimeEvent['type'] {
    switch (payload.eventType) {
      case 'INSERT':
        return 'absence_created'
      case 'UPDATE':
        return 'absence_updated'
      case 'DELETE':
        return 'absence_deleted'
      default:
        return 'absence_updated'
    }
  }

  // Add a new client to receive real-time updates
  addClient(clientId: string, controller: ReadableStreamDefaultController) {
    this.clients.set(clientId, controller)
    
    // Send initial connection confirmation
    const event: RealtimeEvent = {
      type: 'absence_updated',
      data: { message: 'Connected to real-time updates' },
      timestamp: Date.now()
    }
    
    this.sendToClient(clientId, event)
  }

  // Remove a client
  removeClient(clientId: string) {
    this.clients.delete(clientId)
  }

  // Send event to specific client
  private sendToClient(clientId: string, event: RealtimeEvent) {
    const controller = this.clients.get(clientId)
    if (controller) {
      try {
        controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)
      } catch (error) {
        console.error('Error sending to client:', error)
        this.removeClient(clientId)
      }
    }
  }

  // Broadcast event to all connected clients
  private broadcastToAllClients(event: RealtimeEvent) {
    const clientIds = Array.from(this.clients.keys())
    
    clientIds.forEach(clientId => {
      this.sendToClient(clientId, event)
    })
  }

  // Manually trigger an update (for immediate feedback)
  triggerUpdate(type: RealtimeEvent['type'], data: any) {
    const event: RealtimeEvent = {
      type,
      data,
      timestamp: Date.now()
    }
    
    this.broadcastToAllClients(event)
  }

  // Cleanup
  destroy() {
    if (this.supabaseSubscription) {
      supabase.removeChannel(this.supabaseSubscription)
    }
    this.clients.clear()
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager()
