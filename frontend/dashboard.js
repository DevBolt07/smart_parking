// dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    // Check for authentication
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "auth.html";
      return;
    }
  
    // Initialize dashboard data
    fetchUserData();
    fetchSlotsStatus();
    fetchActiveBooking();
    fetchBookingHistory();
  
    // Setup tab navigation
    setupTabs();
  
    // Setup button event listeners
    document.getElementById("logoutBtn").addEventListener("click", handleLogout);
    document.getElementById("bookSlotBtn").addEventListener("click", handleBookSlot);
    document.getElementById("entryGateBtn").addEventListener("click", handleEntryGate);
    document.getElementById("exitGateBtn").addEventListener("click", handleExitGate);
    document.getElementById("completePaymentBtn").addEventListener("click", handlePayment);
  
    // Setup modal close buttons
    setupModalClosers();
  
    // Periodically refresh data
    setInterval(fetchSlotsStatus, 30000); // Every 30 seconds
    setInterval(fetchActiveBooking, 60000); // Every minute
  });
  
  // ------------------------------
  // DASHBOARD INITIALIZATION
  // ------------------------------
  
  async function fetchUserData() {
    try {
      const response = await fetch("http://localhost:5000/api/user/me", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      
      document.getElementById("userName").textContent = data.name;
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }
  
  async function fetchSlotsStatus() {
    try {
      // Fetch parking availability stats
      const statsResponse = await fetch("http://localhost:5000/api/slots/status", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const statsData = await statsResponse.json();
      
      // Update status display
      document.getElementById("totalSlots").textContent = statsData.total;
      document.getElementById("availableSlots").textContent = statsData.available;
      document.getElementById("occupiedSlots").textContent = statsData.occupied;
      
      // Fetch individual slot details
      const slotsResponse = await fetch("http://localhost:5000/api/slots", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const slotsData = await slotsResponse.json();
      
      // Render slots grid
      renderSlotsGrid(slotsData.slots);
    } catch (error) {
      console.error("Error fetching slots data:", error);
    }
  }
  
  function renderSlotsGrid(slots) {
    const grid = document.getElementById("slotsGrid");
    grid.innerHTML = "";
    
    slots.forEach(slot => {
      const slotCard = document.createElement("div");
      slotCard.className = `slot-card ${slot.status}`;
      slotCard.innerHTML = `
        <p>Slot ${slot.id}</p>
        <p class="status">${slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}</p>
      `;
      grid.appendChild(slotCard);
    });
  }
  
  let activeBookingTimer = null;

  async function fetchActiveBooking() {
    try {
      const response = await fetch("http://localhost:5000/api/bookings/active", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
  
      if (response.status === 404) {
        document.getElementById("noActiveBooking").style.display = "block";
        document.getElementById("activeBookingDetails").style.display = "none";
        clearInterval(activeBookingTimer);
        return;
      }
  
      const data = await response.json();
      document.getElementById("noActiveBooking").style.display = "none";
      document.getElementById("activeBookingDetails").style.display = "block";
  
      // Set booking details
      document.getElementById("activeSlotId").textContent = data.slot_id;
      document.getElementById("activeEntryTime").textContent = data.entry_time;
      document.getElementById("activeDeposit").textContent = `₹${data.deposit}`;
  
      // Update duration every minute
      if (activeBookingTimer) clearInterval(activeBookingTimer);
      activeBookingTimer = setInterval(() => {
        const entryTime = new Date(data.entry_time);
        const now = new Date();
        const durationMins = Math.floor((now - entryTime) / 60000);
        document.getElementById("activeDuration").textContent = `${durationMins} mins`;
        document.getElementById("activeCharge").textContent = `₹${durationMins}`;
      }, 60000);
  
      // Also immediately update
      const entryTime = new Date(data.entry_time);
      const now = new Date();
      const durationMins = Math.floor((now - entryTime) / 60000);
      document.getElementById("activeDuration").textContent = `${durationMins} mins`;
      document.getElementById("activeCharge").textContent = `₹${durationMins}`;
  
    } catch (error) {
      console.error("Error fetching active booking:", error);
      clearInterval(activeBookingTimer);
    }
  }
  
  
  async function fetchBookingHistory() {
    try {
      const response = await fetch("http://localhost:5000/api/bookings/history", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      
      const tbody = document.querySelector("#historyTable tbody");
      tbody.innerHTML = "";
      
      data.bookings.forEach(booking => {
        const tr = document.createElement("tr");
        
        // Format the date
        const date = new Date(booking.entry_time);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        // Calculate duration
        let duration = "In progress";
        if (booking.exit_time) {
          duration = `${booking.duration_mins} mins`;
        }
        
        tr.innerHTML = `
          <td>${formattedDate}</td>
          <td>Slot ${booking.slot_id}</td>
          <td>${duration}</td>
          <td>₹${booking.amount}</td>
          <td><button class="view-receipt" data-booking="${booking.booking_id}">Receipt</button></td>
        `;
        tbody.appendChild(tr);
      });
      
      // Add event listeners for receipt buttons
      document.querySelectorAll(".view-receipt").forEach(btn => {
        btn.addEventListener("click", () => showReceipt(btn.dataset.booking));
      });
    } catch (error) {
      console.error("Error fetching booking history:", error);
    }
  }
  
  // ------------------------------
  // EVENT HANDLERS
  // ------------------------------
  
  function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    tabButtons.forEach(button => {
      button.addEventListener("click", () => {
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove("active"));
        tabContents.forEach(content => content.classList.remove("active"));
        
        // Add active class to current button and content
        button.classList.add("active");
        const tabId = button.dataset.tab;
        document.getElementById(tabId).classList.add("active");
      });
    });
  }
  
  function setupModalClosers() {
    // Setup modal close functionality
    document.querySelectorAll(".close-btn, #closeReceiptBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".modal").forEach(modal => {
          modal.style.display = "none";
        });
      });
    });
  }
  
  function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "auth.html";
  }
  
  async function handleBookSlot() {
    try {
      const response = await fetch("http://localhost:5000/api/book", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // If booking is successful, show payment modal
        document.getElementById("paymentAmount").textContent = "₹100";
        document.getElementById("paymentPurpose").textContent = "Booking Deposit";
        document.getElementById("paymentModal").style.display = "block";
      } else {
        alert(data.message || "Failed to book slot");
      }
      
      // Refresh slot data
      fetchSlotsStatus();
    } catch (error) {
      console.error("Error booking slot:", error);
      alert("Error booking slot. Please try again.");
    }
  }
  
  async function handleEntryGate() {
    try {
      const response = await fetch("http://localhost:5000/api/entry-gate", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      const data = await response.json();
      alert(data.message || "Entry gate triggered");
    } catch (error) {
      console.error("Error triggering entry gate:", error);
      alert("Error triggering entry gate. Please try again.");
    }
  }
  
  async function handleExitGate() {
    try {
      const response = await fetch("http://localhost:5000/api/exit-gate", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Show payment modal with exit fee
        document.getElementById("paymentAmount").textContent = `₹${data.fee}`;
        document.getElementById("paymentPurpose").textContent = "Parking Fee";
        document.getElementById("paymentModal").style.display = "block";
      } else {
        alert(data.message || "Failed to trigger exit gate");
      }
      
      // Refresh data
      fetchSlotsStatus();
      fetchActiveBooking();
    } catch (error) {
      console.error("Error triggering exit gate:", error);
      alert("Error triggering exit gate. Please try again.");
    }
  }
  
  async function handlePayment() {
    try {
      // In real app: open Razorpay checkout instead of fake form
      const paymentAmount = document.getElementById("paymentAmount").textContent.replace("₹", "");
      const paymentPurpose = document.getElementById("paymentPurpose").textContent;
  
      // Send payment details to backend to initiate Razorpay Order
      const response = await fetch("http://localhost:5000/api/payment/start", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ amount: paymentAmount, purpose: paymentPurpose })
      });
  
      const data = await response.json();
      
      if (data.orderId) {
        alert(`Payment initiated. (Simulating payment for now)`);
        
        // Here real Razorpay checkout flow would start
        // For now we simulate payment immediately
        await verifyPayment(paymentAmount, paymentPurpose);
      } else {
        alert("Payment initiation failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during payment process:", error);
      alert("Error processing payment. Please try again.");
    }
  }
  
  async function verifyPayment(amount, purpose) {
    try {
      const response = await fetch("http://localhost:5000/api/payment/verify", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ amount, purpose })
      });
  
      const data = await response.json();
  
      if (data.verified) {
        document.getElementById("paymentModal").style.display = "none";
        showPaymentReceipt(purpose);
        fetchSlotsStatus();
        fetchActiveBooking();
        fetchBookingHistory();
      } else {
        alert("Payment verification failed. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert("Error verifying payment. Please try again.");
    }
  }
  
  
  function showPaymentReceipt(purpose) {
    const receiptContent = document.querySelector("#receiptContent .receipt-details");
    
    // Get current date and time
    const now = new Date();
    const dateString = now.toLocaleDateString();
    const timeString = now.toLocaleTimeString();
    
    document.getElementById("receiptType").textContent = purpose === "Booking Deposit"
      ? "Booking Receipt" : "Payment Receipt";
    
    receiptContent.innerHTML = `
      <div class="detail-row">
        <span>Date:</span>
        <span>${dateString}</span>
      </div>
      <div class="detail-row">
        <span>Time:</span>
        <span>${timeString}</span>
      </div>
      <div class="detail-row">
        <span>Purpose:</span>
        <span>${purpose}</span>
      </div>
      <div class="detail-row">
        <span>Amount:</span>
        <span>${document.getElementById("paymentAmount").textContent}</span>
      </div>
      <div class="detail-row">
        <span>Status:</span>
        <span>Paid</span>
      </div>
    `;
    
    document.getElementById("receiptModal").style.display = "block";
  }
  
  function showReceipt(bookingId) {
    // In a real app, you'd fetch the specific booking details
    // Here we're just simulating a receipt display
    const receiptContent = document.querySelector("#receiptContent .receipt-details");
    
    document.getElementById("receiptType").textContent = "Booking Receipt";
    
    receiptContent.innerHTML = `
      <div class="detail-row">
        <span>Booking ID:</span>
        <span>${bookingId}</span>
      </div>
      <div class="detail-row">
        <span>Date:</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
      <div class="detail-row">
        <span>Amount:</span>
        <span>₹100</span>
      </div>
      <div class="detail-row">
        <span>Status:</span>
        <span>Paid</span>
      </div>
    `;
    
    document.getElementById("receiptModal").style.display = "block";
  }