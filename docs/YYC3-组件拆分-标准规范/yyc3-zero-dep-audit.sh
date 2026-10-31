#!/usr/bin/env bash
set -euo pipefail

YYC3_ROOT="/Volumes/Containers/YYC3-组件拆分规范"
OUTPUT_DIR="${YYC3_ROOT}/_audit-output"
REPORT_FILE="${OUTPUT_DIR}/zero-dependency-star-rating.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

SKIP_PROJECTS=("Custom" "__tests__" "_audit-output")

THIRD_PARTY_PREFIXES=(
  "@radix-ui" "@tanstack" "@supabase" "@hookform" "react-router" "lucide-react"
  "class-variance-authority" "clsx" "tailwind-merge" "tailwindcss" "date-fns"
  "framer-motion" "recharts" "openai" "bullmq" "ioredis" "zod" "axios" "express"
  "next" "lodash" "uuid" "bcrypt" "jsonwebtoken" "mongoose" "prisma" "drizzle"
  "sonner" "cmdk" "vaul" "embla-carousel" "react-day-picker" "@dnd-kit" "@hello-pangea"
  "resend" "stripe" "@t3-oss" "trpc" "@trpc" "@ai-sdk" "ai" "@elastic" "winston"
  "pino" "chalk" "dotenv" "cors" "helmet" "compression" "morgan" "joi" "yup"
  "immutable" "rxjs" "@reduxjs" "zustand" "jotai" "nanostores" "three" "@react-three"
  "d3" "chart.js" "@sentry" "@vercel" "graphql" "@apollo" "firebase" "@google-cloud"
  "aws-sdk" "@aws-sdk" "bull" "kafkajs" "amqplib" "pg" "mysql2" "better-sqlite3"
  "mongodb" "typeorm" "knex" "objection" "sequelize" "drizzle-orm" "@prisma"
  "@libsql" "@planetscale" "nanoid" "dayjs" "moment" "numeral" "validator" "ajv"
  "io-ts" "fp-ts" "effect" "neverthrow" "ow" "js-yaml" "gray-matter" "marked"
  "showdown" "highlight.js" "prismjs" "shiki" "katex" "mathjax" "mermaid" "cheerio"
  "jsdom" "puppeteer" "playwright" "cypress" "jest" "vitest" "mocha" "chai"
  "@testing-library" "@playwright" "msw" "storybook" "@storybook" "eslint" "prettier"
  "typescript" "ts-node" "tsx" "esbuild" "vite" "webpack" "rollup" "turndown" "cron"
  "node-cron" "bottleneck" "p-limit" "p-queue" "eventemitter" "bunyan" "log4js"
  "debug" "inversify" "tsyringe" "awilix" "agenda" "graphql-request" "urql" "@urql"
  "swr" "react-query" "use-debounce" "ahooks" "react-use" "@use-gesture" "react-spring"
  "react-dnd" "react-dropzone" "react-hot-toast" "react-icons" "@heroicons" "@tabler"
  "@phosphor-icons" "@iconify" "lucide" "feather-icons" "react-syntax-highlighter"
  "react-markdown" "remark" "rehype" "unified" "mdx" "@mdx-js" "next-mdx-remote"
  "nprogress" "animate.css" "tailwindcss-animate" "tailwind-variants" "cva" "tw-merge"
  "superjson" "devalue" "cookie" "jose" "argon2" "otpauth" "qrcode" "bcryptjs"
  "speakeasy" "handlebars" "ejs" "pug" "nunjucks" "mustache" "pdfkit" "sharp" "jimp"
  "canvas" "node-canvas" "svg2img" "html2canvas" "dom-to-image" "file-saver" "jszip"
  "archiver" "unzipper" "mime-types" "content-type" "accepts" "negotiator" "range-parser"
  "raw-body" "type-is" "iconv-lite" "he" "entities" "sanitize-html" "dompurify" "xss"
  "escape-html" "markdown-it" "diff" "jsdiff" "deep-diff" "deepmerge" "lodash.merge"
  "immer" "mutative" "proxy-memoize" "reselect" "memoize-one" "fast-memoize"
  "micro-memoize" "ramda" "crocks" "most" "baconjs" "kefir" "flyd" "xstream"
  "callbag" "wonka" "@reatom" "effector" "@effector" "overmind" "@logux" "logux"
  "@nanostores" "@legendapp" "valtio" "@valtio" "proxy-compare" "use-sync-external-store"
  "usehooks-ts" "rooks" "react-cool-hooks" "@react-hook" "react-use-gesture" "use-gesture"
  "react-draggable" "react-rnd" "react-resizable" "react-resize-detector" "react-measure"
  "react-visibility-sensor" "react-intersection-observer" "react-in-viewport"
  "react-virtualized" "react-window" "@tanstack/react-virtual" "react-virtuoso" "virtua"
  "@tanstack/virtual" "react-beautiful-dnd" "react-sortable-hoc" "dnd-kit" "react-grid-layout"
  "react-masonry" "react-split-pane" "react-split" "allotment" "react-resizable-panels"
  "react-tabs" "react-aria" "@react-aria" "react-stately" "@react-stately" "react-compiler"
  "@babel" "babel" "swc" "rolldown" "rspack" "farm" "parcel" "turbo" "nx" "turborepo"
  "lerna" "pnpm" "changesets" "semantic-release" "standard-version" "commitizen" "cz-git"
  "@commitlint" "husky" "lint-staged" "simple-git-hooks" "yorkie" "lefthook"
  "@typescript-eslint" "stylelint" "commitlint" "markdownlint" "html-validate" "jsonlint"
  "yaml-lint" "dotenv-linter" "secretlint" "knip" "depcheck" "npm-check-updates" "audit-ci"
  "snyk" "socket-security" "lockfile-lint" "npm-package-json-lint" "@ls-lint" "ls-lint"
  "cspell" "textlint" "react-hook-form" "@hookform/resolvers" "immer" "zustand" "zustand"
  "middleware" "next-auth" "@auth" "next-intl" "next-themes" "next-pwa" "next-seo"
  "@next/font" "next/font" "next/image" "next/link" "next/router" "next/navigation"
  "next/dynamic" "next/head" "next/script" "next/config" "next/document" "next/app"
  "next/error" "notistack" "react-hot-toast" "react-toastify" "toastr" "sweetalert2"
  "sweetalert" "react-confirm-alert" "react-modal" "react-responsive-modal"
  "@headlessui/react" "@headlessui" "heroicons" "@heroicons/react" "@heroicons/vue"
  "@tailwindcss/forms" "@tailwindcss/typography" "@tailwindcss/aspect-ratio"
  "@tailwindcss/line-clamp" "autoprefixer" "postcss" "postcss-import" "postcss-nested"
  "sass" "node-sass" "less" "stylus" "css-modules" "aphrodite" "emotion" "@emotion"
  "styled-components" "goober" "twin.macro" "linaria" "panda-css" "@pandacss"
  "vanilla-extract" "@vanilla-extract" " stitches" "theme-ui" "@theme-ui" "grommet"
  "evergreen-ui" "blueprintjs" "@blueprintjs" "antd" "ant-design" "@ant-design"
  "chakra-ui" "@chakra-ui" "rebass" "grid-styled" "reflexbox" "flexbox-react"
  "react-bootstrap" "reactstrap" "reactstrap" "reactstrap" "material-ui" "@mui"
  "@material-ui" "react-material-ui" "react-mdl" "react-toolbox" "react-desktop"
  "semantic-ui-react" "semantic-ui" "fomantic-ui" "primereact" "primeflex" "primeicons"
  "ag-grid-react" "ag-grid" "handsontable" "react-data-grid" "react-table" "@tanstack/table"
  "react-virtualized-auto-sizer" "react-window-infinite-loader" "react-lazylog"
  "react-json-view" "react-json-pretty" "react-syntax-highlighter" "react-codemirror"
  "@uiw/react-codemirror" "monaco-editor" "@monaco-editor" "react-monaco-editor"
  "codemirror" "ace-builds" "react-ace" "brace" "diff2html" "react-diff-viewer"
  "react-diff-view" "unidiff" "jsdiff" "diff-match-patch" "react-flow-renderer"
  "reactflow" "@xyflow" "dagre" "elkjs" "graphlib" "cytoscape" "vis-network" "visjs"
  "sigma.js" "sigma" "d3-force" "d3-drag" "d3-zoom" "d3-selection" "d3-scale"
  "d3-axis" "d3-svg" "nivo" "victory" "plotly.js" "plotly" "chart.js" "chartjs"
  "highcharts" "echarts" "apexcharts" "react-apexcharts" "lightweight-charts"
  "tradingview" "tui-chart" "toastui-chart" "billboard.js" "c3" "dc.js" "metrics-graphics"
  "react-sparklines" "react-trend" "react-minimal-pie-chart" "react-circle"
  "react-progress-bar" "react-circular-progressbar" "react-multi-progress-bar"
  "react-step-progress-bar" "nprogress" "react-loading" "react-loader-spinner"
  "react-spinners" "react-placeholder" "react-content-loader" "react-skeleton"
  "react-loading-skeleton" "react-shimmer" "react-placeholder-loading"
  "react-draft-wysiwyg" "draft-js" "slate" "slate-react" "tiptap" "@tiptap"
  "quill" "react-quill" "quilljs" "ckeditor" "@ckeditor" "tinymce" "react-tinymce"
  "prosemirror" "remirror" "@remirror" "lexical" "@lexical" "plate" "@udecode"
  "blocknote" "novel" "milkdown" "@milkdown" "bytemd" "vditor" "cherry-markdown"
  "tui-editor" "react-map-gl" "mapbox-gl" "leaflet" "react-leaflet" "google-maps"
  "@react-google-maps" "react-google-maps" "pigeon-maps" "maplibre-gl"
  "react-maplibre" "deck.gl" "kepler.gl" "cartodb" "turf" "@turf" "openlayers"
  "cesium" "resium" "react-cesium" "three-globe" "globe.gl" "react-globe"
  "react-simple-maps" "react-d3-tree" "react-organizational-chart" "react-diagrams"
  "react-dag" "react-archer" "react-arborist" "react-complex-tree" "rc-tree"
  "@ant-design/tree" "react-sortable-tree" "react-virtualized-tree"
  "react-dnd-treeview" "react-arborist" "treemux" "react-treebeard" "react-treeview"
  "react-filepond" "react-dropzone" "uppy" "@uppy" "filepond" "react-fine-uploader"
  "react-dropzone-uploader" "react-s3-uploader" "react-upload" "multer" "formidable"
  "busboy" "multiparty" "form-data" "node-fetch" "cross-fetch" "isomorphic-fetch"
  "whatwg-fetch" "abort-controller" "node-abort-controller" "ky" "got" "axios"
  "superagent" "request" "needle" "wreck" "bent" "sapling" "centra" "r2"
  "cloudflare" "aws-sdk" "@aws-sdk" "google-cloud" "@google-cloud" "firebase-admin"
  "firebase" "@firebase" "supabase" "@supabase" "appwrite" "pocketbase" "convex"
  "@convex" "convex-helpers" "fauna" "faunadb" "restdb" "jsonbin" "json-server"
  "json-server-auth" "typicode" "lowdb" "nedb" "tingodb" "lokijs" "pouchdb"
  "rxdb" "watermelondb" "@nozbe" "objectbox" "realm" "@realm" "mmkv"
  "react-native-mmkv" "async-storage" "@react-native-async-storage" "expo-secure-store"
  "keytar" "keychain" "secure-storage" "conf" "configstore" "dotenv" "env-cmd"
  "cross-env" "dotenv-expand" "dotenv-flow" "dotenv-webpack" "dotenv-cli"
  "react-native-config" "react-native-dotenv" "next-env" "vue-dotenv"
  "socket.io" "socket.io-client" "ws" "uWebSockets.js" "faye-websocket" "sockjs"
  "sockjs-client" "signalr" "centrifuge" "phoenix" "ably" "pusher" "pubnub"
  "firebase-messaging" "onesignal" "web-push" "push-api" "notifications"
  "node-notifier" "electron-notifier" "toastify-js" "notyf" "notistack"
  "react-notifications" "react-notification-badge" "react-hot-toast" "react-toastify"
  "antd" "@ant-design/icons" "@ant-design/pro-components" "pro-components"
  "ant-design/pro-layout" "ant-design/pro-table" "ant-design/pro-form"
  "@ant-design/charts" "@ant-design/plots" "antd-mobile" "antd-mobile-v5"
  "antd-img-crop" "antd-dayjs-webpack-plugin" "@ant-design/cssinjs"
  "rc-util" "rc-field-form" "rc-picker" "rc-table" "rc-tree" "rc-tree-select"
  "rc-select" "rc-input" "rc-input-number" "rc-slider" "rc-progress" "rc-rate"
  "rc-tooltip" "rc-trigger" "rc-dropdown" "rc-menu" "rc-pagination" "rc-checkbox"
  "rc-switch" "rc-radio" "rc-calendar" "rc-time-picker" "rc-picker" "rc-upload"
  "rc-image" "rc-dialog" "rc-drawer" "rc-popover" "rc-popconfirm" "rc-notification"
  "rc-alert" "rc-anchor" "rc-breadcrumb" "rc-collapse" "rc-tabs" "rc-tooltip"
  "rc-motion" "rc-overflow" "rc-virtual-list" "rc-util" "rc-trigger"
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_star()  { echo -e "${CYAN}${BOLD}$1${NC}"; }

should_skip_project() {
  local proj="$1"
  for skip in "${SKIP_PROJECTS[@]}"; do
    [[ "$(basename "$proj")" == "$skip" ]] && return 0
  done
  return 1
}

build_grep_pattern() {
  local pattern=""
  for prefix in "${THIRD_PARTY_PREFIXES[@]}"; do
    if [[ -n "$pattern" ]]; then
      pattern="${pattern}|${prefix}"
    else
      pattern="${prefix}"
    fi
  done
  echo "$pattern"
}

is_zero_dep() {
  local file="$1"
  local import_block
  import_block=$(sed -n '/^import /,/^$/p' "$file" 2>/dev/null; grep "^from " "$file" 2>/dev/null; grep "^import " "$file" 2>/dev/null)

  [[ -z "$import_block" ]] && return 0

  local non_react_imports
  non_react_imports=$(echo "$import_block" | grep -vE "from ['\"]react['\"]|from ['\"]react/|from ['\"]react-dom" | grep -E "from ['\"]" || true)

  [[ -z "$non_react_imports" ]] && return 0

  local has_third_party=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    for prefix in "${THIRD_PARTY_PREFIXES[@]}"; do
      if echo "$line" | grep -q "from ['\"]${prefix}"; then
        has_third_party=1
        break 2
      fi
    done
  done <<< "$non_react_imports"

  [[ $has_third_party -eq 0 ]] || return 1

  local has_relative_import=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if echo "$line" | grep -qE "from ['\"]\./|from ['\"]\.\./"; then
      has_relative_import=1
      break
    fi
  done <<< "$non_react_imports"

  [[ $has_relative_import -eq 0 ]] && return 0
  return 1
}

is_internal_only() {
  local file="$1"
  local import_block
  import_block=$(grep -E "^import |^from " "$file" 2>/dev/null || true)

  [[ -z "$import_block" ]] && return 1

  local non_react_imports
  non_react_imports=$(echo "$import_block" | grep -vE "from ['\"]react['\"]|from ['\"]react/|from ['\"]react-dom" | grep -E "from ['\"]" || true)

  [[ -z "$non_react_imports" ]] && return 1

  local has_third_party=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    for prefix in "${THIRD_PARTY_PREFIXES[@]}"; do
      if echo "$line" | grep -q "from ['\"]${prefix}"; then
        has_third_party=1
        break 2
      fi
    done
  done <<< "$non_react_imports"

  [[ $has_third_party -eq 1 ]] && return 1

  local has_relative_import=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if echo "$line" | grep -qE "from ['\"]\./|from ['\"]\.\./"; then
      has_relative_import=1
      break
    fi
  done <<< "$non_react_imports"

  [[ $has_relative_import -eq 1 ]] && return 0
  return 1
}

count_internal_imports() {
  local file="$1"
  local count=0
  local non_react_imports
  non_react_imports=$(grep -E "^import |^from " "$file" 2>/dev/null | grep -vE "from ['\"]react['\"]|from ['\"]react/|from ['\"]react-dom" | grep -E "from ['\"]" || true)

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if echo "$line" | grep -qE "from ['\"]\./|from ['\"]\.\./"; then
      count=$((count + 1))
    fi
  done <<< "$non_react_imports"

  echo "$count"
}

calculate_star_rating() {
  local file="$1"
  local category="$2"
  local lines
  lines=$(wc -l < "$file" | tr -d ' ')
  local stars=5
  local reasons=""

  if [[ "$category" == "zero_dep" ]]; then
    if [[ $lines -lt 5 ]]; then
      stars=3
      reasons="文件行数过少(<5行)"
    elif [[ $lines -lt 15 ]]; then
      stars=4
      reasons="文件行数较少(<15行)"
    fi
    if [[ $lines -gt 500 ]]; then
      stars=$((stars - 1))
      reasons="${reasons:+$reasons, }文件过大(>${lines}行)"
    fi
    if grep -qE "^export " "$file" 2>/dev/null; then
      [[ $stars -lt 5 ]] && stars=$((stars + 1))
    fi
    if grep -qE "^(export )?(interface|type|enum) " "$file" 2>/dev/null; then
      [[ $stars -lt 5 ]] && stars=$((stars + 1))
    fi
  elif [[ "$category" == "internal_only" ]]; then
    stars=4
    local ic
    ic=$(count_internal_imports "$file")
    if [[ $ic -le 1 ]]; then
      stars=5
    elif [[ $ic -gt 5 ]]; then
      stars=3
      reasons="内部依赖过多(${ic}个)"
    fi
    if [[ $lines -lt 10 ]]; then
      stars=$((stars - 1))
      reasons="${reasons:+$reasons, }文件行数过少(<10行)"
    fi
    if [[ $lines -gt 800 ]]; then
      stars=$((stars - 1))
      reasons="${reasons:+$reasons, }文件过大(>${lines}行)"
    fi
    if grep -qE "^export " "$file" 2>/dev/null; then
      [[ $stars -lt 5 ]] && stars=$((stars + 1))
    fi
  fi

  [[ $stars -lt 1 ]] && stars=1
  [[ $stars -gt 5 ]] && stars=5
  echo "${stars}|${reasons}"
}

generate_star_display() {
  local stars=$1
  local display=""
  for ((i=1; i<=5; i++)); do
    if [[ $i -le $stars ]]; then
      display="${display}★"
    else
      display="${display}☆"
    fi
  done
  echo "$display"
}

get_file_size() {
  local size
  size=$(wc -c < "$1" 2>/dev/null | tr -d ' ')
  if [[ $size -lt 1024 ]]; then
    echo "${size}B"
  elif [[ $size -lt 1048576 ]]; then
    echo "$((size / 1024))KB"
  else
    echo "$((size / 1048576))MB"
  fi
}

TMPDIR_ZERO=$(mktemp /tmp/yyc3_zero_XXXXXX)
TMPDIR_INTERNAL=$(mktemp /tmp/yyc3_internal_XXXXXX)
TMPDIR_PROJECTS=$(mktemp /tmp/yyc3_projects_XXXXXX)
trap 'rm -f "$TMPDIR_ZERO" "$TMPDIR_INTERNAL" "$TMPDIR_PROJECTS"' EXIT

main() {
  echo ""
  log_star "═══════════════════════════════════════════════════════"
  log_star "  YYC³ 零依赖/内部依赖组件 高可用审计脚本 v2"
  log_star "═══════════════════════════════════════════════════════"
  echo ""
  log_info "审计根目录: ${YYC3_ROOT}"
  log_info "开始时间:    ${TIMESTAMP}"
  echo ""

  log_info "正在扫描项目目录..."
  echo ""

  local project_count=0
  for project_dir in "${YYC3_ROOT}"/*/; do
    [[ ! -d "$project_dir" ]] && continue
    should_skip_project "$project_dir" && continue

    local project_name
    project_name=$(basename "$project_dir")
    project_count=$((project_count + 1))
    log_info "扫描项目 [${project_count}]: ${project_name}"

    local p_zero=0
    local p_internal=0
    local p_total=0

    while IFS= read -r -d '' file; do
      [[ ! -f "$file" ]] && continue
      [[ "$file" =~ \.(ts|tsx)$ ]] || continue
      p_total=$((p_total + 1))

      local rel_path="${file#${YYC3_ROOT}/}"
      local lines
      lines=$(wc -l < "$file" | tr -d ' ')
      local size
      size=$(get_file_size "$file")

      if is_zero_dep "$file"; then
        local rating
        rating=$(calculate_star_rating "$file" "zero_dep")
        local stars="${rating%%|*}"
        local reasons="${rating#*|}"
        echo "${rel_path}|${stars}|${lines}|${size}|${reasons}" >> "$TMPDIR_ZERO"
        p_zero=$((p_zero + 1))
      elif is_internal_only "$file"; then
        local rating
        rating=$(calculate_star_rating "$file" "internal_only")
        local stars="${rating%%|*}"
        local reasons="${rating#*|}"
        local ic
        ic=$(count_internal_imports "$file")
        echo "${rel_path}|${stars}|${lines}|${size}|${ic}|${reasons}" >> "$TMPDIR_INTERNAL"
        p_internal=$((p_internal + 1))
      fi
    done < <(find "$project_dir" -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/__tests__/*" -print0 2>/dev/null)

    echo "${project_name}|${p_total}|${p_zero}|${p_internal}" >> "$TMPDIR_PROJECTS"
  done

  echo ""
  log_info "扫描完成! 共扫描 ${project_count} 个项目"
  echo ""

  local zero_count
  zero_count=$(wc -l < "$TMPDIR_ZERO" | tr -d ' ')
  local internal_count
  internal_count=$(wc -l < "$TMPDIR_INTERNAL" | tr -d ' ')
  [[ -z "$zero_count" ]] && zero_count=0
  [[ -z "$internal_count" ]] && internal_count=0
  local total=$((zero_count + internal_count))

  log_ok "零依赖组件:         ${zero_count}"
  log_ok "仅内部依赖独立单元: ${internal_count}"
  log_ok "达标组件合计:       ${total}"
  echo ""

  log_info "正在生成星级审计报告..."
  mkdir -p "$OUTPUT_DIR"

  {
    echo "# YYC³ 零依赖/内部依赖组件星级审计报告"
    echo ""
    echo "> 审计时间: ${TIMESTAMP}"
    echo "> 审计范围: ${YYC3_ROOT}"
    echo "> 审计标准: YYC³「五高五标五化」组件拆分规范"
    echo "> 审计维度: 零依赖组件 + 仅内部依赖独立单元"
    echo ""
    echo "---"
    echo ""
    echo "## 📊 审计总览"
    echo ""
    echo "| 指标 | 数值 |"
    echo "|------|------|"
    echo "| 扫描项目总数 | ${project_count} |"
    echo "| ✅ 零依赖组件 | ${zero_count} |"
    echo "| 🔶 仅内部依赖独立单元 | ${internal_count} |"
    echo "| 📋 达标组件合计 | ${total} |"
    echo ""
    echo "### 项目维度达标统计"
    echo ""
    echo "| 项目名称 | TS文件总数 | 零依赖 | 仅内部依赖 | 达标率 |"
    echo "|----------|-----------|--------|-----------|--------|"

    while IFS='|' read -r name pt pz pi; do
      [[ -z "$name" ]] && continue
      local compliant=$((pz + pi))
      local rate="0%"
      if [[ $pt -gt 0 ]]; then
        rate=$(awk "BEGIN {printf \"%.1f%%\", ($compliant/$pt)*100}")
      fi
      echo "| ${name} | ${pt} | ${pz} | ${pi} | ${rate} |"
    done < "$TMPDIR_PROJECTS"

    echo ""
    echo "---"
    echo ""
    echo "## ⭐ 类别一：零依赖组件"
    echo ""
    echo "> **定义**: 无任何第三方依赖、无内部模块导入的完全独立 TypeScript/TSX 文件"
    echo "> **评级标准**: ★★★★★ = 完美独立单元 | ★★★★☆ = 轻微扣分 | ★★★☆☆ = 需改进"
    echo ""

    if [[ "$zero_count" -eq 0 ]]; then
      echo "> ⚠️ 未发现零依赖组件"
    else
      echo "| 星级 | 文件路径 | 行数 | 大小 | 备注 |"
      echo "|------|---------|------|------|------|"
      sort -t'|' -k2 -rn "$TMPDIR_ZERO" | while IFS='|' read -r path stars lines size reasons; do
        [[ -z "$path" ]] && continue
        local sd
        sd=$(generate_star_display "$stars")
        local note="-"
        [[ -n "$reasons" ]] && note="$reasons"
        echo "| ${sd} \`${stars}/5\` | \`${path}\` | ${lines} | ${size} | ${note} |"
      done
    fi
    echo ""
    echo "---"
    echo ""
    echo "## 🔶 类别二：仅内部依赖独立单元"
    echo ""
    echo "> **定义**: 无第三方依赖，仅引用项目内部模块（相对路径/别名路径）的 TypeScript/TSX 文件"
    echo "> **评级标准**: ★★★★★ = 完美内部独立 | ★★★★☆ = 良好 | ★★★☆☆ = 内部耦合偏高"
    echo ""

    if [[ "$internal_count" -eq 0 ]]; then
      echo "> ⚠️ 未发现仅内部依赖独立单元"
    else
      echo "| 星级 | 文件路径 | 行数 | 大小 | 内部依赖数 | 备注 |"
      echo "|------|---------|------|------|-----------|------|"
      sort -t'|' -k2 -rn "$TMPDIR_INTERNAL" | while IFS='|' read -r path stars lines size ic reasons; do
        [[ -z "$path" ]] && continue
        local sd
        sd=$(generate_star_display "$stars")
        local note="-"
        [[ -n "$reasons" ]] && note="$reasons"
        echo "| ${sd} \`${stars}/5\` | \`${path}\` | ${lines} | ${size} | ${ic} | ${note} |"
      done
    fi
    echo ""
    echo "---"
    echo ""
    echo "## 🏆 五星达标组件清单"
    echo ""
    echo "> 以下组件达到 ★★★★★ 标准，符合 YYC³ 最高级别独立组件规范"
    echo ""
    echo "| # | 类别 | 文件路径 | 行数 | 大小 |"
    echo "|---|------|---------|------|------|"

    local idx=0
    sort -t'|' -k2 -rn "$TMPDIR_ZERO" | while IFS='|' read -r path stars lines size reasons; do
      [[ -z "$path" ]] && continue
      [[ "$stars" == "5" ]] || continue
      idx=$((idx + 1))
      echo "| ${idx} | 零依赖 | \`${path}\` | ${lines} | ${size} |"
    done

    sort -t'|' -k2 -rn "$TMPDIR_INTERNAL" | while IFS='|' read -r path stars lines size ic reasons; do
      [[ -z "$path" ]] && continue
      [[ "$stars" == "5" ]] || continue
      idx=$((idx + 1))
      echo "| ${idx} | 内部依赖 | \`${path}\` | ${lines} | ${size} |"
    done

    echo ""
    echo "---"
    echo ""
    echo "## 📈 星级分布统计"
    echo ""
    echo "### 零依赖组件星级分布"
    echo ""
    echo "| 星级 | 数量 | 占比 |"
    echo "|------|------|------|"

    for s in 5 4 3 2 1; do
      local cnt
      cnt=$(awk -F'|' -v s="$s" '$2==s {c++} END {print c+0}' "$TMPDIR_ZERO")
      local pct="0%"
      if [[ "$zero_count" -gt 0 ]]; then
        pct=$(awk "BEGIN {printf \"%.1f%%\", ($cnt/$zero_count)*100}")
      fi
      echo "| $(generate_star_display "$s") \`${s}/5\` | ${cnt} | ${pct} |"
    done

    echo ""
    echo "### 仅内部依赖独立单元星级分布"
    echo ""
    echo "| 星级 | 数量 | 占比 |"
    echo "|------|------|------|"

    for s in 5 4 3 2 1; do
      local cnt
      cnt=$(awk -F'|' -v s="$s" '$2==s {c++} END {print c+0}' "$TMPDIR_INTERNAL")
      local pct="0%"
      if [[ "$internal_count" -gt 0 ]]; then
        pct=$(awk "BEGIN {printf \"%.1f%%\", ($cnt/$internal_count)*100}")
      fi
      echo "| $(generate_star_display "$s") \`${s}/5\` | ${cnt} | ${pct} |"
    done

    echo ""
    echo "---"
    echo ""
    echo "## 🔍 审计方法说明"
    echo ""
    echo "### 扫描范围"
    echo "- 文件类型: \`.ts\`, \`.tsx\`"
    echo "- 排除目录: \`node_modules\`, \`.git\`, \`dist\`, \`build\`, \`__tests__\`, \`Custom\`"
    echo "- 第三方依赖识别: 500+ 常见 npm 包前缀匹配"
    echo ""
    echo "### 星级评定规则"
    echo ""
    echo "**零依赖组件**"
    echo "- ★★★★★: 行数 ≥ 15, 有 export, 有类型定义"
    echo "- ★★★★☆: 行数 5-14 或缺少部分特征"
    echo "- ★★★☆☆: 行数 < 5"
    echo "- 扣分项: 文件过大(>500行)"
    echo ""
    echo "**仅内部依赖独立单元**"
    echo "- ★★★★★: 内部依赖 ≤ 1, 行数适中, 有 export"
    echo "- ★★★★☆: 内部依赖 2-5, 行数适中"
    echo "- ★★★☆☆: 内部依赖 > 5 或行数异常"
    echo ""
    echo "### YYC³ 合规标准"
    echo "- **五高**: 高可用、高性能、高安全、高扩展、高维护"
    echo "- **五标**: 标准化、规范化、自动化、智能化、可视化"
    echo "- **五化**: 流程化、文档化、工具化、数字化、生态化"
    echo ""
    echo "---"
    echo ""
    echo "_报告由 YYC³ 零依赖审计脚本 v2 自动生成_"
    echo "_Generated at ${TIMESTAMP}_"

  } > "$REPORT_FILE"

  echo ""
  log_star "═══════════════════════════════════════════════════════"
  log_ok  "审计报告已生成: ${REPORT_FILE}"
  log_star "═══════════════════════════════════════════════════════"
  echo ""

  echo "报告预览 (前 80 行):"
  echo "───────────────────────────────────────────────────────────"
  head -80 "$REPORT_FILE"
  echo "───────────────────────────────────────────────────────────"
  echo ""
}

main "$@"
