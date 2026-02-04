/**
 * Deep Reader v5 - 哲学阅读器
 * 模块化重构版本
 */

// ===== 全局状态 =====
let book = null;
let rendition = null;
let currentHref = null;
let bookStructure = [];
let bookId = null;

// 数据存储
let annotations = {};  // 高亮、下划线、波浪线（纯视觉标记）
let notes = {};        // 批注（带文字内容，会生成书签）

// 当前选中
let currentSelection = null;
let currentAnnotationCfi = null; // 用于删除标注

// 设置
const settings = {
    fontSize: 17,
    lineHeight: 1.8,
    readMode: 'paginated', // 'paginated' | 'scrolled'
    ollamaUrl: 'http://localhost:11434',
    aiModel: 'deepseek-r1:8b',
    syncUrl: ''
};

// ===== DOM 元素 =====
const $ = id => document.getElementById(id);
const el = {
    sidebarLeft: $('sidebar-left'),
    sidebarRight: $('sidebar-right'),
    bookmarkList: $('bookmark-list'),
    noteList: $('note-list'),
    welcome: $('welcome'),
    loading: $('loading'),
    loadingText: $('loading-text'),
    reader: $('reader'),
    navInfo: $('nav-info'),
    contextMenu: $('context-menu'),
    deleteMenu: $('delete-menu'),
    noteModal: $('note-modal'),
    notePreview: $('note-preview'),
    noteInput: $('note-input'),
    settingsPanel: $('settings-panel'),
    aiPanel: $('ai-panel'),
    aiModeLabel: $('ai-mode-label'),
    aiContent: $('ai-content'),
    exportModal: $('export-modal'),
    syncDot: $('sync-dot'),
    syncText: $('sync-text')
};

// ===== 初始化 =====
function init() {
    loadSettings();
    loadData();
    bindEvents();
    checkAI();
    checkSync();
    
    // 默认收起侧边栏
    el.sidebarLeft.classList.add('collapsed');
    el.sidebarRight.classList.add('collapsed');
}

// ===== 设置管理 =====
function loadSettings() {
    const s = localStorage.getItem('dr_settings');
    if (s) Object.assign(settings, JSON.parse(s));
    applySettingsUI();
}

function saveSettings() {
    localStorage.setItem('dr_settings', JSON.stringify(settings));
}

function applySettingsUI() {
    $('font-size').value = settings.fontSize;
    $('font-size-val').textContent = settings.fontSize + 'px';
    $('line-height').value = settings.lineHeight;
    $('line-height-val').textContent = settings.lineHeight;
    $('read-mode').value = settings.readMode;
    $('ollama-url').value = settings.ollamaUrl;
    $('ai-model').value = settings.aiModel;
    $('sync-url').value = settings.syncUrl || '';
}

// ===== 数据管理 =====
function loadData() {
    const a = localStorage.getItem('dr_annotations');
    const n = localStorage.getItem('dr_notes');
    if (a) annotations = JSON.parse(a);
    if (n) notes = JSON.parse(n);
}

function saveData() {
    localStorage.setItem('dr_annotations', JSON.stringify(annotations));
    localStorage.setItem('dr_notes', JSON.stringify(notes));
    syncToServer();
}

