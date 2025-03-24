from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sqlite3
import os
import jwt
import datetime
import hashlib
import uuid
from functools import wraps
import requests
from groq import Groq
from bs4 import BeautifulSoup
import pickle
import numpy as np
from flask import Flask, request, jsonify
import pandas as pd
import re
from geopy.geocoders import Nominatim
import time

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = 'revivewell-secret-key'  # In production, use environment variable
app.config['DATABASE'] = 'revivewell.db'
app.config['JWT_EXPIRATION'] = 24 * 60 * 60  # 24 hours

# Database setup
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.executescript(f.read())
        db.commit()

# Create schema.sql file if it doesn't exist
if not os.path.exists('schema.sql'):
    with open('schema.sql', 'w') as f:
        f.write('''
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_info (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    dob TEXT,
    contact_number TEXT,
    primary_substance TEXT,
    usage_duration TEXT,
    previous_treatment TEXT,
    primary_goal TEXT,
    specific_goals TEXT,
    support_system TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES users (id),
    FOREIGN KEY (provider_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS daily_checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mood INTEGER,
    cravings INTEGER,
    challenges TEXT,
    goals TEXT,
    need_counselor BOOLEAN DEFAULT 0,
    need_support_group BOOLEAN DEFAULT 0,
    need_emergency_contact BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT,
    is_bot_message BOOLEAN DEFAULT 0,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users (id),
    FOREIGN KEY (receiver_id) REFERENCES users (id)
);
''')

# Initialize the database
if not os.path.exists(app.config['DATABASE']):
    init_db()

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            db = get_db()
            current_user = db.execute(
                'SELECT * FROM users WHERE id = ?',
                (data['user_id'],)
            ).fetchone()
            
            if current_user is None:
                return jsonify({'message': 'Invalid token'}), 401
                
        except:
            return jsonify({'message': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# Helper functions
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=app.config['JWT_EXPIRATION'])
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    
    # Validate input
    required_fields = ['name', 'email', 'password', 'userType']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    db = get_db()
    
    # Check if email exists
    if db.execute('SELECT * FROM users WHERE email = ?', (data['email'],)).fetchone():
        return jsonify({'message': 'User with this email already exists'}), 409
    
    user_id = str(uuid.uuid4())
    
    # Create user
    db.execute(
        'INSERT INTO users (id, name, email, password, user_type) VALUES (?, ?, ?, ?, ?)',
        (user_id, data['name'], data['email'], hash_password(data['password']), data['userType'])
    )
    db.commit()
    
    # Generate token
    token = generate_token(user_id)
    
    return jsonify({
        'message': 'User registered successfully',
        'token': token,
        'user': {
            'id': user_id,
            'name': data['name'],
            'email': data['email'],
            'userType': data['userType']
        }
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    # Validate input
    if 'email' not in data or 'password' not in data:
        return jsonify({'message': 'Missing email or password'}), 400
    
    db = get_db()
    
    # Find user
    user = db.execute(
        'SELECT * FROM users WHERE email = ?',
        (data['email'],)
    ).fetchone()
    
    if user is None or user['password'] != hash_password(data['password']):
        return jsonify({'message': 'Invalid email or password'}), 401
    
    # Generate token
    token = generate_token(user['id'])
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'userType': user['user_type']
        }
    }), 200

@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    db = get_db()
    
    # Get additional user info if user is a patient
    if current_user['user_type'] == 'patient':
        patient_info = db.execute(
            'SELECT * FROM patient_info WHERE user_id = ?',
            (current_user['id'],)
        ).fetchone()
        
        if patient_info:
            profile = dict(patient_info)
        else:
            profile = {}
    else:
        profile = {}
    
    # Add basic user info
    profile.update({
        'id': current_user['id'],
        'name': current_user['name'],
        'email': current_user['email'],
        'userType': current_user['user_type']
    })
    
    return jsonify(profile), 200

