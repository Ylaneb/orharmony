import { useEffect, useState } from 'react'
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { timeOffRequestsService } from '@/lib/services/time-off-requests'
import { doctorsService } from '@/lib/services/doctors'
import { format } from 'date-fns'

export function SectionCards() {
  const [pending, setPending] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [allReqs, docs] = await Promise.all([
        timeOffRequestsService.getAll(),
        doctorsService.getActive()
      ])
      setPending(allReqs.filter((r: any) => r.status === 'pending'))
      setDoctors(docs)
      setLoading(false)
    }
    fetchData()
  }, [])

  const getDoctorName = (id: string) => doctors.find((d: any) => d.id === id)?.name || 'Unknown'

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id + action)
    // Optimistic update
    setPending(pending => pending.filter(r => r.id !== id))
    try {
      await timeOffRequestsService.updateStatus(id, action === 'approve' ? 'approved' : 'rejected')
    } catch {
      // On error, refetch all and filter
      const allReqs = await timeOffRequestsService.getAll()
      setPending(allReqs.filter((r: any) => r.status === 'pending'))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>🕒 Pending Time Off Requests</CardTitle>
        <CardDescription>Approve or reject new time off requests directly from the dashboard.</CardDescription>
      </CardHeader>
      <div className="divide-y">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No pending requests</div>
        ) : (
          pending.map(req => (
            <div key={req.id} className="flex flex-col md:flex-row md:items-center gap-2 py-3 px-4">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{getDoctorName(req.doctor_id)}</div>
                <div className="text-xs text-gray-500">{format(new Date(req.request_start_date), 'd MMM yyyy')}
                  {req.request_end_date !== req.request_start_date &&
                    <> - {format(new Date(req.request_end_date), 'd MMM yyyy')}</>
                  }
                  <Badge className="ml-2" variant="outline">{req.type.replace('_', ' ')}</Badge>
                </div>
                <div className="text-xs text-gray-400">Requested: {format(new Date(req.created_date), 'd MMM yyyy')}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={actionLoading === req.id+'approve'} onClick={() => handleAction(req.id, 'approve')}>Approve</Button>
                <Button size="sm" variant="destructive" disabled={actionLoading === req.id+'reject'} onClick={() => handleAction(req.id, 'reject')}>Reject</Button>
              </div>
            </div>
          ))
        )}
      </div>
      <CardFooter>
        <div className="w-full text-right">
          <a href="/absences" className="text-blue-600 hover:underline text-sm">View all requests</a>
        </div>
      </CardFooter>
    </Card>
  )
}
