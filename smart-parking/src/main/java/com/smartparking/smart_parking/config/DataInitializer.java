package com.smartparking.smart_parking.config;

import com.smartparking.smart_parking.model.Admin;
import com.smartparking.smart_parking.model.Floor;
import com.smartparking.smart_parking.model.ParkingCharge;
import com.smartparking.smart_parking.model.ParkingSlot;
import com.smartparking.smart_parking.repository.AdminRepository;
import com.smartparking.smart_parking.repository.FloorRepository;
import com.smartparking.smart_parking.repository.ParkingChargeRepository;
import com.smartparking.smart_parking.repository.ParkingSlotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private ParkingSlotRepository slotRepository;
    
    @Autowired
    private AdminRepository adminRepository;
    
    @Autowired
    private ParkingChargeRepository chargeRepository;
    
    @Autowired
    private FloorRepository floorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Initialize default floor (Floor 1) if no floors exist
        Floor defaultFloor = null;
        if (floorRepository.count() == 0) {
            defaultFloor = new Floor();
            defaultFloor.setFloorNumber(1);
            defaultFloor.setDescription("Ground Floor");
            defaultFloor = floorRepository.save(defaultFloor);
            System.out.println("Initialized default floor (Floor 1).");
        } else {
            // Get existing floor 1 or create it
            defaultFloor = floorRepository.findByFloorNumber(1)
                    .orElseGet(() -> {
                        Floor floor = new Floor();
                        floor.setFloorNumber(1);
                        floor.setDescription("Ground Floor");
                        return floorRepository.save(floor);
                    });
        }
        
        // Initialize parking slots (only if no slots exist)
        if (slotRepository.count() == 0) {
            // Create 20 slots on the default floor
            // Distribute by vehicle type: 5 bikes, 10 cars, 3 microbuses, 2 trucks
            String[] vehicleTypes = {"BIKE", "BIKE", "BIKE", "BIKE", "BIKE",
                                     "CAR", "CAR", "CAR", "CAR", "CAR", "CAR", "CAR", "CAR", "CAR", "CAR",
                                     "MICROBUS", "MICROBUS", "MICROBUS",
                                     "TRUCK", "TRUCK"};
            
            for (int i = 1; i <= 20; i++) {
                ParkingSlot slot = new ParkingSlot();
                slot.setSlotNumber(i);
                slot.setFloor(defaultFloor);
                slot.setVehicleType(vehicleTypes[i - 1]);
                slot.setOccupied(false);
                slot.setVehicle(null);
                slotRepository.save(slot);
            }
            System.out.println("Initialized 20 parking slots on Floor 1 in the database.");
        }
        
        // Initialize default admin users (pre-verified so they can login without OTP flow)
        if (adminRepository.count() == 0) {
            Admin admin = new Admin();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            admin.setFullName("System Administrator");
            admin.setEmail("admin@smartparking.com");
            admin.setActive(true);
            admin.setEmailVerified(true);
            adminRepository.save(admin);
            
            Admin operator = new Admin();
            operator.setUsername("operator");
            operator.setPassword(passwordEncoder.encode("operator123"));
            operator.setRole("OPERATOR");
            operator.setFullName("Parking Operator");
            operator.setEmail("operator@smartparking.com");
            operator.setActive(true);
            operator.setEmailVerified(true);
            adminRepository.save(operator);
            
            System.out.println("Initialized default admin users (admin/admin123, operator/operator123).");
        }
        
        // Initialize default parking charges
        if (chargeRepository.count() == 0) {
            String[] vehicleTypes = {"BIKE", "CAR", "MICROBUS", "TRUCK"};
            double[] rates = {50.0, 100.0, 150.0, 200.0};
            
            for (int i = 0; i < vehicleTypes.length; i++) {
                ParkingCharge charge = new ParkingCharge();
                charge.setVehicleType(vehicleTypes[i]);
                charge.setHourlyRate(rates[i]);
                charge.setActive(true);
                chargeRepository.save(charge);
            }
            
            System.out.println("Initialized default parking charges.");
        }
    }
}
