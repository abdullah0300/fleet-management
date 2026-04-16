import { buildBaseLayout, ctaButton, detailTable, detailRow } from './base-layout'
import { APP_URL } from '../index'

export type ManifestCancelledRecipientType = 'driver' | 'dispatcher' | 'admin'

export interface ManifestCancelledEmailData {
  recipientName: string
  recipientType: ManifestCancelledRecipientType
  companyName: string
  manifestNumber: string
  manifestId: string
  scheduledDate?: string
  totalJobs?: number
  cancellationReason?: string
}

const INTROS: Record<ManifestCancelledRecipientType, (data: ManifestCancelledEmailData) => string> = {
  driver: (d) => `Hi ${d.recipientName || 'there'},<br><br>
    Manifest <strong>#${d.manifestNumber}</strong> assigned to you has been cancelled.
    You are no longer required to complete this run. Please check with your dispatcher for further instructions.`,
  dispatcher: (d) => `Hi ${d.recipientName || 'there'},<br><br>
    Manifest <strong>#${d.manifestNumber}</strong> has been cancelled.
    The ${d.totalJobs ?? 'associated'} job${(d.totalJobs ?? 0) !== 1 ? 's' : ''} have been returned to pending status.
    Please reassign resources as needed.`,
  admin: (d) => `Hi ${d.recipientName || 'there'},<br><br>
    Manifest <strong>#${d.manifestNumber}</strong> in your fleet has been cancelled.`,
}

export function buildManifestCancelledEmail(data: ManifestCancelledEmailData): { subject: string; html: string } {
  const manifestUrl = `${APP_URL}/dashboard/manifests/${data.manifestId}`
  const intro = INTROS[data.recipientType](data)

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">${intro}</p>

    ${detailTable(
      detailRow('Manifest #', `<strong>${data.manifestNumber}</strong>`) +
      (data.scheduledDate ? detailRow('Was scheduled', data.scheduledDate) : '') +
      (data.totalJobs != null ? detailRow('Jobs affected', String(data.totalJobs)) : '') +
      (data.cancellationReason ? detailRow('Reason', data.cancellationReason) : '')
    )}

    ${ctaButton('View Manifests', manifestUrl, '#DC2626')}
  `

  return {
    subject: `Manifest Cancelled — #${data.manifestNumber} | ${data.companyName}`,
    html: buildBaseLayout({
      accentColor: '#DC2626',
      accentLight: '#FECACA',
      preheader: 'Manifest Cancellation Notice',
      title: `Manifest #${data.manifestNumber} Cancelled`,
      subtitle: data.cancellationReason ?? 'This manifest has been cancelled',
      body,
      companyName: data.companyName,
    }),
  }
}
