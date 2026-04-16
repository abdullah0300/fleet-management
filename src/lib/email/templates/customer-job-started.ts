import { buildBaseLayout, detailTable, detailRow, infoBox } from './base-layout'

export interface CustomerJobStartedEmailData {
  customerName: string
  customerEmail: string
  companyName: string
  jobNumber: string
  scheduledDate?: string
  scheduledTime?: string
  pickupAddress?: string
  deliveryAddress?: string
  driverName?: string
}

export function buildCustomerJobStartedEmail(data: CustomerJobStartedEmailData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Hi ${data.customerName || 'there'},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Your shipment has been scheduled and a driver has been assigned. Here are the details:
    </p>

    ${detailTable(
      detailRow('Reference #', `<strong>${data.jobNumber}</strong>`) +
      (data.scheduledDate ? detailRow('Scheduled', data.scheduledDate + (data.scheduledTime ? ' at ' + data.scheduledTime : '')) : '') +
      (data.pickupAddress ? detailRow('Pickup', data.pickupAddress) : '') +
      (data.deliveryAddress ? detailRow('Delivery', data.deliveryAddress) : '') +
      (data.driverName ? detailRow('Driver', data.driverName) : '')
    )}

    ${infoBox(`
      If you have any questions about your shipment, please contact
      <strong>${data.companyName}</strong> directly.
    `)}
  `

  return {
    subject: `Shipment Scheduled — Reference #${data.jobNumber}`,
    html: buildBaseLayout({
      accentColor: '#2563EB',
      accentLight: '#BFDBFE',
      preheader: 'Your shipment is scheduled',
      title: 'Your Shipment is Scheduled',
      subtitle: data.scheduledDate ? `Scheduled for ${data.scheduledDate}` : `Reference #${data.jobNumber}`,
      body,
      companyName: data.companyName,
      footerNote: `This email was sent on behalf of <strong>${data.companyName}</strong> via TruckersCall.`,
    }),
  }
}
