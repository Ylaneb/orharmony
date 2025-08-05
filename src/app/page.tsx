import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Info, Calendar, FileText, Users } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 relative">
      {/* Info Icon Top Right */}
      <Link href="/info" className="absolute top-6 right-6 text-gray-500 hover:text-blue-600 transition-colors">
        <Info size={32} aria-label="Info" />
      </Link>
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
        <h1 className="text-4xl font-bold mb-8">
          Welcome to OR Harmony
        </h1>
        <div className="flex gap-4 justify-center mb-8 flex-wrap">
          <Link href="/dashboard">
            <Button className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              View Dashboard
            </Button>
          </Link>
          <Link href="/time-off-request">
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Request Time Off
            </Button>
          </Link>
          <Link href="/absences">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Absence Report
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
} 