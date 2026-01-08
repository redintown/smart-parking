package com.smartparking.smart_parking.model;

import java.time.LocalDateTime;

public abstract class Vehicle {

    private String licensePlate;
    private LocalDateTime entryTime;

    public Vehicle(String licensePlate) {
        this.licensePlate = licensePlate;
        this.entryTime = LocalDateTime.now();
    }

    public String getLicensePlate() {
        return licensePlate;
    }

    public LocalDateTime getEntryTime() {
        return entryTime;
    }

    public abstract String getType();
}
