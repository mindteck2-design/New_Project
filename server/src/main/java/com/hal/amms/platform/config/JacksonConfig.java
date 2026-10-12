package com.hal.amms.platform.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;

import java.time.ZoneOffset;
import java.util.TimeZone;

/**
 * Canonical JSON date/time rules for Boot 4 / Jackson 3.
 *
 * <ul>
 *   <li>Context timezone UTC</li>
 *   <li>ISO-8601 strings (not numeric timestamps)</li>
 *   <li>Do not shift zoned values into the context zone on read/write</li>
 * </ul>
 *
 * <p>Calendar dates ({@code LocalDate} / {@code YYYY-MM-DD}) are timezone-free;
 * form payloads are normalized via {@link com.hal.amms.shared.AmmsDateTimes}.
 */
@Configuration
public class JacksonConfig {

    @Bean
    JsonMapperBuilderCustomizer ammsJacksonCustomizer() {
        return (JsonMapper.Builder builder) -> {
            builder.defaultTimeZone(TimeZone.getTimeZone(ZoneOffset.UTC));
            builder.disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS);
            builder.disable(DateTimeFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE);
            builder.disable(DateTimeFeature.WRITE_DATES_WITH_CONTEXT_TIME_ZONE);
        };
    }
}
