document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId');

    if (!studentId) {
        alert("Critical Error: No student ID provided in the URL.");
        return;
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
                        <select class="form-select status-select status-${status}" 
                                data-bill-id="${bill._id}" 
                                data-global-id="${bill.globalBillId}"
                                data-amount="${amount}">
                            <option value="paid" ${status === 'paid' ? 'selected' : ''}>Paid</option>
                            <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="overdue" ${status === 'overdue' ? 'selected' : ''}>Overdue</option>
                        </select>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            attachDropdownListeners();
        } catch (error) {
            console.error("Failed to fetch student bills:", error);
        }
    }

    function attachDropdownListeners() {
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async function() {
                const billId = this.dataset.billId;
                const globalBillId = this.dataset.globalId;
                const amountDue = this.dataset.amount;
                const newStatus = this.value;

                // Visually update the class immediately for UI feedback
                this.className = `form-select status-select status-${newStatus}`;

                try {
                    const response = await fetch(`http://localhost:5000/api/bills/${billId}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus, globalBillId, amountDue })
                    });

                    if (!response.ok) throw new Error("Failed to save to database");
                    console.log(`Successfully updated bill ${billId} to ${newStatus}`);
                } catch (error) {
                    console.error("Network transaction failed:", error);
                    alert("Failed to update status on the server. Refresh the page.");
                }
            });
        });
    }

    await loadStudentProfile();
    await loadBills();
});