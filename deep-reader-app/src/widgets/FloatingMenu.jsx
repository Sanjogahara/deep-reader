import React, { useContext, useRef, useEffect, useState } from 'react';
import { ReaderContext } from '../store/ReaderContext.jsx';
import { saveAnnotation } from '../api/db.js';
import LiquidGlass from './LiquidGlass.jsx';

export default function FloatingMenu() {
    const {
        floatingMenu, setFloatingMenu,
        renditionRef, setCurrentSelection,
        addMarkupToList, deleteMarkup,
        setAiTask, setAiResponse, setAiLoading,
        rightPanel, setRightPanel,
        colorMode, currentBookId,
    } = useContext(ReaderContext);
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    const [snapshot, setSnapshot] = useState(null);

    useEffect(() => {
        if (floatingMenu) {
            setSnapshot(floatingMenu);
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
            const t = setTimeout(() => setSnapshot(null), 180);
            return () => clearTimeout(t);
        }
    }, [floatingMenu]);

    useEffect(() => {
        if (!floatingMenu) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setFloatingMenu(null);
                setCurrentSelection(null);
                const iframe = document.querySelector('iframe');
                if (iframe?.contentWindow) iframe.contentWindow.getSelection()?.removeAllRanges();
            }
        };
        const t = setTimeout(() => document.addEventListener('pointerdown', handler), 50);
        return () => { clearTimeout(t); document.removeEventListener('pointerdown', handler); };
    }, [floatingMenu, setFloatingMenu, setCurrentSelection]);

    if (!snapshot) return null;

    const isDark = colorMode === 'night';
    const textColor = isDark ? '#FFFFFF' : '#000000';

    const { x, y, text, cfiRange, isExisting, markupId } = snapshot;
    const cx = Math.max(200, Math.min(x, window.innerWidth - 200));
    const cy = Math.max(50, y);

    const close = () => {
        setFloatingMenu(null);
        setCurrentSelection(null);
        const iframe = document.querySelector('iframe');
        if (iframe?.contentWindow) iframe.contentWindow.getSelection()?.removeAllRanges();
    };

    const addMark = async (style) => {
        if (!text || !cfiRange) return;
        const rec = await saveAnnotation(currentBookId || 'hegel', text, cfiRange, '', style);
        if (rec && renditionRef.current) {
            renditionRef.current.annotations.add('highlight', cfiRange, { id: rec.id, text, type: style }, null, 'hl');
            addMarkupToList(rec);
        }
        close();
    };

    const handleDel = async () => {
        if (markupId) await deleteMarkup(markupId, cfiRange);
        setCurrentSelection(null);
        close();
    };

    const handleAI = (mode) => {
        if (!text) return;
        setAiTask({ type: mode, text, cfiRange });
        setAiResponse('');
        setAiLoading(true);
        setRightPanel({ isOpen: true, mode, content: text });
        close();
    };

    const handleNote = () => {
        setCurrentSelection({ text, cfiRange });
        setRightPanel({ isOpen: true, mode: 'note', content: text });
        setFloatingMenu(null);
        const iframe = document.querySelector('iframe');
        if (iframe?.contentWindow) iframe.contentWindow.getSelection()?.removeAllRanges();
    };

    const b = {
        padding: '8px 16px', borderRadius: '999px', border: 'none',
        cursor: 'pointer', fontSize: '13px', fontWeight: '500',
        display: 'flex', alignItems: 'center', gap: '4px',
        whiteSpace: 'nowrap', background: 'transparent', color: textColor,
        transition: 'background 0.2s',
    };

    const sep = <div style={{ width: '1px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', margin: '4px 0' }} />;

    return (
        <>
            <div onClick={close} style={{
                position: 'fixed', inset: 0,
                zIndex: 9998,
            }} />
            <LiquidGlass
                displacementScale={0}
                blurAmount={0.13}
                saturation={120}
                borderRadius="24px"
                disableTilt
                disableHover
                style={{
                        position: 'fixed', left: cx, top: cy,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 9999,
                        animation: visible
                            ? 'mfIn .2s cubic-bezier(0.34, 1.56, 0.64, 1) both'
                            : 'mfOut .18s cubic-bezier(0.4, 0, 1, 1) both',
                        '--glass-alpha': isDark ? '0.72' : '0.81',
                        boxShadow: isDark
                            ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 0 0.5px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)'
                            : 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 0.5px rgba(255,255,255,0.5), 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'
                    }}
            >
                <div ref={ref} style={{
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                }}>
                    {isExisting ? (
                        <button onClick={handleDel} onPointerDown={e => e.stopPropagation()} style={{ ...b, color: isDark ? '#FF6B6B' : '#D00000' }}>🗑️ 删除</button>
                    ) : (<>
                        <button onClick={() => addMark('highlight')} onPointerDown={e => e.stopPropagation()} style={{ ...b, color: '#FFB300' }} title="高亮">✦</button>
                        <button onClick={() => addMark('underline')} onPointerDown={e => e.stopPropagation()} style={b} title="下划线">─</button>
                        <button onClick={() => addMark('wavy')} onPointerDown={e => e.stopPropagation()} style={b} title="波浪线">〰</button>
                        {sep}
                        <button onClick={handleNote} onPointerDown={e => e.stopPropagation()} style={b}>📝 笔记</button>
                        <button onClick={() => handleAI('analyze')} onPointerDown={e => e.stopPropagation()} style={b}>🧠 解析</button>
                        <button onClick={() => handleAI('translate')} onPointerDown={e => e.stopPropagation()} style={b}>🌐 翻译</button>
                    </>)}
                </div>
                <style>{`
                    @keyframes mfIn{from{opacity:0;transform:translate(-50%,-95%) scale(.95)}to{opacity:1;transform:translate(-50%,-100%) scale(1)}}
                    @keyframes mfOut{from{opacity:1;transform:translate(-50%,-100%) scale(1)}to{opacity:0;transform:translate(-50%,-95%) scale(.95)}}
                `}</style>
            </LiquidGlass>
        </>
    );
}