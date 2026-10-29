#!/usr/bin/env python3
"""NEW-P0-01: pinned JVM source mechanism/owner census. NOT a Spring runtime proof."""
import argparse, collections, hashlib, json, pathlib, re, subprocess, sys

PIN = "402e89b4452f8e2b17ab95f16c1621c003516cd2"
SRC = "backend/src/main/java/org/booklore/"
CANDIDATE_TYPES = (
    "WebMvcConfigurer", "WebSocketMessageBrokerConfigurer", "WebSocketConfigurer",
    "RouterFunction", "HandlerFunction", "HandlerMapping", "HttpRequestHandler",
    "HttpServlet", "Servlet", "WebSocketHandler", "HttpHandler", "Controller",
    "StompEndpointRegistry", "ServerEndpoint",
)
# These mechanisms create routes outside ordinary mapped Java controllers,
# or may expose alternate transports. New evidence must fail closed.
DYNAMIC = re.compile(
    r"(?<!\w)(?:RouterFunctions\s*\.|RouterFunction\s*<|RequestMappingHandlerMapping\b|"
    r"registerMapping\s*\(|ServletRegistrationBean\b|ServletRegistration\s*\.\s*Dynamic\b|"
    r"SimpleUrlHandlerMapping\b|setUrlMap\s*\(|setMappings\s*\(|"
    r"addViewControllers?\s*\(|addRedirectViewController\s*\(|addPathPrefix\s*\(|"
    r"registerWebSocketHandlers\s*\(|"
    r"org\.springframework\.web\.(?:reactive|servlet)\.function\.server\b|"
    r"@(?:WebServlet|WebFilter|ServerEndpoint|HttpExchange|GetExchange|PostExchange|"
    r"PutExchange|DeleteExchange|PatchExchange|GraphQlController|SchemaMapping|"
    r"QueryMapping|MutationMapping|ControllerEndpoint|RestControllerEndpoint|"
    r"MessageMapping|SubscribeMapping|WebService|WebMethod)\b|"
    r"@(?:Path|GET|POST|PUT|DELETE|PATCH)\s*(?:\(|\b))"
)
KNOWN_PROGRAMMATIC = {
    "backend/src/main/java/org/booklore/config/WebMvcConfig.java": {
        "FRAMEWORK_TYPE_SIGNAL": 1,
        "PROGRAMMATIC_SOURCE_SIGNAL": 7,
    },
    "backend/src/main/java/org/booklore/config/WebSocketConfig.java": {
        "FRAMEWORK_TYPE_SIGNAL": 1,
        "PROGRAMMATIC_SOURCE_SIGNAL": 6,
    },
    "backend/src/main/java/org/booklore/config/security/SecurityConfig.java": {
        "PROGRAMMATIC_SOURCE_SIGNAL": 2,
    },
}
KINDS = {
    "ANNOTATION_MAPPING": 411,
    "CONTROLLER_MARKER": 64,
    "AUTH_ANNOTATION_SOURCE": 223,
    "FRAMEWORK_TYPE_SIGNAL": 2,
    "PROGRAMMATIC_SOURCE_SIGNAL": 15,
}
EXPECTED_INHERITANCE = {
    "ATTRIBUTE_CONVERTER_OR_DATA_LAYER": 7,
    "BACKGROUND_TASK_OR_FRAMEWORK_IMPLEMENTATION": 7,
    "DATA_REPOSITORY_INTERFACE_EXPOSURE_REQUIRES_DEPENDENCY_REVIEW": 65,
    "MODEL_DTO_OR_ENTITY_TYPE": 9,
    "OTHER_EXTENDS_OR_IMPLEMENTS_TYPE_REVIEW": 11,
    "SECURITY_FILTER_OR_INTERCEPTOR_NOT_STANDALONE_HANDLER": 10,
    "SERVICE_OR_FRAMEWORK_IMPLEMENTATION": 49,
    "WEB_CONFIGURATION_ROUTE_OR_STOMP_EXPOSURE": 2,
}
def load(path):
    return json.loads(pathlib.Path(path).read_text(encoding="utf8"))
def candidate_base_types(declarations):
    out = []
    for row in declarations:
        s = row["astDeclaration"]
        extends = re.search(r"(?:^|;)extends=([^;]*);", s)
        implements = re.search(r"(?:^|;)implements=([^;]*)", s)
        for value in ((extends.group(1) if extends else ""), (implements.group(1) if implements else "")):
            if not value or value == "null":
                continue
            # Do not confuse "...Controller" within unrelated class method names.
            out.extend(re.split(r"[,<>\s]+", value))
    return [x for x in out if x]
