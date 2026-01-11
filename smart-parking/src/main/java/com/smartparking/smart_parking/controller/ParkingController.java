package com.smartparking.smart_parking.controller;

import com.smartparking.smart_parking.model.ExitDTO;
import com.smartparking.smart_parking.model.ParkingRecord;
import com.smartparking.smart_parking.model.SlotDTO;
import com.smartparking.smart_parking.service.ParkingServiceDB;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/parking")
@CrossOrigin(origins = "*")
public class ParkingController {

    private final ParkingServiceDB parkingServiceDB;

    public ParkingController(ParkingServiceDB parkingServiceDB) {
        this.parkingServiceDB = parkingServiceDB;
    }

    // ================= PARK VEHICLE =================
    @PostMapping("/park")
    public ResponseEntity<?> park(
            @RequestParam String licensePlate,
            @RequestParam String vehicleType,
            @RequestParam(required = false) Integer preferredSlot) {

        try {
            ParkingRecord record;
            if (preferredSlot != null && preferredSlot > 0) {
                // Try to park in the preferred slot (AI suggestion)
                record = parkingServiceDB.parkVehicleInSlot(licensePlate, vehicleType, preferredSlot);
            } else {
                // Use default behavior (find first available)
                record = parkingServiceDB.parkVehicle(licensePlate, vehicleType);
            }

            String message = vehicleType + " parked at slot "
                    + record.getSlotNumber();

            return ResponseEntity.ok(message);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================= EXIT BY SLOT =================
    @PostMapping("/exit-by-slot")
    public ResponseEntity<?> exitBySlot(@RequestParam int slotNumber) {

        try {
            ParkingRecord record =
                    parkingServiceDB.exitVehicleBySlot(slotNumber);

            ExitDTO exitDTO = new ExitDTO(
                    record.getVehicleType(),
                    record.getLicensePlate(),
                    record.getSlotNumber(),
                    record.getEntryTime(),
                    record.getExitTime(),
                    record.getDurationMinutes(),
                    record.getBillableHours(),
                    record.getCharge()
            );

            return ResponseEntity.ok(exitDTO);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================= GET ALL SLOTS =================
    @GetMapping("/slots")
    public ResponseEntity<List<SlotDTO>> getAllSlots() {
        try {
            List<SlotDTO> slots = parkingServiceDB.getAllSlots();
            return ResponseEntity.ok(slots);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