// ===== 事件绑定 =====
function bindEvents() {
    // 文件上传
    $('upload-zone').onclick = () => $('file-input').click();
    $('file-input').onchange = e => e.target.files[0] && loadBook(e.target.files[0]);
    $('open-file').onclick = () => $('file-input').click();

    // 拖拽上传
    const zone = $('upload-zone');
    zone.ondragover = e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; };
    zone.ondragleave = () => zone.style.borderColor = '';
    zone.ondrop = e => {
        e.preventDefault();
        zone.style.borderColor = '';
        const f = e.dataTransfer.files[0];
        if (f?.name.endsWith('.epub')) loadBook(f);
    };

    // 导航
    $('prev-btn').onclick = () => navigate(-1);
    $('next-btn').onclick = () => navigate(1);

    // 键盘导航
    document.addEventListener('keydown', e => {
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
        if (e.key === 'ArrowLeft') navigate(-1);
        else if (e.key === 'ArrowRight') navigate(1);
        else if (e.key === 'Escape') hideAllPanels();
    });

    // 侧边栏切换
    $('toggle-left').onclick = () => el.sidebarLeft.classList.toggle('collapsed');
    $('toggle-right').onclick = () => el.sidebarRight.classList.toggle('collapsed');
    $('close-left').onclick = () => el.sidebarLeft.classList.add('collapsed');
    $('close-right').onclick = () => el.sidebarRight.classList.add('collapsed');

    // 设置面板
    $('settings-btn').onclick = e => {
        e.stopPropagation();
        el.settingsPanel.classList.toggle('show');
    };
    $('close-settings').onclick = () => el.settingsPanel.classList.remove('show');

    // 设置实时响应
    $('font-size').oninput = e => {
        settings.fontSize = parseInt(e.target.value);
        $('font-size-val').textContent = settings.fontSize + 'px';
        applyReaderStyle();
        saveSettings();
    };

    $('line-height').oninput = e => {
        settings.lineHeight = parseFloat(e.target.value);
        $('line-height-val').textContent = settings.lineHeight;
        applyReaderStyle();
        saveSettings();
    };

    $('read-mode').onchange = e => {
        settings.readMode = e.target.value;
        saveSettings();
        if (book) reloadRendition();
    };

    $('ollama-url').onchange = e => {
        settings.ollamaUrl = e.target.value;
        saveSettings();
        checkAI();
    };

    $('ai-model').onchange = e => {
        settings.aiModel = e.target.value;
        saveSettings();
    };

    $('sync-url').onchange = e => {
        settings.syncUrl = e.target.value;
        saveSettings();
        checkSync();
    };

    // 右键菜单
    el.contextMenu.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => {
            handleContextAction(btn.dataset.action);
            hideContextMenu();
        };
    });

    el.deleteMenu.querySelector('button').onclick = () => {
        deleteAnnotation();
        hideDeleteMenu();
    };

    // 批注模态框
    $('cancel-note').onclick = () => el.noteModal.classList.remove('show');
    $('save-note').onclick = saveNote;

    // AI 面板
    $('close-ai').onclick = () => el.aiPanel.classList.remove('show');

    // 导出
    $('export-btn').onclick = () => {
        updateExportSelect();
        el.exportModal.classList.add('show');
    };
    $('close-export').onclick = () => el.exportModal.classList.remove('show');
    el.exportModal.onclick = e => {
        if (e.target === el.exportModal) el.exportModal.classList.remove('show');
    };
    document.querySelectorAll('.export-opt').forEach(o => {
        o.onclick = () => doExport(o.dataset.fmt);
    });

    // 点击外部关闭菜单/面板
    document.addEventListener('click', e => {
        if (!el.contextMenu.contains(e.target)) hideContextMenu();
        if (!el.deleteMenu.contains(e.target)) hideDeleteMenu();
        if (!el.settingsPanel.contains(e.target) && e.target.id !== 'settings-btn') {
            el.settingsPanel.classList.remove('show');
        }
    });

    // 阻止右键默认菜单
    document.addEventListener('contextmenu', e => {
        // 允许输入框右键
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
        e.preventDefault();
    });
}

function hideAllPanels() {
    el.settingsPanel.classList.remove('show');
    el.aiPanel.classList.remove('show');
    hideContextMenu();
    hideDeleteMenu();
}

// ===== 书籍加载 =====
function showLoading(text) {
    el.loading.classList.add('show');
    el.loadingText.textContent = text;
}

function hideLoading() {
    el.loading.classList.remove('show');
}

