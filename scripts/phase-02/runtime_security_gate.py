#!/usr/bin/env python3
"""Phase02 HOLD gate: keep runtime-registered Spring metadata distinct from ACL authorization.

By design this checker cannot award runtime authorization from static findings.
Actual operational forwarding remains OFF until required route, owner authentication,
network and secret-handling runtime checks pass. Independent security review
is DEFERRED to Phase09, and is NOT a Phase02 development phase gate.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/implementation/phase-00/SOURCE-403-SECURITY-CHAIN-CANDIDATES.json"
SESSION = ROOT / "docs/implementation/ACTIVE-SESSION.json"
EVIDENCE = ROOT / "docs/implementation/phase-02/RUNTIME-SECURITY-EVIDENCE.json"

EXPECTED = {
    "liveSpringHandlerMappings": "CAPTURED_RUNTIME_352_HANDLERS",
    "orderedSecurityFilterChains": "CAPTURED_RUNTIME_12_CHAINS",
    "effectiveRouteReconciliation": "346_SOURCE_HANDLER_IDENTITIES_PRESENT_EXACT_HTTP_MATCH_NOT_PROVEN",
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
    if evidence.get("schemaVersion") != 1 or evidence.get("status") != "PARTIAL_SPRING_RUNTIME_CAPTURED_HARD_GATES_OPEN":
        raise ValueError("Phase02 runtime status cannot be self-granted from static evidence")
    if source.get("sourceRouteVariants") != 403 or source.get("runtimeSpringMatching") != "NOT_RUN":
        raise ValueError("Phase00 source evidence changed; requires source/runtime re-review")
    if evidence.get("sourceRouteVariants") != source["sourceRouteVariants"]:
        raise ValueError("Phase02 route count differs from Phase00 source candidates")
    if evidence.get("pinnedUpstreamCommit") != source.get("upstreamCommit"):
        raise ValueError("Upstream pin mismatch")
    if any(evidence.get(k) != v for k, v in EXPECTED.items()):
        raise ValueError("Phase02 runtime evidence changed without separately approved acceptance")
    runtime = evidence.get("runtimeCapture", {})
    if runtime != {
        "run": "40918459916",
        "sourceHead": "30b7d22c2297d2e022dd68538c4fc26072606080",
        "artifactId": "12918045157",
        "pinnedUpstreamCommit": source.get("upstreamCommit"),
        "actualSpringHandlerCount": 352,
        "actualSecurityChainCount": 12,
        "sourceHandlerIdentitiesPresent": 346,
        "status": "ISOLATED_H2_SPRING_BOOT_NO_REAL_ACL",
    }:
        raise ValueError("Runtime capture provenance or scope differs from verified GitHub CI")
    if set(evidence) != (set(EXPECTED) | {
        "schemaVersion", "status", "pinnedUpstreamCommit", "sourceRouteVariants", "runtimeCapture"
    }):
        raise ValueError("Unknown or missing runtime receipt field")
    if current.get("safety", {}).get("officialGatewayForwarding") != "DENY_ALL":
        raise ValueError("Unexpected Official upstream forwarding")
    phase = current.get("phase02Work", {})
    if phase.get("runtimeSecurityAuthorized") is not False:
        raise ValueError("Phase02 security cannot authorize itself")
    return {
        "phase": "02", "status": "BLOCKED_RUNTIME_AUTHORIZATION_NOT_PROVEN",
        "sourceRouteVariants": 403, "effectiveSpringRoutes": "METADATA_CAPTURED_AUTHZ_NOT_PROVEN",
        "runtimeAuthorized": False, "officialGatewayForwarding": "DENY_ALL",
    }




def verify_development(root: Path = ROOT) -> dict:
    """Permit safe development handoff; NEVER permit live forwarding or production."""
    hold = verify_hold(root)
    active = json.loads((root / "docs/implementation/ACTIVE-SESSION.json").read_text(encoding="utf-8"))
    policy = active.get("deliveryPolicy", {})
    if policy != {
        "mode": "SINGLE_OWNER_PRIVATE",
        "ownerCount": 1,
        "canonicalOfficialAccounts": 1,
        "deviceAccess": "MULTIPLE_PAIRED_SAME_OWNER",
        "multiTenantAcl": "OUT_OF_SCOPE",
        "independentSecurityReviewInterim": "NOT_REQUIRED_PHASES_00_TO_08",
        "independentSecurityReviewFinal": "DEFERRED_TO_PHASE_09",
        "developmentGates": "EVIDENCE_AND_CI_ONLY",
        "productionGate": "FINAL_REVIEW_REAL_E2E_AND_OWNER_APPROVAL",
        "policyFile": "docs/implementation/SINGLE-OWNER-POLICY.md",
        "riskLedger": "docs/implementation/DEFERRED-SECURITY-LEDGER.md",
    }:
        raise ValueError("Single-owner policy invalid or incomplete")
    return {
        "phase": "02",
        "developmentStatus": "DEV_CHECKS_PASS_WITH_DEFERRED_RISKS",
        "independentReview": "DEFERRED_TO_PHASE_09",
        "operationalEnablement": "BLOCKED",
        "officialGatewayForwarding": hold["officialGatewayForwarding"],
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-exit", action="store_true")
    parser.add_argument("--require-development", action="store_true")
    args = parser.parse_args()
    summary = verify_development() if args.require_development else verify_hold()
    print(json.dumps(summary, sort_keys=True))
    if args.require_exit:
        raise SystemExit("DENIED: operational Live Official forwarding is NOT authorized; independent final review is Phase09")
