import { Info, Phone, MessageCircle, Linkedin, Smartphone, MessageSquare, User, Mail } from "lucide-react"

export default function InfoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-8">
      <div className="max-w-lg w-full bg-gray-50 rounded-lg shadow p-8 text-center">
        <div className="flex justify-center mb-4">
          <Info size={48} className="text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold mb-6">About the Author</h1>
        <div className="mb-4 flex flex-col gap-2 items-start justify-center text-gray-700">
          <div className="flex items-center gap-2 w-full justify-center">
            <User size={18} className="text-blue-600" />
            <span className="font-semibold">Ylane Bouchenino</span>
          </div>
          <div className="flex items-center gap-2 w-full justify-center">
            <Mail size={18} className="text-blue-600" />
            <a href="mailto:ylaneb@gmail.com" className="text-blue-600 underline">ylaneb@gmail.com</a>
          </div>
          <div className="flex items-center gap-2 w-full justify-center">
            <Smartphone size={18} className="text-blue-600" />
            <span className="font-semibold">0529529613</span>
            <a href="tel:0529529613" title="Call" className="hover:text-blue-600"><Phone size={18} /></a>
            <a href="sms:0529529613" title="SMS" className="hover:text-green-600"><MessageCircle size={18} /></a>
            {/* WhatsApp: use MessageSquare as a substitute icon */}
            <a href="https://wa.me/972529529613" target="_blank" rel="noopener noreferrer" title="WhatsApp" className="hover:text-green-600"><MessageSquare size={18} /></a>
          </div>
          <div className="flex items-center gap-2 w-full justify-center">
            
            <a href="https://www.linkedin.com/in/ylanebouchenino/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline"> 
            <Linkedin size={18} className="text-blue-600" />
            </a>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} Ylane Bouchenino. All rights reserved.
        </div>
      </div>
    </main>
  )
} 