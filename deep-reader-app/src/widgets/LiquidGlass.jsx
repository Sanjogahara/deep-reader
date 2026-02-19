/**
 * LiquidGlass.jsx — 黑夜模式优化版
 * 修复：阴影畸变、亮度阶梯、内外层颜色一致性
 * 风格：Minimalist Tech (Apple + Vercel Geist)
 */

import React, { useRef, useState, useEffect, useId, useCallback } from 'react';
import { ShaderDisplacementGenerator, fragmentShaders } from './liquid-shader.js';

const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function LiquidGlass({
    children,
    displacementScale = 14,
    blurAmount = 0.05,
    saturation = 110,
    elasticity = 0.05,
    borderRadius = '16px',
    fragment = 'liquidGlassSubtle',
    disableTilt = false,
    disableHover = false,  // 新增：禁用悬停效果（用于阅读区）
    interactive = true,
    style = {},
    ...rest
}) {
    const uniqueId = useId().replace(/:/g, '_');
    const filterId = `lg_${uniqueId}`;
    const containerRef = useRef(null);
    const [mapUrl, setMapUrl] = useState(null);
    const [size, setSize] = useState({ w: 200, h: 150 });

    // 交互状态
    const [isHovered, setIsHovered] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // 是否启用交互效果
    const enableInteraction = interactive && !disableHover;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const fragmentFn = fragmentShaders[fragment] || fragmentShaders.liquidGlassSubtle;
        let gen = null;
        let debounceTimer = null;

        const regenerate = (width, height) => {
            if (gen) gen.destroy();
            const w = Math.max(Math.round(width / 4), 50);
            const h = Math.max(Math.round(height / 4), 40);
            setSize({ w: Math.round(width), h: Math.round(height) });
            gen = new ShaderDisplacementGenerator({ width: w, height: h, fragment: fragmentFn });
            setMapUrl(gen.updateShader());
        };

        const measure = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) regenerate(rect.width, rect.height);
            }, 150);
        };

        // 初始化立即执行，不 debounce
        const rect = el.getBoundingClientRect();
        regenerate(rect.width || 200, rect.height || 150);

        const ro = new ResizeObserver(measure);
        ro.observe(el);
        window.addEventListener('resize', measure, { passive: true });

        return () => {
            clearTimeout(debounceTimer);
            ro.disconnect();
            window.removeEventListener('resize', measure);
            if (gen) gen.destroy();
        };
    }, [fragment]);

    // 鼠标移动追踪（用于倾斜效果）
    const handleMouseMove = useCallback((e) => {
        if (disableTilt || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        setMousePos({ x, y });
    }, [disableTilt]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
    }, []);

    // 计算动态变换 - 移除会导致轮廓变形的 scale
    const getTransform = () => {
        if (!enableInteraction) return 'translate3d(0,0,0)';

        const hoverLift = isHovered ? 'translate3d(0,-1px,0)' : 'translate3d(0,0,0)';

        // 倾斜效果 - 减小角度避免边缘畸变
        let tilt = '';
        if (!disableTilt && isHovered) {
            const rotateX = -mousePos.y * 1.5;
            const rotateY = mousePos.x * 1.5;
            tilt = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }

        return `${hoverLift} ${tilt}`.trim();
    };

    // 动态透明度 - hover/active 时提亮
    const getAlpha = () => {
        if (!enableInteraction) return 'var(--glass-alpha)';
        if (isActive) return 'calc(var(--glass-alpha) + 0.12)';
        if (isHovered) return 'calc(var(--glass-alpha) + 0.06)';
        return 'var(--glass-alpha)';
    };

    // 动态阴影 - 修复黑夜模式畸变，使用更柔和的阴影，消除锯齿
    const getShadow = () => {
        const innerGlow = 'inset 0 1px 0 rgba(255,255,255,0.08)';
        const innerBorder = 'inset 0 0 0 0.5px rgba(255,255,255,0.1)';

        if (!enableInteraction) {
            return `0 4px 16px var(--shadow-color)`;
        }
        if (isActive) {
            return `${innerGlow}, ${innerBorder}, 0 2px 8px var(--shadow-color)`;
        }
        if (isHovered) {
            // 悬停时加深阴影，增强 3D 立体感
            return `${innerGlow}, ${innerBorder}, 0 12px 32px var(--shadow-color), 0 4px 12px rgba(0,0,0,0.08)`;
        }
        return `${innerGlow}, ${innerBorder}, 0 6px 20px var(--shadow-color)`;
    };

    return (
        <div
            ref={containerRef}
            onMouseEnter={() => enableInteraction && setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            onMouseDown={() => enableInteraction && setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius,
                transform: getTransform(),
                transition: enableInteraction ? 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                willChange: enableInteraction ? 'transform' : 'auto',
                ...style
            }}
            {...rest}
        >
            {/* SVG 滤镜定义 */}
            {mapUrl && (
                <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none', opacity: 0 }}>
                    <defs>
                        <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
                            <feImage href={mapUrl} result="dispMap" width={size.w} height={size.h} preserveAspectRatio="none" />
                            <feDisplacementMap in="SourceGraphic" in2="dispMap" scale={displacementScale} xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                    </defs>
                </svg>
            )}

            {/* 背景层 - 统一边距避免内外层不一致，消除锯齿 */}
            <div style={{
                position: 'absolute',
                inset: '0',
                zIndex: 0,
                borderRadius,
                background: `rgba(var(--glass-bg-rgb), ${getAlpha()})`,
                backdropFilter: `blur(${4 + blurAmount * 12}px) saturate(${saturation}%)`,
                WebkitBackdropFilter: `blur(${4 + blurAmount * 12}px) saturate(${saturation}%)`,
                filter: mapUrl ? `url(#${filterId})` : 'none',
                boxShadow: getShadow(),
                transition: enableInteraction ? 'box-shadow 0.2s ease, background 0.2s ease' : 'none',
                // 消除锯齿 - 强制 GPU 渲染 + 抗锯齿
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'translate3d(0,0,0)',
                // 关键：使用 outline 强制抗锯齿
                outline: '1px solid transparent',
                WebkitMaskImage: '-webkit-radial-gradient(white, black)',
            }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius, backgroundImage: NOISE, opacity: 0.015, mixBlendMode: 'overlay' }} />
            </div>

            {/* 高光层 - hover 时显示，更微妙 */}
            {enableInteraction && (
                <div style={{
                    position: 'absolute',
                    inset: '0',
                    zIndex: 1,
                    borderRadius,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 40%)',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    pointerEvents: 'none',
                }} />
            )}

            <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
                {children}
            </div>
        </div>
    );
}

export function LiquidGlassCard({ children, style = {}, onClick, interactive = true, ...rest }) {
    const [isHovered, setIsHovered] = useState(false);
    const [isActive, setIsActive] = useState(false);

    // 动态背景亮度
    const getBg = () => {
        if (isActive) return 'var(--card-bg-active, var(--card-bg))';
        if (isHovered) return 'var(--card-bg-hover, var(--card-bg))';
        return 'var(--card-bg)';
    };

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => interactive && setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
            onMouseDown={() => interactive && setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            style={{
                position: 'relative', borderRadius: '14px', overflow: 'hidden',
                background: getBg(), cursor: onClick ? 'pointer' : 'default',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHovered && !isActive ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: isHovered
                    ? '0 6px 20px var(--shadow-color), inset 0 1px 0 rgba(255,255,255,0.06)'
                    : '0 2px 8px var(--shadow-color), inset 0 1px 0 rgba(255,255,255,0.04)',
                ...style
            }}
            {...rest}
        >
            {children}
        </div>
    );
}