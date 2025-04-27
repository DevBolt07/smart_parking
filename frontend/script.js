// script.js - Updated to match HTML structure

// ---------------------------
// LOGIN & REGISTER FORM LOGIC
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector("input[type=email]").value;
      const password = loginForm.querySelector("input[type=password]").value;

      try {
        const res = await fetch("http://localhost:5000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
          window.location.href = "dashboard.html";
        } else {
          alert("Login failed: " + (data.message || "Invalid credentials"));
        }
      } catch (error) {
        console.error("Login error:", error);
        alert("Login failed. Please check your network connection and try again.");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formInputs = registerForm.querySelectorAll("input");
      const payload = {
        name: formInputs[0].value,
        email: formInputs[1].value,
        mobile: formInputs[2].value,
        vehicle: formInputs[3].value,
        password: formInputs[4].value
      };

      try {
        const res = await fetch("http://localhost:5000/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          alert("Registration successful! Please login with your credentials.");
          // Clear the form
          registerForm.reset();
          // Focus on the login form's email field if it exists
          const loginEmail = document.querySelector("#loginForm input[type=email]");
          if (loginEmail) loginEmail.focus();
        } else {
          alert("Registration failed: " + (data.message || "Please try again."));
        }
      } catch (error) {
        console.error("Registration error:", error);
        alert("Registration failed. Please check your network connection and try again.");
      }
    });
  }

  // Handle "Enter" key in inputs to submit the appropriate form
  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        // Find the parent form and submit it
        const form = this.closest("form");
        if (form) {
          form.dispatchEvent(new Event("submit"));
        }
      }
    });
  });
});