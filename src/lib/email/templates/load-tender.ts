import { buildBaseLayout, ctaButton, detailTable, detailRow, infoBox } from './base-layout'
import { APP_URL } from '../index'

export interface LoadTenderEmailData {
  companyName: string
  /** Human-readable name of the integration (e.g. "Cargomatic", "DAT") */
  integrationName: string
  integrationSlug: string
  shipmentReference: string
  tenderId?: string
  pickupLocation?: string
  deliveryLocation?: string
  pickupWindowStart?: string
  deliveryWindowEnd?: string
  totalStops?: number
}

export function buildLoadTenderEmail(data: LoadTenderEmailData): { subject: string; html: string } {
  const tendersUrl = `${APP_URL}/dashboard/integrations/${data.integrationSlug}`

  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      A new load tender has arrived from <strong>${data.integrationName}</strong>.
      Review and accept or decline it before it expires.
    </p>

    ${detailTable(
      detailRow('Marketplace', data.integrationName) +
      detailRow('Shipment ref', `<strong>${data.shipmentReference}</strong>`) +
      (data.pickupLocation ? detailRow('Pickup', data.pickupLocation) : '') +
      (data.deliveryLocation ? detailRow('Delivery', data.deliveryLocation) : '') +
      (data.pickupWindowStart ? detailRow('Pickup window', data.pickupWindowStart) : '') +
      (data.deliveryWindowEnd ? detailRow('Delivery window', data.deliveryWindowEnd) : '') +
      (data.totalStops != null ? detailRow('Total stops', String(data.totalStops)) : '')
    )}

    ${infoBox(`
      <strong>Action required:</strong> Accept or decline this tender in the TruckersCall integrations dashboard.
      Tenders may expire if left unreviewed.
    `, '#FFFBEB', '#FEF3C7')}

    ${ctaButton('Review Load Tender', tendersUrl, '#D97706')}
  `

  return {
    subject: `New Load Tender from ${data.integrationName} — ${data.shipmentReference}`,
    html: buildBaseLayout({
      accentColor: '#D97706',
      accentLight: '#FDE68A',
      preheader: `New load tender from ${data.integrationName}`,
      title: `New Load Tender — ${data.shipmentReference}`,
      subtitle: `From ${data.integrationName} · Action required`,
      body,
      companyName: data.companyName,
    }),
  }
}
