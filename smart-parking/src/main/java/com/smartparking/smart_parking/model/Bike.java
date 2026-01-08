package com.smartparking.smart_parking.model;

public class Bike extends Vehicle {

    public Bike(String licensePlate) {
        super(licensePlate);
    }

    @Override
    public String getType() {
        return "BIKE";
    }
}
