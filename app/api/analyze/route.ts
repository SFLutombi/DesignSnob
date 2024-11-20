import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import ColorThief from 'color-thief-node'
import { createCanvas, loadImage } from 'canvas'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
    }
    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract colors
    const colors = await extractColors($, url)

    // Extract initial fonts and font sizes
    const { fonts, fontSizes } = extractFontsAndSizes($)

    // Extract all CSS URLs
    const cssUrls = extractCssUrls($, url)

    return NextResponse.json({
      colors,
      fonts,
      fontSizes,
      cssUrls,
      html: $.html(), // Send the full HTML for client-side processing
    })
  } catch (error) {
    console.error('Error analyzing website:', error)
    return NextResponse.json({ error: 'Failed to analyze website' }, { status: 500 })
  }
}

async function extractColors($: cheerio.CheerioAPI, baseUrl: string): Promise<string[]> {
  const colors = new Set<string>()

  // Extract colors from CSS properties
  $('*').each((_, el) => {
    const style = $(el).attr('style')
    if (style) {
      const colorMatches = style.match(/color:\s*(#[0-9A-Fa-f]{3,6}|rgb$$[^)]+$$)/g)
      if (colorMatches) {
        colorMatches.forEach(match => colors.add(match.split(':')[1].trim()))
      }
    }
  })

  // Extract colors from images
  const imageUrls = $('img').map((_, el) => $(el).attr('src')).get()
  for (const imageUrl of imageUrls) {
    try {
      const fullUrl = new URL(imageUrl, baseUrl).href
      const img = await loadImage(fullUrl)
      const canvas = createCanvas(img.width, img.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const palette = await ColorThief.getPaletteFromRgba(imageData.data, 5)
      palette.forEach((rgb) => colors.add(`rgb(${rgb.join(',')})`))
    } catch (error) {
      console.error('Error extracting colors from image:', error)
    }
  }

  return Array.from(colors).slice(0, 10) // Limit to top 10 colors
}

function extractFontsAndSizes($: cheerio.CheerioAPI): { fonts: string[], fontSizes: string[] } {
  const fonts = new Set<string>()
  const fontSizes = new Set<string>()

  $('*').each((_, el) => {
    const fontFamily = $(el).css('font-family')
    const fontSize = $(el).css('font-size')

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

  return {
    fonts: Array.from(fonts),
    fontSizes: Array.from(fontSizes).sort((a, b) => parseFloat(a) - parseFloat(b))
  }
}

function extractCssUrls($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const cssUrls = new Set<string>()

  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      const fullUrl = new URL(href, baseUrl).href
      cssUrls.add(fullUrl)
    }
  })

  $('style').each((_, el) => {
    const content = $(el).html()
    if (content) {
      const importUrls = content.match(/@import\s+url$$['"](https?:\/\/[^'"]+)['"]$$/g)
      if (importUrls) {
        importUrls.forEach(importUrl => {
          const match = importUrl.match(/https?:\/\/[^'"]+/)
          if (match) {
            cssUrls.add(match[0])
          }
        })
      }
    }
  })

  return Array.from(cssUrls)
}