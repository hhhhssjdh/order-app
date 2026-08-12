# 微信云托管部署知识库

> 本文档沉淀「点餐系统 order-app」成功部署到微信云托管的完整经验，包括架构适配、关键代码模式、踩坑记录和排查清单。后续遇到同类需求（微信云托管部署任意 Express/Node 应用）时，参照本文档改动代码。

## 一、微信云托管是什么

微信云托管 = **服务端部署平台**（容器 + MySQL），给"微信里的应用"提供后端。
- 微信小程序通过 `wx.cloud.callContainer` 调用容器
- H5 网页通过 HTTPS 域名直接访问
- **它本身不是小程序**，小程序/H5 前端需要另行开发或复用现有前端

## 二、适配模式（核心架构）

云托管要求**单容器单端口**，前后端一体化：

```
微信云托管容器 (端口 80)
├── /            → client 前台（React 构建产物，静态托管）
├── /admin       → admin 后台（React 构建产物，静态托管）
├── /api/*       → Express REST API
├── /uploads/*   → 上传的图片
└── MySQL        → 云托管 MySQL（MYSQL_* 环境变量注入）
```

### 关键代码模式

**1. 端口：云托管不注入 PORT，约定 80**
```typescript
// 云托管不注入 PORT，生产默认 80；本地开发默认 3001
const PORT = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '80' : '3001'), 10);
```
Dockerfile 同时 `ENV PORT=80` 双保险。

**2. 数据库：Prisma CLI 读不到 MYSQL_* 变量（最大坑）**
- 云托管只注入 `MYSQL_ADDRESS/USERNAME/PASSWORD`，**没有 DATABASE_URL**
- Prisma CLI（`prisma db push`）是独立进程，只认 `DATABASE_URL` → 会报 `Environment variable not found: DATABASE_URL`
- **解法：不要用 prisma db push，改用 mysql2 直连自动建库建表**（见 `server/src/db.ts`）

```typescript
// db.ts 核心：组装 URL + 自动建库建表（幂等）
export async function initDatabase(): Promise<void> {
  // 1. 连接不指定数据库，CREATE DATABASE IF NOT EXISTS (utf8mb4)
  // 2. 连接目标库，执行 CREATE TABLE IF NOT EXISTS（multipleStatements: true）
}
```

**3. 种子数据自动初始化：启动时检查空库**
```typescript
// index.ts bootstrap:
await initDatabase();                     // 建库建表
const count = await prisma.category.count();
if (count === 0) await seedData();        // 空库自动导入 1028 道菜
```

**4. MySQL 冷启动唤醒重试**
云托管 MySQL 可能自动暂停（serverless），首次连接需唤醒。初始化最多重试 10 次、间隔 3 秒。

**5. 前端静态托管 + SPA fallback**
```typescript
app.use('/admin', express.static(adminDist));
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  if (req.path.startsWith('/admin')) return res.sendFile(admin index.html);
  res.sendFile(client index.html);
});
```

**6. 前端部署路径**
- admin 构建 `base: '/admin/'` + `BrowserRouter basename="/admin"`
- client 构建 base 保持 `/`
- 图片/API 请求用**相对路径**（不能硬编码 localhost:3001）

**7. 图片存储**
- 环境变量有 `COS_BUCKET/COS_REGION` + `COS_SECRET_ID/COS_SECRET_KEY` 时上传 COS（持久化）
- 否则回退本地 `/uploads`（容器重启会丢，建议配持久化）

## 三、Dockerfile（参照官方模板风格）

官方模板：`alpine` 血统 + 国内镜像源 + `npm start`。我们的版本：

