import importlib.util
import unittest
from copy import deepcopy
from pathlib import Path

HERE = Path(__file__).with_name("reconcile_spring_runtime.py")
SPEC = importlib.util.spec_from_file_location("spring_reconcile", HERE)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


def samples():
    # Synthetic count matches pinned manifest by contract. No Spring claim.
    source = {
        "upstreamCommit": MOD.PIN,
        "sourceRouteVariants": 403,
        "routes": [
            {
                "handlerIdentity": f"TestController#get{i}",
                "gatewayForwardDecision": "DENY",
            } for i in range(403)
        ],
    }
    capture = {
        "pinnedUpstreamCommit": MOD.PIN,
        "source": "PINNED_SPRING_RUNTIME_CI_ONLY",
        "requestMappings": [
            {"handler": f"org.booklore.test.TestController#get{i}", "mapping": f"GET /test/{i}"}
            for i in range(310)
        ],
        "actualSpringHandlerCount": 310,
        "orderedSecurityChains": [
            {"effectiveOrder": i, "matcher": f"matcher{i}", "filters": ["AuthFilter"]}
            for i in range(11)
        ],
        "actualSecurityChainCount": 11,
        "perUserBookFileRowAuthorization": "NOT_PROVEN",
        "gatewayForwarding": "DENY_ALL",
    }
    return source, capture


class SpringEvidenceReconciliationTests(unittest.TestCase):
    def test_honest_summary_never_grants_exit(self):
        source, runtime = samples()
        result = MOD.reconcile(source, runtime)
        self.assertEqual(result["sourceHandlersPresent"], 310)
        self.assertEqual(len(result["sourceHandlersAbsent"]), 93)
        self.assertEqual(result["phase02Exit"], "BLOCKED")
        self.assertEqual(result["currentRecordRights"], "NOT_PROVEN")

    def test_reject_unpinned_runtime(self):
        source, runtime = samples()
        runtime["pinnedUpstreamCommit"] = "unrelated"
        with self.assertRaises(ValueError):
            MOD.reconcile(source, runtime)

    def test_reject_unproven_snapshot_disguised_as_approved(self):
        source, runtime = samples()
        runtime["perUserBookFileRowAuthorization"] = "PASS"
        with self.assertRaises(ValueError):
            MOD.reconcile(source, runtime)

    def test_reject_enabled_gateway(self):
        source, runtime = samples()
        runtime["gatewayForwarding"] = "ALLOW"
        with self.assertRaises(ValueError):
            MOD.reconcile(source, runtime)

    def test_reject_corrupt_chain_order(self):
        source, runtime = samples()
        runtime["orderedSecurityChains"][0]["effectiveOrder"] = 9
        with self.assertRaises(ValueError):
            MOD.reconcile(source, runtime)

    def test_reject_partial_handler_capture(self):
        source, runtime = samples()
        runtime["requestMappings"] = runtime["requestMappings"][:2]
        runtime["actualSpringHandlerCount"] = 2
        with self.assertRaises(ValueError):
            MOD.reconcile(source, runtime)

    def test_reject_unreviewed_route_forward(self):
        source, runtime = samples()
        source["routes"][0]["gatewayForwardDecision"] = "ALLOW"
        with self.assertRaises(ValueError):
            MOD.reconcile(source, runtime)


if __name__ == "__main__":
    unittest.main()
