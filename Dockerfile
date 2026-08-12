# ============================================================
# 点餐系统 - 微信云托管部署镜像
# 多阶段构建：阶段1 构建前端+编译后端；阶段2 精简运行
# ============================================================

# ---- 阶段 1：构建 ----
FROM node:20-slim AS builder

# Prisma 需要 OpenSSL
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先复制 package.json 安装依赖（利用 Docker 层缓存）
COPY server/package*.json ./server/
COPY admin/package*.json ./admin/
COPY client/package*.json ./client/

RUN cd server && npm install --registry=https://mirrors.cloud.tencent.com/npm/
RUN cd admin && npm install --registry=https://mirrors.cloud.tencent.com/npm/
RUN cd client && npm install --registry=https://mirrors.cloud.tencent.com/npm/

# 复制全部源码
COPY server ./server
COPY admin ./admin
COPY client ./client

# 构建前端产物
RUN cd client && npm run build
RUN cd admin && npm run build

# 生成 Prisma Client 并编译后端
RUN cd server && npx prisma generate && npm run build

# ---- 阶段 2：运行 ----
FROM node:20-slim

# Prisma 运行时依赖 OpenSSL
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# 后端运行文件
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/package.json ./server/package.json

# 前端构建产物（由后端静态托管）
COPY --from=builder /app/admin/dist ./admin/dist
COPY --from=builder /app/client/dist ./client/dist

# 上传目录（菜品图片，建议配置云托管持久化存储）
RUN mkdir -p /app/server/uploads && chmod -R 777 /app/server/uploads

WORKDIR /app/server

EXPOSE 80

# 启动前先同步数据库表结构（失败不阻断启动，便于排查），再启动服务
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate; echo '--- DB init done, starting app ---'; node dist/index.js"]
