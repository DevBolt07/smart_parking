# hardware_simulator.py
# This script simulates the behavior of Arduino/ESP8266 hardware
# Run it in a separate terminal to test your backend

import requests
import time
import random
import json

API_BASE_URL = "http://localhost:5000/api"

class ParkingIoTSimulator:
    def __init__(self, num_slots=10):
        self.num_slots = num_slots
        self.slots_status = [False] * num_slots  # False = empty, True = occupied
        self.entry_gate_open = False
        self.exit_gate_open = False
    
    def simulate_sensor_readings(self):
        """Simulate random changes in ultrasonic sensor readings"""
        # Randomly change occupancy of 1-3 slots
        changes = random.randint(1, 3)
        for _ in range(changes):
            slot_idx = random.randint(0, self.num_slots - 1)
            self.slots_status[slot_idx] = not self.slots_status[slot_idx]
            
            # Send update to server
            self.update_slot_status(slot_idx + 1, self.slots_status[slot_idx])
    
    def update_slot_status(self, slot_id, is_occupied):
        """Send slot status update to the server"""
        print(f"Updating slot {slot_id} status: {'Occupied' if is_occupied else 'Available'}")
        try:
            response = requests.post(
                f"{API_BASE_URL}/iot/update-slot",
                json={
                    "slot_id": slot_id,
                    "is_occupied": is_occupied
                }
            )
            print(f"Server response: {response.status_code} - {response.json()}")
        except Exception as e:
            print(f"Error updating slot status: {e}")
    
    def check_gate_commands(self):
        """Poll server for gate control commands"""
        try:
            # Check entry gate
            response = requests.get(f"{API_BASE_URL}/iot/gate-status?gate_id=entry")
            data = response.json()
            if data["should_open"] and not self.entry_gate_open:
                self.open_entry_gate(data["open_duration"])
            
            # Check exit gate
            response = requests.get(f"{API_BASE_URL}/iot/gate-status?gate_id=exit")
            data = response.json()
            if data["should_open"] and not self.exit_gate_open:
                self.open_exit_gate(data["open_duration"])
                
        except Exception as e:
            print(f"Error checking gate commands: {e}")
    
    def open_entry_gate(self, duration):
        """Simulate entry gate opening"""
        self.entry_gate_open = True
        print(f"ENTRY GATE OPENING for {duration} seconds")
        
        # In a real system, this would control a servo
        # Here we just simulate the delay and closing
        time.sleep(duration)
        
        self.entry_gate_open = False
        print("ENTRY GATE CLOSED")
    
    def open_exit_gate(self, duration):
        """Simulate exit gate opening"""
        self.exit_gate_open = True
        print(f"EXIT GATE OPENING for {duration} seconds")
        
        # In a real system, this would control a servo
        # Here we just simulate the delay and closing
        time.sleep(duration)
        
        self.exit_gate_open = False
        print("EXIT GATE CLOSED")
    
    def update_lcd_display(self):
        """Simulate updating the LCD display with available slots"""
        try:
            response = requests.get(f"{API_BASE_URL}/slots/status")
            data = response.json()
            
            print("\n--- LCD DISPLAY ---")
            print(f"Total Slots: {data['total']}")
            print(f"Available: {data['available']}")
            print(f"Occupied: {data['occupied']}")
            print("-----------------\n")
        except Exception as e:
            print(f"Error updating LCD: {e}")
    
    def run(self):
        """Main simulation loop"""
        print("Starting Parking IoT Simulator...")
        print("Press Ctrl+C to exit")
        
        try:
            while True:
                # 20% chance of sensor readings changing
                if random.random() < 0.2:
                    self.simulate_sensor_readings()
                
                # Check for gate commands
                self.check_gate_commands()
                
                # Update LCD display
                self.update_lcd_display()
                
                # Wait for next cycle
                time.sleep(5)
        except KeyboardInterrupt:
            print("Simulator stopped")

if __name__ == "__main__":
    simulator = ParkingIoTSimulator()
    simulator.run()