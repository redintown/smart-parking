package com.smartparking.smart_parking.service;

import com.smartparking.smart_parking.model.*;
import com.smartparking.smart_parking.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;


@Service
public class AdminService {
    
    @Autowired
    private AdminRepository adminRepo;
    
    @Autowired
    private ParkingChargeRepository chargeRepo;
    
    @Autowired
    private AuditLogRepository auditRepo;
    
    @Autowired
    private ParkingRecordRepository recordRepo;
    
    @Autowired
    private ParkingSlotRepository slotRepo;
    
    @Autowired
    private ParkingServiceDB parkingService;
    
    // ===================== AUTHENTICATION =====================
    
    public Admin authenticate(String username, String password) {
        Optional<Admin> adminOpt = adminRepo.findByUsernameAndActiveTrue(username);
        if (adminOpt.isPresent()) {
            Admin admin = adminOpt.get();
            // Simple password check (in production, use BCrypt or similar)
            if (admin.getPassword().equals(password)) {
                logAction(admin.getUsername(), "LOGIN", "Admin logged in", null);
                return admin;
            }
        }
        return null;
    }
    
    public Admin register(String username, String password, String fullName, String email, String role) {
        // Validate username
        if (username == null || username.trim().isEmpty()) {
            throw new RuntimeException("Username cannot be empty");
        }
        username = username.trim();
        
        // Validate password
        if (password == null || password.trim().isEmpty()) {
            throw new RuntimeException("Password cannot be empty");
        }
        if (password.length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters long");
        }
        
        // Check if username already exists
        if (adminRepo.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }
        
        // Validate and set role
        if (role == null || role.trim().isEmpty()) {
            role = "OPERATOR"; // Default to OPERATOR
        } else {
            role = role.trim().toUpperCase();
            if (!role.equals("ADMIN") && !role.equals("OPERATOR")) {
                role = "OPERATOR"; // Default to OPERATOR if invalid
            }
        }
        
        // Create new admin
        Admin admin = new Admin();
        admin.setUsername(username);
        admin.setPassword(password); // In production, hash with BCrypt
        admin.setFullName(fullName != null && !fullName.trim().isEmpty() ? fullName.trim() : null);
        admin.setEmail(email != null && !email.trim().isEmpty() ? email.trim() : null);
        admin.setRole(role);
        admin.setActive(true);
        
        try {
            Admin savedAdmin = adminRepo.save(admin);
            logAction(username, "REGISTER", "New admin registered: " + username, 
                "{\"role\":\"" + role + "\",\"fullName\":\"" + (fullName != null ? fullName : "") + "\"}");
            
            return savedAdmin;
        } catch (Exception e) {
            throw new RuntimeException("Failed to save admin: " + e.getMessage(), e);
        }
    }
    
    // ===================== DASHBOARD STATISTICS =====================
    
    public DashboardStatsDTO getDashboardStats() {
        List<ParkingSlot> allSlots = slotRepo.findAll();
        int totalSlots = allSlots.size();
        
        // Count occupied slots (slots with active parking records)
        int occupiedSlots = (int) allSlots.stream()
            .filter(slot -> {
                Optional<ParkingRecord> activeRecord = 
                    recordRepo.findBySlotNumberAndExitTimeIsNull(slot.getSlotNumber());
                return activeRecord.isPresent();
            })
            .count();
        
        int availableSlots = totalSlots - occupiedSlots;
        
        // Count currently parked vehicles
        int currentlyParkedVehicles = occupiedSlots;
        
        // Count vehicles parked today
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();
        
        List<ParkingRecord> todayRecords = recordRepo.findByDateRange(startOfDay, endOfDay);
        int vehiclesParkedToday = todayRecords.size();
        
        // Calculate today's revenue
        Double todayRevenue = recordRepo.calculateTodayRevenue(startOfDay, endOfDay);
        if (todayRevenue == null) {
            todayRevenue = 0.0;
        }
        
        return new DashboardStatsDTO(
            totalSlots,
            availableSlots,
            occupiedSlots,
            vehiclesParkedToday,
            todayRevenue,
            currentlyParkedVehicles
        );
    }
    
    // ===================== SLOT DETAILS =====================
    
