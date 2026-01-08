package com.smartparking.smart_parking.model;

import jakarta.persistence.*;

@Entity
@Table(name = "parking_charges")
public class ParkingCharge {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String vehicleType; // CAR, BIKE, MICROBUS, TRUCK
    
    @Column(nullable = false)
    private double hourlyRate;
    
    private boolean active = true;
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getVehicleType() {
        return vehicleType;
    }
    
    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }
    
    public double getHourlyRate() {
        return hourlyRate;
    }
    
    public void setHourlyRate(double hourlyRate) {
        this.hourlyRate = hourlyRate;
    }
    
    public boolean isActive() {
        return active;
    }
    
    public void setActive(boolean active) {
        this.active = active;
    }
}
