/**
 * Deep Reader 同步模块
 * 负责与服务器的数据同步
 */

const SyncManager = (function() {
    
    // 同步状态
    let isOnline = false;
    let isSyncing = false;
    let lastSyncTime = null;
    let syncQueue = [];
    
    // 配置
    let serverUrl = '';
    
    // UI 元素
    let syncDot = null;
    let syncText = null;
    
    /**
     * 初始化同步管理器
     */
    function init(options = {}) {
        serverUrl = options.serverUrl || '';
        syncDot = options.syncDot || document.getElementById('sync-dot');
        syncText = options.syncText || document.getElementById('sync-text');
        
        if (serverUrl) {
            checkConnection();
            // 每30秒检查一次连接
            setInterval(checkConnection, 30000);
        } else {
            updateUI('offline');
        }
    }
    
    /**
     * 设置服务器地址
     */
    function setServerUrl(url) {
        serverUrl = url;
        if (url) {
            checkConnection();
        } else {
            updateUI('offline');
        }
    }
    
    /**
     * 检查服务器连接
     */
    async function checkConnection() {
        if (!serverUrl) {
            isOnline = false;
            updateUI('offline');
            return false;
        }
        
        try {
            const res = await fetch(serverUrl + '/ping', {
                signal: AbortSignal.timeout(3000)
            });
            
            if (res.ok) {
                const data = await res.json();
                isOnline = data.status === 'ok';
                updateUI(isOnline ? 'online' : 'offline');
                return isOnline;
            }
        } catch (err) {
            console.warn('同步服务器连接失败:', err.message);
        }
        
        isOnline = false;
        updateUI('offline');
        return false;
    }
    
    /**
     * 更新 UI 状态
     */
    function updateUI(status) {
        if (!syncDot || !syncText) return;
        
        syncDot.classList.remove('offline', 'syncing');
        
        switch (status) {
            case 'online':
                syncText.textContent = '已连接';
                break;
            case 'offline':
                syncDot.classList.add('offline');
                syncText.textContent = '本地';
                break;
            case 'syncing':
                syncDot.classList.add('syncing');
                syncText.textContent = '同步中...';
                break;
            case 'error':
                syncDot.classList.add('offline');
                syncText.textContent = '同步失败';
                break;
        }
    }
    
    /**
     * 完整同步（双向）
     */
    async function fullSync(bookId, localData) {
        if (!serverUrl || !bookId) return { success: false, error: '未配置服务器' };
        if (isSyncing) return { success: false, error: '正在同步中' };
        
        isSyncing = true;
        updateUI('syncing');
        
        try {
            const res = await fetch(serverUrl + '/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId,
                    position: localData.position,
                    annotations: localData.annotations,
                    notes: localData.notes,
                    timestamp: Date.now()
                })
            });
            
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            
            const result = await res.json();
            
            if (result.success) {
                lastSyncTime = Date.now();
                updateUI('online');
                console.log('✅ 同步成功');
                
                return {
                    success: true,
                    data: result.data,
                    hasServerChanges: result.diff?.hasServerChanges
                };
            } else {
                throw new Error(result.error || '同步失败');
            }
            
        } catch (err) {
            console.error('同步失败:', err);
            updateUI('error');
            
            // 加入重试队列
            addToQueue({ type: 'fullSync', bookId, localData });
            
            return { success: false, error: err.message };
        } finally {
            isSyncing = false;
        }
    }
    
    /**
     * 保存阅读位置（轻量级）
     */
    async function savePosition(bookId, position) {
        if (!serverUrl || !bookId) return;
        if (!isOnline) {
            // 离线时加入队列
            addToQueue({ type: 'position', bookId, position });
            return;
        }
        
        try {
            await fetch(serverUrl + '/api/position', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId,
                    position,
                    timestamp: Date.now()
                })
            });
        } catch (err) {
            console.warn('保存位置失败:', err.message);
            addToQueue({ type: 'position', bookId, position });
        }
    }
    
    /**
     * 获取服务器位置
     */
    async function getPosition(bookId) {
        if (!serverUrl || !bookId) return null;
        
        try {
            const res = await fetch(serverUrl + '/api/position/' + encodeURIComponent(bookId));
            if (res.ok) {
                const data = await res.json();
                return data.success ? data.position : null;
            }
        } catch (err) {
            console.warn('获取位置失败:', err.message);
        }
        
        return null;
    }
    
    /**
     * 拉取服务器数据
     */
    async function pull(bookId, clientTimestamp = 0) {
        if (!serverUrl || !bookId) return null;
        
        try {
            const res = await fetch(serverUrl + '/api/sync/pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, clientTimestamp })
            });
            
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.hasUpdates) {
                    return result.data;
                }
            }
        } catch (err) {
            console.warn('拉取失败:', err.message);
        }
        
        return null;
    }
    
    /**
     * 推送到服务器
     */
    async function push(bookId, data) {
        if (!serverUrl || !bookId) return false;
        
        try {
            const res = await fetch(serverUrl + '/api/sync/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId,
                    ...data,
                    timestamp: Date.now()
                })
            });
            
            if (res.ok) {
                const result = await res.json();
                return result.success;
            }
        } catch (err) {
            console.warn('推送失败:', err.message);
        }
        
        return false;
    }
    
    /**
     * 获取书籍列表
     */
    async function getBooks() {
        if (!serverUrl) return [];
        
        try {
            const res = await fetch(serverUrl + '/api/books');
            if (res.ok) {
                const result = await res.json();
                return result.success ? result.books : [];
            }
        } catch (err) {
            console.warn('获取书籍列表失败:', err.message);
        }
        
        return [];
    }
    
    /**
     * 获取单本书数据
     */
    async function getBook(bookId) {
        if (!serverUrl || !bookId) return null;
        
        try {
            const res = await fetch(serverUrl + '/api/book/' + encodeURIComponent(bookId));
            if (res.ok) {
                const result = await res.json();
                return result.success && result.exists ? result.data : null;
            }
        } catch (err) {
            console.warn('获取书籍数据失败:', err.message);
        }
        
        return null;
    }
    
    /**
     * 添加到同步队列
     */
    function addToQueue(item) {
        // 去重
        const existing = syncQueue.findIndex(q => 
            q.type === item.type && q.bookId === item.bookId
        );
        
        if (existing >= 0) {
            syncQueue[existing] = item;
        } else {
            syncQueue.push(item);
        }
        
        // 存储到 localStorage
        localStorage.setItem('dr_sync_queue', JSON.stringify(syncQueue));
    }
    
    /**
     * 处理同步队列
     */
    async function processQueue() {
        if (!isOnline || syncQueue.length === 0) return;
        
        const queue = [...syncQueue];
        syncQueue = [];
        
        for (const item of queue) {
            try {
                if (item.type === 'position') {
                    await savePosition(item.bookId, item.position);
                } else if (item.type === 'fullSync') {
                    await fullSync(item.bookId, item.localData);
                }
            } catch (err) {
                // 失败则重新加入队列
                addToQueue(item);
            }
        }
        
        localStorage.setItem('dr_sync_queue', JSON.stringify(syncQueue));
    }
    
    /**
     * 加载离线队列
     */
    function loadQueue() {
        try {
            const saved = localStorage.getItem('dr_sync_queue');
            if (saved) {
                syncQueue = JSON.parse(saved);
            }
        } catch (e) {
            syncQueue = [];
        }
    }
    
    // 初始化时加载队列
    loadQueue();
    
    // 在线时处理队列
    window.addEventListener('online', () => {
        checkConnection().then(online => {
            if (online) processQueue();
        });
    });
    
    // 公开 API
    return {
        init,
        setServerUrl,
        checkConnection,
        fullSync,
        savePosition,
        getPosition,
        pull,
        push,
        getBooks,
        getBook,
        processQueue,
        
        // 状态
        get isOnline() { return isOnline; },
        get isSyncing() { return isSyncing; },
        get lastSyncTime() { return lastSyncTime; }
    };
    
})();

// 如果作为模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncManager;
}
