package com.smartparking.smart_parking.model;

public class Slot {

    private int slotNumber;
    private boolean occupied;
    private Vehicle vehicle;

    public Slot(int slotNumber) {
        this.slotNumber = slotNumber;
        this.occupied = false;
    }

    public boolean isOccupied() {
        return occupied;
    }

    public void assignVehicle(Vehicle vehicle) {
        this.vehicle = vehicle;
        this.occupied = true;
    }

    public void removeVehicle() {
        this.vehicle = null;
        this.occupied = false;
    }

    public int getSlotNumber() {
        return slotNumber;
    }

    public Vehicle getVehicle() {
        return vehicle;
    }
}
