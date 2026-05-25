document.addEventListener('DOMContentLoaded', async function() {
    // Find out who is logged in.
    const urlParams = new URLSearchParams(window.location.search);
    let studentId = sessionStorage.getItem('loggedInStudentId') || localStorage.getItem('studentId') || urlParams.get('studentId');

    if (!studentId) {
        console.warn("No student ID found in session. Forcing a fallback for testing purposes.");
        studentId = "2201884"; // Fallback to your ID for testing
    }

    const tableBody = document.querySelector('tbody');
    const studentNameElement = document.getElementById('studentName');

    async function loadStudentProfile() {
        try {
            const response = await fetch(`http://localhost:5000/api/students/${studentId}`);
            if (response.ok) {
                const student = await response.json();
                if (studentNameElement) {
                    studentNameElement.textContent = student.Name || student.name || 'Unknown Student';
                }
            }
        } catch (error) {
            console.error("Could not load student profile:", error);
        }
    }

    async function loadBills() {
        try {
            const response = await fetch(`http://localhost:5000/api/bills/${studentId}`);
            if (!response.ok) throw new Error('Backend rejected the request.');

            const bills = await response.json();
            tableBody.innerHTML = '';

            if (bills.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No bills found for this student.</td></tr>';
                return;
            }

            bills.forEach((bill) => {
                const row = document.createElement('tr');
                const amount = parseFloat(bill.amountDue || 0);
                const status = bill.status || 'pending';
                const dateString = bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A';
                const name = bill.billName || 'Unnamed Bill';

                row.innerHTML = `
                    <td>${name}</td>
                    <td>₱${amount.toFixed(2)}</td>
                    <td>${dateString}</td>
                    <td>
                        <span class="badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Failed to fetch student bills:", error);
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading bills. Is the server running?</td></tr>';
        }
    }

    await loadStudentProfile();
    await loadBills();
});