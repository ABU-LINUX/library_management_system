import json

data = {"active_seats": {}, "archived_records": []}
for i in range(1, 82):
    data["active_seats"][str(i)] = {
        "seat_number": i,
        "student_name": "Test " + str(i),
        "mobile": "1234567890",
        "exam_prep": "UPSC",
        "start_date": "2026-03-03",
        "end_date": "2026-04-02",
        "total_amount": 799.0,
        "amount_paid": 799.0,
        "pending_balance": 0.0,
        "is_occupied": True
    }

with open("test_db.json", "w") as f:
    json.dump(data, f, indent=2)
