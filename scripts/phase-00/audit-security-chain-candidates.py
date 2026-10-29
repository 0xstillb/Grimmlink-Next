#!/usr/bin/env python3
"""Pinned source SecurityConfig chain candidate matrix, not a Spring runtime verdict.

Unknown templates, fallback permitAll, auth public or query-JWT permitAll are
always deny in the gateway contract. Does not call Official or ship a proxy.
"""
import argparse,collections,hashlib,json,pathlib,re,subprocess,sys
PIN="402e89b4452f8e2b17ab95f16c1621c003516cd2"
SECURITY_PATH="backend/src/main/java/org/booklore/config/security/SecurityConfig.java"
SECURITY_BLOB="c99e1decb2b761f60fb0429287b5ef873d20c8b7"
CHAINS=[
 (1,"OPDS_BASIC",("/api/v1/opds/**","/api/v2/opds/**"),"BASIC_AUTH_EXCEPT_SEARCH"),
 (2,"KOMGA_BASIC",("/komga/api/v1/**","/komga/api/v2/**"),"BASIC_AUTH"),
 (3,"KOREADER_FILTER",("/api/koreader/**",),"KO_AUTHENTICATED"),
 (3,"KOBO_FILTER",("/api/kobo/**",),"KOBO_AUTHENTICATED"),
 (4,"MEDIA_QUERY_JWT",("/api/v1/media/**",),"PERMIT_ALL_FILTERS_ATTACHED"),
 (5,"CUSTOM_FONT_QUERY_JWT",("/api/v1/custom-fonts/*/file",),"PERMIT_ALL_FILTERS_ATTACHED"),
 (6,"EPUB_STREAM_QUERY_JWT",("/api/v1/epub/*/file/**",),"PERMIT_ALL_FILTERS_ATTACHED"),
 (7,"AUDIO_STREAM_QUERY_JWT",("/api/v1/audiobooks/*/stream/**","/api/v1/audiobooks/*/track/*/stream/**","/api/v1/audiobooks/*/cover"),"PERMIT_ALL_FILTERS_ATTACHED"),
 (8,"DOWNLOAD_QUERY_JWT",("/api/v1/books/*/download","/api/v1/books/*/download-all","/api/v1/books/*/files/*/download"),"PERMIT_ALL_FILTERS_ATTACHED"),
 (9,"WEBSOCKET",("/ws/**",),"PERMIT_ALL_WEBSOCKET_FRAME_AUTH_SEPARATE"),
 (10,"JWT_API",("/api/**","/komga/**"),"JWT_AUTHENTICATED_EXCEPT_PUBLIC_WHITELIST"),
 (11,"STATIC_FALLBACK",("/**",),"PERMIT_ALL_STATIC_FALLBACK")
]
PUBLIC=("/ws/**","/kobo/**","/api/docs","/api/openapi.json",
 "/api/v1/auth/login","/api/v1/auth/refresh","/api/v1/auth/remote",
 "/api/v1/auth/oidc/**","/api/v1/public-settings","/api/v1/setup/**",
 "/api/v1/healthcheck/**")
JWT_EXCEPT=PUBLIC+("/api/v1/opds","/api/v1/opds/**","/api/v2/opds",
 "/api/v2/opds/**","/api/kobo","/api/kobo/**","/api/v1/auth/refresh",
 "/api/v1/setup")
def blob(raw):return hashlib.sha1(("blob "+str(len(raw))+"\0").encode()+raw).hexdigest()
def sample(template):
    # Deliberately selects a representative *source* route path; not runtime path patterns.
    s=re.sub(r"\{[^{}\/]+\}","phase00synthetic",template)
    s=s.replace("**","phase00synthetic/tail").replace("*","phase00synthetic")
    return s
def match(pattern,path):
    # Approximate segments: literal, *, and **. Wildcard may also match zero
    # segments in Spring; exact prefix root is recorded as an ambiguity below.
    escaped=re.escape(pattern)
    escaped=escaped.replace(r"\*\*",".*").replace(r"\*","[^/]+")
    return re.fullmatch(escaped,path) is not None
def root_ambiguous(pattern,path):
    return pattern.endswith("/**") and path==pattern[:-3]
