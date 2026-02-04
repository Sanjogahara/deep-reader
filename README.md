# 📚 Deep Reader

**专为哲学文本设计的深度阅读器**

支持 EPUB 格式，集成本地 AI 解析、批注系统、多端同步。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-5.0-green.svg)

---

## ✨ 功能特性

### 📖 阅读体验
- **双阅读模式**：翻页模式 / 滚动模式，自由切换
- **专业排版**：衬线字体、段落缩进、可调字号与行高
- **键盘导航**：`←` `→` 方向键翻页
- **阅读进度**：自动保存，下次打开恢复位置

### 🖍️ 标注系统
- **高亮**：黄色荧光笔效果
- **下划线**：棕色实线下划线
- **波浪线**：粉色波浪下划线
- **批注**：添加文字笔记，自动生成书签

### 🤖 AI 集成
- **深度分析**：哲学文本概念解读、论证结构分析
- **快速翻译**：外文文献即时翻译
- **本地部署**：使用 Ollama + DeepSeek，数据不出本机

### 🔄 多端同步
- **本地服务器**：Mac 作为同步中心
- **三端同步**：Mac / iPhone / iPad 阅读进度与批注同步
- **离线可用**：无网络时本地存储，联网后自动同步

---

## 🚀 快速开始

### 1. 下载文件

```bash
git clone https://github.com/你的用户名/deep-reader.git
cd deep-reader
```

### 2. 直接使用（无需安装）

用浏览器打开 `index.html` 即可使用基础功能。

### 3. 启用同步服务器（可选）

```bash
# 安装依赖
npm install

# 启动同步服务器
npm start
```

服务器运行在 `http://localhost:3001`

---

## 📁 项目结构

```
deep-reader/
├── index.html        # 页面结构
├── style.css         # 样式表
├── script.js         # 核心逻辑
├── sync-server.js    # 同步服务器
├── package.json      # Node.js 配置
└── README.md         # 说明文档
```

---

## 🎯 使用指南

### 基础操作

| 操作 | 方式 |
|------|------|
| 打开书籍 | 点击「📂 打开」或拖拽 EPUB 文件 |
| 翻页 | 点击 `←` `→` 按钮，或使用键盘方向键 |
| 打开设置 | 点击右上角 ⚙️ |
| 查看书签 | 点击 📑 打开左侧栏 |
| 查看批注 | 点击 📝 打开右侧栏 |

### 标注操作

| 操作 | 方式 |
|------|------|
| 添加标注 | 选中文字 → 右键 → 选择类型 |
| 删除标注 | 右键点击已标注区域 → 删除此标注 |
| 添加批注 | 选中文字 → 右键 → 添加批注 → 输入内容 |

### AI 功能

| 操作 | 方式 |
|------|------|
| 快速翻译 | 选中文字 → 右键 → 翻译 |
| 深度分析 | 选中文字 → 右键 → 深度分析 |

> 💡 AI 功能需要本地运行 Ollama，详见下方配置说明。

---

## ⚙️ 配置说明

### AI 配置（Ollama）

1. 安装 Ollama：https://ollama.ai

2. 下载模型：
```bash
ollama pull deepseek-r1:8b
```

3. 启动服务：
```bash
ollama serve
```

4. 在阅读器设置中确认：
   - Ollama API：`http://localhost:11434`
   - 模型名称：`deepseek-r1:8b`

### 同步配置

1. 启动同步服务器：
```bash
npm start
```

2. 在阅读器设置中填入同步服务器地址：
   - 本机：`http://localhost:3001`
   - 其他设备：`http://[Mac的IP地址]:3001`

3. 查看 Mac IP 地址：
```bash
ipconfig getifaddr en0
```

---

## 📱 多端使用

### Mac
直接用浏览器打开 `index.html`

### iPhone / iPad
1. 确保与 Mac 在同一 WiFi 网络
2. Safari 访问 `http://[Mac的IP]:8080/index.html`
3. 设置中填入同步服务器地址

> 💡 可以用 Python 快速启动本地服务器：
> ```bash
> python -m http.server 8080
> ```

---

## 🛠️ 技术栈

- **前端**：原生 HTML/CSS/JavaScript
- **EPUB 解析**：[epub.js](https://github.com/futurepress/epub.js)
- **PDF 导出**：[jsPDF](https://github.com/parallax/jsPDF)
- **同步服务**：Node.js + Express
- **AI**：Ollama + DeepSeek

---

## 📝 更新日志

### v5.0 (2025-02)
- 🔄 代码模块化重构（HTML/CSS/JS 分离）
- 🖱️ 右键菜单交互
- 📑 侧边栏逻辑优化（书签/批注分离）
- 🎨 标注样式修复（下划线、波浪线）
- 🌐 双模式 AI（翻译/分析）
- 📖 阅读模式切换（翻页/滚动）

### v4.0
- 🔄 本地同步服务器
- 📌 书签系统重设计

### v3.0
- 📚 多书合集目录支持
- 📤 批注导出（PDF/Markdown/JSON）

### v2.0
- 🤖 Ollama AI 集成
- 🖍️ 基础标注功能

### v1.0
- 📖 EPUB 阅读器基础功能

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [epub.js](https://github.com/futurepress/epub.js) - EPUB 渲染引擎
- [Ollama](https://ollama.ai) - 本地 AI 运行时
- [DeepSeek](https://deepseek.com) - AI 模型
