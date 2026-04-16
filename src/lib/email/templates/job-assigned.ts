import { buildBaseLayout, ctaButton, detailTable, detailRow, infoBox } from './base-layout'
import { APP_URL } from '../index'

export interface JobAssignedEmailData {
  driverName: string
  driverEmail: string
  companyName: string
  jobNumber: string
  jobId: string
  scheduledDate?: string
  scheduledTime?: string
  pickupAddress?: string
  deliveryAddress?: string
  customerName?: string
  notes?: string
  vehicleMake?: string
  vehicleModel?: string
  vehiclePlate?: string
}

export function buildJobAssignedEmail(data: JobAssignedEmailData): { subject: string; html: string } {
  const jobUrl = `${APP_URL}/dashboard/jobs/${data.jobId}`

  const vehicleInfo = data.vehiclePlate
    ? `${data.vehicleMake ?? ''} ${data.vehicleModel ?? ''} (${data.vehiclePlate})`.trim()
    : null

  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Hi ${data.driverName || 'there'},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      A new job has been assigned to you. Please review the details below and be ready by the scheduled time.
    </p>

    ${detailTable(
      detailRow('Job #', `<strong>${data.jobNumber}</strong>`) +
      (data.scheduledDate ? detailRow('Scheduled date', data.scheduledDate + (data.scheduledTime ? ` at ${data.scheduledTime}` : '')) : '') +
      (data.customerName ? detailRow('Customer', data.customerName) : '') +
      (data.pickupAddress ? detailRow('Pickup', data.pickupAddress) : '') +
      (data.deliveryAddress ? detailRow('Delivery', data.deliveryAddress) : '') +
      (vehicleInfo ? detailRow('Assigned vehicle', vehicleInfo) : '')
    )}

    ${data.notes ? infoBox(`<strong>Job notes:</strong><br>${data.notes}`, '#FFFBEB', '#FEF3C7') : ''}

    ${ctaButton('View Job Details', jobUrl, '#16A34A')}
  `

  return {
    subject: `Job Assigned — #${data.jobNumber} | ${data.companyName}`,
    html: buildBaseLayout({
      accentColor: '#16A34A',
      accentLight: '#BBF7D0',
      preheader: 'New Job Assignment',
      title: `Job #${data.jobNumber} Assigned to You`,
      subtitle: data.scheduledDate
        ? `Scheduled for ${data.scheduledDate}${data.scheduledTime ? ' at ' + data.scheduledTime : ''}`
        : `Assigned by ${data.companyName}`,
      body,
      companyName: data.companyName,
    }),
  }
}
