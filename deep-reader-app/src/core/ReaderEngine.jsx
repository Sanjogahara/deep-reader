/**
 * ReaderEngine.jsx — Sprint 17 (Final Fixes)
 *
 * Fixes:
 * 1. Multi-line Wavy: Each rect gets its own unique path
 * 2. Symmetry: max-width + margin auto for centering
 * 3. Scroll Jump: Use 'default' manager + disable epubjs scroll hijacking
 */

import { useEffect, useContext, useRef, useCallback } from 'react';
import ePub from 'epubjs';
import { ReaderContext } from '../store/ReaderContext.jsx';
import { JELLY_THEMES, DEFAULT_THEME } from '../config/themes.js';
import { getMarkupsWithNotes, saveReadingProgress, loadReadingProgress } from '../api/db.js';

const YELLOW = { fill: '#FFD60A', opacity: '0.15' };

// SVG Filters
const SVG_FILTERS_HTML = `
<svg width="0" height="0" style="position:absolute" id="jelly-filters"><defs>
<filter id="jelly" x="-5%" y="-15%" width="110%" height="140%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" result="bt"/><feOffset in="bt" dx="0" dy="0.8" result="ot"/>
  <feFlood flood-color="rgba(0,0,0,0.08)" result="ct"/><feComposite in="ct" in2="ot" operator="in" result="it"/>
  <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="it"/></feMerge>
</filter>
<filter id="jelly-light" x="-5%" y="-15%" width="110%" height="140%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="1.0" result="bt"/><feOffset in="bt" dx="0" dy="0.4" result="ot"/>
  <feFlood flood-color="rgba(0,0,0,0.04)" result="ct"/><feComposite in="ct" in2="ot" operator="in" result="it"/>
  <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="it"/></feMerge>
</filter>
<filter id="jelly-deep" x="-5%" y="-15%" width="110%" height="140%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="2.8" result="bt"/><feOffset in="bt" dx="0" dy="1.4" result="ot"/>
  <feFlood flood-color="rgba(0,0,0,0.18)" result="ct"/><feComposite in="ct" in2="ot" operator="in" result="it"/>
  <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="it"/></feMerge>
</filter>
</defs></svg>`;

// ── Paint Utilities ──

// Helper: Remove ALL wavy paths in a g element
function removeAllWavyPaths(g) {
    g.querySelectorAll('path.wavy-line').forEach(p => p.remove());
}

// Helper: Get or create a unique wavy path for a specific rect
function getWavyPathForRect(r, g) {
    // Use rect's position as unique ID
    const rectId = `${r.getAttribute('x')}-${r.getAttribute('y')}`;
    let path = g.querySelector(`path.wavy-line[data-rect-id="${rectId}"]`);
    if (!path) {
        path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'wavy-line');
        path.setAttribute('data-rect-id', rectId);
        g.appendChild(path);
    }
    return path;
}

function paintRect(r, fill, opacity, filter) {
    // Don't remove wavy paths here - let the caller handle it at g level
    r.style.display = 'inline';
    r.removeAttribute('fill'); r.removeAttribute('fill-opacity'); r.removeAttribute('stroke');
    r.style.fill = fill; r.style.fillOpacity = opacity;
    r.style.filter = filter ? `url(#${filter})` : 'none';
    r.style.stroke = 'none';
    r.style.strokeDasharray = '';
    r.setAttribute('rx', '3'); r.setAttribute('ry', '3');

    if (r.dataset.origHeight) r.setAttribute('height', r.dataset.origHeight);
    if (r.dataset.origY) r.setAttribute('y', r.dataset.origY);
}

function paintYellow(r) {
    if (!r.dataset.origHeight) r.dataset.origHeight = r.getAttribute('height');
    if (!r.dataset.origY) r.dataset.origY = r.getAttribute('y');
    paintRect(r, YELLOW.fill, YELLOW.opacity, 'jelly');
}

