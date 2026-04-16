import { buildBaseLayout, detailTable, detailRow, infoBox } from './base-layout'

export interface CustomerJobCancelledEmailData {
  customerName: string
  customerEmail: string
  companyName: string
  jobNumber: string
  scheduledDate?: string
  pickupAddress?: string
  deliveryAddress?: string
  cancellationReason?: string
}

export function buildCustomerJobCancelledEmail(data: CustomerJobCancelledEmailData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Hi ${data.customerName || 'there'},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      We're sorry to inform you that your shipment has been cancelled. Please contact
      <strong>${data.companyName}</strong> directly if you need to reschedule or have any questions.
    </p>

    ${detailTable(
      detailRow('Reference #', `<strong>${data.jobNumber}</strong>`) +
      (data.scheduledDate ? detailRow('Was scheduled', data.scheduledDate) : '') +
      (data.pickupAddress ? detailRow('Pickup', data.pickupAddress) : '') +
      (data.deliveryAddress ? detailRow('Delivery', data.deliveryAddress) : '') +
      (data.cancellationReason ? detailRow('Reason', data.cancellationReason) : '')
    )}

    ${infoBox(`
      If this cancellation was unexpected or you need further assistance,
      please reach out to <strong>${data.companyName}</strong> at your earliest convenience.
    `, '#FEF2F2', '#FECACA')}
  `

  return {
    subject: `Shipment Cancelled — Reference #${data.jobNumber}`,
    html: buildBaseLayout({
      accentColor: '#DC2626',
      accentLight: '#FECACA',
      preheader: 'Your shipment has been cancelled',
      title: 'Shipment Cancelled',
      subtitle: data.cancellationReason ?? `Reference #${data.jobNumber}`,
      body,
      companyName: data.companyName,
      footerNote: `This email was sent on behalf of <strong>${data.companyName}</strong> via TruckersCall.`,
    }),
  }
}
