// admin.js

document.addEventListener("DOMContentLoaded", () => {
    // Authentication check (token)
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "auth.html"; // redirect to login if not logged in
      return;
    }
  
    // Initialize Admin Panel
    fetchSlots();
    fetchUsers();
    fetchBookings();
    setupTabs();
  
    document.getElementById("adminLogoutBtn").addEventListener("click", () => {
      localStorage.removeItem("token");
      window.location.href = "auth.html";
    });
  });
  
  async function fetchSlots() {
    try {
      const response = await fetch("http://localhost:5000/api/admin/slots", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      renderSlots(data.slots);
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  }
  
  function renderSlots(slots) {
    const grid = document.getElementById("adminSlotsGrid");
    grid.innerHTML = "";
  
    slots.forEach(slot => {
      const slotCard = document.createElement("div");
      slotCard.className = `slot-card ${slot.status}`;
      slotCard.innerHTML = `
        <p>Slot ${slot.id}</p>
        <p class="status">${slot.status.toUpperCase()}</p>
        <button class="action-btn" onclick="toggleSlot('${slot.id}', '${slot.status}')">
          ${slot.status === "blocked" ? "Unblock" : "Block"}
        </button>
      `;
      grid.appendChild(slotCard);
    });
  }
  
  async function toggleSlot(slotId, currentStatus) {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/slots/${slotId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ action: currentStatus === "blocked" ? "unblock" : "block" })
      });
      const data = await response.json();
      alert(data.message || "Slot status updated");
      fetchSlots();
    } catch (error) {
      console.error("Error toggling slot:", error);
    }
  }
  
  async function fetchUsers() {
    try {
      const response = await fetch("http://localhost:5000/api/admin/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      renderUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }
  
  function renderUsers(users) {
    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = "";
    users.forEach(user => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.mobile}</td>
        <td>${user.vehicle}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  async function fetchBookings() {
    try {
      const response = await fetch("http://localhost:5000/api/admin/bookings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      renderBookings(data.bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  }
  
  function renderBookings(bookings) {
    const tbody = document.querySelector("#bookingsTable tbody");
    tbody.innerHTML = "";
    bookings.forEach(booking => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>Slot ${booking.slot_id}</td>
        <td>${booking.user_name}</td>
        <td>${new Date(booking.entry_time).toLocaleString()}</td>
        <td>${booking.exit_time ? new Date(booking.exit_time).toLocaleString() : "In Progress"}</td>
        <td>₹${booking.amount}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
  
    tabButtons.forEach(button => {
      button.addEventListener("click", () => {
        tabButtons.forEach(btn => btn.classList.remove("active"));
        tabContents.forEach(content => content.classList.remove("active"));
  
        button.classList.add("active");
        document.getElementById(button.dataset.tab).classList.add("active");
      });
    });
  }
  