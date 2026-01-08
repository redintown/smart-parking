package com.smartparking.smart_parking.model;

public class Microbus extends Vehicle {

    public Microbus(String licensePlate) {
        super(licensePlate);
    }

    @Override
    public String getType() {
        return "MICROBUS";
    }
}