async function loadBook(file) {
    try {
        el.welcome.style.display = 'none';
        showLoading('解析书籍...');

        if (book) {
            book.destroy();
            book = null;
            rendition = null;
        }

        const buf = await file.arrayBuffer();
        book = ePub(buf);
        await book.ready;

        const meta = book.packaging.metadata;
        bookId = meta.title || file.name;
        document.title = bookId + ' - Deep Reader';

        showLoading('加载内容...');
        await book.loaded.navigation;
        await book.loaded.spine;

        // 解析目录结构
        const nav = await book.loaded.navigation;
        bookStructure = parseStructure(nav.toc);

        // 渲染
        await initRendition();

        // 恢复位置
        const savedHref = localStorage.getItem('dr_pos_' + bookId);
        const serverPos = await getServerPosition();
        const startHref = serverPos || savedHref || book.spine.items[0]?.href;

        if (startHref) {
            await rendition.display(startHref);
            currentHref = startHref;
        } else {
            await rendition.display();
        }

        // 更新UI
        updateBookmarkList();
        updateNoteList();
        updateNavInfo();

        hideLoading();

    } catch (err) {
        console.error(err);
        hideLoading();
        alert('加载失败: ' + err.message);
        el.welcome.style.display = 'flex';
    }
}

async function initRendition() {
    el.reader.innerHTML = '';

    rendition = book.renderTo(el.reader, {
        width: '100%',
        height: '100%',
        spread: 'none',
        flow: settings.readMode === 'scrolled' ? 'scrolled-doc' : 'paginated',
        manager: settings.readMode === 'scrolled' ? 'continuous' : 'default'
    });

    // 注册样式
    rendition.themes.register('default', getReaderStyles());
    rendition.themes.select('default');
    rendition.themes.fontSize(settings.fontSize + 'px');

    // 事件监听
    rendition.on('relocated', loc => {
        if (loc.start?.href) {
            currentHref = loc.start.href;
            updateNavInfo();
            localStorage.setItem('dr_pos_' + bookId, currentHref);
            savePositionToServer();
        }
    });

    // 右键选择
    rendition.on('selected', handleSelection);

    // 应用已有标注
    applyAllAnnotations();
}

async function reloadRendition() {
    if (!book) return;
    const href = currentHref;
    await initRendition();
    if (href) await rendition.display(href);
}

function parseStructure(toc) {
    const books = [];
    toc.forEach(item => {
        if (item.subitems?.length > 0) {
            books.push({
                title: item.label?.trim() || '(未命名)',
                href: item.href,
                chapters: flattenChapters(item.subitems, 1)
            });
        } else {
            const label = item.label?.trim() || '';
            if (label === '总目录' || label === '封面') return;
            if (books.length === 0) {
                books.push({ title: '目录', href: item.href, chapters: [] });
            }
            books[books.length - 1].chapters.push({
                title: label || '(无标题)',
                href: item.href,
                level: 1
            });
        }
    });
    return books;
}

function flattenChapters(items, level) {
    const res = [];
    items.forEach(item => {
        res.push({ title: item.label?.trim() || '(无标题)', href: item.href, level });
        if (item.subitems?.length) {
            res.push(...flattenChapters(item.subitems, Math.min(level + 1, 3)));
        }
    });
    return res;
}

function getReaderStyles() {
    return {
        'body': {
            'font-family': "'Noto Serif SC', serif !important",
            'padding': '32px 48px !important',
            'line-height': settings.lineHeight + ' !important',
            'color': '#1a1a1a !important'
        },
        'p': {
            'text-indent': '2em !important',
            'margin': '0 0 0.8em 0 !important',
            'text-align': 'justify !important'
        },
        'h1,h2,h3,h4,h5,h6': {
            'text-indent': '0 !important',
            'font-weight': '600 !important',
            'margin': '1em 0 0.5em 0 !important'
        },
        // 标注样式 - 修复：下划线和波浪线使用正确的text-decoration
        '.dr-highlight': {
            'background-color': 'rgba(255, 235, 59, 0.5) !important'
        },
        '.dr-underline': {
            'text-decoration': 'underline !important',
            'text-decoration-color': '#8b4513 !important',
            'text-decoration-thickness': '2px !important',
            'text-underline-offset': '3px !important'
        },
        '.dr-wavy': {
            'text-decoration': 'underline wavy #e91e63 !important',
            'text-underline-offset': '3px !important'
        }
    };
}

