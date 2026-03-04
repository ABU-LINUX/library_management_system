import json
import os
import threading

class MockGoogleSheetsAPI:
    """
    A mock implementation of the Google Sheets API using a local JSON file,
    so the system can be developed and tested without requiring an actual
    Google Service Account immediately.
    
    Sheet 1: Active Seats (81 Rows)
    1. Seat Number (1-81)
    2. Student Name
    3. Mobile
    4. Exam Preparation
    5. Start Date
    6. End Date
    7. Total Amount
    8. Amount Paid
    9. Pending Balance
    """
    
    def __init__(self, storage_file="mock_database.json"):
        # get project root
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.storage_file = os.path.join(project_root, storage_file)
        self.lock = threading.Lock()
        self._initialize_db()

    def _initialize_db(self):
        with self.lock:
            if not os.path.exists(self.storage_file):
                # Initialize 81 vacant seats
                initial_data = {
                    "active_seats": {},
                    "archived_records": [],
                    "transactions": []
                }
                for i in range(1, 82):
                    initial_data["active_seats"][str(i)] = {
                        "seat_number": i,
                        "student_name": "",
                        "mobile": "",
                        "exam_prep": "",
                        "start_date": "",
                        "end_date": "",
                        "total_amount": 0.0,
                        "amount_paid": 0.0,
                        "pending_balance": 0.0,
                        "is_occupied": False
                    }
                self._save(initial_data)

    def _load(self):
        try:
            with open(self.storage_file, "r") as f:
                return json.load(f)
        except Exception as e:
            return {"active_seats": {}, "archived_records": []}

    def _save(self, data):
        with open(self.storage_file, "w") as f:
            json.dump(data, f, indent=2)

    def get_all_seats(self):
        with self.lock:
            data = self._load()
            # Return list of dicts, sorted by seat number
            seats = list(data["active_seats"].values())
            seats.sort(key=lambda x: int(x["seat_number"]))
            return seats

    def get_seat(self, seat_number):
        with self.lock:
            data = self._load()
            return data["active_seats"].get(str(seat_number))

    def update_seat(self, seat_number, student_data):
        with self.lock:
            data = self._load()
            seat_str = str(seat_number)
            if seat_str in data["active_seats"]:
                # Merge data
                for key, value in student_data.items():
                    data["active_seats"][seat_str][key] = value
                
                # Auto-calculate pending balance if fee provided
                if "total_amount" in data["active_seats"][seat_str] and "amount_paid" in data["active_seats"][seat_str]:
                    try:
                        tot = float(data["active_seats"][seat_str]["total_amount"])
                        paid = float(data["active_seats"][seat_str]["amount_paid"])
                        data["active_seats"][seat_str]["pending_balance"] = max(0, tot - paid)
                    except:
                        pass
                
                # Mark as occupied natively
                data["active_seats"][seat_str]["is_occupied"] = True
                
                self._save(data)
                return True
            return False

    def clear_seat(self, seat_number, archive=True):
        with self.lock:
            data = self._load()
            seat_str = str(seat_number)
            if seat_str in data["active_seats"]:
                seat_data = data["active_seats"][seat_str]
                
                if archive and seat_data.get("is_occupied"):
                    # Move to archive
                    data["archived_records"].append(seat_data.copy())
                
                # Reset seat
                data["active_seats"][seat_str] = {
                    "seat_number": int(seat_number),
                    "student_name": "",
                    "mobile": "",
                    "exam_prep": "",
                    "start_date": "",
                    "end_date": "",
                    "total_amount": 0.0,
                    "amount_paid": 0.0,
                    "pending_balance": 0.0,
                    "is_occupied": False
                }
                
                self._save(data)
                return True
            return False

    def add_transaction(self, transaction_data):
        """
        transaction_data should be a dict:
        {
            "date": "YYYY-MM-DD",
            "type": "Registration" | "Renewal" | "Dues Clearance",
            "amount": float,
            "seat_number": int,
            "student_name": str
        }
        """
        with self.lock:
            data = self._load()
            if "transactions" not in data:
                data["transactions"] = []
                
            # Add a timestamp so we can sort properly
            from datetime import datetime
            transaction_data["timestamp"] = datetime.now().isoformat()
            
            data["transactions"].append(transaction_data)
            self._save(data)
            return True
            
    def get_transactions(self):
        with self.lock:
            data = self._load()
            # Return list of transactions, newest first
            transactions = data.get("transactions", [])
            transactions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return transactions

# Export as GoogleSheetsAPI for the rest of the application
GoogleSheetsAPI = MockGoogleSheetsAPI
