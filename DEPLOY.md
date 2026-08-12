# 微信云托管部署指南

本项目已适配微信云托管（单容器单端口，MySQL 数据库，前后端一体化部署）。

## 架构

```
微信云托管容器 (端口 80)
├── /            → client 前台点餐（React 构建产物）
├── /admin       → admin 后台管理（React 构建产物）
├── /api/*       → Express REST API
├── /uploads/*   → 菜品图片（建议挂载持久化存储）
└── MySQL        → 云托管 MySQL（环境变量注入连接信息）
```

## 部署步骤

### 1. 创建云托管服务
微信开发者工具 → 云开发控制台 → 云托管 → 新建服务
- 语言：Docker（本项目自带 Dockerfile）
- 服务名称：`order-app`

### 2. 代码仓库
将本仓库推送到 GitHub/GitLab，在云托管控制台关联仓库，Dockerfile 路径选 `Dockerfile`。

### 3. 环境变量（必须配置）
在服务设置的「环境变量」中配置：

| 变量 | 说明 | 示例 |
|---|---|---|
| `MYSQL_ADDRESS` | 云托管 MySQL 地址 | `xxxx.mysql.tencentcdb.com:3306` |
| `MYSQL_USERNAME` | 数据库用户 | `root` |
| `MYSQL_PASSWORD` | 数据库密码 | `******` |
| `MYSQL_DATABASE` | 数据库名 | `order_app` |
| `JWT_SECRET` | JWT 密钥（自定义） | 随机字符串 |

> 数据库需先在云托管控制台创建（或在 `container.config.json` 的 `executeSQLs` 中自动建库）。

### 4. 端口设置
容器端口设置为 **80**（Dockerfile 已 `EXPOSE 80`，服务自动注入 `PORT` 环境变量）。

### 5. 首次初始化数据
部署后首次启动会自动 `prisma db push` 建表。**菜品种子数据（1028道家常菜）需要手动执行一次**：

```bash
# 方式一：控制台「终端」执行
cd /app/server && npx tsx src/seed.ts

# 方式二：或临时修改启动命令为
# sh -c "npx prisma db push --accept-data-loss && npx tsx src/seed.ts && node dist/index.js"
```

### 6. 图片存储（推荐）
`/uploads` 目录在容器重启后会丢失。推荐在云托管控制台：
- 创建**文件存储（CFS）**或使用 **对象存储（COS）**
- 挂载到 `/app/server/uploads` 路径

## 本地开发（不受影响）

```bash
cd order-app
npm run dev    # 本地三个服务照常（server 3001 / admin 5173 / client 5174）
```

> 本地 server 现在连接 MySQL。若本地无 MySQL，可安装并创建 `order_app` 库，在 `server/.env` 中配置 `MYSQL_ADDRESS=localhost:3306` 等变量。

## 访问地址

部署完成后：
- 前台点餐：`https://<云托管域名>/`
- 后台管理：`https://<云托管域名>/admin`（登录密码 admin123）
- 商家端：`https://<云托管域名>/merchant/login`（商家手机号 18977524719）
