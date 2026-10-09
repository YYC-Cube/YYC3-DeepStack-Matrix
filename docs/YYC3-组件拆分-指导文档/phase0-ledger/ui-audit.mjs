#!/usr/bin/env node
// Phase 0 只读审计：四项目 components/ui 组件交集/并集 + L0/L1/L2 初步仲裁
// 纯 node:fs/crypto，无需 node_modules。
// 用法：node ui-audit.mjs > ui-matrix.json
// 脚本位于 docs/YYC3-组件拆分-指导文档/phase0-ledger/，向上三级为工作区根。
// 评级口径：L0=字节级全同；L0*=去注释/空白后全同（仅文件头或格式差）；
//          L1=归一化行集合最小 Jaccard ≥0.85（小异）；L1/L2?=0.6~0.85；L2=<0.6；
//          UNIQUE=仅一个项目存在（"非四项目齐备"另见 presence 长度）。
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(scriptDir, "..", "..", "..");
const OUT = join(scriptDir, "ui-matrix.json");

const PROJECTS = [
  { id: "P1", dir: "YYC3 CloudPivot Intelli Matrix", ui: "src/app/components/ui" },
  { id: "P2", dir: "YYC3 CloudPivot Intelli-Matrix", ui: "components/ui" },
  { id: "P3", dir: "YYC3-CloudPivot Intelli-Matrix", ui: "src/app/components/ui" },
  { id: "P4", dir: "YYC3-CloudPivot-Intelli-Matrix", ui: "src/app/components/ui" },
];

// 递归收集 ui 目录下全部 .tsx/.ts（以相对 ui 根路径为键）
function collect(uiAbs) {
  const map = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (extname(name) === ".tsx" || extname(name) === ".ts") {
        map.set(relative(uiAbs, abs), abs);
      }
    }
  };
  walk(uiAbs);
  return map;
}

// 归一化：去注释 + 去全部空白，用于识别「仅格式/注释差异」
function normalize(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")        // 块注释
    .replace(/(^|[^:"'])\/\/[^\n]*/g, "$1")  // 行注释（避开 URL:// 与字符串）
    .replace(/\s+/g, "");                    // 所有空白
}

// 行集合（trim/去空行/去注释行），用于 Jaccard 相似度
function lineSet(code) {
  return new Set(
    code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((l) => l.replace(/\/\/.*$/, "").trim())
      .filter((l) => l.length > 0)
  );
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const sha = (s) => createHash("sha1").update(s).digest("hex").slice(0, 10);

const data = {};
const union = new Set();
for (const p of PROJECTS) {
  const files = collect(join(ROOT, p.dir, p.ui));
  data[p.id] = { ui: p.ui, count: files.size, files: {} };
  for (const [rel, abs] of files) {
    const raw = readFileSync(abs, "utf8");
    data[p.id].files[rel] = { bytes: Buffer.byteLength(raw, "utf8"), rawHash: sha(raw), normHash: sha(normalize(raw)), lines: lineSet(raw) };
    union.add(rel);
  }
}

const components = [];
for (const rel of [...union].sort()) {
  const row = { file: rel, present: {} };
  const presentIn = [];
  for (const p of PROJECTS) {
    const f = data[p.id].files[rel];
    row.present[p.id] = !!f;
    if (f) presentIn.push({ p: p.id, ...f });
  }
  row.presence = presentIn.map((x) => x.p).join("");
  const rawHashes = new Set(presentIn.map((x) => x.rawHash));
  const normHashes = new Set(presentIn.map((x) => x.normHash));

  if (presentIn.length >= 2) {
    if (rawHashes.size === 1) row.verdict = "L0";
    else if (normHashes.size === 1) row.verdict = "L0*";
    else {
      let min = 1;
      const pairs = [];
      for (let i = 0; i < presentIn.length; i++) {
        for (let j = i + 1; j < presentIn.length; j++) {
          const s = jaccard(presentIn[i].lines, presentIn[j].lines);
          pairs.push(`${presentIn[i].p}~${presentIn[j].p}:${(s * 100) | 0}%`);
          if (s < min) min = s;
        }
      }
      row.minJaccard = Number(min.toFixed(3));
      row.pairs = pairs;
      row.verdict = min >= 0.85 ? "L1" : min >= 0.6 ? "L1/L2?" : "L2";
    }
  } else {
    row.verdict = "UNIQUE";
  }
  row.sizeBy = {};
  for (const x of presentIn) row.sizeBy[x.p] = x.bytes;
  components.push(row);
}

const result = {
  generatedAt: new Date().toISOString(),
  root: ROOT,
  summary: {
    counts: Object.fromEntries(PROJECTS.map((p) => [p.id, data[p.id].count])),
    union: union.size,
    byVerdict: components.reduce((acc, c) => ((acc[c.verdict] = (acc[c.verdict] || 0) + 1), acc), {}),
    notInAll: components.filter((c) => Object.values(c.present).filter(Boolean).length < 4).map((c) => ({ file: c.file, presence: c.presence, verdict: c.verdict })),
    uniqueBy: components.filter((c) => c.verdict === "UNIQUE").reduce((acc, c) => {
      const only = PROJECTS.map((p) => p.id).find((id) => c.present[id]);
      (acc[only] ||= []).push(c.file);
      return acc;
    }, {}),
  },
  components,
};

mkdirSync(scriptDir, { recursive: true });
writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.summary, null, 2));
