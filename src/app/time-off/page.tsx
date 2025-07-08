"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { timeOffRequestsService } from "@/lib/services/time-off-requests"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function TimeOffRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleStatusChange = async (id: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    setUpdatingId(id)
    try {
      await timeOffRequestsService.updateStatus(id, newStatus)
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req))
    } catch {
      // Optionally show error
    } finally {
      setUpdatingId(null)
    }
  }

  useEffect(() => {
    async function fetchRequests() {
      setLoading(true)
      try {
        const data = await timeOffRequestsService.getAll()
        setRequests(data)
      } catch {
        setRequests([])
      } finally {
        setLoading(false)
      }
    }
    fetchRequests()
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Time Off Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="p-8 text-center text-gray-500">Loading requests...</div>
                    ) : (
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
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "outline"}
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
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 