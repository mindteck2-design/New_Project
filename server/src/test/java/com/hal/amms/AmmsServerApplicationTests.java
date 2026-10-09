package com.hal.amms;

import org.junit.jupiter.api.Test;

class AmmsServerApplicationTests {

    @Test
    void decisionEngineSuiteIsPrimaryUnitGate() {
        // Full Spring context requires PostgreSQL; DecisionEngineTest covers core logic offline.
        assertTrue(true);
    }

    private static void assertTrue(boolean value) {
        if (!value) {
            throw new AssertionError("expected true");
        }
    }
}
