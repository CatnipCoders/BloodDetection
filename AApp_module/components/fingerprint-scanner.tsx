"use client"

import { useEffect, useState } from "react"
import { Fingerprint } from "lucide-react"

interface FingerprintScannerProps {
  isScanning: boolean
  scanComplete: boolean
}

export function FingerprintScanner({ isScanning, scanComplete }: FingerprintScannerProps) {
  const [scanProgress, setScanProgress] = useState(0)

  useEffect(() => {
    if (isScanning) {
      setScanProgress(0)
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 2
        })
      }, 70)
      return () => clearInterval(interval)
    } else {
      setScanProgress(0)
    }
  }, [isScanning])

  return (
    <div className="relative">
      <div className="flex justify-center mb-6">
        <div
          className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${
            scanComplete
              ? "bg-green-100 border-4 border-green-500"
              : isScanning
                ? "bg-blue-100 border-4 border-blue-500 animate-pulse"
                : "bg-gray-100 border-4 border-gray-300"
          }`}
        >
          <Fingerprint
            className={`w-24 h-24 transition-colors duration-500 ${
              scanComplete ? "text-green-600" : isScanning ? "text-blue-600" : "text-gray-400"
            }`}
          />

          {isScanning && (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-20"></div>
              <div
                className="absolute bottom-0 left-0 right-0 bg-blue-500 opacity-30 transition-all duration-300 rounded-full"
                style={{ height: `${scanProgress}%` }}
              ></div>
            </>
          )}

          {scanComplete && (
            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-pulse"></div>
          )}
        </div>
      </div>

      {isScanning && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${scanProgress}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-muted-foreground">Scanning... {scanProgress}%</p>
        </div>
      )}
    </div>
  )
}
