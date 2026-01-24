package com.smartparking.smart_parking.exception;

/**
 * Thrown when login is attempted but admin has not verified email yet.
 * The email field allows the frontend to redirect to the verification page.
 */
public class EmailNotVerifiedException extends RuntimeException {
    private final String email;

    public EmailNotVerifiedException(String message) {
        this(message, null);
    }

    public EmailNotVerifiedException(String message, String email) {
        super(message);
        this.email = email;
    }

    public String getEmail() {
        return email;
    }
}
