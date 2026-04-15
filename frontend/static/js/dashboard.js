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
    // Prepare for custom layout
    const seatElements = {};

    let occupiedCount = 0;
    let totalDues = 0;
    let totalStudents = 0;

    const actionList = document.getElementById('action_list_items');
    actionList.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    seats.forEach(seat => {
        const isOccupied = seat.is_occupied;
        const shortName = isOccupied && seat.student_name
            ? seat.student_name.split(' ')[0].substring(0, 8)
            : '';

        const div = document.createElement('div');
        div.className = 'seat';
        div.innerHTML = `
            <span style="font-size:16px; font-weight:800; letter-spacing:-0.02em; line-height:1; margin-bottom: 2px;">${seat.seat_number}</span>
            <span style="font-size:10px; font-weight:600; opacity:0.9; letter-spacing:0.02em; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:1.2;">
                ${isOccupied ? shortName : 'Vacant'}
            </span>
        `;

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
                    const isExpiring = diffDays <= 3;
                    const hasDues = parseFloat(seat.pending_balance) > 0;

                    // Expiring alert card
                    if (isExpiring) {
                        const li = document.createElement('li');
                        li.style.cssText = 'background:#fff; border-radius:8px; border-left:4px solid #f59e0b; padding:10px 12px; box-shadow:0 1px 4px rgba(0,0,0,0.07);';
                        li.innerHTML = `
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px;">
                                <span style="background:#fef3c7; color:#92400e; font-size:11px; font-weight:700; padding:2px 7px; border-radius:99px;">Seat ${seat.seat_number}</span>
                                <span style="font-size:10px; color:#f59e0b; font-weight:600;">⏰ ${diffDays === 0 ? 'TODAY' : diffDays < 0 ? 'EXPIRED' : 'EXP IN ' + diffDays + 'd'}</span>
                            </div>
                            <div style="font-size:12px; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:6px;">${seat.student_name}</div>
                            <button onclick="openSeatModal(${seat.seat_number})" style="width:100%; padding:5px 0; font-size:12px; font-weight:600; background:#f59e0b; color:#fff; border:none; border-radius:6px; cursor:pointer;">Manage →</button>
                        `;
                        actionList.appendChild(li);
                    }

                    // Dues alert card
                    if (hasDues) {
                        const li = document.createElement('li');
                        li.style.cssText = 'background:#fff; border-radius:8px; border-left:4px solid #ef4444; padding:10px 12px; box-shadow:0 1px 4px rgba(0,0,0,0.07);';
                        li.innerHTML = `
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px;">
                                <span style="background:#fee2e2; color:#991b1b; font-size:11px; font-weight:700; padding:2px 7px; border-radius:99px;">Seat ${seat.seat_number}</span>
                                <span style="font-size:10px; color:#ef4444; font-weight:600;">💸 DUES</span>
                            </div>
                            <div style="font-size:12px; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px;">${seat.student_name}</div>
                            <div style="font-size:11px; color:#ef4444; font-weight:700; margin-bottom:6px;">₹${seat.pending_balance} pending</div>
                            <button onclick="openSeatModal(${seat.seat_number})" style="width:100%; padding:5px 0; font-size:12px; font-weight:600; background:#ef4444; color:#fff; border:none; border-radius:6px; cursor:pointer;">Clear Dues →</button>
                        `;
                        actionList.appendChild(li);
                    }
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
        seatElements[seat.seat_number] = div;
    });

    // Now render into partitions
    const leftPartition = document.getElementById('left_partition');
    const rightPartition = document.getElementById('right_partition');
    const unplacedContainer = document.getElementById('unplaced_seats_container');
    const unplacedGrid = document.getElementById('unplaced_seats_grid');

    if (leftPartition && rightPartition) {
        leftPartition.innerHTML = '';
        rightPartition.innerHTML = '';
        if (unplacedGrid) unplacedGrid.innerHTML = '';

        const leftBlocks = [
            [
                [72, 71, 70, 69]
            ],
            [
                [73, 74, 75, 76, 77],
                [78, 79, 80, 81]
            ]
        ];

        const rightBlocks = [
            [
                [68, 67, 66, 65, 64, 63, 62, 61, 60, 59, 58, 57, 56]
            ],
            [
                [44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55],
                [43, 42, 41, 40, 39, 38, 37, 36, 35, 34]
            ],
            [
                [24, 25, 26, 27, 28, 29, 30, 31, 32, 33],
                [23, 22, 21, 20, 19, 18, 17, 16, 15, 14]
            ],
            [
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
            ]
        ];

        const buildBlock = (partitionElement, blockArr, align, columns) => {
            const blockDiv = document.createElement('div');
            blockDiv.style.display = 'flex';
            blockDiv.style.flexDirection = 'column';
            blockDiv.style.gap = '4px'; 
            blockDiv.style.padding = '8px';
            blockDiv.style.background = 'var(--bg-color)'; 
            blockDiv.style.border = '1px solid var(--border)';
            blockDiv.style.borderRadius = '8px';
            blockDiv.style.width = '100%';

            blockArr.forEach(rowArr => {
                const rowDiv = document.createElement('div');
                rowDiv.style.display = 'grid';
                rowDiv.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
                rowDiv.style.gap = '4px'; 
                rowDiv.style.width = '100%';

                const padding = columns - rowArr.length;

                if (align === 'right' && padding > 0) {
                    for(let i=0; i<padding; i++) {
                        const spacer = document.createElement('div');
                        rowDiv.appendChild(spacer);
                    }
                }

                rowArr.forEach(seatNum => {
                    if (seatElements[seatNum]) {
                        rowDiv.appendChild(seatElements[seatNum]);
                        delete seatElements[seatNum];
                    } else {
                        const empty = document.createElement('div');
                        empty.className = 'seat';
                        empty.style.opacity = '0';
                        empty.style.pointerEvents = 'none';
                        rowDiv.appendChild(empty);
                    }
                });

                if (align === 'left' && padding > 0) {
                    for(let i=0; i<padding; i++) {
                        const spacer = document.createElement('div');
                        rowDiv.appendChild(spacer);
                    }
                }

                blockDiv.appendChild(rowDiv);
            });
            partitionElement.appendChild(blockDiv);
        };

        leftPartition.style.gap = '16px';
        rightPartition.style.gap = '16px';

        leftBlocks.forEach(arr => buildBlock(leftPartition, arr, 'right', 5));
        rightBlocks.forEach(arr => buildBlock(rightPartition, arr, 'left', 13));

        const unplacedSeats = Object.keys(seatElements).map(Number).sort((a,b)=>a-b);
        if (unplacedSeats.length > 0 && unplacedContainer && unplacedGrid) {
            unplacedContainer.style.display = 'block';
            unplacedSeats.forEach(seatNum => {
                unplacedGrid.appendChild(seatElements[seatNum]);
            });
        } else if (unplacedContainer) {
            unplacedContainer.style.display = 'none';
        }
    }

    // Show "All clear" if no alert items
    if (actionList.children.length === 0) {
        actionList.innerHTML = `<li style="text-align:center; padding:18px 8px; color:#059669; font-size:13px; font-weight:600;">✅ All clear!<br><span style="font-weight:400; color:#6b7280; font-size:12px;">No expirations or pending dues.</span></li>`;
    }

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
                    <form id="registerForm" class="modern-form" autocomplete="on">
                        <div id="form_error" style="display: none; color: #ef4444; background: #fee2e2; border: 1px solid #fca5a5; padding: 10px; border-radius: 6px; font-size: 14px; text-align: center; font-weight: 600;"></div>
                        <input type="hidden" id="seat_number" value="${seatNumber}">
                        
                        <div class="form-row">
                            <div class="form-group"><label>Name</label><input type="text" id="name" name="name" placeholder="E.g. Rahul Kumar" autocomplete="name" tabindex="1" required></div>
                            <div class="form-group"><label>Mobile</label><input type="tel" id="mobile" name="mobile" placeholder="10 digits only" autocomplete="tel" tabindex="2" required></div>
                        </div>
                        
                        <div class="form-group"><label>Address</label><input type="text" id="address" name="address" placeholder="Enter full address" autocomplete="street-address" tabindex="3" required></div>
                        
                        <div class="form-group">
                            <label>Exam Prep</label>
                            <div id="exam_prep_checkboxes" class="exam-prep-chips">
                                <label tabindex="4"><input type="checkbox" name="exam_prep" value="iit-jee"> IIT-JEE</label>
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
                                <input type="date" id="start_date" name="start_date" min="2026-01-01" max="${new Date().toISOString().split('T')[0]}" autocomplete="off" tabindex="5">
                            </div>
                            <div class="form-group">
                                <label>Duration</label>
                                <select id="duration" name="duration" tabindex="6" onchange="document.getElementById('total_amount').value = (this.value == '90') ? 1900 : 700">
                                    <option value="30">30 Days</option>
                                    <option value="90">90 Days</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group"><label>Total Fee (₹)</label><input type="number" id="total_amount" name="total_amount" value="700" autocomplete="off" tabindex="7" required></div>
                            <div class="form-group"><label>Amount Paid (₹)</label><input type="number" id="amount_paid" name="amount_paid" value="" autocomplete="off" tabindex="8" required></div>
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
            <div class="profile-card" style="padding: 12px;">
                <!-- Compact header: Seat + Plan in one row -->
                <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:10px; background:linear-gradient(135deg,#1e293b,#0f172a); margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:20px;">🪑</span>
                        <div>
                            <div style="font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em;">Seat</div>
                            <div style="font-size:20px; font-weight:800; color:#f8fafc; line-height:1;">${seatNumber}</div>
                        </div>
                    </div>
                    <span style="padding:5px 14px; border-radius:999px; font-size:12px; font-weight:700; background:${planLabel === '90-Day Plan' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'linear-gradient(135deg,#10b981,#059669)'}; color:#fff;">${planLabel}</span>
                </div>

                <!-- Compact Name Card -->
                <div style="display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:10px; background:linear-gradient(135deg,#1e1b4b,#3730a3,#6d28d9); margin-bottom:10px; box-shadow:0 4px 14px rgba(99,102,241,.3);">
                    <div style="width:42px; height:42px; border-radius:50%; background:rgba(255,255,255,.2); border:2px solid rgba(255,255,255,.4); display:flex; align-items:center; justify-content:center; font-size:17px; font-weight:800; color:#fff; flex-shrink:0;">
                        ${seat.student_name.trim().split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div style="min-width:0;">
                        <div style="font-size:15px; font-weight:800; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${seat.student_name}</div>
                        <div style="font-size:12px; color:#c4b5fd;">📞 ${seat.mobile}</div>
                    </div>
                </div>

                <!-- Address + Exam Prep side by side -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div style="background:var(--bg-color); border-radius:8px; padding:8px 10px; border:1px solid var(--border);">
                        <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em; margin-bottom:2px;">Address</div>
                        <div style="font-size:12px; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${seat.address || 'N/A'}</div>
                    </div>
                    <div style="background:var(--bg-color); border-radius:8px; padding:8px 10px; border:1px solid var(--border);">
                        <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em; margin-bottom:2px;">Exam Prep</div>
                        <div style="font-size:12px; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${seat.exam_prep || 'N/A'}</div>
                    </div>
                </div>

                <!-- Start / End Date compact pills -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div style="padding:8px 10px; border-radius:8px; background:#059669; text-align:center;">
                        <div style="font-size:9px; color:#d1fae5; text-transform:uppercase; letter-spacing:.07em;">📅 Start</div>
                        <div style="font-size:12px; font-weight:700; color:#fff;">${seat.start_date}</div>
                    </div>
                    <div style="padding:8px 10px; border-radius:8px; background:#dc2626; text-align:center;">
                        <div style="font-size:9px; color:#fee2e2; text-transform:uppercase; letter-spacing:.07em;">🏁 End</div>
                        <div style="font-size:12px; font-weight:700; color:#fff;">${seat.end_date}</div>
                    </div>
                </div>

                <!-- Billing: 3 values in one row -->
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:4px;">
                    <div style="text-align:center; padding:7px 4px; background:var(--bg-color); border-radius:8px; border:1px solid var(--border);">
                        <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase; margin-bottom:1px;">Total</div>
                        <div style="font-size:13px; font-weight:700; color:var(--text-primary);">₹${seat.total_amount}</div>
                    </div>
                    <div style="text-align:center; padding:7px 4px; background:var(--bg-color); border-radius:8px; border:1px solid var(--border);">
                        <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase; margin-bottom:1px;">Paid</div>
                        <div style="font-size:13px; font-weight:700; color:#059669;">₹${seat.amount_paid}</div>
                    </div>
                    <div style="text-align:center; padding:7px 4px; background:var(--bg-color); border-radius:8px; border:1px solid var(--border);">
                        <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase; margin-bottom:1px;">Dues</div>
                        <div style="font-size:13px; font-weight:700; color:${parseFloat(seat.pending_balance) > 0 ? '#dc2626' : '#059669'};">₹${seat.pending_balance}</div>
                    </div>
                </div>
            </div>

            <div class="section-title" style="margin-top:14px; margin-bottom:6px; font-size:13px;">💳 Transaction History</div>
            <div id="txn_history_container" style="margin-bottom:12px; max-height:150px; overflow-y:auto; border:1px solid var(--border); border-radius:8px; background:var(--bg-color);">
                <div style="padding:14px; text-align:center; color:var(--text-secondary); font-size:13px;">Loading...</div>
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
                    <div style="padding: 8px 12px; background: var(--primary-bg); border-bottom: 1px solid var(--border); font-size: 11px; font-weight: 600; color: var(--text-secondary); display: grid; grid-template-columns: 25px 1.5fr 1.5fr 1.5fr 1.2fr 1.5fr; gap: 8px;">
                        <span>#</span><span>Txn Date</span><span>Start</span><span>End</span><span>Type</span><span>Amount/Mode</span>
                    </div>`;
                res.data.forEach((tx, idx) => {
                    html += `
                    <div style="padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 12px; display: grid; grid-template-columns: 25px 1.5fr 1.5fr 1.5fr 1.2fr 1.5fr; gap: 8px; align-items: center;">
                        <span style="color: var(--text-secondary); font-size: 11px;">${idx + 1}</span>
                        <span>${tx.date || '—'}</span>
                        <span style="color: #059669; font-weight: 500;">${tx.start_date ? tx.start_date : '—'}</span>
                        <span style="color: #dc2626; font-weight: 500;">${tx.end_date ? tx.end_date : '—'}</span>
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

function showChangePlanDialog(seatNumber) {
    const seat = cachedSeats.find(s => s.seat_number == seatNumber);
    if (!seat) return;

    // Detect current plan
    let currentDays = 30;
    if (seat.start_date && seat.end_date) {
        const diff = Math.round((new Date(seat.end_date) - new Date(seat.start_date)) / (1000 * 60 * 60 * 24));
        currentDays = diff >= 85 ? 90 : 30;
    }
    const otherDays = currentDays === 30 ? 90 : 30;
    const defaultFee = otherDays === 90 ? 1999 : 799;

    const body = document.getElementById('modalBody');
    body.innerHTML = `
        <div style="padding:8px 0;">
            <div style="background:linear-gradient(135deg,#1e293b,#0f172a); border-radius:10px; padding:12px 16px; margin-bottom:16px; text-align:center;">
                <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px;">Current Plan</div>
                <div style="font-size:18px; font-weight:800; color:#f8fafc;">${currentDays}-Day Plan</div>
                <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Seat ${seatNumber} · ${seat.student_name}</div>
            </div>

            <div style="font-size:12px; color:var(--text-secondary); font-weight:600; text-transform:uppercase; letter-spacing:.07em; margin-bottom:10px;">Switch to:</div>

            <!-- Plan selector cards -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
                <div id="plan_30" onclick="selectPlan(30, 799)" style="border:2px solid ${otherDays === 30 ? '#6366f1' : '#e2e8f0'}; border-radius:10px; padding:12px; text-align:center; cursor:pointer; transition:.2s; background:${otherDays === 30 ? '#eef2ff' : 'var(--bg-color)'};">
                    <div style="font-size:20px; margin-bottom:4px;">📅</div>
                    <div style="font-weight:800; font-size:14px; color:var(--text-primary);">30-Day</div>
                    <div style="font-size:11px; color:var(--text-secondary);">₹799</div>
                </div>
                <div id="plan_90" onclick="selectPlan(90, 1999)" style="border:2px solid ${otherDays === 90 ? '#6366f1' : '#e2e8f0'}; border-radius:10px; padding:12px; text-align:center; cursor:pointer; transition:.2s; background:${otherDays === 90 ? '#eef2ff' : 'var(--bg-color)'};">
                    <div style="font-size:20px; margin-bottom:4px;">📆</div>
                    <div style="font-weight:800; font-size:14px; color:var(--text-primary);">90-Day</div>
                    <div style="font-size:11px; color:var(--text-secondary);">₹1999</div>
                </div>
            </div>

            <input type="hidden" id="changePlanDays" value="${otherDays}">

            <div style="margin-bottom:14px;">
                <label style="font-size:12px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">New Plan Fee (₹)</label>
                <input type="number" id="changePlanFee" value="${defaultFee}" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px; font-weight:600;" class="form-control">
            </div>

            <button onclick="confirmChangePlan(${seatNumber})" style="width:100%; padding:11px; background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff; font-size:14px; font-weight:700; border:none; border-radius:8px; cursor:pointer;">Confirm Plan Change</button>
            <button onclick="openSeatModal(${seatNumber})" style="width:100%; margin-top:8px; padding:9px; background:transparent; color:var(--text-secondary); font-size:13px; border:1px solid var(--border); border-radius:8px; cursor:pointer;">← Cancel</button>
        </div>
    `;
}

function selectPlan(days, fee) {
    document.getElementById('changePlanDays').value = days;
    document.getElementById('changePlanFee').value = fee;
    // Highlight selected card
    document.getElementById('plan_30').style.border = days === 30 ? '2px solid #6366f1' : '2px solid #e2e8f0';
    document.getElementById('plan_30').style.background = days === 30 ? '#eef2ff' : 'var(--bg-color)';
    document.getElementById('plan_90').style.border = days === 90 ? '2px solid #6366f1' : '2px solid #e2e8f0';
    document.getElementById('plan_90').style.background = days === 90 ? '#eef2ff' : 'var(--bg-color)';
}

function confirmChangePlan(seatNumber) {
    const planDays = parseInt(document.getElementById('changePlanDays').value);
    const fee = parseFloat(document.getElementById('changePlanFee').value);

    if (!planDays || !fee) {
        showToast('Please select a plan and enter a fee.', 'error');
        return;
    }

    fetch(`/api/students/${seatNumber}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_days: planDays, total_amount: fee })
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                showToast(`✅ Plan changed to ${planDays}-Day. New end: ${res.new_end_date}`, 'success');
                document.getElementById('seatModal').style.display = 'none';
                fetchDashboardData();
            } else {
                showToast(res.message || 'Change failed.', 'error');
            }
        })
        .catch(err => showToast('Error: ' + err, 'error'));
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
    document.getElementById('edit_start_date').value = seat.start_date || '';
    document.getElementById('edit_plan').value = (seat.total_amount && parseFloat(seat.total_amount) >= 1900) ? '90' : '30';

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
    const startDate = document.getElementById('edit_start_date').value;
    const plan = document.getElementById('edit_plan').value;
    const checkedExams = Array.from(document.querySelectorAll('input[name="edit_exam_prep"]:checked'))
        .map(cb => cb.value).join(', ');

    if (!name) { showToast('Name cannot be empty.', 'error'); return; }
    if (!/^[0-9]{10}$/.test(mobile)) { showToast('Please enter a valid 10-digit mobile number.', 'error'); return; }
    if (!address) { showToast('Address cannot be empty.', 'error'); return; }
    if (!startDate) { showToast('Start Date cannot be empty.', 'error'); return; }

    const payload = {
        student_name: name,
        mobile: mobile,
        address: address,
        exam_prep: checkedExams,
        start_date: startDate,
        plan_days: parseInt(plan)
    };

    fetch(`/api/students/${seatNumber}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    // Generate receipt on-demand from Google Sheets — works on Vercel serverless
    showToast('Generating receipt...', 'success');
    window.location.href = `/api/students/${seatNumber}/receipt`;
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

    // Use a hidden iframe to avoid browser popup blockers
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
                        <th>Date &amp; Time</th>
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
            <div class="total">Final Total: Rs. ${totalRev}</div>
        </body>
        </html>
    `;

    // Remove any old print iframe
    const oldFrame = document.getElementById('_printFrame');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = '_printFrame';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
    document.body.appendChild(iframe);

    iframe.contentDocument.open();
    iframe.contentDocument.write(printDoc);
    iframe.contentDocument.close();

    // Wait for content to load then print
    iframe.onload = function () {
        setTimeout(() => {
            iframe.contentWindow.print();
        }, 300);
    };
}

// --- Left Side Panel Toggle ---
let alertsPanelOpen = true;
function toggleAlertsPanel() {
    const content = document.getElementById('alertsPanelContent');
    const chevron = document.getElementById('alertsPanelChevron');
    alertsPanelOpen = !alertsPanelOpen;
    if (alertsPanelOpen) {
        content.style.display = 'block';
        chevron.textContent = '▼';
    } else {
        content.style.display = 'none';
        chevron.textContent = '▶';
    }
}
