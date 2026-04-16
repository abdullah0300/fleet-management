import { buildBaseLayout, ctaButton, infoBox, detailTable, detailRow } from './base-layout'
import { APP_URL } from '../index'

export interface WelcomeCompanyEmailData {
  adminName: string
  adminEmail: string
  companyName: string
  loginUrl?: string
  temporaryPassword?: string
}

export function buildWelcomeCompanyEmail(data: WelcomeCompanyEmailData): { subject: string; html: string } {
  const loginUrl = data.loginUrl ?? `${APP_URL}/login`

  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Hi ${data.adminName || 'there'},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Welcome to <strong>TruckersCall</strong>! Your company account for
      <strong>${data.companyName}</strong> has been created and is ready to go.
    </p>

    ${detailTable(
      detailRow('Company', data.companyName) +
      detailRow('Admin email', data.adminEmail) +
      (data.temporaryPassword ? detailRow('Temporary password', `<code style="background:#F3F4F6;padding:2px 8px;border-radius:4px;font-family:monospace;">${data.temporaryPassword}</code>`) : '')
    )}

    ${infoBox(`
      <strong>What you can do next:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;line-height:1.8;">
        <li>Add your fleet vehicles and drivers</li>
        <li>Create your first dispatch job</li>
        <li>Set up route templates for recurring runs</li>
        <li>Connect freight marketplace integrations (e.g. Cargomatic)</li>
      </ul>
    `)}

    ${data.temporaryPassword ? `
    <p style="margin:16px 0;font-size:13px;color:#DC2626;background:#FEF2F2;border:1px solid #FECACA;padding:12px 16px;border-radius:8px;">
      For security, please change your temporary password as soon as you log in for the first time.
    </p>` : ''}

    ${ctaButton('Log in to TruckersCall', loginUrl, '#2563EB')}
  `

  return {
    subject: `Welcome to TruckersCall — ${data.companyName} is ready`,
    html: buildBaseLayout({
      accentColor: '#2563EB',
      accentLight: '#BFDBFE',
      preheader: 'Welcome to TruckersCall',
      title: `Welcome, ${data.adminName || data.companyName}!`,
      subtitle: 'Your fleet management account is live.',
      body,
      companyName: data.companyName,
      footerNote: `This email was sent because a new company account was created on TruckersCall for <strong>${data.companyName}</strong>.`,
    }),
  }
}