def select(path):
    fallback=None;ambiguities=[]
    for order,name,patterns,source_auth in CHAINS:
        candidates=[p for p in patterns if match(p,path)]
        roots=[p for p in patterns if root_ambiguous(p,path)]
        if roots:ambiguities.append({"chain":name,"patterns":roots,"reason":"SPRING_DOUBLE_STAR_ROOT_MATCH_RUNTIME_UNVERIFIED"})
        if not candidates:continue
        if name=="JWT_API" and any(match(p,path) or root_ambiguous(p,path) for p in JWT_EXCEPT):
            continue
        fallback={"chain":name,"order":order,"sourceAuthExpression":source_auth,
            "matchedSourcePatterns":candidates}
        break
    if fallback is None:raise RuntimeError("fallback security chain missing")
    return fallback,ambiguities
def audit(root,expanded_file,auth_file,outdir):
    git=lambda *a:subprocess.check_output(["git","-C",str(root),*a],text=True).strip()
    if git("rev-parse","HEAD")!=PIN:raise ValueError("pinned Grimmory changed")
    source=(root/SECURITY_PATH).read_bytes()
    if blob(source)!=SECURITY_BLOB or git("rev-parse","HEAD:"+SECURITY_PATH)!=SECURITY_BLOB:
        raise ValueError("SecurityConfig Git blob changed")
    sc=source.decode("utf8")
    for order,name,patterns,_ in CHAINS:
        if name=="STATIC_FALLBACK":signature="public SecurityFilterChain staticResourcesSecurityChain("
        else:
            aliases={"OPDS_BASIC":"opdsBasicAuthSecurityChain","KOMGA_BASIC":"komgaBasicAuthSecurityChain",
                "KOREADER_FILTER":"koreaderSecurityChain","KOBO_FILTER":"koboSecurityChain",
                "MEDIA_QUERY_JWT":"coverJwtApiSecurityChain","CUSTOM_FONT_QUERY_JWT":"customFontSecurityChain",
                "EPUB_STREAM_QUERY_JWT":"epubStreamingSecurityChain","AUDIO_STREAM_QUERY_JWT":"audiobookStreamingSecurityChain",
                "DOWNLOAD_QUERY_JWT":"bookDownloadSecurityChain","WEBSOCKET":"wsSecurityChain","JWT_API":"jwtApiSecurityChain"}
            signature="public SecurityFilterChain "+aliases[name]+"("
        if signature not in sc:raise ValueError("source chain signature missing "+name)
        # Validate each exact matcher literal appears in pinned SecurityConfig.
        for p in patterns:
            if ('"'+p+'"') not in sc and p!="/**":raise ValueError("source chain matcher missing "+name+" "+p)
    for p in JWT_EXCEPT:
        if ('"'+p+'"') not in sc:raise ValueError("JWT exception not in pinned source "+p)
    exp=json.loads(expanded_file.read_text("utf8"));auth=json.loads(auth_file.read_text("utf8"))
    if exp["upstreamCommit"]!=PIN or auth["sourcePin"]!=PIN:raise ValueError("evidence pin changed")
    if len(exp["expandedDeclarations"])!=403 or len(auth["allRouteRecords"])!=348:raise ValueError("changed baseline")
    # Handler method names are not unique: Java overloads / route variants have distinct source lines.
    owners={(r["sourcePath"],r["sourceLine"],r["handlerIdentity"]):r for r in auth["allRouteRecords"]}
    if len(owners)!=348:raise ValueError("colliding source line keys: "+str(len(owners)))
    rows=[];counts=collections.Counter();uncertain=0;missing=[]
    for e in exp["expandedDeclarations"]:
        handler=e["handlerIdentity"];owner=owners.get((e["sourcePath"],e["sourceLine"],handler))
        if owner is None:missing.append((e["sourcePath"],e["sourceLine"],handler));continue
        path=e["path"];representative=sample(path)
        ch,amb=select(representative)
        if any(rp=="UNCLASSIFIED" for rp in owner["gatewayOwnerCandidates"]):
            raise ValueError("unclassified owner "+handler)
        if amb:uncertain+=1
        counts[ch["chain"]]+=1
        rows.append({"handlerIdentity":handler,"sourcePath":e["sourcePath"],
          "sourceLine":e["sourceLine"],"sourceMethod":e["method"],
          "sourcePathTemplate":path,"representativePathNotRuntime":representative,
          "sourceGatewayOwnerCandidates":owner["gatewayOwnerCandidates"],
          "sourceSecurityChainCandidate":ch,"sourceMatcherAmbiguities":amb,
          "sourceIncludesPermissionAnnotations":owner["hasLocalSecurityAnnotation"],
          "sourceAnalysisBasis":"PINNED_SOURCE_PATTERN_APPROXIMATION_NO_SPRING_RUNTIME",
          "gatewayForwardDecision":"DENY","capabilityStatus":"OFF",
          "isRuntimeChainProven":False,"isBookEntitlementProven":False,
          "isDirectIngressIsolationProven":False,"phase01Authorized":False})
    if missing or len(rows)!=403:raise ValueError("source route coverage incomplete "+str(missing[:10]))
    outdir.mkdir(parents=True,exist_ok=True)
    data={"schemaVersion":1,"upstreamCommit":PIN,
      "securityConfigPinnedGitBlob":SECURITY_BLOB,
      "sourceRouteVariants":len(rows),"sourceMethodHandlers":len(owners),
      "distinctJavaMethodNames":len({r["handlerIdentity"] for r in auth["allRouteRecords"]}),
      "methodNameCollisionCount":len(owners)-len({r["handlerIdentity"] for r in auth["allRouteRecords"]}),
      "sourceChainCandidateCounts":dict(sorted(counts.items())),
      "sourceChainAmbiguousRepresentativeCount":uncertain,
      "runtimeSpringMatching":"NOT_RUN","userCurrentContentAuthorization":"NOT_PROVEN",
      "wildcardAndProxyCoverage":"DENY_BY_DEFAULT",
      "allRouteForwardingDenied":all(x["gatewayForwardDecision"]=="DENY" for x in rows),
      "sourceSecurityChainClassificationOnly":True,
      "completeSecurityContract":False,"independentReview":"CHANGES_REQUIRED",
      "PHASE01_AUTHORIZED":False,"routes":rows}
    (outdir/"SOURCE-403-SECURITY-CHAIN-CANDIDATES.json").write_text(json.dumps(data,indent=2)+"\n",encoding="utf8")
    summary="# Phase 00 — All 403 Source Route/Verb Variants: Security Chain Candidate Matrix\n\n"
    summary+="**403/403 source variants classified by pinned SecurityConfig patterns; 0 allowed to proxy.**\n"
    summary+="The representative path expansion, filter-order match and JWT exceptions here are only a source pattern approximation. Spring Security's actual matcher order and root/wildcard matching MUST be checked at runtime. A permitAll chain is not an authorization approval, especially when filter checks are installed.\n\n"
    summary+="| Candidate security chain | Source variants |\n|---|---:|\n"
    for k,n in sorted(counts.items()):summary+="| "+k+" | "+str(n)+" |\n"
    summary+="\nSource pattern root ambiguities: "+str(uncertain)+". SecurityConfig pinned at Grimmory "+PIN+", blob "+SECURITY_BLOB+".\n\n"
    summary+="**Explicit DENY:** public OIDC/login/setup/refresh, Kobo/KO, WebSocket STOMP, generic/static fallback, downloads, media/query-token, OPDS/Komga, all user-personal mutating/read paths until separately reviewed. Do not allow blanket wildcard passthrough or direct Official backend ingress.\n\n"
    summary+="Full individual candidate routes are in [SOURCE-403-SECURITY-CHAIN-CANDIDATES.json](SOURCE-403-SECURITY-CHAIN-CANDIDATES.json). Gateway NOT implemented, real HTTP/Gateway tests NOT_RUN, Phase01 NOT_AUTHORIZED; independent CHANGES_REQUIRED continues.\n"
    (outdir/"SOURCE-403-SECURITY-CHAIN-CANDIDATES.md").write_text(summary,encoding="utf8")
    print(json.dumps({k:v for k,v in data.items() if k not in ("routes",)},indent=2))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    for name in ("--upstream","--expanded","--auth","--output"):p.add_argument(name,type=pathlib.Path,required=True)
    a=p.parse_args()
    try:audit(a.upstream,a.expanded,a.auth,a.output)
    except Exception as e:print("CHAIN_CANDIDATE_AUDIT_FAILED",str(e),file=sys.stderr);sys.exit(2)
