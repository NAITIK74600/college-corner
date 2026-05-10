import nodemailer, { Transporter } from 'nodemailer';
import pool from '../config/db';

let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST) {
    // Production: use real SMTP (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env)
    _transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Dev: Ethereal catches all emails, logs a preview URL to console
    const account = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host:   'smtp.ethereal.email',
      port:   587,
      secure: false,
      auth: { user: account.user, pass: account.pass },
    });
    console.log('[Email] Dev mode — Ethereal account:', account.user);
  }

  return _transporter;
}

const FROM = process.env.FROM_EMAIL ?? '"College Corner" <noreply@collegecorner.in>';
const BRAND_COLOR = '#4F46E5';

// ─── Templates ────────────────────────────────────────────────────────────────

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND_COLOR},#7c3aed);padding:28px 36px;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">🎓 College Corner</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Your campus companion</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px 36px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;background:#f9f9f9;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">© 2026 College Corner · Questions? Reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function statusIcon(status: string): string {
  const icons: Record<string, string> = {
    placed:     '🕐',
    processing: '⚙️',
    dispatched: '🚚',
    delivered:  '✅',
    cancelled:  '❌',
  };
  return icons[status] ?? '📦';
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    placed:     '#4f46e5',
    processing: '#d97706',
    dispatched: '#0369a1',
    delivered:  '#047857',
    cancelled:  '#b91c1c',
  };
  return colors[status] ?? '#555';
}

function orderConfirmationHtml(name: string, seqNum: number, total: string, paymentMethod: string): string {
  const payLabel = paymentMethod === 'wallet' ? 'College Corner Wallet' : paymentMethod === 'cod' ? 'Cash on Delivery' : 'Cashfree';
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111;">Order Confirmed! 🎉</h2>
    <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
      Hey <strong>${name}</strong>, your order has been placed successfully. We'll keep you posted as it progresses.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#888;text-transform:uppercase;">Order Details</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:5px 0;font-size:14px;color:#555;">Order Number</td>
              <td align="right" style="padding:5px 0;font-size:14px;font-weight:700;color:#111;">#${seqNum}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:14px;color:#555;">Total Amount</td>
              <td align="right" style="padding:5px 0;font-size:14px;font-weight:700;color:#111;">₹${parseFloat(total).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:14px;color:#555;">Payment</td>
              <td align="right" style="padding:5px 0;font-size:14px;color:#111;">${payLabel}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:14px;color:#555;">Status</td>
              <td align="right" style="padding:5px 0;">
                <span style="background:rgba(79,70,229,0.1);color:#4f46e5;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">Placed 🕐</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 20px;color:#555;font-size:13px;line-height:1.6;">
      You can track the status of your order from your <strong>Dashboard</strong>.
    </p>
    <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/dashboard"
       style="display:inline-block;background:linear-gradient(135deg,${BRAND_COLOR},#7c3aed);color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">
      View Dashboard →
    </a>`;
  return baseLayout(`Order #${seqNum} Confirmed — College Corner`, body);
}

function statusUpdateHtml(name: string, seqNum: number, status: string): string {
  const icon  = statusIcon(status);
  const color = statusColor(status);
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const messages: Record<string, string> = {
    processing: 'Your order is being processed and will be dispatched soon.',
    dispatched: 'Great news! Your order is on its way. Expect delivery shortly.',
    delivered:  'Your order has been delivered. Hope you love it! 🎉',
    cancelled:  'Your order has been cancelled. If you have questions, please contact us.',
  };
  const msg = messages[status] ?? 'The status of your order has been updated.';
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111;">Order Update ${icon}</h2>
    <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
      Hey <strong>${name}</strong>, ${msg}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#888;text-transform:uppercase;">Order Details</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:5px 0;font-size:14px;color:#555;">Order Number</td>
              <td align="right" style="padding:5px 0;font-size:14px;font-weight:700;color:#111;">#${seqNum}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:14px;color:#555;">New Status</td>
              <td align="right" style="padding:5px 0;">
                <span style="background:${color}1a;color:${color};font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">${label} ${icon}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/dashboard"
       style="display:inline-block;background:linear-gradient(135deg,${BRAND_COLOR},#7c3aed);color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">
      Track Your Order →
    </a>`;
  return baseLayout(`Order #${seqNum} — ${label} | College Corner`, body);
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function sendOrderConfirmation(
  userId: string,
  seqNum: number,
  total: string,
  paymentMethod: string,
): Promise<void> {
  try {
    const r = await pool.query<{ name: string; email: string }>(
      'SELECT name, email FROM users WHERE id = $1',
      [userId],
    );
    if ((r.rowCount ?? 0) === 0) return;
    const { name, email } = r.rows[0];

    const t    = await getTransporter();
    const info = await t.sendMail({
      from:    FROM,
      to:      email,
      subject: `Order Confirmed — #${seqNum} | College Corner`,
      html:    orderConfirmationHtml(name, seqNum, total, paymentMethod),
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`[Email] Order confirmation → ${previewUrl}`);
  } catch (err) {
    // Non-fatal: log but don't crash the request
    console.error('[Email] sendOrderConfirmation failed:', err);
  }
}

export async function sendStatusUpdate(
  userId: string,
  seqNum: number,
  status: string,
): Promise<void> {
  try {
    const r = await pool.query<{ name: string; email: string }>(
      'SELECT name, email FROM users WHERE id = $1',
      [userId],
    );
    if ((r.rowCount ?? 0) === 0) return;
    const { name, email } = r.rows[0];

    const t    = await getTransporter();
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    const info  = await t.sendMail({
      from:    FROM,
      to:      email,
      subject: `Order #${seqNum} — ${label} | College Corner`,
      html:    statusUpdateHtml(name, seqNum, status),
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`[Email] Status update (${status}) → ${previewUrl}`);
  } catch (err) {
    console.error('[Email] sendStatusUpdate failed:', err);
  }
}
