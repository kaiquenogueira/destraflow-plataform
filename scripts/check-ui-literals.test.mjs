import { test } from "node:test";
import assert from "node:assert/strict";
import { findColorLiterals } from "./check-ui-literals.mjs";

test("rejeita cores cravadas em classes e estilos", () => {
  assert.deepEqual(findColorLiterals('bg-[#c7a06b] color: rgba(0,0,0,.2); text-white'), [
    '#c7a06b',
    'rgba(',
    'text-white',
  ]);
});

test("aceita tokens canônicos e âncoras", () => {
  assert.deepEqual(findColorLiterals('bg-surface text-gold border-border href="#solucao" color: var(--text)'), []);
});
