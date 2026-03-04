import logging

logger = logging.getLogger(__name__)

class NotificationGateway:
    def __init__(self):
        # Placeholder for WhatsApp / SMS API credentials
        self.whatsapp_api_key = "MOCK_KEY"
    
    def send_whatsapp_alert(self, mobile_number, message):
        """
        Sends a WhatsApp message via Business API.
        Currently logs the message for development/testing.
        """
        logger.info(f"[WhatsApp Alert] To: {mobile_number} - Message: {message}")
        return True

    def send_sms_alert(self, mobile_number, message):
        """
        Fallback SMS gateway for clients without WhatsApp.
        """
        logger.info(f"[SMS Alert] To: {mobile_number} - Message: {message}")
        return True

    def send_expiration_reminder(self, mobile_number, student_name, days_left):
        """
        Wrapper to send reminder when End Date - Current Date == 3
        """
        message = f"Hello {student_name}, your study room subscription expires in {days_left} days. Please renew to keep your seat."
        # Preferred WhatsApp over SMS
        success = self.send_whatsapp_alert(mobile_number, message)
        if not success:
            return self.send_sms_alert(mobile_number, message)
        return success
