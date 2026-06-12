#!/bin/bash
# 逮小鱼项目 Git 常用命令模板
# 用法: bash scripts/git-workflow.sh [命令]
# 例:   bash scripts/git-workflow.sh status

set -e
cd "$(dirname "$0")/.."

case "${1:-help}" in
  status)
    echo "=== 当前状态 ==="
    git status
    echo ""
    git log -3 --oneline
    ;;

  push-main)
    MSG="${2:-update: 日常改动}"
    git add .
    git status
    git commit -m "$MSG" || true
    git pull origin main --rebase 2>/dev/null || true
    git push origin main
    echo "✓ 已推送到 main"
    ;;

  new-branch)
    BRANCH="${2:?请提供分支名，例: bash scripts/git-workflow.sh new-branch fix-read-handle}"
    git checkout -b "$BRANCH"
    echo "✓ 已创建并切换到分支: $BRANCH"
    ;;

  push-branch)
    MSG="${2:-update: 分支改动}"
    BRANCH=$(git branch --show-current)
    git add .
    git status
    git commit -m "$MSG" || true
    git push -u origin "$BRANCH"
    echo "✓ 已推送到分支: $BRANCH"
    ;;

  merge-to-main)
    BRANCH=$(git branch --show-current)
    if [ "$BRANCH" = "main" ]; then
      echo "当前已在 main，无需合并"
      exit 1
    fi
    git checkout main
    git pull origin main
    git merge "$BRANCH"
    git push origin main
    echo "✓ 已将 $BRANCH 合并到 main 并推送"
    ;;

  help|*)
    cat <<'EOF'
Git 工作流快捷命令:

  bash scripts/git-workflow.sh status
  bash scripts/git-workflow.sh push-main "fix: 修复拖柄跟手"
  bash scripts/git-workflow.sh new-branch fix-read-handle
  bash scripts/git-workflow.sh push-branch "feat: 阅读页优化"
  bash scripts/git-workflow.sh merge-to-main

也可直接复制下方命令到终端使用。
EOF
    ;;
esac
