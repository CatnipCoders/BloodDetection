"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle2, UserPlus, Fingerprint, AlertCircle } from "lucide-react"
import { createUser } from "@/lib/api-client"

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const bloodGroupFromScan = searchParams.get("bloodGroup")

  const [formData, setFormData] = useState({
    userId: "",
    fullName: "",
    age: "",
    gender: "",
    bloodGroup: "",
    email: "",
    phone: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()


  useEffect(() => {
    if (bloodGroupFromScan && bloodGroups.includes(bloodGroupFromScan)) {
      setFormData((prev) => ({ ...prev, bloodGroup: bloodGroupFromScan }))
    }
  }, [bloodGroupFromScan])

  const generateUserId = () => {
    const timestamp = Date.now().toString().slice(-6)
    return `P${timestamp}`
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
   
    if (formData.phone) {
      if (formData.phone.length !== 10) {
        setError('Phone number must be exactly 10 digits')
        setIsSubmitting(false)
        return
      }
      // Check if it starts with 6, 7, 8, or 9 (valid Indian mobile numbers)
      if (!/^[6-9]/.test(formData.phone)) {
        setError('Invalid Indian mobile number. Must start with 6, 7, 8, or 9')
        setIsSubmitting(false)
        return
      }
    }

    try {
      const created = await createUser({
        user_id: formData.userId,
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender || undefined,
      })

      if (created) {
        setRegistrationComplete(true)
      } else {
        setError('Registration failed: No response from server')
      }
    } catch (err: any) {
      console.error('Error creating user:', err)
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      userId: "",
      fullName: "",
      age: "",
      gender: "",
      bloodGroup: "",
      email: "",
      phone: "",
    })
    setRegistrationComplete(false)
    setError(null)
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-green-200 shadow-lg">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-green-100 p-4 rounded-full">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-3xl text-green-700">Registration Successful!</CardTitle>
                <CardDescription className="text-base">Patient registered successfully</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-lg border-2 border-green-200">
                  <div className="text-center space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Patient ID</p>
                      <p className="text-5xl font-bold font-mono text-green-700">{formData.userId}</p>
                    </div>
                    <div className="pt-4 border-t border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Registered Name</p>
                      <p className="text-xl font-semibold text-gray-800">{formData.fullName}</p>
                    </div>
                    {formData.age && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Age</p>
                        <p className="text-lg font-semibold text-gray-800">{formData.age} years</p>
                      </div>
                    )}
                    {formData.gender && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Gender</p>
                        <p className="text-lg font-semibold text-gray-800">{formData.gender}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-900 text-sm">
                    Please save your Patient ID for future reference. You can now scan your fingerprint to detect blood group.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-3 gap-3">
                  <Link href="/" className="w-full">
                    <Button variant="outline" className="w-full bg-transparent">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Home
                    </Button>
                  </Link>
                  <Button onClick={handleReset} className="w-full bg-green-600 hover:bg-green-700">
                    Register Another
                  </Button>
                  <Link href="/scan" className="w-full">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Fingerprint className="w-4 h-4 mr-2" />
                      Scan Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-2xl mx-auto">
          <Card className="border-green-100 shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <UserPlus className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-3xl text-balance">Patient Registration</CardTitle>
              <CardDescription className="text-base">
                Register a new patient without blood group (scan fingerprint later)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-blue-200 bg-blue-50 mb-6">
                <AlertDescription className="text-blue-900 text-sm">
                  Blood group will be detected when you scan your fingerprint. You can register now and scan later.
                </AlertDescription>
              </Alert>

              {error && (
                <Alert className="border-red-200 bg-red-50 mb-6">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  {/* Patient ID */}
                  <div className="space-y-2">
                    <Label htmlFor="userId">Patient ID *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="userId"
                        placeholder="e.g., P001, PATIENT123"
                        value={formData.userId}
                        onChange={(e) => setFormData({ ...formData, userId: e.target.value.toUpperCase() })}
                        required
                        disabled={isSubmitting}
                        className="font-mono flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, userId: generateUserId() })}
                        disabled={isSubmitting}
                      >
                        Generate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create a unique ID for this patient. Click Generate for auto-ID.
                    </p>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="Enter full name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Email and Phone */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="patient@example.com"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value })
                        
                        }}
                        required
                        disabled={isSubmitting}
                      />
                      
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                          setFormData({ ...formData, phone: value })
                        }}
                        disabled={isSubmitting}
                        maxLength={10}
                        pattern="[6-9][0-9]{9}"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must start with 6, 7, 8, or 9 (Indian mobile)
                      </p>
                    </div>
                  </div>

                  {/* Age and Gender */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age (Optional)</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="25"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        disabled={isSubmitting}
                        min="0"
                        max="150"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender (Optional)</Label>
                      <select
                        id="gender"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border rounded-md bg-white"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Registering..." : "Register Patient"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  After registration, go to <Link href="/scan" className="text-blue-600 hover:underline">Scan Page</Link> to detect blood group
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
