package com.hal.amms.identity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("prod")
public class ProductionAdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProductionAdminBootstrapRunner.class);

    private final UserAdminService userAdminService;
    private final String username;
    private final String temporaryPassword;

    public ProductionAdminBootstrapRunner(
            UserAdminService userAdminService,
            @Value("${AMMS_ADMIN_BOOTSTRAP_USERNAME:}") String username,
            @Value("${AMMS_ADMIN_BOOTSTRAP_PASSWORD:}") String temporaryPassword
    ) {
        this.userAdminService = userAdminService;
        this.username = username;
        this.temporaryPassword = temporaryPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        boolean hasUsername = username != null && !username.isBlank();
        boolean hasPassword = temporaryPassword != null && !temporaryPassword.isBlank();
        if (!hasUsername && !hasPassword) {
            return;
        }
        if (!hasUsername || !hasPassword) {
            throw new IllegalStateException(
                    "Both AMMS_ADMIN_BOOTSTRAP_USERNAME and AMMS_ADMIN_BOOTSTRAP_PASSWORD are required");
        }
        userAdminService.bootstrapAdmin(username, temporaryPassword);
        log.warn("Initial AMMS administrator provisioned; remove bootstrap credentials before restarting");
    }
}
