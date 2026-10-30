"""Fail-closed regressions for the Phase00 machine gate."""
import importlib.util
import json
import pathlib
import shutil
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location("phase00_gate",ROOT/"scripts/phase-00/validate-phase00-release-gates.py")
gate=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
FILES=[
"docs/implementation/phase-00/JAVA-SOURCE-WIDE-CENSUS.json",
"docs/implementation/phase-00/SOURCE-CONDITION-RESOLUTION.json",
"docs/implementation/phase-00/SOURCE-AUTH-OWNERSHIP-LEDGER.json",
"docs/implementation/phase-00/SOURCE-ROUTE-CANDIDATES.json",
"docs/implementation/phase-00/AUTH-43-SOURCE-VERIFICATION.json",
"docs/implementation/phase-00/SOURCE-403-SECURITY-CHAIN-CANDIDATES.json",
"docs/implementation/phase-00/FIXTURE-STATIC-VALIDATION.json",
"docs/implementation/phase-00/JAVA-INHERITANCE-TYPE-TRIAGE.json",
"docs/implementation/phase-00/REPOSITORY-REST-SOURCE-EXPOSURE.json",
"docs/implementation/phase-00/FRESH-INDEPENDENT-SECURITY-REVIEW-2026-10-29.md",
"docs/implementation/phase-00/FRESH-CONTEXT-DESIGN-LOCK-REVIEW-2026-10-29.md",
"docs/implementation/ACTIVE-SESSION.json",
"docs/implementation/phase-01/FINAL-INDEPENDENT-REVIEW-ATTESTATION-2026-10-29.md",
]