    public SlotDetailDTO getSlotDetail(int slotNumber) {
        Optional<ParkingSlot> slotOpt = slotRepo.findById(slotNumber);
        if (slotOpt.isEmpty()) {
            throw new RuntimeException("Slot not found");
        }
        
        // Slot exists, now check for active record
        Optional<ParkingRecord> activeRecord = 
            recordRepo.findBySlotNumberAndExitTimeIsNull(slotNumber);
        
        if (activeRecord.isPresent()) {
            ParkingRecord record = activeRecord.get();
            LocalDateTime now = LocalDateTime.now();
            long durationMinutes = Duration.between(record.getEntryTime(), now).toMinutes();
            
            // Calculate current charge
            int billableHours = calculateBillableHours(durationMinutes);
            double hourlyRate = getHourlyRate(record.getVehicleType());
            double currentCharge = billableHours * hourlyRate;
            
            // Check if overdue (parked longer than 24 hours)
            boolean overdue = durationMinutes > (24 * 60);
            
            return new SlotDetailDTO(
                slotNumber,
                true,
                record.getLicensePlate(),
                record.getVehicleType(),
                record.getEntryTime(),
                durationMinutes,
                currentCharge,
                overdue
            );
        } else {
            return new SlotDetailDTO(
                slotNumber,
                false,
                null,
                null,
                null,
                0,
                0.0,
                false
            );
        }
    }
    
    // ===================== VEHICLE HISTORY =====================
    
    public List<ParkingRecord> getVehicleHistory(LocalDateTime startDate, LocalDateTime endDate, 
                                                 String vehicleType, Integer slotNumber) {
        List<ParkingRecord> records;
        
        if (startDate != null && endDate != null) {
            records = recordRepo.findByDateRange(startDate, endDate);
        } else {
            records = recordRepo.findByExitTimeIsNotNullOrderByExitTimeDesc();
        }
        
        // Apply filters
        if (vehicleType != null && !vehicleType.isEmpty()) {
            records = records.stream()
                .filter(r -> r.getVehicleType().equalsIgnoreCase(vehicleType))
                .collect(Collectors.toList());
        }
        
        if (slotNumber != null) {
            records = records.stream()
                .filter(r -> r.getSlotNumber() == slotNumber)
                .collect(Collectors.toList());
        }
        
        return records;
    }
    
    // ===================== CHARGE MANAGEMENT =====================
    
    public List<ParkingCharge> getAllCharges() {
        return chargeRepo.findAll();
    }
    
    public ParkingCharge getChargeByVehicleType(String vehicleType) {
        return chargeRepo.findByVehicleType(vehicleType)
            .orElse(null);
    }
    
    public ParkingCharge updateCharge(String vehicleType, double hourlyRate) {
        Optional<ParkingCharge> chargeOpt = chargeRepo.findByVehicleType(vehicleType);
        ParkingCharge charge;
        
        if (chargeOpt.isPresent()) {
            charge = chargeOpt.get();
            charge.setHourlyRate(hourlyRate);
        } else {
            charge = new ParkingCharge();
            charge.setVehicleType(vehicleType.toUpperCase());
            charge.setHourlyRate(hourlyRate);
            charge.setActive(true);
        }
        
        return chargeRepo.save(charge);
    }
    
    // ===================== MANUAL OVERRIDE =====================
    
    public ParkingRecord forceExitVehicle(int slotNumber, String adminUsername) {
        ParkingRecord record = parkingService.exitVehicleBySlot(slotNumber);
        logAction(adminUsername, "FORCE_EXIT", 
            "Force exited vehicle from slot " + slotNumber, 
            "{\"slotNumber\":" + slotNumber + "}");
        return record;
    }
    
    public ParkingRecord updateLicensePlate(int slotNumber, String newLicensePlate, String adminUsername) {
        Optional<ParkingRecord> recordOpt = 
            recordRepo.findBySlotNumberAndExitTimeIsNull(slotNumber);
        
        if (recordOpt.isEmpty()) {
            throw new RuntimeException("No active vehicle in slot " + slotNumber);
        }
        
        ParkingRecord record = recordOpt.get();
        String oldLicensePlate = record.getLicensePlate();
        record.setLicensePlate(newLicensePlate);
        recordRepo.save(record);
        
        logAction(adminUsername, "UPDATE_LICENSE_PLATE",
            "Updated license plate from " + oldLicensePlate + " to " + newLicensePlate,
            "{\"slotNumber\":" + slotNumber + ",\"oldLicensePlate\":\"" + oldLicensePlate + "\",\"newLicensePlate\":\"" + newLicensePlate + "\"}");
        
        return record;
    }
    
