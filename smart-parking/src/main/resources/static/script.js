/**
 * Smart Parking Lot System - Frontend JavaScript
 * Handles API communication and UI interactions
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Shows an alert message with the specified type and message
 * @param {string} alertId - The ID of the alert element
 * @param {string} message - The message to display
 * @param {string} type - The alert type: 'success', 'error', or 'info'
 */
function showAlert(alertId, message, type = 'info') {
    const alertElement = document.getElementById(alertId);
    
    if (!alertElement) return;
    
    // Remove existing type classes
    alertElement.classList.remove('success', 'error', 'info');
    
    // Add the new type class
    alertElement.classList.add(type, 'show');
    alertElement.textContent = message;
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            hideAlert(alertId);
        }, 5000);
    }
}

/**
 * Hides an alert message
 * @param {string} alertId - The ID of the alert element
 */
function hideAlert(alertId) {
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
        alertElement.classList.remove('show');
    }
}

/**
 * Sets the loading state of a button
 * @param {string} buttonId - The ID of the button element
 * @param {boolean} isLoading - Whether the button should be in loading state
 */
function setButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

/**
 * Validates license plate input
 * @param {string} licensePlate - The license plate to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateLicensePlate(licensePlate) {
    if (!licensePlate || licensePlate.trim().length === 0) {
        return false;
    }
    // Allow alphanumeric characters, hyphens, and spaces
    // Adjust regex pattern based on your license plate format requirements
    return /^[A-Z0-9\s\-]+$/i.test(licensePlate.trim());
}

/**
 * Clears input field
 * @param {string} inputId - The ID of the input element
 */
function clearInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
    }
}

/**
 * Formats date/time for slip display
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
function formatEntryTime(date) {
    const options = { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
    };
    return date.toLocaleString('en-GB', options).replace(',', '');
}

/**
 * Gets vehicle type display name
 * @param {string} vehicleType - Vehicle type code
 * @returns {string} - Display name
 */
