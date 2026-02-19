// 核心算法：像素级置换生成器
// 移植自 liquid-glass-react/src/shader-utils.ts

function smoothStep(a, b, t) {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function length(x, y) {
  return Math.sqrt(x * x + y * y);
}

// 核心：计算点到圆角矩形边缘的距离
// 修正：引入 aspect ratio 逻辑，防止变形
function roundedRectSDF(x, y, width, height, radius) {
  const qx = Math.abs(x) - width + radius;
  const qy = Math.abs(y) - height + radius;
  return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}

// ── 定义具体的 Shader 函数 ──
// 接收归一化坐标 (nx, ny) 和宽高比 (aspect)
// 返回置换强度 scalar (0.0 ~ 1.0)

const liquidGlass = (nx, ny, aspect) => {
  const boxWidth = 0.46 * aspect;
  const boxHeight = 0.46;
  const radius = 0.12;
  const dist = roundedRectSDF(nx, ny, boxWidth, boxHeight, radius);
  return smoothStep(0.15, 0.0, dist + 0.02) * 0.5;
};

const liquidGlassSubtle = (nx, ny, aspect) => {
  const boxWidth = 0.47 * aspect;
  const boxHeight = 0.47;
  const radius = 0.14;
  const dist = roundedRectSDF(nx, ny, boxWidth, boxHeight, radius);
  return smoothStep(0.25, 0.0, dist + 0.01) * 0.35;
};

// ★ 导出 fragmentShaders 供组件使用
export const fragmentShaders = {
  liquidGlass,
  liquidGlassSubtle
};

export class ShaderDisplacementGenerator {
  constructor(options) {
    this.options = options;
    this.canvas = document.createElement("canvas");
    // 使用设备像素比以保证高清，防止锯齿
    this.dpr = window.devicePixelRatio || 1;
    this.width = options.width;
    this.height = options.height;
    
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.context = this.canvas.getContext("2d");
  }

  destroy() {
    this.width = 0;
    this.height = 0;
    this.canvas = null;
    this.context = null;
  }

  updateShader(mousePosition) {
    if (!this.context) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const aspect = w / h; // 关键：计算宽高比

    // 获取当前选用的 Shader 函数，默认为 liquidGlass
    const fragmentFn = this.options.fragment || liquidGlass;

    // 重新获取上下文以清空
    const ctx = this.context;
    ctx.clearRect(0, 0, w, h);
    
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    let maxScale = 0;
    // 预计算偏移量的数组
    const rawValues = new Float32Array(w * h * 2); 

    // 第一步：计算物理偏移量
    let ptr = 0;
    for (let y = 0; y < h; y++) {
      // 归一化 Y 坐标 (-0.5 到 0.5)
      const ny = (y / h) - 0.5;
      
      for (let x = 0; x < w; x++) {
        // 归一化 X 坐标，并乘以宽高比以修正拉伸
        const nx = ((x / w) - 0.5) * aspect;

        // ★ 调用传入的 fragmentFn 计算置换强度
        const displacement = fragmentFn(nx, ny, aspect);
        
        // 基于法线方向的偏移
        // 简单的近似：从中心向外推
        const dirX = nx;
        const dirY = ny;
        const len = length(dirX, dirY) || 1;
        
        // 最终偏移量
        const dx = (dirX / len) * displacement;
        const dy = (dirY / len) * displacement;

        rawValues[ptr++] = dx;
        rawValues[ptr++] = dy;

        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
      }
    }

    // 归一化因子
    if (maxScale > 0) maxScale = Math.max(maxScale, 0.5); // 防止除以0或过小

    // 第二步：将偏移量编码为 RGB 颜色
    // R 通道 = X 偏移, G 通道 = Y 偏移
    // 128 (0x80) 是零偏移点
    ptr = 0;
    for (let i = 0; i < w * h; i++) {
      const dx = rawValues[ptr++];
      const dy = rawValues[ptr++];

      // 映射 -maxScale ~ +maxScale 到 0 ~ 255
      // 0.5 是基准点 (灰色)
      const r = Math.min(255, Math.max(0, ((dx / maxScale) * 0.5 + 0.5) * 255));
      const g = Math.min(255, Math.max(0, ((dy / maxScale) * 0.5 + 0.5) * 255));

      const idx = i * 4;
      data[idx] = r;     // Red -> X Displacement
      data[idx + 1] = g; // Green -> Y Displacement
      data[idx + 2] = 128; // Blue (未使用，设为中性)
      data[idx + 3] = 255; // Alpha
    }

    ctx.putImageData(imageData, 0, 0);
    return this.canvas.toDataURL();
  }
}