"use client"

import React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  BookOpen, 
  Code, 
  Lightbulb, 
  Rocket, 
  Star,
  Calendar,
  Users,
  Building2,
  FileText,
  BarChart,
  Settings,
  HelpCircle
} from "lucide-react"

export default function HelpPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
            <div className="px-4 pt-4 lg:px-6 lg:pt-6">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold">Development Journal</h1>
                  <p className="text-muted-foreground">Project documentation, updates, and technical insights</p>
                </div>
              </div>
            </div>

            <div className="px-4 lg:px-6 pb-8">
              <div className="grid gap-6">
                
                {/* Latest Updates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="h-5 w-5 text-green-600" />
                      Latest Updates
                    </CardTitle>
                    <CardDescription>
                      Recent improvements and new features added to the system
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="default" className="mt-1">v1.2.0</Badge>
                        <div>
                          <h4 className="font-semibold">Live Absence Grid with Node.js SSE + Supabase Realtime</h4>
                          <p className="text-sm text-muted-foreground">
                            Introduced Server-Sent Events and Supabase realtime to broadcast changes instantly.
                            Added server API routes for create/update/delete/status so the grid refreshes
                            immediately without manual page reloads. Also added a live connection indicator.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs">Real-time</Badge>
                            <Badge variant="secondary" className="text-xs">SSE</Badge>
                            <Badge variant="secondary" className="text-xs">Supabase Realtime</Badge>
                            <Badge variant="secondary" className="text-xs">Instant Refresh</Badge>
                            <Badge variant="secondary" className="text-xs">API Routes</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-start gap-3">
                        <Badge variant="default" className="mt-1">v1.1.0</Badge>
                        <div>
                          <h4 className="font-semibold">Excel-Like Absence Report</h4>
                          <p className="text-sm text-muted-foreground">
                            Transformed the absence report into an Excel-like experience with immediate updates, 
                            scroll position persistence, and optimistic UI updates.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs">Immediate Updates</Badge>
                            <Badge variant="secondary" className="text-xs">Scroll Persistence</Badge>
                            <Badge variant="secondary" className="text-xs">Optimistic UI</Badge>
                            <Badge variant="secondary" className="text-xs">Grid Alignment</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-start gap-3">
                        <Badge variant="default" className="mt-1">v1.0.0</Badge>
                        <div>
                          <h4 className="font-semibold">Core System Launch</h4>
                          <p className="text-sm text-muted-foreground">
                            Initial release with doctor management, operating rooms, surgeries, 
                            and time-off request functionality.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs">Doctor Management</Badge>
                            <Badge variant="secondary" className="text-xs">Operating Rooms</Badge>
                            <Badge variant="secondary" className="text-xs">Surgeries</Badge>
                            <Badge variant="secondary" className="text-xs">Time-off Requests</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* System Features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-600" />
                      System Features
                    </CardTitle>
                    <CardDescription>
                      Overview of all available features and their capabilities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Doctor Management</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Manage doctor profiles, preferences, and availability schedules.
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Operating Rooms</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Track operating room availability and scheduling.
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">Surgeries</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Schedule and manage surgical procedures with doctor assignments.
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">Time-off Requests</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Submit and approve time-off requests with workflow management.
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <BarChart className="h-4 w-4 text-red-600" />
                          <span className="font-medium">Absence Report</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Excel-like grid view of all absences with immediate updates.
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">System Settings</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Configure system preferences and user settings.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-purple-600" />
                      Technical Insights
                    </CardTitle>
                    <CardDescription>
                      Key technical decisions and implementation details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Architecture</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Next.js 14 with App Router for modern React development</li>
                        <li>• TypeScript for type safety and better developer experience</li>
                        <li>• Tailwind CSS for responsive and consistent styling</li>
                        <li>• Supabase for backend database and authentication</li>
                        <li>• Custom hooks for reusable business logic</li>
                      </ul>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-semibold mb-2">Performance Optimizations</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Optimistic UI updates for immediate feedback</li>
                        <li>• Memoization for expensive computations</li>
                        <li>• Efficient data fetching with parallel API calls</li>
                        <li>• Scroll position persistence for better UX</li>
                        <li>• Background data synchronization</li>
                      </ul>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-semibold mb-2">User Experience</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Excel-like grid interface for familiarity</li>
                        <li>• Keyboard navigation support</li>
                        <li>• Responsive design for all devices</li>
                        <li>• Real-time updates without page refreshes</li>
                        <li>• Comprehensive error handling</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Future Updates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-blue-600" />
                      Future Updates
                    </CardTitle>
                    <CardDescription>
                      Upcoming improvements and areas of focus
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-1">Planned</Badge>
                        <div>
                          <p className="font-medium">Shift Types + Color Coding in Grid</p>
                          <p className="text-sm text-muted-foreground">
                            Add distinct shift types (e.g., morning/afternoon/night) with consistent color coding in the absence grid.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-1">Planned</Badge>
                        <div>
                          <p className="font-medium">Per‑Day Approval for Time‑off</p>
                          <p className="text-sm text-muted-foreground">
                            Allow approving time‑off one day at a time (partial approvals) for multi‑day requests.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-1">Planned</Badge>
                        <div>
                          <p className="font-medium">Live Grid Enhancements</p>
                          <p className="text-sm text-muted-foreground">
                            Further improve live sync, conflict handling, and latency with the real‑time pipeline.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-1">Planned</Badge>
                        <div>
                          <p className="font-medium">Time‑off Requests: Filtering & Search</p>
                          <p className="text-sm text-muted-foreground">
                            Add filters (status, doctor, date range, type) and text search to the time‑off request page.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tips & Tricks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      Tips & Tricks
                    </CardTitle>
                    <CardDescription>
                      Helpful tips for using the system effectively
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-1">Tip</Badge>
                        <div>
                          <p className="text-sm font-medium">Keyboard Navigation</p>
                          <p className="text-sm text-muted-foreground">
                            Use arrow keys to navigate the absence grid, Enter/Space to select ranges, 
                            and Escape to cancel selections.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-1">Tip</Badge>
                        <div>
                          <p className="text-sm font-medium">Scroll Position Memory</p>
                          <p className="text-sm text-muted-foreground">
                            The grid remembers your scroll position across refreshes and updates, 
                            just like Excel.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-1">Tip</Badge>
                        <div>
                          <p className="text-sm font-medium">Immediate Feedback</p>
                          <p className="text-sm text-muted-foreground">
                            When creating time-off entries, they appear immediately in the grid 
                            without needing to refresh the page.
                          </p>
                        </div>
                      </div>
                    </div>
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