@app.route('/api/user/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.json
    db = get_db()
    
    # Update basic user info
    if 'name' in data:
        db.execute(
            'UPDATE users SET name = ? WHERE id = ?',
            (data['name'], current_user['id'])
        )
    
    # Update patient-specific info
    if current_user['user_type'] == 'patient':
        patient_fields = [
            'dob', 'contact_number', 'primary_substance', 'usage_duration',
            'previous_treatment', 'primary_goal', 'specific_goals', 'support_system'
        ]
        
        # Check if patient info exists
        patient_info = db.execute(
            'SELECT * FROM patient_info WHERE user_id = ?',
            (current_user['id'],)
        ).fetchone()
        
        patient_data = {k: data.get(k) for k in patient_fields if k in data}
        
        if patient_data:
            if patient_info:
                # Update existing record
                placeholders = ', '.join([f'{k} = ?' for k in patient_data.keys()])
                query = f'UPDATE patient_info SET {placeholders} WHERE user_id = ?'
                db.execute(query, (*patient_data.values(), current_user['id']))
            else:
                # Create new record
                patient_id = str(uuid.uuid4())
                placeholders = ', '.join(['?'] * (len(patient_data) + 2))
                columns = 'id, user_id, ' + ', '.join(patient_data.keys())
                query = f'INSERT INTO patient_info ({columns}) VALUES ({placeholders})'
                db.execute(query, (patient_id, current_user['id'], *patient_data.values()))
    
    db.commit()
    
    return jsonify({'message': 'Profile updated successfully'}), 200

@app.route('/api/new-user-form', methods=['POST'])
@token_required
def submit_new_user_form(current_user):
    data = request.json
    db = get_db()
    
    # Validate user type
    if current_user['user_type'] != 'patient':
        return jsonify({'message': 'Only patients can submit this form'}), 403
    
    patient_id = str(uuid.uuid4())
    
    # Insert patient info
    db.execute(
        '''INSERT INTO patient_info 
           (id, user_id, dob, contact_number, primary_substance, usage_duration, 
            previous_treatment, primary_goal, specific_goals, support_system)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (
            patient_id, 
            current_user['id'],
            data.get('dob', ''),
            data.get('contactNumber', ''),
            data.get('primarySubstance', ''),
            data.get('usageDuration', ''),
            data.get('previousTreatment', ''),
            data.get('primaryGoal', ''),
            data.get('specificGoals', ''),
            data.get('supportSystem', '')
        )
    )
    db.commit()
    
    return jsonify({'message': 'New user form submitted successfully'}), 201

@app.route('/api/daily-checkin', methods=['POST'])
@token_required
def submit_daily_checkin(current_user):
    data = request.json
    db = get_db()
    
    checkin_id = str(uuid.uuid4())
    
    db.execute(
        '''INSERT INTO daily_checkins 
           (id, user_id, mood, cravings, challenges, goals, 
            need_counselor, need_support_group, need_emergency_contact)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (
            checkin_id,
            current_user['id'],
            data.get('mood'),
            data.get('cravings'),
            data.get('challenges', ''),
            data.get('goals', ''),
            1 if data.get('needCounselor') else 0,
            1 if data.get('needSupportGroup') else 0,
            1 if data.get('needEmergencyContact') else 0
        )
    )
    db.commit()
    
    return jsonify({
        'message': 'Check-in submitted successfully',
        'checkinId': checkin_id
    }), 201

@app.route('/api/daily-checkins', methods=['GET'])
@token_required
def get_daily_checkins(current_user):
    db = get_db()
    
    # For patients, get their own check-ins
    if current_user['user_type'] == 'patient':
        checkins = db.execute(
            '''SELECT * FROM daily_checkins 
               WHERE user_id = ? 
               ORDER BY created_at DESC 
               LIMIT 30''',
            (current_user['id'],)
        ).fetchall()
    
    # For professionals, get check-ins from their patients
    elif current_user['user_type'] in ['counselor', 'doctor']:
        checkins = db.execute(
            '''SELECT dc.*, u.name as patient_name 
               FROM daily_checkins dc
               JOIN users u ON dc.user_id = u.id
               WHERE u.user_type = 'patient'
               ORDER BY dc.created_at DESC
               LIMIT 100'''
        ).fetchall()
    
    else:
        return jsonify({'message': 'Unauthorized access'}), 403

    # Convert DB results to a list of dictionaries
    checkins_list = [dict(checkin) for checkin in checkins]
    print(checkins_list)
    # Define the role for addiction recovery and mental health support
    system_prompt = (
        "You are a mental health and addiction recovery expert. "
        "Based on the following user check-in data, provide a personalized recovery plan, "
        "including practical coping strategies, emotional support, and do's and don'ts. "
        "Your advice should be positive, research-backed, and aligned with professional therapy recommendations."
    )

    # Prepare the input for Groq API
    groq_payload = {
        "model": "llama-3.3-70b-specdec",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here are the latest check-ins:\n{checkins_list}\nGenerate a structured response. Make it Short, just want two points in each"}
        ]
    }

    GROQ_API_KEY = "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"
    try:
        llm_response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",  # Correct endpoint
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json=groq_payload
        )

        llm_data = llm_response.json()
        llm_output = llm_data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to fetch LLM response: {str(e)}"}), 500

    # Combine check-in data with LLM insights
    result = {
        "checkins":checkins_list,
        "llm_insights": llm_output
    }
    print(result)
    return jsonify(result), 200

