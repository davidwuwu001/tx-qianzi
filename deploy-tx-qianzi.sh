#!/bin/bash

# ============================================
# 腾讯电子签便捷签约系统 - 一键部署脚本
# 
# 功能：自动推送代码 → 服务器拉取 → 构建 → 重启
# 使用：./deploy-tx-qianzi.sh [提交信息]
# ============================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目配置
PM2_APP_NAME="tx-qianzi"
GIT_BRANCH="master"
GIT_REMOTE="origin"

# 服务器配置（使用 SSH 密钥免密登录）
SERVER_HOST="139.196.192.43"
SERVER_USER="root"
SERVER_PATH="/www/wwwroot/tx-qianzi"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  腾讯电子签便捷签约系统 - 一键部署${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}服务器: ${SERVER_HOST}${NC}"
echo -e "${BLUE}路径: ${SERVER_PATH}${NC}"
echo -e "${BLUE}分支: ${GIT_BRANCH}${NC}"
echo ""

# 步骤 1：检查并提交本地更改
echo -e "${YELLOW}[1/6] 检查本地更改...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}发现未提交的更改，正在提交...${NC}"
    git add -A
    COMMIT_MSG="${1:-部署更新}"
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✓ 本地提交完成: $COMMIT_MSG${NC}"
else
    echo -e "${GREEN}✓ 没有未提交的更改${NC}"
fi

# 步骤 2：推送代码到 GitHub
echo -e "\n${YELLOW}[2/6] 推送代码到 GitHub...${NC}"
git push $GIT_REMOTE $GIT_BRANCH
if [ $? -ne 0 ]; then
    echo -e "${RED}推送失败！${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 推送成功${NC}"

# 步骤 3：服务器拉取代码
echo -e "\n${YELLOW}[3/6] 服务器拉取代码...${NC}"
ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && git pull $GIT_REMOTE $GIT_BRANCH"
if [ $? -ne 0 ]; then
    echo -e "${RED}拉取失败！${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 拉取成功${NC}"

# 步骤 4：安装依赖
echo -e "\n${YELLOW}[4/6] 安装依赖...${NC}"
ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && npm install"
if [ $? -ne 0 ]; then
    echo -e "${RED}安装依赖失败！${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 依赖安装成功${NC}"

# 步骤 5：生成 Prisma 客户端并构建
echo -e "\n${YELLOW}[5/6] 构建项目（可能需要几分钟）...${NC}"
ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && npx prisma generate && npm run build"
if [ $? -ne 0 ]; then
    echo -e "${RED}构建失败！${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 构建成功${NC}"

# 步骤 6：重启服务
echo -e "\n${YELLOW}[6/6] 重启服务...${NC}"
ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && (pm2 describe $PM2_APP_NAME > /dev/null 2>&1 && pm2 restart $PM2_APP_NAME) || pm2 start npm --name $PM2_APP_NAME -- start"
if [ $? -ne 0 ]; then
    echo -e "${RED}重启失败！${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 服务启动成功${NC}"

# 保存 PM2 配置
ssh $SERVER_USER@$SERVER_HOST "pm2 save" 2>/dev/null

# 显示服务状态
echo -e "\n${YELLOW}服务状态：${NC}"
ssh $SERVER_USER@$SERVER_HOST "pm2 list"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}访问地址: http://${SERVER_HOST}:3000${NC}"
