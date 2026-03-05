from flask import Blueprint, jsonify, request
from backend.services.google_sheets_api import GoogleSheetsAPI

bp = Blueprint('seats', __name__, url_prefix='/api/seats')
db = GoogleSheetsAPI()

@bp.route('/', methods=['GET'])
def get_all_seats():
    seats = db.get_all_seats()
    return jsonify({"success": True, "data": seats})

@bp.route('/<int:seat_id>', methods=['GET'])
def get_seat(seat_id):
    seat = db.get_seat(seat_id)
    if seat:
        return jsonify({"success": True, "data": seat})
    return jsonify({"success": False, "message": "Seat not found"}), 404

@bp.route('/<int:seat_id>/release', methods=['POST'])
def release_seat(seat_id):
    success = db.clear_seat(seat_id, archive=True)
    if success:
        return jsonify({"success": True, "message": "Seat released and record archived"})
    return jsonify({"success": False, "message": "Failed to release seat"}), 400
