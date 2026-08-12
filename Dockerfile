# 二开推荐阅读[如何提高项目构建效率](https://developers.weixin.qq.com/miniprogram/dev/wxcloudrun/src/scene/build/speed.html)
# 参照官方 wxcloudrun-express 模板，使用 alpine 血统镜像 + 国内镜像源
FROM node:20-alpine

# 容器默认时区为UTC，启用上海时间
RUN apk add --update --no-cache tzdata ca-certificates openssl \
  && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
  && echo Asia/Shanghai > /etc/timezone

# 指定工作目录
WORKDIR /app

# 拷贝包管理文件（先装依赖，利用缓存）
COPY package*.json /app/
COPY server/package*.json /app/server/
COPY admin/package*.json /app/admin/
COPY client/package*.json /app/client/

# npm 源，选用国内镜像源以提高下载速度
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/

# npm 安装依赖
RUN cd /app/server && npm install --no-audit --no-fund
RUN cd /app/admin && npm install --no-audit --no-fund
RUN cd /app/client && npm install --no-audit --no-fund

# 将当前目录（dockerfile所在目录）下所有文件都拷贝到工作目录下（.dockerignore中文件除外）
COPY . /app

# 生成 Prisma Client、编译后端、构建前端产物
RUN cd /app/server && npx prisma generate && npm run build
RUN cd /app/client && npm run build
RUN cd /app/admin && npm run build

# 执行启动命令（npm start → 见根 package.json：先同步数据库表结构再启动）
ENV PORT=80
CMD ["npm", "start"]
