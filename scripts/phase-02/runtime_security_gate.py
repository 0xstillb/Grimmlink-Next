#!/usr/bin/env python3
"""Phase02 HOLD gate: prove documentary zero-forwarding WITHOUT inventing live Spring evidence.

By design this checker cannot award runtime authorization from static findings.
Live Spring/ingress/current-rights verification and separate owner signoff
must be submitted, reviewed and governed by a NEW acceptance validator.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/implementation/phase-00/SOURCE-403-SECURITY-CHAIN-CANDIDATES.json"
SESSION = ROOT / "docs/implementation/ACTIVE-SESSION.json"
EVIDENCE = ROOT / "docs/implementation/phase-02/RUNTIME-SECURITY-EVIDENCE.json"

EXPECTED = {
    "liveSpringHandlerMappings": "NOT_RUN",
    "orderedSecurityFilterChains": "NOT_RUN",
    "effectiveRouteReconciliation": "NOT_RUN",
    "opdsRootHeadOptionsAliases": "NOT_RUN",
    "staticWebSocketKoboKomga": "NOT_RUN",
    "directIpv4Ipv6ContainerIngress": "NOT_RUN",
    "currentUserBookFileRowAuthorization": "NOT_RUN",
    "koCredentialSinkCapture": "NOT_RUN",
    "mockNegativeBatchAndReset": "PARTIAL_SYNTHETIC_ONLY",
    "independentOwnerSignoff": False,
    "officialGatewayForwarding": "DENY_ALL",
    "nativeKosyncProgress": "OFF",
    "productionDeployment": "NOT_AUTHORIZED",
    "fullIntegratedE2e": "DEFERRED_TO_PHASE_09",
}


def verify_hold(root: Path = ROOT) -> dict:
    def read(path):
        return json.loads((root / path).read_text(encoding="utf-8"))

    source = read("docs/implementation/phase-00/SOURCE-403-SECURITY-CHAIN-CANDIDATES.json")
    current = read("docs/implementation/ACTIVE-SESSION.json")
    evidence = read("docs/implementation/phase-02/RUNTIME-SECURITY-EVIDENCE.json")
    if evidence.get("schemaVersion") != 1 or evidence.get("status") != "NOT_RUN":
        raise ValueError("Phase02 runtime status cannot be self-granted from static evidence")
    if source.get("sourceRouteVariants") != 403 or source.get("runtimeSpringMatching") != "NOT_RUN":
        raise ValueError("Phase00 source evidence changed; requires source/runtime re-review")
    if evidence.get("sourceRouteVariants") != source["sourceRouteVariants"]:
        raise ValueError("Phase02 route count differs from Phase00 source candidates")
    if evidence.get("pinnedUpstreamCommit") != source.get("upstreamCommit"):
        raise ValueError("Upstream pin mismatch")
    if any(evidence.get(k) != v for k, v in EXPECTED.items()):
        raise ValueError("Phase02 runtime evidence changed without separately approved acceptance")
    if set(evidence) != (set(EXPECTED) | {
        "schemaVersion", "status", "pinnedUpstreamCommit", "sourceRouteVariants"
    }):
        raise ValueError("Unknown or missing runtime receipt field")
    if current.get("safety", {}).get("officialGatewayForwarding") != "DENY_ALL":
        raise ValueError("Unexpected Official upstream forwarding")
    phase = current.get("phase02Work", {})
    if phase.get("runtimeSecurityAuthorized") is not False:
        raise ValueError("Phase02 security cannot authorize itself")
    return {
        "phase": "02", "status": "BLOCKED_RUNTIME_PROOF_NOT_RUN",
        "sourceRouteVariants": 403, "effectiveSpringRoutes": "UNVERIFIED",
        "runtimeAuthorized": False, "officialGatewayForwarding": "DENY_ALL",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-exit", action="store_true")
    args = parser.parse_args()
    summary = verify_hold()
    print(json.dumps(summary, sort_keys=True))
    if args.require_exit:
        raise SystemExit("DENIED: Phase02 independent runtime security exit gate NOT PROVEN")
