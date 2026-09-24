import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = join(root, "src");
const patterns = [
  /#[0-9a-fA-F]{3,8}\b/g,
  /\b(?:rgba?|hsla?|oklch|lab|lch|color)\s*\(/gi,
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|placeholder|selection)-(?:white|black|(?:gray|neutral|zinc|stone|slate|amber|orange|yellow|red|green|blue)-\d{2,3})(?:\/[\w.[\]-]+)?\b/g,
  /\b(?:color|background(?:-color)?|border-color)\s*:\s*(?:white|black|red|blue|green)(?=[;,\s])/gi,
];

export function findColorLiterals(source) {
  return patterns
    .flatMap((pattern) => [...source.matchAll(pattern)].map((match) => ({ value: match[0], index: match.index })))
    .sort((a, b) => a.index - b.index)
    .map(({ value }) => value);
}

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(path);
    return /\.(?:css|ts|tsx|svg)$/.test(entry.name) ? [path] : [];
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const offenders = filesIn(sourceRoot).flatMap((path) => {
    const lines = readFileSync(path, "utf8").split("\n");
    return lines.flatMap((line, index) =>
      findColorLiterals(line).map((value) => `${relative(root, path)}:${index + 1}: ${value}`),
    );
  });
  for (const offender of offenders) console.error(offender);
  console.log(`check-ui-literals: ${offenders.length} cores fora de @destraflow/brand`);
  process.exitCode = offenders.length ? 1 : 0;
}