function getVehicleTypeDisplayName(vehicleType) {
    if (!vehicleType) return 'Vehicle';
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

/**
 * Parses slot number from backend response
 * @param {string} message - Backend response message
 * @returns {string|null} - Slot number or null
 */
function parseSlotNumber(message) {
    const match = message.match(/slot\s+(\d+)/i);
    return match ? match[1] : null;
}

/**
 * Shows the parking slip with data
 * @param {Object} slipData - Slip data object
 */
function showSlip(slipData) {
    const slipSection = document.getElementById('slipSection');
    if (!slipSection) return;
    
    // Update slip content
    document.getElementById('slipVehicleType').textContent = slipData.vehicleType || '—';
    document.getElementById('slipLicensePlate').textContent = slipData.licensePlate || '—';
    document.getElementById('slipEntryTime').textContent = slipData.entryTime || '—';
    document.getElementById('slipSlotNumber').textContent = slipData.slotNumber || '—';
    
    // Show the slip section
    slipSection.style.display = 'block';
    
    // Scroll to slip
    setTimeout(() => {
        slipSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

/**
 * Prints the parking slip (Entry Slip)
 * Uses CSS @media print to hide everything except the slip
 */
function printSlip() {
    console.log('printSlip() called');
    
    const slipSection = document.getElementById('slipSection');
    const exitSlipSection = document.getElementById('exitSlipSection');
    const slipCard = document.getElementById('slipCard');
    
    if (!slipSection) {
        console.error('Slip section not found');
        alert('No slip data available to print. Please park a vehicle first.');
        return;
    }
    
    if (!slipCard) {
        console.error('Slip card not found');
        alert('No slip data available to print. Please park a vehicle first.');
        return;
    }
    
    // Check if slip has data
    const hasData = slipCard.querySelector('.slip-value') && 
                    slipCard.querySelector('.slip-value').textContent.trim() !== '—';
    
    if (!hasData) {
        console.warn('Slip appears to have no data');
        alert('No slip data available to print. Please park a vehicle first.');
        return;
    }
    
    console.log('Slip data found, preparing to print...');
    
    // Ensure slip is visible (but can be off-screen)
    const originalDisplay = slipSection.style.display;
    const originalVisibility = slipSection.style.visibility;
    const originalPosition = slipSection.style.position;
    const originalLeft = slipSection.style.left;
    
    slipSection.style.display = 'block';
    slipSection.style.visibility = 'visible';
    slipSection.style.position = 'relative';
    slipSection.style.left = 'auto';
    
    // Hide exit slip if visible
    if (exitSlipSection) {
        exitSlipSection.classList.remove('print-active');
        exitSlipSection.style.display = 'none';
    }
    
    // Add print-active class to entry slip
    slipSection.classList.add('print-active');
    
    console.log('Print classes applied, triggering print dialog...');
    
    // Small delay to ensure DOM is updated
    setTimeout(function() {
        window.print();
        
        // Clean up after print dialog closes
        setTimeout(function() {
            slipSection.classList.remove('print-active');
            // Restore original styles if they were different
            if (originalDisplay === 'none') {
                slipSection.style.display = originalDisplay;
            }
            if (originalVisibility) {
                slipSection.style.visibility = originalVisibility;
            }
            if (originalPosition) {
                slipSection.style.position = originalPosition;
            }
            if (originalLeft) {
                slipSection.style.left = originalLeft;
            }
            if (exitSlipSection) {
                exitSlipSection.style.display = '';
            }
            console.log('Print cleanup completed');
        }, 100);
    }, 200);
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Parks a vehicle using the backend API
 */
async function parkVehicle() {
    const licensePlate = document.getElementById('parkPlate').value.trim();
    const alertId = 'parkAlert';
    const buttonId = 'parkBtn';
    
    // Hide previous alerts
    hideAlert(alertId);
    
    // Get selected vehicle type
    const vehicleTypeRadio = document.querySelector('input[name="vehicleType"]:checked');
    if (!vehicleTypeRadio) {
        showAlert(alertId, 'Please select a vehicle type', 'error');
        return;
    }
    const vehicleType = vehicleTypeRadio.value;
    
    // Validate input
    if (!validateLicensePlate(licensePlate)) {
        showAlert(alertId, 'Please enter a valid license plate number', 'error');
        return;
    }
    
    // Set loading state
    setButtonLoading(buttonId, true);
    
    try {
        // Check if there's a suggested slot from AI recommendation
        const suggestedSlot = typeof getSuggestedSlot === 'function' ? getSuggestedSlot() : null;
        
        // Build API URL with optional preferred slot
        let apiUrl = `/parking/park?licensePlate=${encodeURIComponent(licensePlate)}&vehicleType=${encodeURIComponent(vehicleType)}`;
        if (suggestedSlot) {
            apiUrl += `&preferredSlot=${suggestedSlot}`;
            console.log(`Using AI suggested slot: ${suggestedSlot}`);
        }
        
        // Make API call using relative URL with vehicle type and optional preferred slot
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        // Get response text regardless of status
        const data = await response.text();
        
        // Check if response is ok
        if (!response.ok) {
            // Server responded but with an error status - show the actual error message
            showAlert(alertId, data || `Server error (${response.status})`, 'error');
            return;
        }
        
        // Determine if the response indicates success or error
        // Assuming success messages don't contain certain keywords
        const isError = data.toLowerCase().includes('error') || 
                       data.toLowerCase().includes('not found') ||
                       data.toLowerCase().includes('already') ||
                       data.toLowerCase().includes('full') ||
                       data.toLowerCase().includes('invalid');
        
        if (isError) {
            showAlert(alertId, data, 'error');
        } else {
            showAlert(alertId, data, 'success');
            // Clear input on success
            clearInput('parkPlate');
            // Reset vehicle type selection
            if (vehicleTypeRadio) {
                vehicleTypeRadio.checked = false;
            }
            
            // Extract slot number
            const slotNumber = parseSlotNumber(data);
            
            // Clear any slot suggestion after successful parking
            if (typeof clearSlotSuggestion === 'function') {
                clearSlotSuggestion();
            }
            
            // Trigger entry gate animation sequence
            if (typeof openEntryGate === 'function') {
                openEntryGate(() => {
                    // After gate opens, refresh slots and trigger vehicle animation
                    if (typeof loadSlots === 'function') {
                        loadSlots();
                    }
                    
                    // Trigger vehicle entry animation after gate opens
                    if (slotNumber) {
                        try {
                            const tryAnimation = (attempts = 0) => {
                                if (attempts > 10) {
                                    console.warn('Animation failed: slot element not found after multiple attempts');
                                    // Close gate even if animation fails
                                    if (typeof closeEntryGate === 'function') {
                                        setTimeout(() => closeEntryGate(), 500);
                                    }
                                    return;
                                }
                                
                                try {
                                    const slotElement = document.getElementById(`slot-${slotNumber}`);
                                    if (slotElement && typeof animateVehicleEntry === 'function') {
                                        animateVehicleEntry(parseInt(slotNumber), vehicleType);
                                        // Close gate after vehicle enters
                                        setTimeout(() => {
                                            if (typeof closeEntryGate === 'function') {
                                                closeEntryGate();
                                            }
                                        }, 1500);
                                    } else {
                                        // Retry after a short delay
                                        setTimeout(() => tryAnimation(attempts + 1), 100);
                                    }
                                } catch (animError) {
                                    console.warn('Animation error:', animError);
                                }
                            };
                            
                            // Start trying after a short delay to allow DOM to update
                            setTimeout(() => tryAnimation(), 300);
                        } catch (error) {
                            console.warn('Error setting up animation:', error);
                            // Close gate on error
                            if (typeof closeEntryGate === 'function') {
                                setTimeout(() => closeEntryGate(), 500);
                            }
                        }
                    } else {
                        // Close gate if no slot number
                        setTimeout(() => {
                            if (typeof closeEntryGate === 'function') {
                                closeEntryGate();
                            }
                        }, 1000);
                    }
                });
            } else {
                // Fallback: just refresh slots if gate functions don't exist
                if (typeof loadSlots === 'function') {
                    loadSlots();
                }
            }
            
            // Show parking slip
            const slipData = {
                vehicleType: getVehicleTypeDisplayName(vehicleType),
                licensePlate: licensePlate,
                entryTime: formatEntryTime(new Date()),
                slotNumber: slotNumber || '—'
            };
            showSlip(slipData);
        }
        
    } catch (error) {
        console.error('Error parking vehicle:', error);
        // Only show connection error for actual network failures
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showAlert(
                alertId, 
                'Failed to connect to the server. Please check your connection and try again.', 
                'error'
            );
        } else {
            showAlert(
                alertId, 
                error.message || 'An unexpected error occurred. Please try again.', 
                'error'
            );
        }
    } finally {
        // Remove loading state
        setButtonLoading(buttonId, false);
    }
}

/**
 * Exits a vehicle by slot number using the backend API
 */
async function exitVehicleBySlot() {
    const slotNumberInput = document.getElementById('exitSlot');
    const slotNumber = slotNumberInput ? parseInt(slotNumberInput.value.trim()) : null;
    const alertId = 'exitAlert';
    const buttonId = 'exitBtn';
    
    // Hide previous alerts
    hideAlert(alertId);
    
    // Validate input
    if (!slotNumber || isNaN(slotNumber) || slotNumber < 1 || slotNumber > 20) {
        showAlert(alertId, 'Please enter a valid slot number (1-20)', 'error');
        return;
    }
    
    // Debug: Log the slot number being sent
    console.log('Attempting to exit slot number:', slotNumber, 'Type:', typeof slotNumber);
    
    // Set loading state
    setButtonLoading(buttonId, true);
    
    try {
        // Make API call using relative URL
        const url = `/parking/exit-by-slot?slotNumber=${slotNumber}`;
        console.log('Making request to:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        console.log('Response status:', response.status, 'OK:', response.ok);
        
        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }
        
        // Get response JSON
        const exitData = await response.json();
        
        // Debug: Log the response data
        console.log('Exit data received:', exitData);
        
        // Validate exit data
        if (!exitData) {
            console.error('Exit data is null or undefined');
            showAlert(alertId, 'Failed to get exit data from server', 'error');
            return;
        }
        
        // Show success message
        showAlert(
            alertId,
            `Vehicle ${exitData.licensePlate} exited from slot ${exitData.slotNumber}. Charge: ৳${exitData.charge}`,
            'success'
        );
        
        
        // Clear input on success
        if (slotNumberInput) {
            slotNumberInput.value = '';
        }
        
        // Trigger exit gate animation sequence
        if (exitData.slotNumber) {
            if (typeof openExitGate === 'function') {
                openExitGate(() => {
                    // After gate opens, trigger vehicle exit animation
                    if (typeof animateVehicleExit === 'function') {
                        try {
                            animateVehicleExit(exitData.slotNumber);
                        } catch (error) {
                            console.warn('Error during exit animation:', error);
                        }
                    }
                    
                    // Close gate after vehicle exits
                    setTimeout(() => {
                        if (typeof closeExitGate === 'function') {
                            closeExitGate();
                        }
                        // Refresh slots after gate closes
                        if (typeof loadSlots === 'function') {
                            loadSlots();
                        }
                    }, 1500);
                });
            } else {
                // Fallback: just trigger exit animation
                if (typeof animateVehicleExit === 'function') {
                    try {
                        animateVehicleExit(exitData.slotNumber);
                    } catch (error) {
                        console.warn('Error during exit animation:', error);
                    }
                }
                
                // Refresh slots visualization after animation
                if (typeof loadSlots === 'function') {
                    setTimeout(() => {
                        loadSlots();
                    }, 1000);
                }
            }
        }
        
        // Show exit slip
        try {
            showExitSlip(exitData);
        } catch (error) {
            console.error('Error showing exit slip:', error);
            showAlert(alertId, 'Exit successful but failed to display receipt. Check console for details.', 'error');
        }
        
    } catch (error) {
        console.error('Error exiting vehicle:', error);
        const errorMessage = error.message || 'Failed to connect to the server. Please check your connection and try again.';
        showAlert(alertId, errorMessage, 'error');
    } finally {
        // Remove loading state
        setButtonLoading(buttonId, false);
    }
}

/**
 * Formats date/time for display
 * @param {string} dateTimeString - ISO date string from backend
 * @returns {string} - Formatted date string
 */
function formatDateTime(dateTimeInput) {
    if (!dateTimeInput) return '—';
    
    try {
        let date;
        
        // Handle array format [year, month, day, hour, minute, second, nanosecond]
        if (Array.isArray(dateTimeInput)) {
            // LocalDateTime array format: [year, month, day, hour, minute, second, nanosecond]
            const [year, month, day, hour, minute, second] = dateTimeInput;
            date = new Date(year, month - 1, day, hour, minute, second || 0);
        } else if (typeof dateTimeInput === 'string') {
            // ISO string format
            date = new Date(dateTimeInput);
        } else {
            return '—';
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return '—';
        }
        
        const options = { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleString('en-GB', options).replace(',', '');
    } catch (e) {
        console.error('Error formatting date:', e, 'Input:', dateTimeInput);
        return '—';
    }
}

/**
 * Formats duration from minutes
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration string
 */
function formatDuration(minutes) {
    if (!minutes || minutes < 0) return '0 minutes';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
        return `${mins} minute${mins !== 1 ? 's' : ''}`;
    } else if (mins === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
        return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
    }
}

/**
 * Formats charge in BDT
 * @param {number} charge - Charge amount
 * @returns {string} - Formatted charge string
 */
function formatCharge(charge) {
    if (charge === null || charge === undefined || isNaN(charge)) {
        return '৳0.00';
    }
    return `৳${charge.toFixed(2)}`;
}

/**
 * Shows the exit slip with data
 * @param {Object} exitData - Exit data from backend
 */
function showExitSlip(exitData) {
    console.log('showExitSlip called with data:', exitData);
    
    const exitSlipSection = document.getElementById('exitSlipSection');
    if (!exitSlipSection) {
        console.error('exitSlipSection element not found');
        return;
    }
    
    // Validate exitData
    if (!exitData) {
        console.error('exitData is null or undefined');
        return;
    }
    
    try {
        // Update slip content with null checks
        const vehicleTypeEl = document.getElementById('exitSlipVehicleType');
        const licensePlateEl = document.getElementById('exitSlipLicensePlate');
        const slotNumberEl = document.getElementById('exitSlipSlotNumber');
        const entryTimeEl = document.getElementById('exitSlipEntryTime');
        const exitTimeEl = document.getElementById('exitSlipExitTime');
        const durationEl = document.getElementById('exitSlipDuration');
        const billableHoursEl = document.getElementById('exitSlipBillableHours');
        const chargeEl = document.getElementById('exitSlipCharge');
        
        if (vehicleTypeEl) {
            vehicleTypeEl.textContent = getVehicleTypeDisplayName(exitData.vehicleType) || '—';
        }
        if (licensePlateEl) {
            licensePlateEl.textContent = exitData.licensePlate || '—';
        }
        if (slotNumberEl) {
            slotNumberEl.textContent = exitData.slotNumber || '—';
        }
        if (entryTimeEl) {
            entryTimeEl.textContent = formatDateTime(exitData.entryTime) || '—';
        }
        if (exitTimeEl) {
            exitTimeEl.textContent = formatDateTime(exitData.exitTime) || '—';
        }
        if (durationEl) {
            durationEl.textContent = formatDuration(exitData.durationMinutes) || '—';
        }
        if (billableHoursEl) {
            // Display billable hours (minimum 1 hour, rounded up)
            const billableHours = exitData.billableHours || 1;
            billableHoursEl.textContent = `${billableHours} hour${billableHours !== 1 ? 's' : ''}`;
        }
        if (chargeEl) {
            chargeEl.textContent = formatCharge(exitData.totalCharge || exitData.charge) || '—';
        }
        
        // Show the slip section
        exitSlipSection.style.display = 'block';
        console.log('Exit slip section displayed');
        
        // Scroll to slip
        setTimeout(() => {
            exitSlipSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    } catch (error) {
        console.error('Error updating exit slip content:', error);
        throw error;
    }
}
/**
 * Prints the exit slip
 * Uses CSS @media print to hide everything except the slip
 */
function printExitSlip() {
    console.log('printExitSlip() called');
    
    const exitSlipSection = document.getElementById('exitSlipSection');
    const slipSection = document.getElementById('slipSection');
    const exitSlipCard = document.getElementById('exitSlipCard');
    
    if (!exitSlipSection) {
        console.error('Exit slip section not found');
        alert('No receipt data available to print. Please exit a vehicle first.');
        return;
    }
    
    if (!exitSlipCard) {
        console.error('Exit slip card not found');
        alert('No receipt data available to print. Please exit a vehicle first.');
        return;
    }
    
    // Check if slip has data
    const hasData = exitSlipCard.querySelector('.slip-value') && 
                    exitSlipCard.querySelector('.slip-value').textContent.trim() !== '—';
    
    if (!hasData) {
        console.warn('Exit slip appears to have no data');
        alert('No receipt data available to print. Please exit a vehicle first.');
        return;
    }
    
    console.log('Exit slip data found, preparing to print...');
    
    // Ensure exit slip is visible
    const originalDisplay = exitSlipSection.style.display;
    const originalVisibility = exitSlipSection.style.visibility;
    const originalPosition = exitSlipSection.style.position;
    const originalLeft = exitSlipSection.style.left;
    
    exitSlipSection.style.display = 'block';
    exitSlipSection.style.visibility = 'visible';
    exitSlipSection.style.position = 'relative';
    exitSlipSection.style.left = 'auto';
    
    // Hide entry slip if visible
    if (slipSection) {
        slipSection.classList.remove('print-active');
        slipSection.style.display = 'none';
    }
    
    // Add print-active class to exit slip
    exitSlipSection.classList.add('print-active');
    
    console.log('Print classes applied, triggering print dialog...');
    
    // Small delay to ensure DOM is updated
    setTimeout(function() {
        window.print();
        
        // Clean up after print dialog closes
        setTimeout(function() {
            exitSlipSection.classList.remove('print-active');
            // Restore original styles if they were different
            if (originalDisplay === 'none') {
                exitSlipSection.style.display = originalDisplay;
            }
            if (originalVisibility) {
                exitSlipSection.style.visibility = originalVisibility;
            }
            if (originalPosition) {
                exitSlipSection.style.position = originalPosition;
            }
            if (originalLeft) {
                exitSlipSection.style.left = originalLeft;
            }
            if (slipSection) {
                slipSection.style.display = '';
            }
            console.log('Print cleanup completed');
        }, 100);
    }, 200);
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Initialize event listeners when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Allow Enter key to submit forms
    const parkInput = document.getElementById('parkPlate');
    const exitSlotInput = document.getElementById('exitSlot');
    
    if (parkInput) {
        parkInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                parkVehicle();
            }
        });
    }
    
    if (exitSlotInput) {
        exitSlotInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                exitVehicleBySlot();
            }
        });
        
        exitSlotInput.addEventListener('input', function() {
            hideAlert('exitAlert');
        });
    }
    
    // Clear alerts when user starts typing
    if (parkInput) {
        parkInput.addEventListener('input', function() {
            hideAlert('parkAlert');
        });
    }
    
    
    // Clear alerts when vehicle type is selected
    const vehicleTypeRadios = document.querySelectorAll('input[name="vehicleType"]');
    vehicleTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            hideAlert('parkAlert');
        });
    });
    
    // Focus on first input when page loads
    if (parkInput) {
        parkInput.focus();
    }
});

