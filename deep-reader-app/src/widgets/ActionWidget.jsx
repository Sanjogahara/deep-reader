/**
 * ActionWidget.jsx — Sprint 19 (纯显示器)
 *
 * 根据 rightPanel.mode 渲染：
 * - 'note'：Textarea + 保存
 * - 'analyze' | 'translate'：流式 AI 输出只读区
 */

import React, { useContext, useState, useEffect, useRef } from 'react';
import { ReaderContext } from '../store/ReaderContext.jsx';
import { saveAnnotation } from '../api/db.js';
import { streamAI } from '../api/ai.js';

export default function ActionWidget() {
    const {
        currentSelection, setCurrentSelection,
        renditionRef, addMarkupToList,
        aiTask, setAiTask, aiResponse, setAiResponse, aiLoading, setAiLoading,
        aiConfig,
        rightPanel, setRightPanel,
        currentBookId,
    } = useContext(ReaderContext);

    const [noteText, setNoteText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const abortRef = useRef(null);
    const scrollRef = useRef(null);
    const taRef = useRef(null);

    const mode = rightPanel.mode;

    // 切换 mode 时重置
    useEffect(() => {
        if (mode === 'note') {
            setNoteText('');
            setTimeout(() => taRef.current?.focus(), 150);
        }
        setIsGenerating(false);
    }, [mode, rightPanel.isOpen]);

    // AI 流式请求
    useEffect(() => {
        if (!aiTask || (mode !== 'analyze' && mode !== 'translate')) return;
        setAiResponse('');
        setIsGenerating(true);
        setAiLoading(true);
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        streamAI(
            aiTask.text, aiTask.type, aiConfig,
            (c) => setAiResponse(p => p + c),
            () => { setAiLoading(false); setIsGenerating(false); },
            ctrl.signal,
        ).catch(e => {
            if (e.name !== 'AbortError') setAiResponse(p => p + `\n\n❌ ${e.message}`);
            setAiLoading(false);
            setIsGenerating(false);
        });
        return () => ctrl.abort();
    }, [aiTask]);

    // 自动滚动到底部
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [aiResponse]);

    const saveNote = async () => {
        if (!noteText.trim()) return;
        setIsSaving(true);
        const text = currentSelection?.text || rightPanel.content || '';
        const cfi = currentSelection?.cfiRange;
        const rec = await saveAnnotation(currentBookId || 'hegel', text, cfi, noteText, 'highlight');
        if (rec) {
            if (renditionRef.current && cfi) {
                try { renditionRef.current.annotations.add('highlight', cfi, { id: rec.id, text, type: 'highlight' }, null, 'hl'); } catch {}
            }
            addMarkupToList(rec);
        }
        setIsSaving(false);
        setCurrentSelection(null);
        setRightPanel({ isOpen: false, mode: null, content: '' });
    };

    const closePanel = () => {
        abortRef.current?.abort();
        setIsGenerating(false);
        setAiTask(null);
        setAiResponse('');
        setCurrentSelection(null);
        setRightPanel({ isOpen: false, mode: null, content: '' });
    };

    const stopGeneration = () => {
        abortRef.current?.abort();
        setIsGenerating(false);
        setAiLoading(false);
        // 停止即关闭，合并两步为一步
        setAiTask(null);
        setAiResponse('');
        setCurrentSelection(null);
        setRightPanel({ isOpen: false, mode: null, content: '' });
    };

    const selectedText = currentSelection?.text || rightPanel.content || '';

    const btn = {
        padding: '9px 16px', borderRadius: '10px', border: 'none',
        cursor: 'pointer', fontSize: '13px', fontWeight: '600',
        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '6px',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>

            {/* 选中文本预览 */}
            {selectedText && (
                <div style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: 'rgba(var(--glass-bg-rgb), 0.1)',
                    borderLeft: '3px solid var(--theme-accent)',
                    fontSize: '13px', color: 'var(--text-secondary)',
                    lineHeight: '1.6', flexShrink: 0,
                    maxHeight: '80px', overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                }}>
                    {selectedText}
                </div>
            )}

            {/* ── 笔记模式 ── */}
            {mode === 'note' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
                    <textarea
                        ref={taRef}
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="写下你的想法..."
                        style={{
                            flex: 1, padding: '12px', borderRadius: '10px',
                            border: '1px solid rgba(0,0,0,0.1)',
                            background: 'rgba(var(--glass-bg-rgb), 0.05)',
                            color: 'var(--text-primary)', fontSize: '13px',
                            lineHeight: '1.7', resize: 'none', outline: 'none',
                            fontFamily: 'inherit',
                        }}
                    />
                    <button
                        onClick={saveNote}
                        disabled={isSaving || !noteText.trim()}
                        style={{
                            ...btn, background: 'var(--theme-accent)', color: 'white',
                            opacity: (isSaving || !noteText.trim()) ? 0.5 : 1,
                        }}
                    >
                        {isSaving ? '保存中…' : '保存笔记'}
                    </button>
                </div>
            )}

            {/* ── AI 结果模式 ── */}
            {(mode === 'analyze' || mode === 'translate') && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px', minHeight: 0 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                    }}>
                        <span style={{
                            padding: '2px 8px', borderRadius: '6px', fontSize: '11px',
                            fontWeight: '600',
                            background: 'var(--theme-accent-light)',
                            color: 'var(--theme-accent)',
                        }}>
                            {mode === 'translate' ? '翻译' : '解析'}
                        </span>
                        {aiLoading && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>生成中…</span>}
                    </div>

                    <div ref={scrollRef} style={{
                        flex: 1, overflowY: 'auto', fontSize: '14px',
                        color: 'var(--text-primary)', lineHeight: '1.8',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        padding: '4px 2px', minHeight: 0,
                    }}>
                        {aiResponse || ''}
                        {isGenerating && !aiResponse && <span style={{ color: 'var(--text-muted)' }}>思考中…</span>}
                        {isGenerating && <span style={{ animation: 'blink 1s step-end infinite', color: 'var(--theme-accent)' }}>▊</span>}
                    </div>

                    {/* 状态机按钮：生成中 → 停止；完成/停止 → 关闭 */}
                    {isGenerating ? (
                        <button onClick={stopGeneration}
                            style={{ ...btn, background: 'rgba(var(--glass-bg-rgb), 0.15)', color: 'var(--text-primary)' }}
                        >■ 停止</button>
                    ) : (
                        <button onClick={closePanel}
                            style={{ ...btn, background: 'rgba(var(--glass-bg-rgb), 0.15)', color: 'var(--text-primary)' }}
                        >关闭</button>
                    )}
                </div>
            )}

            <style>{`@keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}`}</style>
        </div>
    );
}
