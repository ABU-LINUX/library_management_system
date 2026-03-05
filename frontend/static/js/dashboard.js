document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardData();

    // Modal Elements
    const modal = document.getElementById('seatModal');
    const closeBtn = document.querySelector('.close-btn');
    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (e) => {
        if (e.target == modal) {
            modal.style.display = "none";
        }
    }
});

let cachedSeats = [];

function fetchDashboardData() {
    fetch('/api/seats/?_=' + new Date().getTime())
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                cachedSeats = data.data;
                renderDashboard(data.data);
            } else {
                showToast(data.message || "Failed to load data", "error");
            }
        })
        .catch(err => showToast("Connection error: " + err, "error"));
}

// ---- UI Upgrades: Toast Notifications & Search ----
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    // Styling the modern toast
    toast.style.padding = '16px 24px';
    toast.style.borderRadius = '8px';
    toast.style.color = 'white';
    toast.style.fontWeight = '600';
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    toast.innerText = message;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Auto dismiss after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function searchStudent() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query) {
        showToast("Cleared search.", "success");
        renderDashboard(cachedSeats);
        return;
    }

    const matchedSeats = cachedSeats.filter(s => {
        if (!s.is_occupied) return false;
        return s.student_name.toLowerCase().includes(query) || s.mobile.includes(query);
    });

    if (matchedSeats.length === 0) {
        showToast("No student found matching query.", "error");
    } else {
        if (matchedSeats.length === 1) {
            openSeatModal(matchedSeats[0].seat_number);
        }
        renderDashboard(matchedSeats);
    }
}
// ----------------------------------------------------

