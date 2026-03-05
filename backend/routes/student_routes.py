from flask import Blueprint, jsonify, request
from backend.services.google_sheets_api import GoogleSheetsAPI
from backend.services.billing_logic import BillingLogic
from backend.services.notification_gateway import NotificationGateway
from backend.utils.pdf_generator import generate_receipt
from datetime import datetime
import os

bp = Blueprint('students', __name__, url_prefix='/api/students')
db = GoogleSheetsAPI()
notifications = NotificationGateway()

@bp.route('/register', methods=['POST'])
def register_student():
    data = request.json
    try:
        seat_number = int(data.get('seat_number'))
        
        # Validation: Check for duplicate student
        new_name = data.get('student_name', '').strip()
        new_mobile = data.get('mobile', '').strip()
        
        all_seats = db.get_all_seats()
        for seat in all_seats:
            if seat.get('is_occupied'):
                existing_name = str(seat.get('student_name', '')).strip()
                existing_mobile = str(seat.get('mobile', '')).strip()
                
                # If exact same name AND phone number exists
                if existing_name.lower() == new_name.lower() and existing_mobile == new_mobile:
                    return jsonify({
                        "success": False, 
                        "message": f"Student already exists on Seat {seat.get('seat_number')}. Duplicate registration is not allowed."
                    }), 400

        student_data = {
            "student_name": new_name,
            "mobile": new_mobile,
            "address": data.get('address'),
            "exam_prep": data.get('exam_prep'),
            "start_date": data.get('start_date', datetime.now().strftime("%Y-%m-%d")),
            "total_amount": float(data.get('total_amount', 799)),
            "amount_paid": float(data.get('amount_paid', 0)),
            "payment_mode": data.get('payment_mode', 'Offline'),
            "is_occupied": True
        }
        
        # Calculate End Date
        days = int(data.get('days', 30))
        student_data["end_date"] = BillingLogic.calculate_end_date(student_data["start_date"], days)
        
        # Balance auto-calculated in DB mock, but we'll do it explicitly here too
        student_data["pending_balance"] = BillingLogic.calculate_pending_balance(
            student_data["total_amount"], student_data["amount_paid"]
        )

        # Generate Receipt
        # Temp assign for receipt gen
        temp_seat = student_data.copy()
        temp_seat['seat_number'] = seat_number
        filepath = generate_receipt(temp_seat, '/tmp/receipts')
        
        # Save relative path to DB
        student_data['receipt_path'] = os.path.basename(filepath)

        success = db.update_seat(seat_number, student_data)
        if success:
            if float(student_data['amount_paid']) > 0:
                db.add_transaction({
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "type": "Registration",
                    "amount": float(student_data['amount_paid']),
                    "seat_number": seat_number,
                    "student_name": student_data['student_name'],
                    "payment_mode": student_data.get('payment_mode', 'Offline')
                })
            return jsonify({"success": True, "message": "Student registered successfully.", "data": student_data})
        return jsonify({"success": False, "message": "Failed to update seat"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

@bp.route('/<int:seat_id>/renew', methods=['POST'])
def renew_student(seat_id):
    data = request.json
    seat = db.get_seat(seat_id)
    if not seat or not seat.get('is_occupied'):
        return jsonify({"success": False, "message": "Seat is not occupied."}), 400
        
    try:
        days_to_add = int(data.get('days', 30))
        additional_total = float(data.get('add_total_amount', 700))
        additional_paid = float(data.get('add_amount_paid', 700))
        
        # Updates
        new_end_date = BillingLogic.calculate_end_date(seat['end_date'], days_to_add)
        new_total = float(seat['total_amount']) + additional_total
        new_paid = float(seat['amount_paid']) + additional_paid
        pending = BillingLogic.calculate_pending_balance(new_total, new_paid)
        
        updated_data = {
            "end_date": new_end_date,
            "total_amount": new_total,
            "amount_paid": new_paid,
            "pending_balance": pending,
            "payment_mode": data.get('payment_mode', 'Offline')
        }
        
        seat.update(updated_data)
        
        # Generate Receipt
        filepath = generate_receipt(seat, '/tmp/receipts')
        
        # Save exact path reference for JS
        updated_data['receipt_path'] = os.path.basename(filepath)
        
        success = db.update_seat(seat_id, updated_data)
        if success:
            if additional_paid > 0:
                db.add_transaction({
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "type": "Renewal",
                    "amount": additional_paid,
                    "seat_number": seat_id,
                    "student_name": seat.get('student_name', ''),
                    "payment_mode": updated_data.get('payment_mode', 'Offline')
                })
            return jsonify({"success": True, "message": "Renewed successfully.", "receipt_path": updated_data['receipt_path']})
            
        return jsonify({"success": False, "message": "Failed to update."}), 400
    except Exception as e:
         return jsonify({"success": False, "message": str(e)}), 400

@bp.route('/<int:old_seat_id>/transfer', methods=['POST'])
def transfer_seat(old_seat_id):
    data = request.json
    new_seat_id = data.get('new_seat_id')
    
    if not new_seat_id:
         return jsonify({"success": False, "message": "Target seat required."}), 400
         
    old_seat = db.get_seat(old_seat_id)
    new_seat = db.get_seat(new_seat_id)
    
    if not old_seat or not old_seat.get('is_occupied'):
        return jsonify({"success": False, "message": "Source seat not occupied."}), 400
        
    if not new_seat or new_seat.get('is_occupied'):
        return jsonify({"success": False, "message": "Target seat is already occupied or invalid."}), 400
        
    # Copy data to new seat
    student_data = old_seat.copy()
    student_data['seat_number'] = int(new_seat_id)
    
    # Update target
    db.update_seat(new_seat_id, student_data)
    
    # Clear old seat (without archiving, since it's a transfer)
    db.clear_seat(old_seat_id, archive=False)
    
    return jsonify({"success": True, "message": f"Successfully transferred to seat {new_seat_id}"})

@bp.route('/<int:seat_id>/pay_dues', methods=['POST'])
def pay_dues(seat_id):
    data = request.json
    amount = data.get('amount')
    
    if not amount or float(amount) <= 0:
        return jsonify({"success": False, "message": "Invalid payment amount."}), 400
        
    seat = db.get_seat(seat_id)
    if not seat or not seat.get('is_occupied'):
        return jsonify({"success": False, "message": "Seat is not occupied."}), 400
        
    try:
        new_paid = float(seat.get('amount_paid', 0)) + float(amount)
        current_total = float(seat.get('total_amount', 0))
        new_pending = max(0, current_total - new_paid)
        
        updated_data = {
            "amount_paid": new_paid,
            "pending_balance": new_pending,
            "payment_mode": data.get('payment_mode', 'Offline')
        }
        
        seat.update(updated_data)
        
        # Generate new receipt reflecting payment
        seat['is_dues_clearance'] = True
        seat['current_payment'] = amount
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        receipt_dir = os.path.join(project_root, 'receipts')
        filepath = generate_receipt(seat, receipt_dir)
        
        updated_data['receipt_path'] = os.path.basename(filepath)
        
        success = db.update_seat(seat_id, updated_data)
        if success:
            db.add_transaction({
                "date": datetime.now().strftime("%Y-%m-%d"),
                "type": "Dues Clearance",
                "amount": float(amount),
                "seat_number": seat_id,
                "student_name": seat.get('student_name', ''),
                "payment_mode": updated_data.get('payment_mode', 'Offline')
            })
            return jsonify({"success": True, "message": "Dues cleared successfully.", "receipt_path": updated_data['receipt_path']})
            
        return jsonify({"success": False, "message": "Failed to update dues."}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

@bp.route('/transactions', methods=['GET'])
def get_transactions():
    try:
        transactions = db.get_transactions()
        return jsonify({"success": True, "data": transactions})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400
