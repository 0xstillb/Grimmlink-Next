# Phase 00 — All 403 Source Route/Verb Variants: Security Chain Candidate Matrix

**403/403 source variants classified by pinned SecurityConfig patterns; 0 allowed to proxy.**
The representative path expansion, filter-order match and JWT exceptions here are only a source pattern approximation. Spring Security's actual matcher order and root/wildcard matching MUST be checked at runtime. A permitAll chain is not an authorization approval, especially when filter checks are installed.

| Candidate security chain | Source variants |
|---|---:|
| AUDIO_STREAM_QUERY_JWT | 1 |
| CUSTOM_FONT_QUERY_JWT | 1 |
| DOWNLOAD_QUERY_JWT | 3 |
| EPUB_STREAM_QUERY_JWT | 1 |
| JWT_API | 278 |
| KOBO_FILTER | 23 |
| KOMGA_BASIC | 59 |
| KOREADER_FILTER | 4 |
| MEDIA_QUERY_JWT | 8 |
| OPDS_BASIC | 11 |
| STATIC_FALLBACK | 14 |

Source pattern root ambiguities: 1. SecurityConfig pinned at Grimmory 402e89b4452f8e2b17ab95f16c1621c003516cd2, blob c99e1decb2b761f60fb0429287b5ef873d20c8b7.

**Explicit DENY:** public OIDC/login/setup/refresh, Kobo/KO, WebSocket STOMP, generic/static fallback, downloads, media/query-token, OPDS/Komga, all user-personal mutating/read paths until separately reviewed. Do not allow blanket wildcard passthrough or direct Official backend ingress.

Full individual candidate routes are in [SOURCE-403-SECURITY-CHAIN-CANDIDATES.json](SOURCE-403-SECURITY-CHAIN-CANDIDATES.json). Gateway NOT implemented, real HTTP/Gateway tests NOT_RUN, Phase01 NOT_AUTHORIZED; independent CHANGES_REQUIRED continues.
