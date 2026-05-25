document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.querySelector('#paymentTable tbody') || document.querySelector('tbody');
    const searchInput = document.getElementById('searchInput');
    let allStudents = [];

    // --- MAIN DASHBOARD LOAD ---
    async function loadStudentsFromDatabase() {
        try {
            const response = await fetch('http://localhost:5000/api/students');
            if (!response.ok) throw new Error('Backend rejected the request.');
            
            allStudents = await response.json();
            renderTable(allStudents);
            updateModalDropdown(); 
        } catch (error) {
            console.error("Failed to load student records:", error);
        }
    }

    function renderTable(data) {
        // Find the main table element
        const table = document.querySelector('table');
        if (!table) {
            console.error("[UI ERROR] Could not find any table on the screen!");
            return;
        }

        // Look for a tbody. If your lazy HTML doesn't have one, forge one to protect the headers.
        let tBody = table.querySelector('tbody');
        if (!tBody) {
            console.warn("[UI WARNING] No <tbody> found! Forging one automatically.");
            tBody = document.createElement('tbody');
            table.appendChild(tBody);
        }

        // Clear out the old rows
        tBody.innerHTML = ''; 
        
        data.forEach((student) => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            
            // Re-attach the click router so you can still edit their bills
            tr.onclick = () => routeToStudentBills(student);

            const studentName = student.Name || student.name || 'Unknown';
            const studentId = student['Student ID'] || student.studentId || student.id || 'N/A';
            const yearLevel = student['Year level'] || student.yearLevel || student['Year Level'] || 'N/A';

            tr.innerHTML = `
                <td>${studentName}</td>
                <td>${studentId}</td>
                <td>${yearLevel}</td>
            `;
            tBody.appendChild(tr);
        });
    }

    function routeToStudentBills(student) {
        const targetId = student['Student ID'] || student.studentId || student.id || student._id;
        if (!targetId) return;
        window.location.href = `paymentdetailsedit.html?studentId=${targetId}`;
    }

    // --- STUDENT MANAGEMENT MODAL LOGIC ---
    
    // Bulletproof native DOM search for your Edit List button
    document.querySelectorAll('button, .btn, a').forEach(el => {
        const text = el.textContent.trim().toLowerCase();
        if(text === 'edit list' || text === 'edit lists') {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                new bootstrap.Modal(document.getElementById('manageStudentModal')).show();
            });
        }
    });

    const actionSelect = document.getElementById('modalActionSelect');
    const nameInput = document.getElementById('modalStudentName');
    const idInput = document.getElementById('modalStudentId');
    const yearSelect = document.getElementById('modalYearLevel');
    const saveBtn = document.getElementById('modalSaveBtn');
    const deleteBtn = document.getElementById('modalDeleteBtn');

    function updateModalDropdown() {
        if (!actionSelect) return;
        actionSelect.innerHTML = '<option value="new">-- ✨ Add New Student --</option>';
        allStudents.forEach(student => {
            const sName = student.Name || student.name || 'Unknown';
            const sId = student['Student ID'] || student.studentId || student.id || student._id;
            const opt = document.createElement('option');
            opt.value = sId;
            opt.textContent = `${sId} - ${sName}`;
            actionSelect.appendChild(opt);
        });
    }

    if (actionSelect) {
        actionSelect.addEventListener('change', function() {
            if (this.value === 'new') {
                nameInput.value = '';
                idInput.value = '';
                yearSelect.selectedIndex = 0;
                if(deleteBtn) deleteBtn.style.display = 'none';
            } else {
                const targetId = this.value;
                const student = allStudents.find(s => (s['Student ID'] || s.studentId || s.id || s._id) == targetId);
                if (student) {
                    nameInput.value = student.Name || student.name || '';
                    idInput.value = student['Student ID'] || student.studentId || student.id || '';
                    
                    const yLevel = student['Year level'] || student.yearLevel || student['Year Level'] || '';
                    Array.from(yearSelect.options).forEach(opt => {
                        if(opt.value === yLevel) opt.selected = true;
                    });
                    
                    if(deleteBtn) deleteBtn.style.display = 'block'; 
                }
            }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            const selectedAction = actionSelect.value;
            const payload = {
                name: nameInput.value.trim(),
                studentId: idInput.value.trim(),
                yearLevel: yearSelect.value
            };

            if (!payload.name || !payload.studentId) {
                alert("Please fill in all fields.");
                return;
            }

            try {
                let response;
                if (selectedAction === 'new') {
                    response = await fetch('http://localhost:5000/api/students', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    response = await fetch(`http://localhost:5000/api/students/${selectedAction}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: payload.name, newStudentId: payload.studentId, yearLevel: payload.yearLevel })
                    });
                }

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Database failure");
                }

                closeModalBulletproof('manageStudentModal');
                await loadStudentsFromDatabase();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            const targetId = actionSelect.value;
            if (targetId === 'new') return;

            if (confirm("Are you absolutely sure? This will permanently delete the student AND all their bills!")) {
                try {
                    const response = await fetch(`http://localhost:5000/api/students/${targetId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) throw new Error("Database deletion failed.");

                    closeModalBulletproof('manageStudentModal');
                    await loadStudentsFromDatabase();
                } catch (error) {
                    alert(error.message);
                }
            }
        });
    }

    function closeModalBulletproof(modalId) {
        const modalElem = document.getElementById(modalId);
        if (modalElem) {
            const modalInstance = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
            modalInstance.hide();
        }
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    // --- SEARCH AND LOGOUT UTILS ---
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const filtered = allStudents.filter(s => {
                const sName = (s.Name || s.name || '').toLowerCase();
                const sId = String(s['Student ID'] || s.studentId || s.id || '').toLowerCase();
                return sName.includes(term) || sId.includes(term);
            });
            renderTable(filtered);
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Going to home page will log you out. Do you want to continue?')) {
                sessionStorage.clear();
                window.location.href = '../index.html'; 
            }
        });
    }

    // Start engine
    loadStudentsFromDatabase();
});