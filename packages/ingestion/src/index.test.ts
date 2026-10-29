import { it, expect } from "vitest"; import { planIngestion } from "./index.js";
it("never plans a write",()=>{ expect(planIngestion().writesAllowed).toBe(false); });
