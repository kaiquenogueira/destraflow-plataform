import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const version = "0.1.0";
const archive = `vendor/destraflow-brand-${version}.tgz`;
const releaseSha256 = "8aacc72cd70894fd84e949eb0ffbafff0a1d13555453b17f31ef08d59d2a5ab1";
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root));

const actualSha256 = createHash("sha256").update(read(archive)).digest("hex");
assert.equal(actualSha256, releaseSha256, "O arquivo da marca difere da release brand-v0.1.0");

const lock = JSON.parse(read("package-lock.json"));
const expectedReference = `file:${archive}`;
assert.equal(lock.packages[""].dependencies["@destraflow/brand"], expectedReference);
assert.equal(lock.packages["node_modules/@destraflow/brand"].version, version);
assert.equal(lock.packages["node_modules/@destraflow/brand"].resolved, expectedReference);

const installed = JSON.parse(read("node_modules/@destraflow/brand/package.json"));
assert.equal(installed.name, "@destraflow/brand");
assert.equal(installed.version, version);

const brandSource = read("node_modules/@destraflow/brand/src/index.ts").toString("utf8");
const siteUrl = brandSource.match(/siteUrl:\s*'([^']+)'/)?.[1];
const loginUrl = brandSource.match(/loginUrl:\s*'([^']+)'/)?.[1];
assert.ok(siteUrl && loginUrl, "URLs da marca não encontradas na fonte instalada");
const llms = read("public/llms.txt").toString("utf8");
assert.ok(llms.includes(`[Página inicial](${siteUrl}/)`), "llms.txt difere do siteUrl da marca");
assert.ok(llms.includes(`[Acesso ao CRM](${loginUrl})`), "llms.txt difere do loginUrl da marca");
assert.ok(!llms.includes(`https://www.${new URL(siteUrl).host}`), "llms.txt contém o host www não canônico");

console.log(`check-brand-package: @destraflow/brand@${version}, release SHA-256 conferido`);
