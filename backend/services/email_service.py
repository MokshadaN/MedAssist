"""Email service for sending follow-up emails via SMTP (MailHog)."""

import logging
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from core.config import settings

logger = logging.getLogger(__name__)


def _build_followup_html(patient_name: str, message: str, followup_time: str) -> str:
    """Build a professional HTML email for follow-up reminders."""
    try:
        dt = datetime.fromisoformat(followup_time.replace("Z", "+00:00"))
        formatted_time = dt.strftime("%B %d, %Y at %I:%M %p")
    except (ValueError, AttributeError):
        formatted_time = followup_time

    return f"""\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#0f0f1a; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e,#16213e); border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px; border-bottom:1px solid rgba(255,255,255,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block; width:40px; height:40px; background:linear-gradient(135deg,#6c5ce7,#a29bfe); border-radius:10px; text-align:center; line-height:40px; color:#fff; font-weight:bold; font-size:18px; margin-right:12px; vertical-align:middle;">M</div>
                    <span style="color:#a29bfe; font-size:12px; text-transform:uppercase; letter-spacing:2px; vertical-align:middle;">MedAssist</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="color:#ffffff; font-size:24px; margin:0 0 8px;">Follow-Up Reminder</h1>
              <p style="color:rgba(255,255,255,0.6); font-size:14px; margin:0 0 28px;">Scheduled by your doctor</p>

              <p style="color:rgba(255,255,255,0.85); font-size:15px; line-height:1.6; margin:0 0 24px;">
                Hello <strong style="color:#fff;">{patient_name}</strong>,
              </p>
              <p style="color:rgba(255,255,255,0.85); font-size:15px; line-height:1.6; margin:0 0 24px;">
                Your doctor has scheduled a follow-up for you. Please find the details below:
              </p>

              <!-- Detail Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(108,92,231,0.1); border:1px solid rgba(108,92,231,0.25); border-radius:12px; margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="color:#a29bfe; font-size:12px; text-transform:uppercase; letter-spacing:1px; margin:0 0 8px;">Message</p>
                    <p style="color:#ffffff; font-size:16px; font-weight:600; margin:0 0 16px;">{message}</p>
                    <p style="color:#a29bfe; font-size:12px; text-transform:uppercase; letter-spacing:1px; margin:0 0 8px;">Scheduled Date & Time</p>
                    <p style="color:#ffffff; font-size:16px; font-weight:600; margin:0;">📅 {formatted_time}</p>
                  </td>
                </tr>
              </table>

              <p style="color:rgba(255,255,255,0.6); font-size:14px; line-height:1.6; margin:0;">
                Please ensure you attend this follow-up appointment. If you have any questions, contact your healthcare provider.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px; border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:rgba(255,255,255,0.35); font-size:12px; margin:0; text-align:center;">
                This is an automated message from MedAssist. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_followup_email(to_email: str, patient_name: str, message: str, followup_time: str) -> bool:
    """Send a follow-up reminder email via SMTP (MailHog in dev).

    Returns True if sent successfully, False on failure.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.smtp_from
        msg["To"] = to_email
        msg["Subject"] = f"MedAssist: Follow-Up Reminder — {message[:50]}"

        # Plain text fallback
        plain = f"Hello {patient_name},\\n\\nYour doctor has scheduled a follow-up: {message}\\nDate: {followup_time}\\n\\n— MedAssist"
        msg.attach(MIMEText(plain, "plain"))

        # HTML version
        html = _build_followup_html(patient_name, message, followup_time)
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if getattr(settings, "smtp_tls", False):
                server.starttls()
            if getattr(settings, "smtp_user", None) and getattr(settings, "smtp_password", None):
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, to_email, msg.as_string())

        logger.info("Follow-up email sent to %s (%s)", patient_name, to_email)
        return True
    except Exception as exc:
        logger.warning("Failed to send follow-up email to %s: %s", to_email, exc)
        return False
