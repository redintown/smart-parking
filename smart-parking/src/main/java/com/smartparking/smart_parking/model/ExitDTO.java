package com.smartparking.smart_parking.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;

public class ExitDTO {
    private String vehicleType;
    private String licensePlate;
    private int slotNumber;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime entryTime;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime exitTime;
    
    private long durationMinutes;
    private int billableHours;  // Minimum 1 hour, rounded up to next hour
    private double totalCharge;

    // Default constructor for Jackson serialization
    public ExitDTO() {
    }

    public ExitDTO(String vehicleType, String licensePlate, int slotNumber, 
                   LocalDateTime entryTime, LocalDateTime exitTime, 
                   long durationMinutes, int billableHours, double totalCharge) {
        this.vehicleType = vehicleType;
        this.licensePlate = licensePlate;
        this.slotNumber = slotNumber;
        this.entryTime = entryTime;
        this.exitTime = exitTime;
        this.durationMinutes = durationMinutes;
        this.billableHours = billableHours;
        this.totalCharge = totalCharge;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public String getLicensePlate() {
        return licensePlate;
    }

    public int getSlotNumber() {
        return slotNumber;
    }

    public LocalDateTime getEntryTime() {
        return entryTime;
    }

    public LocalDateTime getExitTime() {
        return exitTime;
    }

    public long getDurationMinutes() {
        return durationMinutes;
    }

    public int getBillableHours() {
        return billableHours;
    }

    public void setBillableHours(int billableHours) {
        this.billableHours = billableHours;
    }

    public double getTotalCharge() {
        return totalCharge;
    }
}