function paintUnderline(r, color) {
    // Don't remove wavy paths here - handled at g level
    if (!r.dataset.origHeight) r.dataset.origHeight = r.getAttribute('height');
    if (!r.dataset.origY) r.dataset.origY = r.getAttribute('y');

    r.style.display = 'inline';
    r.removeAttribute('fill'); r.removeAttribute('fill-opacity'); r.removeAttribute('stroke');
    const y0 = parseFloat(r.dataset.origY || 0);
    const h0 = parseFloat(r.dataset.origHeight || 20);

    r.setAttribute('y', String(y0 + h0 - 2));
    r.setAttribute('height', '2');

    r.style.fill = color;
    r.style.fillOpacity = '0.9';
    r.style.filter = 'none';
    r.style.stroke = 'none';
    r.setAttribute('rx', '0'); r.setAttribute('ry', '0');
}

// ★ FIX 1: Multi-line Wavy - Each rect gets its own path
function paintWavy(r, color) {
    const g = r.parentNode;
    if (!g) return;

    if (!r.dataset.origHeight) r.dataset.origHeight = r.getAttribute('height');
    if (!r.dataset.origY) r.dataset.origY = r.getAttribute('y');

    // Hide the rect but keep it for hit testing
    r.style.fill = 'transparent';
    r.style.fillOpacity = '0';
    r.style.stroke = 'none';
    r.style.filter = 'none';

    // Get or create path unique to THIS rect
    const path = getWavyPathForRect(r, g);

    const x = parseFloat(r.getAttribute('x') || 0);
    const y = parseFloat(r.dataset.origY || 0);
    const w = parseFloat(r.getAttribute('width') || 100);
    const h = parseFloat(r.dataset.origHeight || 20);
    const bottomY = y + h - 2;

    // Generate Sine Wave path
    let d = `M ${x} ${bottomY}`;
    const step = 4;
    const amp = 1.5;
    for (let i = 0; i <= w; i += step) {
        const cpX = x + i + step / 2;
        const endX = Math.min(x + i + step, x + w);
        const cpY = bottomY + (Math.floor(i / step) % 2 === 0 ? amp : -amp);
        d += ` Q ${cpX} ${cpY} ${endX} ${bottomY}`;
    }

    path.setAttribute('d', d);
    path.style.fill = 'none';
    path.style.stroke = color;
    path.style.strokeWidth = '1.5';
    path.style.pointerEvents = 'none';
}

// Hover Effect - called per rect, wavy cleanup handled at g level before this
function paintLineHover(r, theme) {
    if (r.dataset.origHeight) r.setAttribute('height', r.dataset.origHeight);
    if (r.dataset.origY) r.setAttribute('y', r.dataset.origY);

    r.style.display = 'inline';
    r.removeAttribute('fill'); r.removeAttribute('fill-opacity'); r.removeAttribute('stroke');
    r.style.fill = theme.hover.fill;
    r.style.fillOpacity = theme.hover.opacity;
    r.style.filter = 'url(#jelly-light)';
    r.style.stroke = 'none';
    r.setAttribute('rx', '3'); r.setAttribute('ry', '3');
}

function getTheme(themeKey) {
    return JELLY_THEMES[themeKey] || JELLY_THEMES[DEFAULT_THEME];
}

function findAncestorHL(el, maxDepth = 10) {
    let node = el;
    for (let i = 0; i < maxDepth && node && node.nodeType === 1; i++) {
        if (node.nodeName === 'g' && node.classList?.contains('hl')) return node;
        node = node.parentNode;
    }
    return null;
}

function restoreG(g, _themeKey, markups, lineColor) {
    if (!g || g.getAttribute('data-active') === 'true') return;
    const cfi = g.getAttribute('data-epubcfi');
    const mk = markups?.find(m => (m.markup?.cfi_range || m.cfi_range) === cfi);
    const type = mk?.markup?.style || mk?.type || 'highlight';

    // Clear wavy paths first if switching away from wavy
    if (type !== 'wavy') {
        removeAllWavyPaths(g);
    }

    g.querySelectorAll('rect').forEach(r => {
        if (type === 'underline') paintUnderline(r, lineColor);
        else if (type === 'wavy') paintWavy(r, lineColor);
        else paintYellow(r);
    });
}

