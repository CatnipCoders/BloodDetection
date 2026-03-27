"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { secuGenScanner } from "@/lib/secugen-sdk"

export default function TestScannerPage() {
  const [status, setStatus] = useState<string>("Initializing...")
  const [logs, setLogs] = useState<string[]>([])
  const [libraryLoaded, setLibraryLoaded] = useState(false)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  useEffect(() => {
    addLog("SecuGen Web API ready (no library loading needed)")
    addLog("Using direct HTTP POST to https://localhost:8443/SGIFPCapture")
    setStatus("✅ Ready to test")
    setLibraryLoaded(true)
  }, [])

  const testLibraryLoad = async () => {
    addLog("No library loading needed!")
    addLog("SecuGen Web API uses direct HTTP POST")
    setStatus("✅ Ready")
    setLibraryLoaded(true)
  }

  const testInitialize = async () => {
    try {
      addLog("Initializing SecuGen SDK...")
      const result = await secuGenScanner.initialize()
      
      if (result) {
        addLog("✅ Initialization successful!")
        
        addLog("Getting device list...")
        const devices = await secuGenScanner.getDevices()
        addLog(`Found ${devices?.length || 0} devices`)
        
        if (devices && devices.length > 0) {
          addLog(`Device 0: ${JSON.stringify(devices[0])}`)
          
          addLog("Opening device 0...")
          const openResult = await secuGenScanner.openDevice(0)
          
          if (openResult) {
            addLog("✅ Device opened successfully!")
            addLog("✅ LED should be ON now")
            addLog("✅ Ready to capture fingerprints")
          } else {
            addLog("❌ Failed to open device")
          }
        } else {
          addLog("❌ No devices found")
          addLog("Check:")
          addLog("- Is scanner connected via USB?")
          addLog("- Is scanner powered on?")
          addLog("- Try different USB port")
        }
      } else {
        addLog("❌ Initialization failed")
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`)
      console.error(error)
    }
  }

  const testCapture = async () => {
    try {
      addLog("Starting capture test...")
      addLog("=".repeat(50))
      
      if (!secuGenScanner.isReady()) {
        addLog("Initializing first...")
        await secuGenScanner.initialize()
        await secuGenScanner.openDevice(0)
      }
      
      addLog("Place your finger on the scanner...")
      addLog("Waiting for capture (10 second timeout)...")
      addLog("Request being sent to: https://localhost:8443/SGIFPCapture")
      
      // Set a timeout to show if request is hanging
      const timeoutId = setTimeout(() => {
        addLog("⚠️ Still waiting... (5 seconds elapsed)")
      }, 5000)
      
      const blob = await secuGenScanner.captureFingerprint(10000, 50)
      
      clearTimeout(timeoutId)
      
      if (blob) {
        addLog(`✅ Capture successful!`)
        addLog(`Image size: ${blob.size} bytes`)
        addLog(`Image type: ${blob.type}`)
      } else {
        addLog(`❌ Capture failed - no blob returned`)
        addLog("Check browser console (F12) for errors")
      }
      
      addLog("=".repeat(50))
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`)
      addLog(`Error type: ${error.name}`)
      if (error.stack) {
        addLog("Stack trace:")
        addLog(error.stack)
      }
      console.error(error)
    }
  }

  const checkWebAPI = () => {
    addLog("Opening https://localhost:8443 in new tab...")
    window.open('https://localhost:8443', '_blank')
    addLog("If page opens successfully, Web API is running")
    addLog("If page doesn't open, restart SecuGen Web API Service")
  }

  const testDirectLoad = () => {
    addLog("Testing direct script load...")
    addLog("Check browser console (F12) for results")
    
    const script = document.createElement('script')
    script.src = 'https://localhost:8443/SGIFPLib.js'
    script.onload = () => {
      addLog("✅ Script loaded via direct method")
      if ((window as any).SGIFPLib) {
        addLog("✅ window.SGIFPLib is available")
      }
    }
    script.onerror = (e) => {
      addLog("❌ Script failed to load")
      addLog("Error: " + e)
    }
    document.head.appendChild(script)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>SecuGen Scanner Test Page (SGIFPLib.js)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-100 rounded">
            <p className="font-semibold">Library Status:</p>
            <p className="text-lg">{status}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={testLibraryLoad} variant="default">
              Reload Library
            </Button>
            <Button onClick={testInitialize} disabled={!libraryLoaded}>
              Test Initialize
            </Button>
            <Button onClick={testCapture} variant="outline" disabled={!libraryLoaded}>
              Test Capture
            </Button>
            <Button onClick={testDirectLoad} variant="outline">
              Test Direct Load
            </Button>
            <Button onClick={checkWebAPI} variant="secondary">
              Check Web API
            </Button>
            <Button onClick={() => setLogs([])} variant="ghost">
              Clear Logs
            </Button>
          </div>

          <div className="border rounded p-4 bg-black text-green-400 font-mono text-sm h-96 overflow-y-auto">
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-500">Loading library...</div>
              )}
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Correct Approach - Direct HTTP POST:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>No JavaScript library loading needed</li>
              <li>Direct XMLHttpRequest to https://localhost:8443/SGIFPCapture</li>
              <li>URL-encoded parameters (not JSON)</li>
              <li>Matches official SecuGen demo exactly</li>
            </ul>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Troubleshooting Steps:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Library should load automatically on page load</li>
              <li>If loading fails, check Task Manager for sgibiosrv.exe</li>
              <li>If process not found, restart "SecuGen Web API Service"</li>
              <li>Click "Test Initialize" to prepare the scanner</li>
              <li>Click "Test Capture" to capture a fingerprint</li>
              <li>Check browser console (F12) for detailed errors</li>
            </ol>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="font-semibold text-yellow-800">Quick Fix:</p>
            <p className="text-sm text-yellow-700">
              If library won't load, open Windows Services (Win + R → services.msc), 
              find "SecuGen Web API Service", right-click → Restart
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
