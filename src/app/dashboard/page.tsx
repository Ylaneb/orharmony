"use client"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useState, useEffect, useRef } from 'react'
import { surgeriesService } from '@/lib/services/surgeries'
import { assignmentsService } from '@/lib/services/assignments'
import { doctorsService } from '@/lib/services/doctors'
import { operatingRoomsService } from '@/lib/services/operating-rooms'
import { timeOffRequestsService } from '@/lib/services/time-off-requests'
import { LucideUser, LucideClipboardList, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<any[]>([])
  const [oorRooms, setOorRooms] = useState<any[]>([])
  const [surgeries, setSurgeries] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [timeOffDoctors, setTimeOffDoctors] = useState<string[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null)
  const [orbitAngle, setOrbitAngle] = useState(0)
  const orbitAngleRef = useRef(0)
  const [orbitPaused, setOrbitPaused] = useState(false)
  const [showRoomList, setShowRoomList] = useState(false)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const today = new Date().toISOString().split('T')[0]

  // Animate the orbit angle for continuous movement (optimized)
  useEffect(() => {
    let frame: number
    let lastUpdate = Date.now()
    function animate() {
      if (selectedDoctor && !orbitPaused) {
        const now = Date.now()
        // Only update every ~32ms (~30fps)
        if (now - lastUpdate > 32) {
          orbitAngleRef.current += 0.03 // slightly faster for smoothness
          setOrbitAngle(orbitAngleRef.current)
          lastUpdate = now
        }
        frame = requestAnimationFrame(animate)
      }
    }
    if (selectedDoctor && !orbitPaused) {
      frame = requestAnimationFrame(animate)
    }
    return () => cancelAnimationFrame(frame)
  }, [selectedDoctor, orbitPaused])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [roomsData, surgeriesData, assignmentsData, doctorsData] = await Promise.all([
        operatingRoomsService.getAll(),
        surgeriesService.getByDateRange(today, today),
        assignmentsService.getByWeek(today), // filter for today below
        doctorsService.getActive()
      ])
      
      // Sort rooms by room_number in ascending order (same as surgeries page) and filter out OOR rooms
      const sortedRooms = roomsData
        .filter((room: any) => room.location !== 'OOR') // Exclude OOR rooms from dashboard
        .sort((a: any, b: any) => 
          String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true })
        )
      
      // Get OOR rooms separately
      const sortedOorRooms = roomsData
        .filter((room: any) => room.location === 'OOR') // Only OOR rooms
        .sort((a: any, b: any) => 
          String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true })
        )
      
      setRooms(sortedRooms)
      setOorRooms(sortedOorRooms)
      setSurgeries(surgeriesData)
      setAssignments(assignmentsData.filter((a: any) => a.date === today))
      setDoctors(doctorsData)
      setLoading(false)
    }
    fetchData()
  }, [today])

  useEffect(() => {
    async function fetchTimeOff() {
      const offs = await timeOffRequestsService.getApprovedForDate(today)
      setTimeOffDoctors(offs.map((o: any) => o.doctor_id))
    }
    fetchTimeOff()
  }, [today])

  // Helper to get surgery for a room/slot
  const getSurgery = (roomId: string, slot: 'morning' | 'evening') =>
    surgeries.find((s: any) => s.room_id === roomId && s.time_slot === slot)
  // Helper to get assignment for a room/slot
  const getAssignment = (roomId: string, slot: 'morning' | 'evening') =>
    assignments.find((a: any) => a.operating_room_id === roomId && a.shift_type === slot)
  // Helper to get doctor name
  const getDoctorName = (doctorId: string) => doctors.find((d: any) => d.id === doctorId)?.name || 'Assigned'
  // Helper to check if a room has a surgery scheduled for a shift
  const hasSurgery = (roomId: string, slot: 'morning' | 'evening') =>
    surgeries.some((s: any) => s.room_id === roomId && s.time_slot === slot)

  // Helper to get available rooms for assignment
  const getAvailableRooms = () => {
    const assignedRoomIds = new Set(assignments.filter((a: any) => a.shift_type === 'morning').map((a: any) => a.operating_room_id))
    return rooms.filter((room: any) => !assignedRoomIds.has(room.id) && hasSurgery(room.id, 'morning'))
  }

  // Helper to get available doctors
  const getAvailableDoctors = () => {
    const unavailableIds = new Set<string>()
    assignments.forEach((a: any) => unavailableIds.add(a.doctor_id))
    timeOffDoctors.forEach(id => unavailableIds.add(id))
    return doctors.filter((doc: any) => !unavailableIds.has(doc.id))
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2 py-4 md:gap-3 md:py-4">
            {/* Today's Surgery Schedule Card - Morning Shift Only, Horizontal */}
            <div className="px-4 lg:px-6">
              <div className="rounded-lg border bg-white shadow-sm p-4 mb-2">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <LucideClipboardList className="w-4 h-4" style={{ color: '#FB8C00' }} />
                  Today&apos;s Morning Surgery Schedule
                </h2>
                {loading ? (
                  <div className="text-center text-gray-500 py-4 text-sm">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="p-1.5 border-b text-left">&nbsp;</th>
                          {rooms.map(room => (
                            <th key={room.id} className="p-1.5 border-b text-center">{room.room_number}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-1.5 font-medium text-left">Morning</td>
                          {rooms.map(room => {
                            const surgery = getSurgery(room.id, 'morning')
                            const assignment = getAssignment(room.id, 'morning')
                            return (
                              <td key={room.id} className="p-1.5 text-center">
                                {surgery ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="font-medium text-blue-700 text-sm">{surgery.surgery_type}</span>
                                    <span className="font-medium text-gray-700 text-sm">
                                      {assignment ? getDoctorName(assignment.doctor_id) : <span className="italic text-gray-400">Unassigned</span>}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-gray-400 italic">No surgery</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {/* Available Doctors and OOR Cards - Side by Side */}
            <div className="px-4 lg:px-6">
              <div className="flex flex-row gap-3">
                {/* Available Doctors Card */}
                <div className="w-1/3 rounded-lg border bg-white shadow-sm p-4 mb-2">
                  <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <LucideUser className="w-4 h-4" style={{ color: '#43A047' }} />
                    Available Doctors Today
                  </h2>
                  {loading ? (
                    <div className="text-center text-gray-500 py-4 text-sm">Loading...</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto pr-1">
                      {(() => {
                        const available = getAvailableDoctors()
                        return available.length > 0 ? (
                          <ul className="divide-y text-sm">
                            {available.map((doc: any) => (
                              <li key={doc.id} className="py-1.5 flex flex-col items-start gap-1.5">
                                <span
                                  className={`font-medium text-gray-900 text-sm doctor-name cursor-pointer relative ${selectedDoctor === doc.id ? 'doctor-glow' : ''}`}
                                  onClick={() => {
                                    setSelectedDoctor(selectedDoctor === doc.id ? null : doc.id)
                                    if (isMobile) setShowRoomList(selectedDoctor !== doc.id)
                                  }}
                                  style={{ position: 'relative', zIndex: selectedDoctor === doc.id ? 20 : 'auto', transition: 'box-shadow 0.3s' }}
                                >
                                  {doc.name}
                                  <AnimatePresence>
                                    {selectedDoctor === doc.id && (
                                      <>
                                        {/* Mobile: Popover List */}
                                        {isMobile ? (
                                          <motion.div
                                            className="fixed inset-0 z-30 flex items-center justify-center bg-black/30"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => { setSelectedDoctor(null); setShowRoomList(false); }}
                                          >
                                            <div
                                              className="bg-white rounded-lg shadow-lg p-3 w-11/12 max-w-xs mx-auto"
                                              onClick={e => e.stopPropagation()}
                                            >
                                              <div className="font-semibold mb-1.5 text-center text-sm">Assign to Room</div>
                                              <ul className="divide-y">
                                                {(() => {
                                                  const unassignedRooms = getAvailableRooms()
                                                  if (unassignedRooms.length === 0) {
                                                    return <li className="py-2 text-center text-gray-400 italic text-sm">No available rooms</li>
                                                  }
                                                  return unassignedRooms.map((room: any) => (
                                                    <li
                                                      key={room.id}
                                                      className="py-2.5 text-center font-medium text-primary-dark cursor-pointer hover:bg-primary-light rounded text-sm"
                                                      onClick={async () => {
                                                        if (!selectedDoctor) return
                                                        const doctor = doctors.find((d: any) => d.id === selectedDoctor)
                                                        if (!doctor) return
                                                        try {
                                                          const newAssignment = await assignmentsService.create({
                                                            doctor_id: doctor.id,
                                                            operating_room_id: room.id,
                                                            date: today,
                                                            shift_type: 'morning',
                                                            role: 'Primary',
                                                            notes: ''
                                                          })
                                                          setAssignments(prev => [...prev, newAssignment])
                                                          setSelectedDoctor(null)
                                                          setShowRoomList(false)
                                                        } catch (error) {
                                                          alert('Failed to assign doctor: ' + (error instanceof Error ? error.message : 'Unknown error'))
                                                        }
                                                      }}
                                                    >
                                                      {room.room_number}
                                                    </li>
                                                  ))
                                                })()}
                                              </ul>
                                              <button className="mt-3 w-full button-primary text-sm" onClick={() => { setSelectedDoctor(null); setShowRoomList(false); }}>Cancel</button>
                                            </div>
                                          </motion.div>
                                        ) : null}
                                      </>
                                    )}
                                  </AnimatePresence>
                                </span>
                                {doc.specialty && (
                                  <span className="text-[11px] text-gray-500">{doc.specialty}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-center text-gray-400 italic">No available doctors today</div>
                        )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* OOR Rooms Card */}
                <div className="w-1/3 rounded-lg border bg-white shadow-sm p-4 mb-2">
                  <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" style={{ color: '#FF6B35' }} />
                    OOR Rooms
                  </h2>
                  {loading ? (
                    <div className="text-center text-gray-500 py-4 text-sm">Loading...</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto pr-1">
                      {oorRooms.length > 0 ? (
                        <ul className="divide-y text-sm">
                          {oorRooms.map((room: any) => (
                            <li key={room.id} className="py-1.5 flex items-center gap-2">
                              <Activity className="w-3 h-3 text-orange-500" />
                              <span className="font-medium text-gray-900 text-sm">#{room.room_number}</span>
                              {room.specialty && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0.5 ml-auto">
                                  {room.specialty}
                                </Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center text-gray-400 italic">No OOR rooms found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }
