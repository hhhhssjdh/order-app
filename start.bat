@echo off
chcp 65001 >nul
title 点餐系统 - 一键启动
echo ==========================================
echo    点餐系统 一键启动
echo ==========================================
echo.

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 检查 Node.js 是否安装
where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Node.js 环境！
    echo 请先安装 Node.js (https://nodejs.org) 后重试。
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js 已检测: 
node -v
echo.

REM 杀掉占用 3001 端口的旧进程
echo [1/4] 清理旧进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>nul
)

REM 检查依赖是否已安装
if not exist server\node_modules (
    echo [2/4] 首次运行，安装依赖中（约1-3分钟）...
    cd server && call npm install --no-audit --no-fund && cd ..
    cd admin && call npm install --no-audit --no-fund && cd ..
    cd client && call npm install --no-audit --no-fund && cd ..
) else (
    echo [2/4] 依赖已就绪
)

REM 初始化数据库（若不存在）
if not exist server\prisma\dev.db (
    echo [2.5/4] 初始化数据库...
    cd server && call npx prisma db push --accept-data-loss && call npx tsx src\seed.ts && cd ..
) else (
    echo [2.5/4] 数据库已存在
)

echo [3/4] 启动后端服务 (端口 3001)...
start "点餐系统-后端" /min cmd /c "cd /d "%~dp0server" && npx tsx src\index.ts"

echo [4/4] 启动前端页面...
start "点餐系统-后台管理" /min cmd /c "cd /d "%~dp0admin" && npx vite --host"
start "点餐系统-顾客端" /min cmd /c "cd /d "%~dp0client" && npx vite --host"

echo.
echo ==========================================
echo    启动完成！正在打开浏览器...
echo    顾客点餐:  http://localhost:5174
echo    后台管理:  http://localhost:5173
echo    关闭方式:  关闭弹出的命令行窗口即可
echo ==========================================
echo.
timeout /t 4 /nobreak >nul
start http://localhost:5174
exit
