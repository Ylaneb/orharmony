import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
        <h1 className="text-4xl font-bold mb-8">
          Welcome to OR Harmony Next
        </h1>
        <p className="text-xl mb-8 text-muted-foreground">
          A Next.js application with React, TypeScript, and shadcn/ui
        </p>
        
        <div className="flex gap-4 justify-center mb-8">
          <Link href="/dashboard">
            <Button>View Dashboard</Button>
          </Link>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>
    </main>
  )
} 