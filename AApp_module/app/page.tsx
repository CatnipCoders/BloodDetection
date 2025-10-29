import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Fingerprint, UserPlus, Shield } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-red-600 p-4 rounded-full">
              <Fingerprint className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 text-balance">Blood Group Detection System</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto text-pretty">
            Advanced biometric blood group identification and management platform
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow border-blue-100">
            <CardHeader>
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                <Fingerprint className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Scan Fingerprint</CardTitle>
              <CardDescription>Detect blood group using advanced biometric scanning technology</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/scan">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Start Scanning</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-green-100">
            <CardHeader>
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                <UserPlus className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Register User</CardTitle>
              <CardDescription>Create a new user ID and register blood group information</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/register">
                <Button className="w-full bg-green-600 hover:bg-green-700">Create ID</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-gray-100">
            <CardHeader>
              <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-gray-700" />
              </div>
              <CardTitle className="text-xl">Admin Panel</CardTitle>
              <CardDescription>Access administrative dashboard to manage user data</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button className="w-full bg-gray-800 hover:bg-gray-900">Admin Access</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm border">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">System Online</span>
          </div>
        </div>
      </div>
    </div>
  )
}