function repaintAll(markups, lineColor) {
    const typeMap = {};
    if (markups) {
        markups.forEach(m => {
            const cfi = m.markup?.cfi_range || m.cfi_range;
            const type = m.markup?.style || m.type || 'highlight';
            if (cfi) typeMap[cfi] = type;
        });
    }

    document.querySelectorAll('g.hl').forEach(g => {
        const cfi = g.getAttribute('data-epubcfi');
        const type = typeMap[cfi] || 'highlight';
        const isActive = g.getAttribute('data-active') === 'true';

        // Clear wavy paths first if not wavy type
        if (type !== 'wavy' || isActive) {
            removeAllWavyPaths(g);
        }

        g.querySelectorAll('rect').forEach(r => {
            if (isActive) {
                const theme = getTheme('blue');
                paintRect(r, theme.active.fill, theme.active.opacity, 'jelly-deep');
            } else if (type === 'underline') {
                paintUnderline(r, lineColor);
            } else if (type === 'wavy') {
                paintWavy(r, lineColor);
            } else {
                paintYellow(r);
            }
        });
    });
}

function rebindAnnotations(rendition, markups, lineColor) {
    document.querySelectorAll('g.hl').forEach(g => g.remove());
    if (markups && markups.length > 0) {
        markups.forEach(m => {
            const cfi = m.markup?.cfi_range || m.cfi_range;
            const id = m.id;
            const text = m.markup?.text_excerpt || m.text_excerpt || '';
            if (cfi) {
                try { rendition.annotations.add("highlight", cfi, { id, text }, null, "hl"); } catch {}
            }
        });
    }
    setTimeout(() => repaintAll(markups, lineColor), 200);
    setTimeout(() => repaintAll(markups, lineColor), 500);
}

function flattenNav(items, depth = 0) {
    const res = [];
    if (!items) return res;
    items.forEach(i => {
        res.push({ label: i.label?.trim() || '(无标题)', href: i.href, id: i.id, depth });
        if (i.subitems?.length) res.push(...flattenNav(i.subitems, depth + 1));
    });
    return res;
}

