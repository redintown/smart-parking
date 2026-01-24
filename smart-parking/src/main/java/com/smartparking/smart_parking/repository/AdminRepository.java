package com.smartparking.smart_parking.repository;

import com.smartparking.smart_parking.model.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AdminRepository extends JpaRepository<Admin, Long> {
    Optional<Admin> findByUsername(String username);
    Optional<Admin> findByUsernameAndActiveTrue(String username);
    Optional<Admin> findByEmail(String email);
}
