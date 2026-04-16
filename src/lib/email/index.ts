/**
 * TruckersCall Email Service
 * Thin wrapper around Resend. All transactional emails flow through here.
 *
 * Required env:  RESEND_API_KEY
 * From address:  alerts@truckerscall.com
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'

const RESEND_API = 'https://api.resend.com/emails'
const FROM_DEFAULT = 'TruckersCall <alerts@truckerscall.com>'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://truckerscall.com'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  /** Defaults to FROM_DEFAULT */
  from?: string
  /** Reply-to address */
  replyTo?: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

/**
 * Send a transactional email via Resend.
 * Returns { ok: false } silently when RESEND_API_KEY is not configured so that
 * missing env does not crash the application — in-app notifications still work.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  const to = Array.isArray(opts.to) ? opts.to : [opts.to]
  const filtered = to.filter(Boolean)
  if (filtered.length === 0) {
    return { ok: false, error: 'No valid recipients' }
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: opts.from ?? FROM_DEFAULT,
        to: filtered,
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[email] Resend error:', res.status, text)
      return { ok: false, error: `Resend ${res.status}: ${text}` }
    }

    const json = await res.json() as { id?: string }
    return { ok: true, id: json.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[email] Send failed:', msg)
    return { ok: false, error: msg }
  }
}

// ─── Company settings helpers ─────────────────────────────────────────────────

type EmailSettingKey =
  | 'jobAlerts'
  | 'maintenanceAlerts'
  | 'jobAssignmentEmails'
  | 'manifestEmails'
  | 'customerEmails'
  | 'integrationAlerts'
  | 'onboardingEmails'

/**
 * Check whether a specific email category is enabled for a company.
 * Defaults to `true` (opt-out model) so existing companies work without migration.
 */
export async function isEmailEnabled(
  companyId: string,
  key: EmailSettingKey,
): Promise<boolean> {
  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single()

    const settings = data?.settings as Record<string, { enabled?: boolean }> | null
    return settings?.[key]?.enabled !== false
  } catch {
    return true // Default to enabled on error
  }
}

/**
 * Fetch all profiles for a company matching given roles, returning those with emails.
 */
export async function getRecipients(
  companyId: string,
  roles: string[],
): Promise<{ id: string; email: string; full_name: string }[]> {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('company_id', companyId)
    .in('role', roles)
    .not('email', 'is', null)

  return (data ?? []) as { id: string; email: string; full_name: string }[]
}

/**
 * Insert in-app notifications for a list of user IDs using the service role client.
 */
export async function createNotifications(
  notifications: {
    user_id: string
    type: string
    title: string
    message: string
    data?: Record<string, unknown>
  }[],
): Promise<void> {
  if (notifications.length === 0) return
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { error } = await supabase
    .from('notifications')
    .insert(notifications.map(n => ({ ...n, read: false })))
  if (error) console.error('[notifications] Insert error:', error.message)
}
