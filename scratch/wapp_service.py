import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

class WhatsAppService:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_FROM", "whatsapp:+14155238886")

        self.client = Client(self.account_sid, self.auth_token)

    def send_message(self, to_number: str, message: str):
        try:
            response = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=f"whatsapp:{to_number}"
            )

            return {
                "status": "success",
                "sid": response.sid
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }


# ✅ Test
if __name__ == "__main__":
    service = WhatsAppService()

    res = service.send_message(
        "+918299463706",
        "MedAssist WhatsApp test 🚀"
    )

    print(res)