function applyReaderStyle() {
    if (!rendition) return;
    rendition.themes.register('default', getReaderStyles());
    rendition.themes.select('default');
    rendition.themes.fontSize(settings.fontSize + 'px');
}

// ===== 导航 =====
function navigate(delta) {
    if (!book || !rendition) return;
    if (delta < 0) rendition.prev();
    else rendition.next();
}

function updateNavInfo() {
    if (!book || !currentHref) {
        el.navInfo.textContent = '- / -';
        return;
    }
    const idx = book.spine.items.findIndex(i => 
        i.href === currentHref || currentHref.startsWith(i.href.split('#')[0])
    );
    el.navInfo.textContent = idx >= 0 ? `${idx + 1} / ${book.spine.items.length}` : '- / -';
}

// ===== 文本选择与右键菜单 =====
function handleSelection(cfiRange, contents) {
    const sel = contents.window.getSelection();
    const text = sel.toString().trim();
    if (!text) return;

    currentSelection = { text, cfiRange, contents };

    // 监听右键
    contents.document.addEventListener('contextmenu', e => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, contents);
    }, { once: true });
}

function showContextMenu(x, y, contents) {
    // 计算iframe偏移
    const iframe = el.reader.querySelector('iframe');
    const rect = iframe?.getBoundingClientRect() || { left: 0, top: 0 };
    
    el.contextMenu.style.left = (x + rect.left) + 'px';
    el.contextMenu.style.top = (y + rect.top) + 'px';
    el.contextMenu.classList.add('show');
}

function hideContextMenu() {
    el.contextMenu.classList.remove('show');
}

function showDeleteMenu(x, y) {
    el.deleteMenu.style.left = x + 'px';
    el.deleteMenu.style.top = y + 'px';
    el.deleteMenu.classList.add('show');
}

function hideDeleteMenu() {
    el.deleteMenu.classList.remove('show');
}

// ===== 右键菜单操作 =====
function handleContextAction(action) {
    if (!currentSelection) return;

    switch (action) {
        case 'highlight':
            addAnnotation('highlight');
            break;
        case 'underline':
            addAnnotation('underline');
            break;
        case 'wavy':
            addAnnotation('wavy');
            break;
        case 'note':
            showNoteModal();
            break;
        case 'translate':
            runAI('translate');
            break;
        case 'analyze':
            runAI('analyze');
            break;
    }
}

// ===== 标注管理 =====
function addAnnotation(type) {
    if (!currentSelection || !book) return;

    const bookTitle = getCurrentBookTitle();
    if (!annotations[bookTitle]) annotations[bookTitle] = {};
    if (!annotations[bookTitle][currentHref]) annotations[bookTitle][currentHref] = [];

    const anno = {
        id: Date.now().toString(),
        type,
        text: currentSelection.text,
        cfiRange: currentSelection.cfiRange,
        timestamp: new Date().toISOString()
    };

    annotations[bookTitle][currentHref].push(anno);
    saveData();

    // 应用样式
    applyAnnotationStyle(anno);

    currentSelection = null;
}

function applyAnnotationStyle(anno) {
    if (!rendition || !anno.cfiRange) return;

    const classMap = {
        'highlight': 'dr-highlight',
        'underline': 'dr-underline',
        'wavy': 'dr-wavy'
    };

    const cls = classMap[anno.type];
    if (cls) {
        try {
            rendition.annotations.add('highlight', anno.cfiRange, {
                id: anno.id
            }, (e) => {
                // 右键删除
                e.addEventListener('contextmenu', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    currentAnnotationCfi = anno.cfiRange;
                    showDeleteMenu(evt.clientX, evt.clientY);
                });
            }, cls);
        } catch (e) {
            console.warn('应用标注失败:', e);
        }
    }
}

