#!/usr/bin/env python3
"""
YYC3 Zero-Dependency / Internal-Only Component Audit Script v4
Interactive CLI with: Analysis / Report / Migration / Architecture Doc
"""
import os
import re
import sys
import shutil
import time
import json
import hashlib
from pathlib import Path
from datetime import datetime
from collections import defaultdict

YYC3_ROOT = Path("/Volumes/Containers/YYC3-组件拆分规范")
OUTPUT_DIR = YYC3_ROOT / "_audit-output"
REPORT_FILE = OUTPUT_DIR / "zero-dependency-star-rating.md"
MIGRATE_DIR = YYC3_ROOT / "yyc3-zero-deps"
ARCHITECTURE_FILE = OUTPUT_DIR / "yyc3-zero-deps-architecture.md"
CACHE_FILE = OUTPUT_DIR / ".audit-cache.json"

SKIP_PROJECTS = {"Custom", "__tests__", "_audit-output", "yyc3-zero-deps"}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".nuxt",
             "coverage", "__tests__", ".trae", ".vscode", "target"}

THIRD_PARTY_MODULES = {
    "radix-ui", "tanstack", "supabase", "hookform", "react-router",
    "lucide-react", "class-variance-authority", "clsx", "tailwind-merge",
    "tailwindcss", "date-fns", "framer-motion", "recharts", "openai",
    "bullmq", "ioredis", "zod", "axios", "express", "next", "lodash",
    "uuid", "bcrypt", "jsonwebtoken", "mongoose", "prisma", "drizzle",
    "sonner", "cmdk", "vaul", "embla-carousel", "react-day-picker",
    "dnd-kit", "hello-pangea", "resend", "stripe", "t3-oss", "trpc",
    "ai-sdk", "elastic", "winston", "pino", "chalk", "dotenv", "cors",
    "helmet", "compression", "morgan", "joi", "yup", "immutable", "rxjs",
    "reduxjs", "zustand", "jotai", "nanostores", "three", "react-three",
    "d3", "chart.js", "sentry", "vercel", "graphql", "apollo", "firebase",
    "google-cloud", "aws-sdk", "bull", "kafkajs", "amqplib", "pg",
    "mysql2", "better-sqlite3", "mongodb", "typeorm", "knex", "objection",
    "sequelize", "drizzle-orm", "libsql", "planetscale", "nanoid", "dayjs",
    "moment", "numeral", "validator", "ajv", "io-ts", "fp-ts", "effect",
    "neverthrow", "js-yaml", "gray-matter", "marked", "showdown",
    "highlight.js", "prismjs", "shiki", "katex", "mathjax", "mermaid",
    "cheerio", "jsdom", "puppeteer", "playwright", "cypress", "jest",
    "vitest", "mocha", "chai", "testing-library", "msw",
    "storybook", "eslint", "prettier", "typescript", "ts-node", "tsx",
    "esbuild", "vite", "webpack", "rollup", "turndown", "cron",
    "node-cron", "bottleneck", "p-limit", "p-queue", "eventemitter",
    "bunyan", "log4js", "debug", "inversify", "tsyringe", "awilix",
    "agenda", "graphql-request", "urql", "swr", "react-query",
    "use-debounce", "ahooks", "react-use", "use-gesture", "react-spring",
    "react-dnd", "react-dropzone", "react-hot-toast", "react-icons",
    "heroicons", "tabler", "phosphor-icons", "iconify", "lucide",
    "feather-icons", "react-syntax-highlighter", "react-markdown",
    "remark", "rehype", "unified", "mdx", "mdx-js", "next-mdx-remote",
    "nprogress", "animate.css", "tailwindcss-animate", "tailwind-variants",
    "cva", "tw-merge", "superjson", "devalue", "cookie", "jose", "argon2",
    "otpauth", "qrcode", "bcryptjs", "speakeasy", "handlebars", "ejs",
    "pug", "nunjucks", "mustache", "pdfkit", "sharp", "jimp", "canvas",
    "node-canvas", "svg2img", "html2canvas", "dom-to-image", "file-saver",
    "jszip", "archiver", "unzipper", "mime-types", "content-type",
    "accepts", "negotiator", "range-parser", "raw-body", "type-is",
    "iconv-lite", "sanitize-html", "dompurify", "xss", "escape-html",
    "markdown-it", "diff", "jsdiff", "deep-diff", "deepmerge",
    "lodash.merge", "immer", "mutative", "proxy-memoize", "reselect",
    "memoize-one", "fast-memoize", "micro-memoize", "ramda", "crocks",
    "most", "baconjs", "kefir", "flyd", "xstream", "callbag", "wonka",
    "reatom", "effector", "overmind", "logux", "legendapp", "valtio",
    "proxy-compare", "use-sync-external-store", "usehooks-ts", "rooks",
    "react-cool-hooks", "react-hook", "react-draggable", "react-rnd",
    "react-resizable", "react-resize-detector", "react-measure",
    "react-visibility-sensor", "react-intersection-observer",
    "react-in-viewport", "react-virtualized", "react-window",
    "react-virtual", "react-virtuoso", "virtua", "react-beautiful-dnd",
    "react-sortable-hoc", "react-grid-layout", "react-masonry",
    "react-split-pane", "react-split", "allotment",
    "react-resizable-panels", "react-tabs", "react-aria", "react-stately",
    "react-compiler", "babel", "swc", "rolldown", "rspack", "farm",
    "parcel", "turbo", "nx", "turborepo", "lerna", "pnpm", "changesets",
    "semantic-release", "standard-version", "commitizen", "cz-git",
    "commitlint", "husky", "lint-staged", "simple-git-hooks", "yorkie",
    "lefthook", "typescript-eslint", "stylelint", "markdownlint",
    "html-validate", "jsonlint", "yaml-lint", "dotenv-linter",
    "secretlint", "knip", "depcheck", "npm-check-updates", "audit-ci",
    "snyk", "socket-security", "lockfile-lint", "npm-package-json-lint",
    "ls-lint", "cspell", "textlint", "react-hook-form",
    "hookform/resolvers", "next-auth", "next-intl", "next-themes",
    "next-pwa", "next-seo", "notistack", "react-toastify", "toastr",
    "sweetalert2", "sweetalert", "react-confirm-alert", "react-modal",
    "react-responsive-modal", "headlessui", "tailwindcss/forms",
    "tailwindcss/typography", "tailwindcss/aspect-ratio", "autoprefixer",
    "postcss", "postcss-import", "postcss-nested", "sass", "node-sass",
    "less", "stylus", "css-modules", "aphrodite", "emotion",
    "styled-components", "goober", "twin.macro", "linaria", "panda-css",
    "pandacss", "vanilla-extract", "theme-ui", "grommet", "evergreen-ui",
    "blueprintjs", "antd", "ant-design", "chakra-ui", "rebass",
    "grid-styled", "reflexbox", "flexbox-react", "react-bootstrap",
    "reactstrap", "material-ui", "mui", "semantic-ui-react",
    "primereact", "primeflex", "primeicons", "ag-grid-react", "ag-grid",
    "handsontable", "react-data-grid", "react-table", "react-codemirror",
    "uiw/react-codemirror", "monaco-editor", "react-monaco-editor",
    "codemirror", "ace-builds", "react-ace", "brace", "diff2html",
    "react-diff-viewer", "reactflow", "xyflow", "dagre", "elkjs",
    "graphlib", "cytoscape", "vis-network", "visjs", "sigma.js", "sigma",
    "d3-force", "d3-drag", "d3-zoom", "d3-selection", "d3-scale",
    "d3-axis", "nivo", "victory", "plotly.js", "plotly", "highcharts",
    "echarts", "apexcharts", "react-apexcharts", "lightweight-charts",
    "react-sparklines", "react-trend", "react-minimal-pie-chart",
    "react-progress-bar", "react-circular-progressbar",
    "react-loading", "react-loader-spinner", "react-spinners",
    "react-placeholder", "react-content-loader", "react-skeleton",
    "react-loading-skeleton", "react-shimmer", "draft-js", "slate",
    "slate-react", "tiptap", "quill", "react-quill", "ckeditor",
    "tinymce", "prosemirror", "remirror", "lexical", "plate", "udecode",
    "blocknote", "novel", "milkdown", "bytemd", "vditor",
    "react-map-gl", "mapbox-gl", "leaflet", "react-leaflet", "pigeon-maps",
    "maplibre-gl", "react-maplibre", "deck.gl", "kepler.gl", "cartodb",
    "turf", "openlayers", "cesium", "resium", "three-globe", "globe.gl",
    "react-globe", "react-simple-maps", "react-d3-tree",
    "react-organizational-chart", "react-diagrams", "react-arborist",
    "react-complex-tree", "rc-tree", "react-sortable-tree",
    "react-filepond", "uppy", "filepond", "multer", "formidable",
    "busboy", "multiparty", "form-data", "node-fetch", "cross-fetch",
    "isomorphic-fetch", "ky", "got", "superagent", "request", "needle",
    "wreck", "bent", "centra", "cloudflare", "firebase-admin",
    "appwrite", "pocketbase", "convex", "convex-helpers", "fauna",
    "faunadb", "jsonbin", "json-server", "lowdb", "nedb", "tingodb",
    "lokijs", "pouchdb", "rxdb", "watermelondb", "nozbe", "objectbox",
    "realm", "mmkv", "react-native-mmkv", "async-storage",
    "expo-secure-store", "keytar", "keychain", "secure-storage", "conf",
    "configstore", "env-cmd", "cross-env", "dotenv-expand",
    "dotenv-flow", "dotenv-webpack", "dotenv-cli", "react-native-config",
    "react-native-dotenv", "next-env", "vue-dotenv", "socket.io",
    "socket.io-client", "uWebSockets.js", "faye-websocket", "sockjs",
    "signalr", "centrifuge", "ably", "pusher", "pubnub",
    "firebase-messaging", "onesignal", "web-push", "node-notifier",
    "electron-notifier", "toastify-js", "notyf", "react-notifications",
    "react-notification-badge", "antd-mobile", "antd-img-crop",
    "antd-dayjs-webpack-plugin", "rc-util", "rc-field-form", "rc-picker",
    "rc-table", "rc-tree-select", "rc-select", "rc-input", "rc-slider",
    "rc-progress", "rc-rate", "rc-tooltip", "rc-trigger", "rc-dropdown",
    "rc-menu", "rc-pagination", "rc-checkbox", "rc-switch", "rc-radio",
    "rc-calendar", "rc-time-picker", "rc-upload", "rc-image", "rc-dialog",
    "rc-drawer", "rc-popover", "rc-popconfirm", "rc-notification",
    "rc-alert", "rc-anchor", "rc-breadcrumb", "rc-collapse", "rc-tabs",
    "rc-motion", "rc-overflow", "rc-virtual-list",
}

