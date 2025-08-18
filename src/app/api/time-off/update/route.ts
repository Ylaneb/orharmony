import { NextRequest } from 'next/server'
import { timeOffRequestsRealtimeService } from '@/lib/services/time-off-requests-realtime'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const { id, ...updateData } = body
		const updated = await timeOffRequestsRealtimeService.update(id, updateData)
		return Response.json(updated)
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error?.message || 'Failed to update' }), { status: 500 })
	}
}