// ============================================
// ERROR HANDLING
// ============================================

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    // Optionally show a generic error message to the user
});

// Global error handler for JavaScript errors
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error);
});

// ============================================
// VEHICLE ANIMATION FUNCTIONS
// ============================================

/**
 * Gets the vehicle type icon class (helper for animations)
 * Uses the function from slots.js if available, otherwise defines it here
 * @param {string} vehicleType - The vehicle type (CAR, BIKE, MICROBUS, TRUCK)
 * @returns {string} - Font Awesome icon class
 */
function getVehicleTypeIconForAnimation(vehicleType) {
    // Use the function from slots.js if available
    if (typeof getVehicleTypeIcon === 'function') {
        return getVehicleTypeIcon(vehicleType);
    }
    
    // Fallback implementation
    if (!vehicleType) return 'fas fa-car-side';
    
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
            return 'fas fa-car-side';
    }
}

/**
 * Animates a vehicle entering a parking slot
 * @param {number} slotNumber - The slot number where vehicle is parking
 * @param {string} vehicleType - The type of vehicle (CAR, BIKE, MICROBUS, TRUCK)
 */
function animateVehicleEntry(slotNumber, vehicleType) {
    try {
        if (!slotNumber) {
            console.warn('animateVehicleEntry: slotNumber is required');
            return;
        }
        
        const slotElement = document.getElementById(`slot-${slotNumber}`);
        if (!slotElement) {
            console.warn(`Slot element not found: slot-${slotNumber}. Slots may not be loaded yet.`);
            // Try again after a short delay
            setTimeout(() => {
                try {
                    const retryElement = document.getElementById(`slot-${slotNumber}`);
                    if (retryElement) {
                        animateVehicleEntry(slotNumber, vehicleType);
                    }
                } catch (error) {
                    console.warn('Error retrying animation:', error);
                }
            }, 300);
            return;
        }
        
        // Get vehicle icon class
        const vehicleIconClass = getVehicleTypeIconForAnimation(vehicleType);
        const vehicleTypeClass = vehicleType ? vehicleType.toLowerCase() : 'car';
        
        // Remove existing vehicle icon if any
        const existingIconContainer = slotElement.querySelector('.vehicle-icon-container');
        if (existingIconContainer) {
            existingIconContainer.remove();
        }
        
        // Create vehicle icon container
        const iconContainer = document.createElement('div');
        iconContainer.className = 'vehicle-icon-container';
        
        const vehicleIcon = document.createElement('i');
        vehicleIcon.className = `${vehicleIconClass} vehicle-icon-animated vehicle-entering ${vehicleTypeClass}`;
        
        iconContainer.appendChild(vehicleIcon);
        slotElement.appendChild(iconContainer);
        
        // Add animation classes to slot
        slotElement.classList.add('animating-entry', 'state-changing');
        
        // Update slot state gradually
        setTimeout(() => {
            try {
                slotElement.classList.remove('available');
                slotElement.classList.add('occupied');
            } catch (error) {
                console.warn('Error updating slot state:', error);
            }
        }, 400);
        
        // Complete animation
        setTimeout(() => {
            try {
                vehicleIcon.classList.remove('vehicle-entering');
                vehicleIcon.classList.add('vehicle-parked', 'visible');
                slotElement.classList.remove('animating-entry', 'state-changing');
            } catch (error) {
                console.warn('Error completing animation:', error);
            }
        }, 1200);
    } catch (error) {
        console.error('Error in animateVehicleEntry:', error);
    }
}

