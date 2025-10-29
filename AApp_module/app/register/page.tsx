"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle2, UserPlus, Fingerprint } from "lucide-react"

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const bloodGroupFromScan = searchParams.get("bloodGroup")

  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    bloodGroup: "",
    email: "",
    phone: "",
    address: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [generatedId, setGeneratedId] = useState<string | null>(null)

  useEffect(() => {
    if (bloodGroupFromScan && bloodGroups.includes(bloodGroupFromScan)) {
      setFormData((prev) => ({ ...prev, bloodGroup: bloodGroupFromScan }))
    }
  }, [bloodGroupFromScan])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate registration process
    setTimeout(() => {
      const newId = `BG${Math.floor(100000 + Math.random() * 900000)}`
      setGeneratedId(newId)
      setIsSubmitting(false)
      setRegistrationComplete(true)
    }, 2000)
  }

  const handleReset = () => {
    setFormData({
      fullName: "",
      dateOfBirth: "",
      bloodGroup: "",
      email: "",
      phone: "",
      address: "",
    })
    setRegistrationComplete(false)
    setGeneratedId(null)
  }

  if (registrationComplete && generatedId) {
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
                <CardDescription className="text-base">Your user ID has been generated</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-lg border-2 border-green-200">
                  <div className="text-center space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Your User ID</p>
                      <p className="text-5xl font-bold font-mono text-green-700">{generatedId}</p>
                    </div>
                    <div className="pt-4 border-t border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Registered Name</p>
                      <p className="text-xl font-semibold text-gray-800">{formData.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Blood Group</p>
                      <p className="text-3xl font-bold text-red-600">{formData.bloodGroup}</p>
                    </div>
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-900 text-sm">
                    Please save your User ID for future reference. You can use this ID for fingerprint scanning and
                    verification.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-3">
                  <Link href="/" className="w-full">
                    <Button variant="outline" className="w-full bg-transparent">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Home
                    </Button>
                  </Link>
                  <Button onClick={handleReset} className="w-full bg-green-600 hover:bg-green-700">
                    Register Another
                  </Button>
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
              <CardTitle className="text-3xl text-balance">User Registration</CardTitle>
              <CardDescription className="text-base">
                {bloodGroupFromScan
                  ? "Complete your registration with the detected blood group"
                  : "Create a new user ID and register blood group information"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bloodGroupFromScan && (
                <Alert className="border-green-200 bg-green-50 mb-6">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Blood group <strong>{bloodGroupFromScan}</strong> detected from fingerprint scan
                  </AlertDescription>
                </Alert>
              )}

              {!formData.bloodGroup && (
                <Alert className="border-amber-200 bg-amber-50 mb-6">
                  <Fingerprint className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    Please complete fingerprint scanning first to detect your blood group before registration.{" "}
                    <Link href="/scan" className="underline font-medium">
                      Go to Scan Page
                    </Link>
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
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

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bloodGroup">Blood Group *</Label>
                      <div className="relative">
                        <Input
                          id="bloodGroup"
                          value={formData.bloodGroup}
                          placeholder="Scan fingerprint to detect"
                          readOnly
                          disabled
                          className="bg-gray-50 cursor-not-allowed"
                        />
                        <Fingerprint className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      {!bloodGroupFromScan && (
                        <p className="text-xs text-amber-600">Blood group can only be set via fingerprint scanning</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Enter address (optional)"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                  disabled={isSubmitting || !formData.bloodGroup}
                >
                  {isSubmitting ? "Registering..." : "Register User"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