BUILTIN_MODULES = {"react", "react-dom", "react-native", "node", "fs", "path",
                   "os", "crypto", "http", "https", "url", "util", "stream",
                   "buffer", "events", "child_process", "net", "tls", "dns",
                   "querystring", "assert", "zlib", "tty", "module", "vm",
                   "cluster", "worker_threads", "perf_hooks", "timers",
                   "console", "process", "global", "window", "document"}


def is_third_party(module_name: str) -> bool:
    base = module_name.split("/")[0].lstrip("@").split("/")[0]
    if base in BUILTIN_MODULES:
        return False
    if base in THIRD_PARTY_MODULES:
        return True
    if module_name.startswith("@") and len(module_name.split("/")) >= 2:
        scope = module_name.split("/")[0].lstrip("@")
        pkg = module_name.split("/")[1] if len(module_name.split("/")) > 1 else ""
        combined = f"{scope}/{pkg}"
        if combined in THIRD_PARTY_MODULES or scope in THIRD_PARTY_MODULES:
            return True
    return False


def is_relative_import(module_name: str) -> bool:
    return module_name.startswith("./") or module_name.startswith("../")


def file_md5(filepath: str) -> str:
    h = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def fmt_size(sz: int) -> str:
    if sz < 1024:
        return f"{sz}B"
    elif sz < 1048576:
        return f"{sz // 1024}KB"
    else:
        return f"{sz // 1048576}MB"


