import { buildBaseLayout, ctaButton, infoBox, detailTable, detailRow } from './base-layout'
import { APP_URL } from '../index'

export interface IntegrationErrorEmailData {
  adminName: string
  adminEmail: string
  companyName: string
  integrationName: string
  integrationSlug: string
  errorMessage: string
  errorCode?: string
  occurredAt?: string
}

export function buildIntegrationErrorEmail(data: IntegrationErrorEmailData): { subject: string; html: string } {
  const settingsUrl = `${APP_URL}/dashboard/integrations/${data.integrationSlug}`

  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Hi ${data.adminName || 'there'},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Your <strong>${data.integrationName}</strong> integration has encountered an error and
      may require your attention. Load tenders and other data from this marketplace will not
      be received until the issue is resolved.
    </p>

    ${detailTable(
      detailRow('Integration', data.integrationName) +
      detailRow('Error', `<span style="color:#DC2626;">${data.errorMessage}</span>`) +
      (data.errorCode ? detailRow('Code', data.errorCode) : '') +
      (data.occurredAt ? detailRow('Occurred', data.occurredAt) : '')
    )}

    ${infoBox(`
      <strong>What to do:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;line-height:1.8;">
        <li>Check that your ${data.integrationName} credentials are still valid</li>
        <li>Reconnect the integration in your settings</li>
        <li>Contact ${data.integrationName} support if the issue persists</li>
      </ul>
    `, '#FEF2F2', '#FECACA')}

    ${ctaButton('Manage Integration', settingsUrl, '#DC2626')}
  `

  return {
    subject: `Integration Error — ${data.integrationName} needs attention | ${data.companyName}`,
    html: buildBaseLayout({
      accentColor: '#DC2626',
      accentLight: '#FECACA',
      preheader: `${data.integrationName} integration error`,
      title: `${data.integrationName} Integration Error`,
      subtitle: 'Your marketplace integration needs attention',
      body,
      companyName: data.companyName,
    }),
  }
}
