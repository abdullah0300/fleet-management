import { buildBaseLayout, ctaButton, detailTable, detailRow, infoBox } from './base-layout'
import { APP_URL } from '../index'

export interface ManifestJob {
  jobNumber: string
  customerName?: string
  pickupAddress?: string
  deliveryAddress?: string
}

export interface ManifestDispatchedEmailData {
  driverName: string
  driverEmail: string
  companyName: string
  manifestNumber: string
  manifestId: string
  scheduledDate?: string
  totalJobs: number
  firstPickupAddress?: string
  vehicleMake?: string
  vehicleModel?: string
  vehiclePlate?: string
  notes?: string
}

export function buildManifestDispatchedEmail(data: ManifestDispatchedEmailData): { subject: string; html: string } {
  const manifestUrl = `${APP_URL}/dashboard/manifests/${data.manifestId}`

  const vehicleInfo = data.vehiclePlate
    ? `${data.vehicleMake ?? ''} ${data.vehicleModel ?? ''} (${data.vehiclePlate})`.trim()
    : null

  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Hi ${data.driverName || 'there'},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Your manifest has been dispatched. You have <strong>${data.totalJobs} job${data.totalJobs !== 1 ? 's' : ''}</strong>
      scheduled for this run. Please review the details below and head to your first pickup.
    </p>

    ${detailTable(
      detailRow('Manifest #', `<strong>${data.manifestNumber}</strong>`) +
      (data.scheduledDate ? detailRow('Scheduled date', data.scheduledDate) : '') +
      detailRow('Total jobs', String(data.totalJobs)) +
      (data.firstPickupAddress ? detailRow('First pickup', data.firstPickupAddress) : '') +
      (vehicleInfo ? detailRow('Assigned vehicle', vehicleInfo) : '')
    )}

    ${data.notes ? infoBox(`<strong>Dispatcher notes:</strong><br>${data.notes}`, '#FFFBEB', '#FEF3C7') : ''}

    ${infoBox(`
      <strong>Reminder:</strong> Log in to the TruckersCall app to see full stop details,
      update stop statuses as you complete them, and upload proof-of-delivery photos.
    `)}

    ${ctaButton('View My Manifest', manifestUrl, '#16A34A')}
  `

  return {
    subject: `Manifest Dispatched — #${data.manifestNumber} | ${data.companyName}`,
    html: buildBaseLayout({
      accentColor: '#16A34A',
      accentLight: '#BBF7D0',
      preheader: 'Manifest Dispatched',
      title: `Manifest #${data.manifestNumber} — You're Dispatched`,
      subtitle: data.scheduledDate
        ? `${data.totalJobs} job${data.totalJobs !== 1 ? 's' : ''} scheduled for ${data.scheduledDate}`
        : `${data.totalJobs} job${data.totalJobs !== 1 ? 's' : ''} assigned`,
      body,
      companyName: data.companyName,
    }),
  }
}
