/**
 * App.jsx — Sprint 19 (极简沉浸式重构)
 *
 * 核心变化：
 * 1. CSS Grid 三栏布局，左右面板独立滑入滑出
 * 2. 顶部导航栏移除，返回/设置移至左侧面板底部
 * 3. 右侧面板为纯显示器，由 FloatingMenu 触发
 */

import React, { useContext, useState, useEffect, useRef } from 'react';
import { ReaderProvider, ReaderContext } from './store/ReaderContext.jsx';
import LiquidGlass from './widgets/LiquidGlass.jsx';
import ReaderEngine from './core/ReaderEngine.jsx';
import ActionWidget from './widgets/ActionWidget.jsx';
import MarkupList from './widgets/MarkupList.jsx';
import SettingsModal from './widgets/SettingsModal.jsx';
import FloatingMenu from './widgets/FloatingMenu.jsx';
import { idbSaveBook, idbGetAllBooks, idbDeleteBook } from './api/db.js';

function useIsWide(bp = 900) {
    const [w, setW] = useState(() => window.innerWidth > bp);
    useEffect(() => {
        const mq = window.matchMedia(`(min-width: ${bp + 1}px)`);
        const h = (e) => setW(e.matches);
        mq.addEventListener('change', h);
        return () => mq.removeEventListener('change', h);
    }, [bp]);
    return w;
}