function renderDashboard(seats) {
    console.log("renderDashboard called with seats:", seats);
    const grid = document.getElementById('seat_grid');
    grid.innerHTML = '';

    let occupiedCount = 0;
    let totalDues = 0;
    let totalStudents = 0;

    const actionList = document.getElementById('action_list_items');
    actionList.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    seats.forEach(seat => {
        const div = document.createElement('div');
        div.className = 'seat';
        div.innerText = seat.seat_number;

        let statusClass = 'green'; // Vacant
        let needsAction = false;

        if (seat.is_occupied) {
            occupiedCount++;
            totalStudents++; // Usually the same, but kept separate
            totalDues += parseFloat(seat.pending_balance || 0);

            // Check dates
            if (seat.end_date) {
                const endDate = new Date(seat.end_date);
                const diffTime = endDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 3 && diffDays >= 0) {
                    statusClass = 'yellow'; // Expiring soon
                    needsAction = true;
                } else if (diffDays < 0) {
                    statusClass = 'red'; // Expired / Needs action
                    needsAction = true;
                } else {
                    statusClass = 'red'; // Occupied
                }

                if (parseFloat(seat.pending_balance) > 0) {
                    needsAction = true; // Dues pending
                }

                if (needsAction) {
                    // Add to today's action list
                    const warningText = (diffDays <= 3) ? `(Exp: ${seat.end_date})` : `(Due: ₹${seat.pending_balance})`;
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>Seat ${seat.seat_number}: ${seat.student_name} <strong style="color:var(--pending)">${warningText}</strong></span>
                        <button class="btn-secondary" style="padding: 6px 14px; font-size: 13px;" onclick="openSeatModal(${seat.seat_number})">Manage</button>
                    `;
                    actionList.appendChild(li);
                }
            } else {
                statusClass = 'red';
            }

            // Purple border logic
            if (parseFloat(seat.pending_balance) > 0) {
                div.classList.add('purple-border');
            }
        }

        div.classList.add(statusClass);
        div.onclick = () => openSeatModal(seat.seat_number);
        grid.appendChild(div);
    });

    // Update Top Metrics
    document.getElementById('total_students').innerText = totalStudents;
    document.getElementById('seats_ratio').innerText = `${occupiedCount}/81`;
    document.getElementById('total_dues').innerText = totalDues.toFixed(2);
}

function showPendingDues() {
    const listBody = document.getElementById('dues_list_body');
    const modalTotal = document.getElementById('dues_modal_total');
    listBody.innerHTML = '';

    let sumDues = 0;
    const duesSeats = cachedSeats.filter(s => s.is_occupied && parseFloat(s.pending_balance) > 0);

    if (duesSeats.length === 0) {
        listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No pending dues!</td></tr>';
    } else {
        duesSeats.forEach(seat => {
            sumDues += parseFloat(seat.pending_balance);
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';
            tr.innerHTML = `
                <td style="padding: 12px;"><strong>${seat.seat_number}</strong></td>
                <td style="padding: 12px;">${seat.student_name}</td>
                <td style="padding: 12px;">${seat.mobile}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: var(--pending);">₹${seat.pending_balance}</td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 13px;" onclick="document.getElementById('duesModal').style.display='none'; openSeatModal(${seat.seat_number})">Manage</button>
                </td>
            `;
            listBody.appendChild(tr);
        });
    }

    modalTotal.innerText = sumDues.toFixed(2);
    document.getElementById('duesModal').style.display = 'block';
}

function openSeatModal(seatNumber) {
    const seat = cachedSeats.find(s => s.seat_number == seatNumber);
    const modal = document.getElementById('seatModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    if (!seat) return;

    if (!seat.is_occupied) {
        title.innerText = `New Registration - Seat ${seatNumber}`;
        body.innerHTML = `
                    <form id="registerForm" class="modern-form">
                        <div id="form_error" style="display: none; color: #ef4444; background: #fee2e2; border: 1px solid #fca5a5; padding: 10px; border-radius: 6px; font-size: 14px; text-align: center; font-weight: 600;"></div>
                        <input type="hidden" id="seat_number" value="${seatNumber}">
                        
                        <div class="form-row">
                            <div class="form-group"><label>Name</label><input type="text" id="name" placeholder="E.g. Rahul Kumar" required></div>
                            <div class="form-group"><label>Mobile</label><input type="text" id="mobile" placeholder="10 digits only" required></div>
                        </div>
                        
                        <div class="form-group"><label>Address</label><input type="text" id="address" placeholder="Enter full address" required></div>
                        
                        <div class="form-group">
                            <label>Exam Prep</label>
                            <div id="exam_prep_checkboxes" class="exam-prep-chips">
                                <label><input type="checkbox" name="exam_prep" value="iit-jee"> IIT-JEE</label>
                                <label><input type="checkbox" name="exam_prep" value="neet"> NEET</label>
                                <label><input type="checkbox" name="exam_prep" value="ssc"> SSC</label>
                                <label><input type="checkbox" name="exam_prep" value="railway"> Railway</label>
                                <label><input type="checkbox" name="exam_prep" value="boards"> Boards</label>
                                <label><input type="checkbox" name="exam_prep" value="upsc/mpsc"> UPSC/MPSC</label>
                                <label><input type="checkbox" name="exam_prep" value="other"> Other</label>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Start Date</label>
                                <input type="date" id="start_date" min="2026-01-01" max="${new Date().toISOString().split('T')[0]}" placeholder="Leave empty for today">
                            </div>
                            <div class="form-group">
                                <label>Duration</label>
                                <select id="duration" onchange="document.getElementById('total_amount').value = (this.value == '90') ? 1900 : 700">
                                    <option value="30">30 Days</option>
                                    <option value="90">90 Days</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group"><label>Total Fee (₹)</label><input type="number" id="total_amount" value="700" required></div>
                            <div class="form-group"><label>Amount Paid (₹)</label><input type="number" id="amount_paid" value="" required></div>
                        </div>
                        
                        <div class="form-group">
                            <label>Payment Mode</label>
                            <select id="payment_mode_reg">
                                <option value="Online">Online</option>
                                <option value="Offline">Offline</option>
                            </select>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-primary full-width" onclick="submitRegistration()">Register Student</button>
                        </div>
                    </form>
            `;
    } else {
        // Calculate subscription plan
        const planLabel = (() => {
            if (seat.start_date && seat.end_date) {
                const start = new Date(seat.start_date);
                const end = new Date(seat.end_date);
                const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
                if (diffDays >= 85) return '90-Day Plan';
                return '30-Day Plan';
            }
            return 'N/A';
        })();

        title.innerText = `Student Profile - Seat ${seatNumber}`;
        body.innerHTML = `
            <div class="profile-card">
                <!-- Highlighted header row -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; padding: 14px 16px; border-radius: 10px; background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid rgba(99,102,241,0.3);">
                    <div>
                        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Seat Number</div>
                        <div style="font-size: 28px; font-weight: 800; color: #f8fafc; font-family: 'Inter', sans-serif;">🪑 ${seatNumber}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">Subscription Plan</div>
                        <span style="display: inline-block; padding: 6px 16px; border-radius: 999px; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; background: ${planLabel === '90-Day Plan' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #10b981, #059669)'}; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${planLabel}</span>
                    </div>
                </div>

                <!-- Student Name Highlight -->
                <div style="padding: 14px 16px; border-radius: 10px; background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08)); border: 1px solid rgba(251,191,36,0.4); text-align: center; margin-bottom: 10px;">
                    <div style="font-size: 10px; color: #fcd34d; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">👤 Student Name</div>
                    <div style="font-size: 20px; font-weight: 800; color: #fbbf24; font-family: 'Inter', sans-serif;">${seat.student_name}</div>
                </div>
                <div class="profile-detail"><span class="detail-label">Mobile</span><span class="detail-value">${seat.mobile}</span></div>
                <div class="profile-detail"><span class="detail-label">Address</span><span class="detail-value">${seat.address || 'N/A'}</span></div>
                <div class="profile-detail"><span class="detail-label">Exam Prep</span><span class="detail-value">${seat.exam_prep || 'N/A'}</span></div>
                <!-- Start / End Date side-by-side highlighted -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 4px 0 8px;">
                    <div style="padding: 12px 14px; border-radius: 10px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.35); text-align: center;">
                        <div style="font-size: 10px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">📅 Start Date</div>
                        <div style="font-size: 15px; font-weight: 700; color: #10b981;">${seat.start_date}</div>
                    </div>
                    <div style="padding: 12px 14px; border-radius: 10px; background: rgba(239,68,68,0.10); border: 1px solid rgba(239,68,68,0.3); text-align: center;">
                        <div style="font-size: 10px; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">🏁 End Date</div>
                        <div style="font-size: 15px; font-weight: 700; color: #ef4444;">${seat.end_date}</div>
                    </div>
                </div>
                <div class="profile-detail"><span class="detail-label">Total Fee</span><span class="detail-value">₹${seat.total_amount}</span></div>
                <div class="profile-detail"><span class="detail-label">Amount Paid</span><span class="detail-value" style="color: var(--vacant); font-weight: 600;">₹${seat.amount_paid}</span></div>
                <div class="profile-detail"><span class="detail-label">Pending Dues</span><span class="detail-value" style="color: ${parseFloat(seat.pending_balance) > 0 ? 'var(--occupied)' : 'var(--vacant)'}; font-weight: 600;">₹${seat.pending_balance}</span></div>
            </div>

            <div class="section-title" style="margin-top: 20px;">💳 Transaction History</div>
            <div id="txn_history_container" style="margin-bottom: 16px; max-height: 220px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg);">
                <div style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 13px;">Loading transactions...</div>
            </div>

            <div class="section-title">Actions</div>
            <div class="profile-actions">
                ${(() => {
                if (seat.end_date) {
                    const endDate = new Date(seat.end_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                    if (diffDays > 3) {
                        return '<button class="btn-secondary full-width" disabled style="opacity: 0.6; cursor: not-allowed;" title="Renewal available 3 days before expiry.">Renew (Locked)</button>';
                    }
                }
                return '<button class="btn-primary full-width" onclick="showRenewDialog(' + seatNumber + ')">Renew Subscription</button>';
            })()}
                <button class="btn-pending full-width" onclick="downloadLastReceipt(${seatNumber})">Download Receipt</button>
            </div>
            
            ${parseFloat(seat.pending_balance) > 0 ? `
            <div class="profile-actions" style="margin-top: 12px; grid-template-columns: 1fr;">
                <button class="btn-success full-width" onclick="showPayDuesDialog(${seatNumber}, ${seat.pending_balance})">Clear Dues (₹${seat.pending_balance})</button>
            </div>` : ''}
            
            <hr class="soft-divider">
            
            <div class="transfer-box">
                <label>Transfer to Vacant Seat #</label>
                <div style="display: flex; gap: 10px;">
                    <input type="number" id="transfer_seat" placeholder="Seat (eg. 45)" min="1" max="81" style="flex: 1;" class="form-control">
                    <button class="btn-warning" style="padding: 10px 20px;" onclick="transferSeat(${seatNumber})">Transfer</button>
                </div>
            </div>

            <hr class="soft-divider">
            <button class="btn-edit full-width" onclick="showEditDialog(${seatNumber})" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; margin-bottom: 8px;">✏️ Edit Student Details</button>
            <button class="btn-danger full-width" onclick="showCancelDialog(${seatNumber})">Cancel Registration</button>
        `;

        // Lazy-load transaction history AFTER HTML is in the DOM
        fetch(`/api/students/${seatNumber}/history`)
            .then(r => r.json())
            .then(res => {
                const container = document.getElementById('txn_history_container');
                if (!container) return;
                if (!res.success || res.data.length === 0) {
                    container.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 13px;">No transactions recorded yet.</div>';
                    return;
                }
                let html = `
                    <div style="padding: 8px 12px; background: var(--primary-bg); border-bottom: 1px solid var(--border); font-size: 12px; font-weight: 600; color: var(--text-secondary); display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px;">
                        <span>#</span><span>Date</span><span>Type</span><span>Amount / Mode</span>
                    </div>`;
                res.data.forEach((tx, idx) => {
                    html += `
                    <div style="padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 13px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; align-items: center;">
                        <span style="color: var(--text-secondary); font-size: 12px;">${idx + 1}</span>
                        <span>${tx.date || '—'}</span>
                        <span style="font-weight: 600; color: ${tx.type === 'Registration' ? 'var(--primary)' : tx.type === 'Renewal' ? 'var(--vacant)' : 'var(--pending)'};">${tx.type || '—'}</span>
                        <span>₹${tx.amount || 0} <small style="color: var(--text-secondary);">(${tx.payment_mode || '—'})</small></span>
                    </div>`;
                });
                html += `<div style="padding: 8px 12px; font-size: 12px; font-weight: 700; text-align: right; color: var(--text-secondary); border-top: 1px solid var(--border);">Total ${res.count} Transaction${res.count !== 1 ? 's' : ''}</div>`;
                container.innerHTML = html;
            })
            .catch(() => {
                const container = document.getElementById('txn_history_container');
                if (container) container.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--occupied); font-size: 13px;">Failed to load transactions.</div>';
            });

    }

    modal.style.display = "block";
}

function showRenewDialog(seatNumber) {
    document.getElementById('seatModal').style.display = "none";
    const renewModal = document.getElementById('renewModal');
    document.getElementById('renew_seat_number').value = seatNumber;

    const durationSelect = document.getElementById('renew_duration');
    if (durationSelect) durationSelect.value = "30";

    const totalDisplay = document.getElementById('renew_total_display');
    if (totalDisplay) totalDisplay.innerText = "700";

    document.getElementById('renew_amount_paid').value = "0";
    renewModal.style.display = "block";
}

function closeRenewDialog() {
    document.getElementById('renewModal').style.display = "none";
    document.getElementById('seatModal').style.display = "block";
}

function showCancelDialog(seatNumber) {
    document.getElementById('seatModal').style.display = "none";
    const cancelModal = document.getElementById('cancelModal');
    document.getElementById('cancel_seat_number').value = seatNumber;
    cancelModal.style.display = "block";
}

function closeCancelDialog() {
    document.getElementById('cancelModal').style.display = "none";
    document.getElementById('seatModal').style.display = "block";
}

function submitRegistration() {
    const errorDiv = document.getElementById('form_error');
    errorDiv.style.display = 'none';
    errorDiv.innerText = '';

    const showError = (msg) => {
        errorDiv.innerText = msg;
        errorDiv.style.display = 'block';
    };

    const seatNumber = document.getElementById('seat_number').value;
    const studentName = document.getElementById('name').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const address = document.getElementById('address').value.trim();
    const amountPaid = document.getElementById('amount_paid').value.trim();

    if (!studentName) {
        showError("Name is mandatory.");
        return;
    }

    const nameRegex = /^[A-Za-z\s]{3,}$/;
    if (!nameRegex.test(studentName)) {
        showError("Please enter a valid full name (alphabets only, min 3 characters).");
        return;
    }

    if (!mobile) {
        showError("Mobile number is mandatory.");
        return;
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
        showError("Please enter a valid 10-digit mobile number.");
        return;
    }

    if (!address) {
        showError("Address is mandatory.");
        return;
    }

    if (!amountPaid || isNaN(parseFloat(amountPaid)) || parseFloat(amountPaid) < 0) {
        showError("Amount Paid has to be a valid number.");
        return;
    }

    const startDate = document.getElementById('start_date').value;
    if (!startDate) {
        showError("Enter the date.");
        return;
    }

    if (startDate) {
        // Compare dates using ISO strings to avoid timezone shift offset bugs
        const todayString = new Date().toLocaleDateString('en-CA'); // 'en-CA' outputs YYYY-MM-DD local format
        const minAllowedDate = '2026-01-01';

        if (startDate < minAllowedDate) {
            showError("Start date cannot be before 01/01/2026");
            return;
        }

        if (startDate > todayString) {
            showError("Starting date cannot exceed today.");
            return;
        }
    }

    // Collect checked exam prep values
    const checkedExams = Array.from(document.querySelectorAll('input[name="exam_prep"]:checked'))
        .map(cb => cb.value)
        .join(', ');

    const data = {
        seat_number: seatNumber,
        student_name: studentName,
        mobile: mobile,
        address: address,
        exam_prep: checkedExams,
        days: document.getElementById('duration').value,
        total_amount: document.getElementById('total_amount').value,
        amount_paid: amountPaid,
        payment_mode: document.getElementById('payment_mode_reg').value
    };

    if (startDate) data.start_date = startDate;

    fetch('/api/students/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                document.getElementById('seatModal').style.display = "none";
                fetchDashboardData();
                showToast("Student registered successfully!", "success");
            } else {
                showToast(res.message, "error");
            }
        })
        .catch(err => showToast("Error: " + err, "error"));
}

function confirmRenew() {
    const seatNumber = document.getElementById('renew_seat_number').value;
    const amountPaid = document.getElementById('renew_amount_paid').value;
    const paymentMode = document.getElementById('renew_payment_mode').value;
    const duration = document.getElementById('renew_duration').value;
    const totalAdded = duration === '90' ? 1900 : 700;
    const renewDate = document.getElementById('renew_date').value;

    const payload = {
        days: parseInt(duration),
        add_total_amount: totalAdded,
        add_amount_paid: amountPaid || 0,
        payment_mode: paymentMode
    };
    if (renewDate) payload.start_date = renewDate;

    fetch(`/api/students/${seatNumber}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                document.getElementById('renewModal').style.display = "none";
                fetchDashboardData();
                showToast("Renewed successfully.", "success");
            } else showToast(res.message, "error");
        })
        .catch(err => showToast("Error renewing: " + err, "error"));
}

function showPayDuesDialog(seatNumber, pendingAmount) {
    document.getElementById('seatModal').style.display = "none";
    const payModal = document.getElementById('payDuesModal');
    document.getElementById('pay_dues_seat_display').innerText = seatNumber;
    document.getElementById('pay_dues_seat_number').value = seatNumber;
    document.getElementById('pay_dues_amount').value = pendingAmount;
    payModal.style.display = "block";
}

function closePayDuesDialog() {
    document.getElementById('payDuesModal').style.display = "none";
    document.getElementById('seatModal').style.display = "block";
}

function confirmPayDues() {
    const seatNumber = document.getElementById('pay_dues_seat_number').value;
    const amount = document.getElementById('pay_dues_amount').value;
    const paymentMode = document.getElementById('pay_dues_payment_mode').value;
    const payDuesDate = document.getElementById('pay_dues_date').value;

    if (!amount || isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid amount.", "error");
        return;
    }

    const payload = { amount: parseFloat(amount), payment_mode: paymentMode };
    if (payDuesDate) payload.date = payDuesDate;

    fetch(`/api/students/${seatNumber}/pay_dues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                document.getElementById('payDuesModal').style.display = "none";
                fetchDashboardData();
                showToast("Dues cleared successfully! Receipt generated.", "success");
                setTimeout(() => downloadLastReceipt(seatNumber), 1000);
            } else {
                showToast(res.message, "error");
            }
        })
        .catch(err => showToast("Error clearing dues: " + err, "error"));
}

function transferSeat(oldSeatId) {
    const newSeatId = document.getElementById('transfer_seat').value;
    if (!newSeatId) {
        alert("Please enter a valid seat number.");
        return;
    }

    fetch(`/api/students/${oldSeatId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_seat_id: newSeatId })
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                document.getElementById('seatModal').style.display = "none";
                fetchDashboardData();
                showToast("Seat transferred successfully.", "success");
            } else showToast(res.message, "error");
        })
        .catch(err => showToast("Error transferring: " + err, "error"));
}