function applyAllAnnotations() {
    // 应用所有纯标注
    for (const [bookTitle, chapters] of Object.entries(annotations)) {
        for (const items of Object.values(chapters)) {
            items.forEach(anno => applyAnnotationStyle(anno));
        }
    }
    
    // 应用所有批注的高亮
    for (const [bookTitle, chapters] of Object.entries(notes)) {
        for (const items of Object.values(chapters)) {
            items.forEach(note => {
                if (note.cfiRange) {
                    try {
                        rendition.annotations.add('highlight', note.cfiRange, {
                            id: note.id
                        }, null, 'dr-highlight');
                    } catch (e) {}
                }
            });
        }
    }
}

function deleteAnnotation() {
    if (!currentAnnotationCfi || !rendition) return;

    // 从数据中删除
    for (const [bookTitle, chapters] of Object.entries(annotations)) {
        for (const [href, items] of Object.entries(chapters)) {
            const idx = items.findIndex(a => a.cfiRange === currentAnnotationCfi);
            if (idx >= 0) {
                items.splice(idx, 1);
                if (items.length === 0) delete chapters[href];
                break;
            }
        }
    }

    // 移除视觉样式
    try {
        rendition.annotations.remove(currentAnnotationCfi, 'highlight');
    } catch (e) {}

    saveData();
    currentAnnotationCfi = null;
}

// ===== 批注管理 =====
function showNoteModal() {
    if (!currentSelection) return;
    
    el.notePreview.textContent = currentSelection.text.substring(0, 150) + 
        (currentSelection.text.length > 150 ? '...' : '');
    el.noteInput.value = '';
    el.noteModal.classList.add('show');
    el.noteInput.focus();
}

function saveNote() {
    const noteText = el.noteInput.value.trim();
    if (!noteText) {
        alert('请输入批注内容');
        return;
    }

    if (!currentSelection || !book) return;

    const bookTitle = getCurrentBookTitle();
    if (!notes[bookTitle]) notes[bookTitle] = {};
    if (!notes[bookTitle][currentHref]) notes[bookTitle][currentHref] = [];

    const note = {
        id: Date.now().toString(),
        text: currentSelection.text,
        note: noteText,
        cfiRange: currentSelection.cfiRange,
        timestamp: new Date().toISOString()
    };

    notes[bookTitle][currentHref].push(note);
    saveData();

    // 应用高亮样式
    if (note.cfiRange) {
        try {
            rendition.annotations.add('highlight', note.cfiRange, { id: note.id }, null, 'dr-highlight');
        } catch (e) {}
    }

    // 更新UI
    updateBookmarkList();
    updateNoteList();

    el.noteModal.classList.remove('show');
    currentSelection = null;
}

function getCurrentBookTitle() {
    for (const bk of bookStructure) {
        if (bk.href === currentHref || 
            bk.chapters.some(ch => ch.href === currentHref || currentHref?.includes(ch.href.split('#')[0]))) {
            return bk.title;
        }
    }
    return bookStructure[0]?.title || '未知';
}

// ===== 书签列表（左侧栏） =====
function updateBookmarkList() {
    el.bookmarkList.innerHTML = '';

    let hasBookmarks = false;

    for (const [bookTitle, chapters] of Object.entries(notes)) {
        for (const [href, items] of Object.entries(chapters)) {
            items.forEach(note => {
                hasBookmarks = true;

                const div = document.createElement('div');
                div.className = 'bookmark-item';
                div.innerHTML = `
                    <div class="bm-title">${bookTitle}</div>
                    <div class="bm-text">${note.text}</div>
                    <div class="bm-time">${new Date(note.timestamp).toLocaleString()}</div>
                `;
                div.onclick = () => gotoNote(note.cfiRange, href);
                el.bookmarkList.appendChild(div);
            });
        }
    }

    if (!hasBookmarks) {
        el.bookmarkList.innerHTML = '<div class="empty-hint">暂无书签<br><small>添加批注后自动生成</small></div>';
    }
}

