package com.smartparking.smart_parking.repository;

import com.smartparking.smart_parking.model.ParkingCharge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ParkingChargeRepository extends JpaRepository<ParkingCharge, Long> {
    Optional<ParkingCharge> findByVehicleType(String vehicleType);
    Optional<ParkingCharge> findByVehicleTypeAndActiveTrue(String vehicleType);
}
