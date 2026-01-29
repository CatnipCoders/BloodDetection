"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  AlertCircle, 
  RefreshCcw, 
  Mail, 
  Droplets, 
  Calendar, 
  Search,
  Download,
  Filter
} from "lucide-react"
import { User } from "@/app/types"
import { getUsers } from "@/lib/api"

// NOTE: Install these packages:
// npm install jspdf @radix-ui/react-dialog
// npm install --save-dev @types/jspdf
import jsPDF from 'jspdf'

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      setError('Failed to load users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Pre-fill search if we navigated back from registration with an ID
  useEffect(() => {
    const newUserId = searchParams?.get('newUserId')
    if (newUserId) {
      setSearchQuery(newUserId)
    }
  }, [searchParams])

  // Filter users based on search query and blood group
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery.toLowerCase().split(' ').every(term =>
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.id.toString().includes(term) ||
      (user.blood_group?.toLowerCase() || '').includes(term)
    )

    const matchesBloodGroup = !selectedBloodGroup || user.blood_group === selectedBloodGroup

    return matchesSearch && matchesBloodGroup
  })

  // Get unique blood groups for filter
  const bloodGroups = Array.from(new Set(users.map(user => user.blood_group).filter(Boolean)))

  // Generate attractive ID card-style PDF
  const generateUserPDF = (user: User) => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 53.98] // Credit card size (3.375" x 2.125")
    })

    // Card dimensions
    const cardWidth = 85.6
    const cardHeight = 53.98
    
    // Card background
    pdf.setFillColor(239, 246, 255) // Light blue background
    pdf.rect(0, 0, cardWidth, cardHeight, 'F')
    
    // Header bar (proportional height)
    const headerHeight = 11
    pdf.setFillColor(37, 99, 235) // Blue header
    pdf.rect(0, 0, cardWidth, headerHeight, 'F')
    
    // Organization name - centered and properly sized
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('BLOOD GROUP DETECTION SYSTEM', cardWidth / 2, 6.5, { align: 'center' })
    
    // Red accent stripe
    const stripeHeight = 1.5
    pdf.setFillColor(220, 38, 38) // Red stripe
    pdf.rect(0, headerHeight, cardWidth, stripeHeight, 'F')
    
    // Main content area - white card with proper margins
    const contentMargin = 4
    const contentTop = headerHeight + stripeHeight + 2
    const contentHeight = 28
    const contentWidth = cardWidth - (contentMargin * 2)
    
    pdf.setFillColor(255, 255, 255) // White card area
    pdf.roundedRect(contentMargin, contentTop, contentWidth, contentHeight, 1.5, 1.5, 'F')
    
    // Subtle border
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.2)
    pdf.roundedRect(contentMargin, contentTop, contentWidth, contentHeight, 1.5, 1.5, 'S')
    
    // User photo circle - properly positioned
    const circleX = contentMargin + 8
    const circleY = contentTop + 10
    const circleRadius = 5.5
    
    pdf.setFillColor(219, 234, 254) // Light blue circle
    pdf.circle(circleX, circleY, circleRadius, 'F')
    pdf.setDrawColor(37, 99, 235)
    pdf.setLineWidth(0.4)
    pdf.circle(circleX, circleY, circleRadius, 'S')
    
    // User initials in circle
    const initials = user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    pdf.setTextColor(37, 99, 235)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text(initials, circleX, circleY + 1.5, { align: 'center' })
    
    // User details section - properly aligned
    const detailsX = circleX + circleRadius + 4
    let detailsY = contentTop + 5
    
    // Name - truncate if too long
    const maxNameLength = 20
    const displayName = user.name.length > maxNameLength 
      ? user.name.substring(0, maxNameLength) + '...' 
      : user.name
    
    pdf.setTextColor(31, 41, 55) // Dark gray
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(displayName.toUpperCase(), detailsX, detailsY)
    
    // ID Badge
    detailsY += 5
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(107, 114, 128)
    pdf.text('ID:', detailsX, detailsY)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(31, 41, 55)
    pdf.text(`#${String(user.id).padStart(6, '0')}`, detailsX + 5, detailsY)
    
    // Email - truncate if too long
    detailsY += 4
    const maxEmailLength = 25
    const displayEmail = user.email.length > maxEmailLength 
      ? user.email.substring(0, maxEmailLength) + '...' 
      : user.email
    
    pdf.setFontSize(6.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(107, 114, 128)
    pdf.text('✉', detailsX, detailsY)
    pdf.text(displayEmail, detailsX + 3, detailsY)
    
    // Confidence score if available
    if (user.confidence) {
      detailsY += 4
      pdf.setFontSize(6)
      pdf.setTextColor(107, 114, 128)
      pdf.text(`Confidence: ${(user.confidence * 100).toFixed(1)}%`, detailsX, detailsY)
    }
    
    // Blood group - prominent display on the right
    const bloodGroup = user.blood_group || 'N/A'
    const bloodBoxWidth = 22
    const bloodBoxHeight = 14
    const bloodBoxX = cardWidth - contentMargin - bloodBoxWidth - 2
    const bloodBoxY = contentTop + 4
    
    // Blood group background box
    pdf.setFillColor(254, 226, 226) // Light red background
    pdf.roundedRect(bloodBoxX, bloodBoxY, bloodBoxWidth, bloodBoxHeight, 1.5, 1.5, 'F')
    pdf.setDrawColor(220, 38, 38)
    pdf.setLineWidth(0.4)
    pdf.roundedRect(bloodBoxX, bloodBoxY, bloodBoxWidth, bloodBoxHeight, 1.5, 1.5, 'S')
    
    // Blood drop icon
    const dropX = bloodBoxX + 5
    const dropY = bloodBoxY + 6
    pdf.setFillColor(220, 38, 38)
    pdf.circle(dropX, dropY, 1.8, 'F')
    pdf.ellipse(dropX, dropY + 1.8, 1.8, 2.2, 'F')
    
    // Blood group text - centered in box
    const bloodTextX = bloodBoxX + bloodBoxWidth / 2
    const bloodTextY = bloodBoxY + 8
    
    pdf.setTextColor(220, 38, 38)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text(bloodGroup, bloodTextX, bloodTextY, { align: 'center' })
    
    pdf.setFontSize(5.5)
    pdf.setFont('helvetica', 'normal')
    pdf.text('BLOOD GROUP', bloodTextX, bloodTextY + 4, { align: 'center' })
    
    // Footer section - clean and organized
    const footerTop = contentTop + contentHeight + 2
    const footerHeight = 7
    
    pdf.setFillColor(249, 250, 251) // Light gray footer
    pdf.rect(contentMargin, footerTop, contentWidth, footerHeight, 'F')
    
    // Dates
    const issueDate = user.created_at 
      ? format(new Date(user.created_at), 'dd MMM yyyy')
      : format(new Date(), 'dd MMM yyyy')
    
    const updateDate = user.updated_at 
      ? format(new Date(user.updated_at), 'dd MMM yyyy')
      : issueDate
    
    // Issue date - left side
    pdf.setFontSize(5.5)
    pdf.setTextColor(107, 114, 128)
    pdf.setFont('helvetica', 'normal')
    pdf.text('ISSUED:', contentMargin + 2, footerTop + 3)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(31, 41, 55)
    pdf.text(issueDate, contentMargin + 2, footerTop + 5.5)
    
    // Last updated - center
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(107, 114, 128)
    pdf.text('UPDATED:', contentMargin + 22, footerTop + 3)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(31, 41, 55)
    pdf.text(updateDate, contentMargin + 22, footerTop + 5.5)
    
    // QR code placeholder - right side
    const qrSize = 5
    const qrX = cardWidth - contentMargin - qrSize - 12
    const qrY = footerTop + 1
    
    pdf.setFillColor(255, 255, 255)
    pdf.rect(qrX, qrY, qrSize, qrSize, 'F')
    pdf.setDrawColor(31, 41, 55)
    pdf.setLineWidth(0.2)
    pdf.rect(qrX, qrY, qrSize, qrSize, 'S')
    pdf.setFontSize(3.5)
    pdf.setTextColor(31, 41, 55)
    pdf.text('QR', qrX + qrSize / 2, qrY + qrSize / 2 + 0.5, { align: 'center' })
    
    // Verification text
    pdf.setFontSize(5)
    pdf.setTextColor(107, 114, 128)
    pdf.text('Scan to verify', qrX + qrSize + 1, qrY + qrSize / 2 + 0.5)
    
    // Bottom stripe
    pdf.setFillColor(220, 38, 38)
    pdf.rect(0, cardHeight - stripeHeight, cardWidth, stripeHeight, 'F')
    
    // Security watermark - subtle and centered
    pdf.setTextColor(239, 246, 255)
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('OFFICIAL', cardWidth / 2, contentTop + contentHeight / 2 + 2, { 
      align: 'center',
      angle: -15
    })
    
    // Save the PDF
    pdf.save(`blood-group-id-card-${user.name.replace(/\s+/g, '-')}-${user.id}.pdf`)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Blood Group Detection Admin</h1>
        <Button 
          variant="outline" 
          onClick={loadUsers}
          disabled={loading}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 rounded-md border border-gray-200"
            value={selectedBloodGroup || ''}
            onChange={(e) => setSelectedBloodGroup(e.target.value || null)}
          >
            <option value="">All Blood Groups</option>
            {bloodGroups.map(group => (
              <option key={group} value={group || ''}>{group}</option>
            ))}
          </select>
        </div>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl flex items-center justify-between">
                {user.name}
                {user.blood_group && (
                  <span className="inline-flex items-center bg-red-50 text-red-700 text-sm font-medium px-3 py-1 rounded-full">
                    <Droplets className="w-4 h-4 mr-1" />
                    {user.blood_group}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <Mail className="w-4 h-4 mr-2" />
                {user.email}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                Last updated: {
                  user.updated_at 
                    ? format(new Date(user.updated_at), 'PP')
                    : format(new Date(user.created_at), 'PP')
                }
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400 font-mono">
                  ID: {user.id}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateUserPDF(user)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Card
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {!loading && filteredUsers.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            {users.length > 0 ? 'No users match your search' : 'No users found'}
          </div>
        )}

        {loading && (
          <div className="col-span-full text-center py-12 text-gray-500">
            Loading...
          </div>
        )}
      </div>
    </div>
  )
}
