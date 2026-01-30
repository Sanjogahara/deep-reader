#!/bin/bash

# Deep Reader 项目清理脚本
# 用途：清理项目中的缓存和临时文件

echo "🧹 Deep Reader 项目清理工具"
echo "================================"
echo ""

# 确保在正确的目录
if [ ! -f "deep-reader.html" ] && [ ! -f "deep-reader-fixed.html" ]; then
    echo "❌ 错误：请在项目目录中运行此脚本"
    exit 1
fi

# 统计清理前的大小
BEFORE=$(du -sh . | awk '{print $1}')
echo "📊 清理前项目大小: $BEFORE"
echo ""

# ==================== 1. 清理系统文件 ====================
echo "🗑️  清理 macOS 系统文件..."
find . -name ".DS_Store" -delete 2>/dev/null
find . -name "._*" -delete 2>/dev/null
find . -name "*~" -delete 2>/dev/null
find . -name "Thumbs.db" -delete 2>/dev/null
echo "✅ 系统文件已清理"
echo ""

# ==================== 2. 清理编辑器临时文件 ====================
echo "🗑️  清理编辑器临时文件..."
find . -name "*.swp" -delete 2>/dev/null
find . -name "*.swo" -delete 2>/dev/null
find . -name ".*.swp" -delete 2>/dev/null
echo "✅ 编辑器临时文件已清理"
echo ""

# ==================== 3. 清理 Git 缓存 ====================
if [ -d ".git" ]; then
    echo "🗑️  优化 Git 仓库..."
    GIT_SIZE_BEFORE=$(du -sh .git | awk '{print $1}')
    echo "   Git 仓库大小: $GIT_SIZE_BEFORE"
    
    git gc --aggressive --prune=now --quiet
    
    GIT_SIZE_AFTER=$(du -sh .git | awk '{print $1}')
    echo "   优化后大小: $GIT_SIZE_AFTER"
    echo "✅ Git 仓库已优化"
else
    echo "ℹ️  未找到 .git 目录"
fi
echo ""

# ==================== 4. 清理可能的构建产物 ====================
echo "🗑️  清理构建产物（如果有）..."
rm -rf dist/ 2>/dev/null
rm -rf build/ 2>/dev/null
rm -rf .cache/ 2>/dev/null
rm -rf .temp/ 2>/dev/null
echo "✅ 构建产物已清理"
echo ""

# ==================== 5. 清理 node_modules（如果有）====================
if [ -d "node_modules" ]; then
    NODE_SIZE=$(du -sh node_modules | awk '{print $1}')
    echo "⚠️  发现 node_modules (大小: $NODE_SIZE)"
    read -p "   是否删除？[y/N]: " confirm
    
    if [[ $confirm == [yY] ]]; then
        rm -rf node_modules
        echo "✅ node_modules 已删除"
        echo "💡 运行 'npm install' 可恢复"
    else
        echo "⏭️  跳过 node_modules"
    fi
else
    echo "ℹ️  未找到 node_modules（纯 HTML 项目无需清理）"
fi
echo ""

# ==================== 6. 列出占用空间最大的文件 ====================
echo "📊 占用空间最大的 10 个文件："
find . -type f -exec du -h {} + 2>/dev/null | sort -rh | head -10
echo ""

# 统计清理后的大小
AFTER=$(du -sh . | awk '{print $1}')
echo "================================"
echo "📊 清理结果："
echo "   清理前: $BEFORE"
echo "   清理后: $AFTER"
echo ""
echo "✅ 清理完成！"
echo ""
echo "💡 提示："
echo "   - 项目文件已保留"
echo "   - Git 历史已保留"
echo "   - 浏览器缓存需手动清理（见说明）"