def analyze_file(filepath: str) -> dict:
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except (IOError, OSError):
        return None

    lines = content.split("\n")
    line_count = len(lines)
    file_size = os.path.getsize(filepath)

    import_re = re.compile(
        r"""(?:import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]"""
        r"""|from\s+['"]([^'"]+)['"])"""
    )

    imports = []
    for match in import_re.finditer(content):
        mod = match.group(1) or match.group(2)
        if mod:
            imports.append(mod)

    non_builtin_imports = []
    for mod in imports:
        base = mod.split("/")[0].lstrip("@").split("/")[0] if mod else ""
        if base not in BUILTIN_MODULES:
            non_builtin_imports.append(mod)

    has_third_party = any(is_third_party(m) for m in non_builtin_imports)
    has_relative = any(is_relative_import(m) for m in non_builtin_imports)
    internal_count = sum(1 for m in non_builtin_imports if is_relative_import(m))

    has_export = bool(re.search(r"^export\s+", content, re.MULTILINE))
    has_types = bool(re.search(r"^(export\s+)?(interface|type|enum)\s+", content, re.MULTILINE))

    if not non_builtin_imports:
        category = "zero_dep"
    elif not has_third_party and has_relative:
        category = "internal_only"
    else:
        return None

    stars = 5
    reasons = []

    if category == "zero_dep":
        if line_count < 5:
            stars = 3
            reasons.append("文件行数过少(<5行)")
        elif line_count < 15:
            stars = 4
            reasons.append("文件行数较少(<15行)")
        if line_count > 500:
            stars = max(1, stars - 1)
            reasons.append(f"文件过大(>{line_count}行)")
        if has_export and stars < 5:
            stars += 1
        if has_types and stars < 5:
            stars += 1
    elif category == "internal_only":
        stars = 4
        if internal_count <= 1:
            stars = 5
        elif internal_count > 5:
            stars = 3
            reasons.append(f"内部依赖过多({internal_count}个)")
        if line_count < 10:
            stars = max(1, stars - 1)
            reasons.append("文件行数过少(<10行)")
        if line_count > 800:
            stars = max(1, stars - 1)
            reasons.append(f"文件过大(>{line_count}行)")
        if has_export and stars < 5:
            stars += 1

    stars = max(1, min(5, stars))

    return {
        "path": filepath,
        "rel_path": None,
        "category": category,
        "stars": stars,
        "lines": line_count,
        "size": fmt_size(file_size),
        "internal_count": internal_count,
        "reasons": ", ".join(reasons) if reasons else "-",
        "has_export": has_export,
        "has_types": has_types,
    }


