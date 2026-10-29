#!/usr/bin/env python3
"""Deterministic source-content census at exact Grimmory pin. AST = syntax evidence only."""
import argparse, collections, datetime, hashlib, json, pathlib, re, subprocess, sys

PIN='402e89b4452f8e2b17ab95f16c1621c003516cd2'
SCOPE='backend/src/main/java/org/booklore/'
MAPPINGS={'RequestMapping':['UNSPECIFIED'],'GetMapping':['GET'],'PostMapping':['POST'],
          'PutMapping':['PUT'],'PatchMapping':['PATCH'],'DeleteMapping':['DELETE']}
CONTROLLERS={'Controller','RestController'}
AUTH_ANNOTATIONS={'PreAuthorize','PostAuthorize','Secured','RolesAllowed','PermitAll','DenyAll','CheckBookAccess','CheckLibraryAccess'}
ALT_ENDPOINTS={'MessageMapping','SubscribeMapping','ServerEndpoint','Endpoint','QueryMapping','MutationMapping','SchemaMapping','BatchMapping','ControllerEndpoint','RestControllerEndpoint'}
HINT=re.compile(r'(?i)(RouterFunctions|RouterFunction|RequestMappingHandlerMapping|HandlerMapping|WebMvcConfigurer|ServletRegistration|FilterRegistration|Endpoint|WebSocketMessageBrokerConfigurer|WebSocketConfigurer|StompEndpointRegistry|addPathPrefix|registerMapping|setUrlMap|addResourceHandler|addInterceptor|addPathPatterns|addEndpoint|enableSimpleBroker|setApplicationDestinationPrefixes|setUserDestinationPrefix|setAllowedOriginPatterns|registerStompEndpoints|registerWebSocketHandlers|MessageMapping)')

def cmd(root,*args):
    return subprocess.run(['git','-C',str(root),*args],check=True,capture_output=True).stdout

def write(path,obj):
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