/**
 * Animates a vehicle exiting a parking slot
 * @param {number} slotNumber - The slot number where vehicle is exiting
 */
function animateVehicleExit(slotNumber) {
    try {
        if (!slotNumber) {
            console.warn('animateVehicleExit: slotNumber is required');
            return;
        }
        
        const slotElement = document.getElementById(`slot-${slotNumber}`);
        if (!slotElement) {
            console.warn(`Slot element not found: slot-${slotNumber}`);
            return;
        }
        
        const iconContainer = slotElement.querySelector('.vehicle-icon-container');
        if (!iconContainer) {
            // If no icon exists, just update the slot state
            try {
                slotElement.classList.remove('occupied');
                slotElement.classList.add('available');
            } catch (error) {
                console.warn('Error updating slot state:', error);
            }
            return;
        }
        
        const vehicleIcon = iconContainer.querySelector('.vehicle-icon-animated');
        if (!vehicleIcon) {
            return;
        }
        
        // Add animation classes
        slotElement.classList.add('animating-exit', 'state-changing');
        vehicleIcon.classList.remove('vehicle-parked', 'visible');
        vehicleIcon.classList.add('vehicle-exiting');
        
        // Update slot state gradually
        setTimeout(() => {
            try {
                slotElement.classList.remove('occupied');
                slotElement.classList.add('available');
            } catch (error) {
                console.warn('Error updating slot state:', error);
            }
        }, 300);
        
        // Remove icon after animation completes
        setTimeout(() => {
            try {
                iconContainer.remove();
                slotElement.classList.remove('animating-exit', 'state-changing');
            } catch (error) {
                console.warn('Error removing icon:', error);
            }
        }, 1000);
    } catch (error) {
        console.error('Error in animateVehicleExit:', error);
    }
}