    public ParkingRecord changeSlot(int slotNumber, int newSlotNumber, String adminUsername) {
        Optional<ParkingRecord> recordOpt = 
            recordRepo.findBySlotNumberAndExitTimeIsNull(slotNumber);
        
        if (recordOpt.isEmpty()) {
            throw new RuntimeException("No active vehicle in slot " + slotNumber);
        }
        
        // Check if new slot is available
        Optional<ParkingRecord> newSlotRecord = 
            recordRepo.findBySlotNumberAndExitTimeIsNull(newSlotNumber);
        
        if (newSlotRecord.isPresent()) {
            throw new RuntimeException("Slot " + newSlotNumber + " is already occupied");
        }
        
        ParkingRecord record = recordOpt.get();
        record.setSlotNumber(newSlotNumber);
        recordRepo.save(record);
        
        // Update slot states
        Optional<ParkingSlot> oldSlotOpt = slotRepo.findById(slotNumber);
        Optional<ParkingSlot> newSlotOpt = slotRepo.findById(newSlotNumber);
        
        if (oldSlotOpt.isPresent()) {
            ParkingSlot oldSlot = oldSlotOpt.get();
            oldSlot.setOccupied(false);
            oldSlot.setVehicle(null);
            slotRepo.save(oldSlot);
        }
        
        if (newSlotOpt.isPresent()) {
            ParkingSlot newSlot = newSlotOpt.get();
            newSlot.setOccupied(true);
            // Note: Vehicle reference would need to be updated if we track it in slot
            slotRepo.save(newSlot);
        }
        
        logAction(adminUsername, "CHANGE_SLOT",
            "Changed slot from " + slotNumber + " to " + newSlotNumber,
            "{\"oldSlot\":" + slotNumber + ",\"newSlot\":" + newSlotNumber + "}");
        
        return record;
    }
    
    // ===================== SLOT HISTORY & ACTIONS =====================
    
    public List<ParkingRecord> getSlotHistory(int slotNumber, int limit) {
        List<ParkingRecord> records = recordRepo.findBySlotNumberAndExitTimeIsNotNullOrderByExitTimeDesc(slotNumber);
        return records.stream()
            .limit(limit)
            .collect(Collectors.toList());
    }
    
    public void markSlotAvailable(int slotNumber, String adminUsername) {
        Optional<ParkingSlot> slotOpt = slotRepo.findById(slotNumber);
        if (slotOpt.isEmpty()) {
            throw new RuntimeException("Slot " + slotNumber + " not found");
        }
        
        ParkingSlot slot = slotOpt.get();
        
        // Check if there's an active record
        Optional<ParkingRecord> activeRecord = recordRepo.findBySlotNumberAndExitTimeIsNull(slotNumber);
        if (activeRecord.isPresent()) {
            throw new RuntimeException("Cannot mark slot as available. Vehicle is still parked. Use Force Exit instead.");
        }
        
        // Mark slot as available
        slot.setOccupied(false);
        slot.setVehicle(null);
        slotRepo.save(slot);
        
        logAction(adminUsername, "MARK_SLOT_AVAILABLE",
            "Manually marked slot " + slotNumber + " as available",
            "{\"slotNumber\":" + slotNumber + "}");
    }
    
    public ParkingRecord getActiveRecordForSlot(int slotNumber) {
        Optional<ParkingRecord> recordOpt = recordRepo.findBySlotNumberAndExitTimeIsNull(slotNumber);
        return recordOpt.orElse(null);
    }
    
    public ParkingRecord getRecordById(Long recordId) {
        return recordRepo.findById(recordId).orElse(null);
    }
    
    // ===================== AUDIT LOGS =====================
    
    public List<AuditLog> getAuditLogs(String adminUsername, LocalDateTime startDate, LocalDateTime endDate) {
        if (adminUsername != null && !adminUsername.isEmpty()) {
            return auditRepo.findByAdminUsernameOrderByTimestampDesc(adminUsername);
        }
        
        if (startDate != null && endDate != null) {
            return auditRepo.findByTimestampBetweenOrderByTimestampDesc(startDate, endDate);
        }
        
        return auditRepo.findAllOrderByTimestampDesc();
    }
    
    private void logAction(String adminUsername, String action, String description, String details) {
        AuditLog log = new AuditLog();
        log.setAdminUsername(adminUsername);
        log.setAction(action);
        log.setDescription(description);
        log.setDetails(details);
        log.setTimestamp(LocalDateTime.now());
        auditRepo.save(log);
    }
    
    // ===================== HELPER METHODS =====================
    
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
    
    private double getHourlyRate(String vehicleType) {
        if (vehicleType == null) {
            return 100.0; // Default fallback
        }
        
        // Try to fetch from database
        Optional<ParkingCharge> charge = 
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
