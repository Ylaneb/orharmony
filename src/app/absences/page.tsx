"use client"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import { doctorsService } from '@/lib/services/doctors'
import { timeOffRequestsService } from '@/lib/services/time-off-requests'
import { Button } from '@/components/ui/button'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isToday } from 'date-fns'
import { Plus, Minus } from 'lucide-react'
// @ts-expect-error: no types for hebcal
import Hebcal from 'hebcal'

const ABSENCE_COLORS: Record<string, string> = {
  vacation: 'bg-yellow-200 text-yellow-800',
  sick_leave: 'bg-red-200 text-red-800',
  personal: 'bg-blue-200 text-blue-800',
  conference: 'bg-green-200 text-green-800',
  other: 'bg-gray-200 text-gray-800',
}

export default function AbsenceReportPage() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [timeOffs, setTimeOffs] = useState<any[]>([])
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })

  // Jewish holidays for the current month
  const [jewishHolidays, setJewishHolidays] = useState<{[iso: string]: string}>({})
  useEffect(() => {
    function fetchHolidays() {
      const start = startOfMonth(month)
      const end = endOfMonth(month)
      const year = start.getFullYear()
      // Hebcal months are 1-based
      const monthNum = start.getMonth() + 1
      const hebcal = new Hebcal(year, monthNum)
      const map: {[iso: string]: string} = {}
      for (const dateKey in hebcal.holidays) {
        for (const event of hebcal.holidays[dateKey]) {
          const d = event.date.greg()
          const iso = d.toISOString().split('T')[0]
          if (!map[iso]) map[iso] = event.desc[0]
        }
      }
      setJewishHolidays(map)
    }
    fetchHolidays()
  }, [month])
  const [zoom, setZoom] = useState(1)

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (e.key === '+' || e.key === '=') {
          setZoom(z => Math.min(z + 0.1, 2))
          e.preventDefault()
        } else if (e.key === '-') {
          setZoom(z => Math.max(z - 0.1, 0.5))
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Mouse wheel zoom (Cmd/Ctrl + scroll)
  useEffect(() => {
    const wheelHandler = (e: WheelEvent) => {
      if ((e.metaKey || e.ctrlKey) && Math.abs(e.deltaY) > 0) {
        if (e.deltaY < 0) {
          setZoom(z => Math.min(z + 0.1, 2))
        } else if (e.deltaY > 0) {
          setZoom(z => Math.max(z - 0.1, 0.5))
        }
        e.preventDefault()
      }
    }
    window.addEventListener('wheel', wheelHandler, { passive: false })
    return () => window.removeEventListener('wheel', wheelHandler)
  }, [])

  useEffect(() => {
    async function fetchData() {
      const [docs, offs] = await Promise.all([
        doctorsService.getActive(),
        timeOffRequestsService.getApprovedForRange(
          format(startOfMonth(month), 'yyyy-MM-dd'),
          format(endOfMonth(month), 'yyyy-MM-dd')
        )
      ])
      setDoctors(docs)
      setTimeOffs(offs)
    }
    fetchData()
  }, [month])

  // Helper: get time off for doctor and day
  const getTimeOff = (doctorId: string, day: Date) => {
    return timeOffs.find((off: any) =>
      off.doctor_id === doctorId &&
      new Date(off.request_start_date) <= day &&
      new Date(off.request_end_date) >= day
    )
  }

  // Israel weekend: Friday (5) and Saturday (6)
  const isIsraelWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 5 || day === 6
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6 flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  Absence Report
                  <span className="text-base font-normal text-gray-500">({format(month, 'MMMM yyyy')})</span>
                </h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(ABSENCE_COLORS).map(([type, color]) => (
                    <span key={type} className={`inline-block px-2 py-1 rounded text-xs font-semibold ${color}`}>{type.replace('_', ' ')}</span>
                  ))}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMonth(subMonths(month, 1))}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setMonth(addMonths(month, 1))}>Next</Button>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}><Minus className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(z + 0.1, 2))}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <span className="text-xs text-gray-400 mt-1">Zoom: {(zoom*100).toFixed(0)}% (Cmd/Ctrl + / -)</span>
                </div>
              </div>
              <div className="px-4 lg:px-6 overflow-x-auto">
                <div className="w-full max-w-full">
                  <div
                    className="grid w-full"
                    style={{
                      gridTemplateColumns: `minmax(90px,1.2fr) repeat(${days.length}, minmax(0,1fr))`,
                      width: '100%',
                      minWidth: `${days.length * 40 + 120}px`, // ensure grid doesn't shrink too much
                      transform: `scale(${zoom})`,
                      transformOrigin: 'left top',
                      transition: 'transform 0.2s',
                    }}
                  >
                    {/* Header Row */}
                    <div className="p-2 border-b bg-gray-50 font-medium sticky left-0 top-0 z-30 flex items-center text-xs md:text-sm shadow" style={{minWidth:0,wordBreak:'break-word'}}>Doctor</div>
                    {days.map((day, colIdx) => {
                      const iso = day.toISOString().split('T')[0]
                      const isHoliday = jewishHolidays[iso]
                      let background = isToday(day)
                        ? 'rgba(56, 189, 248, 0.15)'
                        : isHoliday
                          ? 'rgba(255, 193, 7, 0.18)'
                          : isIsraelWeekend(day)
                            ? 'rgba(243, 244, 246, 1)'
                            : 'rgba(249, 250, 251, 1)'
                      return (
                        <div
                          key={day.toISOString()}
                          className={`p-2 border-b text-center font-medium sticky top-0 z-20 text-xs md:text-sm shadow`}
                          style={{
                            minWidth: 0,
                            background,
                          }}
                          title={isHoliday ? isHoliday : undefined}
                        >
                          {format(day, 'd')}
                          {day.getDay() === 6 && (
                            <span title="Shabbat" className="ml-1" role="img" aria-label="Shabbat candle">🕯️</span>
                          )}
                        </div>
                      )
                    })}
                    {/* Data Rows */}
                    {doctors.map((doc, rowIdx) => [
                      <div key={doc.id + '-name'} className="p-2 border-b bg-gray-50 font-medium sticky left-0 z-20 flex items-center text-xs md:text-sm shadow" style={{ minWidth: 0, wordBreak: 'break-word', top: rowIdx === 0 ? 38 : undefined }}>{doc.name}</div>,
                      ...days.map((day, colIdx) => {
                        const off = getTimeOff(doc.id, day)
                        const isWknd = isIsraelWeekend(day)
                        const isTod = isToday(day)
                        const iso = day.toISOString().split('T')[0]
                        const isHoliday = jewishHolidays[iso]
                        // Compose background: absence color overlays weekend/holiday highlight if both
                        let background = undefined
                        if (off && (isWknd || isHoliday)) {
                          // Blend: absence color with a subtle weekend/holiday bg
                          background = isHoliday
                            ? 'rgba(255, 193, 7, 0.18)'
                            : 'rgba(243,244,246,0.5)'
                        } else if (off) {
                          background = undefined // use class for color
                        } else if (isTod) {
                          background = 'rgba(56, 189, 248, 0.15)'
                        } else if (isHoliday) {
                          background = 'rgba(255, 193, 7, 0.18)'
                        } else if (isWknd) {
                          background = 'rgba(243, 244, 246, 1)'
                        }
                        return (
                          <div
                            key={doc.id + '-' + day.toISOString()}
                            className={`p-1 border-b text-center flex items-center justify-center ${off ? ABSENCE_COLORS[off.type] : ''} text-xs md:text-sm`}
                            style={{
                              minWidth: 0,
                              background,
                            }}
                          >
                            {off ? (
                              <span className="sr-only">{off.type.replace('_', ' ')}</span>
                            ) : ''}
                          </div>
                        )
                      })
                    ])}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 