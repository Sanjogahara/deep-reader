/**
 * ReaderContext.jsx — Sprint 19 (极简沉浸式重构)
 */

import React, { createContext, useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { DEFAULT_THEME, JELLY_THEMES, getAppCSSVars } from '../config/themes.js';
import { deleteMarkupById } from '../api/db.js';

export const ReaderContext = createContext(null);

function load(key, fallback) {
    try { const v = localStorage.getItem(`dr_${key}`); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
}
function save(key, v) { try { localStorage.setItem(`dr_${key}`, JSON.stringify(v)); } catch {} }

/* ══════════════════════════════════════════════ */
/* 主题定义 (RGB 基础值，供 CSS 变量使用)         */
/* 风格：Minimalist Tech (Apple + Vercel Geist)   */
/* ══════════════════════════════════════════════ */
export const COLOR_MODES = {
    day: {
        key: 'day', label: '白天', emoji: '🌞',
        // Mesh Gradient 背景
        bgGradient: `
            radial-gradient(at 0% 0%, hsla(230, 60%, 92%, 1) 0%, transparent 50%),
            radial-gradient(at 50% 0%, hsla(260, 50%, 90%, 1) 0%, transparent 50%),
            radial-gradient(at 100% 0%, hsla(300, 40%, 92%, 1) 0%, transparent 50%),
            radial-gradient(at 80% 100%, hsla(200, 50%, 93%, 1) 0%, transparent 50%),
            hsla(240, 60%, 96%, 1)
        `,
        glassBaseRGB: '255, 255, 255',
        glassBorderRGB: '255, 255, 255',
        textPrimary: '#1D1D1F',
        textSecondary: '#3A3A3C',
        textMuted: '#6E6E73',
        cardBg: 'rgba(255, 255, 255, 0.8)',
        cardBgHover: 'rgba(255, 255, 255, 0.9)',
        cardBgActive: 'rgba(255, 255, 255, 0.95)',
        btnBg: 'rgba(242, 242, 247, 0.8)',
        hoverBg: 'rgba(245, 245, 247, 0.9)',
        readerBg: '#FEFEFE',
        shadowColor: 'rgba(0, 0, 0, 0.06)',
    },
    night: {
        key: 'night', label: '黑夜', emoji: '🌙',
        // 深色背景，面板更亮形成对比
        bgGradient: 'radial-gradient(ellipse at 50% 0%, #121214 0%, #0a0a0b 100%)',
        glassBaseRGB: '55, 55, 58',  // 面板更亮，与背景形成对比
        glassBorderRGB: '75, 75, 78',
        textPrimary: '#FFFFFF',  // 纯白色文字
        textSecondary: '#FFFFFF',  // 纯白色
        textMuted: 'rgba(255, 255, 255, 0.8)',  // 稍淡的白色
        cardBg: 'rgba(60, 60, 64, 0.65)',
        cardBgHover: 'rgba(75, 75, 80, 0.75)',
        cardBgActive: 'rgba(90, 90, 95, 0.85)',
        btnBg: 'rgba(70, 70, 74, 0.6)',
        hoverBg: 'rgba(80, 80, 84, 0.7)',
        readerBg: 'rgba(16, 16, 18, 0.98)',
        shadowColor: 'rgba(0, 0, 0, 0.4)',
    },
    eye: {
        key: 'eye', label: '护眼', emoji: '🍃',
        bgGradient: 'linear-gradient(180deg, #F5F7F3 0%, #EDF1EA 100%)',
        glassBaseRGB: '220, 235, 215',
        glassBorderRGB: '180, 200, 175',
        textPrimary: '#2C3E2D',
        textSecondary: '#3A5C3B',
        textMuted: '#6B8A6C',
        cardBg: 'rgba(247, 249, 245, 0.8)',
        cardBgHover: 'rgba(240, 245, 238, 0.9)',
        cardBgActive: 'rgba(235, 242, 232, 0.95)',
        btnBg: 'rgba(227, 232, 224, 0.8)',
        hoverBg: 'rgba(232, 237, 229, 0.9)',
        readerBg: '#E8F0E5',
        shadowColor: 'rgba(44, 62, 45, 0.05)',
    }
};

const DEFAULT_AI_CONFIG = {
    provider: 'local', localModel: 'deepseek-r1:32b',
    localUrl: 'http://localhost:11434', cloudModel: 'deepseek-chat', cloudKey: '',
};

export const ReaderProvider = ({ children }) => {
    const bookRef = useRef(null);
    const renditionRef = useRef(null);

    const [view, setView] = useState('home');
    const [currentBookUrl, setCurrentBookUrl] = useState(null);
    const [currentSelection, setCurrentSelection] = useState(null);
    const [markups, setMarkups] = useState([]);
    
    // 样式与主题状态
    const [highlightTheme, setHighlightTheme] = useState(() => load('theme', DEFAULT_THEME));
    const [colorMode, setColorMode] = useState(() => load('colorMode', 'day'));
    const [glassAlpha, setGlassAlpha] = useState(() => load('glassAlpha_v3', 0.15));

    const appCSSVars = useMemo(() => getAppCSSVars(highlightTheme), [highlightTheme]);
    const themeColors = useMemo(() => COLOR_MODES[colorMode] || COLOR_MODES.day, [colorMode]);

    const [toc, setToc] = useState([]);

    // ★ 新 UI 状态结构
    const [leftPanel, setLeftPanel] = useState({ isOpen: true, activeTab: 'toc' });
    const [rightPanel, setRightPanel] = useState({ isOpen: false, mode: null, content: '' });

    // 排版设置
    const [fontSize, setFontSize] = useState(() => load('fontSize', 18));
    const [lineHeight, setLineHeight] = useState(() => load('lineHeight', 1.8));
    const [pageMode, setPageMode] = useState(() => load('pageMode', 'scroll')); // 'scroll' | 'paginated'

    // 持久化监听
    useEffect(() => save('fontSize', fontSize), [fontSize]);
    useEffect(() => save('lineHeight', lineHeight), [lineHeight]);
    useEffect(() => save('pageMode', pageMode), [pageMode]);
    useEffect(() => save('theme', highlightTheme), [highlightTheme]);
    useEffect(() => save('colorMode', colorMode), [colorMode]);
    useEffect(() => save('glassAlpha_v3', glassAlpha), [glassAlpha]);

    // AI 配置
    const [aiConfig, setAiConfig] = useState(() => load('aiConfig', DEFAULT_AI_CONFIG));
    useEffect(() => save('aiConfig', aiConfig), [aiConfig]);
    const updateAiConfig = useCallback((patch) => setAiConfig(p => ({ ...p, ...patch })), []);

    const [aiTask, setAiTask] = useState(null);
    const [aiResponse, setAiResponse] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [floatingMenu, setFloatingMenu] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

    const deleteMarkup = useCallback(async (markupId, cfiRange) => {
        const ok = await deleteMarkupById(markupId);
        if (!ok) return false;
        setMarkups(prev => prev.filter(m => m.id !== markupId));
        if (renditionRef.current && cfiRange) try { renditionRef.current.annotations.remove(cfiRange, "highlight"); } catch {}
        return true;
    }, []);

    const addMarkupToList = useCallback((rec) => { if (rec) setMarkups(prev => [rec, ...prev]); }, []);
    const [currentBookId, setCurrentBookId] = useState(null);
    const openBook = useCallback((url, bookId = null) => {
        setCurrentBookUrl(url);
        setCurrentBookId(bookId);
        setView('reader');
    }, []);

    // 重置状态
    const goHome = useCallback(() => {
        setView('home');
        setCurrentBookUrl(null);
        setCurrentBookId(null);
        setCurrentSelection(null);
        setFloatingMenu(null);
        setToc([]);
        setLeftPanel({ isOpen: true, activeTab: 'toc' });
        setRightPanel({ isOpen: false, mode: null, content: '' });
    }, []);

    return (
        <ReaderContext.Provider value={{
            bookRef, renditionRef, view, setView, currentBookUrl, currentBookId, openBook, goHome,
            currentSelection, setCurrentSelection, markups, setMarkups,
            highlightTheme, setHighlightTheme, themeConfig: JELLY_THEMES, appCSSVars,
            colorMode, setColorMode, themeColors,
            glassAlpha, setGlassAlpha,
            fontSize, setFontSize, lineHeight, setLineHeight,
            pageMode, setPageMode,
            aiConfig, updateAiConfig,
            aiTask, setAiTask, aiResponse, setAiResponse, aiLoading, setAiLoading,
            floatingMenu, setFloatingMenu, showSettings, setShowSettings,
            deleteMarkup, addMarkupToList, toc, setToc,
            leftPanel, setLeftPanel,
            rightPanel, setRightPanel,
        }}>
            {children}
        </ReaderContext.Provider>
    );
};