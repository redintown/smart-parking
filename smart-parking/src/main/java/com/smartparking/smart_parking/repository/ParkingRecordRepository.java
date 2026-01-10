package com.smartparking.smart_parking.repository;

import com.smartparking.smart_parking.model.ParkingRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;


public interface ParkingRecordRepository
        extends JpaRepository<ParkingRecord, Long> {
    
    /**
     * Finds an active parking record (exit_time IS NULL) for a given slot number
     * @param slotNumber The slot number to search for
     * @return Optional containing the active parking record if found
     */
    Optional<ParkingRecord> findBySlotNumberAndExitTimeIsNull(int slotNumber);
    
    /**
     * Finds all completed parking records (exit_time IS NOT NULL)
     */
    List<ParkingRecord> findByExitTimeIsNotNullOrderByExitTimeDesc();
    
    /**
     * Finds all active parking records (exit_time IS NULL)
     */
    List<ParkingRecord> findByExitTimeIsNullOrderByEntryTimeDesc();
    
    /**
     * Finds records by vehicle type
     */
    List<ParkingRecord> findByVehicleTypeAndExitTimeIsNotNullOrderByExitTimeDesc(String vehicleType);
    
    /**
     * Finds records by slot number
     */
    List<ParkingRecord> findBySlotNumberAndExitTimeIsNotNullOrderByExitTimeDesc(int slotNumber);
    
    /**
     * Finds records by license plate
     */
    List<ParkingRecord> findByLicensePlateOrderByExitTimeDesc(String licensePlate);
    
    /**
     * Finds records within date range
     */
    @Query("SELECT p FROM ParkingRecord p WHERE p.entryTime >= :startDate AND p.entryTime <= :endDate AND p.exitTime IS NOT NULL ORDER BY p.exitTime DESC")
    List<ParkingRecord> findByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    /**
     * Finds records for today
     */
    @Query("""
        SELECT p FROM ParkingRecord p
        WHERE p.entryTime >= :start
          AND p.entryTime < :end
    """)
    List<ParkingRecord> findTodayRecords(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );
    
    
    /**
     * Calculates today's revenue
     */
/*    @Query("SELECT COALESCE(SUM(p.charge), 0) FROM ParkingRecord p WHERE DATE(p.exitTime) = CURRENT_DATE AND p.exitTime IS NOT NULL")
    Double calculateTodayRevenue();*/
    @Query("""
    SELECT COALESCE(SUM(p.charge), 0)
    FROM ParkingRecord p
    WHERE p.exitTime >= :start
      AND p.exitTime < :end
""")
    Double calculateTodayRevenue(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );


}