def scan(root,out):
    root=root.resolve()
    head=cmd(root,'rev-parse','HEAD').decode().strip()
    if head!=PIN: raise RuntimeError('Pinned HEAD mismatch '+head)
    paths=[]
    for raw in cmd(root,'ls-tree','-r','HEAD','--',SCOPE).decode().splitlines():
        meta,path=raw.split('\t',1)
        mode,typ,sha=meta.split()
        if typ=='blob' and path.endswith('.java'):paths.append((path,sha))
    paths.sort()
    if not paths:raise RuntimeError('No Java files at pinned path')
    out.mkdir(parents=True,exist_ok=True)
    (out/'java-paths.txt').write_text('\n'.join(x for x,_ in paths)+'\n',encoding='utf8')
    ledger=[];failure=[]
    for path,sha in paths:
        row={'sourcePath':path,'fileBlobSha':sha,'contentAvailable':False,'inspected':False,
             'scanStatus':'UNREAD','signalCount':0,'classifierConfidence':'UNVERIFIED',
             'unresolvedSemanticQuestions':[]}
        try:
            body=(root/path).read_bytes()
            gitsha=hashlib.sha1(('blob '+str(len(body))+'\0').encode()+body).hexdigest()
            if gitsha!=sha:raise ValueError('Blob mismatch '+gitsha)
            string=body.decode('utf8')
            row.update(contentAvailable=True,inspected=True,scanStatus='CONTENT_SHA_VERIFIED',
                       contentBytes=len(body),contentLines=len(string.splitlines()),
                       contentSha256=hashlib.sha256(body).hexdigest())
        except (OSError,UnicodeError,ValueError) as e:
            failure.append({'sourcePath':path,'error':str(e)})
            row['scanStatus']='CONTENT_FAILURE'
        ledger.append(row)
    if failure:raise RuntimeError('Content failures: '+str(failure[:10]))
    ast=pathlib.Path(__file__).with_name('JavaRouteAstScanner.java')
    build=out/'build';build.mkdir(exist_ok=True)
    compile=subprocess.run(['javac','-encoding','UTF-8','-d',str(build),str(ast)],
                           capture_output=True,text=True)
    (out/'javac-log.txt').write_text(compile.stdout+compile.stderr,encoding='utf8')
    if compile.returncode:raise RuntimeError('Scanner compile failed: '+compile.stderr[:1000])
    proc=subprocess.run(['java','-Xmx2g','-cp',str(build),'JavaRouteAstScanner',str(root),
                         str(out/'java-paths.txt')],capture_output=True,text=True)
    (out/'ast-stderr.txt').write_text(proc.stderr,encoding='utf8')
    if proc.returncode:raise RuntimeError('AST parse process failed: '+proc.stderr[:1000])
    parsed=set();errors=[];events=collections.defaultdict(list)
    for raw in proc.stdout.splitlines():
        parts=raw.split('\t',5)
        if len(parts)!=6:raise RuntimeError('Malformed AST event: '+raw[:120])
        kind,path,line,cls,method,expr=parts
        ev={'kind':kind,'sourcePath':path,'sourceLine':int(line),'className':cls,
            'methodName':method,'expression':expr}
        if kind=='FILE':parsed.add(path)
        elif kind=='ERROR':errors.append(ev)
        else:events[path].append(ev)
    expected={path for path,_ in paths}
    if parsed!=expected:raise RuntimeError('Missing AST parses: '+str(sorted(expected-parsed)[:10]))
    signals=[];kinds=collections.Counter();meta_defs={}
    for row in ledger:
        path=row['sourcePath'];all_events=events[path]
        row['signalCount']=len(all_events)
        row['scanStatus']='CONTENT_SHA_VERIFIED_AST_PARSED'
        row['classifierConfidence']='JAVA_AST_SYNTAX_NO_TYPE_BINDING'
        for e in all_events:
            if e['kind']=='CLASS' and 'kind=ANNOTATION_TYPE;' in e['expression']:
                meta_defs.setdefault(e['className'].split('.')[-1],set()).add(path)
            if e['kind']=='CLASS' and ('extends=null;' not in e['expression'] or not (e['expression'].endswith('implements=') or e['expression'].endswith('implements=[]'))):
                row['unresolvedSemanticQuestions'].append('Inherited/interface route annotations require semantic review')
            if e['kind'] in ('CALL','NEW') and HINT.search(e['expression']):
                row['unresolvedSemanticQuestions'].append('Programmatic mapping reachability and prefix require review')
            if e['kind']=='ANNOTATION':
                at=e['expression'].split('||',1)[0].split('.')[-1]
                if at in MAPPINGS:kind='ANNOTATION_MAPPING';methods=MAPPINGS[at]
                elif at in CONTROLLERS:kind='CONTROLLER_MARKER';methods=[]
                elif at in ALT_ENDPOINTS:kind='OTHER_ENDPOINT_ANNOTATION';methods=[]
                elif at in AUTH_ANNOTATIONS:kind='AUTH_ANNOTATION_SOURCE';methods=[]
                else:continue
                typ=at
            elif e['kind'] in ('CALL','NEW') and HINT.search(e['expression']):
                kind='PROGRAMMATIC_SOURCE_SIGNAL';methods=[];typ=e['kind']
            elif e['kind']=='CLASS' and HINT.search(e['expression']):
                kind='FRAMEWORK_TYPE_SIGNAL';methods=[];typ='CLASS'
            else:continue
            kinds[kind]+=1
            signals.append({'upstreamCommit':PIN,'fileBlobSha':row['fileBlobSha'],
               'sourcePath':path,'sourceLine':e['sourceLine'],'className':e['className'],
               'handlerIdentity':e['className']+'#'+e['methodName'],
               'handlerMechanism':kind,'annotationType':typ,'sourceExpression':e['expression'],
               'classPrefix':None,'declaredMethods':methods,'pathVariants':None,
               'mappingConditions':None,'mappingExpansion':'NOT_SEMANTICALLY_EXPANDED',
               'authChain':'UNVERIFIED','authorizationDimensions':['UNVERIFIED'],
               'gatewayOwner':'DENY_BY_DEFAULT_UNTIL_REVIEWED',
               'evidenceGrade':'SOURCE_AST_SYNTAX_ONLY',
               'openQuestions':['Review full mapping composition, meta annotations, inheritance, conditions and security ownership']})
        if any(e['sourcePath']==path for e in errors):
            row['scanStatus']='AST_PARSE_DIAGNOSTIC_ERROR'
    summary={'schemaVersion':1,'upstreamRepository':'grimmory-tools/grimmory',
        'upstreamCommit':PIN,'sourceScope':SCOPE+'**/*.java',
        'generatedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'filesEnumerated':len(paths),'contentReadAndBlobShaVerified':sum(x['inspected'] for x in ledger),
        'filesFailedContentRead':len(failure),'astParsedFiles':len(parsed),
        'astErrors':errors,'sourceCandidates':len(signals),
        'mappingAnnotationOccurrences':kinds['ANNOTATION_MAPPING'],
        'controllerMarkers':kinds['CONTROLLER_MARKER'],
        'authAnnotationOccurrences':kinds['AUTH_ANNOTATION_SOURCE'],
        'programmaticSignals':kinds['PROGRAMMATIC_SOURCE_SIGNAL'],
        'customAnnotationDefinitionNames':sorted(meta_defs),
        'CONTROLLER_FILE_CENSUS':'RECONCILIATION_REQUIRED',
        'METHOD_ANNOTATION_CENSUS':'RECONCILIATION_REQUIRED',
        'SOURCE_DECLARED_ROUTE_CANDIDATES':'AST_UNEXPANDED',
        'SOURCE_ANNOTATION_COMPLETE':False,
        'RUNTIME_ROUTE_COMPLETE':'NOT_RUN',
        'securityDefault':'DENY_UNCLASSIFIED_SENSITIVE',
        'reviewerStatus':'CHANGES_REQUIRED_UNTIL_INDEPENDENT_REVIEW',
        'scopeWarning':'Source AST annotations and signals are NOT expanded runtime HTTP route counts',
        'files':ledger}
    write(out/'JAVA-SOURCE-WIDE-CENSUS.json',summary)
    write(out/'SOURCE-ROUTE-CANDIDATES.json',{'schemaVersion':1,'upstreamCommit':PIN,
       'status':'SOURCE_CANDIDATES_REQUIRE_SEMANTIC_REVIEW','candidates':signals})
    unresolved=[x for x in ledger if x['unresolvedSemanticQuestions']]
    (out/'SOURCE-ROUTE-OWNERSHIP-GAPS.md').write_text(
       '# Source Route Ownership Gaps — Pinned AST Evidence\n\n'
       'Static Java AST is not type binding, Spring mapping expansion or a security approval.\n\n'
       'All unclassified personal/sensitive routes: DENY by default. Never wildcard-pass-through.\n\n'
       '## Unresolved files\n\n'+''.join('- '+x['sourcePath']+': '+
          '; '.join(sorted(set(x['unresolvedSemanticQuestions'])))+'\n' for x in unresolved),
       encoding='utf8')
    (out/'JAVA-SOURCE-WIDE-CENSUS-RECEIPT.md').write_text(
       '# Java Source-wide Census Receipt (AST, NOT RUNTIME)\n\n'
       '- Grimmory pinned: '+PIN+'\n'
       '- Enumerated: '+str(len(paths))+' Java files; full content SHA verified: '+
         str(summary['contentReadAndBlobShaVerified'])+'; AST units: '+str(len(parsed))+
         '; syntax errors: '+str(len(errors))+'.\n'
       '- Mapping annotation occurrences: '+str(kinds['ANNOTATION_MAPPING'])+
         ', not expanded HTTP routes.\n'
       '- Candidate signals: '+str(len(signals))+
         '; manual mapping/ownership reconciliation still required.\n'
       '- SOURCE_ANNOTATION_COMPLETE: **FALSE**; RUNTIME_ROUTE_COMPLETE: **NOT_RUN**.\n'
       '- Scanner does not run upstream code or test gateway/KO/logging/ACL/SQLite/E2E.\n',
       encoding='utf8')
    print(json.dumps({k:v for k,v in summary.items() if k not in ('files','astErrors')},indent=2))
    return 3 if errors else 0

if __name__=='__main__':
    a=argparse.ArgumentParser()
    a.add_argument('--upstream',type=pathlib.Path,required=True)
    a.add_argument('--output',type=pathlib.Path,required=True)
    opts=a.parse_args()
    try:sys.exit(scan(opts.upstream,opts.output))
    except Exception as e:print('SCAN_FAILED: '+str(e),file=sys.stderr);sys.exit(2)
