'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface AnalysisResult {
  colors: string[];
  fonts: string[];
  fontSizes: string[];
  cssUrls: string[];
  html: string;
}

export default function WebsiteAnalyzer() {
  const [url, setUrl] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!response.ok) {
        throw new Error('Failed to analyze website')
      }
      const data: AnalysisResult = await response.json()
      setAnalysis(data)
    } catch (error) {
      console.error('Error analyzing website:', error)
      setError('Failed to analyze website. Please try again.')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (analysis) {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      document.body.appendChild(iframe)

      let timeoutId: NodeJS.Timeout | null = null

      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.document.open()
          iframe.contentWindow.document.write(analysis.html)
          iframe.contentWindow.document.close()

          timeoutId = setTimeout(() => {
            if (iframe.contentWindow) {
              const fonts = new Set<string>()
              const fontSizes = new Set<string>()

              iframe.contentWindow.document.body.querySelectorAll('*').forEach(el => {
                const computedStyle = iframe.contentWindow!.getComputedStyle(el)
                const fontFamily = computedStyle.getPropertyValue('font-family')
                const fontSize = computedStyle.getPropertyValue('font-size')

                if (fontFamily) {
                  fontFamily.split(',').forEach(font => {
                    const cleanFont = font.trim().replace(/['"]/g, '')
                    if (cleanFont && !cleanFont.match(/^(serif|sans-serif|monospace|cursive|fantasy)$/i)) {
                      fonts.add(cleanFont)
                    }
                  })
                }

                if (fontSize) {
                  fontSizes.add(fontSize)
                }
              })

              setAnalysis(prev => ({
                ...prev!,
                fonts: Array.from(fonts),
                fontSizes: Array.from(fontSizes).sort((a, b) => parseFloat(a) - parseFloat(b)),
              }))

              // Clean up the iframe
              document.body.removeChild(iframe)
            }
          }, 1000) // Give some time for external resources to load
        }
      } catch (error) {
        console.error('Error processing iframe:', error)
        // Ensure iframe is removed even if there's an error
        if (iframe.parentElement) {
          document.body.removeChild(iframe)
        }
      }

      // Cleanup function to clear timeout and remove iframe if still present
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        if (iframe.parentElement) {
          document.body.removeChild(iframe)
        }
      }
    }
  }, [analysis])

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter website URL"
          required
          className="flex-grow"
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze'}
        </Button>
      </form>

      {error && <p className="text-red-500">{error}</p>}

      {analysis && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold mb-2">Analysis Results</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Color Palette:</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {analysis.colors.map((color, index) => (
                    <div
                      key={index}
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium">Fonts:</h3>
                {analysis.fonts.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {analysis.fonts.map((font, index) => (
                      <li key={index}>{font}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No fonts detected</p>
                )}
              </div>
              <div>
                <h3 className="font-medium">Font Sizes:</h3>
                {analysis.fontSizes.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {analysis.fontSizes.map((size, index) => (
                      <li key={index}>{size}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No font sizes detected</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}