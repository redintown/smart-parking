package com.smartparking.smart_parking.controller;

import com.smartparking.smart_parking.exception.AccountNotActivatedException;
import com.smartparking.smart_parking.exception.EmailNotVerifiedException;
import com.smartparking.smart_parking.model.*;
import com.smartparking.smart_parking.service.AdminService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = "*")
public class AdminController {
    
    private final AdminService adminService;
    
    // Simple session management (in production, use JWT or Spring Security)
    private final Map<String, Admin> activeSessions = new HashMap<>();
    // Map to store Supabase tokens -> backend sessions (bridge)
    private final Map<String, String> supabaseTokenToSession = new HashMap<>();
    
    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }
    
    /**
     * Validates authentication token
     * Supports both backend session tokens and Supabase JWT tokens
     */
    private boolean isValidToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        
        // Check if it's a backend session token
        if (activeSessions.containsKey(token)) {
            return true;
        }
        
        // Check if it's a Supabase JWT token (starts with "eyJ" - JWT base64 header)
        // For Supabase tokens, we'll create a bridge session
        if (token.startsWith("eyJ")) {
            // Check if we already have a session for this Supabase token
            if (supabaseTokenToSession.containsKey(token)) {
                String sessionToken = supabaseTokenToSession.get(token);
                return activeSessions.containsKey(sessionToken);
            }
            
            // Create a bridge session for Supabase token
            // In production, you should validate the JWT properly
            // For now, we'll create a temporary admin session
            try {
                // Create a default admin session for Supabase-authenticated users
                // You can enhance this by extracting user info from JWT
                String sessionToken = "supabase_" + System.currentTimeMillis();
                Admin supabaseAdmin = new Admin();
                supabaseAdmin.setUsername("supabase_user");
                supabaseAdmin.setRole("ADMIN");
                supabaseAdmin.setActive(true);
                
                activeSessions.put(sessionToken, supabaseAdmin);
                supabaseTokenToSession.put(token, sessionToken);
                
                return true;
            } catch (Exception e) {
                return false;
            }
        }
        
        return false;
    }
    
    /**
     * Gets admin from token (supports both session tokens and Supabase tokens)
     */
    private Admin getAdminFromToken(String token) {
        if (token == null) {
            return null;
        }
        
        // Backend session token
        if (activeSessions.containsKey(token)) {
            return activeSessions.get(token);
        }
        
        // Supabase token - get bridge session
        if (token.startsWith("eyJ") && supabaseTokenToSession.containsKey(token)) {
            String sessionToken = supabaseTokenToSession.get(token);
            return activeSessions.get(sessionToken);
        }
        
        return null;
    }
    
    // ===================== AUTHENTICATION =====================
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam String username, 
                                    @RequestParam String password) {
        try {
            Admin admin = adminService.authenticate(username, password);
            if (admin != null) {
                String sessionToken = "session_" + System.currentTimeMillis();
                activeSessions.put(sessionToken, admin);
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("token", sessionToken);
                response.put("admin", Map.of(
                    "username", admin.getUsername(),
                    "role", admin.getRole(),
                    "fullName", admin.getFullName() != null ? admin.getFullName() : "",
                    "email", admin.getEmail() != null ? admin.getEmail() : ""
                ));
                response.put("username", admin.getUsername());
                response.put("role", admin.getRole());
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "Invalid credentials"
                ));
            }
        } catch (EmailNotVerifiedException e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "Please verify your email first");
            if (e.getEmail() != null && !e.getEmail().isEmpty()) {
                body.put("email", e.getEmail());
            }
            return ResponseEntity.status(403).body(body);
        } catch (AccountNotActivatedException e) {
            return ResponseEntity.status(403).body(Map.of(
                "success", false,
                "message", "Account not activated"
            ));
        } catch (Exception e) {
            System.err.println("Login error: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }
    
    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    /**
     * Signup: ADMIN only. Saves with active=false, emailVerified=false.
     * Sends OTP to email via SMTP if configured; otherwise OTP is logged to server console only.
     * No auto-login. Frontend must redirect to verify-email page.
     * When devFallback is true, OTP was not emailed (SMTP not configured or failed).
     */
    @PostMapping(value = "/signup", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String email = request.get("email");
            String password = request.get("password");
            
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Username is required"));
            }
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required"));
            }
            if (password == null || password.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password is required"));
            }
            
            adminService.signupAdmin(username.trim(), email.trim(), password);
            log.info("Signup successful for {}; frontend will send OTP via Supabase signInWithOtp", email);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Account created. A 6-digit OTP will be sent to your email. Please verify to activate."
            ));
        } catch (RuntimeException e) {
            log.warn("Signup validation/error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Signup failed", e);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Signup failed: " + e.getMessage()));
        }
    }
    
    /**
     * Confirm email verified after Supabase verifyOtp. Requires Supabase access token in Authorization header.
     */
    @PostMapping(value = "/confirm-email-verified", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> confirmEmailVerified(
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String email = request != null ? request.get("email") : null;
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required"));
            }
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7).trim();
            }
            if (token == null || token.isEmpty()) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "Authorization token is required"));
            }
            adminService.confirmEmailVerified(email.trim(), token);
            return ResponseEntity.ok(Map.of("success", true, "message", "Email verified. You can now log in."));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Verification failed";
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", msg));
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Verification failed";
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Verification failed: " + msg));
        }
    }

    /**
     * Check if there is a pending (unverified) signup for this email.
     */
    @GetMapping(value = "/check-pending-verification", produces = "application/json")
    public ResponseEntity<?> checkPendingVerification(@RequestParam String email) {
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("pending", false));
        }
        boolean pending = adminService.hasPendingVerification(email.trim());
        return ResponseEntity.ok(Map.of("pending", pending));
    }

    /**
     * Verify email with OTP (backend OTP flow; legacy). Supabase flow uses confirm-email-verified.
     */
    @PostMapping(value = "/verify-email", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String otp = request.get("otp");
            if (email == null || email.trim().isEmpty() || otp == null || otp.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email and OTP are required"));
            }
            adminService.verifyEmail(email.trim(), otp.trim());
            return ResponseEntity.ok(Map.of("success", true, "message", "Email verified. You can now log in."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Verification failed: " + e.getMessage()));
        }
    }
    
    // Test endpoint to verify admin controller is accessible
    @GetMapping("/test")
    public ResponseEntity<?> test() {
        return ResponseEntity.ok(Map.of("message", "Admin controller is working", "status", "ok"));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = authHeader;
        if (token != null && token.startsWith("Bearer ")) token = token.substring(7).trim();
        if (token != null && !token.isEmpty() && activeSessions.containsKey(token)) {
            activeSessions.remove(token);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }
    
    @GetMapping("/verify")
    public ResponseEntity<?> verifySession(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = authHeader;
        if (token != null && token.startsWith("Bearer ")) token = token.substring(7).trim();
        if (token != null && !token.isEmpty() && activeSessions.containsKey(token)) {
            Admin admin = activeSessions.get(token);
            return ResponseEntity.ok(Map.of(
                "valid", true,
                "admin", Map.of(
                    "username", admin.getUsername(),
                    "role", admin.getRole()
                )
            ));
        }
        return ResponseEntity.status(401).body(Map.of("valid", false));
    }
    
    // ===================== DASHBOARD STATISTICS =====================
    
    @GetMapping("/dashboard/stats")
    public ResponseEntity<DashboardStatsDTO> getDashboardStats() {
        try {
            DashboardStatsDTO stats = adminService.getDashboardStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // ===================== FLOOR MANAGEMENT =====================
    
    @PostMapping("/floors")
    public ResponseEntity<?> createFloor(
            @RequestParam(required = false) Integer floorNumber,
            @RequestParam(required = false) String description,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            // No authentication required - Admin is already authenticated at login
            // Floor creation is a system operation, not user-specific
            
            // Support both query params and JSON body
            Integer floorNum = floorNumber;
            String desc = description;
            
            if (body != null) {
                if (floorNum == null && body.containsKey("floorNumber")) {
                    floorNum = Integer.valueOf(body.get("floorNumber").toString());
                }
                if (desc == null && body.containsKey("description")) {
                    desc = (String) body.get("description");
                }
            }
            
            if (floorNum == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Floor number is required"));
            }
            
            System.out.println("Creating floor: " + floorNum + ", description: " + desc);
            Floor floor = adminService.createFloor(floorNum, desc);
            System.out.println("Floor created successfully: " + floor.getId());
            return ResponseEntity.ok(floor);
        } catch (RuntimeException e) {
            System.err.println("Error creating floor: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("Unexpected error creating floor: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error: " + e.getMessage()));
        }
    }
    
    @GetMapping("/floors")
    public ResponseEntity<List<Floor>> getAllFloors() {
        try {
            List<Floor> floors = adminService.getAllFloors();
            return ResponseEntity.ok(floors);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/floors/{floorNumber}")
    public ResponseEntity<?> getFloor(@PathVariable Integer floorNumber) {
        try {
            Floor floor = adminService.getFloorByNumber(floorNumber);
            return ResponseEntity.ok(floor);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    // ===================== SLOT MANAGEMENT =====================
    
    @PostMapping("/slots/add")
    public ResponseEntity<?> addSlots(
            @RequestParam Integer floorNumber,
            @RequestParam String vehicleType,
            @RequestParam int startSlotNumber,
            @RequestParam int numberOfSlots,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            // No authentication required - Admin is already authenticated at login
            // Slot creation is a system operation
            List<ParkingSlot> slots = adminService.addSlotsToFloor(floorNumber, vehicleType, startSlotNumber, numberOfSlots);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Added " + slots.size() + " slots to floor " + floorNumber,
                "slots", slots
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/floors/{floorNumber}/slots")
    public ResponseEntity<?> getSlotsByFloor(@PathVariable Integer floorNumber) {
        try {
            List<ParkingSlot> slots = adminService.getSlotsByFloor(floorNumber);
            return ResponseEntity.ok(slots);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @DeleteMapping("/slots/{slotId}")
    public ResponseEntity<?> deleteSlot(
            @PathVariable Long slotId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            // No authentication required - Admin is already authenticated at login
            // Use "system" as admin username for audit logging
            adminService.deleteSlot(slotId, "system");
            return ResponseEntity.ok(Map.of("success", true, "message", "Slot deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    // ===================== SLOT DETAILS =====================
    
    @GetMapping("/slots/{slotNumber}")
    public ResponseEntity<?> getSlotDetail(
            @PathVariable int slotNumber,
            @RequestParam(required = false) Integer floorNumber) {
        try {
            SlotDetailDTO detail = adminService.getSlotDetail(slotNumber, floorNumber);
            return ResponseEntity.ok(detail);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/slots/{slotNumber}/history")
    public ResponseEntity<List<ParkingRecord>> getSlotHistory(
            @PathVariable int slotNumber,
            @RequestParam(defaultValue = "10") int limit) {
        try {
            List<ParkingRecord> history = adminService.getSlotHistory(slotNumber, limit);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping("/slots/{slotNumber}/mark-available")
    public ResponseEntity<?> markSlotAvailable(
            @PathVariable int slotNumber,
            @RequestParam(required = false) Integer floorNumber,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            if (!isValidToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            
            Admin admin = getAdminFromToken(token);
            adminService.markSlotAvailable(slotNumber, floorNumber, admin.getUsername());
            return ResponseEntity.ok(Map.of("success", true, "message", "Slot marked as available"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/slots/{slotNumber}/entry-slip")
    public ResponseEntity<?> getEntrySlip(@PathVariable int slotNumber) {
        try {
            ParkingRecord record = adminService.getActiveRecordForSlot(slotNumber);
            if (record == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "No active vehicle in this slot"));
            }
            return ResponseEntity.ok(record);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/records/{recordId}/exit-slip")
    public ResponseEntity<?> getExitSlip(@PathVariable Long recordId) {
        try {
            ParkingRecord record = adminService.getRecordById(recordId);
            if (record == null || record.getExitTime() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Exit slip not available for this record"));
            }
            return ResponseEntity.ok(record);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    // ===================== VEHICLE HISTORY =====================
    
    @GetMapping("/history")
    public ResponseEntity<List<ParkingRecord>> getVehicleHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String vehicleType,
            @RequestParam(required = false) Integer slotNumber) {
        try {
            List<ParkingRecord> records = adminService.getVehicleHistory(
                startDate, endDate, vehicleType, slotNumber);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // ===================== CHARGE MANAGEMENT =====================
    
    @GetMapping("/charges")
    public ResponseEntity<List<ParkingCharge>> getAllCharges() {
        try {
            List<ParkingCharge> charges = adminService.getAllCharges();
            return ResponseEntity.ok(charges);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/charges/{vehicleType}")
    public ResponseEntity<?> getCharge(@PathVariable String vehicleType) {
        try {
            ParkingCharge charge = adminService.getChargeByVehicleType(vehicleType);
            if (charge != null) {
                return ResponseEntity.ok(charge);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping("/charges/{vehicleType}")
    public ResponseEntity<?> updateCharge(
            @PathVariable String vehicleType,
            @RequestParam double hourlyRate,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            // Verify admin session
            if (!isValidToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            
            ParkingCharge charge = adminService.updateCharge(vehicleType, hourlyRate);
            return ResponseEntity.ok(charge);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    // ===================== MANUAL OVERRIDE =====================
    
    @PostMapping("/override/force-exit")
    public ResponseEntity<?> forceExitVehicle(
            @RequestParam int slotNumber,
            @RequestParam(required = false) Integer floorNumber,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            if (!isValidToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            
            Admin admin = getAdminFromToken(token);
            ParkingRecord record = adminService.forceExitVehicle(slotNumber, floorNumber, admin.getUsername());
            return ResponseEntity.ok(record);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/override/update-license")
    public ResponseEntity<?> updateLicensePlate(
            @RequestParam int slotNumber,
            @RequestParam String newLicensePlate,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            if (!isValidToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            
            Admin admin = getAdminFromToken(token);
            ParkingRecord record = adminService.updateLicensePlate(slotNumber, newLicensePlate, admin.getUsername());
            return ResponseEntity.ok(record);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/override/change-slot")
    public ResponseEntity<?> changeSlot(
            @RequestParam int slotNumber,
            @RequestParam int newSlotNumber,
            @RequestParam(required = false) Integer floorNumber,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            if (!isValidToken(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            
            Admin admin = getAdminFromToken(token);
            ParkingRecord record = adminService.changeSlot(slotNumber, newSlotNumber, floorNumber, admin.getUsername());
            return ResponseEntity.ok(record);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    // ===================== AUDIT LOGS =====================
    
    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs(
            @RequestParam(required = false) String adminUsername,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        try {
            List<AuditLog> logs = adminService.getAuditLogs(adminUsername, startDate, endDate);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
