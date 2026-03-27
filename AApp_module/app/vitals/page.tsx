"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Activity,
  Heart,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  Wifi,
  WifiOff,
  User as UserIcon,
} from "lucide-react";
import { getUser, addVitalSigns } from "@/lib/api-client";

interface VitalSigns {
  spo2: number | null;
  heartRate: number | null;
  perfusionIndex?: number | null;
  fingerDetected?: boolean;
  dataValid?: boolean;
}

export default function VitalsPage() {
  const router = useRouter();

  // User ID input
  const [userId, setUserId] = useState("");
  const [userVerified, setUserVerified] = useState(false);
  const [userName, setUserName] = useState("");

  // Vital signs state
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    spo2: null,
    heartRate: null,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [perfusionIndex, setPerfusionIndex] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Verify user ID
  const handleVerifyUser = async () => {
    if (!userId.trim()) {
      setError("Please enter your Patient ID");
      return;
    }

    try {
      const user = await getUser(userId);
      if (user) {
        setUserVerified(true);
        setUserName(user.name);
        setError(null);
      } else {
        setError(
          "Patient ID not found. Please check your ID or register first.",
        );
      }
    } catch (error) {
      setError("Error verifying Patient ID");
    }
  };

  // Fetch vital signs from ESP32
  useEffect(() => {
    const ESP32_API_URL =
      process.env.NEXT_PUBLIC_ESP32_API_URL ?? "http://10.31.20.105/api/vitals";
    let intervalId: NodeJS.Timeout;

    const fetchVitalSigns = async () => {
      try {
        const response = await fetch(ESP32_API_URL, {
          method: "GET",
          headers: { Accept: "application/json" },
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const newVitals = {
          spo2: data.spo2 ?? data.SpO2 ?? null,
          heartRate: data.heartRate ?? data.heart_rate ?? data.bpm ?? null,
          perfusionIndex: data.perfusionIndex ?? null,
          fingerDetected: data.fingerDetected ?? undefined,
          dataValid: data.dataValid ?? undefined,
        };

        setVitalSigns(newVitals);
        setPerfusionIndex(data.perfusionIndex ?? null);
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
        setLastUpdate(new Date());
      } catch (error: any) {
        console.error("Failed to fetch vital signs from ESP32:", error);
        setIsConnected(false);
        setIsLoading(false);
        setError(error.message || "Connection failed");
      }
    };

    // Initial fetch
    fetchVitalSigns();

    // Poll every 2 seconds
    intervalId = setInterval(fetchVitalSigns, 2000);

    return () => clearInterval(intervalId);
  }, []);

  const handleSaveVitals = async () => {
    if (!userVerified || !userId) {
      setError("Please verify your Patient ID first");
      return;
    }

    if (!vitalSigns.spo2 || !vitalSigns.heartRate) {
      setError(
        "No valid vital signs to save. Please ensure finger is on sensor.",
      );
      return;
    }

    try {
      const success = await addVitalSigns(userId, {
        spo2: vitalSigns.spo2,
        heart_rate: vitalSigns.heartRate,
        perfusion_index: perfusionIndex ?? undefined,
      });

      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        setError(null);
      } else {
        setError("Failed to save vital signs");
      }
    } catch (error) {
      setError("Error saving vital signs");
    }
  };

  const handleGenerateReport = () => {
    if (!userVerified || !userId) {
      setError("Please verify your Patient ID first");
      return;
    }

    router.push(`/report?userId=${userId}`);
  };

  const getStatusColor = (value: number | null, type: "spo2" | "hr") => {
    if (value === null) return "text-gray-400";

    if (type === "spo2") {
      if (value >= 95) return "text-green-600";
      if (value >= 90) return "text-yellow-600";
      return "text-red-600";
    } else {
      if (value >= 60 && value <= 100) return "text-green-600";
      if (value >= 50 && value <= 120) return "text-yellow-600";
      return "text-red-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Patient ID Verification */}
          {!userVerified && (
            <Card className="border-blue-100 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="w-6 h-6" />
                  Patient Identification
                </CardTitle>
                <CardDescription>
                  Enter your Patient ID to save vital signs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">Patient ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="userId"
                      type="text"
                      placeholder="Enter your Patient ID (e.g., P001)"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value.toUpperCase())}
                      className="font-mono flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyUser()}
                    />
                    <Button onClick={handleVerifyUser}>Verify</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Don't have a Patient ID?{" "}
                    <Link
                      href="/scan"
                      className="text-blue-600 hover:underline"
                    >
                      Register here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Info Banner */}
          {userVerified && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Patient verified:{" "}
                <span className="font-semibold">{userName}</span> (ID: {userId})
              </AlertDescription>
            </Alert>
          )}

          {/* Connection Status */}
          <Card className="border-blue-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl text-balance flex items-center justify-between">
                <span>Vital Signs Monitoring</span>
                {isConnected ? (
                  <Wifi className="w-6 h-6 text-green-600" />
                ) : (
                  <WifiOff className="w-6 h-6 text-red-600" />
                )}
              </CardTitle>
              <CardDescription className="text-base">
                Real-time monitoring from ESP32 MAX30102 sensor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status Alert */}
              {isLoading && (
                <Alert className="border-blue-200 bg-blue-50">
                  <RefreshCcw className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertDescription className="text-blue-900">
                    Connecting to ESP32 device...
                  </AlertDescription>
                </Alert>
              )}

              {!isConnected && !isLoading && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    {error ||
                      "Unable to connect to ESP32 device. Please check device connection."}
                  </AlertDescription>
                </Alert>
              )}

              {isConnected && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Connected to ESP32 device
                    {lastUpdate && (
                      <span className="ml-2 text-xs">
                        (Last update: {lastUpdate.toLocaleTimeString()})
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Vital Signs Display */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* SpO2 Card */}
                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      Blood Oxygen (SpO2)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div
                        className={`text-6xl font-bold ${getStatusColor(vitalSigns.spo2, "spo2")}`}
                      >
                        {vitalSigns.spo2 !== null
                          ? vitalSigns.spo2.toFixed(1)
                          : "--"}
                      </div>
                      <div className="text-2xl text-gray-600 mt-2">%</div>
                      <div className="mt-4 text-sm text-gray-600">
                        Normal: 95-100%
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Heart Rate Card */}
                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="w-5 h-5 text-red-600" />
                      Heart Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div
                        className={`text-6xl font-bold ${getStatusColor(vitalSigns.heartRate, "hr")}`}
                      >
                        {vitalSigns.heartRate !== null
                          ? Math.round(vitalSigns.heartRate)
                          : "--"}
                      </div>
                      <div className="text-2xl text-gray-600 mt-2">BPM</div>
                      <div className="mt-4 text-sm text-gray-600">
                        Normal: 60-100 BPM
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Perfusion Index */}
              {perfusionIndex !== null && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Perfusion Index:
                    </span>
                    <span className="text-lg font-semibold">
                      {perfusionIndex.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Signal quality indicator (higher is better)
                  </div>
                </div>
              )}

              {/* Finger Detection Status */}
              {vitalSigns.fingerDetected !== undefined && (
                <div className="text-center text-sm">
                  {vitalSigns.fingerDetected ? (
                    <span className="text-green-600">✓ Finger detected</span>
                  ) : (
                    <span className="text-red-600">
                      ✗ No finger detected - Please place finger on sensor
                    </span>
                  )}
                </div>
              )}

              {/* Save Success Message */}
              {saveSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Vital signs saved successfully!
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Message */}
              {error && userVerified && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              {userVerified && (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={handleSaveVitals}
                    disabled={!vitalSigns.spo2 || !vitalSigns.heartRate}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    Save Vital Signs
                  </Button>
                  <Button
                    onClick={handleGenerateReport}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Generate Report
                  </Button>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm mb-2">Instructions:</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700">
                  <li>Place your finger gently on the MAX30102 sensor</li>
                  <li>Keep your finger still for 5-10 seconds</li>
                  <li>Wait for readings to stabilize</li>
                  <li>Click "Save Vital Signs" to store the data</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
