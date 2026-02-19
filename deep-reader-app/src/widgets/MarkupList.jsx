/**
 * MarkupList.jsx — Sprint 19 (Tab 同步 leftPanel.activeTab)
 */

import React, { useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ReaderContext } from '../store/ReaderContext.jsx';
import { LiquidGlassCard } from './LiquidGlass.jsx';
import { getMarkupsWithNotes } from '../api/db.js';

export default function MarkupList() {
    const { markups, renditionRef, toc, deleteMarkup, leftPanel, setLeftPanel, currentBookUrl, currentBookId } = useContext(ReaderContext);
    const activeTocHref = leftPanel?.activeTocHref || null;
    const tab = leftPanel?.activeTab || 'toc';

    const [dbNotes, setDbNotes] = useState([]);

    // markups 从 ReaderEngine 恢复后同步过来
    useEffect(() => {
        if (markups?.length > 0) setDbNotes(markups);
    }, [markups]);

    const setTab = useCallback((t) => {
        setLeftPanel(p => ({ ...p, activeTab: t }));
    }, [setLeftPanel]);

    // 本地 markups 中有笔记内容的
    const thoughtNotes = useMemo(() =>
        (dbNotes.length > 0 ? dbNotes : markups).filter(item => item.note?.content?.trim()?.length > 0),
    [dbNotes, markups]);

    const jumpTo = useCallback((href, e) => {
        e?.stopPropagation?.();
        e?.preventDefault?.();
        renditionRef.current?.display(href);
    }, [renditionRef]);

    const jumpToMarkup = useCallback((cfiRange, e) => {
        e?.stopPropagation?.();
        e?.preventDefault?.();
        renditionRef.current?.display(cfiRange);
    }, [renditionRef]);

    const handleDelete = useCallback(async (markupId, cfiRange, e) => {
        e?.stopPropagation?.();
        e?.preventDefault?.();
        await deleteMarkup(markupId, cfiRange);
        // 重新加载笔记列表
        if (currentBookUrl) getMarkupsWithNotes(currentBookId || 'hegel').then(setDbNotes);
    }, [deleteMarkup, currentBookUrl]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', height: '100%' }}>
            {/* Tab 切换 */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--hover-bg)', borderRadius: '10px', padding: '4px', flexShrink: 0 }}>
                <button onClick={() => setTab('toc')} style={{
                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                    background: tab === 'toc' ? 'var(--card-bg)' : 'transparent',
                    cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
                    fontWeight: tab === 'toc' ? '600' : '400', transition: 'all 0.2s ease',
                }}>目录</button>
                <button onClick={() => setTab('notes')} style={{
                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                    background: tab === 'notes' ? 'var(--card-bg)' : 'transparent',
                    cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
                    fontWeight: tab === 'notes' ? '600' : '400', transition: 'all 0.2s ease',
                }}>笔记</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {tab === 'toc' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {toc.map((t, i) => {
                            const isActive = activeTocHref && t.href &&
                                t.href.split('#')[0] === activeTocHref.split('#')[0];
                            return (
                                <TocItem
                                    key={i} item={t} onJump={jumpTo}
                                    isActive={isActive}
                                />
                            );
                        })}
                        {toc.length === 0 && <Empty icon="📑" text="暂无目录" />}
                    </div>
                ) : (
                    thoughtNotes.length === 0
                        ? <Empty icon="💭" text="还没有笔记\n选中文本写下想法" />
                        : thoughtNotes.map(n => (
                            <NoteCard key={n.id} item={n} onJump={jumpToMarkup} onDelete={handleDelete} />
                        ))
                )}
            </div>
        </div>
    );
}

function TocItem({ item, onJump, isActive }) {
    const [isHovered, setIsHovered] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (isActive && ref.current) {
            ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [isActive]);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        e.preventDefault();
        onJump(item.href, e);
    }, [item.href, onJump]);

    return (
        <div
            ref={ref}
            onClick={handleClick}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                padding: '10px 12px',
                paddingLeft: `${12 + item.depth * 12}px`,
                fontSize: '13px', cursor: 'pointer', borderRadius: '8px',
                whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.5',
                color: isActive ? 'var(--theme-accent)' : 'var(--text-primary)',
                background: isActive ? 'rgba(var(--glass-bg-rgb), 0.4)' : isHovered ? 'var(--hover-bg)' : 'transparent',
                fontWeight: isActive ? '600' : '400',
                borderLeft: isActive ? '2px solid var(--theme-accent)' : '2px solid transparent',
                transition: 'all 0.2s ease',
            }}
        >
            {item.label}
        </div>
    );
}

function getChapterFromCfi(cfi, toc) {
    if (!cfi || !toc?.length) return null;
    const match = cfi.match(/\[([^\]]+)\]/);
    if (!match) return null;
    const spineId = match[1];
    const found = toc.find(t => t.href && t.href.split('#')[0].includes(spineId));
    return found?.label || null;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function NoteCard({ item, onJump, onDelete }) {
    const [isHovered, setIsHovered] = useState(false);
    const { toc } = useContext(ReaderContext);
    const cfi = item.markup?.cfi_range || item.cfi_range;
    const noteContent = item.note?.content || '';
    const chapter = getChapterFromCfi(cfi, toc);
    const date = formatDate(item.created);

    return (
        <LiquidGlassCard
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ marginBottom: '8px', padding: '12px', borderRadius: '10px', cursor: 'pointer', position: 'relative' }}
            onClick={(e) => onJump(cfi, e)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                {chapter && (
                    <span style={{ fontSize: '11px', color: 'var(--theme-accent)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                        {chapter}
                    </span>
                )}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>{date}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                {noteContent}
            </div>
            <button
                onClick={(e) => onDelete(item.id, cfi, e)}
                style={{
                    background: 'transparent', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    padding: '4px', borderRadius: '4px',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.15s ease', fontSize: '14px',
                    position: 'absolute', top: '8px', right: '8px',
                }}
            >🗑️</button>
        </LiquidGlassCard>
    );
}

function Empty({ icon, text }) {
    return (
        <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.6 }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
            <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                {text.split('\\n').map((line, i, arr) => (
                    <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
                ))}
            </div>
        </div>
    );
}
