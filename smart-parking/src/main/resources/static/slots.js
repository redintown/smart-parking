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
 * Checks if a vehicle has overstayed the allowed parking time
 * @param {Object} slot - Slot data object
 * @param {number} allowedMinutes - Allowed parking time in minutes (default: 120 = 2 hours)
 * @returns {Object|null} - Overstay info object or null if not overstayed
 */
function checkOverstay(slot, allowedMinutes = 120) {
    if (!slot.occupied || !slot.licensePlate) {
        return null;
    }
    
    let durationMinutes = 0;
    
    // Check if durationMinutes is provided directly
    if (slot.durationMinutes !== undefined && slot.durationMinutes !== null) {
        durationMinutes = slot.durationMinutes;
    }
    // Otherwise, calculate from entryTime if available
    else if (slot.entryTime) {
        try {
            const entryTime = new Date(slot.entryTime);
            const now = new Date();
            durationMinutes = Math.floor((now - entryTime) / (1000 * 60));
        } catch (error) {
            console.warn('Error calculating duration from entryTime:', error);
            return null;
        }
    }
    // If neither is available, cannot determine overstay
    else {
        return null;
    }
    
    // Check if overstayed
    if (durationMinutes > allowedMinutes) {
        const overstayMinutes = durationMinutes - allowedMinutes;
        return {
            isOverstayed: true,
            durationMinutes: durationMinutes,
            overstayMinutes: overstayMinutes,
            allowedMinutes: allowedMinutes
        };
    }
    
    return null;
}

/**
 * Formats overstay duration for display
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted string
 */
function formatOverstayDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
}

/**
 * Renders a single slot card
 * @param {Object} slot - Slot data object
 * @returns {string} - HTML string for the slot card
 */
