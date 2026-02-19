import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// ── IndexedDB 书架持久化 ──
const IDB_NAME = 'deep-reader';
const IDB_STORE = 'books';

function openIDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

export const idbSaveBook = async (book) => {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(book);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
};

export const idbGetAllBooks = async () => {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).getAll();
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
};

export const idbDeleteBook = async (id) => {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
};

// ── 阅读进度 (localStorage，轻量) ──
export const saveReadingProgress = (bookId, cfi) => {
    try { localStorage.setItem(`dr_progress_${bookId}`, cfi); } catch {}
};

export const loadReadingProgress = (bookId) => {
    try { return localStorage.getItem(`dr_progress_${bookId}`) || null; } catch { return null; }
};

/**
 * @param {string} styleType - 'highlight' | 'underline' | 'wavy'
 * @returns {object|null} 完整记录（含 note），用于实时插入列表
 */
export const saveAnnotation = async (bookId, text, cfiRange, noteContent = '', styleType = 'highlight') => {
    try {
        const markup = await pb.collection('markups').create({
            book_id: bookId,
            cfi_range: cfiRange,
            type: styleType,
            text_excerpt: text,
        });
        let note = null;
        if (noteContent) {
            note = await pb.collection('notes').create({
                book_id: bookId,
                content: noteContent,
                markup_id: markup.id,
            });
        }
        console.log("✅ 数据落库成功");
        return { ...markup, note };
    } catch (error) {
        console.error("❌ 数据库写入失败:", error);
        return null;
    }
};

export const getMarkupsWithNotes = async (bookId) => {
    try {
        const [markupRecords, noteRecords] = await Promise.all([
            pb.collection('markups').getFullList({
                filter: `book_id = "${bookId}"`,
                sort: '-created',
            }),
            pb.collection('notes').getFullList({
                filter: `book_id = "${bookId}"`,
            }),
        ]);
        // 手动合并，避免依赖 PocketBase expand 关联字段类型
        const notesByMarkupId = {};
        noteRecords.forEach(n => { notesByMarkupId[n.markup_id] = n; });
        const result = markupRecords.map(m => ({ ...m, note: notesByMarkupId[m.id] || null }));
        console.log('拉取到的数据:', result);
        return result;
    } catch (error) {
        console.error("❌ 拉取卡片盒数据失败:", error);
        return [];
    }
};

export const getNoteByCfi = async (cfiRange) => {
    try {
        const markup = await pb.collection('markups').getFirstListItem(`cfi_range="${cfiRange}"`, {
            expand: 'notes(markup_id)',
        });
        return { markup, note: markup.expand?.['notes(markup_id)']?.[0] || null };
    } catch { return null; }
};

export const deleteMarkupById = async (markupId) => {
    try {
        const notes = await pb.collection('notes').getFullList({ filter: `markup_id = "${markupId}"` });
        for (const n of notes) await pb.collection('notes').delete(n.id);
        await pb.collection('markups').delete(markupId);
        return true;
    } catch (error) {
        console.error("❌ 删除失败:", error);
        return false;
    }
};

// 删除书籍（级联删除由 PocketBase 后台处理）
export const deleteBook = async (bookId) => {
    try {
        await pb.collection('books').delete(bookId);
        return true;
    } catch (error) {
        console.error("❌ 删除书籍失败:", error);
        return false;
    }
};
