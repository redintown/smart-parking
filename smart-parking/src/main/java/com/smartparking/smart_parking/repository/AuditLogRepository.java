package com.smartparking.smart_parking.repository;

import com.smartparking.smart_parking.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByAdminUsernameOrderByTimestampDesc(String adminUsername);
    List<AuditLog> findByTimestampBetweenOrderByTimestampDesc(LocalDateTime start, LocalDateTime end);
    List<AuditLog> findByActionOrderByTimestampDesc(String action);
    
    @Query("SELECT a FROM AuditLog a ORDER BY a.timestamp DESC")
    List<AuditLog> findAllOrderByTimestampDesc();
}
