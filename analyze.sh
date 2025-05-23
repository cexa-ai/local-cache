#!/usr/bin/env fish

# 检查 CodeQL 是否安装
if not command -v codeql
    echo "CodeQL CLI not found. Please install it first."
    exit 1
end

# 设置环境变量
set -x CODEQL_HOME ~/codeql-home

# 创建目录（如果不存在）
if not test -d $CODEQL_HOME
    mkdir -p $CODEQL_HOME
end

# 检查 src 目录
if not test -d src
    echo "src directory not found."
    exit 1
end

# 初始化 CodeQL
echo "Initializing CodeQL..."
codeql database init $CODEQL_HOME/database \
    --language=typescript \
    --source-root=./src

# 自动构建
echo "Autobuilding..."
codeql database build $CODEQL_HOME/database

# 运行分析
echo "Running CodeQL analysis..."
codeql database analyze $CODEQL_HOME/database \
    --format=sarif-latest \
    --output=results.sarif \
    --threads=0 \
    --ram=4096

# 查看结果
echo "Interpreting results..."
codeql database interpret-results \
    --format=sarif-latest \
    --output=results.sarif \
    $CODEQL_HOME/database