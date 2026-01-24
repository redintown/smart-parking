package com.smartparking.smart_parking.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Supabase Service Role Client
 * 
 * This service uses Supabase SERVICE_ROLE key to bypass RLS (Row Level Security)
 * and perform direct database operations without user authentication.
 * 
 * IMPORTANT:
 * - SERVICE_ROLE key has FULL database access and bypasses RLS
 * - Keep this key SECRET - never expose it in frontend code
 * - Only use in backend/server-side code
 * 
 * How it works:
 * 1. Service role key bypasses all RLS policies
 * 2. Can insert/update/delete any data directly
 * 3. No user authentication required
 * 4. Perfect for admin/system operations
 */
@Service
public class SupabaseService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseService.class);
    
    @Value("${supabase.url:https://urioslfgnnbzflviacyt.supabase.co}")
    private String supabaseUrl;
    
    @Value("${supabase.service.role.key:}")
    private String serviceRoleKey;

    @Value("${supabase.anon.key:}")
    private String anonKey;
    
    private final RestTemplate restTemplate;
    
    public SupabaseService() {
        this.restTemplate = new RestTemplate();
    }
    
    /**
     * Creates a floor directly in Supabase using service role
     * Bypasses RLS and user authentication
     */
    public Map<String, Object> createFloorDirect(Integer floorNumber, String description) {
        if (serviceRoleKey == null || serviceRoleKey.isEmpty()) {
            throw new RuntimeException("Supabase service role key not configured. Add 'supabase.service.role.key' to application.properties");
        }
        
        String url = supabaseUrl + "/rest/v1/floors";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("apikey", serviceRoleKey);
        headers.set("Authorization", "Bearer " + serviceRoleKey);
        headers.set("Prefer", "return=representation"); // Return created record
        
        Map<String, Object> floorData = new HashMap<>();
        floorData.put("floor_number", floorNumber);
        if (description != null && !description.trim().isEmpty()) {
            floorData.put("description", description);
        }
        
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(floorData, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                Map.class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            } else {
                throw new RuntimeException("Failed to create floor in Supabase");
            }
        } catch (Exception e) {
            throw new RuntimeException("Error creating floor in Supabase: " + e.getMessage(), e);
        }
    }
    
    /**
     * Gets all floors directly from Supabase using service role
     */
    public Object getAllFloorsDirect() {
        if (serviceRoleKey == null || serviceRoleKey.isEmpty()) {
            throw new RuntimeException("Supabase service role key not configured");
        }
        
        String url = supabaseUrl + "/rest/v1/floors?select=*&order=floor_number.asc";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", serviceRoleKey);
        headers.set("Authorization", "Bearer " + serviceRoleKey);
        
        HttpEntity<String> request = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                request,
                Object.class
            );
            
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Error fetching floors from Supabase: " + e.getMessage(), e);
        }
    }

    /**
     * Validates a Supabase Auth access token and returns the user's email.
     * Used after frontend verifyOtp to confirm the user and mark Admin as verified.
     * GET /auth/v1/user with Authorization: Bearer &lt;token&gt; and apikey.
     *
     * @return the email from the Supabase user, or null if token is invalid/expired
     */
    @SuppressWarnings("unchecked")
    public String getUserEmailFromAccessToken(String accessToken) {
        if (accessToken == null || accessToken.trim().isEmpty()) {
            return null;
        }
        if (anonKey == null || anonKey.isEmpty()) {
            throw new RuntimeException("Supabase anon key is not configured. Add supabase.anon.key to application.properties (Dashboard > Settings > API > anon public).");
        }
        String url = supabaseUrl + "/auth/v1/user";
        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", anonKey);
        headers.set("Authorization", "Bearer " + accessToken.trim());
        HttpEntity<String> request = new HttpEntity<>(headers);
        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<?, ?> body = response.getBody();
                String email = extractEmailFromBody(body);
                if (email != null) return email;
                log.warn("getUserEmailFromAccessToken: 2xx response but no email found. Top-level keys: {}", body.keySet());
                return null;
            }
        } catch (HttpStatusCodeException e) {
            String rb = e.getResponseBodyAsString();
            log.warn("getUserEmailFromAccessToken: Supabase /auth/v1/user returned {} body={}", e.getStatusCode(), rb != null && rb.length() > 400 ? rb.substring(0, 400) + "..." : rb);
        } catch (Exception e) {
            log.warn("getUserEmailFromAccessToken: request failed. {}", e.getMessage());
        }
        return null;
    }

    /** Extract email from Supabase user payload (top-level, user, data.user, or identities[0].identity_data.email). */
    @SuppressWarnings("unchecked")
    private String extractEmailFromBody(Map<?, ?> body) {
        if (body == null) return null;
        Object e = body.get("email");
        if (e != null && e.toString().trim().length() > 0) return e.toString().trim();

        Object user = body.get("user");
        if (user instanceof Map) {
            e = ((Map<?, ?>) user).get("email");
            if (e != null && e.toString().trim().length() > 0) return e.toString().trim();
        }

        Object data = body.get("data");
        if (data instanceof Map) {
            user = ((Map<?, ?>) data).get("user");
            if (user instanceof Map) {
                e = ((Map<?, ?>) user).get("email");
                if (e != null && e.toString().trim().length() > 0) return e.toString().trim();
            }
        }

        Object identities = body.get("identities");
        if (identities instanceof List && !((List<?>) identities).isEmpty()) {
            Object first = ((List<?>) identities).get(0);
            if (first instanceof Map) {
                Object idData = ((Map<?, ?>) first).get("identity_data");
                if (idData instanceof Map) {
                    e = ((Map<?, ?>) idData).get("email");
                    if (e != null && e.toString().trim().length() > 0) return e.toString().trim();
                }
            }
        }
        return null;
    }
}
