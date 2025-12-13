import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { format } from 'date-fns'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { Buffer } from 'buffer'

// Format duration in English
function formatDuration(minutes: number): string {
  if (minutes === 60) return '1 hour'
  if (minutes === 120) return '2 hours'
  if (minutes === 90) return '1.5 hours'
  if (minutes === 180) return '3 hours'
  if (minutes === 30) return '30 minutes'
  if (minutes === 150) return '2.5 hours'
  if (minutes === 240) return '4 hours'
  return `${minutes} minutes`
}

// Format time in English (12-hour format)
function formatTimeForPdf(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${period}`
}

// Sanitize text to remove non-ASCII characters that can't be encoded
// This removes Arabic and other Unicode characters that WinAnsi can't handle
function sanitizeText(text: string): string {
  if (!text) return ''
  // Remove Arabic characters and other non-ASCII characters
  // Keep only ASCII printable characters (32-126) and common whitespace
  const sanitized = text
    .split('')
    .map(char => {
      const code = char.charCodeAt(0)
      // Keep ASCII printable characters (32-126) and common whitespace
      if (code >= 32 && code <= 126) {
        return char
      }
      // Keep common whitespace characters
      if (code === 9 || code === 10 || code === 13) {
        return char
      }
      // Replace other characters with space
      return ' '
    })
    .join('')
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
  
  // If sanitized text is empty, return a placeholder
  return sanitized || '[Text contains non-ASCII characters]'
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

    // Use standard fonts (no Arabic font needed)
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Try to load and embed logo (try PNG first, then JPG)
    let logoImage: any = null
    try {
      const logoPngPath = join(process.cwd(), 'public', 'logo.png')
      const logoBytes = await readFile(logoPngPath)
      try {
        logoImage = await pdfDoc.embedPng(logoBytes)
      } catch (pngError) {
        // If PNG fails, try as JPG
        try {
          logoImage = await pdfDoc.embedJpg(logoBytes)
        } catch (jpgError) {
          console.log('Logo file found but could not be embedded as PNG or JPG')
        }
      }
    } catch (error) {
      // Try JPG as fallback
      try {
        const logoJpgPath = join(process.cwd(), 'public', 'logo.jpg')
        const logoBytes = await readFile(logoJpgPath)
        logoImage = await pdfDoc.embedJpg(logoBytes)
      } catch (jpgError) {
        console.log('Logo not found or could not be embedded, continuing without logo')
      }
    }

    // Color scheme - professional blue theme
    const primaryBlue = rgb(0.13, 0.39, 0.65) // #2164A3
    const darkBlue = rgb(0.08, 0.25, 0.42) // #14406B
    const lightBlue = rgb(0.93, 0.96, 1.0)
    const accentTeal = rgb(0.1, 0.6, 0.5)
    const borderColor = rgb(0.7, 0.7, 0.7)
    const textDark = rgb(0.15, 0.15, 0.15)
    const textGray = rgb(0.5, 0.5, 0.5)

    // Header Section - Large and prominent
    const headerHeight = 180
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

    // Start from top of header with proper spacing
    let currentY = height - 50

    // Draw logo if available (centered at top with original size)
    if (logoImage) {
      // Get original image dimensions from embedded image
      const logoWidth = logoImage.width
      const logoHeight = logoImage.height
      
      // Use original size, but limit max size to fit header nicely
      const maxLogoSize = 100
      let logoDisplayWidth = logoWidth
      let logoDisplayHeight = logoHeight
      
      // Scale down if too large, maintaining aspect ratio
      if (logoWidth > maxLogoSize || logoHeight > maxLogoSize) {
        const scale = maxLogoSize / Math.max(logoWidth, logoHeight)
        logoDisplayWidth = logoWidth * scale
        logoDisplayHeight = logoHeight * scale
      }
      
      const logoX = (width - logoDisplayWidth) / 2 // Center horizontally
      const logoY = currentY - logoDisplayHeight
      
      // White background for logo
      page.drawRectangle({
        x: logoX - 8,
        y: logoY - 8,
        width: logoDisplayWidth + 16,
        height: logoDisplayHeight + 16,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 1,
      })
      
      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoDisplayWidth,
        height: logoDisplayHeight,
      })
      
      // Move down after logo with more spacing to prevent text overlap
      currentY = logoY - 35 // Increased space after logo before title
    }

    // Main title (English) - centered below logo
    const titleText = 'Exam Room Booking Confirmation'
    // Approximate text width: average character width * number of characters * font size ratio
    const titleApproxWidth = titleText.length * 26 * 0.6 // Approximate width calculation
    const titleX = Math.max(50, (width - titleApproxWidth) / 2) // Center horizontally
    
    page.drawText(titleText, {
      x: titleX,
      y: currentY,
      size: 26,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1),
    })

    // Move down after title - account for title height (26px) plus spacing
    currentY -= 40 // Increased spacing after title

    // Subtitle (English) - centered below title
    const subtitleText = 'Qassim University - Official Confirmation Document'
    const subtitleApproxWidth = subtitleText.length * 12 * 0.6 // Approximate width calculation
    const subtitleX = Math.max(50, (width - subtitleApproxWidth) / 2) // Center horizontally
    
    page.drawText(subtitleText, {
      x: subtitleX,
      y: currentY,
      size: 12,
      font: helveticaFont,
      color: rgb(0.95, 0.95, 0.95),
    })

    // Space between header and content boxes - ensure proper spacing after subtitle
    // Account for subtitle height (12px) plus extra spacing
    let yPosition = currentY - 60 // Increased spacing to ensure booking details don't overlap with subtitle

    // Booking Details Section - calculate height based on content
    // We have 6 details items, each needs ~35px (including spacing)
    // Title needs ~50px, so total ~260px
    const sectionHeight = 280
    const sectionY = yPosition - sectionHeight

    // Section background with rounded corners effect (using shadow)
    page.drawRectangle({
      x: 50,
      y: sectionY,
      width: width - 100,
      height: sectionHeight,
      color: rgb(1, 1, 1),
      borderColor: primaryBlue,
      borderWidth: 2,
    })
    
    // Light blue background inside
    page.drawRectangle({
      x: 52,
      y: sectionY + 2,
      width: width - 104,
      height: sectionHeight - 4,
      color: lightBlue,
    })

    // Section accent bar
    page.drawRectangle({
      x: 50,
      y: sectionY + sectionHeight - 8,
      width: width - 100,
      height: 8,
      color: accentTeal,
    })

    // Section title (English) with icon-like decoration
    // Ensure title is well inside the box, not overlapping with subtitle above
    const sectionTitleY = yPosition - 10 // Move title down a bit to ensure spacing
    page.drawText('Booking Details', {
      x: 60,
      y: sectionTitleY,
      size: 20,
      font: helveticaBoldFont,
      color: primaryBlue,
    })
    
    // Decorative line under title
    page.drawLine({
      start: { x: 60, y: sectionTitleY - 5 },
      end: { x: 200, y: sectionTitleY - 5 },
      thickness: 2,
      color: accentTeal,
    })

    // Start content below the title with proper spacing
    yPosition = sectionTitleY - 45

    // Parse selected rows
    let rowsText = 'Not available'
    try {
      const selectedRows = JSON.parse(booking.selectedRows) as number[]
      if (Array.isArray(selectedRows) && selectedRows.length > 0) {
        rowsText = selectedRows.sort((a, b) => a - b).join(', ')
      }
    } catch (e) {
      rowsText = sanitizeText(booking.selectedRows || 'Not available')
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

    // Details with English labels - sanitize all values
    const details = [
      { label: 'Booking Reference:', value: sanitizeText(booking.bookingReference || 'Not available') },
      { label: 'Date:', value: format(new Date(booking.examSlot.date), 'MMMM d, yyyy') },
      { label: 'Time:', value: `${startTimeFormatted} - ${endTimeFormatted}` },
      { label: 'Duration:', value: formatDuration(durationMinutes) },
      { label: 'Location:', value: sanitizeText(booking.examSlot.locationName) },
      { label: 'Rows:', value: rowsText },
    ]

    for (let index = 0; index < details.length; index++) {
      const item = details[index]
      
      // Label (English)
      page.drawText(item.label, {
        x: 60,
        y: yPosition,
        size: 13,
        font: helveticaBoldFont,
        color: darkBlue,
      })

      // Value - handle long booking references
      const valueLines = item.value.length > 45 
        ? [item.value.substring(0, 45), item.value.substring(45)] 
        : [item.value]

      for (let idx = 0; idx < valueLines.length; idx++) {
        const line = valueLines[idx]
        page.drawText(line, {
          x: 220,
          y: yPosition - (idx * 16),
          size: 13,
          font: helveticaFont,
          color: textDark,
        })
      }

      yPosition -= (valueLines.length * 24) + 10

      // Check if we're still within the box
      if (yPosition < sectionY + 20) {
        // If content is too long, stop drawing to prevent overflow
        break
      }

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

    // More space between Booking Details and Contact Information (increased from 40 to 60)
    yPosition = sectionY - 60

    // Contact Information Section - increased height to fit all content
    const contactSectionHeight = 180
    const contactSectionY = yPosition - contactSectionHeight

    // Contact section background with same style
    page.drawRectangle({
      x: 50,
      y: contactSectionY,
      width: width - 100,
      height: contactSectionHeight,
      color: rgb(1, 1, 1),
      borderColor: primaryBlue,
      borderWidth: 2,
    })
    
    // Light blue background inside
    page.drawRectangle({
      x: 52,
      y: contactSectionY + 2,
      width: width - 104,
      height: contactSectionHeight - 4,
      color: lightBlue,
    })

    page.drawRectangle({
      x: 50,
      y: contactSectionY + contactSectionHeight - 8,
      width: width - 100,
      height: 8,
      color: accentTeal,
    })

    // Section title (English) with decorative line
    page.drawText('Contact Information', {
      x: 60,
      y: yPosition,
      size: 20,
      font: helveticaBoldFont,
      color: primaryBlue,
    })
    
    // Decorative line under title
    page.drawLine({
      start: { x: 60, y: yPosition - 5 },
      end: { x: 250, y: yPosition - 5 },
      thickness: 2,
      color: accentTeal,
    })

    yPosition -= 40

    const contactDetails = [
      { label: 'Name:', value: sanitizeText(`${booking.firstName} ${booking.lastName}`) },
      { label: 'Email:', value: sanitizeText(booking.email) },
      { label: 'Phone:', value: sanitizeText(booking.phone || 'Not available') },
    ]

    for (let index = 0; index < contactDetails.length; index++) {
      const item = contactDetails[index]
      
      // Label (English)
      page.drawText(item.label, {
        x: 60,
        y: yPosition,
        size: 13,
        font: helveticaBoldFont,
        color: darkBlue,
      })

      // Value
      page.drawText(item.value, {
        x: 250,
        y: yPosition,
        size: 13,
        font: helveticaFont,
        color: textDark,
      })

      yPosition -= 32

      // Check if we're still within the contact box
      if (yPosition < contactSectionY + 20) {
        // If content is too long, stop drawing to prevent overflow
        break
      }

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

    page.drawText('This is an official confirmation document for exam room booking - Qassim University', {
      x: 50,
      y: 35,
      size: 10,
      font: helveticaBoldFont,
      color: textGray,
    })

    const genDate = format(new Date(), 'MMMM d, yyyy')
    const genTime = format(new Date(), 'h:mm a')
    page.drawText(`Generated on: ${genDate} at ${genTime}`, {
      x: 50,
      y: 20,
      size: 9,
      font: helveticaFont,
      color: rgb(0.6, 0.6, 0.6),
    })

    page.drawText('© 2026 Qassim University. All rights reserved.', {
      x: 50,
      y: 5,
      size: 8,
      font: helveticaFont,
      color: rgb(0.65, 0.65, 0.65),
    })

    const pdfBytes = await pdfDoc.save()

    // Convert Uint8Array to Buffer for NextResponse
    const pdfBuffer = Buffer.from(pdfBytes)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="exam-room-booking-${booking.bookingReference || booking.id}.pdf"`,
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
