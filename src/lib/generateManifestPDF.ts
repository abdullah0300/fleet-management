'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

// Brand colors
const BRAND = {
    primary: [30, 64, 175] as [number, number, number],       // Blue-800
    primaryLight: [59, 130, 246] as [number, number, number],  // Blue-500
    dark: [15, 23, 42] as [number, number, number],            // Slate-900
    medium: [100, 116, 139] as [number, number, number],       // Slate-500
    light: [226, 232, 240] as [number, number, number],        // Slate-200
    bg: [248, 250, 252] as [number, number, number],           // Slate-50
    white: [255, 255, 255] as [number, number, number],
    green: [22, 163, 74] as [number, number, number],          // Green-600
    accent: [99, 102, 241] as [number, number, number],        // Indigo-500
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    try {
        return format(new Date(dateStr), 'MMM d, yyyy h:mm a')
    } catch {
        return dateStr
    }
}

function formatDateOnly(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    try {
        return format(new Date(dateStr), 'MMM d, yyyy')
    } catch {
        return dateStr
    }
}

function formatTimeOnly(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    try {
        return format(new Date(dateStr), 'h:mm a')
    } catch {
        return dateStr
    }
}

export function generateManifestPDF(manifest: any) {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pageWidth - margin * 2
    let y = 0

    // ─── HEADER BAR ───
    doc.setFillColor(...BRAND.primary)
    doc.rect(0, 0, pageWidth, 38, 'F')

    // Accent stripe
    doc.setFillColor(...BRAND.primaryLight)
    doc.rect(0, 38, pageWidth, 2, 'F')

    // Company name
    doc.setTextColor(...BRAND.white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text("Trucker'sCall", margin, 18)

    // Subtitle
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(200, 210, 230)
    doc.text('Fleet Management System', margin, 25)

    // Document type label - right side
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...BRAND.white)
    doc.text('MANIFEST REPORT', pageWidth - margin, 18, { align: 'right' })

    // Generated date
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(200, 210, 230)
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy — h:mm a')}`, pageWidth - margin, 25, { align: 'right' })

    y = 48

    // ─── MANIFEST SUMMARY CARD ───
    // Card background
    doc.setFillColor(...BRAND.bg)
    doc.setDrawColor(...BRAND.light)
    doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD')

    // Manifest Number (large)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...BRAND.dark)
    doc.text(manifest.manifest_number || 'No Number', margin + 6, y + 12)

    // Status badge
    const statusText = (manifest.status || 'draft').toUpperCase()
    const statusColor = manifest.status === 'completed' ? BRAND.green : BRAND.primaryLight
    doc.setFillColor(...statusColor)
    const statusWidth = doc.getTextWidth(statusText) * 0.6 + 8
    doc.roundedRect(margin + 6 + doc.getTextWidth(manifest.manifest_number || 'No Number') * 0.9 + 6, y + 5, statusWidth, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...BRAND.white)
    doc.text(statusText, margin + 6 + doc.getTextWidth(manifest.manifest_number || 'No Number') * 0.9 + 6 + statusWidth / 2, y + 9.5, { align: 'center' })

    // Info row
    const driverName = manifest.drivers?.profiles?.full_name || 'Unassigned'
    const vehicleInfo = manifest.vehicles ? `${manifest.vehicles.license_plate} (${manifest.vehicles.make} ${manifest.vehicles.model})` : 'Unassigned'
    const schedDate = manifest.scheduled_date ? formatDateOnly(manifest.scheduled_date) : 'No Date'
    const jobCount = manifest.jobs?.length || 0
    const totalStops = manifest.jobs?.reduce((acc: number, j: any) => acc + (j.job_stops?.length || 0), 0) || 0

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...BRAND.medium)

    // Two columns of info
    const col1X = margin + 6
    const col2X = margin + contentWidth / 2

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.medium)
    doc.text('DRIVER', col1X, y + 22)
    doc.text('VEHICLE', col2X, y + 22)
    doc.text('DATE', col1X, y + 33)
    doc.text('SUMMARY', col2X, y + 33)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND.dark)
    doc.text(driverName, col1X + 30, y + 22)
    doc.text(vehicleInfo, col2X + 32, y + 22)
    doc.text(schedDate, col1X + 30, y + 33)
    doc.text(`${jobCount} Jobs  •  ${totalStops} Stops`, col2X + 32, y + 33)

    y += 52

    // ─── JOBS ───
    const jobs = manifest.jobs || []
    let totalRevenue = 0

    jobs.forEach((job: any, jobIndex: number) => {
        const stops = (job.job_stops || []).sort((a: any, b: any) => a.sequence_order - b.sequence_order)
        const jobRevenue = Number(job.revenue || 0)
        totalRevenue += jobRevenue

        // Check if we need a new page (estimate space needed)
        const estimatedHeight = 30 + stops.length * 8
        if (y + estimatedHeight > pageHeight - 30) {
            doc.addPage()
            y = 20
        }

        // Job header bar
        doc.setFillColor(...BRAND.dark)
        doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...BRAND.white)
        doc.text(`JOB #${jobIndex + 1}`, margin + 4, y + 7)
        doc.text(job.job_number || 'Unknown', margin + 28, y + 7)

        // Customer name
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        const custName = job.customer_name || 'No Customer'
        doc.text(`Customer: ${custName}`, margin + contentWidth / 2, y + 7)

        // Revenue badge on right
        if (jobRevenue > 0) {
            const revText = formatCurrency(jobRevenue)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            doc.text(revText, pageWidth - margin - 4, y + 7, { align: 'right' })
        }

        y += 14

        // Job details row
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...BRAND.medium)

        const statusLabel = (job.status || 'pending').replace('_', ' ').toUpperCase()
        const billingType = (job.billing_type || 'N/A').replace('_', ' ')
        const priority = (job.priority || 'normal').toUpperCase()
        doc.text(`Status: ${statusLabel}   |   Billing: ${billingType}   |   Priority: ${priority}`, margin + 4, y)

        if (job.weight) {
            doc.text(`Weight: ${job.weight} lbs`, pageWidth - margin - 4, y, { align: 'right' })
        }

        y += 6

        // Stops table
        if (stops.length > 0) {
            const tableBody = stops.map((stop: any, idx: number) => {
                const type = (stop.type || 'stop').toUpperCase()
                const location = stop.location_name || stop.address || 'Unknown'
                const address = stop.location_name ? (stop.address || '') : ''

                let timeInfo = ''
                if (stop.arrival_mode === 'window' && stop.window_start && stop.window_end) {
                    timeInfo = `${formatTimeOnly(stop.window_start)} – ${formatTimeOnly(stop.window_end)}`
                } else if (stop.scheduled_arrival) {
                    timeInfo = formatDateTime(stop.scheduled_arrival)
                }

                let actualInfo = ''
                if (stop.actual_arrival_time) {
                    actualInfo = `Arr: ${formatTimeOnly(stop.actual_arrival_time)}`
                    if (stop.actual_departure_time) {
                        actualInfo += ` | Dep: ${formatTimeOnly(stop.actual_departure_time)}`
                    }
                }

                const statusIcon = stop.status === 'completed' ? '✓' : '○'

                return [
                    `${statusIcon} ${idx + 1}`,
                    type,
                    location + (address ? `\n${address}` : ''),
                    timeInfo,
                    actualInfo || '—',
                    stop.notes || ''
                ]
            })

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [['#', 'Type', 'Location', 'Scheduled', 'Actual', 'Notes']],
                body: tableBody,
                theme: 'grid',
                headStyles: {
                    fillColor: BRAND.accent,
                    textColor: BRAND.white,
                    fontStyle: 'bold',
                    fontSize: 7,
                    cellPadding: 2.5,
                    halign: 'left'
                },
                bodyStyles: {
                    fontSize: 7,
                    cellPadding: 2.5,
                    textColor: BRAND.dark,
                    lineWidth: 0.1,
                    lineColor: BRAND.light
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 16, fontStyle: 'bold', fontSize: 6.5 },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 32, fontSize: 6.5 },
                    4: { cellWidth: 32, fontSize: 6.5 },
                    5: { cellWidth: 28, fontSize: 6.5 }
                },
                didParseCell: (data: any) => {
                    // Color the Type column
                    if (data.section === 'body' && data.column.index === 1) {
                        const val = data.cell.raw as string
                        if (val === 'PICKUP') {
                            data.cell.styles.textColor = [37, 99, 235] // blue
                        } else if (val === 'DROPOFF') {
                            data.cell.styles.textColor = [234, 88, 12] // orange
                        }
                    }
                }
            })

            y = (doc as any).lastAutoTable.finalY + 4
        }

        // Job notes
        if (job.notes) {
            doc.setFont('helvetica', 'italic')
            doc.setFontSize(7)
            doc.setTextColor(...BRAND.medium)
            doc.text(`Notes: ${job.notes}`, margin + 4, y)
            y += 5
        }

        // Divider between jobs
        if (jobIndex < jobs.length - 1) {
            y += 3
            doc.setDrawColor(...BRAND.light)
            doc.setLineWidth(0.3)
            doc.line(margin + 20, y, pageWidth - margin - 20, y)
            y += 6
        }
    })

    // ─── TOTAL REVENUE FOOTER ───
    y += 8

    if (y + 25 > pageHeight - 20) {
        doc.addPage()
        y = 20
    }

    // Total box
    doc.setFillColor(...BRAND.dark)
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BRAND.white)
    doc.text('TOTAL MANIFEST REVENUE', margin + 6, y + 11)
    doc.setFontSize(14)
    doc.text(formatCurrency(totalRevenue), pageWidth - margin - 6, y + 12, { align: 'right' })

    y += 26

    // ─── PAGE FOOTER ───
    const addFooter = () => {
        const totalPages = doc.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)

            // Footer line
            doc.setDrawColor(...BRAND.light)
            doc.setLineWidth(0.3)
            doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14)

            // Footer text
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...BRAND.medium)
            doc.text("Trucker'sCall — Fleet Management System", margin, pageHeight - 9)
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 9, { align: 'right' })

            // Confidential notice
            doc.setFontSize(6)
            doc.setTextColor(180, 190, 200)
            doc.text('This document is confidential and intended for authorized personnel only.', pageWidth / 2, pageHeight - 5, { align: 'center' })
        }
    }

    addFooter()

    // Save
    const filename = `${manifest.manifest_number || 'Manifest'}_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    doc.save(filename)
}