// ============================================
// GATE CONTROL FUNCTIONS
// ============================================

/**
 * Opens the entry gate barrier
 * @param {Function} callback - Optional callback to execute after gate opens
 */
function openEntryGate(callback) {
    try {
        const barrier = document.getElementById('entryBarrier');
        const gateContainer = document.getElementById('entryGate');
        
        if (!barrier || !gateContainer) {
            console.warn('Entry gate elements not found');
            if (callback) callback();
            return;
        }
        
        // Remove any existing classes
        barrier.classList.remove('closing', 'open');
        gateContainer.classList.remove('active');
        
        // Add opening animation
        barrier.classList.add('opening');
        gateContainer.classList.add('active');
        
        // After opening animation completes, add open class
        setTimeout(() => {
            barrier.classList.remove('opening');
            barrier.classList.add('open');
            
            // Execute callback after gate is fully open
            if (callback) {
                setTimeout(() => callback(), 200);
            }
        }, 800);
    } catch (error) {
        console.error('Error opening entry gate:', error);
        if (callback) callback();
    }
}

/**
 * Closes the entry gate barrier
 */
function closeEntryGate() {
    try {
        const barrier = document.getElementById('entryBarrier');
        const gateContainer = document.getElementById('entryGate');
        
        if (!barrier || !gateContainer) {
            return;
        }
        
        // Remove open class and add closing animation
        barrier.classList.remove('open', 'opening');
        barrier.classList.add('closing');
        
        // After closing animation completes, remove all classes
        setTimeout(() => {
            barrier.classList.remove('closing', 'open');
            gateContainer.classList.remove('active');
        }, 600);
    } catch (error) {
        console.error('Error closing entry gate:', error);
    }
}

