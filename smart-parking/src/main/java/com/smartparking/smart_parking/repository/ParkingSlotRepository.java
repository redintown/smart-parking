package com.smartparking.smart_parking.repository;

import com.smartparking.smart_parking.model.Floor;
import com.smartparking.smart_parking.model.ParkingSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {
    
    Optional<ParkingSlot> findBySlotNumberAndFloor(int slotNumber, Floor floor);
    
    boolean existsBySlotNumberAndFloor(int slotNumber, Floor floor);
    
    List<ParkingSlot> findByFloor(Floor floor);
    
    List<ParkingSlot> findByFloorOrderBySlotNumberAsc(Floor floor);
    
    List<ParkingSlot> findByFloorAndVehicleType(Floor floor, String vehicleType);
    
    Optional<ParkingSlot> findBySlotNumberAndFloorFloorNumber(int slotNumber, Integer floorNumber);
}
