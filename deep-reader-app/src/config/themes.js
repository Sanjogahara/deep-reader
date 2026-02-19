export const JELLY_THEMES = {
    yellow: { name: '经典暖黄', base: { fill: '#FFD60A', opacity: '0.15' }, hover: { fill: '#FFCA28', opacity: '0.30' }, active: { fill: '#FFB300', opacity: '0.24' }, accent: '#FFB300', accentLight: '#FFF3C4' },
    blue: { name: '通透蓝', base: { fill: '#5AC8FA', opacity: '0.16' }, hover: { fill: '#40B0FF', opacity: '0.30' }, active: { fill: '#007AFF', opacity: '0.22' }, accent: '#007AFF', accentLight: '#E3F2FF' },
    green: { name: '护眼绿', base: { fill: '#34C759', opacity: '0.14' }, hover: { fill: '#30B350', opacity: '0.28' }, active: { fill: '#248A3D', opacity: '0.22' }, accent: '#248A3D', accentLight: '#DFF5E3' },
    lavender: { name: '薰衣草', base: { fill: '#BF5AF2', opacity: '0.12' }, hover: { fill: '#A855F7', opacity: '0.26' }, active: { fill: '#7C3AED', opacity: '0.20' }, accent: '#7C3AED', accentLight: '#F3E8FF' },
    rose: { name: '玫瑰粉', base: { fill: '#FF6B8A', opacity: '0.14' }, hover: { fill: '#F43F5E', opacity: '0.28' }, active: { fill: '#E11D48', opacity: '0.22' }, accent: '#E11D48', accentLight: '#FFE4EA' },
};
export const DEFAULT_THEME = 'blue';
export const THEME_KEYS = Object.keys(JELLY_THEMES);
export function getAppCSSVars(k) {
    const t = JELLY_THEMES[k] || JELLY_THEMES[DEFAULT_THEME];
    return { '--theme-accent': t.accent, '--theme-accent-light': t.accentLight, '--theme-base-fill': t.base.fill };
}
