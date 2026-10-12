package com.hal.amms.platform.web;

public record ErrorResponse(String code, String message, Object details) {}
