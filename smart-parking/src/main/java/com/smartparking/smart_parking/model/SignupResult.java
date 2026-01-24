package com.smartparking.smart_parking.model;

/**
 * Result of admin signup. OTP is sent via SMTP or, if SMTP is not configured, logged to console only.
 */
public record SignupResult(Admin admin, boolean emailSent) {}
