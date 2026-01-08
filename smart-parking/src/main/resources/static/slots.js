/**
 * Parking Slots Visualization - JavaScript
 * Handles fetching and displaying parking slot status
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Gets the vehicle type icon class
 * @param {string} vehicleType - The vehicle type (CAR, BIKE, MICROBUS, TRUCK)
 * @returns {string} - Font Awesome icon class
 */
function getVehicleTypeIcon(vehicleType) {
    if (!vehicleType) return 'fas fa-question';
    
    switch (vehicleType.toUpperCase()) {
        case 'CAR':
            return 'fas fa-car-side';
        case 'BIKE':
            return 'fas fa-motorcycle';
        case 'MICROBUS':
            return 'fas fa-van-shuttle';
        case 'TRUCK':
            return 'fas fa-truck';
        default:
            return 'fas fa-car';
    }
}

/**
 * Gets the vehicle type display name
 * @param {string} vehicleType - The vehicle type
 * @returns {string} - Display name
 */
function getVehicleTypeName(vehicleType) {
    if (!vehicleType) return '';
    
    switch (vehicleType.toUpperCase()) {
        case 'CAR':
            return 'Car';
        case 'BIKE':
            return 'Bike';
        case 'MICROBUS':
            return 'Microbus';
        case 'TRUCK':
            return 'Truck';
        default:
            return vehicleType;
    }
}

// ============================================
// SLOT RENDERING
// ============================================

/**
 * Renders a single slot card
 * @param {Object} slot - Slot data object
 * @returns {string} - HTML string for the slot card
 */
function renderSlotCard(slot) {
    const isOccupied = slot.occupied;
    const statusClass = isOccupied ? 'occupied' : 'available';
    const statusText = isOccupied ? 'Occupied' : 'Available';
    
    let vehicleInfo = '';
    if (isOccupied && slot.licensePlate) {
        const vehicleIcon = getVehicleTypeIcon(slot.vehicleType);
        const vehicleName = getVehicleTypeName(slot.vehicleType);
        vehicleInfo = `
            <div class="slot-info">
                <div class="slot-vehicle-type">
                    <i class="${vehicleIcon}"></i>
                    <span>${vehicleName}</span>
                </div>
                <div style="margin-top: 0.25rem; font-size: 0.7rem; color: var(--text-secondary);">
                    ${slot.licensePlate}
                </div>
            </div>
        `;
    }
    
    return `
        <div class="slot-card ${statusClass}" data-slot-number="${slot.slotNumber}">
            <div class="slot-number">
                <i class="fas fa-parking"></i>
                <span>Slot ${slot.slotNumber}</span>
            </div>
            <div class="slot-status">${statusText}</div>
            ${vehicleInfo}
        </div>
    `;
}

/**
 * Renders all slots in the grid
 * @param {Array} slots - Array of slot objects
 */
function renderSlots(slots) {
    const slotsGrid = document.getElementById('slotsGrid');
    
    if (!slotsGrid) {
        console.error('Slots grid element not found');
        return;
    }
    
    if (!slots || slots.length === 0) {
        slotsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">No slots available</p>';
        return;
    }
    
    // Sort slots by slot number
    const sortedSlots = [...slots].sort((a, b) => a.slotNumber - b.slotNumber);
    
    // Render all slots
    slotsGrid.innerHTML = sortedSlots.map(slot => renderSlotCard(slot)).join('');
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetches slots data from the backend API
 * @returns {Promise<Array>} - Array of slot objects
 */
async function fetchSlots() {
    try {
        const response = await fetch('/parking/slots', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const slots = await response.json();
        
        // Validate slots data
        if (!Array.isArray(slots)) {
            console.warn('Invalid slots data received, using fallback');
            return getDummySlots();
        }
        
        return slots;
    } catch (error) {
        console.error('Error fetching slots:', error);
        // Return empty slots as fallback (never show false occupied states)
        console.warn('Using empty slots fallback due to API error');
        return getDummySlots();
    }
}

/**
 * Gets empty dummy slot data as fallback (all slots empty)
 * This ensures frontend never shows false occupied slots
 * @returns {Array} - Array of empty slot objects
 */
function getDummySlots() {
    // Return all slots as empty - never show false occupied states
    const slots = [];
    for (let i = 1; i <= 20; i++) {
        slots.push({
            slotNumber: i,
            occupied: false,
            licensePlate: null,
            vehicleType: null
        });
    }
    return slots;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Loads and displays parking slots
 */
async function loadSlots() {
    const refreshBtn = document.getElementById('refreshSlotsBtn');
    const slotsGrid = document.getElementById('slotsGrid');
    
    // Show loading state
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
    }
    
    if (slotsGrid) {
        slotsGrid.style.opacity = '0.5';
    }
    
    try {
        // Fetch slots from API
        const slots = await fetchSlots();
        
        // Render slots
        renderSlots(slots);
        
        // Restore opacity
        if (slotsGrid) {
            setTimeout(() => {
                slotsGrid.style.opacity = '1';
            }, 100);
        }
    } catch (error) {
        console.error('Error loading slots:', error);
        
        // Fallback to dummy data
        const dummySlots = getDummySlots();
        renderSlots(dummySlots);
        
        if (slotsGrid) {
            slotsGrid.style.opacity = '1';
        }
    } finally {
        // Remove loading state
        if (refreshBtn) {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Initialize slots visualization when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Load slots on page load
    loadSlots();
    
    // Auto-refresh slots every 5 seconds
    setInterval(loadSlots, 5000);
});

// ============================================
// EXPORT FOR GLOBAL ACCESS
// ============================================

// Make loadSlots available globally for the refresh button
window.loadSlots = loadSlots;
