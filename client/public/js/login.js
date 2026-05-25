document.addEventListener('DOMContentLoaded', function () {
    
    // Converted to async so we can pause and wait for the database
    async function login() {
        const studentIdInput = document.getElementById('studentId');
        const passwordInput = document.getElementById('adminPassword');

        if (!studentIdInput || !passwordInput) {
            alert("Critical Error: Login fields not found in the HTML.");
            return;
        }

        const id = studentIdInput.value.trim();
        const password = passwordInput.value.trim();

        if (!id || !password) {
            alert("Don't leave the fields blank.");
            return;
        }

        // Keep the hardcoded admin backdoor for now
        if (id === 'admin' && password === 'admin') {
            window.location.href = 'admin.html';
            return;
        }

        try {
            // Ask the database if this student actually exists
            const response = await fetch(`http://localhost:5000/api/students/${id}`);
            
            if (response.ok) {
                // The database found them
                if (password === 'ubian2022') { 
                    console.log("[LOGIN] Authentication successful. Saving session state...");
                    
                    // Inject the ID into session storage so the dashboard can read it
                    sessionStorage.setItem('loggedInStudentId', id);
                    
                    // Redirect to the personal student dashboard
                    window.location.href = 'paymentdetails.html';
                } else {
                    alert('Invalid password. Please try again.');
                    passwordInput.value = '';
                }
            } else if (response.status === 404) {
                alert('That Student ID does not exist in the database. Try again.');
                passwordInput.value = '';
            } else {
                throw new Error('Server returned an unexpected error code.');
            }
        } catch (error) {
            console.error("[LOGIN ERROR]:", error);
            alert("Cannot connect to the authentication server. Is your backend actually running?");
        }
    }

    // Form submission handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Stop the page from reloading natively
            login();
        });
    }

    // Password visibility toggle (Untouched because it actually worked)
    const toggleBtn = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('adminPassword');
    const toggleIcon = document.getElementById('toggleIcon');

    if (toggleBtn && passwordInput && toggleIcon) {
        toggleBtn.addEventListener('click', function () {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
                this.setAttribute('aria-label', 'Hide password');
            } else {
                passwordInput.type = 'password';
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
                this.setAttribute('aria-label', 'Show password');
            }
        });
    }
});