function renderSlotCard(slot) {
    const isOccupied = slot.occupied;
    let statusClass = isOccupied ? 'occupied' : 'available';
    const statusText = isOccupied ? 'Occupied' : 'Available';
    
    // Check for overstay (default: 2 hours = 120 minutes)
    // Allow override via slot.allowedMinutes if provided by backend
    const allowedMinutes = slot.allowedMinutes || 120;
    const overstayInfo = checkOverstay(slot, allowedMinutes);
    
    // Add overstay class if applicable
    if (overstayInfo && overstayInfo.isOverstayed) {
        statusClass += ' overstayed';
    }
    
    let vehicleInfo = '';
    let vehicleIconContainer = '';
    let overstayWarning = '';
    let overstayLabel = '';
    let tooltipAttr = '';
    
    if (isOccupied && slot.licensePlate) {
        const vehicleIcon = getVehicleTypeIcon(slot.vehicleType);
        const vehicleName = getVehicleTypeName(slot.vehicleType);
        const vehicleTypeClass = slot.vehicleType ? slot.vehicleType.toLowerCase() : 'car';
        
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
        
        // Add vehicle icon container for animation
        vehicleIconContainer = `
            <div class="vehicle-icon-container">
                <i class="${vehicleIcon} vehicle-icon-animated visible ${vehicleTypeClass}"></i>
            </div>
        `;
        
        // Add overstay warning if applicable
        if (overstayInfo && overstayInfo.isOverstayed) {
            const overstayText = formatOverstayDuration(overstayInfo.overstayMinutes);
            tooltipAttr = `data-tooltip="Vehicle overstayed by ${overstayText}" data-overstay-minutes="${overstayInfo.overstayMinutes}"`;
            
            overstayWarning = `
                <div class="overstay-warning" title="Vehicle overstayed by ${overstayText}">
                    ⚠
                </div>
            `;
            
            overstayLabel = `
                <div class="overstay-label">OVERSTAYED</div>
            `;
        }
    }
    
    return `
        <div class="slot-card ${statusClass}" data-slot-number="${slot.slotNumber}" id="slot-${slot.slotNumber}" ${tooltipAttr}>
            <div class="slot-number">
                <i class="fas fa-parking"></i>
                <span>Slot ${slot.slotNumber}</span>
            </div>
            <div class="slot-status">${statusText}</div>
            ${vehicleInfo}
            ${vehicleIconContainer}
            ${overstayWarning}
            ${overstayLabel}
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
 * @returns {Promise} - Promise that resolves when slots are loaded
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
        
        // Return resolved promise
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading slots:', error);
        
        // Fallback to dummy data
        const dummySlots = getDummySlots();
        renderSlots(dummySlots);
        
        if (slotsGrid) {
            slotsGrid.style.opacity = '1';
        }
        
        // Return resolved promise even on error
        return Promise.resolve();
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
    
    // Auto-suggest slot when vehicle type is selected
    const vehicleTypeRadios = document.querySelectorAll('input[name="vehicleType"]');
    vehicleTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // Wait for slots to be loaded, then suggest
            const trySuggest = async () => {
                // Ensure slots are loaded first
                await loadSlots();
                // Small delay to ensure DOM is updated
                setTimeout(() => {
                    if (typeof autoSuggestSlot === 'function') {
                        autoSuggestSlot();
                    }
                }, 300);
            };
            trySuggest();
        });
    });
    
    // Also trigger suggestion when slots are loaded (if vehicle type is already selected)
    const originalLoadSlots = loadSlots;
    window.loadSlots = async function() {
        await originalLoadSlots();
        // Check if vehicle type is selected and trigger suggestion
        const vehicleTypeRadio = document.querySelector('input[name="vehicleType"]:checked');
        if (vehicleTypeRadio && typeof autoSuggestSlot === 'function') {
            setTimeout(() => {
                autoSuggestSlot();
            }, 200);
        }
    };
    
    // Clear suggestion when license plate input is focused (user is ready to park)
    const parkPlateInput = document.getElementById('parkPlate');
    if (parkPlateInput) {
        parkPlateInput.addEventListener('focus', function() {
            // Keep suggestion visible but can be cleared on park
        });
    }
});

// ============================================
// EXPORT FOR GLOBAL ACCESS
// ============================================

// ============================================
// OVERSTAY CONFIGURATION
// ============================================

/**
 * Default allowed parking time in minutes
 * Can be overridden by backend data (slot.allowedMinutes)
 */
const DEFAULT_ALLOWED_PARKING_MINUTES = 120; // 2 hours

/**
 * Updates overstay status for all slots
 * Called after slots are rendered to check for overstay conditions
 */
function updateOverstayStatus() {
    const slotCards = document.querySelectorAll('.slot-card.occupied');
    
    slotCards.forEach(slotCard => {
        const slotNumber = parseInt(slotCard.getAttribute('data-slot-number'));
        if (!slotNumber) return;
        
        // Get slot data from the rendered card
        const isOccupied = slotCard.classList.contains('occupied');
        if (!isOccupied) return;
        
        // Check if we need to update overstay status
        // This will be handled by the render function, but we can add real-time updates here
        // if needed for live duration tracking
    });
}

// ============================================
// AI-STYLE PARKING SUGGESTION SYSTEM
// ============================================

// Global variable to store the current suggested slot
let currentSuggestedSlot = null;

/**
 * Suggests the best parking slot based on intelligent rules
 * @param {string} vehicleType - The type of vehicle (CAR, BIKE, MICROBUS, TRUCK)
 * @param {Array} slots - Array of slot objects (optional, will fetch if not provided)
 * @returns {Promise<Object|null>} - Suggested slot object with reason, or null if no slots available
 */
async function suggestBestSlot(vehicleType, slots = null) {
    try {
        // Fetch slots if not provided
        if (!slots) {
            slots = await fetchSlots();
        }
        
        if (!slots || slots.length === 0) {
            return null;
        }
        
        // Filter available slots only
        const availableSlots = slots.filter(slot => !slot.occupied);
        
        if (availableSlots.length === 0) {
            return null;
        }
        
        // Score each available slot based on multiple factors
        const scoredSlots = availableSlots.map(slot => {
            let score = 0;
            const reasons = [];
            
            // Factor 1: Distance from entrance (prefer lower slot numbers - closer to entrance)
            // Slots 1-5 are closest, 6-10 are medium, 11-20 are farthest
            const distanceScore = slot.slotNumber <= 5 ? 30 : slot.slotNumber <= 10 ? 20 : 10;
            score += distanceScore;
            if (distanceScore === 30) {
                reasons.push('nearest to entrance');
            }
            
            // Factor 2: Balanced distribution (avoid clustering)
            // Check how many nearby slots are occupied
            const nearbyOccupied = slots.filter(s => 
                Math.abs(s.slotNumber - slot.slotNumber) <= 2 && 
                s.occupied && 
                s.slotNumber !== slot.slotNumber
            ).length;
            
            // Prefer slots with fewer nearby occupied slots (less congestion)
            const distributionScore = Math.max(0, 25 - (nearbyOccupied * 5));
            score += distributionScore;
            if (nearbyOccupied === 0) {
                reasons.push('isolated area');
            } else if (nearbyOccupied <= 1) {
                reasons.push('low congestion');
            }
            
            // Factor 3: Vehicle type compatibility
            // Larger vehicles prefer end slots, smaller vehicles prefer any slot
            let typeScore = 15; // Base score
            if (vehicleType === 'TRUCK' || vehicleType === 'MICROBUS') {
                // Larger vehicles prefer slots 15-20 (easier access)
                if (slot.slotNumber >= 15) {
                    typeScore = 25;
                    reasons.push('optimal for large vehicle');
                }
            } else if (vehicleType === 'BIKE') {
                // Bikes can fit anywhere, but prefer compact areas
                typeScore = 20;
                reasons.push('suitable for bike');
            } else {
                // Cars prefer middle slots (10-15)
                if (slot.slotNumber >= 10 && slot.slotNumber <= 15) {
                    typeScore = 25;
                    reasons.push('optimal for car');
                }
            }
            score += typeScore;
            
            // Factor 4: Avoid overstayed slots (if slot has overstay warning, reduce score)
            // This is handled by checking if slot would be overstayed
            // For now, we'll skip this as it requires duration data
            
            // Factor 5: Prefer slots in the middle rows (better visibility and access)
            const rowPosition = slot.slotNumber % 5 || 5;
            if (rowPosition === 3) {
                score += 10;
                reasons.push('central position');
            }
            
            return {
                slot: slot,
                score: score,
                reasons: reasons.length > 0 ? reasons : ['available slot']
            };
        });
        
        // Sort by score (highest first)
        scoredSlots.sort((a, b) => b.score - a.score);
        
        // Get the best slot
        const bestSlot = scoredSlots[0];
        
        if (!bestSlot) {
            console.log('No best slot found');
            return null;
        }
        
        // Generate intelligent reason text
        const primaryReason = bestSlot.reasons[0] || 'available slot';
        const reasonText = `Suggested because ${primaryReason}`;
        
        console.log('AI Suggestion Result:', {
            slotNumber: bestSlot.slot.slotNumber,
            score: bestSlot.score,
            reasons: bestSlot.reasons,
            reasonText: reasonText
        });
        
        const suggestion = {
            slotNumber: bestSlot.slot.slotNumber,
            slot: bestSlot.slot,
            score: bestSlot.score,
            reasons: bestSlot.reasons,
            reasonText: reasonText
        };
        
        // Store the suggested slot globally
        currentSuggestedSlot = suggestion.slotNumber;
        
        return suggestion;
        
    } catch (error) {
        console.error('Error suggesting best slot:', error);
        return null;
    }
}

/**
 * Highlights a suggested slot with animation
 * @param {number} slotNumber - The slot number to highlight
 * @param {string} reasonText - The reason for suggestion
 */
function highlightSuggestedSlot(slotNumber, reasonText) {
    try {
        console.log(`Highlighting suggested slot: ${slotNumber} - ${reasonText}`);
        
        // Remove any existing suggestions
        clearSlotSuggestion();
        
        // Wait a bit for DOM to be ready
        setTimeout(() => {
            const slotElement = document.getElementById(`slot-${slotNumber}`);
            if (!slotElement) {
                console.warn(`Slot element not found: slot-${slotNumber}. Retrying...`);
                // Retry after a short delay
                setTimeout(() => {
                    const retryElement = document.getElementById(`slot-${slotNumber}`);
                    if (retryElement) {
                        highlightSuggestedSlot(slotNumber, reasonText);
                    } else {
                        console.error(`Slot ${slotNumber} not found after retry`);
                    }
                }, 500);
                return;
            }
            
            console.log('Slot element found, adding suggestion indicators');
            
            // Add suggestion class
            slotElement.classList.add('suggested-slot');
            slotElement.setAttribute('data-suggestion-reason', reasonText);
            
            // Add suggestion indicator elements
            const suggestionLabel = document.createElement('div');
            suggestionLabel.className = 'suggestion-label';
            suggestionLabel.innerHTML = `
                <i class="fas fa-magic"></i>
                <span>Recommended</span>
            `;
            
            const suggestionArrow = document.createElement('div');
            suggestionArrow.className = 'suggestion-arrow';
            suggestionArrow.innerHTML = '<i class="fas fa-arrow-down"></i>';
            
            const suggestionReason = document.createElement('div');
            suggestionReason.className = 'suggestion-reason';
            suggestionReason.textContent = reasonText;
            
            slotElement.appendChild(suggestionLabel);
            slotElement.appendChild(suggestionArrow);
            slotElement.appendChild(suggestionReason);
            
            // Show suggestion banner in park card
            const suggestionBanner = document.getElementById('suggestionBanner');
            const suggestionMessage = document.getElementById('suggestionMessage');
            if (suggestionBanner && suggestionMessage) {
                suggestionMessage.textContent = `Slot ${slotNumber} - ${reasonText}`;
                suggestionBanner.style.display = 'block';
                console.log('Suggestion banner displayed');
            } else {
                console.warn('Suggestion banner elements not found');
            }
            
            // Scroll to suggested slot smoothly
            setTimeout(() => {
                slotElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }, 100);
        
    } catch (error) {
        console.error('Error highlighting suggested slot:', error);
    }
}

/**
 * Clears any existing slot suggestion
 */
function clearSlotSuggestion() {
    try {
        // Remove suggestion class from all slots
        const suggestedSlots = document.querySelectorAll('.suggested-slot');
        suggestedSlots.forEach(slot => {
            slot.classList.remove('suggested-slot');
            slot.removeAttribute('data-suggestion-reason');
            
            // Remove suggestion indicators
            const label = slot.querySelector('.suggestion-label');
            const arrow = slot.querySelector('.suggestion-arrow');
            const reason = slot.querySelector('.suggestion-reason');
            
            if (label) label.remove();
            if (arrow) arrow.remove();
            if (reason) reason.remove();
        });
        
        // Hide suggestion banner
        const suggestionBanner = document.getElementById('suggestionBanner');
        if (suggestionBanner) {
            suggestionBanner.style.display = 'none';
        }
        
        // Clear the stored suggested slot
        currentSuggestedSlot = null;
    } catch (error) {
        console.error('Error clearing slot suggestion:', error);
    }
}

/**
 * Gets the currently suggested slot number
 * @returns {number|null} - The suggested slot number or null
 */
function getSuggestedSlot() {
    return currentSuggestedSlot;
}

/**
 * Auto-suggests slot when vehicle type is selected
 */
async function autoSuggestSlot() {
    try {
        const vehicleTypeRadio = document.querySelector('input[name="vehicleType"]:checked');
        if (!vehicleTypeRadio) {
            clearSlotSuggestion();
            // Show manual suggestion button if no vehicle type selected
            const suggestBtn = document.getElementById('suggestBtn');
            if (suggestBtn) {
                suggestBtn.style.display = 'none';
            }
            return;
        }
        
        const vehicleType = vehicleTypeRadio.value;
        
        // Fetch current slots
        const slots = await fetchSlots();
        
        if (!slots || slots.length === 0) {
            console.warn('No slots available for suggestion');
            clearSlotSuggestion();
            return;
        }
        
        // Get suggestion
        const suggestion = await suggestBestSlot(vehicleType, slots);
        
        if (suggestion) {
            console.log('AI Suggestion:', suggestion);
            highlightSuggestedSlot(suggestion.slotNumber, suggestion.reasonText);
        } else {
            console.warn('No suggestion available (parking lot might be full)');
            clearSlotSuggestion();
        }
    } catch (error) {
        console.error('Error in auto-suggest:', error);
    }
}

/**
 * Manual trigger for suggestion (for testing/debugging)
 */
async function triggerSuggestion() {
    const vehicleTypeRadio = document.querySelector('input[name="vehicleType"]:checked');
    if (!vehicleTypeRadio) {
        alert('Please select a vehicle type first');
        return;
    }
    
    await autoSuggestSlot();
}

// Make functions available globally
window.loadSlots = loadSlots;
window.checkOverstay = checkOverstay;
window.formatOverstayDuration = formatOverstayDuration;
window.suggestBestSlot = suggestBestSlot;
window.highlightSuggestedSlot = highlightSuggestedSlot;
window.clearSlotSuggestion = clearSlotSuggestion;
window.autoSuggestSlot = autoSuggestSlot;
window.triggerSuggestion = triggerSuggestion;
window.getSuggestedSlot = getSuggestedSlot;
