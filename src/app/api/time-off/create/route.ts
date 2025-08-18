import { NextRequest } from 'next/server'
import { timeOffRequestsRealtimeService } from '@/lib/services/time-off-requests-realtime'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const created = await timeOffRequestsRealtimeService.create(body)
		return Response.json(created)
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error?.message || 'Failed to create' }), { status: 500 })
	}
}
