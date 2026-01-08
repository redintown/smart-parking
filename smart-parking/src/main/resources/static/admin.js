/**
 * Admin Dashboard - Complete JavaScript Implementation
 * Handles authentication, dashboard stats, slot visualization, history, charges, analytics, and manual override
 */

// ============================================
// GLOBAL STATE
// ============================================

let authToken = localStorage.getItem('adminToken') || null;
let currentAdmin = null;
let slotsData = [];
let historyData = [];
let chargesData = [];
let revenueChart = null;
let peakHoursChart = null;
let autoRefreshInterval = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatNumber(num) {
    return num.toLocaleString();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDateTime(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDuration(minutes) {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

function formatTimeAgo(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function getVehicleTypeIcon(vehicleType) {
    if (!vehicleType) return 'fas fa-car';
    switch (vehicleType.toUpperCase()) {
        case 'CAR': return 'fas fa-car-side';
        case 'BIKE': return 'fas fa-motorcycle';
        case 'MICROBUS': return 'fas fa-van-shuttle';
        case 'TRUCK': return 'fas fa-truck';
        default: return 'fas fa-car';
    }
}

function getVehicleTypeName(vehicleType) {
    if (!vehicleType) return 'Vehicle';
    switch (vehicleType.toUpperCase()) {
        case 'CAR': return 'Car';
        case 'BIKE': return 'Bike';
        case 'MICROBUS': return 'Microbus';
        case 'TRUCK': return 'Truck';
        default: return vehicleType;
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// API FUNCTIONS
// ============================================

async function apiCall(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': authToken })
        }
    };
    
    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            currentAdmin = data.admin;
            localStorage.setItem('adminToken', authToken);
            localStorage.setItem('adminData', JSON.stringify(currentAdmin));
            
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('adminContainer').style.display = 'block';
            
            showToast('Login successful!', 'success');
            initializeDashboard();
        } else {
            showToast(data.message || 'Invalid credentials', 'error');
        }
    } catch (error) {
        showToast('Login failed: ' + error.message, 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const fullName = document.getElementById('signupFullName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const role = document.getElementById('signupRole').value;
    
    // Validation
    if (username.length < 3) {
        showToast('Username must be at least 3 characters', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const params = new URLSearchParams({
            username: username,
            password: password,
            role: role
        });
        
        if (fullName) params.append('fullName', fullName);
        if (email) params.append('email', email);
        
        const response = await fetch('/admin/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            currentAdmin = data.admin;
            localStorage.setItem('adminToken', authToken);
            localStorage.setItem('adminData', JSON.stringify(currentAdmin));
            
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('adminContainer').style.display = 'block';
            
            showToast('Account created successfully! Welcome!', 'success');
            initializeDashboard();
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Signup failed: ' + error.message, 'error');
    }
}

function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTabBtn');
    const signupTab = document.getElementById('signupTabBtn');
    const loginForm = document.getElementById('loginFormContainer');
    const signupForm = document.getElementById('signupFormContainer');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

function handleLogout() {
    if (authToken) {
        fetch('/admin/logout', {
            method: 'POST',
            headers: { 'Authorization': authToken }
        }).catch(() => {});
    }
    
    authToken = null;
    currentAdmin = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    
    document.getElementById('adminContainer').style.display = 'none';
    document.getElementById('loginModal').style.display = 'block';
    
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    showToast('Logged out successfully', 'info');
}

function checkAuth() {
    if (authToken) {
        fetch('/admin/verify', {
            headers: { 'Authorization': authToken }
        })
        .then(res => res.json())
        .then(data => {
            if (data.valid) {
                currentAdmin = JSON.parse(localStorage.getItem('adminData') || '{}');
                document.getElementById('loginModal').style.display = 'none';
                document.getElementById('adminContainer').style.display = 'block';
                initializeDashboard();
            } else {
                // Redirect to new login page if not authenticated
                window.location.href = 'admin-login.html';
            }
        })
        .catch(() => {
            // Redirect to new login page on error
            window.location.href = 'admin-login.html';
        });
    } else {
        // Redirect to new login page if no token
        window.location.href = 'admin-login.html';
    }
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

async function loadDashboardStats() {
    try {
        const stats = await apiCall('/admin/dashboard/stats');
        
        document.getElementById('totalSlots').textContent = formatNumber(stats.totalSlots);
        document.getElementById('availableSlots').textContent = formatNumber(stats.availableSlots);
        document.getElementById('occupiedSlots').textContent = formatNumber(stats.occupiedSlots);
        document.getElementById('currentlyParked').textContent = formatNumber(stats.currentlyParkedVehicles);
        document.getElementById('vehiclesToday').textContent = formatNumber(stats.vehiclesParkedToday);
        document.getElementById('todayRevenue').textContent = formatCurrency(stats.todayRevenue);
        
        // Update vehicle type counts
        await updateVehicleTypeCounts();
    } catch (error) {
        showToast('Failed to load dashboard stats', 'error');
    }
}

async function updateVehicleTypeCounts() {
    try {
        const slots = await apiCall('/parking/slots');
        const counts = { CAR: 0, BIKE: 0, MICROBUS: 0, TRUCK: 0 };
        
        slots.forEach(slot => {
            if (slot.occupied && slot.vehicleType) {
                const type = slot.vehicleType.toUpperCase();
                if (counts[type] !== undefined) {
                    counts[type]++;
                }
            }
        });
        
        document.getElementById('carsParked').textContent = formatNumber(counts.CAR);
        document.getElementById('bikesParked').textContent = formatNumber(counts.BIKE);
        document.getElementById('microbusesParked').textContent = formatNumber(counts.MICROBUS);
        document.getElementById('trucksParked').textContent = formatNumber(counts.TRUCK);
    } catch (error) {
        console.error('Error updating vehicle counts:', error);
    }
}

async function loadActivity() {
    try {
        const history = await apiCall('/admin/history');
        const recent = history.slice(0, 10);
        
        const activityList = document.getElementById('activityList');
        const activityEmpty = document.getElementById('activityEmpty');
        
        if (recent.length === 0) {
            activityList.innerHTML = '';
            activityEmpty.style.display = 'block';
            return;
        }
        
        activityEmpty.style.display = 'none';
        activityList.innerHTML = recent.map(record => {
            const isExit = record.exitTime != null;
            const icon = isExit ? 'fa-sign-out-alt' : 'fa-parking';
            const action = isExit ? 'Exited' : 'Parked';
            const time = isExit ? formatTimeAgo(record.exitTime) : formatTimeAgo(record.entryTime);
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${isExit ? 'exit' : 'park'}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${action}: ${record.licensePlate}</div>
                        <div class="activity-details">
                            <span><i class="${getVehicleTypeIcon(record.vehicleType)}"></i> ${getVehicleTypeName(record.vehicleType)}</span>
                            <span>•</span>
                            <span>Slot ${record.slotNumber}</span>
                        </div>
                    </div>
                    <div class="activity-time">${time}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        showToast('Failed to load activity', 'error');
    }
}

// ============================================
// SLOT VISUALIZATION
// ============================================

async function loadSlots() {
    try {
        slotsData = await apiCall('/parking/slots');
        // Check overdue status for each occupied slot
        await checkOverdueStatus();
        renderSlots();
    } catch (error) {
        console.error('Error loading slots:', error);
        showToast('Failed to load slots', 'error');
    }
}

async function checkOverdueStatus() {
    // Check overdue status for occupied slots
    for (let slot of slotsData) {
        if (slot.occupied) {
            try {
                const detail = await apiCall(`/admin/slots/${slot.slotNumber}`);
                slot.overdue = detail.overdue || false;
            } catch (error) {
                slot.overdue = false;
            }
        }
    }
}

function renderSlots() {
    const grid = document.getElementById('slotsGrid');
    if (!grid) return;
    
    if (!slotsData || slotsData.length === 0) {
        grid.innerHTML = '<div class="empty-state">No slots found</div>';
        return;
    }
    
    grid.innerHTML = slotsData.map(slot => {
        let statusClass = 'available';
        let statusText = 'Available';
        let statusIcon = 'fa-circle';
        
        if (slot.occupied) {
            if (slot.overdue) {
                statusClass = 'overdue';
                statusText = 'Overdue';
                statusIcon = 'fa-exclamation-triangle';
            } else {
                statusClass = 'occupied';
                statusText = 'Occupied';
                statusIcon = 'fa-car';
            }
        } else {
            statusIcon = 'fa-check-circle';
        }
        
        return `
            <div class="slot-item ${statusClass}" onclick="showSlotDetail(${slot.slotNumber})">
                <div class="slot-number">${slot.slotNumber}</div>
                <div class="slot-status">
                    <i class="fas ${statusIcon}"></i>
                    <span>${statusText}</span>
                </div>
                ${slot.occupied ? `
                    <div class="slot-vehicle">
                        <i class="${getVehicleTypeIcon(slot.vehicleType)}"></i>
                        <span>${slot.licensePlate || 'N/A'}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

let currentSlotDetail = null;
let slotHistoryData = [];

async function showSlotDetail(slotNumber) {
    try {
        // Load slot detail and history in parallel
        const [detail, history] = await Promise.all([
            apiCall(`/admin/slots/${slotNumber}`),
            apiCall(`/admin/slots/${slotNumber}/history?limit=5`).catch(() => [])
        ]);
        
        currentSlotDetail = detail;
        slotHistoryData = history || [];
        
        const modal = document.getElementById('slotModal');
        const body = document.getElementById('slotModalBody');
        
        if (detail.occupied) {
            body.innerHTML = `
                <div class="slot-detail-content">
                    <!-- Slot Information -->
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="fas fa-info-circle"></i>
                            Slot Information
                        </h3>
                        <div class="detail-row">
                            <label><i class="fas fa-hashtag"></i> Slot Number:</label>
                            <span class="slot-number-badge">${detail.slotNumber}</span>
                        </div>
                        <div class="detail-row">
                            <label><i class="fas fa-circle"></i> Status:</label>
                            <span class="status-badge ${detail.overdue ? 'overdue' : 'occupied'}">
                                <i class="fas ${detail.overdue ? 'fa-exclamation-triangle' : 'fa-car'}"></i>
                                ${detail.overdue ? 'Overdue' : 'Occupied'}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Vehicle Information -->
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="fas fa-car"></i>
                            Vehicle Information
                        </h3>
                        <div class="detail-row">
                            <label><i class="fas fa-id-card"></i> License Plate:</label>
                            <span class="license-plate">${detail.licensePlate}</span>
                            <button class="btn-icon-small" onclick="showCorrectLicenseModal(${detail.slotNumber}, '${detail.licensePlate}')" title="Correct License Plate">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                        <div class="detail-row">
                            <label><i class="fas fa-tag"></i> Vehicle Type:</label>
                            <span><i class="${getVehicleTypeIcon(detail.vehicleType)}"></i> ${getVehicleTypeName(detail.vehicleType)}</span>
                        </div>
                        <div class="detail-row">
                            <label><i class="fas fa-clock"></i> Entry Time:</label>
                            <span>${formatDateTime(detail.entryTime)}</span>
                        </div>
                        <div class="detail-row">
                            <label><i class="fas fa-hourglass-half"></i> Parking Duration:</label>
                            <span class="duration-value">${formatDuration(detail.durationMinutes)}</span>
                        </div>
                        <div class="detail-row">
                            <label><i class="fas fa-money-bill-wave"></i> Current Charge:</label>
                            <span class="charge-value">${formatCurrency(detail.currentCharge)}</span>
                        </div>
                    </div>
                    
                    <!-- Admin Actions -->
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="fas fa-tools"></i>
                            Admin Actions
                        </h3>
                        <div class="action-buttons">
                            <button class="btn btn-danger btn-sm" onclick="handleForceExit(${detail.slotNumber})">
                                <i class="fas fa-sign-out-alt"></i>
                                Force Exit
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="reprintEntrySlip(${detail.slotNumber})">
                                <i class="fas fa-print"></i>
                                Reprint Entry Slip
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="showSlotHistory(${detail.slotNumber})">
                                <i class="fas fa-history"></i>
                                View History
                            </button>
                        </div>
                    </div>
                    
                    <!-- Recent History -->
                    ${slotHistoryData.length > 0 ? `
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="fas fa-history"></i>
                            Recent Parking History (Last 5)
                        </h3>
                        <div class="history-list">
                            ${slotHistoryData.map(record => `
                                <div class="history-item">
                                    <div class="history-header">
                                        <span class="history-vehicle">${record.licensePlate}</span>
                                        <span class="history-type">${getVehicleTypeName(record.vehicleType)}</span>
                                    </div>
                                    <div class="history-details">
                                        <span><i class="fas fa-sign-in-alt"></i> ${formatDateTime(record.entryTime)}</span>
                                        <span><i class="fas fa-sign-out-alt"></i> ${formatDateTime(record.exitTime)}</span>
                                        <span><i class="fas fa-money-bill-wave"></i> ${formatCurrency(record.charge)}</span>
                                    </div>
                                    <button class="btn-link" onclick="reprintExitSlip(${record.id})">
                                        <i class="fas fa-print"></i> Reprint Exit Slip
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            body.innerHTML = `
                <div class="slot-detail-content">
                    <!-- Slot Information -->
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="fas fa-info-circle"></i>
                            Slot Information
                        </h3>
                        <div class="detail-row">
                            <label><i class="fas fa-hashtag"></i> Slot Number:</label>
                            <span class="slot-number-badge">${detail.slotNumber}</span>
                        </div>
                        <div class="detail-row">
                            <label><i class="fas fa-circle"></i> Status:</label>
                            <span class="status-badge available">
                                <i class="fas fa-check-circle"></i>
                                Available
                            </span>
                        </div>
                    </div>
                    
                    <div class="empty-slot-message">
                        <i class="fas fa-parking"></i>
                        <p>This slot is currently empty and available for parking.</p>
                    </div>
                    
                    <!-- Admin Actions -->
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="fas fa-tools"></i>
                            Admin Actions
                        </h3>
                        <div class="action-buttons">
                            <button class="btn btn-success btn-sm" onclick="markSlotAvailable(${detail.slotNumber})">
                                <i class="fas fa-check"></i>
                                Mark as Available
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="showSlotHistory(${detail.slotNumber})">
                                <i class="fas fa-history"></i>
                                View History
                            </button>
                        </div>
                    </div>
                    
                    <!-- Recent History -->
                    ${slotHistoryData.length > 0 ? `
                    <div class="detail-section">
                        <h3 class="section-title">
                            <i class="fas fa-history"></i>
                            Recent Parking History (Last 5)
                        </h3>
                        <div class="history-list">
                            ${slotHistoryData.map(record => `
                                <div class="history-item">
                                    <div class="history-header">
                                        <span class="history-vehicle">${record.licensePlate}</span>
                                        <span class="history-type">${getVehicleTypeName(record.vehicleType)}</span>
                                    </div>
                                    <div class="history-details">
                                        <span><i class="fas fa-sign-in-alt"></i> ${formatDateTime(record.entryTime)}</span>
                                        <span><i class="fas fa-sign-out-alt"></i> ${formatDateTime(record.exitTime)}</span>
                                        <span><i class="fas fa-money-bill-wave"></i> ${formatCurrency(record.charge)}</span>
                                    </div>
                                    <button class="btn-link" onclick="reprintExitSlip(${record.id})">
                                        <i class="fas fa-print"></i> Reprint Exit Slip
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : '<p class="empty-history">No parking history available for this slot.</p>'}
                </div>
            `;
        }
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading slot details:', error);
        showToast('Failed to load slot details: ' + (error.message || 'Unknown error'), 'error');
    }
}

function closeSlotModal() {
    document.getElementById('slotModal').style.display = 'none';
    currentSlotDetail = null;
    slotHistoryData = [];
}

// ============================================
// SLOT ADMIN ACTIONS
// ============================================

async function handleForceExit(slotNumber) {
    if (!confirm(`Are you sure you want to force exit the vehicle from slot ${slotNumber}?`)) {
        return;
    }
    
    try {
        const response = await apiCall(`/admin/override/force-exit?slotNumber=${slotNumber}`, {
            method: 'POST'
        });
        
        showToast(`Vehicle ${response.licensePlate} force exited. Charge: ${formatCurrency(response.charge)}`, 'success');
        closeSlotModal();
        loadSlots();
        loadDashboardStats();
    } catch (error) {
        showToast('Failed to force exit: ' + (error.message || 'Unknown error'), 'error');
    }
}

async function markSlotAvailable(slotNumber) {
    if (!confirm(`Are you sure you want to mark slot ${slotNumber} as available?`)) {
        return;
    }
    
    try {
        await apiCall(`/admin/slots/${slotNumber}/mark-available`, {
            method: 'POST'
        });
        
        showToast(`Slot ${slotNumber} marked as available`, 'success');
        closeSlotModal();
        loadSlots();
        loadDashboardStats();
    } catch (error) {
        showToast('Failed to mark slot as available: ' + (error.message || 'Unknown error'), 'error');
    }
}

function showCorrectLicenseModal(slotNumber, currentLicense) {
    const newLicense = prompt(`Enter correct license plate for slot ${slotNumber}:`, currentLicense);
    if (!newLicense || newLicense.trim() === '' || newLicense === currentLicense) {
        return;
    }
    
    updateLicensePlateFromModal(slotNumber, newLicense.trim());
}

async function updateLicensePlateFromModal(slotNumber, newLicensePlate) {
    try {
        const response = await apiCall(`/admin/override/update-license?slotNumber=${slotNumber}&newLicensePlate=${encodeURIComponent(newLicensePlate)}`, {
            method: 'POST'
        });
        
        showToast(`License plate updated to ${newLicensePlate}`, 'success');
        // Refresh slot detail
        showSlotDetail(slotNumber);
        loadSlots();
    } catch (error) {
        showToast('Failed to update license plate: ' + (error.message || 'Unknown error'), 'error');
    }
}

async function reprintEntrySlip(slotNumber) {
    try {
        const record = await apiCall(`/admin/slots/${slotNumber}/entry-slip`);
        printEntrySlip(record);
    } catch (error) {
        showToast('Failed to get entry slip: ' + (error.message || 'Unknown error'), 'error');
    }
}

async function reprintExitSlip(recordId) {
    try {
        const record = await apiCall(`/admin/records/${recordId}/exit-slip`);
        printExitSlip(record);
    } catch (error) {
        showToast('Failed to get exit slip: ' + (error.message || 'Unknown error'), 'error');
    }
}

function printEntrySlip(record) {
    // Pre-format values before writing to new window
    const vehicleTypeName = getVehicleTypeName(record.vehicleType);
    const entryTime = formatDateTime(record.entryTime);
    
    const slipWindow = window.open('', '_blank');
    slipWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Entry Slip - Slot ${record.slotNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .slip { border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .detail { margin: 10px 0; }
                .label { font-weight: bold; }
                @media print {
                    body { margin: 0; padding: 10px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="slip">
                <div class="header">
                    <h2>SMART PARKING LOT</h2>
                    <h3>ENTRY SLIP</h3>
                </div>
                <div class="detail">
                    <span class="label">Slot Number:</span> ${record.slotNumber}
                </div>
                <div class="detail">
                    <span class="label">Vehicle Type:</span> ${vehicleTypeName}
                </div>
                <div class="detail">
                    <span class="label">License Plate:</span> ${record.licensePlate}
                </div>
                <div class="detail">
                    <span class="label">Entry Time:</span> ${entryTime}
                </div>
                <div style="margin-top: 20px; text-align: center; font-size: 12px;">
                    <p>Please keep this slip safe</p>
                </div>
            </div>
            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()">Print</button>
                <button onclick="window.close()">Close</button>
            </div>
        </body>
        </html>
    `);
    slipWindow.document.close();
}

function printExitSlip(record) {
    // Pre-format values before writing to new window
    const vehicleTypeName = getVehicleTypeName(record.vehicleType);
    const entryTime = formatDateTime(record.entryTime);
    const exitTime = formatDateTime(record.exitTime);
    const duration = formatDuration(record.durationMinutes);
    const charge = formatCurrency(record.charge);
    
    const slipWindow = window.open('', '_blank');
    slipWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Exit Slip - ${record.licensePlate}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .slip { border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .detail { margin: 10px 0; }
                .label { font-weight: bold; }
                .charge { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
                @media print {
                    body { margin: 0; padding: 10px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="slip">
                <div class="header">
                    <h2>SMART PARKING LOT</h2>
                    <h3>EXIT SLIP</h3>
                </div>
                <div class="detail">
                    <span class="label">Slot Number:</span> ${record.slotNumber}
                </div>
                <div class="detail">
                    <span class="label">Vehicle Type:</span> ${vehicleTypeName}
                </div>
                <div class="detail">
                    <span class="label">License Plate:</span> ${record.licensePlate}
                </div>
                <div class="detail">
                    <span class="label">Entry Time:</span> ${entryTime}
                </div>
                <div class="detail">
                    <span class="label">Exit Time:</span> ${exitTime}
                </div>
                <div class="detail">
                    <span class="label">Duration:</span> ${duration}
                </div>
                <div class="detail">
                    <span class="label">Billable Hours:</span> ${record.billableHours} hour(s)
                </div>
                <div class="charge">
                    Total Charge: ${charge}
                </div>
                <div style="margin-top: 20px; text-align: center; font-size: 12px;">
                    <p>Thank you for using Smart Parking!</p>
                </div>
            </div>
            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()">Print</button>
                <button onclick="window.close()">Close</button>
            </div>
        </body>
        </html>
    `);
    slipWindow.document.close();
}

async function showSlotHistory(slotNumber) {
    try {
        const history = await apiCall(`/admin/slots/${slotNumber}/history?limit=20`);
        // Show history in a modal or update the current modal
        const historyHtml = history.length > 0 
            ? history.map(record => `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-vehicle">${record.licensePlate}</span>
                        <span class="history-type">${getVehicleTypeName(record.vehicleType)}</span>
                    </div>
                    <div class="history-details">
                        <span><i class="fas fa-sign-in-alt"></i> ${formatDateTime(record.entryTime)}</span>
                        <span><i class="fas fa-sign-out-alt"></i> ${formatDateTime(record.exitTime)}</span>
                        <span><i class="fas fa-money-bill-wave"></i> ${formatCurrency(record.charge)}</span>
                    </div>
                    <button class="btn-link" onclick="reprintExitSlip(${record.id})">
                        <i class="fas fa-print"></i> Reprint Exit Slip
                    </button>
                </div>
            `).join('')
            : '<p class="empty-history">No parking history available for this slot.</p>';
        
        // Update the history section in the modal
        const historySection = document.querySelector('.detail-section:has(.history-list)');
        if (historySection) {
            historySection.querySelector('.history-list').innerHTML = historyHtml;
        }
    } catch (error) {
        showToast('Failed to load slot history: ' + (error.message || 'Unknown error'), 'error');
    }
}

// ============================================
// VEHICLE HISTORY
// ============================================

async function loadHistory() {
    try {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const vehicleType = document.getElementById('filterVehicleType')?.value;
        const slotNumber = document.getElementById('filterSlotNumber')?.value;
        
        let url = '/admin/history?';
        const params = [];
        if (startDate) params.push(`startDate=${startDate}T00:00:00`);
        if (endDate) params.push(`endDate=${endDate}T23:59:59`);
        if (vehicleType) params.push(`vehicleType=${vehicleType}`);
        if (slotNumber) params.push(`slotNumber=${slotNumber}`);
        
        url += params.join('&');
        
        historyData = await apiCall(url);
        renderHistoryTable();
    } catch (error) {
        showToast('Failed to load history', 'error');
    }
}

function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    
    if (historyData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = historyData.map(record => `
        <tr>
            <td>${record.licensePlate || '—'}</td>
            <td><i class="${getVehicleTypeIcon(record.vehicleType)}"></i> ${getVehicleTypeName(record.vehicleType)}</td>
            <td>${record.slotNumber}</td>
            <td>${formatDateTime(record.entryTime)}</td>
            <td>${formatDateTime(record.exitTime)}</td>
            <td>${formatDuration(record.durationMinutes)}</td>
            <td>${formatCurrency(record.charge || 0)}</td>
            <td>
                <button class="btn-icon-small" onclick="reprintSlip(${record.id})" title="Reprint Slip">
                    <i class="fas fa-print"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function applyHistoryFilters() {
    loadHistory();
}

function clearHistoryFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('filterVehicleType').value = '';
    document.getElementById('filterSlotNumber').value = '';
    loadHistory();
}

function exportHistory(format) {
    if (historyData.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    if (format === 'pdf') {
        // Simple PDF export using window.print
        showToast('PDF export - Use browser print (Ctrl+P)', 'info');
    } else if (format === 'excel') {
        // Excel export
        let csv = 'Vehicle Number,Vehicle Type,Slot Number,Entry Time,Exit Time,Duration (minutes),Charge\n';
        historyData.forEach(record => {
            csv += `"${record.licensePlate || ''}","${record.vehicleType || ''}",${record.slotNumber},"${formatDateTime(record.entryTime)}","${formatDateTime(record.exitTime)}",${record.durationMinutes || 0},${record.charge || 0}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parking_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('History exported successfully', 'success');
    }
}

function reprintSlip(recordId) {
    const record = historyData.find(r => r.id === recordId);
    if (!record) return;
    
    // Create a print window with slip content
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Parking Slip - ${record.licensePlate}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .slip-header { text-align: center; margin-bottom: 20px; }
                .slip-row { margin: 10px 0; }
                .slip-label { font-weight: bold; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="slip-header">
                <h2>Parking Exit Receipt</h2>
                <p>Smart Parking Lot System</p>
            </div>
            <div class="slip-row"><span class="slip-label">Vehicle Number:</span> ${record.licensePlate}</div>
            <div class="slip-row"><span class="slip-label">Vehicle Type:</span> ${getVehicleTypeName(record.vehicleType)}</div>
            <div class="slip-row"><span class="slip-label">Slot Number:</span> ${record.slotNumber}</div>
            <div class="slip-row"><span class="slip-label">Entry Time:</span> ${formatDateTime(record.entryTime)}</div>
            <div class="slip-row"><span class="slip-label">Exit Time:</span> ${formatDateTime(record.exitTime)}</div>
            <div class="slip-row"><span class="slip-label">Duration:</span> ${formatDuration(record.durationMinutes)}</div>
            <div class="slip-row"><span class="slip-label">Total Charge:</span> ${formatCurrency(record.charge || 0)}</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ============================================
// CHARGE MANAGEMENT
// ============================================

async function loadCharges() {
    try {
        chargesData = await apiCall('/admin/charges');
        renderCharges();
    } catch (error) {
        showToast('Failed to load charges', 'error');
    }
}

function renderCharges() {
    const grid = document.getElementById('chargesGrid');
    if (!grid) return;
    
    const vehicleTypes = ['BIKE', 'CAR', 'MICROBUS', 'TRUCK'];
    
    grid.innerHTML = vehicleTypes.map(type => {
        const charge = chargesData.find(c => c.vehicleType === type);
        const rate = charge ? charge.hourlyRate : (type === 'BIKE' ? 50 : type === 'CAR' ? 100 : type === 'MICROBUS' ? 150 : 200);
        
        return `
            <div class="charge-item">
                <div class="charge-header">
                    <i class="${getVehicleTypeIcon(type)}"></i>
                    <h3>${getVehicleTypeName(type)}</h3>
                </div>
                <div class="charge-body">
                    <div class="charge-input-group">
                        <label>Hourly Rate (BDT)</label>
                        <input type="number" id="charge_${type}" value="${rate}" min="0" step="0.01" class="form-control">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="updateCharge('${type}')">
                        <i class="fas fa-save"></i>
                        Update Rate
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function updateCharge(vehicleType) {
    try {
        const rate = parseFloat(document.getElementById(`charge_${vehicleType}`).value);
        
        if (isNaN(rate) || rate < 0) {
            showToast('Invalid rate value', 'error');
            return;
        }
        
        await apiCall(`/admin/charges/${vehicleType}?hourlyRate=${rate}`, {
            method: 'PUT'
        });
        
        showToast(`${getVehicleTypeName(vehicleType)} charge updated successfully`, 'success');
        loadCharges();
    } catch (error) {
        showToast('Failed to update charge: ' + error.message, 'error');
    }
}

// ============================================
// ANALYTICS
// ============================================

async function loadAnalytics() {
    try {
        const period = document.getElementById('analyticsPeriod')?.value || 'daily';
        await loadRevenueChart(period);
        await loadPeakHoursChart();
    } catch (error) {
        showToast('Failed to load analytics', 'error');
    }
}

async function loadRevenueChart(period) {
    try {
        const history = await apiCall('/admin/history');
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        
        // Group by period
        const data = {};
        history.forEach(record => {
            if (!record.exitTime || !record.charge) return;
            
            const date = new Date(record.exitTime);
            let key;
            
            if (period === 'daily') {
                key = date.toISOString().split('T')[0];
            } else if (period === 'weekly') {
                const week = getWeekNumber(date);
                key = `${date.getFullYear()}-W${week}`;
            } else {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
            
            data[key] = (data[key] || 0) + record.charge;
        });
        
        const labels = Object.keys(data).sort();
        const values = labels.map(key => data[key]);
        
        if (revenueChart) {
            revenueChart.destroy();
        }
        
        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue (BDT)',
                    data: values,
                    borderColor: '#FF8C42',
                    backgroundColor: 'rgba(255, 140, 66, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.error('Error loading revenue chart:', error);
    }
}

async function loadPeakHoursChart() {
    try {
        const history = await apiCall('/admin/history');
        const ctx = document.getElementById('peakHoursChart');
        if (!ctx) return;
        
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const counts = Array(24).fill(0);
        
        history.forEach(record => {
            if (record.entryTime) {
                const hour = new Date(record.entryTime).getHours();
                counts[hour]++;
            }
        });
        
        if (peakHoursChart) {
            peakHoursChart.destroy();
        }
        
        peakHoursChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours.map(h => `${h}:00`),
                datasets: [{
                    label: 'Parking Entries',
                    data: counts,
                    backgroundColor: 'rgba(255, 140, 66, 0.6)',
                    borderColor: '#FF8C42',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.error('Error loading peak hours chart:', error);
    }
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================
// MANUAL OVERRIDE
// ============================================

async function forceExitVehicle() {
    const slotNumber = parseInt(document.getElementById('forceExitSlot').value);
    
    if (!slotNumber || slotNumber < 1 || slotNumber > 20) {
        showToast('Invalid slot number', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to force exit vehicle from slot ${slotNumber}?`)) {
        return;
    }
    
    try {
        await apiCall(`/admin/override/force-exit?slotNumber=${slotNumber}`, {
            method: 'POST'
        });
        
        showToast('Vehicle force exited successfully', 'success');
        document.getElementById('forceExitSlot').value = '';
        loadSlots();
        loadDashboardStats();
    } catch (error) {
        showToast('Failed to force exit: ' + error.message, 'error');
    }
}

async function updateLicensePlate() {
    const slotNumber = parseInt(document.getElementById('updateSlotNumber').value);
    const newLicensePlate = document.getElementById('newLicensePlate').value.trim();
    
    if (!slotNumber || slotNumber < 1 || slotNumber > 20) {
        showToast('Invalid slot number', 'error');
        return;
    }
    
    if (!newLicensePlate) {
        showToast('License plate is required', 'error');
        return;
    }
    
    try {
        await apiCall(`/admin/override/update-license?slotNumber=${slotNumber}&newLicensePlate=${encodeURIComponent(newLicensePlate)}`, {
            method: 'POST'
        });
        
        showToast('License plate updated successfully', 'success');
        document.getElementById('updateSlotNumber').value = '';
        document.getElementById('newLicensePlate').value = '';
        loadSlots();
    } catch (error) {
        showToast('Failed to update license plate: ' + error.message, 'error');
    }
}

async function changeSlot() {
    const fromSlot = parseInt(document.getElementById('changeFromSlot').value);
    const toSlot = parseInt(document.getElementById('changeToSlot').value);
    
    if (!fromSlot || !toSlot || fromSlot < 1 || fromSlot > 20 || toSlot < 1 || toSlot > 20) {
        showToast('Invalid slot numbers', 'error');
        return;
    }
    
    if (fromSlot === toSlot) {
        showToast('Source and destination slots cannot be the same', 'error');
        return;
    }
    
    if (!confirm(`Move vehicle from slot ${fromSlot} to slot ${toSlot}?`)) {
        return;
    }
    
    try {
        await apiCall(`/admin/override/change-slot?slotNumber=${fromSlot}&newSlotNumber=${toSlot}`, {
            method: 'POST'
        });
        
        showToast('Slot changed successfully', 'success');
        document.getElementById('changeFromSlot').value = '';
        document.getElementById('changeToSlot').value = '';
        loadSlots();
    } catch (error) {
        showToast('Failed to change slot: ' + error.message, 'error');
    }
}

// ============================================
// TAB NAVIGATION
// ============================================

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tab = document.getElementById(`${tabName}Tab`);
    if (tab) {
        tab.classList.add('active');
    }
    
    // Add active class to clicked button
    event.target.closest('.nav-tab')?.classList.add('active');
    
    // Load data for the tab
    switch(tabName) {
        case 'dashboard':
            loadDashboardStats();
            loadActivity();
            break;
        case 'slots':
            loadSlots();
            break;
        case 'history':
            loadHistory();
            break;
        case 'charges':
            loadCharges();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// ============================================
// THEME TOGGLE
// ============================================

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-mode');
    
    if (isDark) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        document.getElementById('themeIcon').classList.remove('fa-moon');
        document.getElementById('themeIcon').classList.add('fa-sun');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        document.getElementById('themeIcon').classList.remove('fa-sun');
        document.getElementById('themeIcon').classList.add('fa-moon');
        localStorage.setItem('theme', 'dark');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        document.getElementById('themeIcon').classList.remove('fa-moon');
        document.getElementById('themeIcon').classList.add('fa-sun');
    }
}

// ============================================
// INITIALIZATION
// ============================================

function initializeDashboard() {
    // Start auto-refresh for slots (every 8 seconds)
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(() => {
        // Only refresh if slots tab is visible
        const slotsTab = document.getElementById('slotsTab');
        if (slotsTab && slotsTab.style.display !== 'none') {
            loadSlots();
        }
        // Always refresh dashboard stats
        loadDashboardStats();
    }, 8000); // 8 seconds
    loadDashboardStats();
    loadActivity();
    loadSlots();
    loadCharges();
    
    // Auto-refresh every 10 seconds
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        // Check active tab by checking display style
        const dashboardTab = document.getElementById('dashboardTab');
        const slotsTab = document.getElementById('slotsTab');
        
        if (dashboardTab && dashboardTab.style.display !== 'none') {
            loadDashboardStats();
            loadActivity();
        }
        if (slotsTab && slotsTab.style.display !== 'none') {
            loadSlots();
        }
    }, 8000); // 8 seconds refresh interval
    
    // Update time display
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
}

function updateCurrentTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    checkAuth();
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('slotModal');
        if (event.target === modal) {
            closeSlotModal();
        }
    };
});

// Make functions globally available
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.switchAuthTab = switchAuthTab;
window.handleLogout = handleLogout;
window.showTab = showTab;
window.toggleTheme = toggleTheme;
window.loadSlots = loadSlots;
window.showSlotDetail = showSlotDetail;
window.closeSlotModal = closeSlotModal;
window.loadActivity = loadActivity;
window.applyHistoryFilters = applyHistoryFilters;
window.clearHistoryFilters = clearHistoryFilters;
window.exportHistory = exportHistory;
window.reprintSlip = reprintSlip;
window.updateCharge = updateCharge;
window.loadAnalytics = loadAnalytics;
window.forceExitVehicle = forceExitVehicle;
window.updateLicensePlate = updateLicensePlate;
window.changeSlot = changeSlot;
