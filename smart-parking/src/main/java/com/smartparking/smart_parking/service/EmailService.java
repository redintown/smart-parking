package com.smartparking.smart_parking.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends OTP email for admin signup verification.
 * If SMTP is not configured, logs OTP to console (for development).
 * See OTP_EMAIL_SETUP.md for SMTP configuration.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    private static final String OTP_SUBJECT = "Smart Parking - Verify Your Email";
    private static final String OTP_BODY = "Your verification code is: %s\n\nIt expires in 5 minutes.\n\n— Smart Parking System";

    /**
     * Sends OTP to email via SMTP if configured; otherwise logs to console.
     * @return true if sent via SMTP, false if OTP was only logged to console (SMTP not configured or failed)
     */
    public boolean sendOtpToEmail(String toEmail, String otp) {
        String body = String.format(OTP_BODY, otp);
        if (mailSender != null && fromEmail != null && !fromEmail.isEmpty()) {
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom(fromEmail);
                msg.setTo(toEmail);
                msg.setSubject(OTP_SUBJECT);
                msg.setText(body);
                mailSender.send(msg);
                log.info("OTP email sent to {}", toEmail);
                return true;
            } catch (Exception e) {
                log.warn("Failed to send OTP email to {}: {}; falling back to console", toEmail, e.getMessage());
                logOtpToConsole(toEmail, otp);
                return false;
            }
        } else {
            log.info("SMTP not configured (spring.mail.host/username unset); OTP logged to console only. To: {}", toEmail);
            logOtpToConsole(toEmail, otp);
            return false;
        }
    }

    private void logOtpToConsole(String toEmail, String otp) {
        log.info("═══════════════════════════════════════════════════════");
        log.info("  [DEV] OTP Email (SMTP not configured or failed)");
        log.info("  To: {}", toEmail);
        log.info("  OTP: {}", otp);
        log.info("  Expires in 5 minutes.");
        log.info("═══════════════════════════════════════════════════════");
    }
}
