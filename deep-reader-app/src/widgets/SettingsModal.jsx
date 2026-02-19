/**
 * SettingsModal.jsx — AI 配置回归版
 * * 修复：
 * 1. [CRITICAL] 找回丢失的 AI 配置 (Local/DeepSeek切换, Key 输入)
 * 2. 保持背景全透明玻璃质感
 */

import React, { useContext, useState, useEffect } from 'react';
import { ReaderContext, COLOR_MODES } from '../store/ReaderContext.jsx';
import { JELLY_THEMES, THEME_KEYS } from '../config/themes.js';
import LiquidGlass from './LiquidGlass.jsx';

export default function SettingsModal() {
    const {
        showSettings, setShowSettings,
        highlightTheme, setHighlightTheme,
        fontSize, setFontSize,
        lineHeight, setLineHeight,
        colorMode, setColorMode,
        pageMode, setPageMode,
        aiConfig, updateAiConfig,
        glassAlpha, setGlassAlpha,
    } = useContext(ReaderContext);

    const [showKey, setShowKey] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const [opticsOpen, setOpticsOpen] = useState(false);
    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (showSettings) {
            setMounted(true);
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
            const t = setTimeout(() => setMounted(false), 200);
            return () => clearTimeout(t);
        }
    }, [showSettings]);

    if (!mounted) return null;

    const isLocal = aiConfig.provider === 'local';

    return (
        <>
            {/* 点击遮罩关闭 - 降低模糊强度 */}
            <div onClick={() => setShowSettings(false)}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(5px)',
                    WebkitBackdropFilter: 'blur(5px)',
                    zIndex: 999,
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                }} />

            <LiquidGlass
                displacementScale={0}
                blurAmount={0.06}
                saturation={110}
                borderRadius="24px"
                disableTilt
                disableHover
                style={{
                    position: 'fixed', top: '50%', left: '50%',
                    transform: `translate(-50%, -50%)`,
                    width: 'min(440px, 90vw)', maxHeight: '85vh',
                    zIndex: 1000,
                    opacity: visible ? 1 : 0,
                    animation: visible
                        ? 'mfIn .2s cubic-bezier(0.34, 1.56, 0.64, 1) both'
                        : 'mfOut .18s cubic-bezier(0.4, 0, 1, 1) both',
                    background: 'rgba(var(--glass-bg-rgb), 0.25)',
                    boxShadow: '0 4px 16px var(--shadow-color)',
                }}
            >
                <div style={{ padding: '28px', overflowY: 'auto', maxHeight: '85vh', color: 'var(--text-primary)' }}>
                    {/* 标题栏 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>设置</h2>
                        <button onClick={() => setShowSettings(false)} style={{
                            background: 'var(--btn-bg)', border: 'none', borderRadius: '50%',
                            width: '32px', height: '32px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-primary)'
                        }}>✕</button>
                    </div>

                    <Section title="">
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            {[
                                { key: 'scroll', label: '上下滚动', icon: '↕️' },
                                { key: 'paginated', label: '左右翻页', icon: '↔️' }
                            ].map(mode => (
                                <button key={mode.key} onClick={() => setPageMode(mode.key)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '10px',
                                        border: pageMode === mode.key ? '2px solid var(--theme-accent, #007AFF)' : '2px solid transparent',
                                        background: pageMode === mode.key ? 'var(--btn-bg)' : 'transparent',
                                        cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                                        color: 'var(--text-primary)', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '6px'
                                    }}>
                                    <span>{mode.icon}</span>
                                    <span>{mode.label}</span>
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '500' }}>字号</span>
                            <span style={{ color: 'var(--theme-accent)', fontWeight: '600' }}>{fontSize}px</span>
                        </div>
                        <input type="range" min={14} max={28} step={1} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ width: '100%', cursor: 'grab', accentColor: 'var(--theme-accent)', marginBottom: '12px' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '500' }}>行距</span>
                            <span style={{ color: 'var(--theme-accent)', fontWeight: '600' }}>{lineHeight.toFixed(1)}</span>
                        </div>
                        <input type="range" min={1.2} max={2.4} step={0.1} value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))} style={{ width: '100%', cursor: 'grab', accentColor: 'var(--theme-accent)' }} />
                    </Section>

                    <Section title="">
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {Object.values(COLOR_MODES).map(mode => (
                                <button key={mode.key} onClick={() => setColorMode(mode.key)}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '12px',
                                        border: colorMode === mode.key ? '2px solid var(--theme-accent, #007AFF)' : '2px solid transparent',
                                        background: colorMode === mode.key ? 'var(--btn-bg)' : 'transparent',
                                        cursor: 'pointer', textAlign: 'center', color: 'var(--text-primary)'
                                    }}>
                                    <div style={{ fontSize: '20px' }}>{mode.emoji}</div>
                                    <div style={{ fontSize: '12px', marginTop: '4px' }}>{mode.label}</div>
                                </button>
                            ))}
                        </div>
                        {/* 高亮色点 */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {THEME_KEYS.map(k => {
                                const t = JELLY_THEMES[k];
                                const on = highlightTheme === k;
                                return (
                                    <button key={k} onClick={() => setHighlightTheme(k)}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: t.base.fill, 
                                            border: on ? `2px solid ${t.accent}` : '2px solid transparent',
                                            cursor: 'pointer', transform: on ? 'scale(1.1)' : 'scale(1)',
                                            transition: 'transform 0.2s'
                                        }} title={t.name} />
                                );
                            })}
                        </div>
                    </Section>

                    {/* 光学 */}
                    <Collapsible label="光学" open={opticsOpen} onToggle={() => setOpticsOpen(o => !o)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '500' }}>玻璃透明度</span>
                            <span style={{ color: 'var(--theme-accent)', fontWeight: '600' }}>{Math.round(glassAlpha * 100)}%</span>
                        </div>
                        <input type="range" min={0.05} max={0.6} step={0.01} value={glassAlpha} onChange={e => setGlassAlpha(Number(e.target.value))} style={{ width: '100%', cursor: 'grab', accentColor: 'var(--theme-accent)' }} />
                    </Collapsible>

                    {/* AI 配置 */}
                    <Collapsible label="AI 配置" open={aiOpen} onToggle={() => setAiOpen(o => !o)}>
                        <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '10px', padding: '4px', marginBottom: '12px' }}>
                            {['local', 'cloud'].map(k => (
                                <button key={k} onClick={() => updateAiConfig({ provider: k })}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                                        background: aiConfig.provider === k ? 'var(--card-bg)' : 'transparent',
                                        boxShadow: aiConfig.provider === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                        color: aiConfig.provider === k ? 'var(--text-primary)' : 'var(--text-muted)',
                                    }}>{k === 'local' ? '本地 Ollama' : '云端 DeepSeek'}</button>
                            ))}
                        </div>
                        {isLocal ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '12px', opacity: 0.7 }}>本地模型名称</div>
                                <Input value={aiConfig.localModel} onChange={v => updateAiConfig({ localModel: v })} placeholder="deepseek-r1:32b" />
                                <div style={{ fontSize: '12px', opacity: 0.7 }}>本地服务地址</div>
                                <Input value={aiConfig.localUrl || 'http://localhost:11434'} onChange={v => updateAiConfig({ localUrl: v })} placeholder="http://localhost:11434" />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '12px', opacity: 0.7 }}>API Key</div>
                                <div style={{ position: 'relative' }}>
                                    <Input value={aiConfig.cloudKey} onChange={v => updateAiConfig({ cloudKey: v })} placeholder="sk-..." type={showKey ? 'text' : 'password'} />
                                    <button onClick={() => setShowKey(!showKey)} style={{
                                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                        fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer'
                                    }}>{showKey ? '隐藏' : '显示'}</button>
                                </div>
                            </div>
                        )}
                    </Collapsible>
                </div>
            </LiquidGlass>
            <style>{`
                @keyframes mfIn{from{opacity:0;transform:translate(-50%,-48%) scale(.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
                @keyframes mfOut{from{opacity:1;transform:translate(-50%,-50%) scale(1)}to{opacity:0;transform:translate(-50%,-48%) scale(.97)}}
            `}</style>
        </>
    );
}

// 辅助组件
function Collapsible({ label, open, onToggle, children }) {
    return (
        <div style={{ marginBottom: '8px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(var(--glass-bg-rgb), 0.15)' }}>
            <button onClick={onToggle} style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: 'rgba(var(--glass-bg-rgb), 0.08)',
                border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                color: 'var(--text-primary)',
            }}>
                <span>{label}</span>
                <span style={{ fontSize: '11px', opacity: 0.5, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </button>
            {open && <div style={{ padding: '12px 14px' }}>{children}</div>}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px' }}>{title}</div>
            <div style={{ background: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px' }}>{children}</div>
        </div>
    );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
    return (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.1)', background: 'var(--hover-bg)',
                color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
            }} />
    );
}