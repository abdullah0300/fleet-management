import { buildBaseLayout, ctaButton, detailTable, detailRow } from './base-layout'
import { APP_URL } from '../index'

export type JobCancelledRecipientType = 'driver' | 'dispatcher' | 'admin' | 'customer'

export interface JobCancelledEmailData {
  recipientName: string
  recipientType: JobCancelledRecipientType
  companyName: string
  jobNumber: string
  jobId: string
  scheduledDate?: string
  pickupAddress?: string
  deliveryAddress?: string
  customerName?: string
  cancellationReason?: string
  /** The source that cancelled (e.g. "Cargomatic", "Dispatcher") */
  cancelledBy?: string
}

const RECIPIENT_INTROS: Record<JobCancelledRecipientType, (data: JobCancelledEmailData) => string> = {
  driver: (d) => `Hi ${d.recipientName || 'there'},<br><br>
    The job assigned to you (<strong>#${d.jobNumber}</strong>) has been cancelled.
    You are no longer required to fulfil this assignment.`,
  dispatcher: (d) => `Hi ${d.recipientName || 'there'},<br><br>
    Job <strong>#${d.jobNumber}</strong> has been cancelled${d.cancelledBy ? ` by ${d.cancelledBy}` : ''}.
    Please review the dispatch schedule and reassign any affected resources if needed.`,
  admin: (d) => `Hi ${d.recipientName || 'there'},<br><br>
    Job <strong>#${d.jobNumber}</strong> in your fleet has been cancelled${d.cancelledBy ? ` by ${d.cancelledBy}` : ''}.`,
  customer: (d) => `Hi ${d.recipientName || 'there'},<br><br>
    We're writing to let you know that your shipment (<strong>#${d.jobNumber}</strong>) has been cancelled.
    If you have questions, please contact <strong>${d.companyName}</strong> directly.`,
}

export function buildJobCancelledEmail(data: JobCancelledEmailData): { subject: string; html: string } {
  const jobUrl = `${APP_URL}/dashboard/jobs/${data.jobId}`
  const intro = RECIPIENT_INTROS[data.recipientType](data)

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">${intro}</p>

    ${detailTable(
      detailRow('Job #', `<strong>${data.jobNumber}</strong>`) +
      (data.scheduledDate ? detailRow('Was scheduled', data.scheduledDate) : '') +
      (data.customerName ? detailRow('Customer', data.customerName) : '') +
      (data.pickupAddress ? detailRow('Pickup', data.pickupAddress) : '') +
      (data.deliveryAddress ? detailRow('Delivery', data.deliveryAddress) : '') +
      (data.cancellationReason ? detailRow('Reason', data.cancellationReason) : '')
    )}

    ${data.recipientType !== 'customer' ? ctaButton('View Jobs Dashboard', jobUrl, '#DC2626') : ''}
  `

  const subjectPrefix = data.recipientType === 'customer'
    ? `Shipment Cancelled — #${data.jobNumber}`
    : `Job Cancelled — #${data.jobNumber} | ${data.companyName}`

  return {
    subject: subjectPrefix,
    html: buildBaseLayout({
      accentColor: '#DC2626',
      accentLight: '#FECACA',
      preheader: 'Job Cancellation Notice',
      title: `Job #${data.jobNumber} Cancelled`,
      subtitle: data.cancellationReason ?? `Cancelled${data.cancelledBy ? ' by ' + data.cancelledBy : ''}`,
      body,
      companyName: data.companyName,
      footerNote: data.recipientType === 'customer'
        ? `This notification was sent by <strong>${data.companyName}</strong> via TruckersCall.`
        : undefined,
    }),
  }
}
