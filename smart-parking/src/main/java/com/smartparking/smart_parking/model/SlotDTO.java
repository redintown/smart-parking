package com.smartparking.smart_parking.model;

public class SlotDTO {
    private int slotNumber;
    private boolean occupied;
    private String licensePlate;
    private String vehicleType;

    public SlotDTO(int slotNumber, boolean occupied, String licensePlate, String vehicleType) {
        this.slotNumber = slotNumber;
        this.occupied = occupied;
        this.licensePlate = licensePlate;
        this.vehicleType = vehicleType;
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
}
