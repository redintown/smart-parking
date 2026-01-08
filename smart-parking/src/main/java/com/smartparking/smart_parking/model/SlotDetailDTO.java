package com.smartparking.smart_parking.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;

public class SlotDetailDTO {
    private int slotNumber;
    private boolean occupied;
    private String licensePlate;
    private String vehicleType;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime entryTime;
    
    private long durationMinutes;
    private double currentCharge;
    private boolean overdue;
    
    public SlotDetailDTO() {
    }
    
    public SlotDetailDTO(int slotNumber, boolean occupied, String licensePlate, 
                        String vehicleType, LocalDateTime entryTime, 
                        long durationMinutes, double currentCharge, boolean overdue) {
        this.slotNumber = slotNumber;
        this.occupied = occupied;
        this.licensePlate = licensePlate;
        this.vehicleType = vehicleType;
        this.entryTime = entryTime;
        this.durationMinutes = durationMinutes;
        this.currentCharge = currentCharge;
        this.overdue = overdue;
    }
    
    // Getters and Setters
    public int getSlotNumber() {
        return slotNumber;
    }
    
    public void setSlotNumber(int slotNumber) {
        this.slotNumber = slotNumber;
    }
    
    public boolean isOccupied() {
        return occupied;
    }
    
    public void setOccupied(boolean occupied) {
        this.occupied = occupied;
    }
    
    public String getLicensePlate() {
        return licensePlate;
    }
    
    public void setLicensePlate(String licensePlate) {
        this.licensePlate = licensePlate;
    }
    
    public String getVehicleType() {
        return vehicleType;
    }
    
    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }
    
    public LocalDateTime getEntryTime() {
        return entryTime;
    }
    
    public void setEntryTime(LocalDateTime entryTime) {
        this.entryTime = entryTime;
    }
    
    public long getDurationMinutes() {
        return durationMinutes;
    }
    
    public void setDurationMinutes(long durationMinutes) {
        this.durationMinutes = durationMinutes;
    }
    
    public double getCurrentCharge() {
        return currentCharge;
    }
    
    public void setCurrentCharge(double currentCharge) {
        this.currentCharge = currentCharge;
    }
    
    public boolean isOverdue() {
        return overdue;
    }
    
    public void setOverdue(boolean overdue) {
        this.overdue = overdue;
    }
}
