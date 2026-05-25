document.addEventListener('DOMContentLoaded', function() {
    const billsTableBody = document.getElementById('billsTableBody');
    const saveBillBtn = document.getElementById('saveBillBtn');
    const saveEditBillBtn = document.getElementById('saveEditBillBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    let selectedRow = null;
    let selectedBillId = null;
    let allMasterBills = [];

    async function loadBills() {
        try {
            const response = await fetch('http://localhost:5000/api/manage-bills');
            if (!response.ok) throw new Error('Failed to fetch master bills.');

            allMasterBills = await response.json();
            billsTableBody.innerHTML = '';

            allMasterBills.forEach((bill) => {
                const row = document.createElement('tr');
                row.dataset.id = bill._id;

                const name = bill.billName || 'Unnamed Bill';
                const amount = parseFloat(bill.amountDue || 0);
                const expected = parseFloat(bill.expectedAmount || 0);
                const accumulated = parseFloat(bill.accumulatedAmount || 0);
                const dateString = bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A';

                row.innerHTML = `
                    <td>${name}</td>
                    <td>₱${amount.toFixed(2)}</td>
                    <td>${dateString}</td>
                    <td>₱${expected.toFixed(2)}</td>
                    <td>₱${accumulated.toFixed(2)}</td>
                `;

                row.onclick = () => selectRow(row, bill._id);
                billsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Error updating dashboard view:", error);
        }
    }

    function selectRow(row, billId) {
        if (selectedRow) {
            selectedRow.classList.remove('selected-row');
        }
        row.classList.add('selected-row');
        selectedRow = row;
        selectedBillId = billId;
    }

    saveBillBtn.addEventListener('click', async function(event) {
        event.preventDefault();
        const billName = document.getElementById('billName').value.trim();
        const billAmount = parseFloat(document.getElementById('billAmount').value);
        const dueDate = document.getElementById('dueDate').value;
        const targetYearElem = document.getElementById('targetYear');
        const targetYear = targetYearElem ? targetYearElem.value : "Everyone";

        if (!billName || isNaN(billAmount) || !dueDate) {
            alert('Please fill in all fields with valid values.');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/manage-bills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: billName, amount: billAmount, dueDate: dueDate, targetYear: targetYear })
            });

            if (!response.ok) throw new Error('Backend rejection.');

            const modalElem = document.getElementById('addBillModal');
            if (modalElem) {
                const modalInstance = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
                modalInstance.hide();
            }
            document.getElementById('newBillForm').reset();

            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            await loadBills();
            selectedRow = null;
            selectedBillId = null;
        } catch (error) {
            alert("Could not save bill.");
        }
    });

    window.editBill = function() {
        if (!selectedBillId) {
            alert('Please click on a bill in the table to select it first.');
            return;
        }

        const bill = allMasterBills.find(b => b._id === selectedBillId);
        if (!bill) return;

        document.getElementById('editBillName').value = bill.billName || '';
        document.getElementById('editBillAmount').value = bill.amountDue || '';

        let dDate = bill.dueDate || '';
        if (dDate.includes('T')) dDate = dDate.split('T')[0];
        document.getElementById('editDueDate').value = dDate;

        const targetYearElem = document.getElementById('editTargetYear');
        if (targetYearElem) targetYearElem.value = bill.targetYear || 'Everyone';

        new bootstrap.Modal(document.getElementById('editBillModal')).show();
    };

    saveEditBillBtn.addEventListener('click', async function() {
        if (!selectedBillId) return;

        const name = document.getElementById('editBillName').value.trim();
        const amount = parseFloat(document.getElementById('editBillAmount').value);
        const dueDate = document.getElementById('editDueDate').value;
        const targetYearElem = document.getElementById('editTargetYear');
        const targetYear = targetYearElem ? targetYearElem.value : "Everyone";

        try {
            const response = await fetch(`http://localhost:5000/api/manage-bills/${selectedBillId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, amount, dueDate, targetYear })
            });

            if (!response.ok) throw new Error("Failed to update database.");

            const editModalElem = document.getElementById('editBillModal');
            if (editModalElem) {
                const modalInstance = bootstrap.Modal.getInstance(editModalElem) || new bootstrap.Modal(editModalElem);
                modalInstance.hide();
            }

            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            await loadBills();
            selectedRow = null;
            selectedBillId = null;
        } catch (error) {
            console.error(error);
            alert("Failed to save changes.");
        }
    });

    window.deleteBill = function() {
        if (!selectedBillId) {
            alert('Please click on a bill in the table to select it first.');
            return;
        }
        new bootstrap.Modal(document.getElementById('deleteBillModal')).show();
    };

    confirmDeleteBtn.addEventListener('click', async function() {
        if (!selectedBillId) return;

        try {
            const response = await fetch(`http://localhost:5000/api/manage-bills/${selectedBillId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error("Failed to delete from database.");

            const deleteModalElem = document.getElementById('deleteBillModal');
            if (deleteModalElem) {
                const modalInstance = bootstrap.Modal.getInstance(deleteModalElem) || new bootstrap.Modal(deleteModalElem);
                modalInstance.hide();
            }

            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            await loadBills();
            selectedRow = null;
            selectedBillId = null;
        } catch (error) {
            console.error(error);
            alert("Failed to delete bill.");
        }
    });

    const notifyPendingBtn = document.getElementById('notifyPendingBtn');
if (notifyPendingBtn) {
    notifyPendingBtn.addEventListener('click', async function() {
        if (!selectedBillId) {
            alert('Select a bill from the table first.');
            return;
        }

        if (!confirm('Are you absolutely sure? This is going to blast a live email to every single student who hasn\'t paid.')) {
            return;
        }

        const originalText = notifyPendingBtn.textContent;
        notifyPendingBtn.textContent = 'Dispatching...';
        notifyPendingBtn.disabled = true;

        try {
            const response = await fetch(`http://localhost:5000/api/notify-pending/${selectedBillId}`, {
                method: 'POST'
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'The dispatcher jammed.');

            alert(data.message);
        } catch (error) {
            console.error("[DISPATCHER UI ERROR]:", error);
            alert(error.message);
        } finally {
            notifyPendingBtn.textContent = originalText;
            notifyPendingBtn.disabled = false;
        }
    });
}
    loadBills();
});