# YYC³ Monorepo Web 镜像（v2 monorepo 化：build context = 仓库根）
# 构建: docker build -f apps/app-desktop/Dockerfile -t yyc3-matrix .
# 说明: 十二包为源码直编模式（exports → src/index.ts），无包级 dist 构建步；
#       app build 由 vite 直接编译 workspace 源码。
ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm && corepack prepare pnpm@9 --activate
WORKDIR /repo

FROM base AS builder
# monorepo 全仓复制（workspace:* 依赖 + 包源码直编所需）
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @yyc3/app-desktop build

ARG VERSION=0.0.1
ARG BUILD_DATE
ARG VCS_REF

FROM nginx:alpine AS runner
RUN apk add --no-cache curl

ARG VERSION
ARG BUILD_DATE
ARG VCS_REF

LABEL maintainer="YanYuCloudCube Team <admin@0379.email>"
LABEL org.opencontainers.image.title="YYC³ CloudPivot Intelli-Matrix"
LABEL org.opencontainers.image.description="Enterprise-level intelligent matrix management system"
LABEL org.opencontainers.image.version=${VERSION}
LABEL org.opencontainers.image.created=${BUILD_DATE}
LABEL org.opencontainers.image.revision=${VCS_REF}
LABEL org.opencontainers.image.vendor="YanYuCloudCube"

COPY apps/app-desktop/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /repo/apps/app-desktop/dist /usr/share/nginx/html

RUN echo "Build Info:" > /usr/share/nginx/html/build-info.txt && \
    echo "Version: ${VERSION}" >> /usr/share/nginx/html/build-info.txt && \
    echo "Build Date: ${BUILD_DATE}" >> /usr/share/nginx/html/build-info.txt && \
    echo "VCS Ref: ${VCS_REF}" >> /usr/share/nginx/html/build-info.txt

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
