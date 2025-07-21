"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { timeOffRequestsService } from "@/lib/services/time-off-requests"
import { format } from "date-fns"
import { cn } from '@/lib/utils'

export function PendingRequestsWidget() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [popoverOpen, setPopoverOpen] = useState<{ [id: string]: boolean }>({})
  const [isExpanded, setIsExpanded] = useState(false)

  const fetchPendingRequests = async () => {
    setLoading(true)
    try {
      const allRequests = await timeOffRequestsService.getAll()
      const pending = allRequests.filter(req => req.status === 'pending')
      setRequests(pending)
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    setUpdatingId(id)
    try {
      await timeOffRequestsService.updateStatus(id, newStatus)
      // Refetch requests to update the list
      fetchPendingRequests()
    } catch {
      // Optionally show error
    } finally {
      setUpdatingId(null)
      setPopoverOpen(prev => ({ ...prev, [id]: false }))
    }
  }

  useEffect(() => {
    fetchPendingRequests()
  }, [])

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading pending requests...</div>
  }

  /* 
    // Temporarily commented out for testing - this would normally hide the widget
    if (requests.length === 0) {
      return null // Don't show anything if there are no pending requests
    }
  */

  return (
    <div className="mb-6">
      {!isExpanded ? (
        <Card className="p-4 flex justify-between items-center">
          <p>You have <span className="font-bold">{requests.length}</span> pending time off requests.</p>
          <Button onClick={() => setIsExpanded(true)}>Review</Button>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Pending Requests</CardTitle>
            <Button variant="ghost" onClick={() => setIsExpanded(false)}>Collapse</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{req.doctors?.name || req.doctor_id}</TableCell>
                    <TableCell>{format(new Date(req.request_start_date), "PPP")}</TableCell>
                    <TableCell>{format(new Date(req.request_end_date), "PPP")}</TableCell>
                    <TableCell>{req.type.replace("_", " ")}</TableCell>
                    <TableCell>
                      <Popover open={popoverOpen[req.id] || false} onOpenChange={open => setPopoverOpen(prev => ({ ...prev, [req.id]: open }))}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn("w-full justify-start", updatingId === req.id && "opacity-50 pointer-events-none")}
                          >
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-40 p-2">
                          <div className="flex flex-col gap-1">
                            {['pending', 'approved', 'rejected'].map(statusOption => (
                              <Button
                                key={statusOption}
                                variant={
                                  statusOption === 'approved' ? 'default' :
                                  statusOption === 'rejected' ? 'destructive' : 'outline'
                                }
                                size="sm"
                                className="w-full justify-start"
                                disabled={updatingId === req.id || req.status === statusOption}
                                onClick={() => handleStatusChange(req.id, statusOption as 'pending' | 'approved' | 'rejected')}
                              >
                                {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>{req.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 