import threading
import random
import time
# --- SIMULATION: Generate alerts every 5 minutes ---

import csv
import os
from flask import Flask, jsonify, request, make_response
import math
import traceback
from flask_mail import Mail, Message
import pandas as pd

app = Flask(__name__)

# Add CORS headers to all responses
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

from flask import make_response

@app.route('/api/transactions', methods=['GET', 'OPTIONS'])
def get_transactions():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'GET,OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'transactions.csv')
        if not os.path.exists(csv_path):
            response = jsonify({'status': 'error', 'message': 'transactions.csv not found'})
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response, 404
        import csv
        transactions = []
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                transactions.append(row)
        response = jsonify(transactions)
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    except Exception as e:
        print(f"Error reading transactions: {str(e)}")
        response = jsonify({'status': 'error', 'message': str(e)})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 500

def simulate_alerts_background():
    blood_groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
    components = ['Whole Blood', 'Plasma', 'Platelets', 'RBC']
    alerts_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    notifications_path = os.path.join(os.path.dirname(__file__), 'notifications.json')
    while True:
        now = time.strftime('%Y-%m-%d %H:%M:%S')
        blood_group = random.choice(blood_groups)
        component = random.choice(components)
        units = random.randint(1, 5)
        alert_id = str(int(time.time() * 1000))
        # Simulate a real hospital row
        hospital_id = str(random.randint(1, 20))
        hospital_name = f"Hospital {hospital_id}"
        urgency = random.choice(['Critical', 'Urgent', 'Normal'])
        status = 'Pending'
        date = time.strftime('%d-%m-%Y')
        time_str = time.strftime('%H:%M')
        blood_group_id = str(random.randint(1, 8))
        component_id = str(random.randint(1, 5))
        alert_row = {
            'alert_id': alert_id,
            'hospital_id': hospital_id,
            'hospital_name': hospital_name,
            'blood_group': blood_group,
            'component': component,
            'units_needed': str(units),
            'urgency': urgency,
            'status': status,
            'date': date,
            'time': time_str,
            'blood_group_id': blood_group_id,
            'component_id': component_id
        }
        # Prepend to alerts_data.csv and remove unwanted rows
        try:
            import csv
            # Read all existing alerts
            existing_alerts = []
            if os.path.isfile(alerts_path) and os.stat(alerts_path).st_size > 0:
                with open(alerts_path, 'r', newline='', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)
                    for row in reader:
                        # Only keep rows that have all required hospital columns
                        if all(k in row and row[k] for k in ['alert_id','hospital_id','hospital_name','blood_group','component','units_needed','urgency','status','date','time','blood_group_id','component_id']):
                            existing_alerts.append(row)
            # Prepend new alert
            all_alerts = [alert_row] + existing_alerts
            with open(alerts_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=[
                    'alert_id','hospital_id','hospital_name','blood_group','component','units_needed','urgency','status','date','time','blood_group_id','component_id'])
                writer.writeheader()
                writer.writerows(all_alerts)
        except Exception as e:
            print(f"[SIM ALERT] Error writing alert: {e}")
        # Also add to notifications
        notif = {
            'type': 'Hospital Request',
            'message': f"{hospital_name} requests {units} units of {component} ({blood_group}) [{urgency}]",
            'timestamp': now
        }
        # Write notification to notifications.json (keep only last 20)
        try:
            import json
            notifs = []
            if os.path.exists(notifications_path):
                with open(notifications_path, 'r', encoding='utf-8') as f:
                    notifs = json.load(f)
            notifs.insert(0, notif)
            notifs = notifs[:20]
            with open(notifications_path, 'w', encoding='utf-8') as f:
                json.dump(notifs, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[SIM ALERT] Error writing notification: {e}")
        time.sleep(300)  # 5 minutes

# Start simulation in background
def start_simulation_thread():
    t = threading.Thread(target=simulate_alerts_background, daemon=True)
    t.start()

start_simulation_thread()
# --- NOTIFICATIONS ENDPOINT FOR DASHBOARD ---
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    notifications_path = os.path.join(os.path.dirname(__file__), 'notifications.json')
    import json
    notifications = []
    try:
        if os.path.exists(notifications_path):
            with open(notifications_path, 'r', encoding='utf-8') as f:
                notifications = json.load(f)
        return jsonify({'status': 'success', 'notifications': notifications})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Helper to load donors from CSV
def load_donors_from_csv():
    donors = []
    csv_path = os.path.join(os.path.dirname(__file__), 'donors_data.csv')
    try:
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Parse lat/lon as float, donor_id as int
                try:
                    row['lat'] = float(row['lat'])
                    row['lon'] = float(row['lon'])
                except Exception:
                    row['lat'] = None
                    row['lon'] = None
                try:
                    row['donor_id'] = int(row['donor_id'])
                except Exception:
                    pass
                donors.append(row)
    except Exception as e:
        print(f"Error loading donors from CSV: {e}")
    return donors

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'krithikavenkates@gmail.com'      # <-- your email
app.config['MAIL_PASSWORD'] = '      '         # <-- your app password
app.config['MAIL_DEFAULT_SENDER'] = 'krithikavenkates@gmail.com'

mail = Mail(app)

@app.route('/api/inventory/update', methods=['POST'])
def update_inventory():
    data = request.get_json()
    blood_group = data.get('blood_group')
    component = data.get('component')
    blood_group_id = str(data.get('blood_group_id'))
    component_id = str(data.get('component_id'))
    units_available = data.get('units_available')
    if not (blood_group and component and blood_group_id and component_id and units_available is not None):
        return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
    inv_path = os.path.join(os.path.dirname(__file__), 'inventory_data.csv')
    updated_inventory = []
    found = False
    try:
        with open(inv_path, newline='', encoding='utf-8') as csvfile:
            reader = list(csv.DictReader(csvfile))
            for row in reader:
                if row['blood_group'] == blood_group and row['component'] == component and row['blood_group_id'] == blood_group_id and row['component_id'] == component_id:
                    row['units_available'] = str(units_available)
                    found = True
                updated_inventory.append(row)
        if not found:
            return jsonify({'status': 'error', 'message': 'Inventory row not found'}), 404
        with open(inv_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=updated_inventory[0].keys())
            writer.writeheader()
            writer.writerows(updated_inventory)
        return jsonify({'status': 'success', 'message': 'Inventory updated'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    csv_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    alerts = []
    try:
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                alerts.append(row)
        return jsonify({'status': 'success', 'alerts': alerts})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- INVENTORY API ---
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    csv_path = os.path.join(os.path.dirname(__file__), 'inventory_data.csv')
    inventory = []
    try:
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                inventory.append(row)
        return jsonify({'status': 'success', 'inventory': inventory})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- COMPLETE ALERT (RESOLVE & UPDATE INVENTORY) ---
@app.route('/api/alerts/complete', methods=['POST'])
def complete_alert():
    data = request.get_json()
    alert_id = str(data.get('alert_id'))
    units_used = int(data.get('units_used', 0))
    blood_group = data.get('blood_group')
    component = data.get('component')
    # Update alerts_data.csv
    alerts_path = os.path.join(os.path.dirname(__file__), 'alerts_data.csv')
    updated_alerts = []
    found = False
    try:
        with open(alerts_path, newline='', encoding='utf-8') as csvfile:
            reader = list(csv.DictReader(csvfile))
            for row in reader:
                if row['alert_id'] == alert_id:
                    row['status'] = 'Resolved'
                    found = True
                updated_alerts.append(row)
        if found:
            with open(alerts_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=updated_alerts[0].keys())
                writer.writeheader()
                writer.writerows(updated_alerts)
        else:
            return jsonify({'status': 'error', 'message': 'Alert not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

    # Update inventory_data.csv
    inv_path = os.path.join(os.path.dirname(__file__), 'inventory_data.csv')
    updated_inventory = []
    try:
        with open(inv_path, newline='', encoding='utf-8') as csvfile:
            reader = list(csv.DictReader(csvfile))
            for row in reader:
                if row['blood_group'] == blood_group and row['component'] == component:
                    row['units_available'] = str(max(0, int(row['units_available']) - units_used))
                updated_inventory.append(row)
        with open(inv_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=updated_inventory[0].keys())
            writer.writeheader()
            writer.writerows(updated_inventory)
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Inventory update failed: ' + str(e)}), 500

    return jsonify({'status': 'success', 'message': 'Alert completed and inventory updated.'})

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        remember_me = data.get('remember_me', False)

        # Path to CSV file (adjust if needed)
        csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__),  'login_data.csv'))
        if not os.path.exists(csv_path):
            return jsonify({'status': 'error', 'message': 'Login data file not found'}), 500

        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row['username'] == username and row['password'] == password:
                    # Optionally check remember_me if needed
                    return jsonify({'status': 'success', 'message': 'Login successful'})
        return jsonify({'status': 'error', 'message': 'Invalid username or password'}), 401
    except Exception as e:
        print(f"Error in login: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km"""
    try:
        R = 6371  # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat/2) * math.sin(dlat/2) + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlon/2) * math.sin(dlon/2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        return distance
    except Exception as e:
        print(f"Error calculating distance: {e}")
        return 0

@app.route('/')
def home():
    return jsonify({
        "message": "Blood Bank API is running!", 
        "status": "success",
        "available_endpoints": [
            "POST /api/donors/map - Get donor data for map",
            "POST /api/donors/notify - Send donor notification"
        ]
    })

@app.route('/api/donors/map', methods=['POST', 'OPTIONS'])
def generate_donor_map():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    
    try:
        data = request.get_json()
        if not data:
            data = {}
        center_lat = float(data.get('latitude', 12.9716))
        center_lon = float(data.get('longitude', 77.5946))
        radius = float(data.get('radius', 5))
        blood_group_filter = data.get('bloodGroup', None)

        donors = load_donors_from_csv()
        print(f"Returning donors for center: ({center_lat}, {center_lon}), radius: {radius}km, blood group: {blood_group_filter}")

        # Filter and add nearby donors
        nearby_donors = []
        for donor in donors:
            if blood_group_filter and blood_group_filter != 'All' and donor['blood_group'] != blood_group_filter:
                continue
            if donor['lat'] is None or donor['lon'] is None:
                continue
            distance = calculate_distance(center_lat, center_lon, donor['lat'], donor['lon'])
            if distance <= radius:
                donor_with_distance = donor.copy()
                donor_with_distance['distance'] = f"{round(distance, 2)}km"
                nearby_donors.append(donor_with_distance)

        print(f"Found {len(nearby_donors)} nearby donors")

        return jsonify({
            'donors': nearby_donors,
            'status': 'success'
        })

    except Exception as e:
        print(f"Error generating donor data: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/api/donors/notify', methods=['POST', 'OPTIONS'])
def notify_donor():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    try:
        data = request.get_json()
        donor_id = data.get('donor_id')
        message = data.get('message', 'Blood donation needed urgently!')

        donors = load_donors_from_csv()
        donor = next((d for d in donors if str(d.get('donor_id')) == str(donor_id)), None)
        if not donor:
            return jsonify({'status': 'error', 'message': 'Donor not found'}), 404

        # Send email
        msg = Message(
            subject="Urgent Blood Donation Needed",
            recipients=[donor['email']],
            body=f"Dear {donor['name']},\n\n{message}\n\nThank you for being a lifesaver!"
        )
        mail.send(msg)
        print(f"Email sent to {donor['email']}")

        return jsonify({'status': 'success', 'message': 'Notification sent'})
    except Exception as e:
        print(f"Error sending notification: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'status': 'error',
        'available_endpoints': [
            'GET / - API status',
            'POST /api/donors/map - Get donor data for map',
            'POST /api/donors/notify - Send donor notification'
        ]
    }), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({
        'error': 'Internal server error',
        'status': 'error'
    }), 500

if __name__ == '__main__':
    print("🩸 Starting Blood Bank Flask API...")
    print("📍 Available at: http://127.0.0.1:5050")
    print("🗺️  Map endpoint: http://127.0.0.1:5050/api/donors/map")
    print("📧 Notify endpoint: http://127.0.0.1:5050/api/donors/notify")
    app.run(debug=True, port=5050, host='127.0.0.1')
