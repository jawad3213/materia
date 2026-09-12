package com.materia.backend.common.infrastructure.adapters.out.exchange;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for exchange rate external API integration.
 */
@Configuration
@ConfigurationProperties(prefix = "materia.exchange-rate")
public class ExchangeRateProperties {

    /**
     * Provider API base URL for ExchangeRate-API v6.
     * Default: https://v6.exchangerate-api.com/v6
     */
    private String baseUrl = "https://v6.exchangerate-api.com/v6";

    /**
     * API key for ExchangeRate-API (injected from application.properties or EXCHANGE_API_KEY).
     */
    private String apiKey = "";

    /**
     * Cache Time-To-Live in minutes. Default is 60 minutes.
     */
    private int cacheTtlMinutes = 60;

    /**
     * HTTP connection and response timeout in milliseconds.
     */
    private int timeoutMs = 5000;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public int getCacheTtlMinutes() {
        return cacheTtlMinutes;
    }

    public void setCacheTtlMinutes(int cacheTtlMinutes) {
        this.cacheTtlMinutes = cacheTtlMinutes;
    }

    public int getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(int timeoutMs) {
        this.timeoutMs = timeoutMs;
    }
}
