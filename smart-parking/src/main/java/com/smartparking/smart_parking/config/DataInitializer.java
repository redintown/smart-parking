package com.smartparking.smart_parking.config;

import com.smartparking.smart_parking.model.Admin;
import com.smartparking.smart_parking.model.ParkingCharge;
import com.smartparking.smart_parking.model.ParkingSlot;
import com.smartparking.smart_parking.repository.AdminRepository;
import com.smartparking.smart_parking.repository.ParkingChargeRepository;
import com.smartparking.smart_parking.repository.ParkingSlotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private ParkingSlotRepository slotRepository;
    
    @Autowired
    private AdminRepository adminRepository;
    
    @Autowired
    private ParkingChargeRepository chargeRepository;

    @Override
    public void run(String... args) throws Exception {
        // Initialize parking slots
        if (slotRepository.count() == 0) {
            for (int i = 1; i <= 20; i++) {
                ParkingSlot slot = new ParkingSlot();
                slot.setSlotNumber(i);
                slot.setOccupied(false);
                slot.setVehicle(null);
                slotRepository.save(slot);
            }
            System.out.println("Initialized 20 parking slots in the database.");
        }
        
        // Initialize default admin users
        if (adminRepository.count() == 0) {
            // Admin user
            Admin admin = new Admin();
            admin.setUsername("admin");
            admin.setPassword("admin123"); // In production, use BCrypt
            admin.setRole("ADMIN");
            admin.setFullName("System Administrator");
            admin.setEmail("admin@smartparking.com");
            admin.setActive(true);
            adminRepository.save(admin);
            
            // Operator user
            Admin operator = new Admin();
            operator.setUsername("operator");
            operator.setPassword("operator123");
            operator.setRole("OPERATOR");
            operator.setFullName("Parking Operator");
            operator.setEmail("operator@smartparking.com");
            operator.setActive(true);
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
