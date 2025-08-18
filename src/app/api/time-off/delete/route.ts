import { NextRequest } from 'next/server'
import { timeOffRequestsRealtimeService } from '@/lib/services/time-off-requests-realtime'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		await timeOffRequestsRealtimeService.delete(body.id)
		return Response.json({ ok: true })
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error?.message || 'Failed to delete' }), { status: 500 })
	}
}
