import { buildBaseLayout, ctaButton, infoBox, detailTable, detailRow } from './base-layout'
import { APP_URL } from '../index'

export type MemberRole = 'fleet_manager' | 'dispatcher' | 'driver' | 'accountant'

export interface WelcomeMemberEmailData {
  memberName: string
  memberEmail: string
  role: MemberRole
  companyName: string
  temporaryPassword?: string
  loginUrl?: string
}

const ROLE_LABELS: Record<MemberRole, string> = {
  fleet_manager: 'Fleet Manager',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  accountant: 'Accountant',
}

const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  fleet_manager: 'You can manage vehicles, drivers, jobs, manifests, and maintenance schedules for your fleet.',
  dispatcher: 'You can create and manage dispatch jobs, assign drivers and vehicles, and build manifests.',
  driver: 'You will receive job assignments and can update stop statuses. Check your assigned jobs in the app.',
  accountant: 'You have read-only access to jobs, manifests, and reports to support financial operations.',
}

const ROLE_NEXT_STEPS: Record<MemberRole, string[]> = {
  fleet_manager: [
    'Review the fleet dashboard for an overview',
    'Check vehicles and driver availability',
    'Set up maintenance service programs',
  ],
  dispatcher: [
    'Browse pending jobs and assign drivers',
    'Create your first manifest',
    'Set up route templates for recurring runs',
  ],
  driver: [
    'Log in to see your assigned jobs',
    'Review your upcoming pickup and drop-off stops',
    'Update stop statuses as you complete them',
  ],
  accountant: [
    'Access job financial summaries in Reports',
    'Review approved jobs and driver pay',
    'Export data for your accounting system',
  ],
}

export function buildWelcomeMemberEmail(data: WelcomeMemberEmailData): { subject: string; html: string } {
  const loginUrl = data.loginUrl ?? `${APP_URL}/login`
  const roleLabel = ROLE_LABELS[data.role] ?? data.role
  const description = ROLE_DESCRIPTIONS[data.role]
  const nextSteps = ROLE_NEXT_STEPS[data.role]

  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Hi ${data.memberName || 'there'},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      You've been added to <strong>${data.companyName}</strong> on TruckersCall as a
      <strong>${roleLabel}</strong>. Your account is ready — log in below to get started.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#6B7280;line-height:1.6;">${description}</p>

    ${detailTable(
      detailRow('Company', data.companyName) +
      detailRow('Your role', roleLabel) +
      detailRow('Login email', data.memberEmail) +
      (data.temporaryPassword
        ? detailRow('Temporary password', `<code style="background:#F3F4F6;padding:2px 8px;border-radius:4px;font-family:monospace;">${data.temporaryPassword}</code>`)
        : '')
    )}

    ${infoBox(`
      <strong>Getting started:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;line-height:1.8;">
        ${nextSteps.map(s => `<li>${s}</li>`).join('')}
      </ul>
    `)}

    ${data.temporaryPassword ? `
    <p style="margin:16px 0;font-size:13px;color:#DC2626;background:#FEF2F2;border:1px solid #FECACA;padding:12px 16px;border-radius:8px;">
      Please change your temporary password the first time you log in.
    </p>` : ''}

    ${ctaButton('Log in to TruckersCall', loginUrl, '#2563EB')}
  `

  return {
    subject: `You've been added to ${data.companyName} on TruckersCall`,
    html: buildBaseLayout({
      accentColor: '#2563EB',
      accentLight: '#BFDBFE',
      preheader: 'Your TruckersCall account is ready',
      title: `Welcome to ${data.companyName}`,
      subtitle: `You've been added as ${roleLabel}.`,
      body,
      companyName: data.companyName,
      footerNote: `This email was sent because an account was created for you on TruckersCall by an admin at <strong>${data.companyName}</strong>.`,
    }),
  }
}
