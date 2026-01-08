package com.smartparking.smart_parking.model;

public class DashboardStatsDTO {
    private int totalSlots;
    private int availableSlots;
    private int occupiedSlots;
    private int vehiclesParkedToday;
    private double todayRevenue;
    private int currentlyParkedVehicles;
    
    public DashboardStatsDTO() {
    }
    
    public DashboardStatsDTO(int totalSlots, int availableSlots, int occupiedSlots, 
                            int vehiclesParkedToday, double todayRevenue, int currentlyParkedVehicles) {
        this.totalSlots = totalSlots;
        this.availableSlots = availableSlots;
        this.occupiedSlots = occupiedSlots;
        this.vehiclesParkedToday = vehiclesParkedToday;
        this.todayRevenue = todayRevenue;
        this.currentlyParkedVehicles = currentlyParkedVehicles;
    }
    
    // Getters and Setters
    public int getTotalSlots() {
        return totalSlots;
    }
    
    public void setTotalSlots(int totalSlots) {
        this.totalSlots = totalSlots;
    }
    
    public int getAvailableSlots() {
        return availableSlots;
    }
    
    public void setAvailableSlots(int availableSlots) {
        this.availableSlots = availableSlots;
    }
    
    public int getOccupiedSlots() {
        return occupiedSlots;
    }
    
    public void setOccupiedSlots(int occupiedSlots) {
        this.occupiedSlots = occupiedSlots;
    }
    
    public int getVehiclesParkedToday() {
        return vehiclesParkedToday;
    }
    
    public void setVehiclesParkedToday(int vehiclesParkedToday) {
        this.vehiclesParkedToday = vehiclesParkedToday;
    }
    
    public double getTodayRevenue() {
        return todayRevenue;
    }
    
    public void setTodayRevenue(double todayRevenue) {
        this.todayRevenue = todayRevenue;
    }
    
    public int getCurrentlyParkedVehicles() {
        return currentlyParkedVehicles;
    }
    
    public void setCurrentlyParkedVehicles(int currentlyParkedVehicles) {
        this.currentlyParkedVehicles = currentlyParkedVehicles;
    }
}