/**
 * Opens the exit gate barrier
 * @param {Function} callback - Optional callback to execute after gate opens
 */
function openExitGate(callback) {
    try {
        const barrier = document.getElementById('exitBarrier');
        const gateContainer = document.getElementById('exitGate');
        
        if (!barrier || !gateContainer) {
            console.warn('Exit gate elements not found');
            if (callback) callback();
            return;
        }
        
        // Remove any existing classes
        barrier.classList.remove('closing', 'open');
        gateContainer.classList.remove('active');
        
        // Add opening animation
        barrier.classList.add('opening');
        gateContainer.classList.add('active');
        
        // After opening animation completes, add open class
        setTimeout(() => {
            barrier.classList.remove('opening');
            barrier.classList.add('open');
            
            // Execute callback after gate is fully open
            if (callback) {
                setTimeout(() => callback(), 200);
            }
        }, 800);
    } catch (error) {
        console.error('Error opening exit gate:', error);
        if (callback) callback();
    }
}

/**
 * Closes the exit gate barrier
 */
function closeExitGate() {
    try {
        const barrier = document.getElementById('exitBarrier');
        const gateContainer = document.getElementById('exitGate');
        
        if (!barrier || !gateContainer) {
            return;
        }
        
        // Remove open class and add closing animation
        barrier.classList.remove('open', 'opening');
        barrier.classList.add('closing');
        
        // After closing animation completes, remove all classes
        setTimeout(() => {
            barrier.classList.remove('closing', 'open');
            gateContainer.classList.remove('active');
        }, 600);
    } catch (error) {
        console.error('Error closing exit gate:', error);
    }
}

// Make functions available globally
window.parkVehicle = parkVehicle;
window.printSlip = printSlip;
window.printExitSlip = printExitSlip;
window.exitVehicleBySlot = exitVehicleBySlot;
window.animateVehicleEntry = animateVehicleEntry;
window.animateVehicleExit = animateVehicleExit;
window.openEntryGate = openEntryGate;
window.closeEntryGate = closeEntryGate;
window.openExitGate = openExitGate;
window.closeExitGate = closeExitGate;
