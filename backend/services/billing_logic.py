import os
from datetime import datetime

class BillingLogic:
    @staticmethod
    def calculate_pending_balance(total_amount, amount_paid):
        try:
            total = float(total_amount)
            paid = float(amount_paid)
            return max(0, total - paid)
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def calculate_end_date(start_date, days_to_add=30):
        # start_date is expected to be a string in YYYY-MM-DD format
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            from datetime import timedelta
            end_date = start + timedelta(days=days_to_add)
            return end_date.strftime("%Y-%m-%d")
        except ValueError:
            return None