```dockerfile
FROM node:20-alpine           # 官方 alpine 自带 nodejs 太老，Vite 6 需 Node 18+

# 必装: tzdata(时区) + ca-certificates + openssl(Prisma 需要!上次失败根因)
RUN apk add --update --no-cache tzdata ca-certificates openssl \
  && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo Asia/Shanghai > /etc/timezone

WORKDIR /app
COPY package*.json /app/
COPY server/package*.json /app/server/
COPY admin/package*.json /app/admin/
COPY client/package*.json /app/client/

RUN npm config set registry https://mirrors.cloud.tencent.com/npm/
RUN cd /app/server && npm install --no-audit --no-fund
RUN cd /app/admin && npm install --no-audit --no-fund
RUN cd /app/client && npm install --no-audit --no-fund

COPY . /app
RUN cd /app/server && npx prisma generate && npm run build
RUN cd /app/client && npm run build
RUN cd /app/admin && npm run build

ENV PORT=80
CMD ["npm", "start"]          # 根 package.json: "start": "cd server && node dist/index.js"
```

### Dockerfile 三大要点
1. **openssl 必须装** — Prisma 运行时依赖，缺失报 `Prisma failed to detect libssl/openssl`
2. **启动命令不要用 `&&` 链** — db 初始化失败会阻断服务启动，导致健康检查挂死。用 `;` 或让代码容错
3. **多阶段构建可选** — 官方是单阶段；简单项目用单阶段更贴近官方

## 四、环境变量

| 变量 | 来源 | 用途 |
|---|---|---|
| `MYSQL_ADDRESS` | 云托管自动注入 | 数据库地址 host:port |
| `MYSQL_USERNAME` | 云托管自动注入 | 数据库用户 |
| `MYSQL_PASSWORD` | 云托管自动注入 | 数据库密码 |
| `MYSQL_DATABASE` | 可选，默认 `order_app` | 数据库名（代码自动创建） |
| `PORT` | **不注入** | 生产默认 80 |
| `JWT_SECRET` | 手动配置 | 建议补，有默认值 |
| `COS_BUCKET/REGION/SECRET_ID/SECRET_KEY` | 云托管注入 | 图片云存储 |

## 五、部署流程

1. 代码推送到 GitHub 仓库（Dockerfile 在仓库**根目录**）
2. 云托管控制台 → 新建服务 → 关联仓库 → Dockerfile 路径 `Dockerfile`
3. 服务设置：容器端口 **80**，确认环境变量（MYSQL_* 自动注入）
4. 部署后访问：`/` 前台、`/admin` 后台、`/merchant/login` 商家
5. 首次启动自动建库建表 + 导入种子数据（日志可见）

## 六、常见故障排查

| 症状 | 原因 | 解法 |
|---|---|---|
| 健康检查 `connection refused` | 服务没起来（端口错/依赖缺失） | 看启动日志；确认端口 80 |
| `Environment variable not found: DATABASE_URL` | prisma db push 读不到 MYSQL_* | 改用 mysql2 自动建表（见 db.ts） |
| `Prisma failed to detect libssl` | 缺 openssl | Dockerfile `apk add openssl` |
| 日志 `Server running on port 3001` | 生产没默认 80 | `NODE_ENV=production` 时默认 80 |
| MySQL 连接失败/超时 | serverless 冷启动暂停 | 重试 10 次间隔 3s |
| 图片重启丢失 | 本地 uploads 不持久 | 配 COS 或 CFS 挂载 |
| 页面打不开但服务在跑 | 域名/健康检查问题 | 先 curl `/api/categories` 验证 |

## 七、日志正确形态（部署成功的标志）

```
> start
> cd server && node dist/index.js
[db] 数据库 order_app 已就绪
[db] 数据表已就绪
[init] 数据库为空，自动初始化种子数据...
Seed data created: 1028 dishes in 5 categories
Server running on port 80
```

## 八、参考仓库

- 官方模板：https://github.com/WeixinCloud/wxcloudrun-express（Dockerfile 风格参考）
- 本项目：https://github.com/hhhhssjdh/order-app（完整可用实现）
- 官方 MySQL 文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/guide/mysql/
