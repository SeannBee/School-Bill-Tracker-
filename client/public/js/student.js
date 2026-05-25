// Get student ID from URL
const urlParams = new URLSearchParams(window.location.search);
const studentId = urlParams.get('studentId');

// Fetch actual data from your Node/MongoDB backend
async function fetchStudentBills() {
    if (!studentId) return;
    
    try {
        // Change the port to match whatever your Express server is running on
        const response = await fetch(`http://localhost:3000/api/bills/${studentId}`);
        if (!response.ok) throw new Error('Backend rejected the request.');
        
        const bills = await response.json();
        const tableBody = document.querySelector('#billsTable tbody') || document.querySelector('tbody');
        tableBody.innerHTML = ''; 

        bills.forEach(bill => {
            const row = document.createElement('tr');
            
            // Map these to whatever your actual MongoDB document properties are named
            row.innerHTML = `
                <td>${bill.description || bill.name}</td>
                <td>₱${parseFloat(bill.amount).toFixed(2)}</td>
                <td>${new Date(bill.dueDate).toLocaleDateString()}</td>
                <td>
                    <span class="badge ${getBadgeClass(bill.status)}">
                        ${bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Failed to load database records:", error);
    }
}

function getBadgeClass(status) {
    switch(status?.toLowerCase()) {
        case 'paid': return 'bg-success';
        case 'pending': return 'bg-warning';
        case 'overdue': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (!sessionStorage.getItem('userRole') || sessionStorage.getItem('userRole') !== 'student') {
        window.location.href = 'login.html';
        return;
    }

    const currentStudent = JSON.parse(sessionStorage.getItem('currentStudent') || '{}');
    document.getElementById('studentName').textContent = currentStudent.name || '';
    
    // Call the single source of truth
    fetchStudentBills();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }
});