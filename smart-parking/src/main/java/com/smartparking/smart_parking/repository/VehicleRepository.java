package com.smartparking.smart_parking.repository;

import com.smartparking.smart_parking.model.VehicleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VehicleRepository
        extends JpaRepository<VehicleEntity, Long> {
    
    Optional<VehicleEntity> findByLicensePlate(String licensePlate);
}