function ReaderView() {
    const {
        goHome, currentBookUrl, setShowSettings,
        leftPanel, setLeftPanel,
        rightPanel, setRightPanel,
        sidebarMode, setSidebarMode,
        setAiTask, setAiResponse, setAiLoading, setCurrentSelection,
    } = useContext(ReaderContext);

    const closeRightPanel = () => {
        setAiTask(null);
        setAiResponse('');
        setAiLoading(false);
        setCurrentSelection(null);
        setRightPanel({ isOpen: false, mode: null, content: '' });
    };

    const isWide = useIsWide(1024);
    const isDesktop = useIsWide(900);

    useEffect(() => {
        if (!isDesktop) setLeftPanel(p => ({ ...p, isOpen: false }));
    }, [isDesktop, setLeftPanel]);

    const leftOpen = leftPanel.isOpen;
    const rightOpen = rightPanel.isOpen;

    // 根据用户设置和屏幕尺寸决定布局模式
    const useDrawer = !isWide || sidebarMode === 'drawer';
    const useFixedSidebar = isWide && sidebarMode === 'fixed';

    // 固定模式下，调整主内容区域宽度
    const getMainContentWidth = () => {
        if (!useFixedSidebar) return '1fr';
        const leftWidth = leftOpen ? '300px' : '0px';
        const rightWidth = rightOpen ? '320px' : '0px';
        return `${leftWidth} 1fr ${rightWidth}`;
    };

    const glassBtn = {
        width: '34px', height: '34px', borderRadius: '50%',
        background: 'rgba(var(--glass-bg-rgb), 0.35)',
        backdropFilter: 'blur(20px) saturate(115%)',
        WebkitBackdropFilter: 'blur(20px) saturate(115%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        cursor: 'pointer', fontSize: '15px', color: 'var(--text-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', transition: 'all 0.2s ease',
    };

    const drawerStyle = (open, side) => ({
        position: 'fixed',
        top: 0, bottom: 0,
        [side]: 0,
        width: side === 'left' ? '300px' : '320px',
        zIndex: 200,
        transform: open ? 'translateX(0)' : `translateX(${side === 'left' ? '-100%' : '100%'})`,
        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex', flexDirection: 'column',
        padding: `calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom)) 16px`,
    });

    return (
        <div style={{
            display: 'flex',
            width: '100vw',
            height: '100vh',
            padding: useDrawer ? 0 : '12px',
            gap: useDrawer ? 0 : '12px',
            overflow: 'hidden',
            position: 'relative',
        }}>

            {/* ══ 左侧面板 ══ */}
            {!useDrawer && (
                <LiquidGlass displacementScale={0} fragment="liquidGlassSubtle" elasticity={0.06}
                    style={{
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden', padding: '16px',
                        width: leftOpen ? '300px' : '0px',
                        minWidth: leftOpen ? '300px' : '0px',
                        opacity: leftOpen ? 1 : 0,
                        pointerEvents: leftOpen ? 'auto' : 'none',
                    }}>
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
                            <MarkupList />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(var(--glass-bg-rgb), 0.15)', marginTop: '8px', flexShrink: 0 }}>
                            <button onClick={goHome} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', background: 'rgba(var(--glass-bg-rgb), 0.4)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>← 书架</button>
                            <button onClick={() => setShowSettings(true)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'rgba(var(--glass-bg-rgb), 0.4)', color: 'var(--text-primary)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</button>
                        </div>
                    </div>
                </LiquidGlass>
            )}

            {/* 抽屉模式的左侧面板 */}
            {useDrawer && leftOpen && (
                <>
                    <div onClick={() => setLeftPanel(p => ({ ...p, isOpen: false }))} style={{
                        position: 'fixed', inset: 0, zIndex: 199,
                        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)',
                    }} />
                    <LiquidGlass displacementScale={18} fragment="liquidGlassSubtle" elasticity={0.06}
                        style={drawerStyle(leftOpen, 'left')}>
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
                                <MarkupList />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(var(--glass-bg-rgb), 0.15)', marginTop: '8px', flexShrink: 0 }}>
                                <button onClick={goHome} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', background: 'rgba(var(--glass-bg-rgb), 0.4)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>← 书架</button>
                                <button onClick={() => setShowSettings(true)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'rgba(var(--glass-bg-rgb), 0.4)', color: 'var(--text-primary)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</button>
                            </div>
                        </div>
                    </LiquidGlass>
                </>
            )}

            {/* ══ 中间阅读区 ══ */}
            <LiquidGlass displacementScale={18} fragment="liquidGlassSubtle" disableTilt disableHover
                style={{
                    display: 'flex', position: 'relative', overflow: 'hidden',
                    flex: 1,
                    minWidth: 0,
                    ...(useDrawer ? { height: '100vh', borderRadius: 0 } : {}),
                }}>
                <div style={{
                    width: '100%', background: 'var(--reader-bg)',
                    height: '100%', position: 'relative',
                    borderRadius: useDrawer ? 0 : '14px', overflow: 'hidden',
                }}>
                    <ReaderEngine bookUrl={currentBookUrl} />

                    <button onClick={() => setLeftPanel(p => ({ ...p, isOpen: !p.isOpen }))}
                        style={{
                            ...glassBtn,
                            position: 'absolute',
                            top: `calc(14px + env(safe-area-inset-top))`,
                            left: '14px', zIndex: 100,
                        }}
                        title={leftOpen ? '收起目录' : '展开目录'}
                    >{leftOpen && !useDrawer ? '◀' : '▶'}</button>

                    {/* 左上角设置按钮 */}
                    <button onClick={() => setShowSettings(true)}
                        style={{
                            ...glassBtn,
                            position: 'absolute',
                            top: `calc(14px + env(safe-area-inset-top))`,
                            right: isWide ? 'calc(14px + 44px)' : '14px', zIndex: 100,
                            fontSize: '14px',
                        }}
                        title="设置"
                    >⚙️</button>

                    {/* Sidebar模式切换按钮 - 只在宽屏时显示 */}
                    {isWide && (
                        <button onClick={() => setSidebarMode(sidebarMode === 'drawer' ? 'fixed' : 'drawer')}
                            style={{
                                ...glassBtn,
                                position: 'absolute',
                                top: `calc(14px + env(safe-area-inset-top))`,
                                right: '14px', zIndex: 100,
                                fontSize: '14px',
                                background: sidebarMode === 'fixed' ? 'rgba(var(--glass-bg-rgb), 0.5)' : 'rgba(var(--glass-bg-rgb), 0.35)',
                            }}
                            title={sidebarMode === 'drawer' ? '切换到固定侧边栏' : '切换到抽屉模式'}
                        >{sidebarMode === 'drawer' ? '📌' : '📱'}</button>
                    )}
                </div>
            </LiquidGlass>

            {/* ══ 右侧面板 ══ */}
            {!useDrawer && (
                <div style={{
                    width: rightOpen ? '320px' : '0px',
                    minWidth: rightOpen ? '320px' : '0px',
                    overflow: 'hidden',
                    position: 'relative',
                }}>
                    <LiquidGlass displacementScale={15} fragment="liquidGlassSubtle" blurAmount={0.45} saturation={150} elasticity={0.06}
                        borderRadius="24px" disableTilt disableHover
                        style={{
                            width: '320px',
                            height: '100%',
                            opacity: rightOpen ? 1 : 0,
                            transform: rightOpen ? 'translateX(0)' : 'translateX(20px)',
                            transition: 'opacity 0.3s ease, transform 0.3s ease',
                            '--glass-alpha': '0.5',
                        }}>
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {rightPanel.mode === 'note' ? '笔记' : rightPanel.mode === 'translate' ? '翻译' : '解析'}
                                </span>
                                <button onClick={closeRightPanel} style={{
                                    width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                                    background: 'rgba(var(--glass-bg-rgb), 0.3)', color: 'var(--text-muted)',
                                    cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>✕</button>
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                                <ActionWidget />
                            </div>
                        </div>
                    </LiquidGlass>
                </div>
            )}

            {/* 抽屉模式的右侧面板 */}
            {useDrawer && rightOpen && (
                <LiquidGlass displacementScale={15} fragment="liquidGlassSubtle" blurAmount={0.35} saturation={130} elasticity={0.06}
                    borderRadius="24px" disableTilt disableHover
                    style={{...drawerStyle(rightOpen, 'right'), '--glass-alpha': '0.45'}}>
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {rightPanel.mode === 'note' ? '笔记' : rightPanel.mode === 'translate' ? '翻译' : '解析'}
                            </span>
                            <button onClick={closeRightPanel} style={{
                                width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                                background: 'rgba(var(--glass-bg-rgb), 0.3)', color: 'var(--text-muted)',
                                cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>✕</button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                            <ActionWidget />
                        </div>
                    </div>
                </LiquidGlass>
            )}

            <FloatingMenu />
            <SettingsModal />
        </div>
    );
}

const DEFAULT_BOOKS = [
    {
        id: 'hegel',
        title: '黑格尔作品集（套装共14册）',
        author: '黑格尔',
        url: '/黑格尔作品集（套装共14册） (黑格尔的思想，标志着19世纪德国唯心主义哲学运动的顶峰；汉译经典，名著名译；豆瓣高分推荐！) (黑格尔 [黑格尔]) (Z-Library).epub',
        cover: null,
    },
];

function HomeView() {
    const { openBook, setShowSettings } = useContext(ReaderContext);
    const [localBooks, setLocalBooks] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        idbGetAllBooks().then(books => setLocalBooks(books.sort((a, b) => b.id.localeCompare(a.id))));
    }, []);

    const handleFileImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const arrayBuffer = await file.arrayBuffer();
        const newBook = {
            id: `local_${Date.now()}`,
            title: file.name.replace('.epub', ''),
            author: '本地导入',
            arrayBuffer,
            url: null,
            cover: null,
        };
        await idbSaveBook(newBook);
        setLocalBooks(prev => [newBook, ...prev]);
        openBook(arrayBuffer, newBook.id);
    };

    const handleDeleteBook = async (bookId, e) => {
        e.stopPropagation();
        await idbDeleteBook(bookId);
        setLocalBooks(prev => prev.filter(b => b.id !== bookId));
    };

    const allBooks = [...DEFAULT_BOOKS, ...localBooks];

    return (
        <div style={{
            minHeight: '100vh', width: '100vw',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '48px 24px',
            position: 'relative',
        }}>
            {/* 右上角全局设置按钮 */}
            <button onClick={() => setShowSettings(true)} style={{
                position: 'fixed', top: '20px', right: '20px',
                width: '40px', height: '40px', borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(var(--glass-bg-rgb), 0.4)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                cursor: 'pointer', fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-primary)', zIndex: 100,
                transition: 'all 0.2s ease',
            }}>⚙️</button>

            {/* 标题 */}
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Deep Reader</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>你的沉浸式阅读空间</p>
            </div>

            {/* 书架网格 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '20px', width: '100%', maxWidth: '900px',
            }}>
                {allBooks.map(book => (
                    <BookCard
                        key={book.id}
                        book={book}
                        onOpen={() => openBook(book.arrayBuffer || book.url, book.id)}
                        onDelete={book.id !== 'hegel' ? (e) => handleDeleteBook(book.id, e) : null}
                    />
                ))}

                {/* 导入按钮 */}
                <LiquidGlass displacementScale={14} borderRadius="16px"
                    style={{ cursor: 'pointer' }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div style={{
                        height: '220px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '10px',
                        color: 'var(--text-muted)',
                    }}>
                        <div style={{ fontSize: '32px', opacity: 0.6 }}>+</div>
                        <div style={{ fontSize: '13px', fontWeight: '500' }}>导入本地书籍</div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>支持 .epub 格式</div>
                    </div>
                </LiquidGlass>
            </div>

            <input ref={fileInputRef} type="file" accept=".epub"
                style={{ display: 'none' }} onChange={handleFileImport} />

            <SettingsModal />
        </div>
    );
}

function BookCard({ book, onOpen, onDelete }) {
    const [hovered, setHovered] = useState(false);

    return (
        <LiquidGlass displacementScale={14} borderRadius="16px"
            style={{ cursor: 'pointer', position: 'relative' }}
            onClick={onOpen}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={{ height: '220px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(var(--glass-bg-rgb), 0.2)', fontSize: '48px',
                }}>📖</div>
                <div style={{ padding: '10px 12px', flexShrink: 0 }}>
                    <div style={{
                        fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4',
                    }}>{book.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{book.author}</div>
                </div>
            </div>
            {/* 悬停时才显示删除按钮 */}
            {onDelete && (
                <button onClick={onDelete} style={{
                    position: 'absolute', top: '8px', right: '8px',
                    width: '24px', height: '24px', borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(var(--glass-bg-rgb), 0.5)',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: hovered ? 1 : 0,
                    transform: hovered ? 'scale(1)' : 'scale(0.7)',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                }}>✕</button>
            )}
        </LiquidGlass>
    );
}

function AppRouter() {
    const { view } = useContext(ReaderContext);
    return view === 'reader' ? <ReaderView /> : <HomeView />;
}

export default function App() {
    return (
        <ReaderProvider>
            <ThemeInjector>
                <AppRouter />
            </ThemeInjector>
        </ReaderProvider>
    );
}

function ThemeInjector({ children }) {
    const { themeColors, glassAlpha, appCSSVars } = useContext(ReaderContext);
    return (
        <div style={{
            '--bg-gradient': themeColors.bgGradient,
            '--glass-bg-rgb': themeColors.glassBaseRGB,
            '--glass-alpha': glassAlpha,
            '--text-primary': themeColors.textPrimary,
            '--text-secondary': themeColors.textSecondary,
            '--text-muted': themeColors.textMuted,
            '--card-bg': themeColors.cardBg,
            '--card-bg-hover': themeColors.cardBgHover || themeColors.cardBg,
            '--card-bg-active': themeColors.cardBgActive || themeColors.cardBg,
            '--btn-bg': themeColors.btnBg,
            '--hover-bg': themeColors.hoverBg,
            '--reader-bg': themeColors.readerBg,
            '--shadow-color': themeColors.shadowColor,
            ...appCSSVars,
            background: 'var(--bg-gradient)',
            color: 'var(--text-primary)',
            minHeight: '100vh',
            transition: 'background 0.4s ease',
        }}>
            {children}
        </div>
    );
}
