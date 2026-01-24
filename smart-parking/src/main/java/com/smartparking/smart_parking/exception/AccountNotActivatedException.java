package com.smartparking.smart_parking.exception;

/**
 * Thrown when login is attempted but admin account is not yet activated
 * (e.g. email not verified or active=false).
 */
public class AccountNotActivatedException extends RuntimeException {
    public AccountNotActivatedException(String message) {
        super(message);
    }
}
