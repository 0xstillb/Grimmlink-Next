import { randomBytes, scryptSync } from "node:crypto";

let password = "";
for await (const chunk of process.stdin) password += chunk.toString("utf8");
password = password.replace(/\r?\n$/, "");
const bytes = Buffer.byteLength(password, "utf8");
if (bytes < 12 || bytes > 256) {
  process.stderr.write("Owner password must contain 12 to 256 UTF-8 bytes.\n");
  process.exitCode = 1;
} else {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, {
    N: 32_768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  process.stdout.write(
    `scrypt$32768$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}\n`,
  );
}
password = "";
