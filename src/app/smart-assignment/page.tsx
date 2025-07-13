"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SmartAssignmentForm } from '@/components/smart-assignment-form'
import { smartAssignmentsService } from '@/lib/services/smart-assignments'
import { useState } from 'react'
import { Zap, Users, Star, CheckCircle, AlertTriangle, Info, Brain, TrendingUp, Clock } from 'lucide-react'

export default function SmartAssignmentPage() {
  const [selectedRoom, setSelectedRoom] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedShift, setSelectedShift] = useState<'morning' | 'evening'>('morning')
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)
  const [lastAssignment, setLastAssignment] = useState<any>(null)

  const rooms = [
    { id: 'room-1', room_number: 'OR-1' },
    { id: 'room-2', room_number: 'OR-2' },
    { id: 'room-3', room_number: 'OR-3' },
    { id: 'room-4', room_number: 'OR-4' }
  ]

  const surgeryTypes = smartAssignmentsService.getSurgeryTypes()

  const handleAssignmentCreated = (assignment: any) => {
    setLastAssignment(assignment)
    setShowAssignmentForm(false)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 sm:p-6 space-y-6">
            {/* Header Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Smart Assignment System</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    AI-powered doctor assignment based on specialty preferences and availability
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Setup Section */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    Assignment Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="room" className="text-sm font-medium">Operating Room</Label>
                      <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select Room" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map(room => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.room_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-sm font-medium">Date</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="shift" className="text-sm font-medium">Shift</Label>
                      <Select value={selectedShift} onValueChange={(value) => setSelectedShift(value as 'morning' | 'evening')}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setShowAssignmentForm(true)}
                    disabled={!selectedRoom || !selectedDate}
                    className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Start Smart Assignment
                  </Button>
                </CardContent>
              </Card>

              {/* Information Section */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    Scoring System
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-green-800">Perfect Match</div>
                        <div className="text-xs text-green-600">100 points</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                      <Star className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-yellow-800">Secondary Match</div>
                        <div className="text-xs text-yellow-600">60 points</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 border border-blue-200">
                      <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-blue-800">High Preference</div>
                        <div className="text-xs text-blue-600">40 points</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-200">
                      <AlertTriangle className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-800">Available</div>
                        <div className="text-xs text-gray-600">10 points</div>
                      </div>
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      The system considers availability, time off, and existing assignments when making recommendations.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            {/* Assignment Form */}
            {showAssignmentForm && (
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Brain className="h-5 w-5" />
                    Smart Assignment Engine
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SmartAssignmentForm
                    roomId={selectedRoom}
                    date={selectedDate}
                    shift={selectedShift}
                    onAssignmentCreated={handleAssignmentCreated}
                    onCancel={() => setShowAssignmentForm(false)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Last Assignment Result */}
            {lastAssignment && (
              <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    Assignment Successful
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-green-700">Doctor</Label>
                      <div className="text-base font-medium text-green-800">
                        {lastAssignment.doctor_name || 'Assigned'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-green-700">Room</Label>
                      <div className="text-base font-medium text-green-800">
                        {rooms.find(r => r.id === lastAssignment.operating_room_id)?.room_number}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-green-700">Date</Label>
                      <div className="text-base font-medium text-green-800">
                        {new Date(lastAssignment.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-green-700">Shift</Label>
                      <Badge variant="outline" className="text-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        {lastAssignment.shift_type}
                      </Badge>
                    </div>
                  </div>
                  {lastAssignment.notes && (
                    <div className="mt-4 p-3 bg-green-100 rounded-lg">
                      <Label className="text-sm font-medium text-green-700">Notes</Label>
                      <p className="text-sm text-green-800 mt-1">{lastAssignment.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Available Surgery Types */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Available Surgery Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {surgeryTypes.map(type => (
                    <Badge key={type} variant="outline" className="text-xs py-1">
                      {type}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 