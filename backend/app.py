# app.py

from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_cors import CORS
from datetime import datetime
from models import db, User, Slot, Booking
import bcrypt

app = Flask(__name__)
app.config.from_object("config.Config")
db.init_app(app)
jwt = JWTManager(app)
CORS(app)  # NEW ADDITION

# --------------------------
# USER REGISTRATION & LOGIN
# --------------------------

@app.route('/api/register', methods=["POST"])
def register():
    data = request.get_json()
    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    new_user = User(
        name=data['name'], 
        email=data['email'], 
        mobile=data['mobile'], 
        vehicle=data['vehicle'], 
        password=hashed_password.decode('utf-8')
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"success": True, "message": "Registration successful"}), 201

@app.route('/api/login', methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.password.encode('utf-8')):
        access_token = create_access_token(identity=user.id)
        return jsonify({"token": access_token}), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401

# --------------------------
# PARKING SLOT & BOOKING SYSTEM
# --------------------------

@app.route('/api/slots', methods=["GET"])
@jwt_required()
def get_slots():
    slots = Slot.query.all()
    return jsonify({"slots": [{"id": slot.id, "status": slot.status} for slot in slots]}), 200

@app.route('/api/book', methods=["POST"])
@jwt_required()
def book_slot():
    user_id = get_jwt_identity()  # Correct way
    available_slot = Slot.query.filter_by(status='available').first()
    
    if available_slot:
        available_slot.status = 'booked'
        new_booking = Booking(
            user_id=user_id,
            slot_id=available_slot.id,
            entry_time=datetime.now(),
            amount=100.0  # ₹100 deposit initially
        )
        db.session.add(new_booking)
        db.session.commit()
        return jsonify({"message": "Slot booked successfully!"}), 200
    else:
        return jsonify({"message": "No available slots."}), 404

# --------------------------
# GATE CONTROL (Entry/Exit)
# --------------------------

@app.route('/api/entry-gate', methods=["POST"])
@jwt_required()
def entry_gate():
    return jsonify({"message": "Entry gate opened successfully!"}), 200

@app.route('/api/exit-gate', methods=["POST"])
@jwt_required()
def exit_gate():
    user_id = get_jwt_identity()

    booking = Booking.query.filter_by(user_id=user_id, exit_time=None).first()
    if booking:
        booking.exit_time = datetime.now()
        time_spent = (booking.exit_time - booking.entry_time).seconds / 60  # minutes
        # Calculate fee (example: ₹2 per minute)
        booking.amount = round(2 * time_spent, 2)

        db.session.commit()
        return jsonify({"message": "Exit gate opened!", "fee": booking.amount}), 200
    else:
        return jsonify({"message": "No active booking found!"}), 404

# --------------------------
# MAIN ROUTE
# --------------------------

@app.route('/')
def home():
    return "Smart Parking System API Running!"

if __name__ == '__main__':
    app.run(debug=True)


# Add these functions to your app.py

# --------------------------
# SLOT MANAGEMENT
# --------------------------

@app.route('/api/slots/status', methods=["GET"])
def get_slots_status():
    """Public endpoint for displaying parking availability on screens"""
    total_slots = Slot.query.count()
    available_slots = Slot.query.filter_by(status='available').count()
    
    return jsonify({
        "total": total_slots,
        "available": available_slots,
        "occupied": total_slots - available_slots
    }), 200

@app.route('/api/slots/add', methods=["POST"])
@jwt_required()
def add_slot():
    """Admin endpoint to add new parking slots"""
    # In a real app, you'd check if the user is admin
    new_slot = Slot(status="available")
    db.session.add(new_slot)
    db.session.commit()
    return jsonify({"message": "New slot added", "slot_id": new_slot.id}), 201

# --------------------------
# PAYMENT INTEGRATION
# --------------------------

@app.route('/api/payment/initiate', methods=["POST"])
@jwt_required()
def initiate_payment():
    """Initialize a payment for booking deposit or exit fees"""
    user_id = get_jwt_identity()
    data = request.get_json()
    amount = data.get('amount', 100)  # Default to ₹100 deposit
    
    # In production, integrate with Razorpay/Stripe here
    # For now, simulate payment with a dummy order ID
    import uuid
    order_id = str(uuid.uuid4())
    
    return jsonify({
        "order_id": order_id,
        "amount": amount,
        "currency": "INR",
        # Include any other details needed for frontend payment
    }), 200

