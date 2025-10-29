"use client"

import { useState, useEffect } from "react"
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

  // Generate PDF for a user card
  const generateUserPDF = (user: User) => {
    const pdf = new jsPDF()
    const lineHeight = 10
    let y = 20

    // Add title
    pdf.setFontSize(20)
    pdf.text('User Blood Group Card', 20, y)
    y += lineHeight * 2

    // Add user details
    pdf.setFontSize(12)
    pdf.text(`Name: ${user.name}`, 20, y)
    y += lineHeight
    pdf.text(`Blood Group: ${user.blood_group || 'Not set'}`, 20, y)
    y += lineHeight
    pdf.text(`Email: ${user.email}`, 20, y)
    y += lineHeight
    pdf.text(`ID: ${user.id}`, 20, y)
    y += lineHeight
    pdf.text(`Last Updated: ${
      user.updated_at 
        ? format(new Date(user.updated_at), 'PPp')
        : format(new Date(user.created_at), 'PPp')
    }`, 20, y)

    // Save the PDF
    pdf.save(`blood-group-card-${user.id}.pdf`)
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
