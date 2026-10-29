#!/usr/bin/env python3
"""Reconcile a captured live Spring handler registry against PINNED source candidates.

Evidence classification is intentionally limited. Matching a handler identity is
not proof of equivalent paths, method conditions, effective security decision
or any user/library/book/file/record authorization. Never output PASS/GATE EXIT.
"""
import argparse
import json
from collections import Counter
from pathlib import Path

PIN = "402e89b4452f8e2b17ab95f16c1621c003516cd2"


def reconcile(source: dict, captured: dict) -> dict:
    if source.get("upstreamCommit") != PIN or source.get("sourceRouteVariants") != 403:
        raise ValueError("Source route manifest is unpinned or unexpected")
    if captured.get("pinnedUpstreamCommit") != PIN:
        raise ValueError("Runtime snapshot provenance is missing or not pinned")
    if captured.get("source") != "PINNED_SPRING_RUNTIME_CI_ONLY":
        raise ValueError("Runtime evidence missing provenance")
    routes = captured.get("requestMappings")
    chains = captured.get("orderedSecurityChains")
    if not isinstance(routes, list) or not isinstance(chains, list):
        raise ValueError("No real Spring handler and security-chain arrays")
    if len(routes) != captured.get("actualSpringHandlerCount"):
        raise ValueError("Runtime handler count mismatch")
    if len(chains) != captured.get("actualSecurityChainCount"):
        raise ValueError("Runtime filter count mismatch")
    if len(routes) < 300 or len(chains) < 10:
        raise ValueError("Incomplete runtime registry: refuse partial capture")
    if any(r.get("handler") is None or r.get("mapping") is None for r in routes):
        raise ValueError("Malformed runtime route entry")
    if any(c.get("effectiveOrder") != index for index, c in enumerate(chains)):
        raise ValueError("Unexpected chain index sequence")
    if any(c.get("matcher") is None or not c.get("filters") for c in chains):
        raise ValueError("Incomplete security filter chain")
    if captured.get("perUserBookFileRowAuthorization") != "NOT_PROVEN":
        raise ValueError("Runtime mapping alone cannot authorize user content")
    if captured.get("gatewayForwarding") != "DENY_ALL":
        raise ValueError("Gateway forwarding must remain disabled")
    declared = source.get("routes", [])
    if len(declared) != 403 or any(route.get("gatewayForwardDecision") != "DENY" for route in declared):
        raise ValueError("Source manifest gateway decisions changed")
    source_handler_count = Counter(r["handlerIdentity"] for r in declared)
    runtime_handler_count = Counter(r["handler"].rsplit(".", 1)[-1] for r in routes)
    missing = sorted(set(source_handler_count).difference(runtime_handler_count))
    extra = sorted(set(runtime_handler_count).difference(source_handler_count))
    return {
        "sourceCommit": PIN,
        "evidence": "REAL_SPRING_BOOT_MAPPING_AND_FILTER_METADATA_ONLY",
        "runtimeMappings": len(routes),
        "runtimeSecurityChains": len(chains),
        "sourceRouteCandidates": 403,
        "distinctSourceHandlers": len(source_handler_count),
        "distinctRuntimeHandlers": len(runtime_handler_count),
        "sourceHandlersPresent": len(source_handler_count) - len(missing),
        "sourceHandlersAbsent": missing,
        "runtimeHandlersNotInSource": extra,
        "exactHttpMethodPathEquivalence": "NOT_PROVEN",
        "effectiveSecurityAuthorizationDecision": "NOT_PROVEN",
        "currentRecordRights": "NOT_PROVEN",
        "independentReview": "NOT_RUN",
        "gatewayForwarding": "DENY_ALL",
        "phase02Exit": "BLOCKED",
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--runtime", required=True, type=Path)
    p.add_argument("--source", default="docs/implementation/phase-00/SOURCE-403-SECURITY-CHAIN-CANDIDATES.json", type=Path)
    p.add_argument("--output", required=True, type=Path)
    args = p.parse_args()
    source = json.loads(args.source.read_text(encoding="utf-8"))
    captured = json.loads(args.runtime.read_text(encoding="utf-8"))
    result = reconcile(source, captured)
    args.output.write_text(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("sourceRouteCandidates", "runtimeMappings", "runtimeSecurityChains", "sourceHandlersPresent", "phase02Exit")}, sort_keys=True))
