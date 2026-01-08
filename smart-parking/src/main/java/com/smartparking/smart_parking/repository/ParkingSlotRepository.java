package com.smartparking.smart_parking.repository;

import com.smartparking.smart_parking.model.ParkingSlot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingSlotRepository
        extends JpaRepository<ParkingSlot, Integer> {
}
