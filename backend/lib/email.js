/**
 * email.js — Transactional email sender via nodemailer
 *
 * Required env vars:
 *   SMTP_HOST   — e.g. smtp.gmail.com
 *   SMTP_PORT   — e.g. 587
 *   SMTP_USER   — your sending email address
 *   SMTP_PASS   — app password or SMTP password
 *   SMTP_FROM   — display name + address, e.g. "Nilam Auto <no-reply@nilam-auto.com>"
 *   SITE_URL    — frontend URL, e.g. https://nilamdesk.vercel.app
 */

const nodemailer = require('nodemailer')

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[email] SMTP env vars not configured — emails will not be sent.')
    return null
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

/**
 * Send a monthly NILAM reminder email to a user.
 * @param {string} toEmail  - recipient address
 * @param {number} scheduleDay - the day of month the user set (for personalisation)
 */
async function sendReminderEmail(toEmail, scheduleDay) {
  const transporter = createTransporter()
  if (!transporter) return

  const from    = process.env.SMTP_FROM || `"Nilam Auto" <${process.env.SMTP_USER}>`
  const siteUrl = process.env.SITE_URL  || 'https://nilamdesk.vercel.app'
  const dashboardUrl = `${siteUrl}/dashboard`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Time to submit your NILAM records</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;max-width:520px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#6C5CE7;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">📚 Nilam Auto</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Time to submit your NILAM records!</h1>
              <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
                Today is day <strong>${scheduleDay}</strong> — your scheduled NILAM submission day.
                Open Nilam Auto and tap <strong>Submit Now</strong> to log this month's books. It only takes a minute.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background:#6C5CE7;border-radius:10px;padding:0;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">
                      Submit Now →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Reminder note -->
              <div style="background:#f3f4f6;border-radius:10px;padding:16px;margin-top:8px;">
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                  <strong style="color:#374151;">Session expired?</strong> If you get a login error, go to
                  <strong>Settings → AINS Account → Reconnect</strong> and log in again to refresh your session.
                  Sessions last about 30 days.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                You're receiving this because you enabled monthly reminders in Nilam Auto.
                To turn off reminders, go to <a href="${siteUrl}/settings" style="color:#6C5CE7;">Settings</a> and disable the Monthly Reminder toggle.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `
Time to submit your NILAM records!

Today is day ${scheduleDay} — your scheduled NILAM submission day.
Open Nilam Auto and tap Submit Now to log this month's books.

${dashboardUrl}

Session expired? Go to Settings → AINS Account → Reconnect and log in again.

---
To disable reminders, go to ${siteUrl}/settings and turn off the Monthly Reminder toggle.
  `.trim()

  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: 'Time to submit your NILAM records today 📚',
      text,
      html,
    })
    console.log(`[email] Reminder sent to ${toEmail}`)
  } catch (err) {
    console.error(`[email] Failed to send to ${toEmail}:`, err.message)
  }
}

module.exports = { sendReminderEmail }
