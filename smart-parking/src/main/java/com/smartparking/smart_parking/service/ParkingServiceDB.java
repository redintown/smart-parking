package com.smartparking.smart_parking.service;

import com.smartparking.smart_parking.model.ParkingRecord;
import com.smartparking.smart_parking.model.ParkingSlot;
import com.smartparking.smart_parking.model.SlotDTO;
import com.smartparking.smart_parking.model.VehicleEntity;
import com.smartparking.smart_parking.repository.ParkingRecordRepository;
import com.smartparking.smart_parking.repository.ParkingSlotRepository;
import com.smartparking.smart_parking.repository.ParkingChargeRepository;
import com.smartparking.smart_parking.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ParkingServiceDB {

    @Autowired
    private ParkingSlotRepository slotRepo;

    @Autowired
    private VehicleRepository vehicleRepo;

    @Autowired
    private ParkingRecordRepository recordRepo;
    
    @Autowired
    private ParkingChargeRepository chargeRepo;

    // ===================== STEP 5 =====================
    // ============ PARK VEHICLE (DB BASED) =============
    @Transactional
    public ParkingRecord parkVehicle(String licensePlate, String vehicleType) {

        // 1. Find first free slot (check for active parking records as source of truth)
        ParkingSlot slot = slotRepo.findAll()
                .stream()
                .filter(s -> {
                    // Check if slot has an active parking record (exit_time IS NULL)
                    // THIS IS THE SOURCE OF TRUTH - not the slot.occupied field
                    Optional<ParkingRecord> activeRecord = recordRepo.findBySlotNumberAndExitTimeIsNull(s.getSlotNumber());
                    // Slot is free only if there's no active record
                    return activeRecord.isEmpty();
                })
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No slot available"));

        // 2. Save vehicle in DB
        VehicleEntity vehicle = new VehicleEntity();
        vehicle.setLicensePlate(licensePlate);
        vehicle.setVehicleType(vehicleType);
        vehicle.setEntryTime(LocalDateTime.now());
        vehicleRepo.save(vehicle);

        // 3. Mark slot as occupied (for consistency/caching - NOT source of truth)
        slot.setOccupied(true);
        slot.setVehicle(vehicle);
        slotRepo.save(slot);

        // 4. Create parking record (ENTRY SLIP) - THIS IS THE SOURCE OF TRUTH
        // The ParkingRecord table determines if a slot is occupied
        ParkingRecord record = new ParkingRecord();
        record.setLicensePlate(licensePlate);
        record.setVehicleType(vehicleType);
        record.setSlotNumber(slot.getSlotNumber());
        record.setEntryTime(vehicle.getEntryTime());
        // exitTime is null by default (active record)

        ParkingRecord savedRecord = recordRepo.save(record);
        System.out.println("DEBUG: Parked vehicle " + licensePlate + " in slot " + slot.getSlotNumber());
        
        return savedRecord;
    }
    
    // ============ PARK VEHICLE IN SPECIFIC SLOT (AI SUGGESTION) =============
    @Transactional
    public ParkingRecord parkVehicleInSlot(String licensePlate, String vehicleType, int preferredSlot) {
        
        // 1. Check if preferred slot exists
        Optional<ParkingSlot> slotOpt = slotRepo.findById(preferredSlot);
        if (slotOpt.isEmpty()) {
            throw new RuntimeException("Slot " + preferredSlot + " does not exist");
        }
        
        ParkingSlot slot = slotOpt.get();
        
        // 2. Check if preferred slot is available (check for active parking records as source of truth)
        Optional<ParkingRecord> activeRecord = recordRepo.findBySlotNumberAndExitTimeIsNull(preferredSlot);
        if (activeRecord.isPresent()) {
            // Slot is occupied, fall back to finding any available slot
            return parkVehicle(licensePlate, vehicleType);
        }
        
        // 3. Save vehicle in DB
        VehicleEntity vehicle = new VehicleEntity();
        vehicle.setLicensePlate(licensePlate);
        vehicle.setVehicleType(vehicleType);
        vehicle.setEntryTime(LocalDateTime.now());
        vehicleRepo.save(vehicle);

        // 4. Mark slot as occupied (ensure consistency)
        slot.setOccupied(true);
        slot.setVehicle(vehicle);
        slotRepo.save(slot);

        // 5. Create parking record (ENTRY SLIP) - THIS IS THE SOURCE OF TRUTH
        ParkingRecord record = new ParkingRecord();
        record.setLicensePlate(licensePlate);
        record.setVehicleType(vehicleType);
        record.setSlotNumber(slot.getSlotNumber());
        record.setEntryTime(vehicle.getEntryTime());
        // exitTime is null by default (active record)

        ParkingRecord savedRecord = recordRepo.save(record);
        System.out.println("DEBUG: Parked vehicle " + licensePlate + " in preferred slot " + slot.getSlotNumber());
        
        return savedRecord;
    }

    // ===================== STEP 6 =====================
    // ===== EXIT VEHICLE BY SLOT NUMBER (DB BASED) =====
    @Transactional
    public ParkingRecord exitVehicleBySlot(int slotNumber) {

        // 1. Find slot by slot number
        ParkingSlot slot = slotRepo.findById(slotNumber)
                .orElseThrow(() -> new RuntimeException("Invalid slot number"));

        // 2. Find active parking record FIRST (this is the source of truth)
        ParkingRecord record = recordRepo.findBySlotNumberAndExitTimeIsNull(slotNumber)
                .orElseThrow(() -> new RuntimeException("No vehicle found in this slot"));

        // 3. Get vehicle from the record (more reliable than from slot)
        VehicleEntity vehicle = slot.getVehicle();
        if (vehicle == null) {
            // If slot has no vehicle but record exists, try to find vehicle by license plate
            vehicle = vehicleRepo.findByLicensePlate(record.getLicensePlate())
                    .orElse(null);
        }

        // 4. Calculate time using record's entry time
        LocalDateTime exitTime = LocalDateTime.now();
        long durationMinutes = Duration.between(
                record.getEntryTime(), exitTime).toMinutes();

        // 5. Calculate billable hours (minimum 1 hour, round up to next hour)
        int billableHours = calculateBillableHours(durationMinutes);

        // 6. Calculate charge
        double hourlyRate = getHourlyRate(record.getVehicleType());
        double totalCharge = billableHours * hourlyRate;

        // 7. Update record (EXIT SLIP)
        record.setExitTime(exitTime);
        record.setDurationMinutes(durationMinutes);
        record.setBillableHours(billableHours);
        record.setCharge(totalCharge);
        recordRepo.save(record);

        // 7. Free the slot (ensure consistency - sync with record)
        slot.setOccupied(false);
        slot.setVehicle(null);
        slotRepo.save(slot);
        
        System.out.println("DEBUG: Exited vehicle from slot " + slotNumber);

        return record;
    }

    // ===================== STEP 7 =====================
    // ===== EXIT VEHICLE BY LICENSE PLATE (DB BASED) ===
    public ParkingRecord exitVehicle(String licensePlate) {
        
        // 1. Find vehicle by license plate
        VehicleEntity vehicle = vehicleRepo.findByLicensePlate(licensePlate)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        // 2. Find slot with this vehicle
        ParkingSlot slot = slotRepo.findAll()
                .stream()
                .filter(s -> s.isOccupied() && s.getVehicle() != null && 
                           s.getVehicle().getLicensePlate().equals(licensePlate))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Vehicle not found in any slot"));

        // 3. Calculate time
        LocalDateTime exitTime = LocalDateTime.now();
        long durationMinutes = Duration.between(vehicle.getEntryTime(), exitTime).toMinutes();

        // 4. Calculate billable hours (minimum 1 hour, round up to next hour)
        int billableHours = calculateBillableHours(durationMinutes);

        // 5. Find parking record
        ParkingRecord record = recordRepo.findAll()
                .stream()
                .filter(r -> r.getSlotNumber() == slot.getSlotNumber() && r.getExitTime() == null)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Parking record not found"));

        // 6. Calculate charge
        double hourlyRate = getHourlyRate(record.getVehicleType());
        double totalCharge = billableHours * hourlyRate;

        // 7. Update record
        record.setExitTime(exitTime);
        record.setDurationMinutes(durationMinutes);
        record.setBillableHours(billableHours);
        record.setCharge(totalCharge);
        recordRepo.save(record);

        // 7. Free the slot
        slot.setOccupied(false);
        slot.setVehicle(null);
        slotRepo.save(slot);

        return record;
    }

    // ===================== STEP 8 =====================
    // ========== GET ALL SLOTS (DB BASED) ==============
    // NOTE: ParkingRecord (with exit_time IS NULL) is the SOURCE OF TRUTH for slot occupancy
    // The ParkingSlot table's 'occupied' field is just for caching/consistency
    @Transactional
    public List<SlotDTO> getAllSlots() {
        try {
            // First, ensure all 20 slots exist in database (defensive check)
            List<ParkingSlot> allSlots = slotRepo.findAll();
            
            // If slots don't exist, initialize them
            if (allSlots.size() < 20) {
                for (int i = 1; i <= 20; i++) {
                    Optional<ParkingSlot> existingSlot = slotRepo.findById(i);
                    if (existingSlot.isEmpty()) {
                        ParkingSlot newSlot = new ParkingSlot();
                        newSlot.setSlotNumber(i);
                        newSlot.setOccupied(false);
                        newSlot.setVehicle(null);
                        slotRepo.save(newSlot);
                    }
                }
                // Re-fetch after initialization
                allSlots = slotRepo.findAll();
            }
            
            // Get all active parking records in one query - THIS IS THE SOURCE OF TRUTH
            // Active record = exit_time IS NULL (vehicle is still parked)
            List<ParkingRecord> activeRecords = recordRepo.findByExitTimeIsNullOrderByEntryTimeDesc();
            
            System.out.println("DEBUG: Found " + activeRecords.size() + " active parking records");
            activeRecords.forEach(record -> {
                System.out.println("  - Slot " + record.getSlotNumber() + ": " + 
                                 record.getLicensePlate() + " (" + record.getVehicleType() + ")");
            });
            
            // Create a map of slot number -> active record for O(1) lookup
            Map<Integer, ParkingRecord> activeRecordMap = activeRecords.stream()
                    .collect(Collectors.toMap(
                            ParkingRecord::getSlotNumber,
                            record -> record,
                            (existing, replacement) -> {
                                // If duplicate (shouldn't happen), log warning and keep first
                                System.err.println("WARNING: Duplicate active record for slot " + 
                                                 existing.getSlotNumber());
                                return existing;
                            }
                    ));
            
            // Process each slot - ParkingRecord is the source of truth
            List<SlotDTO> result = allSlots.stream()
                    .sorted((s1, s2) -> Integer.compare(s1.getSlotNumber(), s2.getSlotNumber()))
                    .map(slot -> {
                        // Check for active parking record (exit_time IS NULL) - SOURCE OF TRUTH
                        ParkingRecord activeRecord = activeRecordMap.get(slot.getSlotNumber());
                        
                        if (activeRecord != null) {
                            // Slot IS OCCUPIED - get data from active parking record
                            
                            // Calculate current duration
                            LocalDateTime now = LocalDateTime.now();
                            long durationMinutes = Duration.between(activeRecord.getEntryTime(), now).toMinutes();
                            
                            // Default allowed time: 2 hours (120 minutes)
                            int allowedMinutes = 120;
                            
                            // Sync slot table with record (defensive update for consistency)
                            // This ensures the slot table matches the record table
                            if (!slot.isOccupied() || slot.getVehicle() == null) {
                                slot.setOccupied(true);
                                // Try to get vehicle from record's license plate
                                Optional<VehicleEntity> vehicle = vehicleRepo.findByLicensePlate(activeRecord.getLicensePlate());
                                if (vehicle.isPresent()) {
                                    slot.setVehicle(vehicle.get());
                                }
                                slotRepo.save(slot);
                            }
                            
                            return new SlotDTO(
                                slot.getSlotNumber(), 
                                true, // OCCUPIED - from ParkingRecord
                                activeRecord.getLicensePlate(), 
                                activeRecord.getVehicleType(),
                                activeRecord.getEntryTime(),
                                durationMinutes,
                                allowedMinutes
                            );
                        } else {
                            // No active record - slot IS EMPTY
                            // Sync slot table (defensive update for consistency)
                            if (slot.isOccupied() || slot.getVehicle() != null) {
                                slot.setOccupied(false);
                                slot.setVehicle(null);
                                slotRepo.save(slot);
                            }
                            return new SlotDTO(
                                slot.getSlotNumber(), 
                                false, // NOT OCCUPIED - no active record
                                null, 
                                null,
                                null,
                                null,
                                null
                            );
                        }
                    })
                    .collect(Collectors.toList());
            
            System.out.println("DEBUG: Returning " + result.size() + " slots, " + 
                             result.stream().filter(SlotDTO::isOccupied).count() + " occupied");
            
            return result;
        } catch (Exception e) {
            // Log error and return empty list or fallback
            System.err.println("CRITICAL ERROR in getAllSlots(): " + e.getMessage());
            e.printStackTrace();
            // Return empty slots as fallback (better than crashing)
            List<SlotDTO> fallback = new ArrayList<>();
            for (int i = 1; i <= 20; i++) {
                fallback.add(new SlotDTO(i, false, null, null));
            }
            return fallback;
        }
    }

    // ===================== DEBUG METHODS =====================
    public ResponseEntity<?> debugSlot(int slotNumber) {
        ParkingSlot slot = slotRepo.findById(slotNumber)
                .orElse(null);
        
        if (slot == null) {
            return ResponseEntity.ok("Slot " + slotNumber + " does not exist");
        }
        
        StringBuilder info = new StringBuilder();
        info.append("Slot ").append(slotNumber).append(":\n");
        info.append("  Occupied: ").append(slot.isOccupied()).append("\n");
        if (slot.isOccupied() && slot.getVehicle() != null) {
            info.append("  Vehicle: ").append(slot.getVehicle().getLicensePlate()).append("\n");
            info.append("  Type: ").append(slot.getVehicle().getVehicleType()).append("\n");
        } else {
            info.append("  Vehicle: null\n");
        }
        
        return ResponseEntity.ok(info.toString());
    }
    
    public ResponseEntity<?> debugAllSlots() {
        List<ParkingSlot> allSlots = slotRepo.findAll();
        StringBuilder info = new StringBuilder();
        info.append("=== ALL SLOTS STATUS ===\n");
        info.append("Total slots: ").append(allSlots.size()).append("\n\n");
        
        for (ParkingSlot slot : allSlots) {
            info.append("Slot ").append(slot.getSlotNumber()).append(": ");
            if (slot.isOccupied() && slot.getVehicle() != null) {
                info.append("OCCUPIED - ").append(slot.getVehicle().getLicensePlate())
                    .append(" (").append(slot.getVehicle().getVehicleType()).append(")");
            } else {
                info.append("EMPTY");
            }
            info.append("\n");
        }
        
        return ResponseEntity.ok(info.toString());
    }

    // ===================== HELPER =====================
    // ============ BILLING CALCULATION ===================
    
    /**
     * Calculates billable hours based on parking duration.
     * Business Rule:
     * - Minimum charge: 1 hour (even if parked for less than 60 minutes)
     * - If duration >= 60 minutes: round UP to the next hour
     * 
     * Examples:
     * - 15 minutes → 1 hour
     * - 45 minutes → 1 hour
     * - 60 minutes → 1 hour
     * - 61 minutes → 2 hours
     * - 120 minutes → 2 hours
     * - 121 minutes → 3 hours
     * 
     * @param durationMinutes Actual parking duration in minutes
     * @return Billable hours (minimum 1, rounded up)
     */
    private int calculateBillableHours(long durationMinutes) {
        if (durationMinutes <= 0) {
            return 1; // Minimum 1 hour
        }
        if (durationMinutes < 60) {
            return 1; // Less than 1 hour → charge for 1 hour
        }
        // 60 minutes or more → round up to next hour
        return (int) Math.ceil(durationMinutes / 60.0);
    }
    
    // ============ HOURLY RATE LOGIC ===================
    // Now fetches from database, falls back to defaults if not found
    private double getHourlyRate(String vehicleType) {
        if (vehicleType == null) {
            return 100.0; // Default fallback
        }
        
        // Try to fetch from database
        Optional<com.smartparking.smart_parking.model.ParkingCharge> charge = 
            chargeRepo.findByVehicleTypeAndActiveTrue(vehicleType.toUpperCase());
        
        if (charge.isPresent()) {
            return charge.get().getHourlyRate();
        }
        
        // Fallback to default rates if not configured in database
        switch (vehicleType.toUpperCase()) {
            case "BIKE":
                return 50.0;
            case "CAR":
                return 100.0;
            case "MICROBUS":
                return 150.0;
            case "TRUCK":
                return 200.0;
            default:
                return 100.0;
        }
    }
}
