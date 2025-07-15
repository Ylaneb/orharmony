import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Info } from "lucide-react"

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
        <div className="flex gap-4 justify-center mb-8">
          <Link href="/dashboard">
            <Button>View Dashboard</Button>
          </Link>
          <Link href="/time-off-request">
            <Button variant="outline">Request Time Off</Button>
          </Link>
        </div>
      </div>
    </main>
  )
} 