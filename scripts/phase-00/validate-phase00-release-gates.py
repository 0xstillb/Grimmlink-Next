#!/usr/bin/env python3
"""Phase00 release-gate integrity check: implementer CANNOT self-authorize Phase01."""
import argparse,hashlib,json,pathlib,subprocess,sys
REVIEW_BLOB="085c8bedb16513df38575fcff2a432ab72de2ad8"
FRESH_DESIGN_REVIEW_BLOB="e910a70fff151eaded60596e3e3042c59673b5aa"
REVIEWED_SOURCE_HEAD="f071229d9d9a1b7fb680cb68f83c763bc53138c6"
PIN="402e89b4452f8e2b17ab95f16c1621c003516cd2"
# Independent review submitted in a separate GPT-6 context for fixed Phase01 source.
# This is a technical COMMENT verdict, NOT a distinct human GitHub approval.
PHASE01_REVIEWED_HEAD="2eb613b0cac39b689710501cc3dbad812e5486a2"
PHASE01_REVIEW_ATTESTATION_BLOB="c2f27b7a6d9cef5e139f7ce052aaa5118d6a177d"
PHASE01_REVIEW_ID="5699254459"
def load(root,path):return json.loads((root/path).read_text("utf8"))
def validate(root,out):
    p="docs/implementation/phase-00/"
    census=load(root,p+"JAVA-SOURCE-WIDE-CENSUS.json")
    condition=load(root,p+"SOURCE-CONDITION-RESOLUTION.json")
    auth=load(root,p+"SOURCE-AUTH-OWNERSHIP-LEDGER.json")
    source43=load(root,p+"AUTH-43-SOURCE-VERIFICATION.json")
    source403=load(root,p+"SOURCE-403-SECURITY-CHAIN-CANDIDATES.json")
    fixture=load(root,p+"FIXTURE-STATIC-VALIDATION.json")
    inheritance=load(root,p+"JAVA-INHERITANCE-TYPE-TRIAGE.json")
    repo=load(root,p+"REPOSITORY-REST-SOURCE-EXPOSURE.json")
    reviewer=p+"FRESH-INDEPENDENT-SECURITY-REVIEW-2026-10-29.md"
    reviewer_bytes=(root/reviewer).read_bytes()
    reviewed=hashlib.sha1(("blob "+str(len(reviewer_bytes))+"\0").encode()+reviewer_bytes).hexdigest()
    if reviewed!=REVIEW_BLOB:raise ValueError("historical reviewer report was modified")
    if "CHANGES_REQUIRED" not in reviewer_bytes.decode("utf8"):raise ValueError("historical verdict not found")
    fresh_bytes=(root/(p+"FRESH-CONTEXT-DESIGN-LOCK-REVIEW-2026-10-29.md")).read_bytes()
    fresh_hash=hashlib.sha1(("blob "+str(len(fresh_bytes))+"\0").encode()+fresh_bytes).hexdigest()
    if fresh_hash!=FRESH_DESIGN_REVIEW_BLOB:raise ValueError("independent design review attestation tampered")
    fresh=fresh_bytes.decode("utf8")
    if ("PASS_PHASE00_DESIGN_ONLY" not in fresh or REVIEWED_SOURCE_HEAD not in fresh
        or "not a distinct GitHub human-account approval" not in fresh):
        raise ValueError("fresh design review has incorrect scope or reviewed SHA")
    if not (census["filesEnumerated"]==923==census["astParsedFiles"]==census["contentReadAndBlobShaVerified"]
      and len(census["astErrors"])==0):raise ValueError("source census incomplete")
    if condition["symbolicConditions"]!=15 or condition["unresolvedThirdPartyOrDynamic"]!=0:raise ValueError("source constants unresolved")
    if auth["handlers"]!=348 or auth["mutationWithoutLocalMethodOrClassAnnotation"]!=43:raise ValueError("source handler census shifted")
    if len(auth["allRouteRecords"])!=348 or any(r["allowedToProxyNow"] for r in auth["allRouteRecords"]):
        raise ValueError("gateway source ledger contains unapproved ALLOW")
    if source43["totalReviewed"]!=43 or source43["missingSourceWitnesses"]!=0 or source43["securityAuthorizationApproved"] is not False:
        raise ValueError("source43 proof incomplete or overclaimed")
    if source403["sourceRouteVariants"]!=403 or source403["sourceMethodHandlers"]!=348 or len(source403["routes"])!=403:
        raise ValueError("source403 proof incomplete")
    if not source403["allRouteForwardingDenied"] or any(r["gatewayForwardDecision"]!="DENY" for r in source403["routes"]):
        raise ValueError("source route allow bypass")
    if source403["methodNameCollisionCount"]!=2 or source403["distinctJavaMethodNames"]!=346:
        raise ValueError("duplicate method source-key regression")
    if inheritance["lexicalClassFlaggedFiles"]!=160 or repo["reposWithLexicalInterfaceOrExtendsFlag"]!=65:
        raise ValueError("inheritance source review coverage shifted")
    if fixture["totalDefinitions"]!=109 or fixture["uniqueFixtureIds"]!=109 or fixture["failures"]:
        raise ValueError("fixture static validation not complete")
    candidates=load(root,p+"SOURCE-ROUTE-CANDIDATES.json")
    program=[r for r in candidates["candidates"] if r["handlerMechanism"] in ("PROGRAMMATIC_SOURCE_SIGNAL","FRAMEWORK_TYPE_SIGNAL")]
    kinds=set(r["handlerMechanism"] for r in candidates["candidates"])
    if (len(candidates["candidates"]),len(program))!=(715,17) or "OTHER_ENDPOINT_ANNOTATION" in kinds:
        raise ValueError("NEW-P0-01 alternate source signal census changed")
    if set(r["sourcePath"] for r in program)!={"backend/src/main/java/org/booklore/config/WebMvcConfig.java",
        "backend/src/main/java/org/booklore/config/WebSocketConfig.java",
        "backend/src/main/java/org/booklore/config/security/SecurityConfig.java"}:
        raise ValueError("NEW-P0-01 unexpected programmatic route owner")
    if census["customAnnotationDefinitionNames"]!=["CheckBookAccess","CheckLibraryAccess"] or census["mappingAnnotationOccurrences"]!=411:
        raise ValueError("NEW-P0-01 custom/composed annotation definitions changed")
    if repo["pinnedGradleLockSpringDataRestDependencies"] or repo["pinnedGradleBuildSpringDataRestDeclarations"] or repo["springDataRestSourceSymbols"]:
        raise ValueError("NEW-P0-01 repository REST registration evidence changed")
    current=load(root,"docs/implementation/ACTIVE-SESSION.json")
    # Phase00 design acceptance remains invariant even after ACTIVE-SESSION
    # transfers to Phase01. The old condition incorrectly required phaseStatus
    # to remain Phase00 forever and broke the already-accepted phase handoff.
    if current.get("phase01Authorized") is not True or current.get("contractLocked") is not True:
        raise ValueError("active status differs from independent design lock")
    # Keep Phase01 historical attestation immutable when the ACTIVE checkpoint
    # advances to Phase02. A development PASS never authorizes runtime forwarding.
    active_phase=current.get("phase")
    if active_phase=="00":
        if current.get("phaseStatus")!="CONTRACT_LOCKED_DESIGN_ONLY":
            raise ValueError("active status differs from independent design lock")
    elif active_phase in ("01","02","03","04","05","06","07"):
        if (current.get("phase00Review")!="PASS_PHASE00_DESIGN_ONLY_RUNTIME_NOT_VERIFIED"
            or current.get("phase01Scope")!="FOUNDATION_ONLY"):
            raise ValueError("active status differs from independent design lock")
        if active_phase=="01":
            if current.get("phaseStatus") not in ("FOUNDATION_IN_PROGRESS","FOUNDATION_REVIEWED"):
                raise ValueError("active status differs from independent design lock")
        elif active_phase=="02":
            phase02=current.get("phase02Work",{})
            if (current.get("phaseStatus")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or current.get("branch")!="feat/next-phase-02"
                or current.get("baseIntegrationCommit")!="0579f64afb2d53001c915a10079d00ecd9de0091"
                or current.get("prStatus")!="DRAFT_UNMERGED"
                or current.get("deliveryPolicy",{}).get("mode")!="SINGLE_OWNER_PRIVATE"
                or phase02.get("developmentGate")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or phase02.get("runtimeSecurityAuthorized") is not False
                or phase02.get("productionActivation")!="BLOCKED_OPERATIONAL_ENABLEMENT"):
                raise ValueError("active Phase02 development checkpoint invalid")
        if active_phase=="03":
            phase03=current.get("phase03Work",{})
            if (current.get("phaseStatus")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or current.get("branch")!="feat/next-phase-03"
                or current.get("pr")!="https://github.com/0xstillb/Grimmlink-Next/pull/7"
                or current.get("prStatus")!="DRAFT_UNMERGED"
                or current.get("deliveryPolicy",{}).get("mode")!="SINGLE_OWNER_PRIVATE"
                or phase03.get("status")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or phase03.get("writesAllowed") is not False
                or phase03.get("officialConnected") is not False
                or phase03.get("nasMountVerified") is not False
                or phase03.get("operationalEnabled") is not False
                or phase03.get("independentReview")!="DEFERRED_PHASE09"
                or current.get("phase02Work",{}).get("developmentGate")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or current.get("phase02Work",{}).get("runtimeSecurityAuthorized") is not False
                or current.get("phase02Work",{}).get("productionActivation")!="BLOCKED_OPERATIONAL_ENABLEMENT"):
                raise ValueError("active Phase03 development checkpoint invalid")
        if active_phase=="04":
            phase04=current.get("phase04Work",{})
            phase03=current.get("phase03Work",{})
            phase02=current.get("phase02Work",{})
            if (current.get("phaseStatus") not in ("IN_PROGRESS_FAIL_CLOSED","DEV_CHECKS_PASS_WITH_DEFERRED_RISKS")
                or current.get("branch")!="feat/next-phase-04"
                or current.get("pr")!="https://github.com/0xstillb/Grimmlink-Next/pull/8"
                or current.get("prStatus")!="DRAFT_UNMERGED"
                or current.get("baseIntegrationCommit")!="9a9ae6e0f8deafb145f83e976331a0db48feef92"
                or current.get("deliveryPolicy",{}).get("mode")!="SINGLE_OWNER_PRIVATE"
                or phase04.get("status")!=current.get("phaseStatus")
                or phase04.get("branch")!="feat/next-phase-04"
                or phase04.get("writesAllowed") is not False
                or phase04.get("officialConnected") is not False
                or phase04.get("nasWriteEnabled") is not False
                or phase04.get("restoreApplyEnabled") is not False
                or phase04.get("operationalEnabled") is not False
                or phase04.get("independentReview")!="DEFERRED_PHASE09"
                or phase03.get("status")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or phase03.get("writesAllowed") is not False
                or phase03.get("officialConnected") is not False
                or phase03.get("nasMountVerified") is not False
                or phase03.get("operationalEnabled") is not False
                or phase03.get("independentReview")!="DEFERRED_PHASE09"
                or phase02.get("developmentGate")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or phase02.get("runtimeSecurityAuthorized") is not False
                or phase02.get("productionActivation")!="BLOCKED_OPERATIONAL_ENABLEMENT"):
                raise ValueError("active Phase04 development checkpoint invalid")
        if active_phase=="05":
            phase05=current.get("phase05Work",{})
            phase04=current.get("phase04Work",{})
            phase03=current.get("phase03Work",{})
            phase02=current.get("phase02Work",{})
            if (current.get("phaseStatus") not in ("CODE_IMPLEMENTED_CI_PENDING","DEV_CHECKS_PASS_WITH_DEFERRED_RISKS")
                or current.get("branch")!="feat/next-phase-05"
                or current.get("pr")!="https://github.com/0xstillb/Grimmlink-Next/pull/9"
                or current.get("prStatus")!="DRAFT_OPEN_UNMERGED"
                or current.get("baseIntegrationCommit")!="fe83f22fa7395a4f799df8ecc5349de71aeadb0c"
                or current.get("deliveryPolicy",{}).get("mode")!="SINGLE_OWNER_PRIVATE"
                or phase05.get("status")!=current.get("phaseStatus")
                or phase05.get("branch")!="feat/next-phase-05"
                or phase05.get("officialConnected") is not False
                or phase05.get("actualOfficialAuth") is not False
                or phase05.get("nativeKosyncProgress") is not False
                or phase05.get("runtimeRoutesMounted") is not False
                or phase05.get("productionEnabled") is not False
                or phase05.get("independentReview")!="DEFERRED_TO_PHASE09"
                or phase05.get("fullE2e")!="DEFERRED_TO_PHASE09"
                or phase04.get("status")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS_INTEGRATION_MERGED"
                or phase04.get("writesAllowed") is not False
                or phase04.get("officialConnected") is not False
                or phase04.get("nasWriteEnabled") is not False
                or phase04.get("restoreApplyEnabled") is not False
                or phase04.get("operationalEnabled") is not False
                or phase04.get("independentReview")!="DEFERRED_PHASE09"
                or phase03.get("status")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or phase03.get("writesAllowed") is not False
                or phase03.get("officialConnected") is not False
                or phase03.get("nasMountVerified") is not False
                or phase03.get("operationalEnabled") is not False
                or phase03.get("independentReview")!="DEFERRED_PHASE09"
                or phase02.get("developmentGate")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or phase02.get("runtimeSecurityAuthorized") is not False
                or phase02.get("productionActivation")!="BLOCKED_OPERATIONAL_ENABLEMENT"):
                raise ValueError("active Phase05 development checkpoint invalid")
        if active_phase=="06":
            phase06=current.get("phase06Work",{})
            phase05=current.get("phase05Work",{})
            phase04=current.get("phase04Work",{})
            phase03=current.get("phase03Work",{})
            phase02=current.get("phase02Work",{})
            if (current.get("phaseStatus") not in ("CODE_IMPLEMENTED_CI_PENDING","DEV_CHECKS_PASS_WITH_DEFERRED_RISKS")
                or current.get("branch")!="feat/next-phase-06"
                or current.get("pr")!="https://github.com/0xstillb/Grimmlink-Next/pull/10"
                or current.get("prStatus")!="DRAFT_OPEN_UNMERGED"
                or current.get("baseIntegrationCommit")!="3b5321ede76f74fd1d94ebaece119fc4f6f11aaf"
                or current.get("deliveryPolicy",{}).get("mode")!="SINGLE_OWNER_PRIVATE"
                or phase06.get("status")!=current.get("phaseStatus")
                or phase06.get("branch")!="feat/next-phase-06"
                or phase06.get("implementationScope")!="OFFLINE_SYNTHETIC_FIXTURE_AND_SQLITE_ONLY"
                or phase06.get("realEpubGoldenValidated") is not False
                or phase06.get("realPdfFixtureParsed") is not False
                or phase06.get("officialConnected") is not False
                or phase06.get("nativeKosyncEnabled") is not False
                or phase06.get("runtimeRoutesMounted") is not False
                or phase06.get("productionEnabled") is not False
                or phase06.get("hardwareE2e")!="DEFERRED_TO_PHASE09"
                or phase06.get("independentReview")!="DEFERRED_TO_PHASE09"
                or phase05.get("status")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or phase05.get("officialConnected") is not False
                or phase05.get("actualOfficialAuth") is not False
                or phase05.get("nativeKosyncProgress") is not False
                or phase05.get("runtimeRoutesMounted") is not False
                or phase05.get("productionEnabled") is not False
                or phase04.get("status")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS_INTEGRATION_MERGED"
                or phase04.get("writesAllowed") is not False
                or phase04.get("officialConnected") is not False
                or phase04.get("nasWriteEnabled") is not False
                or phase04.get("restoreApplyEnabled") is not False
                or phase04.get("operationalEnabled") is not False
                or phase04.get("independentReview")!="DEFERRED_PHASE09"
                or phase03.get("status")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or phase03.get("writesAllowed") is not False
                or phase03.get("officialConnected") is not False
                or phase03.get("nasMountVerified") is not False
                or phase03.get("operationalEnabled") is not False
                or phase03.get("independentReview")!="DEFERRED_PHASE09"
                or phase02.get("developmentGate")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or phase02.get("runtimeSecurityAuthorized") is not False
                or phase02.get("productionActivation")!="BLOCKED_OPERATIONAL_ENABLEMENT"):
                raise ValueError("active Phase06 development checkpoint invalid")
        if active_phase=="07":
            phase07=current.get("phase07Work",{})
            phase06=current.get("phase06Work",{})
            phase05=current.get("phase05Work",{})
            if (current.get("phaseStatus") not in ("CODE_IMPLEMENTED_CI_PENDING","DEV_CHECKS_PASS_WITH_DEFERRED_RISKS")
                or current.get("branch")!="feat/next-phase-07"
                or current.get("pr")!="https://github.com/0xstillb/Grimmlink-Next/pull/11"
                or current.get("prStatus")!="DRAFT_OPEN_UNMERGED"
                or current.get("baseIntegrationCommit")!="3b5321ede76f74fd1d94ebaece119fc4f6f11aaf"
                or current.get("deliveryPolicy",{}).get("mode")!="SINGLE_OWNER_PRIVATE"
                or phase07.get("status")!=current.get("phaseStatus")
                or phase07.get("branch")!="feat/next-phase-07"
                or phase07.get("baseBranch")!="feat/next-phase-06"
                or phase07.get("implementationScope")!="OFFLINE_LUA_SYNTHETIC_SQLITE_ONLY"
                or phase07.get("realKOReaderInstalled") is not False
                or phase07.get("deviceGoldenValidated") is not False
                or phase07.get("actualOfficialAuth") is not False
                or phase07.get("officialConnected") is not False
                or phase07.get("runtimeRoutesMounted") is not False
                or phase07.get("personalBridgeEnabled") is not False
                or phase07.get("sessionBridgeEnabled") is not False
                or phase07.get("nativeKosyncEnabled") is not False
                or phase07.get("shelfMutationEnabled") is not False
                or phase07.get("productionEnabled") is not False
                or phase07.get("independentReview")!="DEFERRED_TO_PHASE09"
                or phase07.get("fullE2e")!="DEFERRED_TO_PHASE09"
                or phase06.get("status")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or phase06.get("officialConnected") is not False
                or phase06.get("nativeKosyncEnabled") is not False
                or phase06.get("runtimeRoutesMounted") is not False
                or phase05.get("status")!="DEV_CHECKS_PASS_WITH_DEFERRED_RISKS"
                or current.get("safety",{}).get("officialGatewayForwarding")!="DENY_ALL"
                or current.get("safety",{}).get("personalBridge")!="OFF"
                or current.get("safety",{}).get("sessionBridge")!="OFF"):
                raise ValueError("active Phase07 development checkpoint invalid")
    else:
        raise ValueError("unreviewed active phase transition")
    phase01_accepted=(active_phase in ("02","03","04","05","06","07") or
        (active_phase=="01" and current.get("phaseStatus")=="FOUNDATION_REVIEWED"))
    if phase01_accepted:
        attestation_path="docs/implementation/phase-01/FINAL-INDEPENDENT-REVIEW-ATTESTATION-2026-10-29.md"
        evidence_bytes=(root/attestation_path).read_bytes()
        evidence_hash=hashlib.sha1(("blob "+str(len(evidence_bytes))+"\0").encode()+evidence_bytes).hexdigest()
        if evidence_hash!=PHASE01_REVIEW_ATTESTATION_BLOB:
            raise ValueError("Phase01 independent review attestation tampered")
        expected_review={
            "reviewedSourceHead":PHASE01_REVIEWED_HEAD,
            "githubReviewId":PHASE01_REVIEW_ID,
            "githubReviewEvent":"COMMENTED",
            "reviewerKind":"FRESH_GPT6_CONTEXT_NOT_HUMAN_APPROVAL",
            "technicalVerdict":"PASS_ISOLATED_FOUNDATION",
            "phase00ReviewedCiRun":"40888013634",
            "phase01ReviewedCiRun":"40888013081",
            "attestationGitBlob":PHASE01_REVIEW_ATTESTATION_BLOB,
            "runtimeSecurityAuthorized":False,
            "humanGitHubApproved":False,
        }
        if current.get("phase01IndependentReview")!=expected_review:
            raise ValueError("FOUNDATION_REVIEWED requires fixed independent review evidence")
    elif "phase01IndependentReview" in current and active_phase=="01":
        raise ValueError("in-progress phase cannot carry accepted review evidence")
    # Both safety and securityCapability are authoritative design declarations.
    # Verify the full safety map for EVERY accepted phase: a forged handback
    # to Phase00 must not bypass the fail-closed Phase01 safety boundary.
    # Exact comparison rejects missing, extra, non-string and forged OFF values.
    expected_safety={
        "officialGatewayForwarding":"DENY_ALL",
        "nativeKosyncProgress":"OFF",
        "metadataApply":"OFF",
        "personalBridge":"OFF",
        "sessionBridge":"OFF",
        "resetProgress":"OFF",
        "managedProjection":"OFF",
        "productionDeployment":"NOT_AUTHORIZED",
        "fullE2ePhase":"09",
    }
    if not isinstance(current.get("safety"),dict) or current["safety"]!=expected_safety:
        raise ValueError("active status differs from independent design lock")
    disabled=current.get("securityCapability")
    # Exact accepted Phase01 design-only states. Substring checks would allow
    # forged values such as ON_WITH_OFF_SUFFIX to pass a release gate.
    expected_disabled={
        "kosyncProgress":"BLOCKED_OFF_TOCTOU",
        "metadataApply":"BLOCKED_OFF",
        "personalBridge":"BLOCKED_OFF",
        "sessionBridge":"BLOCKED_OFF",
        "managedProjection":"BLOCKED_OFF",
        "resetProgress":"BLOCKED_OFF",
        "resetPersonalRating":"BLOCKED_OFF",
    }
    if not isinstance(disabled,dict) or disabled!=expected_disabled:
        raise ValueError("security feature unexpectedly enabled")
    gates=[
      ("P00_PINNED_SOURCE_CENSUS","SOURCE_VERIFIED", "Phase00","923/923 SHA and AST"),
      ("NEW_P0_01_SOURCE_MECHANISM_INVENTORY","PINNED_SOURCE_RECONCILED_NOT_RUNTIME","Phase00","923 Java; 715 signals; 17 programmatic; 160 inheritance; 65 repositories; all route forwarding DENY"),
      ("P00_SYMBOLIC_MAPPING_CONDITIONS","SOURCE_VERIFIED","Phase00","15/15 exact source constants"),
      ("P00_SECURITY_CHAIN_CLASSIFICATION","SOURCE_CANDIDATES_CLASSIFIED_NOT_RUNTIME","Phase00/02","403/403; root wildcard semantics outstanding"),
      ("P00_AUTH_OWNER_INVENTORY","DENY_BY_DEFAULT_DOCUMENTED","Phase00/02","348/348 mapping records; no allow decisions"),
      ("P00_MUTATING_HANDLER_SOURCE_REVIEW","SOURCE_REVIEWED_NOT_AUTHORIZED","Phase00","43/43 Git-blob verified; 0 allowed"),
      ("P00_INHERITED_TYPE_REVIEW","LEXICAL_TRIAGE_NOT_TYPE_BOUND","Phase00/02","160 files, Spring runtime registration unresolved"),
      ("P00_RUNTIME_SPRING_CHAIN_MATCH","NOT_RUN","Phase02","Actual matcher/order/dispatcher behavior unverified"),
      ("P00_GATEWAY_DENY_BEFORE_FORWARD","NOT_IMPLEMENTED_VERIFIED","Phase02","No production gateway handler or isolated real HTTP proof"),
      ("P00_USER_LIBRARY_BOOK_FILE_ENTITLEMENT","NOT_PROVEN","Phase02/05/07","Per-book current content and child-file relationships unresolved"),
      ("P00_KO_CREDENTIAL_LOGGING","SOURCE_RISK_UNMITIGATED","Phase02/05","Controller and generic logger can receive secrets"),
      ("P00_RUNTIME_NEGATIVE_FIXTURES","STATIC_ONLY_NOT_EXECUTED","Phase02/07","109/109 definitions pass, actual HTTP tests NOT_RUN"),
      ("P00_FRESH_INDEPENDENT_REVIEW","PASS_PHASE00_DESIGN_ONLY_RUNTIME_NOT_RUN","Fresh GPT-6 context","Exact independent design review attestation, not a GitHub human approval"),
    ]
    obj={"schemaVersion":1,"basis":"PINNED_EVIDENCE_WITH_FAIL_CLOSED_RELEASE_POLICY",
      "phase01FoundationReviewed":phase01_accepted,
      "phase01IndependentTechnicalVerdict":"PASS_AT_REVIEWED_SOURCE_HEAD" if phase01_accepted else "NOT_ATTESTED",
      "phase01ReviewedSourceHead":PHASE01_REVIEWED_HEAD if phase01_accepted else None,
      "phase01HumanGitHubApproval":False,"phase01RuntimeSecurityAuthorized":False,
      "sourcePin":PIN,"independentReviewReportGitBlob":REVIEW_BLOB,
      "phase00SourceCensusVerified":True,"phase00SourceAuthorizationReviewComplete":False,
      "phase00DesignContractIndependentlyAccepted":True,"freshDesignReviewedHead":REVIEWED_SOURCE_HEAD,
      "freshDesignReviewGitBlob":FRESH_DESIGN_REVIEW_BLOB,
      "phase00Priority43SourceReviewComplete":True,
      "newP001PinnedSourceMechanismReconciled":True,
      "newP001RuntimeAuthorizationVerified":False,
      "newP001SourceEvidenceArtifact":"new-p0-01-source-mechanism-receipt",
      "sourceAuthorizationCoverage":"43_PRIORITY_REVIEWED_348_SOURCE_RECORDS_DENY_UNTIL_PHASE02",
      "securityContractReadyForIndependentAcceptance":False,
      "sourceAnnotationComplete":False,"runtimeSpringRouteComplete":"NOT_RUN",
      "authorizationRuntimeProof":"NOT_RUN","gatewayRuntimeEnforcement":"NOT_RUN",
      "historicalIndependentVerdict":"CHANGES_REQUIRED","freshIndependentVerdict":"PASS_PHASE00_DESIGN_ONLY",
      "phase00ContractLocked":True,"phase01Authorized":True,
      "nextGateOwner":"PHASE02_GATEWAY_RUNTIME_SECURITY_HARD_GATE",
      "sourceRouteCountNotRuntime":403,"methodMappingRecords":348,
      "methodNamesNotUnique":346,"prioritySourceReviewRecords":43,
      "fixtureDefinitionsStaticValidated":109,
      "gateRows":[{"id":k,"status":v,"owner":who,"reason":reason} for k,v,who,reason in gates]}
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(json.dumps({"phase00SourceCensusVerified":True,"sourceHandlerAndRouteVerified":"348 / 403",
      "sourceReview43":True,"runtimeTests":"NOT_RUN","phase01Authorized":True,
      "gateRows":len(gates)},indent=2))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--repo",type=pathlib.Path,required=True)
    p.add_argument("--output",type=pathlib.Path,required=True)
    a=p.parse_args()
    try:validate(a.repo,a.output)
    except Exception as e:print("PHASE00_RELEASE_GATE_INTEGRITY_FAILED "+str(e),file=sys.stderr);sys.exit(2)