def inherited_endpoint_candidates(item):
    return sorted({type_name for type_name in candidate_base_types(item["classDeclarations"])
        if any(type_name == name or type_name.endswith("." + name) for name in CANDIDATE_TYPES)
        or type_name.endswith(("HandlerMapping","HttpServlet","Controller","Servlet","HttpRequestHandler","WebSocketHandler"))})
def census(upstream, evidence):
    if subprocess.check_output(["git", "-C", str(upstream), "rev-parse", "HEAD"],text=True).strip() != PIN:
        raise ValueError("wrong pinned Grimmory HEAD")
    c=load(evidence/"JAVA-SOURCE-WIDE-CENSUS.json")
    signals=load(evidence/"SOURCE-ROUTE-CANDIDATES.json")
    triage=load(evidence/"JAVA-INHERITANCE-TYPE-TRIAGE.json")
    repo=load(evidence/"REPOSITORY-REST-SOURCE-EXPOSURE.json")
    conditions=load(evidence/"SOURCE-CONDITION-RESOLUTION.json")
    expanded=load(evidence/"SOURCE-DECLARED-MAPPING-EXPANSION.json")
    chains=load(evidence/"SOURCE-403-SECURITY-CHAIN-CANDIDATES.json")
    ledger=load(evidence/"SOURCE-AUTH-OWNERSHIP-LEDGER.json")
    if any(j.get("upstreamCommit")!=PIN for j in (c,signals,triage,repo,expanded,chains)):
        raise ValueError("mixed upstream source pins")
    if (c["filesEnumerated"],c["contentReadAndBlobShaVerified"],c["astParsedFiles"],len(c["astErrors"]))!=(923,923,923,0):
        raise ValueError("923 Java source SHA/AST proof incomplete")
    # Recheck every pinned source blob to make this proof substantive, not merely copied JSON.
    found=[]
    unknown=[]
    suspicious=[]
    for file in c["files"]:
        path=file["sourcePath"]
        if not path.startswith(SRC) or not path.endswith(".java"):
            raise ValueError("unexpected Java source scope: " + path)
        raw=(upstream/path).read_bytes()
        git_hash=hashlib.sha1(("blob "+str(len(raw))+"\0").encode()+raw).hexdigest()
        if git_hash!=file["fileBlobSha"]:
            raise ValueError("source content differs from recorded Git blob: "+path)
        text=raw.decode("utf8")
        for n,line in enumerate(text.splitlines(),1):
            if DYNAMIC.search(line) and not line.lstrip().startswith(("//","*","/*")):
                suspicious.append({"sourcePath":path,"line":n,"expression":line.strip()[:210]})
        found.append(path)
    if len(found)!=len(set(found)) or len(found)!=923:
        raise ValueError("duplicate or missing source files")
    if suspicious:
        raise ValueError("Previously unaccounted route mechanism signatures: "+json.dumps(suspicious[:20]))
    kinds=collections.Counter(x["handlerMechanism"] for x in signals["candidates"])
    if dict(kinds)!=KINDS or len(signals["candidates"])!=715:
        raise ValueError("alternate endpoint or annotation signal census changed: "+str(kinds))
    if c["customAnnotationDefinitionNames"]!=["CheckBookAccess","CheckLibraryAccess"]:
        raise ValueError("custom annotation definitions changed; composed mappings need review")
    if expanded["methodMappingAnnotations"]!=348 or expanded["classMappingAnnotations"]!=63 or expanded["routeHandlerRecords"]!=348:
        raise ValueError("declared controller annotation census changed")
    if expanded["unresolvedHandlerCount"]!=15 or expanded["unresolvedPathVariants"]!=0:
        raise ValueError("unexpected source mapping aliases, path variants, or symbolic count")
    if conditions["symbolicConditions"]!=15 or conditions["unresolvedThirdPartyOrDynamic"]!=0:
        raise ValueError("15 symbolic source mapping conditions not verified")
    if chains["sourceRouteVariants"]!=403 or not chains["allRouteForwardingDenied"]:
        raise ValueError("route chain source candidates not all denied")
    if len(ledger["allRouteRecords"])!=348 or any(x["allowedToProxyNow"] for x in ledger["allRouteRecords"]):
        raise ValueError("source route ownership is no longer fail closed")
    program=collections.defaultdict(collections.Counter)
    for item in signals["candidates"]:
        if item["handlerMechanism"] in ("FRAMEWORK_TYPE_SIGNAL","PROGRAMMATIC_SOURCE_SIGNAL"):
            program[item["sourcePath"]][item["handlerMechanism"]]+=1
    if {k:dict(v) for k,v in program.items()}!=KNOWN_PROGRAMMATIC:
        raise ValueError("unowned alternate route or programmatic registration candidate")
    if triage["lexicalClassFlaggedFiles"]!=160 or triage["categoryCounts"]!=EXPECTED_INHERITANCE:
        raise ValueError("inherited/interface Java source classification changed")
    inherited=[]
    for item in triage["items"]:
        if item["hasDirectMethodMappingAnnotationInFile"]:
            raise ValueError("inherited-route source handler requires type-bound review")
        bases=inherited_endpoint_candidates(item)
        if bases:
            inherited.append({"path":item["sourcePath"],"baseTypes":bases})
    expected={
      "backend/src/main/java/org/booklore/config/WebMvcConfig.java": ["WebMvcConfigurer"],
      "backend/src/main/java/org/booklore/config/WebSocketConfig.java": ["WebSocketMessageBrokerConfigurer"],
    }
    if {x["path"]:x["baseTypes"] for x in inherited}!=expected:
        raise ValueError("unexpected inheritance-based web endpoint candidate: "+str(inherited))
    if (repo["reposWithLexicalInterfaceOrExtendsFlag"],repo["javaFilesChecked"])!=(65,923) or any(
        repo[k] for k in ("pinnedGradleLockSpringDataRestDependencies","pinnedGradleBuildSpringDataRestDeclarations","springDataRestSourceSymbols")
    ):
        raise ValueError("repository generated HTTP endpoint exposure cannot be excluded at source")
    return {
      "schemaVersion":1,"sourcePin":PIN,"grade":"PINNED_JAVA_SOURCE_MECHANISM_RECONCILIATION_NOT_RUNTIME",
      "shaVerifiedAstSources":923,"allObservedAnnotationAndProgrammaticSignals":715,
      "declaredAnnotationOccurrences":411,"methodHandlerRecords":348,
      "sourceMethodPathVerbCandidates":403,"mappingAliasesAndPathLiteralsUnresolved":0,
      "customAnnotationDefinitions":["CheckBookAccess","CheckLibraryAccess"],
      "alternateEndpointAnnotationSignals":0,
      "programmaticSignalRecords":17,"programmaticKinds":KNOWN_PROGRAMMATIC,
      "inheritanceOrInterfaceFlags":160,"inheritedWebConfigTypes":inherited,
      "repositoryRestInterfacesWithoutRegistrationIndicator":65,
      "unexpectedWebRegistrationSignatures":0,
      "sourceCandidateForwardingAllowed":0,
      "newP001SourceMechanismEnumeration":"RECONCILED_FOR_PINNED_SOURCE",
      "newP001RuntimeAuthorizationClosure":"NOT_RUN_PHASE02",
      "completeEffectiveSpringRoutes":"NOT_PROVEN",
      "sourceAnnotationComplete":"NOT_PROVEN_TYPE_BOUND_RUNTIME",
      "authorizationRuntimeProof":"NOT_RUN",
      "gatewayIngressProof":"NOT_RUN",
      "independentSecurityApproval":"NOT_RUN",
      "phase01Authorized":False,
    }
def main():
    a=argparse.ArgumentParser()
    a.add_argument("--upstream",type=pathlib.Path,required=True)
    a.add_argument("--evidence",type=pathlib.Path,required=True)
    a.add_argument("--output",type=pathlib.Path,required=True)
    x=a.parse_args()
    report=census(x.upstream,x.evidence)
    x.output.parent.mkdir(parents=True,exist_ok=True)
    x.output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf8")
    print(json.dumps({k:v for k,v in report.items() if k!="programmaticKinds"},indent=2))
if __name__=="__main__":
    try:main()
    except Exception as exc:
        print("NEW_P0_01_SOURCE_MECHANISM_GATE_FAILED: "+str(exc),file=sys.stderr)
        sys.exit(2)
