import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_pass = os.getenv("SMTP_PASS")

    def send_email(self, to_email: str, subject: str, body: str):
        try:
            msg = MIMEMultipart()
            msg["From"] = self.smtp_user
            msg["To"] = to_email
            msg["Subject"] = subject

            msg.attach(MIMEText(body, "plain"))

            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)

            server.send_message(msg)
            server.quit()

            return {"status": "success", "message": "Email sent via Gmail"}

        except Exception as e:
            return {"status": "error", "message": str(e)}


# ✅ Test
if __name__ == "__main__":
    service = EmailService()

    res = service.send_email(
        "gss100009@gmail.com",  # send to yourself first
        "MedAssist Test",
        "Shreya from Medassist this side , we are here to help you !!"
    )

    print(res)