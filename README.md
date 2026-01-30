# Deep Reader - 通用深度阅读助手 使用指南

## 🎯 核心特性

✅ **三大阅读模式**
- 🏛️ 哲学著作：黑格尔、康德等晦涩文本逻辑拆解
- 📄 学术文献：论文、研究报告核心论点总结
- 📰 外刊阅读：经济学人、纽约时报等英文原文解析

✅ **全平台支持**
- 💻 macOS (Safari/Chrome)
- 📱 iPhone/iPad (可添加到主屏幕)
- 🖥️ Windows/Linux (任何现代浏览器)

✅ **核心交互**
- 选中文本 → 点击浮动按钮 → 即刻解析
- 无需复制粘贴，流畅的阅读体验

---

## 🚀 快速开始

### 方式一：本地运行（推荐开发调试）

1. **下载文件**
   ```bash
   # 保存 deep-reader.html 到本地
   # 双击用浏览器打开即可
   ```

2. **设置 API Key**
   - 访问 https://platform.deepseek.com 注册账号
   - 创建 API Key（首充10元能用很久）
   - 在页面右上角输入 API Key

3. **开始使用**
   - 选择阅读模式（哲学/文献/外刊）
   - 粘贴文本或上传 .txt 文件
   - 选中至少指定字数的文本
   - 点击浮动的"立即解析"按钮

### 方式二：部署到服务器（推荐生产使用）

#### 使用 Vercel（免费、零配置）

1. **准备文件**
   ```
   your-project/
   ├── index.html (重命名 deep-reader.html)
   ├── manifest.json
   └── vercel.json (可选)
   ```

2. **部署**
   ```bash
   # 安装 Vercel CLI
   npm i -g vercel
   
   # 在项目目录执行
   vercel --prod
   ```

3. **访问**
   - 获得形如 `https://your-app.vercel.app` 的网址
   - 在 iPhone/iPad Safari 点击"添加到主屏幕"

#### 使用 GitHub Pages（免费）

1. 创建 GitHub 仓库
2. 上传 `deep-reader.html` 并重命名为 `index.html`
3. 在仓库设置中启用 GitHub Pages
4. 访问 `https://yourusername.github.io/repo-name`

---

## 📱 在 iOS 上安装为 App

1. 用 Safari 打开部署后的网址
2. 点击底部"分享"按钮
3. 滑动找到"添加到主屏幕"
4. 点击"添加"

✨ 现在你的主屏幕上有了 Deep Reader 图标，点击就像原生 App！

---

## 💡 使用技巧

### 1. 哲学模式最佳实践
```
选中段落要求：至少 200 字
适合文本：黑格尔《美学》《逻辑学》、康德《纯粹理性批判》
AI 会做什么：
- 用白话概括核心论点
- 拆解逻辑结构
- 解释术语（如"绝对精神"）
```

### 2. 学术模式最佳实践
```
选中段落要求：至少 150 字
适合文本：SCI 论文、研究报告、综述
AI 会做什么：
- 总结核心论点
- 提炼研究方法
- 指出可能的局限性
```

### 3. 外刊模式最佳实践
```
选中段落要求：至少 100 字
适合文本：The Economist、NYT、WSJ
AI 会做什么：
- 中文总结要点
- 解释难词难句（标注原文）
- 梳理行文逻辑
```

### 4. 批量解析技巧
- 多次选中不同段落，右侧会累积显示所有解析
- 点击每个解析框右上角的 ✕ 可删除
- 解析结果自动保存在浏览器内存中（刷新页面会清空）

---

## 🔧 常见问题

### Q1: 为什么选中文本后没有弹出按钮？
**A:** 检查以下几点：
1. 选中的文本字数是否达到最低要求（哲学200字/文献150字/外刊100字）
2. 是否在文本输入框内选中（其他区域无效）
3. 尝试重新选择文本

### Q2: API 调用失败怎么办？
**A:** 常见原因：
1. API Key 输入错误 → 重新复制粘贴
2. 账户余额不足 → 前往 DeepSeek 充值
3. 网络问题 → 检查网络连接
4. CORS 限制 → 确保从 HTTPS 域名访问（本地文件可能有限制）

### Q3: 能否支持 PDF 直接上传？
**A:** 当前版本暂不支持，计划在下一版本加入。
临时方案：
1. 用 PDF 阅读器复制文本后粘贴
2. 使用 OCR 工具将 PDF 转为文本

### Q4: 解析速度慢怎么办？
**A:** 
- 使用 DeepSeek Chat 模型（已配置）速度较快
- 选中段落不要过长（建议 500-1000 字为佳）
- 检查网络延迟

### Q5: 数据安全吗？
**A:** 
- 你的 API Key 只存储在浏览器本地（localStorage）
- 文本内容通过 HTTPS 加密传输到 DeepSeek API
- 不会上传到任何第三方服务器（除了 DeepSeek）

---

## 🛠️ 进阶定制

### 修改 AI 提示词

在 HTML 文件中找到 `READING_MODES` 对象：

```javascript
const READING_MODES = {
  philosophy: {
    systemPrompt: '你的自定义提示词...',
    minLength: 200, // 修改最小字数要求
    // ...
  }
}
```

### 添加新的阅读模式

```javascript
const READING_MODES = {
  // ... 现有模式
  coding: {
    icon: Code, // 需要引入对应图标
    name: '代码审查',
    color: 'from-green-500 to-teal-600',
    systemPrompt: '你是一位资深工程师。请审查这段代码...',
    minLength: 50,
    placeholder: 'Paste your code here...'
  }
}
```

### 更换 AI 模型

在 `analyzeText` 函数中修改 `model` 参数：

```javascript
body: JSON.stringify({
  model: 'deepseek-reasoner', // 换成 DeepSeek-R1 获得思考链
  // 或者
  model: 'deepseek-chat',     // 默认快速模型
  // ...
})
```

---

## 📊 成本估算

DeepSeek 定价（2025年1月）：
- deepseek-chat: ¥1/百万 tokens（输入），¥2/百万 tokens（输出）
- deepseek-reasoner: ¥5.5/百万 tokens（输入），¥22/百万 tokens（输出）

**实际使用成本**：
- 解析 1000 字哲学文本 ≈ ¥0.005（5厘钱）
- 10 元能解析约 2000 次
- 如果只用 chat 模型，10 元够你用半年

---

## 🚧 开发路线图

- [ ] PDF 文件直接上传支持（集成 PDF.js）
- [ ] 本地模型支持（Ollama 集成）
- [ ] 解析历史记录保存
- [ ] 导出解析结果为 Markdown
- [ ] 多语言界面（英文、日文）
- [ ] 暗黑模式
- [ ] 语音朗读解析结果

---

## 🤝 贡献与反馈

欢迎提出建议！如果你有任何问题或想法，可以：
1. 提交 GitHub Issue
2. 发送邮件反馈
3. Fork 项目自行定制

---

## 📜 开源协议

MIT License - 自由使用、修改、分发

---

**享受深度阅读的乐趣！** 📚✨
