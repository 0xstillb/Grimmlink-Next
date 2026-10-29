#!/usr/bin/env python3
"""Phase00 SOURCE-ONLY semantic/ownership ledger. NEVER a runtime authorization verdict."""
import argparse, collections, copy, json, pathlib, re, subprocess, sys
PIN="402e89b4452f8e2b17ab95f16c1621c003516cd2"
SCOPE="backend/src/main/java/org/booklore/"
WRITE={"POST","PUT","PATCH","DELETE"}
FRAMEWORK_COMMIT="82a6b40b9366ec181ededdad282b307ee5381a52"
FRAMEWORK_MEDIA_BLOB="1d7ecf7fff9ad63926ea2ea00f54d39aecf12cff"
def git(root,*argv):
    return subprocess.run(["git","-C",str(root),*argv],check=True,capture_output=True,text=True).stdout.strip()
def save(path,obj):
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
def local_literals(path):
    lines=path.read_text("utf8").splitlines()
    result={}
    for number,line in enumerate(lines,1):
        m=re.match(r'\s*(?:public|private|protected)?\s*static\s+final\s+String\s+([A-Za-z_]\w*)\s*=\s*"([^"]+)"\s*;',line)
        if m:result[m.group(1)]={"value":m.group(2),"line":number}
    return result
def chain_for(path):
    # These are source-driven candidate chains, NOT runtime Spring selection.
    if path is None:return "UNRESOLVED_PATH_DENY"
    if path.startswith(("/api/v1/opds/","/api/v2/opds/")):return "OPDS_BASIC_AUTH_CHAIN_CANDIDATE"
    if path.startswith(("/komga/api/v1/","/komga/api/v2/")):return "KOMGA_BASIC_AUTH_CHAIN_CANDIDATE"
    if path.startswith("/api/koreader/"):return "KOREADER_AUTH_FILTER_CHAIN_CANDIDATE"
    if path.startswith("/api/kobo/"):return "KOBO_AUTH_FILTER_CHAIN_CANDIDATE"
    if path.startswith("/api/v1/media/"):return "MEDIA_QUERY_JWT_CHAIN_CANDIDATE"
    if path.startswith("/api/"):return "GENERIC_API_JWT_OR_SPECIAL_CHAIN_CANDIDATE"
    if path.startswith("/komga/"):return "KOMGA_OR_GENERIC_CHAIN_CANDIDATE"
    return "DEFAULT_OR_SPECIAL_CHAIN_CANDIDATE"
def owner_for(path):
    if path is None:return "UNCLASSIFIED"
    if path.startswith("/api/v1/app/"):return "APP_PERSONAL"
    if path.startswith("/api/koreader/"):return "NATIVE_KO"
    if path.startswith("/api/kobo/"):return "KOBO"
    if path.startswith("/komga/"):return "KOMGA"
    if path.startswith(("/api/v1/opds/","/api/v2/opds/")):return "OPDS"
    if path.startswith(("/api/v1/books/","/api/v1/book-notes","/api/v2/book-notes","/api/v1/reading-sessions")):return "OFFICIAL_PERSONAL"
    return "OFFICIAL_OTHER_REVIEW"
def programmatic_kind(signal):
    if signal["handlerMechanism"]=="FRAMEWORK_TYPE_SIGNAL":return "FRAMEWORK_IMPLEMENTATION_REVIEW"
    expr=signal["sourceExpression"]
    if ".addEndpoint(" in expr:return "WEBSOCKET_HANDSHAKE_SOURCE"
    if ".addResourceHandler(" in expr:return "STATIC_RESOURCE_SOURCE"
    if ".addInterceptor(" in expr or ".addPathPatterns(" in expr:return "INTERCEPTOR_POLICY_NOT_STANDALONE_HANDLER"
    if any(x in expr for x in ("enableSimpleBroker","setApplicationDestinationPrefixes","setUserDestinationPrefix")):return "STOMP_DESTINATION_NOT_HTTP_ROUTE"
    if "setAllowedOriginPatterns" in expr:return "CORS_POLICY_NOT_ROUTE"
    return "PROGRAMMATIC_SOURCE_REQUIRES_REVIEW"