class GateTests(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.root=pathlib.Path(t.name)
        self.out=self.root/"output.json"
        for p in FILES:
            dst=self.root/p
            dst.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(ROOT/p,dst)

    def mutate(self,path,callback):
        p=self.root/path
        data=json.loads(p.read_text())
        callback(data)
        p.write_text(json.dumps(data))

    def test_design_only_contract_lock_does_not_authorize_runtime(self):
        gate.validate(self.root,self.out)
        obj=json.loads(self.out.read_text())
        self.assertTrue(obj["phase00ContractLocked"])
        self.assertTrue(obj["phase01Authorized"])
        self.assertEqual(obj["runtimeSpringRouteComplete"],"NOT_RUN")
        self.assertEqual(obj["gatewayRuntimeEnforcement"],"NOT_RUN")
        self.assertFalse(obj["newP001RuntimeAuthorizationVerified"])

    def test_unreviewed_gate_status_change_rejected(self):
        self.mutate("docs/implementation/ACTIVE-SESSION.json",lambda j:j.update(phase01Authorized=False))
        with self.assertRaisesRegex(ValueError,"differs from independent design lock"):
            gate.validate(self.root,self.out)

    def test_phase01_safety_handoff_fails_closed(self):
        self.mutate("docs/implementation/ACTIVE-SESSION.json",
                    lambda j:j["safety"].update(officialGatewayForwarding="ALLOW"))
        with self.assertRaisesRegex(ValueError,"differs from independent design lock"):
            gate.validate(self.root,self.out)

    def test_phase01_every_safety_field_fails_closed(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        # Every independently declared safety boundary must be enforced, even
        # when its securityCapability counterpart remains BLOCKED_OFF.
        cases=(
            ("officialGatewayForwarding","ALLOW"),
            ("nativeKosyncProgress","ON"),
            ("metadataApply","ON"),
            ("personalBridge","ON"),
            ("sessionBridge","ON"),
            ("resetProgress","ON"),
            ("managedProjection","ON"),
            ("productionDeployment","AUTHORIZED"),
            ("fullE2ePhase","01"),
            ("metadataApply","ON_BUT_OFF_IN_NAME"),
            ("productionDeployment",None),
            ("personalBridge",False),
        )
        for key,value in cases:
            with self.subTest(key=key,value=value):
                (self.root/path).write_text(pristine)
                self.mutate(path,lambda j:j["safety"].update({key:value}))
                with self.assertRaisesRegex(ValueError,"differs from independent design lock"):
                    gate.validate(self.root,self.out)

    def test_phase01_safety_rejects_missing_extra_and_wrong_type(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        changes=(
            lambda j:j["safety"].pop("resetProgress"),
            lambda j:j["safety"].update(unreviewedFeature="OFF"),
            lambda j:j.update(safety=None),
            lambda j:j.update(safety="DENY_ALL"),
            lambda j:j.update(safety=[]),
        )
        for i,change in enumerate(changes):
            with self.subTest(case=i):
                (self.root/path).write_text(pristine)
                self.mutate(path,change)
                with self.assertRaisesRegex(ValueError,"differs from independent design lock"):
                    gate.validate(self.root,self.out)

    def test_forged_phase00_handoff_cannot_bypass_safety_contract(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        self.mutate(path,lambda j:j.update(phase="00",phaseStatus="CONTRACT_LOCKED_DESIGN_ONLY"))
        # This otherwise accepted legacy-phase shape must not authorize an
        # unsafe safety status simply by bypassing the Phase01-only branch.
        self.mutate(path,lambda j:j["safety"].update(productionDeployment="AUTHORIZED"))
        with self.assertRaisesRegex(ValueError,"differs from independent design lock"):
            gate.validate(self.root,self.out)

    def test_phase00_design_handoff_still_works_when_safety_is_closed(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        self.mutate(path,lambda j:j.update(phase="00",phaseStatus="CONTRACT_LOCKED_DESIGN_ONLY"))
        gate.validate(self.root,self.out)
        output=json.loads(self.out.read_text())
        self.assertTrue(output["phase01Authorized"])
        self.assertEqual(output["gatewayRuntimeEnforcement"],"NOT_RUN")

    def test_phase01_final_independent_review_is_proven_and_bounded(self):
        gate.validate(self.root,self.out)
        obj=json.loads(self.out.read_text())
        self.assertTrue(obj["phase01FoundationReviewed"])
        self.assertEqual(obj["phase01IndependentTechnicalVerdict"],"PASS_AT_REVIEWED_SOURCE_HEAD")
        self.assertEqual(obj["phase01ReviewedSourceHead"],gate.PHASE01_REVIEWED_HEAD)
        self.assertFalse(obj["phase01HumanGitHubApproval"])
        self.assertFalse(obj["phase01RuntimeSecurityAuthorized"])
        self.assertEqual(obj["gatewayRuntimeEnforcement"],"NOT_RUN")

    def test_phase01_status_flip_without_independent_evidence_is_rejected(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        self.mutate(path,lambda j:j.pop("phase01IndependentReview",None))
        with self.assertRaisesRegex(ValueError,"FOUNDATION_REVIEWED requires"):
            gate.validate(self.root,self.out)

    def test_phase01_forged_review_evidence_is_rejected(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        changes=(
            lambda j:j["phase01IndependentReview"].update(reviewedSourceHead="unreviewed-commit"),
            lambda j:j["phase01IndependentReview"].update(githubReviewId="0"),
            lambda j:j["phase01IndependentReview"].update(githubReviewEvent="APPROVED"),
            lambda j:j["phase01IndependentReview"].update(humanGitHubApproved=True),
            lambda j:j["phase01IndependentReview"].update(runtimeSecurityAuthorized=True),
            lambda j:j["phase01IndependentReview"].update(phase01ReviewedCiRun="UNVERIFIED"),
            lambda j:j["phase01IndependentReview"].update(attestationGitBlob="fabricated"),
            lambda j:j["phase01IndependentReview"].update(unknownExtraKey="PASS"),
            lambda j:j.update(phaseStatus="FOUNDATION_PASSED_WITHOUT_REVIEW"),
        )
        for i,change in enumerate(changes):
            with self.subTest(case=i):
                (self.root/path).write_text(pristine)
                self.mutate(path,change)
                with self.assertRaisesRegex(ValueError,"(FOUNDATION_REVIEWED requires|differs from independent design lock|active Phase02 development checkpoint invalid|active Phase03 development checkpoint invalid|active Phase04 development checkpoint invalid|active Phase05 development checkpoint invalid|active Phase06 development checkpoint invalid|active Phase07 development checkpoint invalid|active Phase08 development checkpoint invalid)"):
                    gate.validate(self.root,self.out)

    def test_phase01_independent_review_attestation_cannot_be_tampered(self):
        p=self.root/"docs/implementation/phase-01/FINAL-INDEPENDENT-REVIEW-ATTESTATION-2026-10-29.md"
        p.write_text(p.read_text()+"\\nUNREVIEWED EDIT\\n")
        with self.assertRaisesRegex(ValueError,"Phase01 independent review attestation tampered"):
            gate.validate(self.root,self.out)

    def test_pre_review_state_remains_possible_only_without_accepted_evidence(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        self.mutate(path,lambda j:(j.update(phase="01",phaseStatus="FOUNDATION_IN_PROGRESS"),
                                   j.pop("phase01IndependentReview",None)))
        gate.validate(self.root,self.out)
        obj=json.loads(self.out.read_text())
        self.assertFalse(obj["phase01FoundationReviewed"])
        self.assertFalse(obj["phase01HumanGitHubApproval"])

    def test_phase02_dev_close_preserves_phase01_attestation_and_denies_runtime(self):
        gate.validate(self.root,self.out)
        obj=json.loads(self.out.read_text())
        self.assertTrue(obj["phase01FoundationReviewed"])
        self.assertFalse(obj["phase01RuntimeSecurityAuthorized"])
        self.assertEqual(obj["gatewayRuntimeEnforcement"],"NOT_RUN")
        self.assertEqual(obj["authorizationRuntimeProof"],"NOT_RUN")

    def test_phase02_forged_dev_status_and_operational_flag_rejected(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        changes=(
            lambda j:j.update(phaseStatus="GATEWAY_CODE_REVIEWED"),
            lambda j:j.update(prStatus="MERGED_TO_MAIN"),
            lambda j:j["phase02Work"].update(runtimeSecurityAuthorized=True),
            lambda j:j["phase02Work"].update(productionActivation="AUTHORIZED"),
        )
        for i,change in enumerate(changes):
            with self.subTest(case=i):
                (self.root/path).write_text(pristine)
                self.mutate(path,change)
                with self.assertRaisesRegex(ValueError,"active Phase02 development checkpoint invalid|active Phase03 development checkpoint invalid|active Phase04 development checkpoint invalid|active Phase05 development checkpoint invalid|active Phase06 development checkpoint invalid|active Phase07 development checkpoint invalid|active Phase08 development checkpoint invalid"):
                    gate.validate(self.root,self.out)

    def test_phase03_offline_feature_flags_cannot_be_promoted(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        mutations=(
            lambda j:j["phase03Work"].update(writesAllowed=True),
            lambda j:j["phase03Work"].update(officialConnected=True),
            lambda j:j["phase03Work"].update(nasMountVerified=True),
            lambda j:j["phase03Work"].update(operationalEnabled=True),
            lambda j:j["phase03Work"].update(independentReview="APPROVED"),
            lambda j:j.update(phaseStatus="PRODUCTION_VERIFIED"),
            lambda j:j.update(branch="main"),
            lambda j:j.update(prStatus="MERGED"),
            lambda j:j["phase02Work"].update(runtimeSecurityAuthorized=True),
        )
        for change in mutations:
            (self.root/path).write_text(pristine)
            self.mutate(path,change)
            with self.assertRaisesRegex(ValueError,"active Phase03 development checkpoint invalid|active Phase04 development checkpoint invalid|active Phase05 development checkpoint invalid|active Phase06 development checkpoint invalid|active Phase07 development checkpoint invalid|active Phase08 development checkpoint invalid"):
                gate.validate(self.root,self.out)

    def test_phase04_offline_recovery_forged_flags_rejected(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        mutations=(
            lambda j:j["phase04Work"].update(writesAllowed=True),
            lambda j:j["phase04Work"].update(nasWriteEnabled=True),
            lambda j:j["phase04Work"].update(restoreApplyEnabled=True),
            lambda j:j["phase04Work"].update(officialConnected=True),
            lambda j:j["phase04Work"].update(operationalEnabled=True),
            lambda j:j["phase04Work"].update(independentReview="APPROVED"),
            lambda j:j["phase04Work"].update(status="PRODUCTION_VERIFIED"),
            lambda j:j.update(baseIntegrationCommit="unreviewed"),
            lambda j:j.update(phase="09"),
            lambda j:j["phase02Work"].update(productionActivation="AUTHORIZED"),
            lambda j:j["phase03Work"].update(writesAllowed=True),
        )
        for change in mutations:
            (self.root/path).write_text(pristine)
            self.mutate(path,change)
            with self.assertRaisesRegex(ValueError,"active Phase04 development checkpoint invalid|active Phase05 development checkpoint invalid|active Phase06 development checkpoint invalid|active Phase07 development checkpoint invalid|active Phase08 development checkpoint invalid|unreviewed active phase transition"):
                gate.validate(self.root,self.out)

    def test_phase05_mock_gate_rejects_operational_promotion_and_forged_owner(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        mutations=(
            lambda j:j["phase05Work"].update(nativeKosyncProgress=True),
            lambda j:j["phase05Work"].update(actualOfficialAuth=True),
            lambda j:j["phase05Work"].update(officialConnected=True),
            lambda j:j["phase05Work"].update(runtimeRoutesMounted=True),
            lambda j:j["phase05Work"].update(productionEnabled=True),
            lambda j:j["phase05Work"].update(status="PRODUCTION_VERIFIED"),
            lambda j:j["phase04Work"].update(writesAllowed=True),
            lambda j:j["phase04Work"].update(status="PRODUCTION_VERIFIED"),
            lambda j:j.update(phase="09"),
            lambda j:j.update(branch="main"),
            lambda j:j.update(prStatus="MERGED_TO_MAIN"),
        )
        for change in mutations:
            (self.root/path).write_text(pristine)
            self.mutate(path,change)
            with self.assertRaisesRegex(ValueError,"active Phase05 development checkpoint invalid|active Phase06 development checkpoint invalid|active Phase07 development checkpoint invalid|active Phase08 development checkpoint invalid|unreviewed active phase transition"):
                gate.validate(self.root,self.out)

    def test_phase06_offline_gate_rejects_operational_promotion(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        mutations=(
            lambda j:j["phase06Work"].update(realEpubGoldenValidated=True),
            lambda j:j["phase06Work"].update(realPdfFixtureParsed=True),
            lambda j:j["phase06Work"].update(officialConnected=True),
            lambda j:j["phase06Work"].update(nativeKosyncEnabled=True),
            lambda j:j["phase06Work"].update(runtimeRoutesMounted=True),
            lambda j:j["phase06Work"].update(productionEnabled=True),
            lambda j:j["phase06Work"].update(independentReview="APPROVED"),
            lambda j:j["phase06Work"].update(hardwareE2e="PROVEN"),
            lambda j:j.update(phaseStatus="PRODUCTION_VERIFIED"),
            lambda j:j.update(baseIntegrationCommit="incorrect"),
            lambda j:j.update(phase="09"),
        )
        for change in mutations:
            (self.root/path).write_text(pristine)
            self.mutate(path,change)
            with self.assertRaisesRegex(ValueError,"active Phase06 development checkpoint invalid|active Phase07 development checkpoint invalid|active Phase08 development checkpoint invalid|unreviewed active phase transition"):
                gate.validate(self.root,self.out)

    def test_phase07_offline_gate_rejects_operational_promotion(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        mutations=(
            lambda j:j["phase07Work"].update(realKOReaderInstalled=True),
            lambda j:j["phase07Work"].update(deviceGoldenValidated=True),
            lambda j:j["phase07Work"].update(actualOfficialAuth=True),
            lambda j:j["phase07Work"].update(officialConnected=True),
            lambda j:j["phase07Work"].update(runtimeRoutesMounted=True),
            lambda j:j["phase07Work"].update(personalBridgeEnabled=True),
            lambda j:j["phase07Work"].update(sessionBridgeEnabled=True),
            lambda j:j["phase07Work"].update(nativeKosyncEnabled=True),
            lambda j:j["phase07Work"].update(shelfMutationEnabled=True),
            lambda j:j["phase07Work"].update(productionEnabled=True),
            lambda j:j["phase07Work"].update(independentReview="APPROVED"),
            lambda j:j["phase07Work"].update(fullE2e="PROVEN"),
            lambda j:j.update(prStatus="MERGED_TO_MAIN"),
            lambda j:j.update(phase="09"),
        )
        for change in mutations:
            (self.root/path).write_text(pristine)
            self.mutate(path,change)
            with self.assertRaisesRegex(ValueError,"active Phase07 development checkpoint invalid|active Phase08 development checkpoint invalid|unreviewed active phase transition"):
                gate.validate(self.root,self.out)


    def test_phase08_offline_ui_update_and_inherited_gates(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        mutations=(
            lambda j:j["phase08Work"].update(realUpdateEnabled=True),
            lambda j:j["phase08Work"].update(runtimeRoutesMounted=True),
            lambda j:j["phase08Work"].update(officialConnected=True),
            lambda j:j["phase08Work"].update(productionEnabled=True),
            lambda j:j["phase08Work"].update(independentReview="APPROVED"),
            lambda j:j["phase08Work"].update(fullE2e="PROVEN"),
            lambda j:j["phase08Work"].update(baseBranch="main"),
            lambda j:j["phase07Work"].update(personalBridgeEnabled=True),
            lambda j:j["phase06Work"].update(nativeKosyncEnabled=True),
            lambda j:j["phase05Work"].update(nativeKosyncProgress=True),
        )
        for change in mutations:
            (self.root/path).write_text(pristine)
            self.mutate(path,change)
            with self.assertRaisesRegex(ValueError,"active Phase06 development checkpoint invalid|active Phase08 development checkpoint invalid"):
                gate.validate(self.root,self.out)

    def test_phase08_merged_receipt_requires_exact_observed_pr_and_ci(self):
        path="docs/implementation/ACTIVE-SESSION.json"
        pristine=(self.root/path).read_text()
        gate.validate(self.root,self.out)
        mutations=(
            lambda j:j["phase08Work"].pop("integrationMerge"),
            lambda j:j["phase08Work"]["integrationMerge"].update(baseBranch="main"),
            lambda j:j["phase08Work"]["integrationMerge"].update(mergeCommit="0"*40),
            lambda j:j["phase08Work"]["integrationMerge"].update(pullRequestHead="0"*40),
            lambda j:j["phase08Work"]["integrationMerge"].update(ciRun="0"),
            lambda j:j["phase08Work"]["integrationMerge"].update(ciConclusion="PENDING"),
            lambda j:j["phase08Work"]["integrationMerge"].update(unreviewed="PASS"),
            lambda j:j.update(pr="https://github.com/0xstillb/Grimmlink-Next/pull/13"),
            lambda j:j.update(prStatus="MERGED_TO_MAIN"),
            lambda j:j.update(prStatus="DRAFT_OPEN_UNMERGED"),
        )
        for change in mutations:
            (self.root/path).write_text(pristine)
            self.mutate(path,change)
            with self.assertRaisesRegex(ValueError,"active Phase08 development checkpoint invalid"):
                gate.validate(self.root,self.out)

    def test_phase01_sensitive_feature_enable_rejected(self):
        self.mutate("docs/implementation/ACTIVE-SESSION.json",
                    lambda j:j["securityCapability"].update(metadataApply="ON"))
        with self.assertRaisesRegex(ValueError,"security feature unexpectedly enabled"):
            gate.validate(self.root,self.out)

    def test_phase01_forged_off_suffix_rejected(self):
        for invalid in ("ON_BUT_OFF_IN_NAME", "BLOCKED_OFF_WITH_UNREVIEWED_EXTENSION", None, False):
            with self.subTest(invalid=invalid):
                self.mutate("docs/implementation/ACTIVE-SESSION.json",
                            lambda j:j["securityCapability"].update(metadataApply=invalid))
                with self.assertRaisesRegex(ValueError,"security feature unexpectedly enabled"):
                    gate.validate(self.root,self.out)

    def test_phase01_unapproved_capability_key_rejected(self):
        self.mutate("docs/implementation/ACTIVE-SESSION.json",
                    lambda j:j["securityCapability"].update(unreviewedFeature="BLOCKED_OFF"))
        with self.assertRaisesRegex(ValueError,"security feature unexpectedly enabled"):
            gate.validate(self.root,self.out)

    def test_gateway_unreviewed_allow_rejected(self):
        self.mutate("docs/implementation/phase-00/SOURCE-403-SECURITY-CHAIN-CANDIDATES.json",lambda j:j["routes"][0].update(gatewayForwardDecision="ALLOW"))
        with self.assertRaisesRegex(ValueError,"route allow bypass"):
            gate.validate(self.root,self.out)

    def test_new_unowned_route_family_rejected(self):
        self.mutate("docs/implementation/phase-00/SOURCE-ROUTE-CANDIDATES.json",
                    lambda j:j["candidates"].append({"handlerMechanism":"OTHER_ENDPOINT_ANNOTATION","sourcePath":"unreviewed/Unknown.java"}))
        with self.assertRaisesRegex(ValueError,"NEW-P0-01 alternate"):
            gate.validate(self.root,self.out)

    def test_design_review_attestation_tamper_rejected(self):
        p=self.root/"docs/implementation/phase-00/FRESH-CONTEXT-DESIGN-LOCK-REVIEW-2026-10-29.md"
        p.write_text(p.read_text()+"\nTAMPERED\n")
        with self.assertRaisesRegex(ValueError,"independent design review attestation tampered"):
            gate.validate(self.root,self.out)

    def test_immutable_reviewer_report(self):
        p=self.root/"docs/implementation/phase-00/FRESH-INDEPENDENT-SECURITY-REVIEW-2026-10-29.md"
        p.write_text(p.read_text()+"\nTAMPERED\n")
        with self.assertRaisesRegex(ValueError,"historical reviewer report was modified"):
            gate.validate(self.root,self.out)

if __name__=="__main__":
    unittest.main()
