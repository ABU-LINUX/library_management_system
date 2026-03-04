import logging
import os
import json
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

class NotificationGateway:
    def __init__(self):
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        settings_path = os.path.join(project_root, 'config', 'settings.json')
        
        self.account_sid = None
        self.auth_token = None
        self.whatsapp_number = None
        self.sms_number = None
        
        try:
            with open(settings_path, 'r') as f:
                settings = json.load(f)
                self.account_sid = settings.get('twilio_account_sid')
                self.auth_token = settings.get('twilio_auth_token')
                self.whatsapp_number = settings.get('twilio_whatsapp_number')
                self.sms_number = settings.get('twilio_sms_number')
        except Exception as e:
            logger.error(f"Failed to load Twilio settings: {e}")
            
        self.client = None
        if self.account_sid and self.auth_token and self.account_sid != "TWILIO_ACCOUNT_SID_HERE":
            try:
                self.client = Client(self.account_sid, self.auth_token)
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")

    def format_phone_number(self, mobile_number):
        # Very basic formatting to ensure +91 prefix for Indian numbers if not present
        num_str = str(mobile_number).strip().replace(" ", "").replace("-", "")
        if len(num_str) == 10:
            return f"+91{num_str}"
        if not num_str.startswith("+"):
            return f"+{num_str}"
        return num_str

    def send_whatsapp_alert(self, mobile_number, message):
        """
        Sends a WhatsApp message via Twilio Business API.
        """
        if not self.client or not self.whatsapp_number:
            logger.info(f"[Mock WA] To: {mobile_number} - Msg: {message}")
            return True
            
        formatted_number = self.format_phone_number(mobile_number)
        try:
            message = self.client.messages.create(
                from_=self.whatsapp_number,
                body=message,
                to=f"whatsapp:{formatted_number}"
            )
            logger.info(f"[WhatsApp] Sent SID: {message.sid}")
            return True
        except TwilioRestException as e:
            logger.error(f"[WhatsApp Error] {e}")
            return False

    def send_sms_alert(self, mobile_number, message):
        """
        Fallback SMS gateway for clients via Twilio.
        """
        if not self.client or not self.sms_number:
            logger.info(f"[Mock SMS] To: {mobile_number} - Msg: {message}")
            return True
            
        formatted_number = self.format_phone_number(mobile_number)
        try:
            message = self.client.messages.create(
                from_=self.sms_number,
                body=message,
                to=formatted_number
            )
            logger.info(f"[SMS] Sent SID: {message.sid}")
            return True
        except TwilioRestException as e:
            logger.error(f"[SMS Error] {e}")
            return False

    def send_expiration_reminder(self, mobile_number, student_name, days_left):
        """
        Wrapper to send reminder when End Date - Current Date == 3
        """
        message = f"Hello {student_name},\nThis is a reminder from the Library that your study room subscription expires in {days_left} days. Please renew to hold your seat."
        
        # Try WhatsApp first
        success = self.send_whatsapp_alert(mobile_number, message)
        
        # Fallback to SMS if WhatsApp failed (e.g., number not registered on WA)
        if not success:
            logger.info(f"WhatsApp failed for {mobile_number}, falling back to SMS.")
            return self.send_sms_alert(mobile_number, message)
            
        return success
