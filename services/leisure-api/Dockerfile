# YYC³ LeisureAPI · 镜像(开发 profile:bind-mount 源码与依赖,容器内跑编译产物)
# 生产镜像构建(自含依赖)属部署阶段,见 10-后端 §六
FROM node:22-alpine
# Prisma 引擎检测依赖 openssl CLI(缺失会回退 1.1.x 导致引擎不匹配)
RUN apk add --no-cache openssl
WORKDIR /workspace/services/leisure-api
# TZ 统一为门店本地时区口径(营业日按门店 cut_time 计算,与宿主一致便于联调)
ENV TZ=Asia/Shanghai
CMD ["node", "--env-file=.env", "--watch", "dist/main.js"]
