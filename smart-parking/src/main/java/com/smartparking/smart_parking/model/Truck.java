package com.smartparking.smart_parking.model;

public class Truck extends Vehicle {

    public Truck(String licensePlate) {
        super(licensePlate);
    }

    @Override
    public String getType() {
        return "TRUCK";
    }
}
