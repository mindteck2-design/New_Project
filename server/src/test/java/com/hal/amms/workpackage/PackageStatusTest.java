package com.hal.amms.workpackage;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PackageStatusTest {

    @Test
    void onlyCancelledWorkOrdersRejectNewParts() {
        assertTrue(PackageStatus.DRAFT.canAcceptParts());
        assertTrue(PackageStatus.READY.canAcceptParts());
        assertTrue(PackageStatus.IN_PROGRESS.canAcceptParts());
        assertTrue(PackageStatus.COMPLETED.canAcceptParts());
        assertFalse(PackageStatus.CANCELLED.canAcceptParts());
    }
}
