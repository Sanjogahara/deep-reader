/**
 * ActionWidget.jsx — Sprint 19 (纯显示器)
 *
 * 根据 rightPanel.mode 渲染：
 * - 'note'：Textarea + 保存
 * - 'analyze' | 'translate'：流式 AI 输出只读区
 */

import React, { useContext, useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
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
        activeGhostCfi, setActiveGhostCfi,
    } = useContext(ReaderContext);

    const [noteText, setNoteText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [captureMenu, setCaptureMenu] = useState(null);
    const abortRef = useRef(null);
    const bottomRef = useRef(null);
    const taRef = useRef(null);

    const mode = rightPanel.mode;

    // 切换 mode 时重置
    useEffect(() => {
        if (mode === 'note') {
            setNoteText('');
            setTimeout(() => taRef.current?.focus({ preventScroll: true }), 150);
        }
        setIsGenerating(false);
    }, [mode, rightPanel.isOpen]);

    // AI 流式请求
    useEffect(() => {
        if (!aiTask || (mode !== 'analyze' && mode !== 'translate')) return;
        setAiResponse('');
        setIsGenerating(true);
        setAiLoading(true);
        // 诞生：设置幽灵高亮
        if (aiTask.cfiRange) setActiveGhostCfi(aiTask.cfiRange);
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


    const saveNote = async () => {
        if (!noteText.trim()) return;
        setIsSaving(true);
        // 固化：先移除幽灵高亮，再落库
        setActiveGhostCfi(null);
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
        closePanel();
    };

    const closePanel = () => {
        abortRef.current?.abort();
        setIsGenerating(false);
        setAiTask(null);
        setAiResponse('');
        setActiveGhostCfi(null);
        setCurrentSelection(null);
        setRightPanel({ isOpen: false, mode: null, content: '' });
    };

    const stopGeneration = () => {
        abortRef.current?.abort();
        setIsGenerating(false);
        setAiLoading(false);
        // 停止生成，保持面板开启，让用户阅读已生成内容
    };

    const handleAiTextSelect = () => {
        if (isGenerating) return;
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (!text) { setCaptureMenu(null); return; }
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        setCaptureMenu({ text, x: rect.left + rect.width / 2, y: rect.top });
    };

    const captureToNote = () => {
        setNoteText(p => p + (p ? '\n\n' : '') + '> ' + captureMenu.text + '\n\n');
        setCaptureMenu(null);
        setTimeout(() => taRef.current?.focus({ preventScroll: true }), 50);
    };

    // O(N) 切割 <think> 标签，无正则
    const hasThinkEnd = aiResponse.includes('</think>');
    const isThinking = !hasThinkEnd && aiResponse.startsWith('<think>');
    let thinkContent = '';
    let replyContent = aiResponse;
    if (hasThinkEnd) {
        const parts = aiResponse.split('</think>');
        thinkContent = parts[0].startsWith('<think>') ? parts[0].slice(7) : parts[0];
        replyContent = parts[1] || '';
    } else if (isThinking) {
        thinkContent = aiResponse.slice(7);
        replyContent = '';
    }

    const btn = {
        padding: '9px 16px', borderRadius: '10px', border: 'none',
        cursor: 'pointer', fontSize: '13px', fontWeight: '600',
        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '6px',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>

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
                        {!isThinking && (
                            <span style={{
                                padding: '2px 8px', borderRadius: '6px', fontSize: '11px',
                                fontWeight: '600',
                                background: 'var(--theme-accent-light)',
                                color: 'var(--theme-accent)',
                            }}>
                                {mode === 'translate' ? '翻译' : '解析'}
                            </span>
                        )}
                    </div>

                    <div className="ai-output" onMouseUp={handleAiTextSelect} style={{
                        flex: 1, overflowY: 'auto', minHeight: 0,
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(var(--theme-accent-rgb, 120,120,255), 0.2)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.8',
                        wordBreak: 'break-word',
                    }}>
                        {/* 思考过程 */}
                        {thinkContent && (
                            <div style={{
                                borderLeft: '2px solid rgba(var(--glass-bg-rgb), 0.3)',
                                paddingLeft: '10px', marginBottom: '12px',
                                color: 'var(--text-muted)',
                                fontSize: '11px', lineHeight: '1.7',
                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            }}>
                                {isThinking && isGenerating && (
                                    <span style={{ opacity: 0.5, display: 'block', marginBottom: '6px' }}>AI 思考中...</span>
                                )}
                                <ReactMarkdown>{thinkContent}</ReactMarkdown>
                                {isThinking && isGenerating && <span className="blink" style={{ color: 'var(--theme-accent)' }}>▋</span>}
                            </div>
                        )}
                        {/* 正式回复 */}
                        <ReactMarkdown>{replyContent}</ReactMarkdown>
                        {isGenerating && !isThinking && <span className="blink" style={{ color: 'var(--theme-accent)' }}>▋</span>}
                        <div ref={bottomRef} />
                    </div>

                    {/* 状态机按钮：生成中 → 停止；完成/停止 → 关闭 */}
                    {isGenerating ? (
                        <button onClick={stopGeneration}
                            style={{ ...btn, background: 'rgba(var(--glass-bg-rgb), 0.15)', color: 'var(--text-primary)', flexShrink: 0 }}
                        >■ 停止</button>
                    ) : (
                        <button onClick={closePanel}
                            style={{ ...btn, background: 'rgba(var(--glass-bg-rgb), 0.15)', color: 'var(--text-primary)', flexShrink: 0 }}
                        >关闭</button>
                    )}

                    {/* 常驻笔记底座 */}
                    <div style={{ borderTop: '1px solid rgba(var(--glass-bg-rgb), 0.15)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                        <textarea
                            ref={taRef}
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="提取 AI 内容或直接写下笔记…"
                            rows={3}
                            style={{
                                padding: '10px 12px', borderRadius: '10px',
                                border: '1px solid rgba(var(--glass-bg-rgb), 0.15)',
                                background: 'rgba(var(--glass-bg-rgb), 0.05)',
                                color: 'var(--text-primary)', fontSize: '12px',
                                lineHeight: '1.6', resize: 'none', outline: 'none',
                                fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
                            }}
                        />
                        <button
                            onClick={saveNote}
                            disabled={isSaving || !noteText.trim()}
                            style={{
                                ...btn, background: 'var(--theme-accent)', color: 'white',
                                opacity: (isSaving || !noteText.trim()) ? 0.5 : 1,
                                fontSize: '12px', padding: '7px 14px',
                            }}
                        >
                            {isSaving ? '保存中…' : '保存笔记'}
                        </button>
                    </div>
                </div>
            )}

            {/* 悬浮提取按钮 */}
            {captureMenu && (
                <button
                    onMouseDown={e => { e.preventDefault(); captureToNote(); }}
                    style={{
                        position: 'fixed',
                        left: captureMenu.x,
                        top: captureMenu.y - 40,
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid rgba(var(--theme-accent-rgb, 120,120,255), 0.4)',
                        background: 'rgba(20,20,30,0.85)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        color: 'var(--theme-accent)',
                        fontSize: '12px', fontWeight: '600',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        boxShadow: '0 0 12px rgba(var(--theme-accent-rgb, 120,120,255), 0.2)',
                    }}
                >✦ 提取至笔记</button>
            )}

            <style>{`
                @keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}
                .blink { animation: blink 1s step-end infinite; }
                .ai-output p { margin: 0 0 8px; }
                .ai-output p:last-child { margin-bottom: 0; }
                .ai-output h1,.ai-output h2,.ai-output h3 { font-size: 14px; font-weight: 700; margin: 12px 0 6px; }
                .ai-output code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
                .ai-output pre { background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
                .ai-output pre code { background: none; padding: 0; }
                .ai-output ul,.ai-output ol { padding-left: 18px; margin: 6px 0; }
                .ai-output li { margin: 2px 0; }
                .ai-output strong { font-weight: 700; }
                .ai-output em { font-style: italic; opacity: 0.85; }
                .ai-output blockquote { border-left: 3px solid var(--theme-accent); padding-left: 10px; margin: 8px 0; opacity: 0.8; }
            `}</style>
        </div>
    );
}
