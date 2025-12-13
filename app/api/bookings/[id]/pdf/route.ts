import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { format } from 'date-fns'
import { readFile, access, constants } from 'fs/promises'
import { join } from 'path'

// Format duration in Arabic
function formatDuration(minutes: number): string {
  if (minutes === 60) return 'ساعة واحدة'
  if (minutes === 120) return 'ساعتان'
  if (minutes === 90) return 'ساعة ونصف'
  if (minutes === 180) return '3 ساعات'
  if (minutes === 30) return '30 دقيقة'
  if (minutes === 150) return 'ساعتان ونصف'
  if (minutes === 240) return '4 ساعات'
  return `${minutes} دقيقة`
}

// Format time in Arabic
function formatTimeForPdf(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const period = hour >= 12 ? 'م' : 'ص'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${period}`
}

// Helper to draw Arabic text (RTL-aware)
// Only draws if font supports Arabic, otherwise throws error
async function drawArabicText(
  page: any,
  text: string,
  x: number,
  y: number,
  options: {
    size?: number
    font?: any
    color?: any
    maxWidth?: number
  }
) {
  const { size = 12, font, color = rgb(0, 0, 0), maxWidth } = options
  
  // Check if font is provided and is not a standard font (which doesn't support Arabic)
  if (!font) {
    throw new Error('Font is required for Arabic text')
  }
  
  // For Arabic text, we need to reverse the string for proper RTL display
  // and adjust positioning
  const textToDraw = text
  
  if (maxWidth) {
    // Simple word wrapping for Arabic (basic implementation)
    const words = textToDraw.split(' ')
    let currentLine = ''
    let currentY = y
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      // Approximate width (this is a simple estimation)
      const estimatedWidth = testLine.length * size * 0.6
      
      if (estimatedWidth > maxWidth && currentLine) {
        page.drawText(currentLine, {
          x: x,
          y: currentY,
          size,
          font,
          color,
        })
        currentLine = word
        currentY -= size * 1.5
      } else {
        currentLine = testLine
      }
    }
    
    if (currentLine) {
      page.drawText(currentLine, {
        x: x,
        y: currentY,
        size,
        font,
        color,
      })
    }
  } else {
    page.drawText(textToDraw, {
      x: x,
      y: y,
      size,
      font,
      color,
    })
  }
}

// GET /api/bookings/:id/pdf
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const bookingId = resolvedParams.id

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        examSlot: true,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot generate PDF for cancelled booking' },
        { status: 400 }
      )
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4 size
    const { width, height } = page.getSize()

    // Embed Arabic font - try local file first, then CDN
    let arabicFont: any = null
    let arabicBoldFont: any = null
    let helveticaFont: any
    let helveticaBoldFont: any
    
    // Always embed standard fonts first
    helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    // Try to load font from local file first
    // Check for both possible font filenames
    const possibleFontNames = [
      'NotoSansArabic-Regular.ttf',
      'NotoSansArabic-VariableFont_wdth,wght.ttf'
    ]
    
    let fontPath: string | null = null
    let fontBytes: Buffer | null = null
    
    for (const fontName of possibleFontNames) {
      try {
        const testPath = join(process.cwd(), 'public', fontName)
        console.log('Checking for font at:', testPath)
        
        await access(testPath, constants.F_OK | constants.R_OK)
        console.log(`Font file found: ${fontName}`)
        fontPath = testPath
        fontBytes = await readFile(testPath)
        console.log('Font file read successfully, size:', fontBytes.length, 'bytes')
        break
      } catch (accessError: any) {
        console.log(`Font file ${fontName} not found, trying next...`)
        continue
      }
    }
    
    if (!fontPath || !fontBytes) {
      throw new Error('No Arabic font file found in public directory')
    }
    
    try {
      if (!fontBytes) {
        throw new Error('Font bytes not loaded')
      }
      
      if (fontBytes.length === 0) {
        throw new Error('Font file is empty')
      }
      
      // Check if file has valid TTF header
      if (fontBytes.length < 4) {
        throw new Error('Font file is too small to be valid')
      }
      
      // Check TTF header (should start with 0x00 0x01 0x00 0x00 for TTF or 'OTTO' for OTF)
      const header = fontBytes.slice(0, 4)
      const isValidTTF = header[0] === 0x00 && header[1] === 0x01 && header[2] === 0x00 && header[3] === 0x00
      const isValidOTF = header[0] === 0x4F && header[1] === 0x54 && header[2] === 0x54 && header[3] === 0x4F
      
      if (!isValidTTF && !isValidOTF) {
        console.warn('Font file header does not match TTF/OTF format, but attempting to embed anyway')
        console.warn('Header bytes:', Array.from(header).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '))
      }
      
      // Convert Buffer to Uint8Array if needed (pdf-lib expects Uint8Array)
      let fontArray: Uint8Array
      if (fontBytes instanceof Uint8Array) {
        fontArray = fontBytes
      } else if (fontBytes instanceof Buffer) {
        fontArray = new Uint8Array(fontBytes.buffer, fontBytes.byteOffset, fontBytes.byteLength)
      } else {
        fontArray = new Uint8Array(fontBytes)
      }
      
      // Try to embed the font
      try {
        console.log('Attempting to embed font...')
        console.log('Font array type:', fontArray.constructor.name)
        console.log('Font array length:', fontArray.length)
        console.log('First 4 bytes:', Array.from(fontArray.slice(0, 4)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '))
        
        arabicFont = await pdfDoc.embedFont(fontArray)
        console.log('First font embedded successfully')
        arabicBoldFont = await pdfDoc.embedFont(fontArray)
        console.log('Arabic font embedded successfully from local file')
      } catch (embedError: any) {
        console.error('Failed to embed font (file may be corrupted or wrong format):', embedError.message)
        console.error('Embed error name:', embedError.name)
        console.error('Embed error code:', (embedError as any).code)
        if (embedError.stack) {
          console.error('Embed error stack:', embedError.stack)
        }
        // Don't throw here - let it fall through to CDN fallback
        // Set to null so we know to try CDN
        arabicFont = null
        arabicBoldFont = null
      }
    } catch (localError: any) {
      // If local file doesn't exist or reading failed, try CDN sources
      console.error('Failed to load font from local file:', localError.message)
      if (localError.code === 'ENOENT') {
        console.error('Font file not found at path')
      } else if (localError.message?.includes('embedFont') || localError.message?.includes('embed')) {
        console.error('Font embedding failed - file may be corrupted or in wrong format')
      }
      // If embedding failed, arabicFont will be null, so we'll try CDN
      if (!arabicFont) {
        console.log('Font not embedded, trying CDN sources...')
      }
      
      // Try to get font URL from Google Fonts API first
      try {
        console.log('Fetching font URL from Google Fonts API...')
        const cssResponse = await fetch('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400&display=swap', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
        
        if (!cssResponse.ok) {
          throw new Error(`Google Fonts API returned ${cssResponse.status}`)
        }
        
        const cssText = await cssResponse.text()
        console.log('CSS response received, length:', cssText.length)
        
        // Google Fonts now returns WOFF2, but pdf-lib needs TTF
        // Try to find TTF URL or use alternative source
        console.log('Note: Google Fonts API returns WOFF2 format. Trying alternative TTF sources...')
      } catch (apiError: any) {
        console.warn('Failed to load font from Google Fonts API:', apiError.message)
        console.warn('Error stack:', apiError.stack)
      }
      
      // If still not loaded, try direct CDN sources
      if (!arabicFont) {
        console.log('Trying direct CDN sources for TTF format...')
        const fontUrls = [
          // Try GitHub raw content (most reliable)
          'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf',
          // Try jsDelivr CDN
          'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansarabic/NotoSansArabic-Regular.ttf',
          // Try another GitHub mirror
          'https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf',
        ]
        
        for (const fontUrl of fontUrls) {
          try {
            console.log('Attempting to download font from:', fontUrl)
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000)
            
            const fontResponse = await fetch(fontUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/octet-stream, */*',
              },
              signal: controller.signal,
            })
            
            clearTimeout(timeoutId)
            
            if (fontResponse.ok) {
              const fontBytes = await fontResponse.arrayBuffer()
              console.log('Downloaded font size:', fontBytes.byteLength, 'bytes')
              
              if (fontBytes.byteLength === 0) {
                console.warn('Downloaded font is empty')
                continue
              }
              
              // Convert to Uint8Array
              const fontArray = new Uint8Array(fontBytes)
              
              try {
                arabicFont = await pdfDoc.embedFont(fontArray)
                arabicBoldFont = await pdfDoc.embedFont(fontArray)
                console.log('Arabic font loaded successfully from CDN:', fontUrl)
                
                // Optionally save the downloaded font to local file for future use
                try {
                  const fontPath = join(process.cwd(), 'public', 'NotoSansArabic-Regular.ttf')
                  await require('fs/promises').writeFile(fontPath, Buffer.from(fontBytes))
                  console.log('Font saved to local file for future use')
                } catch (saveError) {
                  console.warn('Could not save downloaded font to local file:', saveError)
                }
                
                break
              } catch (embedError: any) {
                console.warn(`Failed to embed font from ${fontUrl}:`, embedError.message)
                continue
              }
            } else {
              console.warn(`HTTP ${fontResponse.status} from ${fontUrl}`)
            }
          } catch (error: any) {
            console.warn(`Failed to load font from ${fontUrl}:`, error.message)
            continue
          }
        }
      }
    }
    
    // If Arabic font still not loaded, try one more time with a direct download attempt
    if (!arabicFont) {
      console.log('All font loading attempts failed. Trying emergency download...')
      try {
        // Try to download from a known working source
        const emergencyUrl = 'https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf'
        console.log('Attempting emergency download from:', emergencyUrl)
        
        const emergencyResponse = await fetch(emergencyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/octet-stream, */*',
          },
        })
        
        if (emergencyResponse.ok) {
          const emergencyFontBytes = await emergencyResponse.arrayBuffer()
          if (emergencyFontBytes.byteLength > 0) {
            const emergencyFontArray = new Uint8Array(emergencyFontBytes)
            try {
              arabicFont = await pdfDoc.embedFont(emergencyFontArray)
              arabicBoldFont = await pdfDoc.embedFont(emergencyFontArray)
              console.log('Arabic font loaded successfully from emergency download')
              
              // Save for future use
              try {
                const fontPath = join(process.cwd(), 'public', 'NotoSansArabic-Regular.ttf')
                await require('fs/promises').writeFile(fontPath, Buffer.from(emergencyFontBytes))
                console.log('Emergency font saved to local file')
              } catch (saveError) {
                console.warn('Could not save emergency font:', saveError)
              }
            } catch (embedError) {
              console.error('Failed to embed emergency font:', embedError)
            }
          }
        }
      } catch (emergencyError) {
        console.error('Emergency download failed:', emergencyError)
      }
    }
    
    // If Arabic font still not loaded after all attempts, throw detailed error
    if (!arabicFont) {
      const errorMessage = `
Failed to load Arabic font for PDF generation after all attempts.

The font file is missing or corrupted. Please download it manually:

1. Visit: https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
2. Click "Download family" button
3. Extract the ZIP file
4. Navigate to: notosansarabic/static/NotoSansArabic-Regular.ttf
5. Copy NotoSansArabic-Regular.ttf to: public/NotoSansArabic-Regular.ttf
6. Restart your server

The font file should be approximately 192 KB in size.
      `.trim()
      throw new Error(errorMessage)
    }
    
    // Use Arabic fonts
    const textFont = arabicFont
    const boldFont = arabicBoldFont

    // Color scheme - professional blue theme
    const primaryBlue = rgb(0.13, 0.39, 0.65) // #2164A3
    const darkBlue = rgb(0.08, 0.25, 0.42) // #14406B
    const lightBlue = rgb(0.93, 0.96, 1.0)
    const accentTeal = rgb(0.1, 0.6, 0.5)
    const borderColor = rgb(0.7, 0.7, 0.7)
    const textDark = rgb(0.15, 0.15, 0.15)
    const textGray = rgb(0.5, 0.5, 0.5)

    // Header Section - Large and prominent
    const headerHeight = 140
    page.drawRectangle({
      x: 0,
      y: height - headerHeight,
      width: width,
      height: headerHeight,
      color: primaryBlue,
    })

    // Decorative element in header
    page.drawRectangle({
      x: 0,
      y: height - headerHeight,
      width: width,
      height: 8,
      color: accentTeal,
    })

    // Main title (Arabic)
    await drawArabicText(page, 'تأكيد حجز قاعة امتحان', 50, height - 60, {
      size: 32,
      font: boldFont,
      color: rgb(1, 1, 1),
    })

    // Subtitle (Arabic)
    await drawArabicText(page, 'جامعة القصيم - وثيقة تأكيد رسمية', 50, height - 95, {
      size: 14,
      font: textFont,
      color: rgb(0.95, 0.95, 0.95),
    })

    let yPosition = height - 160

    // Booking Details Section
    const sectionY = yPosition - 220
    const sectionHeight = 220

    // Section background
    page.drawRectangle({
      x: 50,
      y: sectionY,
      width: width - 100,
      height: sectionHeight,
      color: lightBlue,
      borderColor: primaryBlue,
      borderWidth: 2,
    })

    // Section accent bar
    page.drawRectangle({
      x: 50,
      y: sectionY + sectionHeight - 6,
      width: width - 100,
      height: 6,
      color: accentTeal,
    })

    // Section title (Arabic)
    await drawArabicText(page, 'تفاصيل الحجز', 60, yPosition, {
      size: 22,
      font: boldFont,
      color: primaryBlue,
    })

    yPosition -= 40

    // Parse selected rows
    let rowsText = 'غير موجود'
    try {
      const selectedRows = JSON.parse(booking.selectedRows) as number[]
      if (Array.isArray(selectedRows) && selectedRows.length > 0) {
        rowsText = selectedRows.sort((a, b) => a - b).join(', ')
      }
    } catch (e) {
      rowsText = booking.selectedRows || 'غير موجود'
    }

    // Calculate times
    if (!booking.examSlot) {
      throw new Error('Exam slot not found')
    }

    const slotDate = new Date(booking.examSlot.date)
    const startTime = booking.bookingStartTime || booking.examSlot.startTime
    if (!startTime) {
      throw new Error('Start time is missing')
    }

    const [hours, minutes] = startTime.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error(`Invalid start time: ${startTime}`)
    }

    const startDate = new Date(slotDate)
    startDate.setHours(hours, minutes, 0, 0)
    const durationMinutes = booking.bookingDurationMinutes || booking.examSlot.durationMinutes || 60
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)

    const endTimeFormatted = formatTimeForPdf(format(endDate, 'HH:mm'))
    const startTimeFormatted = formatTimeForPdf(startTime)

    // Details with Arabic labels
    const details = [
      { label: 'مرجع الحجز:', value: booking.bookingReference || 'غير موجود' },
      { label: 'التاريخ:', value: format(new Date(booking.examSlot.date), 'MMMM d, yyyy') },
      { label: 'الوقت:', value: `${startTimeFormatted} - ${endTimeFormatted}` },
      { label: 'المدة:', value: formatDuration(durationMinutes) },
      { label: 'الموقع:', value: booking.examSlot.locationName },
      { label: 'الصفوف:', value: rowsText },
    ]

    for (let index = 0; index < details.length; index++) {
      const item = details[index]
      
      // Label (Arabic)
      await drawArabicText(page, item.label, 60, yPosition, {
        size: 13,
        font: boldFont,
        color: darkBlue,
      })

      // Value - handle long booking references
      const isArabicValue = /[\u0600-\u06FF]/.test(item.value)
      const valueFont = isArabicValue ? textFont : helveticaFont
      
      const valueLines = item.value.length > 45 
        ? [item.value.substring(0, 45), item.value.substring(45)] 
        : [item.value]

      for (let idx = 0; idx < valueLines.length; idx++) {
        const line = valueLines[idx]
        if (isArabicValue) {
          await drawArabicText(page, line, 220, yPosition - (idx * 16), {
            size: 13,
            font: valueFont,
            color: textDark,
          })
        } else {
          page.drawText(line, {
            x: 220,
            y: yPosition - (idx * 16),
            size: 13,
            font: valueFont,
            color: textDark,
          })
        }
      }

      yPosition -= (valueLines.length * 24) + 10

      // Separator line
      if (index < details.length - 1) {
        page.drawLine({
          start: { x: 60, y: yPosition + 5 },
          end: { x: width - 60, y: yPosition + 5 },
          thickness: 0.5,
          color: borderColor,
        })
        yPosition -= 8
      }
    }

    yPosition = sectionY - 40

    // Contact Information Section
    const contactSectionY = yPosition - 150
    const contactSectionHeight = 150

    page.drawRectangle({
      x: 50,
      y: contactSectionY,
      width: width - 100,
      height: contactSectionHeight,
      color: lightBlue,
      borderColor: primaryBlue,
      borderWidth: 2,
    })

    page.drawRectangle({
      x: 50,
      y: contactSectionY + contactSectionHeight - 6,
      width: width - 100,
      height: 6,
      color: accentTeal,
    })

    // Section title (Arabic)
    await drawArabicText(page, 'معلومات الاتصال', 60, yPosition, {
      size: 22,
      font: boldFont,
      color: primaryBlue,
    })

    yPosition -= 40

    const contactDetails = [
      { label: 'الاسم:', value: `${booking.firstName} ${booking.lastName}` },
      { label: 'البريد الإلكتروني:', value: booking.email },
      { label: 'الهاتف:', value: booking.phone || 'غير موجود' },
    ]

    for (let index = 0; index < contactDetails.length; index++) {
      const item = contactDetails[index]
      
      // Label (Arabic)
      await drawArabicText(page, item.label, 60, yPosition, {
        size: 13,
        font: boldFont,
        color: darkBlue,
      })

      // Value - check if Arabic
      const isArabicValue = /[\u0600-\u06FF]/.test(item.value)
      const valueFont = isArabicValue ? textFont : helveticaFont
      
      if (isArabicValue) {
        await drawArabicText(page, item.value, 250, yPosition, {
          size: 13,
          font: valueFont,
          color: textDark,
        })
      } else {
        page.drawText(item.value, {
          x: 250,
          y: yPosition,
          size: 13,
          font: valueFont,
          color: textDark,
        })
      }

      yPosition -= 32

      if (index < contactDetails.length - 1) {
        page.drawLine({
          start: { x: 60, y: yPosition + 6 },
          end: { x: width - 60, y: yPosition + 6 },
          thickness: 0.5,
          color: borderColor,
        })
        yPosition -= 8
      }
    }

    // Footer
    const footerHeight = 60
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: footerHeight,
      color: rgb(0.96, 0.97, 0.99),
    })

    page.drawRectangle({
      x: 0,
      y: footerHeight - 3,
      width: width,
      height: 3,
      color: primaryBlue,
    })

    await drawArabicText(page, 'هذه وثيقة تأكيد رسمية لحجز قاعة امتحان - جامعة القصيم', 50, 35, {
      size: 10,
      font: boldFont,
      color: textGray,
    })

    const genDate = format(new Date(), 'MMMM d, yyyy')
    const genTime = format(new Date(), 'h:mm a')
    await drawArabicText(page, `تم توليده في: ${genDate} في ${genTime}`, 50, 20, {
      size: 9,
      font: textFont,
      color: rgb(0.6, 0.6, 0.6),
    })

    await drawArabicText(page, '© 2026 جامعة القصيم. جميع الحقوق محفوظة.', 50, 5, {
      size: 8,
      font: textFont,
      color: rgb(0.65, 0.65, 0.65),
    })

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="hjz-qaet-imtihan-${booking.bookingReference || booking.id}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