export default function ReaderEngine({ bookUrl }) {
    const readerDiv = useRef(null);
    const hoveredGRef = useRef(null);
    const isTouchDevice = useRef(false);

    const {
        renditionRef, bookRef, fontSize, lineHeight, pageMode, setToc,
        setFloatingMenu, setCurrentSelection, highlightTheme, colorMode, markups, floatingMenu,
        setLeftPanel, currentBookId, setMarkups,
    } = useContext(ReaderContext);

    const theme = getTheme(highlightTheme);
    const lineColor = colorMode === 'night' ? '#FFFFFF' : theme.accent;

    const markupsRef = useRef(markups);
    const lineColorRef = useRef(lineColor);
    const themeRef = useRef(highlightTheme);
    const floatingMenuRef = useRef(floatingMenu);

    useEffect(() => { markupsRef.current = markups; }, [markups]);
    useEffect(() => { lineColorRef.current = lineColor; }, [lineColor]);
    useEffect(() => { themeRef.current = highlightTheme; }, [highlightTheme]);
    useEffect(() => { floatingMenuRef.current = floatingMenu; }, [floatingMenu]);

    const clearHover = useCallback(() => {
        const prev = hoveredGRef.current;
        if (prev) {
            restoreG(prev, themeRef.current, markupsRef.current, lineColorRef.current);
            hoveredGRef.current = null;
        }
    }, []);

    const goNext = useCallback(() => { renditionRef.current?.next(); }, [renditionRef]);
    const goPrev = useCallback(() => { renditionRef.current?.prev(); }, [renditionRef]);

    const currentHrefRef = useRef(null);

    const goNextChapter = useCallback(() => {
        const book = bookRef.current;
        const rendition = renditionRef.current;
        if (!book || !rendition) return;
        const items = book.spine?.items;
        if (!items) return;
        const cur = currentHrefRef.current;
        const idx = items.findIndex(item => cur && (cur === item.href || cur.includes(item.href)));
        if (idx >= 0 && idx < items.length - 1) rendition.display(items[idx + 1].href);
    }, [bookRef, renditionRef]);

    const goPrevChapter = useCallback(() => {
        const book = bookRef.current;
        const rendition = renditionRef.current;
        if (!book || !rendition) return;
        const items = book.spine?.items;
        if (!items) return;
        const cur = currentHrefRef.current;
        const idx = items.findIndex(item => cur && (cur === item.href || cur.includes(item.href)));
        if (idx > 0) rendition.display(items[idx - 1].href);
    }, [bookRef, renditionRef]);

    useEffect(() => {
        if (!bookUrl || !readerDiv.current) return;

        // Inject SVG Filters
        if (!document.getElementById('jelly-filters')) {
            const c = document.createElement('div');
            c.innerHTML = SVG_FILTERS_HTML;
            document.body.appendChild(c.firstElementChild);
        }

        // Inject CSS
        if (!document.getElementById('jelly-css')) {
            const s = document.createElement('style');
            s.id = 'jelly-css';
            s.textContent = `
                g.hl rect {
                    transition: fill 0.18s ease, fill-opacity 0.18s ease, filter 0.18s ease,
                                height 0.15s ease, y 0.15s ease;
                    cursor: pointer; pointer-events: all !important;
                }
                g.hl path.wavy-line { transition: stroke 0.18s ease; }
                g.hl { pointer-events: all !important; cursor: pointer; }
            `;
            document.head.appendChild(s);
        }

        const container = readerDiv.current;
        container.innerHTML = '';

        const isArrayBuffer = bookUrl instanceof ArrayBuffer;
        const book = isArrayBuffer ? ePub(bookUrl, { openAs: 'binary' }) : ePub(bookUrl);
        bookRef.current = book;

        const isScrollMode = pageMode === 'scroll';

        // ★ FIX 3: Use 'default' manager to avoid scroll hijacking
        const rendition = book.renderTo(container, {
            width: '100%',
            height: '100%',
            flow: isScrollMode ? 'scrolled-doc' : 'paginated',
            spread: 'none',
            manager: 'default',
            allowScriptedContent: true,
        });
        renditionRef.current = rendition;

        const textColor = colorMode === 'night' ? '#FFFFFF' : 'inherit';
        const bgColor = colorMode === 'night' ? '#1a1a1a' : 'inherit';

        // ★ FIX: Night mode + Paginated layout
        // 分页模式不使用 max-width，让 epubjs 控制列宽
        const baseStyles = {
            'html, body': {
                'margin': '0 !important',
                'color': `${textColor} !important`,
                'background-color': `${bgColor} !important`,
                'box-sizing': 'border-box !important',
            },
            // ★ 黑夜模式：强制所有元素为白色
            '*': {
                'color': colorMode === 'night' ? '#FFFFFF !important' : 'inherit',
            },
            'p, div, span, li, h1, h2, h3, h4, h5, h6, a, em, strong, b, i, u, blockquote, cite, code, pre, td, th, label, figcaption, caption, small, sub, sup, mark, del, ins, abbr, dfn, var, samp, kbd, q, s, time, ruby, rt, rp, bdi, bdo, wbr, details, summary, dialog, menu, menuitem, legend, fieldset, optgroup, option, textarea, output, progress, meter, audio, video, source, track, embed, object, param, picture, svg, math, table, tr, thead, tbody, tfoot, col, colgroup, article, section, nav, aside, header, footer, main, figure, address, hr, br, img': {
                'line-height': `${lineHeight} !important`,
                'font-size': `${fontSize}px !important`,
                'color': colorMode === 'night' ? '#FFFFFF !important' : 'inherit',
            },
            // 覆盖所有行内样式
            '[style*="color"]': {
                'color': colorMode === 'night' ? '#FFFFFF !important' : 'inherit',
            },
            '[color]': {
                'color': colorMode === 'night' ? '#FFFFFF !important' : 'inherit',
            },
            'font[color]': {
                'color': colorMode === 'night' ? '#FFFFFF !important' : 'inherit',
            },
            '::selection': {
                'background-color': `${theme.hover.fill} !important`,
            },
            // 防止段落跨页切断
            'p, li, blockquote': {
                'break-inside': 'avoid !important',
                'page-break-inside': 'avoid !important',
            }
        };

        if (isScrollMode) {
            // 滚动模式：使用 max-width 居中
            Object.assign(baseStyles['html, body'], {
                'padding': '20px 0 !important',
            });
            baseStyles['body'] = {
                'max-width': '720px !important',
                'margin-left': 'auto !important',
                'margin-right': 'auto !important',
                'padding-left': '24px !important',
                'padding-right': '24px !important',
            };
        } else {
            // 分页模式：让 epubjs 控制布局，只加少量内边距
            Object.assign(baseStyles['html, body'], {
                'padding': '20px 16px !important',
            });
        }

        rendition.themes.default(baseStyles);

        // Touch detection
        const onTouch = () => { isTouchDevice.current = true; };
        document.addEventListener('touchstart', onTouch, { once: true, passive: true });

        // Hover Logic
        const handlePointerMove = (target) => {
            if (isTouchDevice.current) return;

            const prev = hoveredGRef.current;
            const currentHL = target ? findAncestorHL(target) : null;

            if (prev && currentHL === prev) return;
            if (prev) clearHover();

            if (currentHL && currentHL.getAttribute('data-active') !== 'true') {
                const t = getTheme(themeRef.current);
                // Clear wavy paths at g level before applying hover
                removeAllWavyPaths(currentHL);
                currentHL.querySelectorAll('rect').forEach(r => paintLineHover(r, t));
                hoveredGRef.current = currentHL;
            }
        };

        const onOuterPointerMove = (e) => {
            if (e.pointerType !== 'mouse') return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            handlePointerMove(el);
        };

        const onMouseLeave = () => clearHover();
        const onPointerOut = (e) => { if (!e.relatedTarget) clearHover(); };

        document.addEventListener('pointermove', onOuterPointerMove);
        document.addEventListener('pointerout', onPointerOut);
        container.addEventListener('mouseleave', onMouseLeave);

        // Navigation
        book.loaded.navigation.then(nav => {
            if (nav?.toc) setToc(flattenNav(nav.toc));
        });

        // Selection
        rendition.on('selected', (cfiRange, contents) => {
            const text = contents.window.getSelection()?.toString().trim();
            if (!text) return;
            setCurrentSelection({ text, cfiRange });
            const sel = contents.window.getSelection();
            if (sel?.rangeCount > 0) {
                const rects = sel.getRangeAt(0).getClientRects();
                if (rects.length > 0) {
                    const iframe = contents.document.defaultView?.frameElement;
                    const off = iframe ? iframe.getBoundingClientRect() : { left: 0, top: 0 };
                    const last = rects[rects.length - 1];
                    setFloatingMenu({
                        x: off.left + last.left + last.width / 2,
                        y: off.top + last.top,
                        text, cfiRange, isExisting: false
                    });
                }
            }
        });

        // Mark Clicked
        rendition.on('markClicked', (cfiRange, data) => {
            const g = document.querySelector(`g[data-epubcfi="${CSS.escape(cfiRange)}"]`);
            if (g) {
                const rect = g.getBoundingClientRect();
                const mk = markupsRef.current?.find(m => (m.markup?.cfi_range || m.cfi_range) === cfiRange);
                setFloatingMenu({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                    cfiRange,
                    isExisting: true,
                    markupId: mk?.id || data?.id,
                    text: data?.text || ''
                });
            }
        });

        // Hook into Iframe Content
        rendition.hooks.content.register((contents) => {
            const doc = contents.document;
            const win = contents.window;
            if (!doc) return;

            doc.addEventListener('mouseleave', onMouseLeave);

            // 修复闪烁：只在鼠标不在任何高亮上时才 clearHover
            doc.addEventListener('pointermove', (e) => {
                if (isTouchDevice.current || e.pointerType !== 'mouse') return;
                const el = doc.elementFromPoint(e.clientX, e.clientY);
                const currentHL = el ? findAncestorHL(el) : null;
                if (!currentHL && hoveredGRef.current) {
                    clearHover();
                }
            });

            doc.addEventListener('pointerdown', () => {
                setTimeout(() => {
                    const sel = win.getSelection();
                    if (sel && sel.toString().trim()) return;
                    if (floatingMenuRef.current) {
                        setFloatingMenu(null);
                        setCurrentSelection(null);
                    }
                }, 10);
            });
        });

        rendition.on('rendered', () => {
            rebindAnnotations(rendition, markupsRef.current, lineColorRef.current);
        });

        // TOC 跟随 + 记录当前 href + 保存阅读进度
        rendition.on('relocated', (location) => {
            const href = location?.start?.href;
            const cfi = location?.start?.cfi;
            if (href) {
                currentHrefRef.current = href;
                setLeftPanel(p => ({ ...p, activeTocHref: href }));
            }
            if (cfi && currentBookId) saveReadingProgress(currentBookId, cfi);
        });

        // 自动恢复批注 + 阅读进度
        book.ready.then(async () => {
            const bookId = currentBookId || 'hegel';
            const saved = await getMarkupsWithNotes(bookId);
            if (saved?.length) {
                // 先同步更新 ref，确保 rendered 事件触发时能拿到
                markupsRef.current = saved;
                setMarkups(saved);
            }
            const savedCfi = currentBookId ? loadReadingProgress(currentBookId) : null;
            // await display 完成后再主动 rebind，修复首次渲染时 markupsRef 为空的竞态
            await rendition.display(savedCfi || undefined);
            if (markupsRef.current?.length) {
                rebindAnnotations(rendition, markupsRef.current, lineColorRef.current);
            }
        });

        return () => {
            document.removeEventListener('pointermove', onOuterPointerMove);
            document.removeEventListener('pointerout', onPointerOut);
            document.removeEventListener('touchstart', onTouch);
            container.removeEventListener('mouseleave', onMouseLeave);
            document.querySelectorAll('g.hl').forEach(g => g.remove());
            book.destroy();
        };
    }, [bookUrl, pageMode, highlightTheme, clearHover, setToc, setCurrentSelection, setFloatingMenu, bookRef, renditionRef, theme.hover.fill, currentBookId, setMarkups, setLeftPanel]);

    // Font/Line height + color updates (merged to avoid overwriting each other)
    useEffect(() => {
        if (!renditionRef.current) return;
        const textColor = colorMode === 'night' ? '#FFFFFF' : 'inherit';
        const bgColor = colorMode === 'night' ? '#1a1a1a' : 'inherit';
        const nightColor = colorMode === 'night' ? '#FFFFFF !important' : 'inherit';

        renditionRef.current.themes.fontSize(`${fontSize}px`);
        renditionRef.current.themes.default({
            'html, body': {
                'color': `${textColor} !important`,
                'background-color': `${bgColor} !important`,
            },
            '*': {
                'color': nightColor,
            },
            'p, div, span, li, h1, h2, h3, h4, h5, h6, a, em, strong, b, i, u, blockquote, cite, code, pre, td, th, label, figcaption, caption, small, sub, sup, mark, del, ins, abbr, dfn, var, samp, kbd, q, s, time': {
                'line-height': `${lineHeight} !important`,
                'font-size': `${fontSize}px !important`,
                'color': nightColor,
            },
            '[style*="color"]': { 'color': nightColor },
            '[color]': { 'color': nightColor },
            'font[color]': { 'color': nightColor },
        });
    }, [fontSize, lineHeight, colorMode, renditionRef]);

    // Markups change
    useEffect(() => {
        if (renditionRef.current && markups) {
            rebindAnnotations(renditionRef.current, markups, lineColor);
        }
    }, [markups, lineColor, renditionRef]);

    // Keyboard navigation
    useEffect(() => {
        if (pageMode !== 'paginated') return;
        const h = (e) => {
            if (e.key === 'ArrowLeft') goPrev();
            if (e.key === 'ArrowRight') goNext();
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [pageMode, goPrev, goNext]);

    // Wheel navigation (paginated mode) — 注入到 iframe 内部
    useEffect(() => {
        if (pageMode !== 'paginated' || !renditionRef.current) return;
        let accY = 0;
        let cooldown = false;
        let resetTimer = null;

        const h = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (cooldown) return;

            accY += e.deltaY;

            // 普通鼠标刻度滚轮 deltaMode=1（行）或单次 deltaY 较大，立即触发
            const isClick = e.deltaMode === 1 || Math.abs(e.deltaY) >= 50;

            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => { accY = 0; }, 80);

            if (isClick || Math.abs(accY) >= 60) {
                const dir = accY > 0 ? 'next' : 'prev';
                accY = 0;
                cooldown = true;
                setTimeout(() => { cooldown = false; }, 350);
                if (dir === 'next') goNext();
                else goPrev();
            }
        };
        // 同时绑定外层容器和 iframe 内部 document
        const container = readerDiv.current;
        if (container) container.addEventListener('wheel', h, { passive: false });
        const iframe = container?.querySelector('iframe');
        if (iframe?.contentDocument) {
            iframe.contentDocument.addEventListener('wheel', h, { passive: false });
        }
        // rendition 每次渲染新章节后重新绑定
        const onRendered = () => {
            const newIframe = readerDiv.current?.querySelector('iframe');
            if (newIframe?.contentDocument) {
                newIframe.contentDocument.removeEventListener('wheel', h);
                newIframe.contentDocument.addEventListener('wheel', h, { passive: false });
            }
        };
        renditionRef.current.on('rendered', onRendered);
        return () => {
            if (container) container.removeEventListener('wheel', h);
            const iframe2 = container?.querySelector('iframe');
            if (iframe2?.contentDocument) iframe2.contentDocument.removeEventListener('wheel', h);
            renditionRef.current?.off('rendered', onRendered);
        };
    }, [pageMode, goNext, goPrev, renditionRef]);

    const handlePageClick = (dir) => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim()) return;
        dir === 'prev' ? goPrev() : goNext();
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div ref={readerDiv} style={{
                width: '100%',
                height: '100%',
                overflowY: pageMode === 'scroll' ? 'auto' : 'hidden',
                overflowX: 'hidden',
                boxSizing: 'border-box'
            }} />

            {pageMode === 'paginated' && (
                <>
                    <div
                        onClick={() => handlePageClick('prev')}
                        style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0, width: '45px',
                            cursor: 'w-resize', zIndex: 10
                        }}
                    />
                    <div
                        onClick={() => handlePageClick('next')}
                        style={{
                            position: 'absolute', right: 0, top: 0, bottom: 0, width: '45px',
                            cursor: 'e-resize', zIndex: 10
                        }}
                    />
                </>
            )}
            {/* 上一章节入口 — 两种模式都显示 */}
            <button onClick={goPrevChapter} style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                zIndex: 20, padding: '4px 20px',
                background: colorMode === 'night' ? 'rgba(40,40,40,0.7)' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: 'none', borderRadius: '0 0 12px 12px',
                fontSize: '12px', color: colorMode === 'night' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s',
            }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
            >↑ 上一章节</button>
            {/* 下一章节入口 — 两种模式都显示 */}
            <button onClick={goNextChapter} style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                zIndex: 20, padding: '4px 20px',
                background: colorMode === 'night' ? 'rgba(40,40,40,0.7)' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: 'none', borderRadius: '12px 12px 0 0',
                fontSize: '12px', color: colorMode === 'night' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s',
            }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
            >↓ 下一章节</button>
        </div>
    );
}
