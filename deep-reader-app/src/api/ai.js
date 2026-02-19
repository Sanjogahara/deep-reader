/**
 * Deep Reader Pro — 双模 AI 引擎 (Sprint 10)
 *
 * Local:  Ollama /api/chat  (NDJSON stream)
 * Cloud:  DeepSeek /chat/completions  (SSE stream, OpenAI 兼容)
 *
 * 零第三方依赖，纯浏览器 fetch + ReadableStream
 */

/* ★ Sprint 10 — 结构化输出 Prompt：逻辑拆解 → 一句话总结 → 概念补注 */
const PROMPTS = {
    analyze: `你是一个深度阅读助手。请严格按照以下三个步骤对选中文本进行处理：
1. 【逻辑拆解】：请用最通俗易懂的大白话（类似费曼学习法）拆解这段话的底层逻辑，禁止使用晦涩的学术术语，讲清楚它到底在说什么。
2. 【一句话总结】：基于上述拆解，用一句简练的话概括核心主旨。
3. 【概念补注】：(可选) 如果文本中包含特定的专业名词或难点，请在最后单独列出并解释。

待分析文本：
`,
    translate: '请将以下文本翻译成流畅的中文：\n\n',
};

/**
 * 统一入口
 * @param {string} text       原文
 * @param {'analyze'|'translate'} mode
 * @param {object} config     来自 ReaderContext 的 aiConfig
 * @param {(chunk:string)=>void} onChunk
 * @param {(full:string)=>void}  onDone
 * @param {AbortSignal} signal
 */
export async function streamAI(text, mode, config, onChunk, onDone, signal) {
    const prompt = (PROMPTS[mode] || PROMPTS.analyze) + text;

    if (config.provider === 'cloud') {
        return streamCloud(prompt, config, onChunk, onDone, signal);
    }
    return streamLocal(prompt, config, onChunk, onDone, signal);
}

/* ═══════════════════════════════════════════ */
/*  本地 Ollama — /api/chat (NDJSON)          */
/* ═══════════════════════════════════════════ */
async function streamLocal(prompt, config, onChunk, onDone, signal) {
    const url = `${config.localUrl}/api/chat`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: config.localModel,
            messages: [
                { role: 'user', content: prompt },
            ],
            stream: true,
        }),
        signal,
    });

    if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`Ollama 请求失败 (${res.status}): ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '', buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                const json = JSON.parse(trimmed);
                const chunk = json.message?.content || '';
                if (chunk) { full += chunk; onChunk(chunk); }
                if (json.done) { onDone(full); return full; }
            } catch {}
        }
    }
    if (buffer.trim()) {
        try {
            const json = JSON.parse(buffer.trim());
            const chunk = json.message?.content || '';
            if (chunk) { full += chunk; onChunk(chunk); }
        } catch {}
    }
    onDone(full);
    return full;
}

/* ═══════════════════════════════════════════ */
/*  云端 DeepSeek — OpenAI 兼容 SSE           */
/* ═══════════════════════════════════════════ */
async function streamCloud(prompt, config, onChunk, onDone, signal) {
    const url = 'https://api.deepseek.com/chat/completions';
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.cloudKey}`,
        },
        body: JSON.stringify({
            model: config.cloudModel,
            messages: [
                { role: 'user', content: prompt },
            ],
            stream: true,
        }),
        signal,
    });

    if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`DeepSeek API 失败 (${res.status}): ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '', buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') { onDone(full); return full; }
            try {
                const json = JSON.parse(data);
                const chunk = json.choices?.[0]?.delta?.content || '';
                if (chunk) { full += chunk; onChunk(chunk); }
            } catch {}
        }
    }
    onDone(full);
    return full;
}
