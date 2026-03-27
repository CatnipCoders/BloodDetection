import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.text()
    
    console.log('Proxying request to SecuGen Web API Service')
    console.log('Body:', body)

    // Use native https module for better control
    const https = require('https')
    
    const options = {
      hostname: 'localhost',
      port: 8443,
      path: '/SGIFPCapture',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      },
      rejectUnauthorized: false // Allow self-signed certificates
    }

    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res: any) => {
        let data = ''
        
        res.on('data', (chunk: any) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            console.log('Response from SecuGen:', data)
            const jsonData = JSON.parse(data)
            resolve(jsonData)
          } catch (error) {
            reject(new Error('Failed to parse response: ' + data))
          }
        })
      })
      
      req.on('error', (error: any) => {
        console.error('Request error:', error)
        reject(error)
      })
      
      req.write(body)
      req.end()
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error proxying to SecuGen:', error)
    console.error('Error details:', error.message)
    return NextResponse.json(
      { ErrorCode: -1, ErrorMessage: `Proxy error: ${error.message}` },
      { status: 500 }
    )
  }
}
