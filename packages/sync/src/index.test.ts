import { it, expect } from "vitest"; import { syncCapability,assertSyncCapabilityEnabled } from "./index.js";
it("refuses sync",()=>{expect(Object.values(syncCapability).every(x=>!x)).toBe(true);expect(assertSyncCapabilityEnabled).toThrow();});
