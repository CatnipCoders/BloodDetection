"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Search, Users, Activity, Database, Download } from "lucide-react"

// Mock data for demonstration
const mockUsers = [
  {
    id: "BG123456",
    name: "John Doe",
    bloodGroup: "A+",
    dateOfBirth: "1990-05-15",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    registeredDate: "2024-01-15",
  },
  {
    id: "BG234567",
    name: "Jane Smith",
    bloodGroup: "O-",
    dateOfBirth: "1985-08-22",
    email: "jane.smith@example.com",
    phone: "+1 (555) 234-5678",
    registeredDate: "2024-01-18",
  },
  {
    id: "BG345678",
    name: "Michael Johnson",
    bloodGroup: "B+",
    dateOfBirth: "1992-03-10",
    email: "michael.j@example.com",
    phone: "+1 (555) 345-6789",
    registeredDate: "2024-01-20",
  },
  {
    id: "BG456789",
    name: "Emily Davis",
    bloodGroup: "AB+",
    dateOfBirth: "1988-11-30",
    email: "emily.davis@example.com",
    phone: "+1 (555) 456-7890",
    registeredDate: "2024-01-22",
  },
  {
    id: "BG567890",
    name: "David Wilson",
    bloodGroup: "A-",
    dateOfBirth: "1995-07-18",
    email: "david.w@example.com",
    phone: "+1 (555) 567-8901",
    registeredDate: "2024-01-25",
  },
]

const bloodGroupStats = {
  "A+": 12,
  "A-": 8,
  "B+": 15,
  "B-": 5,
  "AB+": 7,
  "AB-": 3,
  "O+": 20,
  "O-": 10,
}

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [users] = useState(mockUsers)

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bloodGroup.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const totalUsers = users.length
  const totalScans = 142 // Mock data

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage and monitor blood group detection system</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              <Users className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered in system</p>
            </CardContent>
          </Card>

          <Card className="border-green-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Scans</CardTitle>
              <Activity className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalScans}</div>
              <p className="text-xs text-muted-foreground mt-1">Fingerprint scans completed</p>
            </CardContent>
          </Card>

          <Card className="border-red-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Blood Groups</CardTitle>
              <Database className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">8</div>
              <p className="text-xs text-muted-foreground mt-1">Types tracked</p>
            </CardContent>
          </Card>
        </div>

        {/* Blood Group Distribution */}
        <Card className="mb-8 border-red-100">
          <CardHeader>
            <CardTitle>Blood Group Distribution</CardTitle>
            <CardDescription>Overview of registered blood groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(bloodGroupStats).map(([group, count]) => (
                <div
                  key={group}
                  className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200"
                >
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{group}</p>
                    <p className="text-sm text-gray-600 mt-1">{count} users</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Data Table */}
        <Card className="border-gray-100">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>View and manage all registered user data</CardDescription>
              </div>
              <Button className="bg-gray-800 hover:bg-gray-900">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, ID, or blood group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono font-semibold">{user.id}</TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-200">{user.bloodGroup}</Badge>
                        </TableCell>
                        <TableCell>{user.dateOfBirth}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.phone}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.registeredDate}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found matching your search
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
