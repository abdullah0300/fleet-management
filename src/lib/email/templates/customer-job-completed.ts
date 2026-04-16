import { buildBaseLayout, detailTable, detailRow, infoBox } from './base-layout'

export interface CustomerJobCompletedEmailData {
  customerName: string
  customerEmail: string
  companyName: string
  jobNumber: string
  completedAt?: string
  pickupAddress?: string
  deliveryAddress?: string
  driverName?: string
  recipientName?: string
}

export function buildCustomerJobCompletedEmail(data: CustomerJobCompletedEmailData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Hi ${data.customerName || 'there'},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Great news — your shipment has been successfully delivered. Here is a summary:
    </p>

    ${detailTable(
      detailRow('Reference #', `<strong>${data.jobNumber}</strong>`) +
      (data.completedAt ? detailRow('Completed', data.completedAt) : '') +
      (data.pickupAddress ? detailRow('Pickup', data.pickupAddress) : '') +
      (data.deliveryAddress ? detailRow('Delivered to', data.deliveryAddress) : '') +
      (data.driverName ? detailRow('Driver', data.driverName) : '') +
      (data.recipientName ? detailRow('Received by', data.recipientName) : '')
    )}

    ${infoBox(`
      Proof of delivery has been recorded. If you have any questions or concerns,
      please contact <strong>${data.companyName}</strong> directly.
    `, '#F0FDF4', '#BBF7D0')}
  `

  return {
    subject: `Shipment Delivered — Reference #${data.jobNumber}`,
    html: buildBaseLayout({
      accentColor: '#16A34A',
      accentLight: '#BBF7D0',
      preheader: 'Your shipment has been delivered',
      title: 'Shipment Successfully Delivered',
      subtitle: data.completedAt ? `Completed on ${data.completedAt}` : `Reference #${data.jobNumber}`,
      body,
      companyName: data.companyName,
      footerNote: `This email was sent on behalf of <strong>${data.companyName}</strong> via TruckersCall.`,
    }),
  }
}