// ====== Edit Student Details ======
function showEditDialog(seatNumber) {
    const seat = cachedSeats.find(s => s.seat_number == seatNumber);
    if (!seat) return;

    document.getElementById('seatModal').style.display = 'none';
    const editModal = document.getElementById('editModal');
    document.getElementById('edit_seat_number').value = seatNumber;
    document.getElementById('edit_name').value = seat.student_name || '';
    document.getElementById('edit_mobile').value = seat.mobile || '';
    document.getElementById('edit_address').value = seat.address || '';

    // Pre-check exam prep checkboxes
    const existingPreps = (seat.exam_prep || '').split(',').map(s => s.trim().toLowerCase());
    document.querySelectorAll('input[name="edit_exam_prep"]').forEach(cb => {
        cb.checked = existingPreps.includes(cb.value.toLowerCase());
    });

    editModal.style.display = 'block';
}

function closeEditDialog() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('seatModal').style.display = 'block';
}

function submitEditProfile() {
    const seatNumber = document.getElementById('edit_seat_number').value;
    const name = document.getElementById('edit_name').value.trim();
    const mobile = document.getElementById('edit_mobile').value.trim();
    const address = document.getElementById('edit_address').value.trim();
    const checkedExams = Array.from(document.querySelectorAll('input[name="edit_exam_prep"]:checked'))
        .map(cb => cb.value).join(', ');

    if (!name) { showToast('Name cannot be empty.', 'error'); return; }
    if (!/^[0-9]{10}$/.test(mobile)) { showToast('Please enter a valid 10-digit mobile number.', 'error'); return; }
    if (!address) { showToast('Address cannot be empty.', 'error'); return; }

    fetch(`/api/students/${seatNumber}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_name: name, mobile: mobile, address: address, exam_prep: checkedExams })
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                document.getElementById('editModal').style.display = 'none';
                fetchDashboardData();
                showToast('Student details updated successfully!', 'success');
            } else {
                showToast(res.message || 'Update failed.', 'error');
            }
        })
        .catch(err => showToast('Error: ' + err, 'error'));
}


function confirmCancel() {
    const seatNumber = document.getElementById('cancel_seat_number').value;

    fetch(`/api/seats/${seatNumber}/release`, {
        method: 'POST'
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                document.getElementById('cancelModal').style.display = "none";
                fetchDashboardData();
                showToast("Subscription cancelled and seat released.", "success");
            } else showToast(res.message, "error");
        })
        .catch(err => showToast("Error cancelling: " + err, "error"));
}

function downloadLastReceipt(seatNumber) {
    const seat = cachedSeats.find(s => s.seat_number == seatNumber);
    if (seat && seat.receipt_path) {
        window.open(`/api/receipts/${seat.receipt_path.split('/').pop()}`, '_blank');
    } else {
        showToast("No receipt found or backend path unavailable.", "error");
    }
}

// --- Financial Reports Logic ---
let cachedTransactions = [];

function openReportsModal() {
    document.getElementById('reportsModal').style.display = 'block';
    document.getElementById('reportsTableBody').innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Fetching records...</td></tr>';

    fetch('/api/students/transactions')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                cachedTransactions = data.data;
                applyReportFilter();
            } else {
                showToast("Failed to load transactions", "error");
            }
        })
        .catch(err => showToast("Error connecting to API", "error"));
}

function applyReportFilter() {
    const filter = document.getElementById('reportFilter').value;

    // Pre-calculate reference dates
    const now = new Date();
    const todayString = now.toDateString();

    const firstDayOfWeek = new Date(now);
    firstDayOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    firstDayOfWeek.setHours(0, 0, 0, 0);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const yearOfLastMonth = currentMonth === 0 ? currentYear - 1 : currentYear;

    let filtered = cachedTransactions.filter(tx => {
        if (!tx.timestamp) return true; // old data safeguard
        const tDate = new Date(tx.timestamp);

        if (filter === 'all') return true;

        if (filter === 'today') {
            return tDate.toDateString() === todayString;
        }

        if (filter === 'this_week') {
            return tDate >= firstDayOfWeek;
        }

        if (filter === 'this_month') {
            return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        }

        if (filter === 'last_month') {
            return tDate.getMonth() === lastMonth && tDate.getFullYear() === yearOfLastMonth;
        }

        return true;
    });

    renderReports(filtered);
}

function renderReports(txs) {
    const tbody = document.getElementById('reportsTableBody');
    const totalEl = document.getElementById('reportTotalRevenue');

    tbody.innerHTML = '';
    let sum = 0;

    if (txs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-secondary);">No financial records found for this period.</td></tr>';
        totalEl.innerText = "0.00";
        return;
    }

    txs.forEach(tx => {
        const amt = parseFloat(tx.amount || 0);
        sum += amt;

        // Format date string beautifully
        const d = new Date(tx.timestamp || tx.date);
        const dateStr = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })}, ${d.getFullYear()}`;
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">${dateStr} <br><small style="color:var(--text-secondary)">${timeStr}</small></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><strong>${tx.student_name || 'Unknown'}</strong> <br><small>Seat #${tx.seat_number}</small></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);"><span style="background: var(--surface); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border); font-size: 12px; font-weight: 500;">${tx.type || 'Payment'}</span></td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border);">${tx.payment_mode || 'Offline'}</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border); text-align: right; font-weight: bold; color: var(--success);">+${amt.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    totalEl.innerText = sum.toFixed(2);
}

function printReport() {
    const filterSelect = document.getElementById('reportFilter');
    const filterValue = filterSelect.value;
    const totalRev = document.getElementById('reportTotalRevenue').innerText;
    const tableBodyHTML = document.getElementById('reportsTableBody').innerHTML;

    let filterText = 'All Time';
    const now = new Date();

    // Helper to format as "DD Mon YYYY"
    const formatDate = (d) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    const getWeekOfMonth = (date) => {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return Math.ceil((date.getDate() + firstDay) / 7);
    };
    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (filterValue === 'today') {
        filterText = formatDate(now);
    } else if (filterValue === 'this_week') {
        const weekNum = getWeekOfMonth(now);
        filterText = `Week ${weekNum}, ${monthsFull[now.getMonth()]} ${now.getFullYear()}`;
    } else if (filterValue === 'this_month') {
        filterText = `${monthsFull[now.getMonth()]} ${now.getFullYear()}`;
    } else if (filterValue === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const yearOfLastMonth = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        filterText = `${monthsFull[lastMonth]} ${yearOfLastMonth}`;
    }

    // Create a new window for pure printing
    const printWindow = window.open('', '_blank');

    const printDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Financial Report</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { margin: 0; color: #1e3a8a; font-size: 24px; }
                .header p { margin: 5px 0; color: #64748b; font-size: 14px; }
                .report-info { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; text-align: left; }
                th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 5px; }
                th { background-color: #f8fafc; color: #475569; }
                .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; color: #10b981; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>CHAMPIONS LIBRARY</h1>
                <p>Financial Statements Report</p>
                <p>Date Printed: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="report-info">
                <span>Period: ${filterText}</span>
                <span>Total Revenue: Rs. ${totalRev}</span>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Student Details</th>
                        <th>Transaction Type</th>
                        <th>Mode</th>
                        <th style="text-align:right;">Amount (Rs.)</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableBodyHTML}
                </tbody>
            </table>
            
            <div class="total">
                Final Total: Rs. ${totalRev}
            </div>
            
            <div style="text-align: center; margin-top: 40px;">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">Print Document</button>
            </div>
            
            <script>
                // Auto trigger print dialog when window is fully loaded
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printDoc);
    printWindow.document.close();
}
