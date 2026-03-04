import sys
import os
import json
from flask import Flask, render_template, request, redirect, url_for, flash, session

# Adjust Python path to include models and services
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

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

# Register modular routes (Wait to import until app is created)
from routes import seat_routes, student_routes
app.register_blueprint(seat_routes.bp)
app.register_blueprint(student_routes.bp)

from flask import send_from_directory
@app.route('/static/receipts/<path:filename>')
@login_required
def download_receipt(filename):
    receipts_dir = os.path.join(project_root, 'receipts')
    return send_from_directory(receipts_dir, filename)

# Start server
if __name__ == '__main__':
    app.run(debug=True, port=5000)