@app.route('/api/appointments', methods=['GET'])
@token_required
def get_appointments(current_user):
    db = get_db()
    
    # For patients, get their own appointments
    if current_user['user_type'] == 'patient':
        appointments = db.execute(
            '''SELECT a.*, u.name as provider_name 
               FROM appointments a
               JOIN users u ON a.provider_id = u.id
               WHERE a.patient_id = ?
               ORDER BY a.date, a.time''',
            (current_user['id'],)
        ).fetchall()
    
    # For professionals, get appointments with their patients
    elif current_user['user_type'] in ['counselor', 'doctor']:
        appointments = db.execute(
            '''SELECT a.*, u.name as patient_name 
               FROM appointments a
               JOIN users u ON a.patient_id = u.id
               WHERE a.provider_id = ?
               ORDER BY a.date, a.time''',
            (current_user['id'],)
        ).fetchall()
    
    else:
        return jsonify({'message': 'Unauthorized access'}), 403
    
    result = [dict(appointment) for appointment in appointments]
    return jsonify(result), 200

@app.route('/api/appointments', methods=['POST'])
@token_required
def create_appointment(current_user):
    data = request.json
    db = get_db()
    
    # Validate required fields
    required_fields = ['patientId', 'providerId', 'date', 'time', 'type']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    # Check if patient and provider exist
    patient = db.execute('SELECT * FROM users WHERE id = ?', (data['patientId'],)).fetchone()
    provider = db.execute('SELECT * FROM users WHERE id = ?', (data['providerId'],)).fetchone()
    
    if not patient or not provider:
        return jsonify({'message': 'Patient or provider not found'}), 404
    
    # Ensure the current user is either the patient or the provider
    if current_user['id'] != data['patientId'] and current_user['id'] != data['providerId']:
        return jsonify({'message': 'Unauthorized to create this appointment'}), 403
    
    appointment_id = str(uuid.uuid4())
    
    db.execute(
        '''INSERT INTO appointments 
           (id, patient_id, provider_id, date, time, type, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (
            appointment_id,
            data['patientId'],
            data['providerId'],
            data['date'],
            data['time'],
            data['type'],
            data.get('notes', '')
        )
    )
    db.commit()
    
    return jsonify({
        'message': 'Appointment created successfully',
        'appointmentId': appointment_id
    }), 201

@app.route('/api/messages', methods=['GET'])
@token_required
def get_messages(current_user):
    db = get_db()
    
    # Get conversation partner ID (if provided)
    partner_id = request.args.get('partnerId')
    
    if partner_id:
        # Get messages between current user and partner
        messages = db.execute(
            '''SELECT m.*, sender.name as sender_name, receiver.name as receiver_name 
               FROM messages m
               JOIN users sender ON m.sender_id = sender.id
               LEFT JOIN users receiver ON m.receiver_id = receiver.id
               WHERE (m.sender_id = ? AND m.receiver_id = ?) 
                  OR (m.sender_id = ? AND m.receiver_id = ?)
               ORDER BY m.created_at''',
            (current_user['id'], partner_id, partner_id, current_user['id'])
        ).fetchall()
    else:
        # Get all messages for current user, including bot messages
        messages = db.execute(
            '''SELECT m.*, sender.name as sender_name, receiver.name as receiver_name 
               FROM messages m
               JOIN users sender ON m.sender_id = sender.id
               LEFT JOIN users receiver ON m.receiver_id = receiver.id
               WHERE m.sender_id = ? OR m.receiver_id = ? OR (m.is_bot_message = 1 AND m.receiver_id = ?)
               ORDER BY m.created_at DESC
               LIMIT 100''',
            (current_user['id'], current_user['id'], current_user['id'])
        ).fetchall()
    
    result = [dict(message) for message in messages]
    return jsonify(result), 200

@app.route('/api/messages', methods=['POST'])
@token_required
def send_message(current_user):
    data = request.json
    db = get_db()
    
    # Validate required fields
    if 'content' not in data:
        return jsonify({'message': 'Message content is required'}), 400
    
    message_id = str(uuid.uuid4())
    
    # Check if it's a message to the bot or to another user
    if data.get('isBotMessage'):
        # This is a message to the bot
        db.execute(
            '''INSERT INTO messages 
               (id, sender_id, is_bot_message, content)
               VALUES (?, ?, 1, ?)''',
            (message_id, current_user['id'], data['content'])
        )
        
        # Simulate bot response
        bot_response_id = str(uuid.uuid4())
        bot_response = "I understand how you're feeling. Remember that you're not alone in this journey. Would you like to talk more about it?"
        
        db.execute(
            '''INSERT INTO messages 
               (id, sender_id, receiver_id, is_bot_message, content)
               VALUES (?, ?, ?, 1, ?)''',
            (bot_response_id, current_user['id'], current_user['id'], bot_response)
        )
    else:
        # Regular message to another user
        if 'receiverId' not in data:
            return jsonify({'message': 'Receiver ID is required'}), 400
        
        # Verify receiver exists
        receiver = db.execute('SELECT * FROM users WHERE id = ?', (data['receiverId'],)).fetchone()
        if not receiver:
            return jsonify({'message': 'Receiver not found'}), 404
        
        # Save message
        db.execute(
            '''INSERT INTO messages 
               (id, sender_id, receiver_id, content)
               VALUES (?, ?, ?, ?)''',
            (message_id, current_user['id'], data['receiverId'], data['content'])
        )
    
    db.commit()
    
    return jsonify({
        'message': 'Message sent successfully',
        'messageId': message_id
    }), 201

@app.route('/api/dashboard-stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    db = get_db()
    
    if current_user['user_type'] == 'patient':
        # Get patient's next appointment
        next_appointment = db.execute(
            '''SELECT a.*, u.name as provider_name 
               FROM appointments a
               JOIN users u ON a.provider_id = u.id
               WHERE a.patient_id = ? AND a.date >= date('now')
               ORDER BY a.date, a.time
               LIMIT 1''',
            (current_user['id'],)
        ).fetchone()
        
        # Get patient's progress (simplified - in a real app this would be more complex)
        progress = 75  # Example value
        
        # Get recent checkins
        recent_checkins = db.execute(
            '''SELECT * FROM daily_checkins 
               WHERE user_id = ? 
               ORDER BY created_at DESC 
               LIMIT 7''',
            (current_user['id'],)
        ).fetchall()
        
        result = {
            'progress': progress,
            'nextAppointment': dict(next_appointment) if next_appointment else None,
            'recentCheckins': [dict(checkin) for checkin in recent_checkins]
        }
    
    elif current_user['user_type'] in ['counselor', 'doctor']:
        # Get total patients count
        total_patients = db.execute(
            '''SELECT COUNT(*) as count FROM users WHERE user_type = 'patient' '''
        ).fetchone()['count']
        
        # Get critical cases count (simplified)
        critical_cases = 3  # Example value
        
        # Get today's appointments
        today_appointments = db.execute(
            '''SELECT COUNT(*) as count 
               FROM appointments 
               WHERE provider_id = ? AND date = date('now')''',
            (current_user['id'],)
        ).fetchone()['count']
        
        # Get recent patient list
        patients = db.execute(
            '''SELECT u.id, u.name, 
                     (SELECT MAX(created_at) FROM daily_checkins WHERE user_id = u.id) as last_checkin,
                     'Low' as risk_level,
                     (SELECT MIN(date) FROM appointments WHERE patient_id = u.id AND date >= date('now')) as next_appointment
               FROM users u
               WHERE u.user_type = 'patient'
               LIMIT 10'''
        ).fetchall()
        
        result = {
            'totalPatients': total_patients,
            'criticalCases': critical_cases,
            'todayAppointments': today_appointments,
            'patients': [dict(patient) for patient in patients]
        }
    
    else:
        return jsonify({'message': 'Unauthorized access'}), 403
    
    return jsonify(result), 200

client = Groq(api_key="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")

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message')

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    # Defining the role for addiction recovery
    system_prompt = (
        "You are an addiction recovery consultant and mental health supporter. "
        "You provide compassionate, research-backed advice on overcoming substance addiction, "
        "coping mechanisms, therapy recommendations, and emotional support. "
        "You do NOT discuss unrelated topics and always encourage professional consultation when necessary."
    )

    try:
        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-specdec",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
        )

        bot_reply = chat_completion.choices[0].message.content
        return jsonify({"reply": bot_reply})

    except Exception as e:
        return jsonify({"error": f"Failed to fetch response: {str(e)}"}), 500
    

@app.route('/api/get-aa', methods=['GET', 'POST'])
def get_aa_meetings():
    """
    Flask endpoint to fetch AA meetings for a city in India
    
    Query Parameters (GET) or JSON body (POST):
        city: City name in India (default: Chennai)
    
    Returns:
        JSON: List of AA meetings with details
    """
    # Get city parameter (from query params or JSON body)
    if request.method == 'GET':
        city = request.args.get('city', 'Chennai')
    else:  # POST
        data = request.get_json(silent=True) or {}
        city = data.get('city', 'Chennai')
    
    try:
        # Geocode the location to get coordinates
        geolocator = Nominatim(user_agent="aa_meetings_finder_india")
        loc = geolocator.geocode(f"{city}, India")
        
        if not loc:
            return jsonify({
                "status": "error",
                "message": f"Could not find coordinates for {city}, India. Please try another location.",
                "meetings": []
            })
        
        lat = loc.latitude
        lng = loc.longitude
        
        # Format URL with the coordinates and location
        formatted_location = city.replace(" ", "+")
        url = f"https://www.aa.org/find-aa/north-america?dist_center%5Bcoordinates%5D%5Blat%5D={lat}&dist_center%5Bcoordinates%5D%5Blng%5D={lng}&dist_center%5Bgeocoder%5D%5Bgeolocation_geocoder_address%5D={formatted_location}%2C+India"
        
        print(f"Fetching AA meetings from: {url}")
        
        # Make the request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": f"Could not access the AA.org website. Status code: {response.status_code}",
                "meetings": []
            })
        
        # Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for meeting data in the page
        meetings = []
        
        # First attempt: Look for the search results directly
        meeting_items = soup.find_all('div', class_=lambda x: x and 'views-row' in x)
        
        if meeting_items:
            for item in meeting_items:
                try:
                    # Extract name and distance
                    name_elem = item.find('h2')
                    name = name_elem.text.strip() if name_elem else "Unknown"
                    
                    # Try to find distance information
                    distance_text = item.find(text=re.compile(r'\d+\.\d+\s*miles'))
                    distance = distance_text.strip() if distance_text else "Unknown"
                    
                    # Extract phone if available
                    phone_elem = item.find(text=re.compile(r'Phone:'))
                    phone = ""
                    if phone_elem:
                        phone_match = re.search(r'Phone:\s*([\d\+\-\(\)\s]+)', phone_elem.parent.text)
                        phone = phone_match.group(1).strip() if phone_match else ""
                    
                    # Extract website if available
                    website = ""
                    website_elem = item.find('a', href=re.compile(r'^http'))
                    if website_elem and 'aa.org' not in website_elem['href']:
                        website = website_elem['href']
                    
                    meetings.append({
                        'name': name,
                        'distance': distance,
                        'location': city,
                        'phone': phone,
                        'website': website,
                        'url': url
                    })
                except Exception as e:
                    print(f"Error parsing meeting item: {e}")
        
        # Second attempt: Extract from main content text if first attempt failed
        if not meetings:
            # Look for pattern in the text content
            text_content = soup.get_text()
            
            # Pattern for name with distance
            pattern = r'([A-Za-z\s\-\.\']+(?:Intergroup|Group|Fellowship)[A-Za-z\s\-\.\']*)\s*\((\d+\.\d+\s*miles)\)'
            matches = re.findall(pattern, text_content)
            
            for name, distance in matches:
                # Try to find phone number near this name
                name_pos = text_content.find(name)
                surrounding_text = text_content[name_pos:name_pos + 300]
                
                # Look for phone
                phone = ""
                phone_match = re.search(r'Phone:?\s*([\d\+\-\(\)\s]+)', surrounding_text)
                if phone_match:
                    phone = phone_match.group(1).strip()
                
                # Look for website
                website = ""
                website_match = re.search(r'(https?://[^\s\)]+)', surrounding_text)
                if website_match:
                    website = website_match.group(1)
                
                meetings.append({
                    'name': name.strip(),
                    'distance': distance.strip(),
                    'location': city,
                    'phone': phone,
                    'website': website,
                    'url': url
                })
        
        # If still no meetings found, use hardcoded data for Chennai
        if not meetings and city.lower() == "chennai":
            meetings = [
                {
                    'name': 'Chennai Intergroup',
                    'distance': '6.97 miles',
                    'location': 'Chennai',
                    'phone': '(+91) 4426441941',
                    'website': '',
                    'url': url
                },
                {
                    'name': 'Intergroup Of A.A. (Chennai)',
                    'distance': '8.18 miles',
                    'location': 'Chennai',
                    'phone': '(+91) 04426441941',
                    'website': '',
                    'url': url
                },
                {
                    'name': 'Kerala - Wayanad Intergroup',
                    'distance': '288.35 miles',
                    'location': 'Wayanad',
                    'phone': '(+91) 9388811009',
                    'website': 'http://aawmig.org',
                    'url': url
                }
            ]
        
        return jsonify({
            "status": "success",
            "city": city,
            "count": len(meetings),
            "meetings": meetings
        })
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "meetings": []
        })

pickle_filename = "ReviveWell_RF.pkl"
with open(pickle_filename, 'rb') as file:
    loaded_model = pickle.load(file)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get JSON data from request
        data = request.get_json()
        
        # Convert input data to numpy array (assuming it’s in correct shape)
        input_data = np.array(data['features']).reshape(1, -1)
        
        # Make predictions
        prediction = loaded_model.predict(input_data)
        
        return jsonify({'prediction': prediction.tolist()})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/user-checkins', methods=['GET'])
def get_user_checkins():
    db = get_db()
    
    # Get all users and their check-ins
    users = db.execute(
        '''SELECT u.id, u.name, u.email, u.user_type, dc.mood, dc.cravings, dc.challenges, dc.goals, dc.created_at
            FROM users u
            LEFT JOIN daily_checkins dc ON u.id = dc.user_id
            WHERE u.user_type = 'patient'
            ORDER BY dc.created_at DESC'''
    ).fetchall()
    
    users_list = [dict(user) for user in users]
    
    # Define the role for addiction recovery and mental health support
    system_prompt = (
        """ You are a medical AI assistant specializing in mental health and addiction recovery. 
        Based on the following patient check-in data, generate a concise 3-4 line medical insight using clinical terminology.
          Your insights should highlight key symptoms, behavioral patterns, and potential treatment considerations to help the doctor streamline the recovery process. 
        Ensure that your response aligns with evidence-based psychiatric and therapeutic guidelines."""
    )

    # Prepare the input for Groq API
    groq_payload = {
        "model": "llama-3.3-70b-specdec",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here are the latest check-ins:\n{users_list}\nGenerate a structured response. Make it Short, just want two points in each"}
        ]
    }

    GROQ_API_KEY = "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"
    try:
        llm_response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",  # Correct endpoint
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json=groq_payload
        )

        llm_data = llm_response.json()
        llm_output = llm_data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to fetch LLM response: {str(e)}"}), 500

    # Combine user data with LLM insights
    result = {
        "users": users_list,
        "llm_insights": llm_output
    }
    
    return jsonify(result), 200

# Entry point
if __name__ == '__main__':
    app.run(debug=True)