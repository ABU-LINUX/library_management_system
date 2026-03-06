from flask import Blueprint, jsonify, request, send_file
from backend.services.google_sheets_api import GoogleSheetsAPI
from backend.services.billing_logic import BillingLogic
from backend.services.notification_gateway import NotificationGateway
from backend.utils.pdf_generator import generate_receipt, generate_receipt_bytes
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
            "total_amount": float(data.get('total_amount', 700)),
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
                    "date": student_data.get('start_date', datetime.now().strftime("%Y-%m-%d")),
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

@bp.route('/<int:seat_id>/update', methods=['POST'])
def update_student_details(seat_id):
    """Safely updates only personal info. Financial/date fields are never touched."""
    data = request.json
    seat = db.get_seat(seat_id)
    if not seat or not seat.get('is_occupied'):
        return jsonify({"success": False, "message": "Seat is not occupied."}), 400
    
    allowed_fields = ['student_name', 'mobile', 'address', 'exam_prep']
    update_payload = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_payload:
        return jsonify({"success": False, "message": "No valid fields to update."}), 400
    
    try:
        success = db.update_seat(seat_id, update_payload)
        if success:
            return jsonify({"success": True, "message": "Student details updated."})
        return jsonify({"success": False, "message": "Failed to update."}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@bp.route('/<int:seat_id>/change-plan', methods=['POST'])
def change_subscription_plan(seat_id):
    """Switch a student between 30-day and 90-day plan. Recalculates end_date from start_date."""
    data = request.json
    new_plan_days = int(data.get('plan_days', 30))      # 30 or 90
    new_total_amount = float(data.get('total_amount', 700))  # fee for the new plan

    if new_plan_days not in [30, 90]:
        return jsonify({"success": False, "message": "Plan must be 30 or 90 days."}), 400

    seat = db.get_seat(seat_id)
    if not seat or not seat.get('is_occupied'):
        return jsonify({"success": False, "message": "Seat is not occupied."}), 400

    try:
        from datetime import datetime as dt, timedelta
        start = dt.strptime(seat['start_date'], '%Y-%m-%d')
        new_end = start + timedelta(days=new_plan_days)
        new_end_str = new_end.strftime('%Y-%m-%d')

        # Recalculate pending balance with new total
        amount_paid = float(seat.get('amount_paid', 0))
        new_pending = max(0.0, new_total_amount - amount_paid)

        update_payload = {
            'end_date': new_end_str,
            'total_amount': new_total_amount,
            'pending_balance': new_pending,
        }
        success = db.update_seat(seat_id, update_payload)
        if success:
            return jsonify({
                "success": True,
                "message": f"Plan changed to {new_plan_days}-day. New end date: {new_end_str}",
                "new_end_date": new_end_str,
            })
        return jsonify({"success": False, "message": "Failed to update plan."}), 400
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
                    "date": data.get('start_date', datetime.now().strftime("%Y-%m-%d")),
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
        filepath = generate_receipt(seat, '/tmp/receipts')
        
        updated_data['receipt_path'] = os.path.basename(filepath)
        
        success = db.update_seat(seat_id, updated_data)
        if success:
            db.add_transaction({
                "date": data.get('date', datetime.now().strftime("%Y-%m-%d")),
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

@bp.route('/<int:seat_id>/history', methods=['GET'])
def get_student_history(seat_id):
    """Return all transactions for a specific seat number."""
    try:
        all_transactions = db.get_transactions()
        student_txns = [
            t for t in all_transactions
            if str(t.get('seat_number', '')).strip() == str(seat_id)
        ]
        student_txns.sort(key=lambda x: x.get('date', ''), reverse=False)
        return jsonify({"success": True, "data": student_txns, "count": len(student_txns)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

@bp.route('/<int:seat_id>/receipt', methods=['GET'])
def download_receipt_ondemand(seat_id):
    """Generate PDF receipt on-the-fly from Google Sheets — works on Vercel serverless."""
    try:
        seat = db.get_seat(seat_id)
        if not seat or not seat.get('is_occupied'):
            return jsonify({"success": False, "message": "Seat not found or vacant."}), 404

        # Calculate plan days from start_date and end_date
        try:
            from datetime import datetime as dt
            start = dt.strptime(seat['start_date'], '%Y-%m-%d')
            end = dt.strptime(seat['end_date'], '%Y-%m-%d')
            days = (end - start).days
            plan_days = '90' if days >= 85 else '30'
        except Exception:
            plan_days = '30'

        # Fetch last transaction for this seat to get the CURRENT payment amount
        try:
            all_transactions = db.get_transactions()
            seat_txns = [
                t for t in all_transactions
                if str(t.get('seat_number', '')).strip() == str(seat_id)
            ]
            # Sort by timestamp descending — latest transaction first
            seat_txns.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            last_txn = seat_txns[0] if seat_txns else {}
            current_payment = last_txn.get('amount', seat.get('amount_paid', 0))
            txn_payment_mode = last_txn.get('payment_mode', seat.get('payment_mode', 'Offline'))
            txn_type = last_txn.get('type', 'Registration')
        except Exception:
            current_payment = seat.get('amount_paid', 0)
            txn_payment_mode = seat.get('payment_mode', 'Offline')
            txn_type = 'Registration'

        student_data = {
            'student_name': seat.get('student_name', ''),
            'mobile': seat.get('mobile', ''),
            'address': seat.get('address', ''),
            'exam_prep': seat.get('exam_prep', ''),
            'seat_number': seat_id,
            'start_date': seat.get('start_date', ''),
            'end_date': seat.get('end_date', ''),
            'total_amount': seat.get('total_amount', 0),
            'amount_paid': seat.get('amount_paid', 0),
            'pending_balance': seat.get('pending_balance', 0),
            'current_payment': current_payment,   # ← amount from last single transaction
            'payment_mode': txn_payment_mode,
            'days': plan_days,
            'is_dues_clearance': txn_type == 'Dues Clearance',
        }

        pdf_buf = generate_receipt_bytes(student_data)
        safe_name = str(seat.get('student_name', 'Receipt')).replace(' ', '_')
        filename = f"Receipt_Seat{seat_id}_{safe_name}.pdf"

        return send_file(
            pdf_buf,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
