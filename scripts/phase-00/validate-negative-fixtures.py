#!/usr/bin/env python3
"""Static contract checks only; not fixture execution or negative security tests."""
import collections, json, pathlib, sys

def check(source, receipt):
    data=json.loads(source.read_text(encoding='utf8'))
    cases=data['fixtures']; failures=[]
    required=('fixtureId','family','request','preconditions','expected','sourceReference',
       'phaseOwner','implementationPath','executionState','testScenario',
       'expectedUpstreamAttempts','expectedMutationObservability',
       'expectedDurableState','expectedDiagnosticEvent','expectedHttpStatus')
    ids=set(); families=collections.Counter(); scenarios=collections.Counter()
    for f in cases:
        fid=f.get('fixtureId','<missing>')
        for key in required:
            if key not in f:failures.append(fid+': missing '+key)
        if fid in ids:failures.append(fid+': duplicate')
        ids.add(fid);families[f.get('family')]+=1;scenarios[f.get('testScenario')]+=1
        if f.get('executionState')!='NOT_RUN':failures.append(fid+': execution state not NOT_RUN')
        if f.get('testScenario') not in (
            'CURRENT_DISABLED_BEHAVIOR','FUTURE_IMPLEMENTED_BEHAVIOR','CRASH_NO_HTTP_RESPONSE'):
            failures.append(fid+': invalid scenario')
        if f.get('testScenario')=='CRASH_NO_HTTP_RESPONSE' and f.get('expectedHttpStatus') is not None:
            failures.append(fid+': crash incorrectly promises HTTP response')
        if f.get('testScenario')=='CURRENT_DISABLED_BEHAVIOR' and f.get('expectedHttpStatus') in (200,201,202):
            failures.append(fid+': currently disabled but claims success HTTP status')
        if not str(f.get('sourceReference','')).startswith(
            'https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/'):
            failures.append(fid+': reference not pinned')
        if 'expected' in f:
            exp=f['expected']
            if exp.get('httpStatus')!=f.get('expectedHttpStatus'):
                failures.append(fid+': inconsistent expected HTTP')
            if exp.get('durableState')!=f.get('expectedDurableState'):
                failures.append(fid+': inconsistent durable state')
            if exp.get('diagnosticEvent')!=f.get('expectedDiagnosticEvent'):
                failures.append(fid+': inconsistent diagnostic event')
    if len(cases)!=109:failures.append('109 current fixture count changed')
    result={'sourceFile':str(source),'totalDefinitions':len(cases),
        'uniqueFixtureIds':len(ids),'families':dict(families),
        'testScenarios':dict(scenarios),'failures':failures,'execution':'STATIC_ONLY',
        'actualNegativeTests':'NOT_RUN','runtimeHttpTests':'NOT_RUN',
        'schemaEngine':'NOT_RUN','sourceAstScannerSeparate':True}
    receipt.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(result,indent=2))
    return 1 if failures else 0

if __name__=='__main__':
    sys.exit(check(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2])))