// ===== 批注列表（右侧栏） =====
function updateNoteList() {
    el.noteList.innerHTML = '';

    let hasNotes = false;

    for (const [bookTitle, chapters] of Object.entries(notes)) {
        for (const [href, items] of Object.entries(chapters)) {
            items.forEach(note => {
                hasNotes = true;

                const div = document.createElement('div');
                div.className = 'note-card';
                div.innerHTML = `
                    <div class="nc-text">${note.text.substring(0, 100)}${note.text.length > 100 ? '...' : ''}</div>
                    <div class="nc-note">${note.note}</div>
                    <div class="nc-time">${new Date(note.timestamp).toLocaleString()}</div>
                `;
                div.onclick = () => gotoNote(note.cfiRange, href);
                el.noteList.appendChild(div);
            });
        }
    }

    if (!hasNotes) {
        el.noteList.innerHTML = '<div class="empty-hint">暂无批注<br><small>选中文本右键添加</small></div>';
    }
}

async function gotoNote(cfiRange, href) {
    try {
        if (cfiRange) {
            await rendition.display(cfiRange);
        } else if (href) {
            await rendition.display(href);
        }
    } catch (e) {
        console.error('跳转失败:', e);
    }
}

// ===== AI 分析 =====
async function runAI(mode) {
    if (!currentSelection) return;

    const text = currentSelection.text;
    el.aiPanel.classList.add('show');

    // 判断模式
    const isTranslate = mode === 'translate' || text.length < 200;
    el.aiModeLabel.textContent = isTranslate ? '🌐 翻译' : '🔍 深度分析';

    el.aiContent.innerHTML = '<div class="ai-loading"><div class="spinner"></div>分析中...</div>';

    // 根据模式选择 prompt
    let systemPrompt, userPrompt;

    if (isTranslate && mode === 'translate') {
        // 翻译模式 - 极速响应
        systemPrompt = '你是一个专业的翻译引擎。请直接将用户发送的文本翻译成通顺的中文，不要进行任何分析、思考或解释，直接输出译文。速度第一。';
        userPrompt = text;
    } else {
        // 深度分析模式
        systemPrompt = '你是精通黑格尔哲学和德国古典哲学的学者。';
        userPrompt = `请分析以下文本：

"""
${text}
"""

简洁解读：核心概念、论证结构、通俗解释。用中文回答。`;
    }

    try {
        const res = await fetch(settings.ollamaUrl + '/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.aiModel,
                system: systemPrompt,
                prompt: userPrompt,
                stream: true
            })
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let result = '';

        el.aiContent.innerHTML = '<div class="ai-response"></div>';
        const out = el.aiContent.querySelector('.ai-response');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of decoder.decode(value).split('\n').filter(l => l.trim())) {
                try {
                    const j = JSON.parse(line);
                    if (j.response) {
                        result += j.response;
                        out.innerHTML = formatAIResponse(result);
                        el.aiContent.scrollTop = el.aiContent.scrollHeight;
                    }
                } catch {}
            }
        }
    } catch (err) {
        el.aiContent.innerHTML = `<div class="ai-placeholder" style="color:#c00;">失败: ${err.message}</div>`;
    }
}

function formatAIResponse(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
}

async function checkAI() {
    const dot = el.aiPanel.querySelector('.ai-status') || document.createElement('span');
    try {
        const r = await fetch(settings.ollamaUrl + '/api/tags', { signal: AbortSignal.timeout(2000) });
        // AI 在线
    } catch {
        // AI 离线
    }
}

