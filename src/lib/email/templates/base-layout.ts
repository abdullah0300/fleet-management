/**
 * Base HTML layout for all TruckersCall transactional emails.
 * All emails share the same header/footer structure and font stack.
 * Inline styles are used throughout for maximum email-client compatibility.
 */

export interface BaseLayoutOptions {
  /** Main header accent colour (hex). Default: #1E293B (dark slate) */
  accentColor?: string
  /** Lighter tint used for header text. Default: #94A3B8 */
  accentLight?: string
  /** Label shown above the title in the header (e.g. "Job Update") */
  preheader?: string
  /** Large title shown in the header */
  title: string
  /** Subtitle / date line shown below the title */
  subtitle?: string
  /** Inner body HTML (the main content area) */
  body: string
  /** Company name shown in the footer */
  companyName?: string
  /** App URL used for links */
  appUrl?: string
  /** Footer note override. Leave blank for default. */
  footerNote?: string
}

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`

export function buildBaseLayout(opts: BaseLayoutOptions): string {
  const {
    accentColor = '#1E293B',
    accentLight = '#94A3B8',
    preheader = 'TruckersCall Notification',
    title,
    subtitle = '',
    body,
    companyName = 'Your Fleet',
    appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://truckerscall.com',
    footerNote,
  } = opts

  const defaultFooter = footerNote ??
    `You're receiving this because you're part of <strong>${companyName}</strong> on TruckersCall. ` +
    `<a href="${appUrl}/dashboard/settings" style="color:${accentLight};text-decoration:underline;">Manage notification settings</a>.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${preheader}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:${FONT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!--[if mso]><table width="100%" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -1px rgba(0,0,0,0.04);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,${accentColor} 0%,${adjustColor(accentColor)} 100%);padding:28px 32px;">
      ${preheader ? `<p style="margin:0 0 4px;font-size:11px;color:${accentLight};text-transform:uppercase;letter-spacing:1.2px;">${preheader}</p>` : ''}
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#F8FAFC;line-height:1.3;">${title}</h1>
      ${subtitle ? `<p style="margin:6px 0 0;font-size:13px;color:${accentLight};line-height:1.5;">${subtitle}</p>` : ''}
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      ${body}
    </div>

    <!-- Footer -->
    <div style="background:#F8FAFC;padding:16px 32px;border-top:1px solid #E2E8F0;">
      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">
        ${defaultFooter}
      </p>
    </div>

  </div>
  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`
}

/**
 * Slightly lighten the accent colour for the gradient end-stop.
 * Simple fallback: append '33' opacity variant isn't possible in linear-gradient
 * so we just shift to a slightly different shade by blending toward white.
 */
function adjustColor(hex: string): string {
  // Map common brand colours to a matching darker/lighter gradient end
  const map: Record<string, string> = {
    '#1E293B': '#334155',
    '#DC2626': '#B91C1C',
    '#16A34A': '#15803D',
    '#2563EB': '#1D4ED8',
    '#D97706': '#B45309',
    '#7C3AED': '#6D28D9',
    '#0891B2': '#0E7490',
  }
  return map[hex] ?? hex
}

// ─── Shared UI Snippets ───────────────────────────────────────────────────────

/** A prominent CTA button */
export function ctaButton(label: string, href: string, color = '#2563EB'): string {
  return `<div style="text-align:center;margin-top:24px;">
    <a href="${href}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.3px;">${label} &rarr;</a>
  </div>`
}

/** A subtle info/details box */
export function infoBox(content: string, bgColor = '#F0F9FF', borderColor = '#BAE6FD'): string {
  return `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:16px 20px;margin:16px 0;font-size:14px;color:#1E293B;line-height:1.6;">
    ${content}
  </div>`
}

/** A row in a detail table */
export function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:#64748B;white-space:nowrap;padding-right:24px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:#1E293B;font-weight:500;vertical-align:top;">${value}</td>
  </tr>`
}

/** A two-column detail table */
export function detailTable(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tbody>${rows}</tbody>
  </table>`
}

/** Status badge pill */
export function statusBadge(label: string, color: string): string {
  return `<span style="display:inline-block;background:${color}22;color:${color};border:1px solid ${color}44;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>`
}
