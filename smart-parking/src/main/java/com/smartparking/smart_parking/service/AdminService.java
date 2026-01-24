package com.smartparking.smart_parking.service;

import com.smartparking.smart_parking.exception.AccountNotActivatedException;
import com.smartparking.smart_parking.exception.EmailNotVerifiedException;
import com.smartparking.smart_parking.model.*;
import com.smartparking.smart_parking.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
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
    private FloorRepository floorRepo;
    
    @Autowired
    private ParkingServiceDB parkingService;
    
    @Autowired
    private EmailService emailService;

    @Autowired(required = false)
    private SupabaseService supabaseService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final SecureRandom RANDOM = new SecureRandom();
    
    // ===================== AUTHENTICATION =====================
    
    /**
     * Authenticate by username and password. Blocks if email is not verified.
     * @throws EmailNotVerifiedException if credentials are valid but emailVerified is false
     */
    public Admin authenticate(String username, String password) {
        Optional<Admin> adminOpt = adminRepo.findByUsername(username);
        if (adminOpt.isEmpty()) {
            return null;
        }
        Admin admin = adminOpt.get();
        String stored = admin.getPassword();
        boolean passwordMatches = (stored != null && stored.startsWith("$2"))
            ? passwordEncoder.matches(password, stored)
            : (stored != null && stored.equals(password));
        if (!passwordMatches) {
            return null;
        }
        if (!admin.isEmailVerified()) {
            throw new EmailNotVerifiedException("Please verify your email first", admin.getEmail());
        }
        if (!admin.isActive()) {
            throw new AccountNotActivatedException("Account not activated");
        }
        logAction(admin.getUsername(), "LOGIN", "Admin logged in", null);
        return admin;
    }
    
    /**
     * Signup: ADMIN only. active=false, emailVerified=false.
     * OTP is sent by Supabase via frontend signInWithOtp; backend only creates the admin.
     * No auto-login. Frontend must call signInWithOtp then redirect to verify-email page.
     */
    @Transactional
    public Admin signupAdmin(String username, String email, String password) {
        if (username == null || username.trim().isEmpty()) {
            throw new RuntimeException("Username is required");
        }
        username = username.trim();
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }
        email = email.trim().toLowerCase();
        if (password == null || password.isEmpty()) {
            throw new RuntimeException("Password is required");
        }
        if (password.length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters long");
        }
        if (adminRepo.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }
        if (adminRepo.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already registered");
        }
        
        Admin admin = new Admin();
        admin.setUsername(username);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setEmail(email);
        admin.setRole("ADMIN");
        admin.setActive(false);
        admin.setEmailVerified(false);
        // OTP sent by Supabase (signInWithOtp) and verified via verifyOtp; no backend OTP

        Admin saved = adminRepo.save(admin);
        logAction(username, "SIGNUP", "Admin signup, email " + email + " (Supabase OTP flow)", null);
        return saved;
    }
    
    /**
     * Verify email with OTP. On success: emailVerified=true, active=true, OTP fields cleared.
     */
    @Transactional
    public void verifyEmail(String email, String otp) {
        if (email == null || email.trim().isEmpty() || otp == null || otp.trim().isEmpty()) {
            throw new RuntimeException("Email and OTP are required");
        }
        email = email.trim().toLowerCase();
        otp = otp.trim();
        if (otp.length() != 6 || !otp.matches("\\d{6}")) {
            throw new RuntimeException("Invalid OTP format");
        }
        
        Admin admin = adminRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email not found"));
        if (admin.getOtpCode() == null || admin.getOtpExpiryTime() == null) {
            throw new RuntimeException("No pending verification for this email");
        }
        if (!admin.getOtpCode().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }
        if (LocalDateTime.now().isAfter(admin.getOtpExpiryTime())) {
            throw new RuntimeException("OTP has expired. Please sign up again.");
        }
        
        admin.setEmailVerified(true);
        admin.setActive(true);
        admin.setOtpCode(null);
        admin.setOtpExpiryTime(null);
        adminRepo.save(admin);
        logAction(admin.getUsername(), "VERIFY_EMAIL", "Email verified: " + email, null);
    }

    /**
     * Confirms email as verified after Supabase verifyOtp succeeds.
     * Validates the Supabase access token and marks the Admin as emailVerified=true, active=true.
     */
    @Transactional
    public void confirmEmailVerified(String email, String supabaseAccessToken) {
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }
        email = email.trim().toLowerCase();
        if (supabaseAccessToken == null || supabaseAccessToken.trim().isEmpty()) {
            throw new RuntimeException("Authorization token is required");
        }
        if (supabaseService == null) {
            throw new RuntimeException("Supabase is not configured");
        }
        String tokenEmail = supabaseService.getUserEmailFromAccessToken(supabaseAccessToken.trim());
        if (tokenEmail == null || !tokenEmail.trim().toLowerCase().equals(email)) {
            throw new RuntimeException("Invalid or expired verification token");
        }
        Admin admin = adminRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email not found"));
        if (admin.isEmailVerified()) {
            return; // already verified
        }
        admin.setEmailVerified(true);
        admin.setActive(true);
        admin.setOtpCode(null);
        admin.setOtpExpiryTime(null);
        adminRepo.save(admin);
        logAction(admin.getUsername(), "VERIFY_EMAIL", "Email verified via Supabase: " + email, null);
    }

    /**
     * Returns true if an admin exists with this email and is not yet email-verified (pending).
     */
    public boolean hasPendingVerification(String email) {
        if (email == null || email.trim().isEmpty()) return false;
        return adminRepo.findByEmail(email.trim().toLowerCase())
                .filter(a -> !a.isEmailVerified())
                .isPresent();
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
        admin.setPassword(passwordEncoder.encode(password));
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
    
    public SlotDetailDTO getSlotDetail(int slotNumber, Integer floorNumber) {
        Optional<ParkingSlot> slotOpt;
        if (floorNumber != null) {
            slotOpt = slotRepo.findBySlotNumberAndFloorFloorNumber(slotNumber, floorNumber);
        } else {
            // Fallback: find by slot number only
            slotOpt = slotRepo.findAll()
                    .stream()
                    .filter(s -> s.getSlotNumber() == slotNumber)
                    .findFirst();
        }
        
        if (slotOpt.isEmpty()) {
            throw new RuntimeException("Slot " + slotNumber + 
                (floorNumber != null ? " on floor " + floorNumber : "") + " not found");
        }
        
        ParkingSlot slot = slotOpt.get();
        Integer slotFloorNumber = slot.getFloor() != null ? slot.getFloor().getFloorNumber() : null;
        
        // Slot exists, now check for active record
        Optional<ParkingRecord> activeRecord = 
            recordRepo.findBySlotNumberAndFloorNumberAndExitTimeIsNull(slotNumber, slotFloorNumber);
        
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
    
    public ParkingRecord forceExitVehicle(int slotNumber, Integer floorNumber, String adminUsername) {
        ParkingRecord record = parkingService.exitVehicleBySlot(slotNumber, floorNumber);
        logAction(adminUsername, "FORCE_EXIT", 
            "Force exited vehicle from slot " + slotNumber + (floorNumber != null ? " on floor " + floorNumber : ""), 
            "{\"slotNumber\":" + slotNumber + ",\"floorNumber\":" + (floorNumber != null ? floorNumber : "null") + "}");
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
    
    public ParkingRecord changeSlot(int slotNumber, int newSlotNumber, Integer floorNumber, String adminUsername) {
        // Find active record by slot and floor
        Optional<ParkingRecord> recordOpt;
        if (floorNumber != null) {
            recordOpt = recordRepo.findBySlotNumberAndFloorNumberAndExitTimeIsNull(slotNumber, floorNumber);
        } else {
            recordOpt = recordRepo.findAll()
                    .stream()
                    .filter(r -> r.getSlotNumber() == slotNumber && r.getExitTime() == null)
                    .findFirst();
        }
        
        if (recordOpt.isEmpty()) {
            throw new RuntimeException("No active vehicle in slot " + slotNumber + 
                (floorNumber != null ? " on floor " + floorNumber : ""));
        }
        
        ParkingRecord record = recordOpt.get();
        Integer recordFloorNumber = record.getFloorNumber();
        
        // Check if new slot is available
        Optional<ParkingRecord> newSlotRecord = 
            recordRepo.findBySlotNumberAndFloorNumberAndExitTimeIsNull(newSlotNumber, recordFloorNumber);
        
        if (newSlotRecord.isPresent()) {
            throw new RuntimeException("Slot " + newSlotNumber + 
                (recordFloorNumber != null ? " on floor " + recordFloorNumber : "") + " is already occupied");
        }
        
        record.setSlotNumber(newSlotNumber);
        recordRepo.save(record);
        
        // Update slot states - find by slot number and floor
        Optional<ParkingSlot> oldSlotOpt = slotRepo.findAll()
                .stream()
                .filter(s -> s.getSlotNumber() == slotNumber && 
                           (s.getFloor() != null ? s.getFloor().getFloorNumber() : null) == recordFloorNumber)
                .findFirst();
        
        Optional<ParkingSlot> newSlotOpt = slotRepo.findAll()
                .stream()
                .filter(s -> s.getSlotNumber() == newSlotNumber &&
                           (s.getFloor() != null ? s.getFloor().getFloorNumber() : null) == recordFloorNumber)
                .findFirst();
        
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
    
    public void markSlotAvailable(int slotNumber, Integer floorNumber, String adminUsername) {
        Optional<ParkingSlot> slotOpt;
        if (floorNumber != null) {
            slotOpt = slotRepo.findBySlotNumberAndFloorFloorNumber(slotNumber, floorNumber);
        } else {
            slotOpt = slotRepo.findAll()
                    .stream()
                    .filter(s -> s.getSlotNumber() == slotNumber)
                    .findFirst();
        }
        
        if (slotOpt.isEmpty()) {
            throw new RuntimeException("Slot " + slotNumber + 
                (floorNumber != null ? " on floor " + floorNumber : "") + " not found");
        }
        
        ParkingSlot slot = slotOpt.get();
        Integer slotFloorNumber = slot.getFloor() != null ? slot.getFloor().getFloorNumber() : null;
        
        // Check if there's an active record
        Optional<ParkingRecord> activeRecord = recordRepo.findBySlotNumberAndFloorNumberAndExitTimeIsNull(slotNumber, slotFloorNumber);
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
    
    // ===================== FLOOR MANAGEMENT =====================
    
    @Transactional
    public Floor createFloor(Integer floorNumber, String description) {
        // Validate floor number
        if (floorNumber == null || floorNumber < 1) {
            throw new RuntimeException("Floor number must be a positive integer");
        }
        
        // Check if floor already exists
        if (floorRepo.existsByFloorNumber(floorNumber)) {
            throw new RuntimeException("Floor " + floorNumber + " already exists");
        }
        
        Floor floor = new Floor();
        floor.setFloorNumber(floorNumber);
        floor.setDescription(description);
        
        return floorRepo.save(floor);
    }
    
    public List<Floor> getAllFloors() {
        return floorRepo.findAll().stream()
                .sorted((f1, f2) -> Integer.compare(f1.getFloorNumber(), f2.getFloorNumber()))
                .collect(Collectors.toList());
    }
    
    public Floor getFloorByNumber(Integer floorNumber) {
        return floorRepo.findByFloorNumber(floorNumber)
                .orElseThrow(() -> new RuntimeException("Floor " + floorNumber + " not found"));
    }
    
    // ===================== SLOT MANAGEMENT =====================
    
    @Transactional
    public List<ParkingSlot> addSlotsToFloor(Integer floorNumber, String vehicleType, int startSlotNumber, int numberOfSlots) {
        // Validate floor exists
        Floor floor = floorRepo.findByFloorNumber(floorNumber)
                .orElseThrow(() -> new RuntimeException("Floor " + floorNumber + " does not exist"));
        
        // Validate vehicle type
        if (vehicleType == null || vehicleType.trim().isEmpty()) {
            throw new RuntimeException("Vehicle type is required");
        }
        vehicleType = vehicleType.toUpperCase();
        
        // Validate slot numbers
        if (startSlotNumber < 1) {
            throw new RuntimeException("Start slot number must be at least 1");
        }
        if (numberOfSlots < 1) {
            throw new RuntimeException("Number of slots must be at least 1");
        }
        
        List<ParkingSlot> createdSlots = new ArrayList<>();
        
        for (int i = 0; i < numberOfSlots; i++) {
            int slotNumber = startSlotNumber + i;
            
            // Check if slot already exists on this floor
            if (slotRepo.existsBySlotNumberAndFloor(slotNumber, floor)) {
                throw new RuntimeException("Slot " + slotNumber + " already exists on floor " + floorNumber);
            }
            
            ParkingSlot slot = new ParkingSlot();
            slot.setSlotNumber(slotNumber);
            slot.setFloor(floor);
            slot.setVehicleType(vehicleType);
            slot.setOccupied(false);
            slot.setVehicle(null);
            
            createdSlots.add(slotRepo.save(slot));
        }
        
        return createdSlots;
    }
    
    public List<ParkingSlot> getSlotsByFloor(Integer floorNumber) {
        Floor floor = floorRepo.findByFloorNumber(floorNumber)
                .orElseThrow(() -> new RuntimeException("Floor " + floorNumber + " not found"));
        
        return slotRepo.findByFloorOrderBySlotNumberAsc(floor);
    }
    
    @Transactional
    public void deleteSlot(Long slotId, String adminUsername) {
        Optional<ParkingSlot> slotOpt = slotRepo.findById(slotId);
        if (slotOpt.isEmpty()) {
            throw new RuntimeException("Slot not found");
        }
        
        ParkingSlot slot = slotOpt.get();
        
        // Check if slot is occupied
        Integer floorNumber = slot.getFloor() != null ? slot.getFloor().getFloorNumber() : null;
        Optional<ParkingRecord> activeRecord = recordRepo.findBySlotNumberAndFloorNumberAndExitTimeIsNull(
            slot.getSlotNumber(), floorNumber);
        
        if (activeRecord.isPresent()) {
            throw new RuntimeException("Cannot delete occupied slot. Please exit the vehicle first.");
        }
        
        slotRepo.delete(slot);
        
        logAction(adminUsername, "DELETE_SLOT",
            "Deleted slot " + slot.getSlotNumber() + " from floor " + floorNumber,
            "{\"slotId\":" + slotId + ",\"slotNumber\":" + slot.getSlotNumber() + ",\"floorNumber\":" + floorNumber + "}");
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
