package com.smartparking.smart_parking.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;

public class SlotDTO {
    private int slotNumber;
    private boolean occupied;
    private String licensePlate;
    private String vehicleType;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime entryTime;
    
    private Long durationMinutes;
    private Integer allowedMinutes; // Allowed parking time in minutes (default: 120 = 2 hours)

    public SlotDTO(int slotNumber, boolean occupied, String licensePlate, String vehicleType) {
        this.slotNumber = slotNumber;
        this.occupied = occupied;
        this.licensePlate = licensePlate;
        this.vehicleType = vehicleType;
        this.entryTime = null;
        this.durationMinutes = null;
        this.allowedMinutes = null;
    }
    
    public SlotDTO(int slotNumber, boolean occupied, String licensePlate, String vehicleType, 
                   LocalDateTime entryTime, Long durationMinutes, Integer allowedMinutes) {
        this.slotNumber = slotNumber;
        this.occupied = occupied;
        this.licensePlate = licensePlate;
        this.vehicleType = vehicleType;
        this.entryTime = entryTime;
        this.durationMinutes = durationMinutes;
        this.allowedMinutes = allowedMinutes;
    }
    
    // Default constructor for Jackson
    public SlotDTO() {
    }

    public int getSlotNumber() {
        return slotNumber;
    }

    public boolean isOccupied() {
        return occupied;
    }

    public String getLicensePlate() {
        return licensePlate;
    }

    public String getVehicleType() {
        return vehicleType;
    }
    
    public LocalDateTime getEntryTime() {
        return entryTime;
    }
    
    public void setEntryTime(LocalDateTime entryTime) {
        this.entryTime = entryTime;
    }
    
    public Long getDurationMinutes() {
        return durationMinutes;
    }
    
    public void setDurationMinutes(Long durationMinutes) {
        this.durationMinutes = durationMinutes;
    }
    
    public Integer getAllowedMinutes() {
        return allowedMinutes;
    }
    
    public void setAllowedMinutes(Integer allowedMinutes) {
        this.allowedMinutes = allowedMinutes;
    }
}
