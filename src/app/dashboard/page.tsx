"use client"
import { AppSidebar } from "@/components/app-sidebar"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useState, useEffect, useRef } from 'react'
import { surgeriesService } from '@/lib/services/surgeries'
import { assignmentsService } from '@/lib/services/assignments'
import { doctorsService } from '@/lib/services/doctors'
import { operatingRoomsService } from '@/lib/services/operating-rooms'
import { timeOffRequestsService } from '@/lib/services/time-off-requests'
import { LucideUser, LucideDoorOpen, LucideClipboardList } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<any[]>([])
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
      setRooms(roomsData)
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

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Today's Surgery Schedule Card - Morning Shift Only, Horizontal */}
              <div className="px-4 lg:px-6">
                <div className="rounded-lg border bg-white shadow-sm p-4 mb-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <LucideClipboardList className="w-5 h-5" style={{ color: '#FB8C00' }} />
                    Today's Morning Surgery Schedule
                  </h2>
                  {loading ? (
                    <div className="text-center text-gray-500 py-8">Loading...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="p-2 border-b text-left">&nbsp;</th>
                            {rooms.map(room => (
                              <th key={room.id} className="p-2 border-b text-center">{room.room_number}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-2 font-medium text-left">Morning</td>
                            {rooms.map(room => {
                              const surgery = getSurgery(room.id, 'morning')
                              const assignment = getAssignment(room.id, 'morning')
                              return (
                                <td key={room.id} className="p-2 text-center">
                                  {surgery ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="font-medium text-blue-700 text-base">{surgery.surgery_type}</span>
                                      <span className="font-medium text-gray-700 text-base">
                                        {assignment ? getDoctorName(assignment.doctor_id) : <span className="italic text-gray-400">Unassigned</span>}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">No surgery</span>
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
              {/* Available Doctors + Unassigned Rooms Cards Row */}
              <div className="px-4 lg:px-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Available Doctors Card */}
                  <div className="flex-1 rounded-lg border bg-white shadow-sm p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <LucideUser className="w-5 h-5" style={{ color: '#43A047' }} />
                      Available Doctors Today
                    </h2>
                    {loading ? (
                      <div className="text-center text-gray-500 py-8">Loading...</div>
                    ) : (
                      <div>
                        {(() => {
                          const unavailableIds = new Set<string>()
                          assignments.forEach((a: any) => unavailableIds.add(a.doctor_id))
                          timeOffDoctors.forEach(id => unavailableIds.add(id))
                          const available = doctors.filter((doc: any) => !unavailableIds.has(doc.id))
                          return available.length > 0 ? (
                            <ul className="divide-y">
                              {available.map((doc: any) => (
                                <li key={doc.id} className="py-2 flex flex-col items-start gap-2">
                                  <span
                                    className={`font-medium text-gray-900 doctor-name cursor-pointer relative ${selectedDoctor === doc.id ? 'doctor-glow' : ''}`}
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
                                                className="bg-white rounded-lg shadow-lg p-4 w-11/12 max-w-xs mx-auto"
                                                onClick={e => e.stopPropagation()}
                                              >
                                                <div className="font-semibold mb-2 text-center">Assign to Room</div>
                                                <ul className="divide-y">
                                                  {(() => {
                                                    const assignedRoomIds = new Set(assignments.filter((a: any) => a.shift_type === 'morning').map((a: any) => a.operating_room_id))
                                                    const unassignedRooms = rooms.filter((room: any) => !assignedRoomIds.has(room.id) && hasSurgery(room.id, 'morning'))
                                                    if (unassignedRooms.length === 0) {
                                                      return <li className="py-2 text-center text-gray-400 italic">No available rooms</li>
                                                    }
                                                    return unassignedRooms.map((room: any) => (
                                                      <li
                                                        key={room.id}
                                                        className="py-3 text-center font-medium text-primary-dark cursor-pointer hover:bg-primary-light rounded"
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
                                                <button className="mt-4 w-full button-primary" onClick={() => { setSelectedDoctor(null); setShowRoomList(false); }}>Cancel</button>
                                              </div>
                                            </motion.div>
                                          ) : (
                                            // Desktop: Orbit Animation
                                            <>
                                              {/* Blurred overlay */}
                                              <motion.div
                                                className="orbit-overlay"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                onClick={() => setSelectedDoctor(null)}
                                              />
                                              {/* Orbiting rooms */}
                                              <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                                className="absolute left-1/2 top-full z-20 mt-2"
                                                style={{ transform: 'translateX(-50%)', width: 160, height: 160 }}
                                              >
                                                {(() => {
                                                  const assignedRoomIds = new Set(assignments.filter((a: any) => a.shift_type === 'morning').map((a: any) => a.operating_room_id))
                                                  const unassignedRooms = rooms.filter((room: any) =>
                                                    !assignedRoomIds.has(room.id) && hasSurgery(room.id, 'morning')
                                                  )
                                                  const RADIUS = 80
                                                  const ITEM_SIZE = 38
                                                  const GAP = 12
                                                  if (unassignedRooms.length === 0) {
                                                    return <span className="text-xs text-gray-400 italic">No available rooms</span>
                                                  }
                                                  return unassignedRooms.map((room: any, i: number) => {
                                                    // All items share the same orbitAngle, so they move together
                                                    const angle = orbitAngle + (i / unassignedRooms.length) * 2 * Math.PI
                                                    return (
                                                      <motion.span
                                                        key={room.id}
                                                        className="room-number bg-primary-light rounded-full text-sm shadow border border-white cursor-pointer"
                                                        initial={{ x: 0, y: 0, opacity: 0 }}
                                                        animate={{
                                                          x: (RADIUS + ITEM_SIZE / 2 + GAP) * Math.cos(angle),
                                                          y: (RADIUS + ITEM_SIZE / 2 + GAP) * Math.sin(angle),
                                                          opacity: 1,
                                                          rotate: 360,
                                                        }}
                                                        exit={{ opacity: 0, scale: 0.7 }}
                                                        transition={{ duration: 0.1 }}
                                                        style={{ position: 'absolute', width: ITEM_SIZE, height: ITEM_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: 2, boxSizing: 'border-box' }}
                                                        onMouseEnter={() => setOrbitPaused(true)}
                                                        onMouseLeave={() => setOrbitPaused(false)}
                                                        onClick={async () => {
                                                          if (!selectedDoctor) return
                                                          // Assign doctor to this room for morning shift
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
                                                          } catch (error) {
                                                            alert('Failed to assign doctor: ' + (error instanceof Error ? error.message : 'Unknown error'))
                                                          }
                                                        }}
                                                      >
                                                        {room.room_number}
                                                      </motion.span>
                                                    )
                                                  })
                                                })()}
                                              </motion.div>
                                            </>
                                          )}
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </span>
                                  {doc.specialty && (
                                    <span className="text-xs text-gray-500">{doc.specialty}</span>
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
                  {/* Unassigned Rooms Card */}
                  <div className="flex-1 rounded-lg border bg-white shadow-sm p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <LucideDoorOpen className="w-5 h-5" style={{ color: '#D81B60' }} />
                      Rooms Without Assigned Doctor (Morning)
                    </h2>
                    {loading ? (
                      <div className="text-center text-gray-500 py-8">Loading...</div>
                    ) : (
                      <div>
                        {(() => {
                          // Rooms with no doctor assigned for morning
                          const assignedRoomIds = new Set(assignments.filter((a: any) => a.shift_type === 'morning').map((a: any) => a.operating_room_id))
                          const unassignedRooms = rooms.filter((room: any) => !assignedRoomIds.has(room.id) && hasSurgery(room.id, 'morning'))
                          return unassignedRooms.length > 0 ? (
                            <ul className="divide-y">
                              {unassignedRooms.map((room: any) => (
                                <li key={room.id} className="py-2 flex items-center gap-4">
                                  <span className="font-medium text-gray-900">{room.room_number}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-center text-gray-400 italic">All rooms have a doctor assigned</div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Existing dashboard content placeholder */}
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">Dashboard Content</h3>
                    <p className="text-sm text-gray-500 mt-2">Your dashboard content will appear here</p>
                  </div>
                </div>
              </div>
            </div>
            <SectionCards />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
