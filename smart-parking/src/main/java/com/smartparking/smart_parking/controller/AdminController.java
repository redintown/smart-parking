package com.smartparking.smart_parking.controller;

import com.smartparking.smart_parking.model.*;
import com.smartparking.smart_parking.service.AdminService;
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
    
    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }
    
    // ===================== AUTHENTICATION =====================
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam String username, 
                                    @RequestParam String password) {
        try {
            Admin admin = adminService.authenticate(username, password);
            if (admin != null) {
                // Generate simple session token
                String sessionToken = "session_" + System.currentTimeMillis();
                activeSessions.put(sessionToken, admin);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("token", sessionToken);
                response.put("admin", Map.of(
                    "username", admin.getUsername(),
                    "role", admin.getRole(),
                    "fullName", admin.getFullName() != null ? admin.getFullName() : ""
                ));
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "Invalid credentials"
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }
    
    @PostMapping(value = "/signup", consumes = "application/json", produces = "application/json")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> request) {
        try {
            System.out.println("Signup endpoint called with request: " + request);
            
            String username = request.get("username");
            String password = request.get("password");
            String fullName = request.getOrDefault("fullName", "");
            String email = request.getOrDefault("email", "");
            String role = request.getOrDefault("role", "OPERATOR");
            
            // Validate required fields
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Username is required"
                ));
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Password is required"
                ));
            }
            
            Admin admin = adminService.register(username.trim(), password, 
                fullName != null ? fullName.trim() : null, 
                email != null ? email.trim() : null, 
                role);
            
            // Auto-login after signup
            String sessionToken = "session_" + System.currentTimeMillis();
            activeSessions.put(sessionToken, admin);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("token", sessionToken);
            response.put("admin", Map.of(
                "username", admin.getUsername(),
                "role", admin.getRole(),
                "fullName", admin.getFullName() != null ? admin.getFullName() : ""
            ));
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            e.printStackTrace(); // Log for debugging
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "Registration failed: " + e.getMessage()
            ));
        }
    }
    
    // Test endpoint to verify admin controller is accessible
    @GetMapping("/test")
    public ResponseEntity<?> test() {
        return ResponseEntity.ok(Map.of("message", "Admin controller is working", "status", "ok"));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token != null && activeSessions.containsKey(token)) {
            activeSessions.remove(token);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }
    
    @GetMapping("/verify")
    public ResponseEntity<?> verifySession(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token != null && activeSessions.containsKey(token)) {
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
    
    // ===================== SLOT DETAILS =====================
    
    @GetMapping("/slots/{slotNumber}")
    public ResponseEntity<?> getSlotDetail(@PathVariable int slotNumber) {
        try {
            SlotDetailDTO detail = adminService.getSlotDetail(slotNumber);
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
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            if (token == null || !activeSessions.containsKey(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            
            Admin admin = activeSessions.get(token);
            adminService.markSlotAvailable(slotNumber, admin.getUsername());
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
            if (token == null || !activeSessions.containsKey(token)) {
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
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            if (token == null || !activeSessions.containsKey(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            
            Admin admin = activeSessions.get(token);
            ParkingRecord record = adminService.forceExitVehicle(slotNumber, admin.getUsername());
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
            if (token == null || !activeSessions.containsKey(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            
            Admin admin = activeSessions.get(token);
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
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            if (token == null || !activeSessions.containsKey(token)) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            
            Admin admin = activeSessions.get(token);
            ParkingRecord record = adminService.changeSlot(slotNumber, newSlotNumber, admin.getUsername());
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
