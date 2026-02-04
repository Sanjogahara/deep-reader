/**
 * Deep Reader 同步服务器 (单文件版)
 * 
 * 使用方法:
 * 1. npm install express cors
 * 2. node server.js
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

// 静态文件服务（托管前端）
app.use(express.static(__dirname));

// 请求日志
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    next();
});

// ===== 工具函数 =====
function safeFileName(bookId) {
    return bookId.replace(/[<>:"/\\|?*\s]/g, '_').substring(0, 100);
}

function getBookPath(bookId) {
    return path.join(DATA_DIR, safeFileName(bookId) + '.json');
}

function readBook(bookId) {
    const filePath = getBookPath(bookId);
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) {
        console.error('读取失败:', e);
    }
    return null;
}

function writeBook(bookId, data) {
    const filePath = getBookPath(bookId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ===== API 路由 =====

// 健康检查
app.get('/ping', (req, res) => {
    res.json({ status: 'ok', time: Date.now(), version: '1.0.0' });
});

// 获取所有书籍
app.get('/api/books', (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
        const books = files.map(f => {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
                return {
                    id: data.bookId || f.replace('.json', ''),
                    title: data.bookId || f.replace('.json', ''),
                    lastSync: data.lastSync,
                    position: data.position
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean);
        
        res.json({ success: true, books });
    } catch (e) {
        res.json({ success: true, books: [] });
    }
});

// 获取单本书
app.get('/api/book/:id', (req, res) => {
    const bookId = decodeURIComponent(req.params.id);
    const data = readBook(bookId);
    res.json({ success: true, exists: !!data, data });
});

// 获取阅读位置
app.get('/api/position/:id', (req, res) => {
    const bookId = decodeURIComponent(req.params.id);
    const data = readBook(bookId);
    res.json({
        success: true,
        position: data?.position || null,
        timestamp: data?.timestamp || null
    });
});

// 保存阅读位置
app.post('/api/position', (req, res) => {
    const { bookId, position, timestamp } = req.body;
    
    if (!bookId) {
        return res.status(400).json({ success: false, error: '缺少 bookId' });
    }
    
    let data = readBook(bookId) || { bookId, annotations: {}, notes: {} };
    
    if (!data.timestamp || timestamp >= data.timestamp) {
        data.position = position;
        data.timestamp = timestamp;
        data.lastSync = new Date().toISOString();
        writeBook(bookId, data);
    }
    
    res.json({ success: true, position: data.position });
});

// 完整同步
app.post('/api/sync', (req, res) => {
    const clientData = req.body;
    
    if (!clientData.bookId) {
        return res.status(400).json({ success: false, error: '缺少 bookId' });
    }
    
    const serverData = readBook(clientData.bookId);
    
    // 合并数据
    const merged = mergeData(serverData, clientData);
    merged.lastSync = new Date().toISOString();
    
    writeBook(clientData.bookId, merged);
    
    console.log(`✅ 同步成功: ${clientData.bookId}`);
    
    res.json({
        success: true,
        data: merged,
        diff: { hasServerChanges: !!serverData }
    });
});

// 拉取数据
app.post('/api/sync/pull', (req, res) => {
    const { bookId, clientTimestamp } = req.body;
    const serverData = readBook(bookId);
    
    if (!serverData) {
        return res.json({ success: true, hasUpdates: false, data: null });
    }
    
    const hasUpdates = !clientTimestamp || serverData.timestamp > clientTimestamp;
    res.json({ success: true, hasUpdates, data: hasUpdates ? serverData : null });
});

// 推送数据
app.post('/api/sync/push', (req, res) => {
    const clientData = req.body;
    
    if (!clientData.bookId) {
        return res.status(400).json({ success: false, error: '缺少 bookId' });
    }
    
    const serverData = readBook(clientData.bookId);
    const merged = { ...serverData, ...clientData, lastSync: new Date().toISOString() };
    writeBook(clientData.bookId, merged);
    
    res.json({ success: true, timestamp: merged.timestamp });
});

// ===== 合并逻辑 =====
function mergeData(serverData, clientData) {
    if (!serverData) return { ...clientData };
    if (!clientData) return serverData;
    
    const serverTime = serverData.timestamp || 0;
    const clientTime = clientData.timestamp || 0;
    
    return {
        bookId: clientData.bookId,
        position: clientTime >= serverTime ? clientData.position : serverData.position,
        annotations: mergeObjects(serverData.annotations, clientData.annotations),
        notes: mergeObjects(serverData.notes, clientData.notes),
        timestamp: Math.max(serverTime, clientTime)
    };
}

function mergeObjects(server, client) {
    if (!server) return client || {};
    if (!client) return server;
    
    const merged = JSON.parse(JSON.stringify(server));
    
    for (const [book, chapters] of Object.entries(client)) {
        if (!merged[book]) merged[book] = {};
        
        for (const [href, items] of Object.entries(chapters)) {
            if (!merged[book][href]) merged[book][href] = [];
            
            const existingIds = new Set(merged[book][href].map(i => i.id));
            for (const item of items) {
                if (!existingIds.has(item.id)) {
                    merged[book][href].push(item);
                }
            }
        }
    }
    
    return merged;
}

// ===== 启动 =====
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   📚 Deep Reader 同步服务器已启动                      ║
║                                                       ║
║   本机: http://localhost:${PORT}                         ║
║   局域网: http://[你的IP]:${PORT}                        ║
║                                                       ║
║   查看IP: ipconfig getifaddr en0                      ║
║                                                       ║
║   按 Ctrl+C 停止                                       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
});
