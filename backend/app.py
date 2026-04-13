import sys
import os
import json
from flask import Flask, render_template, request, redirect, url_for, flash, session

# Adjust Python path to include models and services
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
if os.path.join(project_root, 'backend') not in sys.path:
    sys.path.insert(0, os.path.join(project_root, 'backend'))

app = Flask(__name__, template_folder='../frontend/templates', static_folder='../frontend/static')

# Load Settings
config_path = os.path.join(project_root, 'config', 'settings.json')
try:
    with open(config_path, 'r') as f:
        settings = json.load(f)
        app.secret_key = settings.get('secret_key', 'dev_default_key')
except Exception as e:
    print(f"Failed to load config: {e}")
    app.secret_key = 'fallback_key'

# --- Simple Auth Wrapper ---
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- Routes ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if settings and username == settings.get('admin_username') and password == settings.get('admin_password'):
            session['logged_in'] = True
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid credentials')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

@app.route('/')
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

# --- Automated Cron Endpoint ---
@app.route('/api/cron/send_reminders', methods=['GET'])
def send_reminders():
    """
    Triggered daily by Vercel Cron.
    Sweeps active users and sends Twilio reminders if exactly 3 days left.
    """
    from backend.services.google_sheets_api import GoogleSheetsAPI
    from backend.services.notification_gateway import NotificationGateway
    from backend.services.billing_logic import BillingLogic
    from datetime import datetime

    db = GoogleSheetsAPI()
    gateway = NotificationGateway()
    
    seats = db.get_all_seats()
    today = datetime.now().date()
    sent_count = 0
    
    for seat in seats:
        if seat.get('is_occupied') and seat.get('end_date') and seat.get('mobile'):
            try:
                end_date = datetime.strptime(seat['end_date'], "%Y-%m-%d").date()
                diff_days = (end_date - today).days
                
                # Send reminder exactly 3 days out
                if diff_days == 3:
                    gateway.send_expiration_reminder(
                        seat['mobile'], 
                        seat['student_name'], 
                        diff_days
                    )
                    sent_count += 1
            except Exception as e:
                print(f"Error processing seat {seat.get('seat_number')}: {e}")
                continue
                
    return app.response_class(
        response=json.dumps({"success": True, "messages_dispatched": sent_count}),
        status=200,
        mimetype='application/json'
    )

# Register modular routes (Wait to import until app is created)
from backend.routes import seat_routes, student_routes
app.register_blueprint(seat_routes.bp)
app.register_blueprint(student_routes.bp)

from flask import send_from_directory
@app.route('/api/receipts/<path:filename>')
def download_receipt(filename):
    receipts_dir = '/tmp/receipts'
    if not os.path.exists(receipts_dir):
        os.makedirs(receipts_dir, exist_ok=True)
    return send_from_directory(receipts_dir, filename)

# Start server
if __name__ == '__main__':
    app.run(debug=True, port=5000)