def find_ts_files(root: Path) -> list:
    files = []
    for ext in ("*.ts", "*.tsx"):
        for f in root.rglob(ext):
            skip = False
            for part in f.parts:
                if part in SKIP_DIRS:
                    skip = True
                    break
            if not skip:
                files.append(str(f))
    return files


def star_display(stars: int) -> str:
    return "★" * stars + "☆" * (5 - stars)


def run_analysis():
    start_time = time.time()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print()
    print("  正在收集 TypeScript 文件...")
    all_files = find_ts_files(YYC3_ROOT)
    print(f"  共发现 {len(all_files)} 个 TS/TSX 文件")
    print()

    print("  正在分析文件依赖...")
    zero_dep = []
    internal_only = []
    project_stats = defaultdict(lambda: {"total": 0, "zero": 0, "internal": 0})

    total_processed = 0
    for filepath in all_files:
        result = analyze_file(filepath)
        total_processed += 1

        if total_processed % 500 == 0:
            print(f"    已分析 {total_processed}/{len(all_files)} 文件...")

        if result is None:
            parts = Path(filepath).parts
            if len(parts) > 1 and parts[1] not in SKIP_PROJECTS:
                project_stats[parts[1]]["total"] += 1
            continue

        rel = os.path.relpath(filepath, YYC3_ROOT)
        result["rel_path"] = rel

        parts = Path(filepath).parts
        proj_name = parts[1] if len(parts) > 1 else "root"

        if proj_name in SKIP_PROJECTS:
            continue

        project_stats[proj_name]["total"] += 1

        if result["category"] == "zero_dep":
            zero_dep.append(result)
            project_stats[proj_name]["zero"] += 1
        elif result["category"] == "internal_only":
            internal_only.append(result)
            project_stats[proj_name]["internal"] += 1

    elapsed = time.time() - start_time
    print(f"  分析完成! 耗时 {elapsed:.1f}s")
    print()

    total_compliant = len(zero_dep) + len(internal_only)
    print(f"  ✅ 零依赖组件:         {len(zero_dep)}")
    print(f"  🔶 仅内部依赖独立单元: {len(internal_only)}")
    print(f"  📋 达标组件合计:       {total_compliant}")
    print()

    cache = {
        "timestamp": timestamp,
        "elapsed": round(elapsed, 1),
        "total_files": len(all_files),
        "zero_dep": zero_dep,
        "internal_only": internal_only,
        "project_stats": {k: v for k, v in project_stats.items()},
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    print(f"  💾 分析缓存已保存: {CACHE_FILE}")

    return cache


def generate_report(cache: dict):
    if not cache:
        print("\n  ⚠️ 尚未执行分析，请先执行功能 1")
        return False

    timestamp = cache["timestamp"]
    elapsed = cache["elapsed"]
    zero_dep = cache["zero_dep"]
    internal_only = cache["internal_only"]
    project_stats = cache["project_stats"]
    total_files = cache["total_files"]
    total_compliant = len(zero_dep) + len(internal_only)

    zero_dep.sort(key=lambda x: (-x["stars"], x["rel_path"]))
    internal_only.sort(key=lambda x: (-x["stars"], x["rel_path"]))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("\n  正在生成星级审计报告...")

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write("# YYC³ 零依赖/内部依赖组件星级审计报告\n\n")
        f.write(f"> 审计时间: {timestamp}\n")
        f.write(f"> 审计范围: {YYC3_ROOT}\n")
        f.write(f"> 审计标准: YYC³「五高五标五化」组件拆分规范\n")
        f.write(f"> 审计维度: 零依赖组件 + 仅内部依赖独立单元\n")
        f.write(f"> 分析耗时: {elapsed}s\n\n")
        f.write("---\n\n")

        f.write("## 📊 审计总览\n\n")
        f.write("| 指标 | 数值 |\n")
        f.write("|------|------|\n")
        f.write(f"| 扫描文件总数 | {total_files} |\n")
        f.write(f"| ✅ 零依赖组件 | {len(zero_dep)} |\n")
        f.write(f"| 🔶 仅内部依赖独立单元 | {len(internal_only)} |\n")
        f.write(f"| 📋 达标组件合计 | {total_compliant} |\n\n")

        f.write("### 项目维度达标统计\n\n")
        f.write("| 项目名称 | TS文件总数 | 零依赖 | 仅内部依赖 | 达标率 |\n")
        f.write("|----------|-----------|--------|-----------|--------|\n")
        for name in sorted(project_stats.keys()):
            s = project_stats[name]
            comp = s["zero"] + s["internal"]
            rate = f"{comp / s['total'] * 100:.1f}%" if s["total"] > 0 else "0%"
            f.write(f"| {name} | {s['total']} | {s['zero']} | {s['internal']} | {rate} |\n")
        f.write("\n---\n\n")

        f.write("## ⭐ 类别一：零依赖组件\n\n")
        f.write("> **定义**: 无任何第三方依赖、无内部模块导入的完全独立 TypeScript/TSX 文件\n")
        f.write("> **评级标准**: ★★★★★ = 完美独立单元 | ★★★★☆ = 轻微扣分 | ★★★☆☆ = 需改进\n\n")

        if not zero_dep:
            f.write("> ⚠️ 未发现零依赖组件\n\n")
        else:
            f.write("| 星级 | 文件路径 | 行数 | 大小 | 备注 |\n")
            f.write("|------|---------|------|------|------|\n")
            for r in zero_dep:
                sd = star_display(r["stars"])
                f.write(f"| {sd} `{r['stars']}/5` | `{r['rel_path']}` | {r['lines']} | {r['size']} | {r['reasons']} |\n")
            f.write("\n")

        f.write("---\n\n")

        f.write("## 🔶 类别二：仅内部依赖独立单元\n\n")
        f.write("> **定义**: 无第三方依赖，仅引用项目内部模块（相对路径/别名路径）的 TypeScript/TSX 文件\n")
        f.write("> **评级标准**: ★★★★★ = 完美内部独立 | ★★★★☆ = 良好 | ★★★☆☆ = 内部耦合偏高\n\n")

        if not internal_only:
            f.write("> ⚠️ 未发现仅内部依赖独立单元\n\n")
        else:
            f.write("| 星级 | 文件路径 | 行数 | 大小 | 内部依赖数 | 备注 |\n")
            f.write("|------|---------|------|------|-----------|------|\n")
            for r in internal_only:
                sd = star_display(r["stars"])
                f.write(f"| {sd} `{r['stars']}/5` | `{r['rel_path']}` | {r['lines']} | {r['size']} | {r['internal_count']} | {r['reasons']} |\n")
            f.write("\n")

        f.write("---\n\n")

        f.write("## 🏆 五星达标组件清单\n\n")
        f.write("> 以下组件达到 ★★★★★ 标准，符合 YYC³ 最高级别独立组件规范\n\n")
        f.write("| # | 类别 | 文件路径 | 行数 | 大小 |\n")
        f.write("|---|------|---------|------|------|\n")

        idx = 0
        for r in zero_dep:
            if r["stars"] == 5:
                idx += 1
                f.write(f"| {idx} | 零依赖 | `{r['rel_path']}` | {r['lines']} | {r['size']} |\n")
        for r in internal_only:
            if r["stars"] == 5:
                idx += 1
                f.write(f"| {idx} | 内部依赖 | `{r['rel_path']}` | {r['lines']} | {r['size']} |\n")
        if idx == 0:
            f.write("| - | - | 暂无五星达标组件 | - | - |\n")
        f.write("\n---\n\n")

        f.write("## 📈 星级分布统计\n\n")

        f.write("### 零依赖组件星级分布\n\n")
        f.write("| 星级 | 数量 | 占比 |\n")
        f.write("|------|------|------|\n")
        for s in range(5, 0, -1):
            cnt = sum(1 for r in zero_dep if r["stars"] == s)
            pct = f"{cnt / len(zero_dep) * 100:.1f}%" if zero_dep else "0%"
            f.write(f"| {star_display(s)} `{s}/5` | {cnt} | {pct} |\n")
        f.write("\n")

        f.write("### 仅内部依赖独立单元星级分布\n\n")
        f.write("| 星级 | 数量 | 占比 |\n")
        f.write("|------|------|------|\n")
        for s in range(5, 0, -1):
            cnt = sum(1 for r in internal_only if r["stars"] == s)
            pct = f"{cnt / len(internal_only) * 100:.1f}%" if internal_only else "0%"
            f.write(f"| {star_display(s)} `{s}/5` | {cnt} | {pct} |\n")
        f.write("\n")

        f.write("---\n\n")

        f.write("## 🔍 审计方法说明\n\n")
        f.write("### 扫描范围\n")
        f.write("- 文件类型: `.ts`, `.tsx`\n")
        f.write(f"- 排除目录: {', '.join(sorted(SKIP_DIRS))}\n")
        f.write(f"- 第三方依赖识别: {len(THIRD_PARTY_MODULES)}+ 常见 npm 包前缀匹配\n\n")

        f.write("### 星级评定规则\n\n")
        f.write("**零依赖组件**\n")
        f.write("- ★★★★★: 行数 >= 15, 有 export, 有类型定义\n")
        f.write("- ★★★★☆: 行数 5-14 或缺少部分特征\n")
        f.write("- ★★★☆☆: 行数 < 5\n")
        f.write("- 扣分项: 文件过大(>500行)\n\n")

        f.write("**仅内部依赖独立单元**\n")
        f.write("- ★★★★★: 内部依赖 <= 1, 行数适中, 有 export\n")
        f.write("- ★★★★☆: 内部依赖 2-5, 行数适中\n")
        f.write("- ★★★☆☆: 内部依赖 > 5 或行数异常\n\n")

        f.write("### YYC³ 合规标准\n")
        f.write("- **五高**: 高可用、高性能、高安全、高扩展、高维护\n")
        f.write("- **五标**: 标准化、规范化、自动化、智能化、可视化\n")
        f.write("- **五化**: 流程化、文档化、工具化、数字化、生态化\n\n")

        f.write("---\n\n")
        f.write(f"_报告由 YYC³ 零依赖审计脚本 v4 (Python Interactive) 自动生成_\n")
        f.write(f"_Generated at {timestamp}_\n")

    print(f"  ✅ 报告已生成: {REPORT_FILE}")
    return True


def run_migration(cache: dict):
    if not cache:
        print("\n  ⚠️ 尚未执行分析，请先执行功能 1")
        return False

    zero_dep = cache["zero_dep"]
    internal_only = cache["internal_only"]

    if not zero_dep and not internal_only:
        print("\n  ⚠️ 无达标组件可迁移")
        return False

    print()
    print("  ══════════════════════════════════════════════════")
    print("  📦 组件迁移计划")
    print("  ══════════════════════════════════════════════════")
    print()
    print(f"  目标目录: {MIGRATE_DIR}")
    print()
    print("  迁移分类结构:")
    print("  yyc3-zero-deps/")
    print("  ├── 1-zero-dep-5star/        # 零依赖 ★★★★★")
    print("  ├── 2-zero-dep-4star/        # 零依赖 ★★★★☆")
    print("  ├── 3-zero-dep-low/          # 零依赖 ★★★☆☆ 及以下")
    print("  ├── 4-internal-5star/        # 仅内部依赖 ★★★★★")
    print("  ├── 5-internal-4star/        # 仅内部依赖 ★★★★☆")
    print("  └── 6-internal-low/          # 仅内部依赖 ★★★☆☆ 及以下")
    print()

    confirm = input("  确认执行迁移? (y/N): ").strip().lower()
    if confirm != "y":
        print("  ❌ 迁移已取消")
        return False

    print()
    print("  正在执行迁移...")

    categories = {
        "1-zero-dep-5star": [r for r in zero_dep if r["stars"] == 5],
        "2-zero-dep-4star": [r for r in zero_dep if r["stars"] == 4],
        "3-zero-dep-low": [r for r in zero_dep if r["stars"] <= 3],
        "4-internal-5star": [r for r in internal_only if r["stars"] == 5],
        "5-internal-4star": [r for r in internal_only if r["stars"] == 4],
        "6-internal-low": [r for r in internal_only if r["stars"] <= 3],
    }

    total_migrated = 0
    total_skipped = 0
    total_updated = 0
    migration_log = []

    for cat_name, items in categories.items():
        if not items:
            continue

        cat_dir = MIGRATE_DIR / cat_name
        cat_dir.mkdir(parents=True, exist_ok=True)

        for item in items:
            src = Path(item["path"])
            if not src.exists():
                total_skipped += 1
                continue

            rel_parts = Path(item["rel_path"]).parts
            project_name = rel_parts[0] if rel_parts else "unknown"

            dest_dir = cat_dir / project_name
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / src.name

            if dest.exists():
                src_md5 = file_md5(str(src))
                dest_md5 = file_md5(str(dest))
                if src_md5 == dest_md5:
                    total_skipped += 1
                    continue
                else:
                    shutil.copy2(str(src), str(dest))
                    total_updated += 1
                    migration_log.append(f"  🔄 更新: {item['rel_path']} -> {cat_name}/{project_name}/")
            else:
                shutil.copy2(str(src), str(dest))
                total_migrated += 1
                migration_log.append(f"  ✅ 复制: {item['rel_path']} -> {cat_name}/{project_name}/")

    for line in migration_log:
        print(line)

    print()
    print("  ══════════════════════════════════════════════════")
    print(f"  📊 迁移完成统计")
    print("  ══════════════════════════════════════════════════")
    print(f"  ✅ 新增复制: {total_migrated}")
    print(f"  🔄 内容更新: {total_updated}")
    print(f"  ⏭️  跳过(无变化): {total_skipped}")
    print(f"  📁 目标目录: {MIGRATE_DIR}")
    print()

    manifest = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "source_root": str(YYC3_ROOT),
        "migrated": total_migrated,
        "updated": total_updated,
        "skipped": total_skipped,
        "categories": {k: len(v) for k, v in categories.items()},
    }
    manifest_file = MIGRATE_DIR / "_manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"  💾 迁移清单已保存: {manifest_file}")

    return True