def main(root,census_file,expansion_file,outdir,framework_media):
    if git(root,"rev-parse","HEAD")!=PIN:raise ValueError("Pinned upstream commit mismatch")
    census=json.loads(census_file.read_text("utf8"))
    exp=json.loads(expansion_file.read_text("utf8"))
    if census["upstreamCommit"]!=PIN or exp["upstreamCommit"]!=PIN:raise ValueError("Mismatched evidence pin")
    if (census["filesEnumerated"],census["contentReadAndBlobShaVerified"],census["astParsedFiles"],len(census["astErrors"]))!=(923,923,923,0):
        raise ValueError("Incomplete Java AST coverage")
    outdir.mkdir(parents=True,exist_ok=True)
    gradle=(root/"backend/gradle.lockfile").read_text("utf8")
    build=(root/"backend/build.gradle.kts").read_text("utf8")
    if not re.search(r"^org\.springframework:spring-web:7\.0\.9=",gradle,re.MULTILINE):
        raise ValueError("Pinned gradle.lockfile does not lock spring-web 7.0.9")
    if 'id("org.springframework.boot") version "4.1.1"' not in build:
        raise ValueError("Pinned Spring Boot plugin declaration changed")
    actual=subprocess.run(["git","hash-object",str(framework_media)],check=True,capture_output=True,text=True).stdout.strip()
    if actual!=FRAMEWORK_MEDIA_BLOB:raise ValueError("Spring Framework MediaType git blob SHA mismatch "+actual)
    framework_literals=local_literals(framework_media)
    declared=exp["mappingCandidates"]
    local_cache={}
    condition_records=[]
    unresolved=[]
    all_mappings=0
    framework_resolved=0
    for handler in declared:
        for scope in handler["mappingConditions"]:
            for level in ("class","method"):
                for kind in ("produces","consumes","headers","params"):
                    field=scope[level].get(kind)
                    if not field or field["literalValues"] is not None:continue
                    expr=field["raw"]
                    record={"sourcePath":handler["sourcePath"],"fileBlobSha":handler["fileBlobSha"],
                        "sourceLine":handler["sourceLine"],"handlerIdentity":handler["handlerIdentity"],
                        "level":level,"field":kind,"sourceExpression":expr,
                        "resolvedLiteralValues":None,"declarationProof":None,
                        "classification":"UNRESOLVED_EXTERNAL_OR_DYNAMIC_SYMBOL"}
                    all_mappings+=1
                    if handler["sourcePath"].endswith("/OpdsController.java") and re.fullmatch(r"[A-Za-z_]\w*",expr):
                        if handler["sourcePath"] not in local_cache:
                            local_cache[handler["sourcePath"]]=local_literals(root/handler["sourcePath"])
                        decl=local_cache[handler["sourcePath"]].get(expr)
                        if decl:
                            record["resolvedLiteralValues"]=[decl["value"]]
                            record["declarationProof"]={"sourcePath":handler["sourcePath"],
                                "sourceLine":decl["line"],"fileBlobSha":handler["fileBlobSha"],
                                "method":"PINNED_SOURCE_STATIC_FINAL_STRING_LITERAL"}
                            record["classification"]="PINNED_SOURCE_LOCAL_LITERAL_RESOLVED"
                    if record["resolvedLiteralValues"] is None and re.fullmatch(r"MediaType\.[A-Z_]+_VALUE",expr):
                        constant=expr.split(".",1)[1]
                        decl=framework_literals.get(constant)
                        if decl:
                            record["resolvedLiteralValues"]=[decl["value"]]
                            record["declarationProof"]={"repository":"spring-projects/spring-framework",
                                "commit":FRAMEWORK_COMMIT,"path":"spring-web/src/main/java/org/springframework/http/MediaType.java",
                                "sourceLine":decl["line"],"fileBlobSha":FRAMEWORK_MEDIA_BLOB,
                                "dependencyLock":"grimmory-tools/grimmory@"+PIN+":backend/gradle.lockfile:200",
                                "method":"PINNED_SPRING_WEB_7_0_9_SOURCE_AND_GRADLE_LOCK"}
                            record["classification"]="LOCKED_DEPENDENCY_SOURCE_CONSTANT_RESOLVED_NOT_RUNTIME"
                            framework_resolved+=1
                    if record["resolvedLiteralValues"] is None:unresolved.append(record)
                    condition_records.append(record)
    if all_mappings!=15:raise ValueError("Unexpected source symbolic count "+str(all_mappings))
    local_count=sum(x["classification"]=="PINNED_SOURCE_LOCAL_LITERAL_RESOLVED" for x in condition_records)
    if local_count!=9 or framework_resolved!=6 or unresolved:
        raise ValueError("Pinned local/framework literal proof incomplete "+str((local_count,framework_resolved,len(unresolved))))
    # Lexical inheritance is *not* missing-handler count. Categorize no-direct mappings without asserting no inherited routes.
    source_mapped={x["sourcePath"] for x in declared}
    other=exp["programmaticAndAlternateSignals"]
    nonroute=[x for x in other if x["handlerMechanism"] in ("FRAMEWORK_TYPE_SIGNAL","PROGRAMMATIC_SOURCE_SIGNAL")]
    nonroute_paths={x["sourcePath"] for x in nonroute}
    inherited=[]
    for row in census["files"]:
        if not any("Inherited/interface route annotations" in t for t in row["unresolvedSemanticQuestions"]):continue
        p=row["sourcePath"]
        inherited.append({"sourcePath":p,"fileBlobSha":row["fileBlobSha"],
            "methodMappingSourceFile":p in source_mapped,
            "programmaticOrFrameworkSourceFlag":p in nonroute_paths,
            "classification":"ALTERNATE_FRAMEWORK_REVIEW" if p in nonroute_paths
                             else "NO_DIRECT_METHOD_MAPPING_OR_CAPTURED_PROGRAMMATIC_SIGNAL",
            "scope":"LEXICAL_EXTENDS_OR_IMPLEMENTS_NOT_PROOF_OF_INHERITED_ROUTES",
            "needsTypeBoundReachabilityProof":True})
    security_rows=[];triage=[]
    for handler in declared:
        methods=handler["declaredMethods"]
        paths=handler["pathVariants"]
        direct=handler["declaredSecurityAnnotations"]+handler["declaredClassSecurityAnnotations"]
        may_write=any(v in WRITE or v=="ANY" for v in methods)
        lacking=not bool(direct)
        info={"sourcePath":handler["sourcePath"],"fileBlobSha":handler["fileBlobSha"],
            "sourceLine":handler["sourceLine"],"handlerIdentity":handler["handlerIdentity"],
            "declaredMethods":methods,"pathVariants":paths,
            "declaredSecurityAnnotations":direct,
            "hasLocalSecurityAnnotation":bool(direct),
            "hasMutatingDeclaredMethod":may_write,
            "gatewayOwnerCandidates":sorted(set(owner_for(p) for p in paths)),
            "springSourceChainCandidates":sorted(set(chain_for(p) for p in paths)),
            "sourceAuthorizationProven":False,
            "serviceRecordOwnershipProven":False,
            "directIngressIsolationProven":False,
            "allowedToProxyNow":False,
            "gatewayDecision":"DENY_UNTIL_INDEPENDENT_SOURCE_AND_AUTH_REVIEW",
            "requiresReview":[
                "SOURCE_CHAIN_MATCH_ORDER_AND_WHITELIST",
                "SERVICE_ACL_AND_CURRENT_BOOK_OR_RECORD_OWNERSHIP",
                "CANONICAL_PATH_ALIAS_AND_DIRECT_BACKEND_INGRESS",
                "RUNTIME_MAPPINGS_PHASE02_NOT_RUN"
            ]}
        security_rows.append(info)
        if may_write and lacking:triage.append(info)
    if len(declared)!=348 or len(triage)!=43:
        raise ValueError("Unexpected handler/triage count "+str((len(declared),len(triage))))
    if len(inherited)!=160:raise ValueError("Unexpected lexical inheritance source count "+str(len(inherited)))
    resolution={"schemaVersion":1,"sourcePin":PIN,"sourceOnly":True,
        "symbolicConditions":len(condition_records),
        "resolvedFromPinnedLocalSource":sum(x["classification"]=="PINNED_SOURCE_LOCAL_LITERAL_RESOLVED" for x in condition_records),
        "resolvedFromLockedSpringDependencySource":framework_resolved,
        "springSourceCommit":FRAMEWORK_COMMIT,"springMediaTypeGitBlob":FRAMEWORK_MEDIA_BLOB,
        "dependencyLock":"backend/gradle.lockfile:spring-web:7.0.9",
        "actualRuntimeClassPathResolution":"NOT_RUN",
        "unresolvedThirdPartyOrDynamic":len(unresolved),
        "mappingConditions":condition_records,
        "unresolved":unresolved,
        "unresolvedRuntimeEquivalentProof":True,
        "SOURCE_ANNOTATION_COMPLETE":False,
        "RUNTIME_ROUTE_COMPLETE":"NOT_RUN"}
    audit={"schemaVersion":1,"sourcePin":PIN,"sourceOnly":True,"handlers":len(security_rows),
        "mutationWithoutLocalMethodOrClassAnnotation":len(triage),
        "handlersWithSourceAuthProven":0,
        "classification":"GATEWAY_OWNER_CANDIDATE_NOT_AUTHORIZATION_PROOF",
        "runtimeAuthorizationTests":"NOT_RUN","gatewayFeatureGates":"BLOCKED_OFF",
        "allRouteRecords":security_rows,"prioritizedMutationReview":triage,
        "unresolvedInheritance":inherited,
        "programmaticSignals":[dict(signal=x,classification=programmatic_kind(x)) for x in nonroute],
        "SOURCE_ANNOTATION_COMPLETE":False,
        "PHASE01_AUTHORIZED":False}
    save(outdir/"SOURCE-CONDITION-RESOLUTION.json",resolution)
    save(outdir/"SOURCE-AUTH-OWNERSHIP-LEDGER.json",audit)
    links=lambda x:"https://github.com/grimmory-tools/grimmory/blob/"+PIN+"/"+x["sourcePath"]+"#L"+str(x["sourceLine"])
    text="# Phase00 source-only authorization triage (NOT approval)\n\n"
    text+="923 Java bodies SHA verified, 348 method mappings, 403 source declarations; no runtime/ACL pass.\n\n"
    text+="## Source-condition resolution\n\n9 OPDS constants from pinned OpdsController.java; 6 Spring MediaType constants from spring-web 7.0.9 locked in upstream Gradle and exact Spring Framework Git blob. **15/15 source constants resolved**. Dependency runtime classpath and Spring mapping NOT_RUN.\n\n"
    text+="## Mutating handlers with no local method/class security annotation — "+str(len(triage))+"\n\n"
    text+="Local annotation absence is NOT unauthenticated access; each candidate requires filter-chain, user/book/record ACL and gateway-specific review. All remain deny in proposed bridge.\n\n"
    text+="| Source handler | Declared method(s) | Route(s) | Candidate chain | Pin |\n| --- | --- | --- | --- | --- |\n"
    for item in triage:
        text+="| "+item["handlerIdentity"]+" | "+", ".join(item["declaredMethods"])+" | "+", ".join(item["pathVariants"])+" | "+", ".join(item["springSourceChainCandidates"])+" | [source]("+links(item)+") |\n"
    text+="\n## Lexical class flags\n\n"+str(len(inherited))+" source files have class inheritance/interface syntax, **0** are direct method-mapping source files. This does not prove absent inherited route semantics. Two framework-related files (WebMvc and WebSocket) must remain separately tracked.\n\n"
    text+="## Non-controller programmatic candidates\n\n"
    for item in audit["programmaticSignals"]:
        x=item["signal"];text+="- "+item["classification"]+": [source]("+links(x)+") — "+x["sourceExpression"].replace("\n"," ")[:140]+"\n"
    text+="\n## Remaining security controls\n\nCurrent policies are documentary only. No live Gateway, no runtime Spring exporter, no credential ingress proof, no real HTTP ACL, no SQLite crash simulation, and no independent PASS. NEW-P0-01 remains BLOCKED, Phase01 NOT_AUTHORIZED.\n"
    (outdir/"SOURCE-AUTH-REVIEW-QUEUE.md").write_text(text,encoding="utf8")
    print(json.dumps({"localConditionsResolved":resolution["resolvedFromPinnedLocalSource"],
        "springConstantsResolved":framework_resolved,"symbolicRemaining":len(unresolved),"lexicalFlags":len(inherited),
        "authHandlers":len(security_rows),"prioritizedMutations":len(triage),
        "programmaticFlags":len(nonroute),"status":"SOURCE_ONLY_BLOCKED"},indent=2))
    return 0
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--upstream",type=pathlib.Path,required=True)
    p.add_argument("--census",type=pathlib.Path,required=True)
    p.add_argument("--expansion",type=pathlib.Path,required=True)
    p.add_argument("--output",type=pathlib.Path,required=True)
    p.add_argument("--framework-media-type",type=pathlib.Path,required=True)
    a=p.parse_args()
    try:sys.exit(main(a.upstream,a.census,a.expansion,a.output,a.framework_media_type))
    except Exception as e:print("SEMANTIC_AUDIT_FAILED",str(e),file=sys.stderr);sys.exit(2)
