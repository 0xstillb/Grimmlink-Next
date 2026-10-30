import Fastify from "fastify";
import {expect,it} from "vitest";
import {registerIsolatedBackupRoutes} from "./backup-routes.js";

it("enforces owner and fake CSRF for two-step backup preview/confirm and explicit outcome state",async()=>{
  const server=Fastify({logger:false});
  const preview={action:"PREVIEW_THEN_EXPLICIT_CONFIRM" as const,bundleHash:"a".repeat(64),
    token:"b".repeat(64),bookIds:["book1"],coverApply:"SEPARATE_DISABLED" as const,writesAllowed:false as const};
  let confirmed=0;
  registerIsolatedBackupRoutes(server,{
    authorizeOwner:async(request)=>request.headers.authorization==="Bearer fake-owner",
    verifyMockCsrf:async(request)=>request.headers["x-csrf-test"]==="fake-match",
    getPreview:async(id)=>id==="backup1"?preview:null,
    confirmFake:async(_id,body)=>{confirmed++;expect(body.bundleHash).toBe(preview.bundleHash);
      return {state:"UNKNOWN",code:"FAKE_READBACK_MISMATCH",officialConnected:false};},
  });
  await server.ready();
  const url="/api/grimmlink/v2/local/backups/backup1/preview";
  expect((await server.inject({method:"GET",url})).statusCode).toBe(403);
  const headers={authorization:"Bearer fake-owner"};
  const r=await server.inject({method:"GET",url,headers});
  expect(r.json()).toMatchObject({preview:{coverApply:"SEPARATE_DISABLED",writesAllowed:false}});
  const body={confirmed:true,bundleHash:preview.bundleHash,token:preview.token,idempotencyKey:"restore1"};
  const post="/api/grimmlink/v2/local/backups/backup1/confirm";
  expect((await server.inject({method:"POST",url:post,headers,payload:body})).statusCode).toBe(403);
  const approved=await server.inject({method:"POST",url:post,headers:{...headers,"x-csrf-test":"fake-match"},payload:body});
  expect(approved.statusCode).toBe(200);
  expect(approved.json()).toMatchObject({state:"UNKNOWN",code:"FAKE_READBACK_MISMATCH",officialConnected:false});
  expect(confirmed).toBe(1);
  const malformed=await server.inject({method:"POST",url:post,headers:{...headers,"x-csrf-test":"fake-match"},payload:{...body,extra:"unsafe"}});
  expect(malformed.statusCode).toBe(400);
  expect(confirmed).toBe(1);
  await server.close();
});