def build_tree(directory: Path, prefix: str = "", is_last: bool = True, max_depth: int = 4, current_depth: int = 0) -> list:
    lines = []
    if current_depth >= max_depth:
        return lines

    try:
        entries = sorted(directory.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
        entries = [e for e in entries if not e.name.startswith(".") and e.name != "_manifest.json"]
    except PermissionError:
        return lines

    for i, entry in enumerate(entries):
        is_last_entry = (i == len(entries) - 1)
        connector = "└── " if is_last_entry else "├── "
        lines.append(f"{prefix}{connector}{entry.name}")

        if entry.is_dir():
            extension = "    " if is_last_entry else "│   "
            sub_lines = build_tree(entry, prefix + extension, is_last_entry, max_depth, current_depth + 1)
            lines.extend(sub_lines)

    return lines


def count_files_recursive(directory: Path) -> dict:
    stats = {"dirs": 0, "files": 0, "by_ext": defaultdict(int)}
    try:
        for entry in directory.rglob("*"):
            if entry.name.startswith(".") or entry.name == "_manifest.json":
                continue
            if entry.is_dir():
                stats["dirs"] += 1
            elif entry.is_file():
                stats["files"] += 1
                stats["by_ext"][entry.suffix] += 1
    except PermissionError:
        pass
    return stats


def generate_architecture_doc():
    if not MIGRATE_DIR.exists():
        print("\n  ⚠️ 迁移目录不存在，请先执行功能 3（组件迁移）")
        return False

    print("\n  正在生成架构文档...")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    stats = count_files_recursive(MIGRATE_DIR)

    category_dirs = sorted([d for d in MIGRATE_DIR.iterdir()
                           if d.is_dir() and not d.name.startswith(".")])

    category_details = []
    for cat_dir in category_dirs:
        cat_stats = count_files_recursive(cat_dir)
        project_dirs = sorted([d for d in cat_dir.iterdir()
                               if d.is_dir() and not d.name.startswith(".")])
        projects = []
        for proj_dir in project_dirs:
            proj_files = sorted([f for f in proj_dir.iterdir()
                                 if f.is_file() and not f.name.startswith(".")])
            projects.append({
                "name": proj_dir.name,
                "file_count": len(proj_files),
                "files": [f.name for f in proj_files],
            })
        category_details.append({
            "dir_name": cat_dir.name,
            "stats": cat_stats,
            "projects": projects,
        })

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(ARCHITECTURE_FILE, "w", encoding="utf-8") as f:
        f.write("# YYC³ 零依赖组件库 — 架构文档\n\n")
        f.write(f"> 生成时间: {timestamp}\n")
        f.write(f"> 库根目录: `{MIGRATE_DIR}`\n")
        f.write(f"> 审计标准: YYC³「五高五标五化」组件拆分规范\n\n")
        f.write("---\n\n")

        f.write("## 📊 库总览\n\n")
        f.write("| 指标 | 数值 |\n")
        f.write("|------|------|\n")
        f.write(f"| 子目录数 | {stats['dirs']} |\n")
        f.write(f"| 组件文件总数 | {stats['files']} |\n")
        for ext, cnt in sorted(stats["by_ext"].items(), key=lambda x: -x[1]):
            f.write(f"| {ext} 文件 | {cnt} |\n")
        f.write("\n---\n\n")

        f.write("## 🌳 目录树结构\n\n")
        f.write("```\n")
        f.write(f"{MIGRATE_DIR.name}/\n")
        tree_lines = build_tree(MIGRATE_DIR, max_depth=3)
        for line in tree_lines:
            f.write(line + "\n")
        f.write("```\n\n")
        f.write("---\n\n")

        f.write("## 📁 分类详情\n\n")

        cat_labels = {
            "1-zero-dep-5star": ("⭐ 零依赖 ★★★★★", "完美独立单元，无任何外部/内部依赖"),
            "2-zero-dep-4star": ("🌟 零依赖 ★★★★☆", "轻微扣分的零依赖组件"),
            "3-zero-dep-low": ("📌 零依赖 ★★★☆☆及以下", "需改进的零依赖组件"),
            "4-internal-5star": ("⭐ 仅内部依赖 ★★★★★", "完美内部独立，仅 <=1 个内部引用"),
            "5-internal-4star": ("🌟 仅内部依赖 ★★★★☆", "良好的内部依赖组件"),
            "6-internal-low": ("📌 仅内部依赖 ★★★☆☆及以下", "内部耦合偏高，需优化"),
        }

        for cat in category_details:
            label, desc = cat_labels.get(cat["dir_name"], (cat["dir_name"], ""))
            f.write(f"### {label}\n\n")
            f.write(f"> {desc}\n\n")
            f.write(f"| 来源项目 | 文件数 | 组件列表 |\n")
            f.write(f"|----------|--------|----------|\n")
            for proj in cat["projects"]:
                file_list = ", ".join(f"`{fn}`" for fn in proj["files"])
                if len(file_list) > 200:
                    file_list = file_list[:197] + "..."
                f.write(f"| {proj['name']} | {proj['file_count']} | {file_list} |\n")
            f.write("\n")

        f.write("---\n\n")

        f.write("## 🔗 使用指南\n\n")
        f.write("### 从组件库引用\n\n")
        f.write("```typescript\n")
        f.write("// 相对路径引用示例\n")
        f.write("import { ImageWithFallback } from '../../yyc3-zero-deps/1-zero-dep-5star/AI-组件/ImageWithFallback';\n")
        f.write("```\n\n")

        f.write("### 组件分类说明\n\n")
        f.write("| 目录 | 说明 | 推荐场景 |\n")
        f.write("|------|------|----------|\n")
        f.write("| `1-zero-dep-5star/` | 零依赖五星组件 | 跨项目复用首选 |\n")
        f.write("| `2-zero-dep-4star/` | 零依赖四星组件 | 跨项目复用备选 |\n")
        f.write("| `3-zero-dep-low/` | 零依赖低星组件 | 需优化后复用 |\n")
        f.write("| `4-internal-5star/` | 内部依赖五星组件 | 同项目内复用首选 |\n")
        f.write("| `5-internal-4star/` | 内部依赖四星组件 | 同项目内复用备选 |\n")
        f.write("| `6-internal-low/` | 内部依赖低星组件 | 需解耦优化 |\n")
        f.write("\n")

        f.write("---\n\n")
        f.write(f"_架构文档由 YYC³ 零依赖审计脚本 v4 自动生成_\n")
        f.write(f"_Generated at {timestamp}_\n")

    print(f"  ✅ 架构文档已生成: {ARCHITECTURE_FILE}")
    return True


def load_cache() -> dict:
    if not CACHE_FILE.exists():
        return None
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            cache = json.load(f)
        cache["zero_dep"] = [r for r in cache.get("zero_dep", []) if r.get("path") and Path(r["path"]).exists()]
        cache["internal_only"] = [r for r in cache.get("internal_only", []) if r.get("path") and Path(r["path"]).exists()]
        return cache
    except (json.JSONDecodeError, KeyError):
        return None


def show_banner():
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║   YYC³ 零依赖/内部依赖组件管理工具 v4                  ║")
    print("║   Interactive CLI — Analysis / Report / Migration / Doc ║")
    print("╚══════════════════════════════════════════════════════════╝")


def show_menu():
    print()
    print("  ┌──────────────────────────────────────────────────┐")
    print("  │  请选择操作:                                      │")
    print("  │                                                  │")
    print("  │   1  执行零依赖分析                               │")
    print("  │   2  保存分析报告                                 │")
    print("  │   3  执行组件迁移                                 │")
    print("  │   4  生成架构文档                                 │")
    print("  │                                                  │")
    print("  │   0  退出                                         │")
    print("  └──────────────────────────────────────────────────┘")


def show_status():
    cache = load_cache()
    report_exists = REPORT_FILE.exists()
    migrate_exists = MIGRATE_DIR.exists()
    arch_exists = ARCHITECTURE_FILE.exists()

    print()
    print("  📋 当前状态:")
    if cache:
        zd = len(cache.get("zero_dep", []))
        io = len(cache.get("internal_only", []))
        print(f"     ✅ 分析缓存: {zd} 零依赖 + {io} 内部依赖 ({cache.get('timestamp', '?')})")
    else:
        print("     ⬜ 分析缓存: 未执行")

    print(f"     {'✅' if report_exists else '⬜'} 星级报告: {REPORT_FILE.name if report_exists else '未生成'}")
    print(f"     {'✅' if migrate_exists else '⬜'} 迁移目录: {MIGRATE_DIR.name if migrate_exists else '未创建'}")
    print(f"     {'✅' if arch_exists else '⬜'} 架构文档: {ARCHITECTURE_FILE.name if arch_exists else '未生成'}")


def main():
    show_banner()

    while True:
        show_menu()
        show_status()
        print()
        choice = input("  请输入选项 [0-4]: ").strip()

        if choice == "0":
            print("\n  👋 再见!\n")
            break
        elif choice == "1":
            print()
            print("  ══════════════════════════════════════════════════")
            print("  1️⃣  执行零依赖分析")
            print("  ══════════════════════════════════════════════════")
            run_analysis()
        elif choice == "2":
            print()
            print("  ══════════════════════════════════════════════════")
            print("  2️⃣  保存分析报告")
            print("  ══════════════════════════════════════════════════")
            cache = load_cache()
            generate_report(cache)
        elif choice == "3":
            print()
            print("  ══════════════════════════════════════════════════")
            print("  3️⃣  执行组件迁移")
            print("  ══════════════════════════════════════════════════")
            cache = load_cache()
            run_migration(cache)
        elif choice == "4":
            print()
            print("  ══════════════════════════════════════════════════")
            print("  4️⃣  生成架构文档")
            print("  ══════════════════════════════════════════════════")
            generate_architecture_doc()
        else:
            print(f"\n  ⚠️ 无效选项: {choice}，请输入 0-4")


if __name__ == "__main__":
    main()