@app.route('/api/payment/verify', methods=["POST"])
@jwt_required()
def verify_payment():
    """Verify a completed payment"""
    data = request.get_json()
    # In production, verify payment with payment gateway
    # For now, assume all payments succeed
    return jsonify({"verified": True, "message": "Payment successful"}), 200

# --------------------------
# IOT INTEGRATION
# --------------------------

@app.route('/api/iot/update-slot', methods=["POST"])
def update_slot_status():
    """Endpoint for ESP8266 to update slot status from sensors"""
    # In production, add authentication for IoT devices
    data = request.get_json()
    slot_id = data.get('slot_id')
    is_occupied = data.get('is_occupied', False)
    
    slot = Slot.query.get(slot_id)
    if not slot:
        return jsonify({"error": "Slot not found"}), 404
    
    # Only update if status changed and not currently booked
    if slot.status != 'booked':
        slot.status = 'occupied' if is_occupied else 'available'
        db.session.commit()
    
    return jsonify({"status": slot.status}), 200

@app.route('/api/iot/gate-status', methods=["GET"])
def get_gate_commands():
    """Endpoint for Arduino to poll for gate commands"""
    # This simulates commands that would be sent to the hardware
    # In production, implement proper authentication
    gate_id = request.args.get('gate_id', 'entry')
    
    # For now, randomly simulate commands (normally would be from DB)
    import random
    should_open = random.choice([True, False])
    
    return jsonify({
        "gate_id": gate_id,
        "should_open": should_open,
        "open_duration": 5  # seconds
    }), 200

# --------------------------
# RECEIPT SYSTEM
# --------------------------

@app.route('/api/bookings/active', methods=["GET"])
@jwt_required()
def get_active_booking():
    """Get user's current active booking"""
    user_id = get_jwt_identity()
    booking = Booking.query.filter_by(user_id=user_id, exit_time=None).first()
    
    if not booking:
        return jsonify({"active_booking": None}), 404
    
    # Calculate current duration and estimated cost
    now = datetime.now()
    duration_mins = (now - booking.entry_time).seconds / 60
    estimated_cost = round(2 * duration_mins, 2)  # ₹2 per minute
    
    slot = Slot.query.get(booking.slot_id)
    
    return jsonify({
        "booking_id": booking.id,
        "slot_id": booking.slot_id,
        "entry_time": booking.entry_time.strftime("%Y-%m-%d %H:%M:%S"),
        "duration_mins": round(duration_mins, 1),
        "estimated_cost": estimated_cost,
        "deposit": booking.amount
    }), 200

@app.route('/api/bookings/history', methods=["GET"])
@jwt_required()
def get_booking_history():
    """Get user's booking history"""
    user_id = get_jwt_identity()
    bookings = Booking.query.filter_by(user_id=user_id).order_by(Booking.entry_time.desc()).all()
    
    result = []
    for booking in bookings:
        b = {
            "booking_id": booking.id,
            "slot_id": booking.slot_id,
            "entry_time": booking.entry_time.strftime("%Y-%m-%d %H:%M:%S"),
            "amount": booking.amount
        }
        
        if booking.exit_time:
            b["exit_time"] = booking.exit_time.strftime("%Y-%m-%d %H:%M:%S")
            duration = (booking.exit_time - booking.entry_time).seconds / 60
            b["duration_mins"] = round(duration, 1)
        
        result.append(b)
    
    return jsonify({"bookings": result}), 200

# --------------------------
# SETUP DB WITH INITIAL DATA
# --------------------------

@app.before_first_request
def setup_db():
    """Initialize DB with slots on first run"""
    db.create_all()
    
    # Add some parking slots if none exist
    if Slot.query.count() == 0:
        for i in range(1, 11):  # Create 10 parking slots
            slot = Slot(status="available")
            db.session.add(slot)
        
        db.session.commit()