// ===== 同步 =====
async function checkSync() {
    if (!settings.syncUrl) {
        el.syncDot.classList.add('offline');
        el.syncText.textContent = '本地';
        return;
    }

    try {
        const r = await fetch(settings.syncUrl + '/ping', { signal: AbortSignal.timeout(2000) });
        if (r.ok) {
            el.syncDot.classList.remove('offline');
            el.syncText.textContent = '已连接';
        } else {
            throw new Error();
        }
    } catch {
        el.syncDot.classList.add('offline');
        el.syncText.textContent = '离线';
    }
}

async function syncToServer() {
    if (!settings.syncUrl || !bookId) return;

    el.syncDot.classList.add('syncing');

    try {
        await fetch(settings.syncUrl + '/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookId,
                position: currentHref,
                annotations,
                notes,
                timestamp: Date.now()
            })
        });
    } catch {}

    el.syncDot.classList.remove('syncing');
}

async function getServerPosition() {
    if (!settings.syncUrl || !bookId) return null;

    try {
        const r = await fetch(settings.syncUrl + '/position/' + encodeURIComponent(bookId));
        if (r.ok) {
            const data = await r.json();
            // 合并服务器数据
            if (data.annotations) annotations = { ...annotations, ...data.annotations };
            if (data.notes) notes = { ...notes, ...data.notes };
            return data.position;
        }
    } catch {}
    return null;
}

async function savePositionToServer() {
    if (!settings.syncUrl || !bookId) return;

    try {
        await fetch(settings.syncUrl + '/position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, position: currentHref, timestamp: Date.now() })
        });
    } catch {}
}

// ===== 导出 =====
function updateExportSelect() {
    const sel = $('export-book');
    sel.innerHTML = '<option value="all">全部</option>';
    Object.keys(notes).forEach(bk => {
        const opt = document.createElement('option');
        opt.value = bk;
        opt.textContent = bk;
        sel.appendChild(opt);
    });
}

function doExport(fmt) {
    const selected = $('export-book').value;
    let data = {};

    if (selected === 'all') data = notes;
    else if (notes[selected]) data[selected] = notes[selected];

    if (!Object.keys(data).length) {
        alert('没有可导出的批注');
        return;
    }

    if (fmt === 'json') {
        download(JSON.stringify({ annotations, notes }, null, 2), 'deep-reader-export.json', 'application/json');
    } else if (fmt === 'md') {
        download(toMarkdown(data), 'annotations.md', 'text/markdown');
    } else if (fmt === 'pdf') {
        toPDF(data);
    }

    el.exportModal.classList.remove('show');
}

function toMarkdown(data) {
    let md = '# 阅读批注\n\n';
    for (const [bk, chs] of Object.entries(data)) {
        md += `## 📚 ${bk}\n\n`;
        const all = [];
        for (const items of Object.values(chs)) all.push(...items);
        all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        all.forEach((n, i) => {
            md += `### ${i + 1}.\n\n> ${n.text}\n\n**批注:** ${n.note}\n\n*${new Date(n.timestamp).toLocaleString()}*\n\n---\n\n`;
        });
    }
    return md;
}

function toPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text('Reading Annotations', 20, y);
    y += 15;

    for (const [bk, chs] of Object.entries(data)) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.text(bk, 20, y);
        y += 10;

        const all = [];
        for (const items of Object.values(chs)) all.push(...items);

        doc.setFontSize(10);
        all.forEach((n, i) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`${i + 1}.`, 20, y);
            y += 6;

            const lines = doc.splitTextToSize(n.text, 160);
            lines.forEach(l => {
                if (y > 280) { doc.addPage(); y = 20; }
                doc.text(l, 25, y);
                y += 5;
            });

            if (n.note) {
                const nl = doc.splitTextToSize('Note: ' + n.note, 150);
                nl.forEach(l => {
                    if (y > 280) { doc.addPage(); y = 20; }
                    doc.text(l, 30, y);
                    y += 5;
                });
            }
            y += 5;
        });
        y += 10;
    }

    doc.save('annotations.pdf');
}

function download(content, name, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== 启动 =====
init();
