from twilio.rest import Client


class WhatsAppService:
    def __init__(self):
        self.account_sid = "your_twilio_sid"
        self.auth_token = "your_twilio_auth_token"

        self.from_number = "whatsapp:+14155238886"  # sandbox

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