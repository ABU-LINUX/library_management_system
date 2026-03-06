import os
import json
import gspread
from google.oauth2.service_account import Credentials
import threading
from datetime import datetime

class GoogleSheetsAPI:
    """
    Live implementation of the Google Sheets API using gspread.
    
    Sheet 1: Active_Seats
    Sheet 2: Archived_Records
    Sheet 3: Transactions
    """
    
    def __init__(self, spreadsheet_url="https://docs.google.com/spreadsheets/d/1RcK_Xd-fyEkTwGHWVvA1Lr2ukMspMp4utXBu4hHuHiI/edit"):
        self.spreadsheet_url = spreadsheet_url
        self.lock = threading.Lock()
        self.client = self._authenticate()
        self.sheet = self.client.open_by_url(self.spreadsheet_url)
        self._initialize_sheets()

    def _authenticate(self):
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
        
        # Check if environment variable exists (For Vercel Production)
        if 'GOOGLE_CREDENTIALS_JSON' in os.environ:
            creds_dict = json.loads(os.environ['GOOGLE_CREDENTIALS_JSON'])
            credentials = Credentials.from_service_account_info(creds_dict, scopes=scopes)
        else:
            # Fallback to local file
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            creds_file = os.path.join(project_root, 'config', 'credentials.json')
            if not os.path.exists(creds_file):
                raise FileNotFoundError(f"Missing Google Credentials at {creds_file} or GOOGLE_CREDENTIALS_JSON env var")
            credentials = Credentials.from_service_account_file(creds_file, scopes=scopes)
            
        return gspread.authorize(credentials)

    def _get_or_create_worksheet(self, title, rows=1000, cols=20):
        try:
            return self.sheet.worksheet(title)
        except gspread.exceptions.WorksheetNotFound:
            return self.sheet.add_worksheet(title=title, rows=rows, cols=cols)

    def _initialize_sheets(self):
        with self.lock:
            # Active Seats Tab
            self.active_ws = self._get_or_create_worksheet("Active_Seats", 100, 15)
            # Ensure headers
            headers = self.active_ws.row_values(1)
            target_headers = ["seat_number", "student_name", "mobile", "exam_prep", "start_date", "end_date", "total_amount", "amount_paid", "pending_balance", "is_occupied", "payment_mode", "receipt_path"]
            if not headers:
                self.active_ws.append_row(target_headers)
                
                # Pre-fill 81 empty seats
                empty_rows = []
                for i in range(1, 82):
                    empty_rows.append([i, "", "", "", "", "", 0.0, 0.0, 0.0, "FALSE", "", ""])
                self.active_ws.append_rows(empty_rows)

            # Archived Records Tab
            self.archive_ws = self._get_or_create_worksheet("Archived_Records")
            if not self.archive_ws.row_values(1):
                self.archive_ws.append_row(target_headers + ["archived_at"])

            # Transactions Tab
            self.transactions_ws = self._get_or_create_worksheet("Transactions")
            target_trans_headers = ["timestamp", "date", "type", "amount", "seat_number", "student_name", "payment_mode", "start_date", "end_date"]
            existing_trans_headers = self.transactions_ws.row_values(1)
            if not existing_trans_headers:
                self.transactions_ws.append_row(target_trans_headers)
            else:
                # Migration: add missing columns to existing sheet header row
                headers_to_add = [h for h in target_trans_headers if h not in existing_trans_headers]
                if headers_to_add:
                    next_col = len(existing_trans_headers) + 1
                    for i, col_name in enumerate(headers_to_add):
                        col_letter = gspread.utils.rowcol_to_a1(1, next_col + i)
                        self.transactions_ws.update(values=[[col_name]], range_name=col_letter)

    def _row_to_dict(self, row, headers):
        d = {}
        for i, h in enumerate(headers):
            val = row[i] if i < len(row) else ""
            
            # Cast known fields back to proper types
            if h in ["total_amount", "amount_paid", "pending_balance", "amount"]:
                try: d[h] = float(val) if val else 0.0
                except: d[h] = 0.0
            elif h in ["seat_number"]:
                try: d[h] = int(val) if val else 0
                except: d[h] = 0
            elif h == "is_occupied":
                d[h] = (str(val).upper() == "TRUE")
            else:
                d[h] = val
        return d

    def _dict_to_row(self, data_dict, headers):
        return [str(data_dict.get(h, "")) for h in headers]

    def get_all_seats(self):
        with self.lock:
            records = self.active_ws.get_all_values()
            if len(records) <= 1: return []
            headers = records[0]
            seats = []
            for r in records[1:]:
                if not r: continue
                seats.append(self._row_to_dict(r, headers))
            
            # Sort by seat number
            seats.sort(key=lambda x: x.get("seat_number", 0))
            return seats

    def get_seat(self, seat_number):
        seats = self.get_all_seats()
        for s in seats:
            if str(s.get("seat_number")) == str(seat_number):
                return s
        return None

    def update_seat(self, seat_number, student_data):
        with self.lock:
            records = self.active_ws.get_all_values()
            if len(records) <= 1: return False
            headers = records[0]
            
            row_index = -1
            for idx, r in enumerate(records[1:], start=2):
                if len(r) > 0 and str(r[0]) == str(seat_number):
                    row_index = idx
                    break
                    
            if row_index == -1: return False
            
            # Fetch current
            current_row = records[row_index - 1]
            current_dict = self._row_to_dict(current_row, headers)
            
            # Check if this is a new registration (seat was empty)
            is_new_registration = not current_dict.get("is_occupied", False)

            # Update with new
            for k, v in student_data.items():
                current_dict[k] = v
                
            # Calc balances
            if "total_amount" in current_dict and "amount_paid" in current_dict:
                try:
                    tot = float(current_dict["total_amount"])
                    paid = float(current_dict["amount_paid"])
                    current_dict["pending_balance"] = max(0, tot - paid)
                except: pass
                
            current_dict["is_occupied"] = "TRUE"
            
            new_row = self._dict_to_row(current_dict, headers)
            # Update cell range
            range_name = f"A{row_index}:{gspread.utils.rowcol_to_a1(row_index, len(headers))}"
            self.active_ws.update(values=[new_row], range_name=range_name)
            return True


    def clear_seat(self, seat_number, archive=True):
        with self.lock:
            records = self.active_ws.get_all_values()
            if len(records) <= 1: return False
            headers = records[0]
            
            row_index = -1
            for idx, r in enumerate(records[1:], start=2):
                if len(r) > 0 and str(r[0]) == str(seat_number):
                    row_index = idx
                    break
                    
            if row_index == -1: return False
            
            current_row = records[row_index - 1]
            current_dict = self._row_to_dict(current_row, headers)
            
            if archive and current_dict.get("is_occupied"):
                archived_dict = current_dict.copy()
                archived_dict["archived_at"] = datetime.now().isoformat()
                archived_headers = self.archive_ws.row_values(1)
                self.archive_ws.append_row(self._dict_to_row(archived_dict, archived_headers))
                
            # Clear seat row
            empty_dict = {
                "seat_number": int(seat_number),
                "student_name": "", "mobile": "", "exam_prep": "",
                "start_date": "", "end_date": "", 
                "total_amount": 0.0, "amount_paid": 0.0, "pending_balance": 0.0,
                "is_occupied": "FALSE", "payment_mode": "", "receipt_path": ""
            }
            new_row = self._dict_to_row(empty_dict, headers)
            range_name = f"A{row_index}:{gspread.utils.rowcol_to_a1(row_index, len(headers))}"
            self.active_ws.update(values=[new_row], range_name=range_name)
            return True

    def add_transaction(self, transaction_data):
        transaction_data["timestamp"] = datetime.now().isoformat()
        headers = self.transactions_ws.row_values(1)
        new_row = [str(transaction_data.get(h, "")) for h in headers]
        self.transactions_ws.append_row(new_row)
        return True
            
    def get_transactions(self):
        records = self.transactions_ws.get_all_values()
        if len(records) <= 1: return []
        headers = records[0]
        transactions = [self._row_to_dict(r, headers) for r in records[1:] if r]
        transactions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return transactions
