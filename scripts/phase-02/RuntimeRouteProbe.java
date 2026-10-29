package org.booklore.phase02;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.DefaultSecurityFilterChain;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * Temporary CI-only probe injected into a checkout of the PINNED Official SHA.
 * Not merged, deployed or compiled into Official production.
 *
 * This proves that Spring BOOTED and registered mappings and ordered filters.
 * It does NOT prove actual per-book/user/row entitlement, host isolation,
 * security decisions for representative requests, or human approval.
 */
@Component
public final class RuntimeRouteProbe implements ApplicationListener<ApplicationReadyEvent> {
    private final ApplicationContext context;

    public RuntimeRouteProbe(ApplicationContext context) {
        this.context = context;
    }

    private static String quote(String value) {
        StringBuilder out = new StringBuilder("\"");
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '\\' -> out.append("\\\\");
                case '\"' -> out.append("\\\"");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) out.append(String.format("\\u%04x", (int) c));
                    else out.append(c);
                }
            }
        }
        return out.append('\"').toString();
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        String file = System.getenv("PHASE02_ROUTE_EXPORT_PATH");
        if (file == null || file.isBlank()) return;
        try {
            RequestMappingHandlerMapping mappings =
                context.getBean("requestMappingHandlerMapping", RequestMappingHandlerMapping.class);
            FilterChainProxy proxy =
                context.getBean("springSecurityFilterChain", FilterChainProxy.class);
            List<String> routes = new ArrayList<>();
            mappings.getHandlerMethods().forEach((info, handler) -> {
                routes.add("{" +
                    "\"mapping\":" + quote(info.toString()) + "," +
                    "\"handler\":" + quote(handler.getBeanType().getName() + "#" + handler.getMethod().getName()) +
                    "}");
            });
            routes.sort(Comparator.naturalOrder());

            List<String> chains = new ArrayList<>();
            List<SecurityFilterChain> effective = proxy.getFilterChains();
            for (int i = 0; i < effective.size(); i++) {
                SecurityFilterChain chain = effective.get(i);
                String matcher = chain instanceof DefaultSecurityFilterChain d
                    ? d.getRequestMatcher().toString()
                    : chain.getClass().getName();
                List<String> filters = chain.getFilters().stream()
                    .map(f -> quote(f.getClass().getName())).toList();
                chains.add("{" +
                    "\"effectiveOrder\":" + i + "," +
                    "\"matcher\":" + quote(matcher) + "," +
                    "\"filters\":[" + String.join(",", filters) + "]" +
                    "}");
            }

            String json = "{" +
                "\"source\":\"PINNED_SPRING_RUNTIME_CI_ONLY\"," +
                "\"actualSpringHandlerCount\":" + routes.size() + "," +
                "\"actualSecurityChainCount\":" + chains.size() + "," +
                "\"requestMappings\":[" + String.join(",", routes) + "]," +
                "\"orderedSecurityChains\":[" + String.join(",", chains) + "]," +
                "\"perUserBookFileRowAuthorization\":\"NOT_PROVEN\"," +
                "\"gatewayForwarding\":\"DENY_ALL\"" +
                "}\n";
            Path destination = Path.of(file).toAbsolutePath().normalize();
            Files.createDirectories(destination.getParent());
            Files.writeString(destination, json, StandardCharsets.UTF_8);
            System.out.println("PHASE02_PINNED_SPRING_RUNTIME_EVIDENCE_WRITTEN count="
                + routes.size() + " chains=" + chains.size());
        } catch (Exception error) {
            System.err.println("PHASE02_RUNTIME_EVIDENCE_NOT_CAPTURED type="
                + error.getClass().getSimpleName());
            throw new IllegalStateException("Spring runtime probe failed closed", error);
        }
    }
}
