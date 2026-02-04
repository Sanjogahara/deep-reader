/**
 * Deep Reader 同步服务器
 * 
 * 在 Mac 上运行，实现多端阅读进度和批注同步
 * 
 * 使用方法：
 * 1. 安装 Node.js（如果没有）: brew install node
 * 2. 进入此目录: cd /path/to/deep-reader
 * 3. 安装依赖: npm install express cors
 * 4. 启动服务器: node sync-server.js
 * 5. 服务器运行在 http://localhost:3001
 * 
 * 在阅读器设置中填入同步服务器地址: http://localhost:3001
 * 
 * 如果要在其他设备（iPhone/iPad）访问：
 * 1. 找到 Mac 的局域网 IP（系统偏好设置 > 网络）
 * 2. 在其他设备填入: http://192.168.x.x:3001
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'sync-data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 健康检查
app.get('/ping', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
});

// 获取阅读位置和批注
app.get('/position/:bookId', (req, res) => {
    const bookId = decodeURIComponent(req.params.bookId);
    const safeName = bookId.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const filePath = path.join(DATA_DIR, safeName + '.json');

    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: 'Failed to read data' });
        }
    } else {
        res.json({ position: null, annotations: null });
    }
});

// 保存阅读位置
app.post('/position', (req, res) => {
    const { bookId, position, timestamp } = req.body;
    if (!bookId) {
        return res.status(400).json({ error: 'Missing bookId' });
    }

    const safeName = bookId.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const filePath = path.join(DATA_DIR, safeName + '.json');

    let data = {};
    if (fs.existsSync(filePath)) {
        try {
            data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {}
    }

    data.position = position;
    data.positionTimestamp = timestamp || Date.now();

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// 完整同步（位置 + 批注）
app.post('/sync', (req, res) => {
    const { bookId, position, annotations, timestamp } = req.body;
    if (!bookId) {
        return res.status(400).json({ error: 'Missing bookId' });
    }

    const safeName = bookId.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const filePath = path.join(DATA_DIR, safeName + '.json');

    let existingData = {};
    if (fs.existsSync(filePath)) {
        try {
            existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {}
    }

    // 只有当客户端时间戳更新时才覆盖
    const clientTS = timestamp || Date.now();
    const serverTS = existingData.timestamp || 0;

    if (clientTS >= serverTS) {
        const newData = {
            position,
            annotations,
            timestamp: clientTS,
            lastSync: new Date().toISOString()
        };
        fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
        res.json({ success: true, updated: true });
    } else {
        res.json({ success: true, updated: false, message: 'Server has newer data' });
    }
});

// 获取所有已同步的书籍列表
app.get('/books', (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
        const books = files.map(f => {
            const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
            return {
                id: f.replace('.json', ''),
                lastSync: data.lastSync,
                hasAnnotations: !!(data.annotations && Object.keys(data.annotations).length > 0)
            };
        });
        res.json(books);
    } catch (e) {
        res.status(500).json({ error: 'Failed to list books' });
    }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   📚 Deep Reader 同步服务器已启动                    ║
║                                                    ║
║   本机访问: http://localhost:${PORT}                 ║
║                                                    ║
║   其他设备访问（需在同一网络）:                        ║
║   http://[你的Mac IP]:${PORT}                        ║
║                                                    ║
║   查看 Mac IP: 系统偏好设置 > 网络                    ║
║   或运行: ipconfig getifaddr en0                    ║
║                                                    ║
║   按 Ctrl+C 停止服务器                               ║
║                                                    ║
╚════════════════════════════════════════════════════╝
    `);
});

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n服务器已停止');
    process.exit(0);
});
