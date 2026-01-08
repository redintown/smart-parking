package com.smartparking.smart_parking.service;

import com.smartparking.smart_parking.model.Slot;
import com.smartparking.smart_parking.model.Vehicle;

import java.util.ArrayList;
import java.util.List;

public class ParkingLot {

    private static ParkingLot instance;
    private List<Slot> slots;

    private ParkingLot() {
        slots = new ArrayList<>();
        // Increased capacity to support more than 15 slots (now 20)
        for (int i = 1; i <= 20; i++) {
            slots.add(new Slot(i));
        }
    }

    public static ParkingLot getInstance() {
        if (instance == null) {
            instance = new ParkingLot();
        }
        return instance;
    }

    public Slot parkVehicle(Vehicle vehicle) {
        System.out.println("ParkingLot.parkVehicle called for: " + vehicle.getLicensePlate());
        for (Slot slot : slots) {
            if (!slot.isOccupied()) {
                System.out.println("Found empty slot: " + slot.getSlotNumber());
                slot.assignVehicle(vehicle);
                System.out.println("Assigned vehicle to slot " + slot.getSlotNumber() + ". Occupied: " + slot.isOccupied());
                return slot;
            }
        }
        System.out.println("No empty slots found");
        return null;
    }

    public Slot removeVehicle(String licensePlate) {
        for (Slot slot : slots) {
            if (slot.isOccupied()
                    && slot.getVehicle().getLicensePlate().equals(licensePlate)) {
                slot.removeVehicle();
                return slot;
            }
        }
        return null;
    }

    public Slot getSlotByNumber(int slotNumber) {
        // Validate slot number range
        if (slotNumber < 1 || slotNumber > 20) {
            return null;
        }
        
        for (Slot slot : slots) {
            if (slot.getSlotNumber() == slotNumber) {
                return slot;
            }
        }
        return null;
    }

    public Slot removeVehicleBySlot(int slotNumber) {
        // Validate slot number range
        if (slotNumber < 1 || slotNumber > 20) {
            return null;
        }
        
        // Find and remove vehicle from the specific slot only
        for (Slot slot : slots) {
            if (slot.getSlotNumber() == slotNumber) {
                if (slot.isOccupied()) {
                    slot.removeVehicle();
                    return slot;
                } else {
                    // Slot exists but is not occupied
                    return null;
                }
            }
        }
        return null;
    }

    public List<Slot> getAllSlots() {
        return new ArrayList<>(slots);
    }
}
