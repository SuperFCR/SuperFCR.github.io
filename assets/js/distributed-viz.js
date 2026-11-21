/* Interactive distributed LLM training laboratories (bilingual EN / ZH-CN, light/dark native).
   Mounts onto .viz-lab[data-viz="..."] containers in blogs/distributed-training/. */
(() => {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';
    const isZh = document.documentElement.lang === 'zh-CN';
    const TXT = isZh ? {
        play: '▶ 播放动画', pause: '⏸ 暂停', step: '下一步 →', reset: '重置',
        fwd: '前向', bwd: '反向', hops: '跳数', sync: '同步',
    } : {
        play: '▶ Play', pause: '⏸ Pause', step: 'Step →', reset: 'Reset',
        fwd: 'Forward', bwd: 'Backward', hops: 'Hops', sync: 'Sync',
    };

    const t = (en, zh) => (isZh ? zh : en);

    function el(tag, attrs, text) {
        const node = document.createElementNS(NS, tag);
        if (attrs) {
            for (const [k, v] of Object.entries(attrs)) {
                if (v !== null && v !== undefined) node.setAttribute(k, String(v));
            }
        }
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
    }

    function h(tag, cls, text) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
    }

    function addDefs(svg) {
        const defs = el('defs');
        const markers = [
            ['mNavy', 'var(--vz-navy)'],
            ['mTeal', 'var(--vz-teal)'],
            ['mAmber', 'var(--vz-amber)'],
            ['mPlum', 'var(--vz-plum)'],
            ['mRed', 'var(--vz-red)'],
            ['mMuted', 'var(--vz-muted)'],
        ];
        for (const [id, fill] of markers) {
            const mk = el('marker', {
                id, viewBox: '0 0 10 10', refX: '8', refY: '5',
                markerWidth: '5.5', markerHeight: '5.5', orient: 'auto',
            });
            mk.appendChild(el('path', { d: 'M 0 1.5 L 8.5 5 L 0 8.5 z', fill }));
            defs.appendChild(mk);
        }
        svg.appendChild(defs);
        return defs;
    }

    function createShell(root, opts) {
        root.innerHTML = '';
        const head = h('div', 'viz-head');
        const headLeft = h('div', 'viz-head-left');
        headLeft.appendChild(h('span', 'viz-eyebrow', opts.eyebrow));
        headLeft.appendChild(h('h4', 'viz-title', opts.title));
        head.appendChild(headLeft);
        if (opts.hint) head.appendChild(h('span', 'viz-hint', opts.hint));

        const controls = h('div', 'viz-controls');
        const stage = h('div', 'viz-stage');
        const svg = el('svg', { viewBox: opts.viewBox, role: 'img', 'aria-label': opts.title });
        stage.appendChild(svg);
        const metrics = h('div', 'viz-metrics');
        const caption = h('div', 'viz-caption');

        root.append(head, controls, stage, metrics, caption);
        return { controls, svg, metrics, caption };
    }

    function makeBtn(label, onClick, extraCls) {
        const b = h('button', 'viz-btn' + (extraCls ? ' ' + extraCls : ''), label);
        b.type = 'button';
        b.addEventListener('click', onClick);
        return b;
    }

    function setMetrics(container, items) {
        container.innerHTML = '';
        for (const item of items) {
            const pill = h('div', 'viz-metric');
            pill.appendChild(h('span', 'viz-metric-label', item.label));
            const val = h('span', 'viz-metric-val' + (item.tone ? ' is-' + item.tone : ''), item.val);
            pill.appendChild(val);
            container.appendChild(pill);
        }
    }

    function makeLoop(tickFn, intervalMs) {
        let timer = null;
        return {
            isPlaying: () => timer !== null,
            stop(btn) {
                if (timer !== null) {
                    window.clearInterval(timer);
                    timer = null;
                }
                if (btn) btn.textContent = TXT.play;
            },
            toggle(btn) {
                if (timer !== null) {
                    this.stop(btn);
                } else {
                    if (btn) btn.textContent = TXT.pause;
                    tickFn();
                    timer = window.setInterval(tickFn, intervalMs);
                }
            },
        };
    }

    const COLORS = [
        { fill: 'var(--vz-navy-bg)', stroke: 'var(--vz-navy)', ink: 'var(--vz-navy)' },
        { fill: 'var(--vz-teal-bg)', stroke: 'var(--vz-teal)', ink: 'var(--vz-teal)' },
        { fill: 'var(--vz-amber-bg)', stroke: 'var(--vz-amber)', ink: 'var(--vz-amber)' },
        { fill: 'var(--vz-plum-bg)', stroke: 'var(--vz-plum)', ink: 'var(--vz-plum)' },
    ];

    /* =====================================================================
       LAB 1: Interactive 2D Device Mesh (8 x 4 = 32 GPUs) & Y-Collectives
       ===================================================================== */
    function initMeshLab(root, demoActive) {
        const { controls, svg, metrics, caption } = createShell(root, {
            eyebrow: t('Interactive Lab 1 · Named-Axis Mesh', '交互实验室 1 · 命名设备网格'),
            title: t('Mesh(X=8, Y=4) Sharding & Collective Resharding Explorer', '32 卡二维网格 Mesh(X=8, Y=4) 分片与集合变换演练'),
            hint: t('Click any GPU tile to inspect its local slice', '点击任意 GPU 格子查看本地分片'),
            viewBox: '0 0 880 338',
        });

        const state = {
            mode: 'EY_F',
            op: demoActive ? 'A2A' : 'NONE',
            selX: 0,
            selY: 1,
        };

        const gModes = h('div', 'viz-btn-group');
        const modes = [
            ['EY_F', 'A[E_Y, F]'],
            ['EXY_F', 'A[E_XY, F]'],
            ['EY_FX', 'A[E_Y, F_X]'],
            ['EY_FY', 'A[E_Y, F_Y] ✗'],
        ];
        const modeBtns = {};
        for (const [id, lbl] of modes) {
            const cls = id === 'EY_FY' ? 'is-danger' : '';
            const b = makeBtn(lbl, () => {
                state.mode = id;
                state.op = 'NONE';
                render();
            }, cls);
            modeBtns[id] = b;
            gModes.appendChild(b);
        }

        const gOps = h('div', 'viz-btn-group');
        const btnAG = makeBtn('AllGather_Y', () => {
            state.mode = 'EY_F';
            state.op = state.op === 'AG' ? 'NONE' : 'AG';
            render();
        }, 'is-play');
        const btnA2A = makeBtn('AllToAll_Y', () => {
            state.mode = 'EY_F';
            state.op = state.op === 'A2A' ? 'NONE' : 'A2A';
            render();
        }, 'is-amber');
        const btnRst = makeBtn(TXT.reset, () => {
            state.mode = 'EY_F';
            state.op = 'NONE';
            state.selX = 0;
            state.selY = 1;
            render();
        });
        gOps.append(btnAG, btnA2A, btnRst);
        controls.append(gModes, gOps);

        function render() {
            for (const [k, b] of Object.entries(modeBtns)) b.classList.toggle('is-active', state.mode === k);
            btnAG.classList.toggle('is-active', state.op === 'AG');
            btnA2A.classList.toggle('is-active', state.op === 'A2A');

            svg.innerHTML = '';
            addDefs(svg);

            // Column headers Y=0..3
            svg.appendChild(el('text', { x: 46, y: 24, 'font-size': 12, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--vz-muted)' }, 'X \\ Y'));
            for (let y = 0; y < 4; y++) {
                svg.appendChild(el('text', {
                    x: 132 + y * 130, y: 24, 'text-anchor': 'middle',
                    'font-size': 12.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--vz-ink)',
                }, `Y = ${y}`));
            }

            // 8x4 GPU Grid
            for (let x = 0; x < 8; x++) {
                const cy = 50 + x * 34;
                svg.appendChild(el('text', {
                    x: 34, y: cy + 5, 'text-anchor': 'middle',
                    'font-size': 12, 'font-family': 'var(--mono)', 'font-weight': 700,
                    fill: x === state.selX ? 'var(--primary)' : 'var(--vz-muted)',
                }, `X=${x}`));

                for (let y = 0; y < 4; y++) {
                    const gx = 72 + y * 130;
                    const gy = 34 + x * 34;
                    const selected = x === state.selX && y === state.selY;
                    const g = el('g', { style: 'cursor:pointer' });
                    g.addEventListener('click', () => { state.selX = x; state.selY = y; render(); });

                    if (state.mode === 'EY_F' && state.op === 'AG') {
                        // Show full 4-band matrix inside every GPU
                        g.appendChild(el('rect', {
                            x: gx, y: gy, width: 120, height: 28, rx: 5,
                            fill: 'var(--vz-card-bg)', stroke: selected ? 'var(--primary)' : 'var(--vz-navy)',
                            'stroke-width': selected ? 2.4 : 1.4,
                        }));
                        for (let s = 0; s < 4; s++) {
                            g.appendChild(el('rect', {
                                x: gx + 3 + s * 28.5, y: gy + 3, width: 27, height: 7, rx: 1.5,
                                fill: COLORS[s].stroke, opacity: 0.85,
                            }));
                        }
                        g.appendChild(el('text', {
                            x: gx + 60, y: gy + 23, 'text-anchor': 'middle',
                            'font-size': 10.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--vz-ink)',
                        }, '[2048,8192] 32M'));
                    } else if (state.mode === 'EY_F' && state.op === 'A2A') {
                        const c = COLORS[y];
                        g.appendChild(el('rect', {
                            x: gx, y: gy, width: 120, height: 28, rx: 5,
                            fill: c.fill, stroke: selected ? 'var(--primary)' : c.stroke,
                            'stroke-width': selected ? 2.6 : 1.5,
                        }));
                        // Small vertical strip bar showing all 2048 rows x 1/4 cols
                        g.appendChild(el('rect', {
                            x: gx + 5, y: gy + 4, width: 10, height: 20, rx: 2,
                            fill: c.stroke,
                        }));
                        g.appendChild(el('text', {
                            x: gx + 67, y: gy + 18, 'text-anchor': 'middle',
                            'font-size': 10.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: c.ink,
                        }, `C${y}: [2048,2048]`));
                    } else if (state.mode === 'EY_F') {
                        const c = COLORS[y];
                        const r0 = y * 512;
                        g.appendChild(el('rect', {
                            x: gx, y: gy, width: 120, height: 28, rx: 5,
                            fill: c.fill, stroke: selected ? 'var(--primary)' : c.stroke,
                            'stroke-width': selected ? 2.6 : 1.3,
                        }));
                        g.appendChild(el('text', {
                            x: gx + 60, y: gy + 18, 'text-anchor': 'middle',
                            'font-size': 11, 'font-family': 'var(--mono)', 'font-weight': 700, fill: c.ink,
                        }, `R ${r0}–${r0 + 511}`));
                    } else if (state.mode === 'EXY_F') {
                        const idx = x * 4 + y;
                        const c = COLORS[(x + y) % 4];
                        const r0 = idx * 64;
                        g.appendChild(el('rect', {
                            x: gx, y: gy, width: 120, height: 28, rx: 5,
                            fill: 'var(--vz-tile-bg)', stroke: selected ? 'var(--primary)' : c.stroke,
                            'stroke-width': selected ? 2.6 : 1.2,
                        }));
                        g.appendChild(el('text', {
                            x: gx + 60, y: gy + 18, 'text-anchor': 'middle',
                            'font-size': 11, 'font-family': 'var(--mono)', 'font-weight': 700, fill: c.ink,
                        }, `#${idx} R${r0}–${r0 + 63}`));
                    } else if (state.mode === 'EY_FX') {
                        const c = COLORS[y];
                        g.appendChild(el('rect', {
                            x: gx, y: gy, width: 120, height: 28, rx: 5,
                            fill: c.fill, stroke: selected ? 'var(--primary)' : c.stroke,
                            'stroke-width': selected ? 2.6 : 1.2,
                        }));
                        g.appendChild(el('text', {
                            x: gx + 60, y: gy + 18, 'text-anchor': 'middle',
                            'font-size': 10, 'font-family': 'var(--mono)', 'font-weight': 700, fill: c.ink,
                        }, `(${y},${x}) 512×1024`));
                    } else {
                        // Invalid A[E_Y, F_Y]
                        const diag = (x % 4) === y;
                        g.appendChild(el('rect', {
                            x: gx, y: gy, width: 120, height: 28, rx: 5,
                            fill: diag ? 'var(--vz-red-bg)' : 'var(--vz-card-bg)',
                            stroke: selected ? 'var(--primary)' : (diag ? 'var(--vz-red)' : 'var(--vz-line)'),
                            'stroke-width': selected ? 2.4 : 1.2,
                            'stroke-dasharray': diag ? null : '4 3',
                        }));
                        g.appendChild(el('text', {
                            x: gx + 60, y: gy + 18, 'text-anchor': 'middle',
                            'font-size': 10.5, 'font-family': 'var(--mono)', 'font-weight': 700,
                            fill: diag ? 'var(--vz-red)' : 'var(--vz-muted)',
                        }, diag ? `diag (${y},${y})` : '∅ orphan'));
                    }
                    svg.appendChild(g);
                }

                // Animated Y-group collective indicator arrow along row 0
                if (state.mode === 'EY_F' && state.op !== 'NONE' && x === 0) {
                    const col = state.op === 'AG' ? 'var(--vz-teal)' : 'var(--vz-amber)';
                    const mk = state.op === 'AG' ? 'url(#mTeal)' : 'url(#mAmber)';
                    svg.appendChild(el('line', {
                        x1: 125, y1: 68, x2: 525, y2: 68,
                        stroke: col, 'stroke-width': 2.2, 'stroke-dasharray': '5 3',
                        'marker-end': mk, class: 'vz-pulse',
                    }));
                }
            }

            // Right Inspector Card: selected GPU (selX, selY) inside global 2048 x 8192 matrix
            const ix = 602, iy = 34, iw = 264, ih = 274;
            svg.appendChild(el('rect', {
                x: ix, y: iy, width: iw, height: ih, rx: 10,
                fill: 'var(--vz-card-bg)', stroke: 'var(--border-strong)', 'stroke-width': 1.4,
            }));
            svg.appendChild(el('text', {
                x: ix + 16, y: iy + 26, 'font-size': 13.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--primary)',
            }, t(`Inspect GPU (X=${state.selX}, Y=${state.selY})`, `查看 GPU (X=${state.selX}, Y=${state.selY})`)));

            svg.appendChild(el('text', {
                x: ix + 16, y: iy + 46, 'font-size': 11.5, 'font-family': 'var(--sans)', fill: 'var(--vz-muted)',
            }, t('Global A [E=2048, F=8192]', '全局矩阵 A [E=2048, F=8192]')));

            // Matrix silhouette box: w=220, h=144
            const mx = ix + 22, my = iy + 62, mw = 220, mh = 136;
            svg.appendChild(el('rect', {
                x: mx, y: my, width: mw, height: mh, rx: 4,
                fill: 'var(--vz-tile-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1.3,
            }));
            // Grid lines for visual orientation (4 Y-rows and/or 8 X-cols)
            for (let s = 1; s < 4; s++) {
                svg.appendChild(el('line', { x1: mx, y1: my + s * (mh / 4), x2: mx + mw, y2: my + s * (mh / 4), stroke: 'var(--vz-line)', 'stroke-dasharray': '3 3' }));
            }

            let hl = { x: mx, y: my, w: mw, h: mh, fill: COLORS[state.selY].stroke, label: '', mem: '8 MiB', shape: '[512, 8192]', rep: t('8× (along X)', '8×（沿 X 轴复制）') };
            if (state.mode === 'EY_F' && state.op === 'NONE') {
                hl = {
                    x: mx, y: my + state.selY * (mh / 4), w: mw, h: mh / 4,
                    fill: COLORS[state.selY].stroke,
                    shape: '[512, 8192]', mem: '8 MiB', rep: t('8× (along X)', '8×（沿 X 轴复制）'),
                };
            } else if (state.mode === 'EY_F' && state.op === 'AG') {
                hl = {
                    x: mx, y: my, w: mw, h: mh,
                    fill: 'var(--vz-teal)',
                    shape: '[2048, 8192]', mem: '32 MiB (4×)', rep: t('32× (all GPUs)', '32×（全卡完整）'),
                };
            } else if (state.mode === 'EY_F' && state.op === 'A2A') {
                hl = {
                    x: mx + state.selY * (mw / 4), y: my, w: mw / 4, h: mh,
                    fill: 'var(--vz-amber)',
                    shape: '[2048, 2048]', mem: '8 MiB (1×)', rep: t('8× (along X)', '8×（沿 X 轴复制）'),
                };
            } else if (state.mode === 'EXY_F') {
                const idx = state.selX * 4 + state.selY;
                hl = {
                    x: mx, y: my + idx * (mh / 32), w: mw, h: Math.max(4.2, mh / 32),
                    fill: 'var(--vz-navy)',
                    shape: '[64, 8192]', mem: '1 MiB', rep: t('1× (no replica)', '1×（无冗余副本）'),
                };
            } else if (state.mode === 'EY_FX') {
                for (let c = 1; c < 8; c++) {
                    svg.appendChild(el('line', { x1: mx + c * (mw / 8), y1: my, x2: mx + c * (mw / 8), y2: my + mh, stroke: 'var(--vz-line)', 'stroke-dasharray': '2 3' }));
                }
                hl = {
                    x: mx + state.selX * (mw / 8), y: my + state.selY * (mh / 4), w: mw / 8, h: mh / 4,
                    fill: COLORS[state.selY].stroke,
                    shape: '[512, 1024]', mem: '1 MiB', rep: t('1× (no replica)', '1×（无冗余副本）'),
                };
            } else {
                const diag = (state.selX % 4) === state.selY;
                hl = {
                    x: mx + state.selY * (mw / 4), y: my + state.selY * (mh / 4), w: mw / 4, h: mh / 4,
                    fill: diag ? 'var(--vz-red)' : 'var(--vz-muted)',
                    shape: diag ? t('Diagonal only!', '仅剩对角块！') : t('Missing 12/16!', '缺失 12/16 块！'), mem: 'INVALID', rep: t('Broken sharding', '分片非法失效'),
                };
            }

            svg.appendChild(el('rect', {
                x: hl.x, y: hl.y, width: hl.w, height: hl.h, rx: 2,
                fill: hl.fill, opacity: 0.78,
            }));

            svg.appendChild(el('text', {
                x: ix + 16, y: iy + 224, 'font-size': 12.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--vz-ink)',
            }, `Local: ${hl.shape}`));
            svg.appendChild(el('text', {
                x: ix + 16, y: iy + 244, 'font-size': 12.5, 'font-family': 'var(--mono)', fill: 'var(--vz-ink)',
            }, `HBM: ${hl.mem} (BF16)`));
            svg.appendChild(el('text', {
                x: ix + 16, y: iy + 263, 'font-size': 12, 'font-family': 'var(--sans)', fill: 'var(--vz-muted)',
            }, t(`Replicas across mesh: ${hl.rep}`, `全网副本数：${hl.rep}`)));

            setMetrics(metrics, [
                { label: t('Local Shape', '单卡局部形状'), val: hl.shape, tone: state.mode === 'EY_FY' ? 'bad' : '' },
                { label: t('BF16 / GPU', '单卡显存'), val: hl.mem, tone: state.op === 'AG' ? 'warn' : (state.op === 'A2A' ? 'good' : '') },
                { label: t('Cluster Copies', '整网副本数'), val: hl.rep },
            ]);

            if (state.mode === 'EY_F' && state.op === 'NONE') {
                caption.innerHTML = t(
                    '<strong>Why 8 MiB instead of 1 MiB?</strong> Subscript <code>E_Y</code> shards rows across only the 4 GPUs on axis <code>Y</code> (512 rows/card), while repeating those same 4 shards identically across all 8 groups on <code>X</code>. Click <code>AllGather_Y</code> or <code>AllToAll_Y</code> above to animate the difference.',
                    '<strong>为什么每卡是 8 MiB 而不是 1 MiB？</strong>下标 <code>E_Y</code> 只把 2048 行切给 <code>Y</code> 轴的 4 张卡（每卡 512 行），而在 <code>X</code> 轴上共有 8 组完全相同的副本！点击上方 <code>AllGather_Y</code> 或 <code>AllToAll_Y</code> 观察动态变换。'
                );
            } else if (state.mode === 'EY_F' && state.op === 'AG') {
                caption.innerHTML = t(
                    '<strong>AllGather_Y ([E_Y, F] → [E, F]):</strong> Each 4-GPU <code>Y</code>-group gathers all 2048 rows cleanly. Notice if each card had only 64 rows, <code>AllGather_Y</code> could only assemble 64 × 4 = 256 rows!',
                    '<strong>AllGather_Y（[E_Y, F] → [E, F]）：</strong>每个 4 卡 <code>Y</code> 组在内部凑齐全部 2048 行（32 MiB/卡）。反过来验证：若每卡真只拿 64 行，组内 AllGather 最多拼出 64 × 4 = 256 行！'
                );
            } else if (state.mode === 'EY_F' && state.op === 'A2A') {
                caption.innerHTML = t(
                    '<strong>AllToAll_Y ([E_Y, F] → [E, F_Y]):</strong> Each card slices its 8192 columns into 4 chunks and ships chunk <code>j</code> to GPU <code>j</code>, swapping row-sharding into column-sharding while holding per-GPU footprint constant at <code>8 MiB</code>.',
                    '<strong>AllToAll_Y（[E_Y, F] → [E, F_Y]）：</strong>每卡把 8192 列切成 4 段发给目标卡再沿行拼好，无冗余地把“按行分片”转换成“按列分片”，单卡占用恒定为 <code>8 MiB</code>。'
                );
            } else if (state.mode === 'EXY_F') {
                caption.innerHTML = t(
                    '<strong>Full 32-way Shard A[E_XY, F]:</strong> Only when BOTH <code>X</code> and <code>Y</code> appear in the subscript does every card shrink to <code>2048 / 32 = 64</code> rows (<code>1 MiB/GPU</code>, zero replicas).',
                    '<strong>真切给全部 32 张卡 A[E_XY, F]：</strong>只有下标同时写出 <code>XY</code>，2048 行才会分摊给所有 32 张卡（每卡 64 行 = 1 MiB，全集群仅存 1 份完整拷贝）。'
                );
            } else if (state.mode === 'EY_FX') {
                caption.innerHTML = t(
                    '<strong>2D Orthogonal Shard A[E_Y, F_X]:</strong> Splitting rows across <code>Y</code> (4) and columns across <code>X</code> (8) shrinks each card to a unique <code>[512, 1024]</code> block (1 MiB) with zero waste.',
                    '<strong>二维正交切分 A[E_Y, F_X]：</strong>行沿 <code>Y</code>（4卡）切、列沿 <code>X</code>（8卡）切，32 张卡各持互异的 <code>[512, 1024]</code> 矩形块（1 MiB/卡）。'
                );
            } else {
                caption.innerHTML = t(
                    '<strong>Forbidden Shard A[E_Y, F_Y]:</strong> Reusing mesh axis <code>Y</code> for two tensor dimensions strands off-diagonal matrix blocks—only the 4 diagonal blocks <code>(y, y)</code> exist anywhere in the cluster!',
                    '<strong>禁止重用物理轴 A[E_Y, F_Y]：</strong>用同一条硬件轴同时切行和列会导致只剩下主对角线上的 4 块 <code>(y,y)</code>，所有非对角元素无处安放！'
                );
            }
        }

        if (demoActive) state.selY = 0;
        render();
    }

    /* =====================================================================
       LAB 2: Ring Collective Hop Animator & Sharded Matmul Cases 1-4
       ===================================================================== */
    function initRingMatmulLab(root, demoActive) {
        const { controls, svg, metrics, caption } = createShell(root, {
            eyebrow: t('Interactive Lab 2 · Collectives & Matmul Calculus', '交互实验室 2 · 环形通信动态与矩阵分片'),
            title: t('Ring Collective Packet Animator & Four Sharded Matmul Cases', 'Ring 集合通信逐跳动画器 & 分布式矩阵乘法四种分片推演'),
            hint: t('Switch between Ring Hops and Matmul Cases 1–4', '可在 Ring 动画与矩阵乘法 4 种情形之间切换'),
            viewBox: '0 0 880 326',
        });

        const st = {
            tab: 'ring',     // 'ring' | 'matmul'
            op: 'AR',        // 'AG' | 'RS' | 'AR' | 'A2A'
            dir: 'bi',       // 'uni' | 'bi'
            hop: demoActive ? 2 : 0,
            mmCase: 2,
            mmStep: demoActive ? 1 : 0,
            case3Reduce: 'AR', // 'AR' | 'RS'
        };

        function maxHops() {
            if (st.op === 'AR') return st.dir === 'uni' ? 6 : 4;
            if (st.op === 'A2A') return st.dir === 'uni' ? 3 : 2;
            return st.dir === 'uni' ? 3 : 2;
        }

        const gTabs = h('div', 'viz-btn-group');
        const btnTabRing = makeBtn(t('Ring Animator', 'Ring 环逐跳动画'), () => { loop.stop(btnPlay); st.tab = 'ring'; render(); });
        const btnTabMM = makeBtn(t('Matmul Cases 1–4', '矩阵乘法 4 种情形'), () => { loop.stop(btnPlay); st.tab = 'matmul'; render(); });
        gTabs.append(btnTabRing, btnTabMM);

        const gSub = h('div', 'viz-btn-group');
        const btnPlay = makeBtn(TXT.play, () => loop.toggle(btnPlay), 'is-play');

        const loop = makeLoop(() => {
            if (st.tab === 'ring') {
                st.hop = (st.hop + 1) % (maxHops() + 1);
            } else {
                st.mmStep = (st.mmStep + 1) % 3;
            }
            render();
        }, 950);

        controls.append(gTabs, gSub);

        function rebuildSubControls() {
            gSub.innerHTML = '';
            if (st.tab === 'ring') {
                for (const [id, lbl] of [['AG', 'AllGather'], ['RS', 'ReduceScatter'], ['AR', 'AllReduce'], ['A2A', 'All-to-All']]) {
                    gSub.appendChild(makeBtn(lbl, () => {
                        loop.stop(btnPlay);
                        st.op = id;
                        st.hop = 0;
                        render();
                    }, st.op === id ? 'is-active' : ''));
                }
                gSub.appendChild(h('span', 'viz-sep'));
                gSub.appendChild(makeBtn(st.dir === 'bi' ? t('Bidirectional Ring', '双向环') : t('Unidirectional Ring', '单向环'), () => {
                    loop.stop(btnPlay);
                    st.dir = st.dir === 'bi' ? 'uni' : 'bi';
                    st.hop = Math.min(st.hop, maxHops());
                    render();
                }));
                gSub.appendChild(btnPlay);
                gSub.appendChild(makeBtn(TXT.step, () => {
                    loop.stop(btnPlay);
                    st.hop = (st.hop + 1) % (maxHops() + 1);
                    render();
                }));
            } else {
                for (let c = 1; c <= 4; c++) {
                    gSub.appendChild(makeBtn(`Case ${c}`, () => {
                        loop.stop(btnPlay);
                        st.mmCase = c;
                        st.mmStep = 0;
                        render();
                    }, st.mmCase === c ? 'is-active' : ''));
                }
                if (st.mmCase === 3) {
                    gSub.appendChild(makeBtn(`End: ${st.case3Reduce}`, () => {
                        st.case3Reduce = st.case3Reduce === 'AR' ? 'RS' : 'AR';
                        render();
                    }, 'is-amber'));
                }
                gSub.appendChild(btnPlay);
                gSub.appendChild(makeBtn(TXT.step, () => {
                    loop.stop(btnPlay);
                    st.mmStep = (st.mmStep + 1) % 3;
                    render();
                }));
            }
        }

        function computeRingBuffers() {
            const mh = maxHops();
            const hop = st.hop;
            // 4 GPUs, each has 4 display slots
            if (st.op === 'AG') {
                const slots = [[0], [1], [2], [3]];
                const bufs = Array.from({ length: 4 }, (_, g) =>
                    [0, 1, 2, 3].map((k) => {
                        if (k === g) return { txt: `${k + 1}`, tone: g };
                        const distCW = (k - g + 4) % 4;
                        const distCCW = (g - k + 4) % 4;
                        const arrived = st.dir === 'uni' ? ((g - k + 4) % 4 <= hop) : (Math.min(distCW, distCCW) <= hop);
                        return arrived ? { txt: `${k + 1}`, tone: k } : { txt: '·', tone: -1 };
                    })
                );
                return { bufs, phase: hop === 0 ? 'Initial' : `AllGather Hop ${hop}/${mh}`, packets: hop > 0 ? ['x₀..x₃'] : [] };
            }
            if (st.op === 'RS') {
                // Start with [r+1, r+1, r+1, r+1] across 4 GPUs; each GPU ends up holding index g with sum 1+2+3+4 = 10
                const bufs = Array.from({ length: 4 }, (_, g) =>
                    [0, 1, 2, 3].map((k) => {
                        if (hop === 0) return { txt: `${g + 1}`, tone: g };
                        if (hop >= mh) {
                            return k === g ? { txt: '10', tone: g, done: true } : { txt: '·', tone: -1 };
                        }
                        if (k === g) return { txt: `${g + 1}+`, tone: g };
                        return { txt: `${g + 1}`, tone: k };
                    })
                );
                return { bufs, phase: hop === 0 ? 'Initial Partial Sums {U}' : (hop >= mh ? 'Reduced Shards Kept' : `ReduceScatter Hop ${hop}/${mh}`) };
            }
            if (st.op === 'AR') {
                const half = st.dir === 'uni' ? 3 : 2;
                const bufs = Array.from({ length: 4 }, (_, g) =>
                    [0, 1, 2, 3].map((k) => {
                        if (hop === 0) return { txt: `${g + 1}`, tone: g };
                        if (hop < half) return k === g ? { txt: `${g + 1}+`, tone: g } : { txt: `${g + 1}`, tone: k };
                        if (hop === half) return k === g ? { txt: '10', tone: g, done: true } : { txt: '·', tone: -1 };
                        if (hop < mh) return (k === g || Math.abs(k - g) <= (hop - half)) ? { txt: '10', tone: k, done: true } : { txt: '·', tone: -1 };
                        return { txt: '10', tone: k, done: true };
                    })
                );
                const phase = hop === 0 ? 'Initial {U}' : hop <= half ? `Phase 1 · ReduceScatter (${hop}/${half})` : `Phase 2 · AllGather (${hop - half}/${mh - half})`;
                return { bufs, phase };
            }
            // A2A: GPU g starts with chunks [g0, g1, g2, g3] and after AllToAll GPU g holds [0g, 1g, 2g, 3g]
            const bufs = Array.from({ length: 4 }, (_, g) =>
                [0, 1, 2, 3].map((k) => {
                    if (hop === 0) return { txt: `${g}${k}`, tone: k };
                    if (hop >= mh) return { txt: `${k}${g}`, tone: g, done: true };
                    // Mid-flight: diagonal element gg stays, neighbor k arrived
                    const dist = st.dir === 'uni' ? (g - k + 4) % 4 : Math.min((g - k + 4) % 4, (k - g + 4) % 4);
                    if (dist <= hop) return { txt: `${k}${g}`, tone: g };
                    return { txt: `${g}${k}`, tone: k };
                })
            );
            return { bufs, phase: hop === 0 ? 'Row-Split Chunks' : (hop >= mh ? 'Col-Split Complete' : `All-to-All Hop ${hop}/${mh}`) };
        }

        function renderRing() {
            const mh = maxHops();
            const nodes = [
                { cx: 295, cy: 52 },
                { cx: 486, cy: 162 },
                { cx: 295, cy: 272 },
                { cx: 104, cy: 162 },
            ];
            const ringLinks = [
                { x1: 372, y1: 72, x2: 454, y2: 124 },
                { x1: 454, y1: 200, x2: 372, y2: 252 },
                { x1: 218, y1: 252, x2: 136, y2: 200 },
                { x1: 136, y1: 124, x2: 218, y2: 72 },
            ];

            // Ring paths + active hop moving packets
            const isPhase1AR = st.op === 'AR' && st.hop > 0 && st.hop <= (st.dir === 'uni' ? 3 : 2);
            const activeCol = st.op === 'A2A' ? 'var(--vz-amber)' : (st.op === 'RS' || isPhase1AR ? 'var(--vz-teal)' : 'var(--vz-navy)');
            const mk = st.op === 'A2A' ? 'url(#mAmber)' : (st.op === 'RS' || isPhase1AR ? 'url(#mTeal)' : 'url(#mNavy)');

            for (let i = 0; i < 4; i++) {
                const l = ringLinks[i];
                svg.appendChild(el('line', {
                    x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2,
                    stroke: st.hop > 0 ? activeCol : 'var(--vz-line)',
                    'stroke-width': st.hop > 0 ? 2.4 : 1.6,
                    'marker-end': st.hop > 0 ? mk : 'url(#mMuted)',
                }));
                if (st.dir === 'bi') {
                    svg.appendChild(el('line', {
                        x1: l.x2, y1: l.y2 + 6, x2: l.x1, y2: l.y1 + 6,
                        stroke: st.hop > 0 ? 'var(--vz-plum)' : 'var(--vz-line)',
                        'stroke-width': st.hop > 0 ? 1.8 : 1.2,
                        'stroke-dasharray': '4 3',
                        'marker-end': st.hop > 0 ? 'url(#mPlum)' : 'url(#mMuted)',
                    }));
                }
                if (st.hop > 0) {
                    const tpos = 0.55;
                    const px = l.x1 + (l.x2 - l.x1) * tpos;
                    const py = l.y1 + (l.y2 - l.y1) * tpos;
                    svg.appendChild(el('circle', {
                        cx: px, cy: py, r: 8,
                        fill: activeCol, stroke: 'var(--vz-card-bg)', 'stroke-width': 2, class: 'vz-pulse',
                    }));
                    svg.appendChild(el('text', {
                        x: px, y: py + 3.5, 'text-anchor': 'middle',
                        'font-size': 9.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: '#ffffff',
                    }, st.op === 'A2A' ? '½' : '▪'));
                }
            }

            const { bufs, phase } = computeRingBuffers();
            // Center phase badge
            svg.appendChild(el('rect', {
                x: 205, y: 138, width: 180, height: 48, rx: 8,
                fill: 'var(--vz-card-bg)', stroke: activeCol, 'stroke-width': 1.4,
            }));
            svg.appendChild(el('text', {
                x: 295, y: 159, 'text-anchor': 'middle',
                'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: activeCol,
            }, phase));
            svg.appendChild(el('text', {
                x: 295, y: 177, 'text-anchor': 'middle',
                'font-size': 11, 'font-family': 'var(--sans)', fill: 'var(--vz-muted)',
            }, st.dir === 'bi' ? t('Bidirectional Links', '双向链路同时收发') : t('Unidirectional CW', '单向顺时针环')));

            // GPU cards
            for (let g = 0; g < 4; g++) {
                const n = nodes[g];
                const bx = n.cx - 78, by = n.cy - 32;
                svg.appendChild(el('rect', {
                    x: bx, y: by, width: 156, height: 64, rx: 8,
                    fill: 'var(--vz-card-bg)', stroke: COLORS[g].stroke, 'stroke-width': 1.7,
                }));
                svg.appendChild(el('text', {
                    x: n.cx, y: by + 18, 'text-anchor': 'middle',
                    'font-size': 12, 'font-family': 'var(--mono)', 'font-weight': 700, fill: COLORS[g].ink,
                }, `GPU ${g}`));
                for (let s = 0; s < 4; s++) {
                    const cell = bufs[g][s];
                    const cx = bx + 10 + s * 35;
                    const c = cell.tone >= 0 ? COLORS[cell.tone] : { fill: 'var(--vz-tile-bg)', stroke: 'var(--vz-line)', ink: 'var(--vz-muted)' };
                    svg.appendChild(el('rect', {
                        x: cx, y: by + 26, width: 31, height: 28, rx: 4,
                        fill: c.fill, stroke: c.stroke, 'stroke-width': cell.done ? 2 : 1.2,
                    }));
                    svg.appendChild(el('text', {
                        x: cx + 15.5, y: by + 44, 'text-anchor': 'middle',
                        'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: c.ink,
                    }, cell.txt));
                }
            }

            // Right Roofline Cost Comparison Panel
            const rx = 594, ry = 22, rw = 268, rh = 282;
            svg.appendChild(el('rect', {
                x: rx, y: ry, width: rw, height: rh, rx: 10,
                fill: 'var(--vz-card-bg)', stroke: 'var(--border-strong)', 'stroke-width': 1.4,
            }));
            svg.appendChild(el('text', {
                x: rx + 16, y: ry + 26, 'font-size': 13, 'font-family': 'var(--serif)', 'font-weight': 700, fill: 'var(--vz-ink)',
            }, t('Link Time vs. AllGather (V / W)', '通信时间对比（相对 AllGather）')));

            const bars = [
                { key: 'AR', name: 'AllReduce', val: '2.00×', frac: 1.0, col: 'var(--vz-plum)' },
                { key: 'AG', name: 'AllGather', val: '1.00×', frac: 0.5, col: 'var(--vz-navy)' },
                { key: 'RS', name: 'ReduceScatter', val: '1.00×', frac: 0.5, col: 'var(--vz-teal)' },
                { key: 'A2A_U', name: 'AllToAll (Uni)', val: '0.50×', frac: 0.25, col: 'var(--vz-amber)' },
                { key: 'A2A_B', name: 'AllToAll (Bi)', val: '0.25×', frac: 0.125, col: 'var(--vz-amber)' },
            ];
            for (let i = 0; i < bars.length; i++) {
                const b = bars[i];
                const by = ry + 48 + i * 44;
                const isCur = b.key === st.op || (st.op === 'A2A' && b.key === (st.dir === 'bi' ? 'A2A_B' : 'A2A_U'));
                svg.appendChild(el('text', {
                    x: rx + 16, y: by + 12, 'font-size': 11.5, 'font-family': 'var(--mono)',
                    'font-weight': isCur ? 700 : 500, fill: isCur ? b.col : 'var(--vz-ink)',
                }, b.name));
                svg.appendChild(el('text', {
                    x: rx + rw - 16, y: by + 12, 'text-anchor': 'end',
                    'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: b.col,
                }, b.val));
                svg.appendChild(el('rect', {
                    x: rx + 16, y: by + 18, width: 236, height: 11, rx: 4, fill: 'var(--vz-tile-bg)',
                }));
                svg.appendChild(el('rect', {
                    x: rx + 16, y: by + 18, width: 236 * b.frac, height: 11, rx: 4,
                    fill: b.col, opacity: isCur ? 1 : 0.48,
                }));
            }

            const relStr = st.op === 'AR' ? '2V / W' : (st.op === 'A2A' ? (st.dir === 'bi' ? '0.25 V / W' : '0.50 V / W') : '1.00 V / W');
            setMetrics(metrics, [
                { label: t('Ring Step', '当前环跳数'), val: `${st.hop} / ${mh}` },
                { label: t('Link Cost', '带宽耗时'), val: relStr, tone: st.op === 'A2A' ? 'good' : (st.op === 'AR' ? 'warn' : '') },
                { label: t('Hops Needed', '全环跳数'), val: st.op === 'AR' ? `${mh} (RS + AG)` : `${mh} hops` },
            ]);

            if (st.op === 'A2A') {
                caption.innerHTML = t(
                    '<strong>Why All-to-All costs 1/4 of AllGather:</strong> In <code>Bidirectional</code> mode, chunks travel at most <code>D/2</code> hops with triangular sum <code>(D/2)·(D/2+1)/2</code> instead of broadcasting the entire shard all the way around.',
                    '<strong>为何 All-to-All 只要 AllGather 四分之一耗时？</strong> <code>All-to-All</code> 仅按目的卡切块传递、三角级数求和减半；改为<strong>双向环</strong>后最大跳数再减半为 <code>D/2</code>，总体比 <code>AllGather</code> 节省 4 倍链路带宽！'
                );
            } else if (st.op === 'AR') {
                caption.innerHTML = t(
                    '<strong>AllReduce = ReduceScatter + AllGather:</strong> Watch hops 1–' + (st.dir === 'uni' ? 3 : 2) + ' accumulate one reduced <code>10</code> per GPU (teal), then the remaining hops broadcast <code>10</code> into every slot.',
                    '<strong>AllReduce = ReduceScatter + AllGather：</strong>前半程（青色）先把相同位置元素累加并各自留下一份 <code>10</code>；后半程再把已归约的分片拼接分发到全部卡。'
                );
            } else {
                caption.innerHTML = t(
                    '<strong>Bandwidth-Bound Ring Invariance:</strong> Each hop sends <code>V / |X|</code> bytes for <code>|X|</code>-scaled hops, so ring size cancels cleanly—total transfer stays <code>V / W_ici</code> unless buffers drop below hop latency.',
                    '<strong>大张量环通信的卡数无关性：</strong>每跳传 <code>V / |X|</code> 字节、共传约 <code>|X|</code> 跳，卡数正好在总耗时里约消，除非张量极小撞上单跳微秒延迟下限。'
                );
            }
        }

        function drawMatGrid(x, y, rows, cols, cellW, cellH, cells) {
            const g = el('g');
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const item = cells[r * cols + c];
                    const tone = item.tone >= 0 ? COLORS[item.tone] : (item.err ? { fill: 'var(--vz-red-bg)', stroke: 'var(--vz-red)', ink: 'var(--vz-red)' } : { fill: 'var(--vz-tile-bg)', stroke: 'var(--vz-line)', ink: 'var(--vz-muted)' });
                    g.appendChild(el('rect', {
                        x: x + c * (cellW + 4), y: y + r * (cellH + 4),
                        width: cellW, height: cellH, rx: 4,
                        fill: tone.fill, stroke: tone.stroke,
                        'stroke-width': item.active ? 2.2 : 1.3,
                        'stroke-dasharray': item.dashed ? '4 2' : null,
                    }));
                    g.appendChild(el('text', {
                        x: x + c * (cellW + 4) + cellW / 2, y: y + r * (cellH + 4) + cellH / 2 + 4,
                        'text-anchor': 'middle', 'font-size': 11, 'font-family': 'var(--mono)', 'font-weight': 700, fill: tone.ink,
                    }, item.txt));
                }
            }
            return g;
        }

        function renderMatmul() {
            const cs = st.mmCase;
            const step = st.mmStep;
            const titles = {
                1: t('Case 1: Neither shards contracting dim J → A[I_X, J] · B[J, K_Y]', '情形 1：收缩维 J 两侧都未切 → A[I_X, J] · B[J, K_Y]'),
                2: t('Case 2: One shards contracting dim → A[I, J_X] · B[J, K] (FSDP)', '情形 2：仅一侧切了收缩维 J → A[I, J_X] · B[J, K]（FSDP 原理）'),
                3: t(`Case 3: Both shard contracting dim → A[I, J_X] · B[J_X, K] + ${st.case3Reduce === 'AR' ? 'AllReduce' : 'ReduceScatter'}`, `情形 3：两侧共切收缩维 J → 产生 {U_X} 后接 ${st.case3Reduce}`),
                4: t('Case 4: Both shard free dim on same axis X → A[I_X, J] · B[J, K_X]', '情形 4：两侧自由维共享同一轴 X → 对角缺块冲突'),
            };
            svg.appendChild(el('text', {
                x: 440, y: 28, 'text-anchor': 'middle', 'font-size': 13.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--primary)',
            }, titles[cs]));

            const cw = 64, ch = 46;
            // Matrix labels A (x=66), * (x=222), B (x=256), = (x=418), C (x=456), Collective Box (x=626)
            svg.appendChild(el('text', { x: 134, y: 66, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--vz-ink)' }, 'A'));
            svg.appendChild(el('text', { x: 230, y: 128, 'text-anchor': 'middle', 'font-size': 20, fill: 'var(--vz-muted)' }, '×'));
            svg.appendChild(el('text', { x: 324, y: 66, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--vz-ink)' }, 'B'));
            svg.appendChild(el('text', { x: 420, y: 128, 'text-anchor': 'middle', 'font-size': 20, fill: 'var(--vz-muted)' }, '='));
            svg.appendChild(el('text', { x: 520, y: 66, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--vz-ink)' }, 'Output C'));

            let A, B, C, commBox;
            if (cs === 1) {
                A = [
                    { txt: 'GPU0', tone: 0, active: step > 0 }, { txt: 'GPU0', tone: 0, active: step > 0 },
                    { txt: 'GPU1', tone: 1, active: step > 0 }, { txt: 'GPU1', tone: 1, active: step > 0 },
                ];
                B = [
                    { txt: 'Y=0', tone: 2, active: step > 0 }, { txt: 'Y=1', tone: 3, active: step > 0 },
                    { txt: 'Y=0', tone: 2, active: step > 0 }, { txt: 'Y=1', tone: 3, active: step > 0 },
                ];
                C = step === 0
                    ? [{ txt: '?', tone: -1 }, { txt: '?', tone: -1 }, { txt: '?', tone: -1 }, { txt: '?', tone: -1 }]
                    : [{ txt: '0,0', tone: 0, active: true }, { txt: '0,1', tone: 1, active: true }, { txt: '1,0', tone: 2, active: true }, { txt: '1,1', tone: 3, active: true }];
                commBox = { col: 'var(--vz-teal)', head: t('0 Sync Needed', '零通信开销'), sub: t('Valid immediately!', '本地直算即最终分片！') };
            } else if (cs === 2) {
                const gathered = step >= 1;
                A = gathered
                    ? [{ txt: 'AG₀', tone: 0, active: true }, { txt: 'AG₁', tone: 1, active: true }, { txt: 'AG₀', tone: 0, active: true }, { txt: 'AG₁', tone: 1, active: true }]
                    : [{ txt: 'GPU0', tone: 0 }, { txt: 'GPU1', tone: 1 }, { txt: 'GPU0', tone: 0 }, { txt: 'GPU1', tone: 1 }];
                B = [{ txt: 'Full', tone: 2 }, { txt: 'Full', tone: 2 }, { txt: 'Full', tone: 2 }, { txt: 'Full', tone: 2 }];
                C = step === 2
                    ? [{ txt: 'Full', tone: 0, active: true }, { txt: 'Full', tone: 0, active: true }, { txt: 'Full', tone: 0, active: true }, { txt: 'Full', tone: 0, active: true }]
                    : [{ txt: 'wait', tone: -1, dashed: true }, { txt: 'wait', tone: -1, dashed: true }, { txt: 'wait', tone: -1, dashed: true }, { txt: 'wait', tone: -1, dashed: true }];
                commBox = step === 0
                    ? { col: 'var(--vz-amber)', head: t('Blocked on J_X', '收缩维错位阻塞'), sub: t('Need AllGather_X(A)', '需先 AllGather_X(A)') }
                    : { col: 'var(--vz-navy)', head: 'AllGather_X Done', sub: t('Full [I,J] enables matmul', '拼完完整内维直接乘') };
            } else if (cs === 3) {
                A = [{ txt: 'GPU0', tone: 0 }, { txt: 'GPU1', tone: 1 }, { txt: 'GPU0', tone: 0 }, { txt: 'GPU1', tone: 1 }];
                B = [{ txt: 'GPU0', tone: 0 }, { txt: 'GPU0', tone: 0 }, { txt: 'GPU1', tone: 1 }, { txt: 'GPU1', tone: 1 }];
                if (step === 0) {
                    C = [{ txt: 'ready', tone: -1 }, { txt: 'ready', tone: -1 }, { txt: 'ready', tone: -1 }, { txt: 'ready', tone: -1 }];
                    commBox = { col: 'var(--vz-muted)', head: t('Matching J_X', '内维切片已对齐'), sub: t('Step → Local Outer Sum', '下一步各算部分积') };
                } else if (step === 1) {
                    C = [{ txt: 'Σ₀+?', tone: 2, active: true }, { txt: 'Σ₀+?', tone: 2, active: true }, { txt: 'Σ₁+?', tone: 2, active: true }, { txt: 'Σ₁+?', tone: 2, active: true }];
                    commBox = { col: 'var(--vz-amber)', head: '{U_X} Partial Sum', sub: t('Step → Merge via ' + st.case3Reduce, '待 ' + st.case3Reduce + ' 归约合并') };
                } else if (st.case3Reduce === 'AR') {
                    C = [{ txt: 'Sum', tone: 3, active: true }, { txt: 'Sum', tone: 3, active: true }, { txt: 'Sum', tone: 3, active: true }, { txt: 'Sum', tone: 3, active: true }];
                    commBox = { col: 'var(--vz-plum)', head: 'AllReduce_X Done', sub: t('Both GPUs own full C', '两卡均得完整总和 C') };
                } else {
                    C = [{ txt: 'G0:S₀', tone: 0, active: true }, { txt: 'G0:S₀', tone: 0, active: true }, { txt: 'G1:S₁', tone: 1, active: true }, { txt: 'G1:S₁', tone: 1, active: true }];
                    commBox = { col: 'var(--vz-teal)', head: 'ReduceScatter_X Done', sub: t('Half comm vs AllReduce!', '省一半通信，各自留一片') };
                }
            } else {
                const fixed = step >= 1;
                A = [{ txt: 'GPU0', tone: 0 }, { txt: 'GPU0', tone: 0 }, { txt: 'GPU1', tone: 1 }, { txt: 'GPU1', tone: 1 }];
                B = fixed
                    ? [{ txt: 'AG₀', tone: 0, active: true }, { txt: 'AG₁', tone: 1, active: true }, { txt: 'AG₀', tone: 0, active: true }, { txt: 'AG₁', tone: 1, active: true }]
                    : [{ txt: 'GPU0', tone: 0 }, { txt: 'GPU1', tone: 1 }, { txt: 'GPU0', tone: 0 }, { txt: 'GPU1', tone: 1 }];
                C = step === 2
                    ? [{ txt: '0,0', tone: 0, active: true }, { txt: '0,1', tone: 0, active: true }, { txt: '1,0', tone: 1, active: true }, { txt: '1,1', tone: 1, active: true }]
                    : [{ txt: '0,0', tone: 0 }, { txt: '✗ 0,1', err: true, dashed: true }, { txt: '✗ 1,0', err: true, dashed: true }, { txt: '1,1', tone: 1 }];
                commBox = fixed
                    ? { col: 'var(--vz-navy)', head: 'AllGather_X(B) Fixed', sub: t('Cross blocks now valid!', '解除冲突，交叉块算齐') }
                    : { col: 'var(--vz-red)', head: t('Diagonal Only!', '只能算对角块！'), sub: t('Step → AllGather_X one side', '先对一侧做 AllGather_X') };
            }

            svg.appendChild(drawMatGrid(66, 80, 2, 2, cw, ch, A));
            svg.appendChild(drawMatGrid(256, 80, 2, 2, cw, ch, B));
            svg.appendChild(drawMatGrid(452, 80, 2, 2, cw, ch, C));

            // Status box on right
            svg.appendChild(el('rect', {
                x: 616, y: 80, width: 240, height: 96, rx: 10,
                fill: 'var(--vz-card-bg)', stroke: commBox.col, 'stroke-width': 2,
            }));
            svg.appendChild(el('text', { x: 736, y: 116, 'text-anchor': 'middle', 'font-size': 13.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: commBox.col }, commBox.head));
            svg.appendChild(el('text', { x: 736, y: 144, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'var(--sans)', fill: 'var(--vz-muted)' }, commBox.sub));

            // Step Progress Pills below
            const labels = [t('0 · Initial Layout', '0 · 初始分片'), t('1 · Mid-Op / Local Compute', '1 · 本地算子/中继'), t('2 · Final Output', '2 · 最终结果')];
            for (let i = 0; i < 3; i++) {
                const px = 66 + i * 260;
                svg.appendChild(el('rect', {
                    x: px, y: 226, width: 238, height: 34, rx: 6,
                    fill: i === step ? 'var(--vz-navy-bg)' : 'var(--vz-card-bg)',
                    stroke: i === step ? 'var(--primary)' : 'var(--border)', 'stroke-width': i === step ? 1.8 : 1,
                }));
                svg.appendChild(el('text', {
                    x: px + 119, y: 247, 'text-anchor': 'middle', 'font-size': 11.5, 'font-family': 'var(--mono)',
                    'font-weight': i === step ? 700 : 500, fill: i === step ? 'var(--primary)' : 'var(--vz-muted)',
                }, labels[i]));
            }

            setMetrics(metrics, [
                { label: t('Step', '阶段'), val: `${step} / 2` },
                { label: t('Primitive', '所需通信'), val: cs === 1 ? 'None (0)' : (cs === 3 ? (st.case3Reduce === 'AR' ? 'AllReduce' : 'ReduceScatter') : 'AllGather'), tone: cs === 1 ? 'good' : (cs === 4 && step === 0 ? 'bad' : '') },
            ]);
            caption.innerHTML = t(
                '<strong>Rule of Thumb:</strong> Match inner contracting axis <code>J</code> before multiplying (<code>AllGather</code>), and never share one mesh axis across two free dimensions of an output matrix.',
                '<strong>矩阵分片通则：</strong>收缩维错开就先 <code>AllGather</code>；两侧齐切收缩维产生 <code>{U}</code>，接 <code>AllReduce</code> 或 <code>ReduceScatter</code>；双自由维撞轴则必须先展开其中一侧。'
            );
        }

        function render() {
            btnTabRing.classList.toggle('is-active', st.tab === 'ring');
            btnTabMM.classList.toggle('is-active', st.tab === 'matmul');
            rebuildSubControls();
            svg.innerHTML = '';
            addDefs(svg);
            if (st.tab === 'ring') renderRing(); else renderMatmul();
        }
        render();
    }

    /* =====================================================================
       LAB 3: DDP vs ZeRO-1 / 2 / 3 (FSDP) Step & HBM Animator
       ===================================================================== */
    function initZeroLab(root, demoActive) {
        const { controls, svg, metrics, caption } = createShell(root, {
            eyebrow: t('Interactive Lab 3 · Data Parallelism & ZeRO / FSDP', '交互实验室 3 · 数据并行与 ZeRO/FSDP 生命周期'),
            title: t('DDP vs. ZeRO-1 / ZeRO-2 / ZeRO-3 (FSDP) Step & HBM Simulator', 'DDP vs. ZeRO-1 / 2 / 3（FSDP）单步通信流与显存拆解模拟器'),
            hint: t('Scrub through Forward → Backward → Grad Sync → Adam Step', '切换 ZeRO 阶段与集群卡数 N，动画推演整步生命周期'),
            viewBox: '0 0 880 318',
        });

        const st = {
            stage: demoActive ? 3 : 0, // 0=DDP, 1=ZeRO-1, 2=ZeRO-2, 3=ZeRO-3
            step: demoActive ? 3 : 0,  // 0=Idle, 1=Forward, 2=Backward, 3=GradSync, 4=AdamStep
            N: 8,
        };

        const gStage = h('div', 'viz-btn-group');
        const stBtns = {};
        for (const [id, lbl] of [[0, 'DDP'], [1, 'ZeRO-1'], [2, 'ZeRO-2'], [3, 'ZeRO-3 / FSDP']]) {
            const b = makeBtn(lbl, () => { loop.stop(btnPlay); st.stage = id; render(); });
            stBtns[id] = b;
            gStage.appendChild(b);
        }

        const gN = h('div', 'viz-btn-group');
        const btnN = makeBtn('N = 8', () => {
            st.N = st.N === 2 ? 4 : (st.N === 4 ? 8 : 2);
            btnN.textContent = `N = ${st.N}`;
            render();
        });
        const btnPlay = makeBtn(TXT.play, () => loop.toggle(btnPlay), 'is-play');
        const btnStep = makeBtn(TXT.step, () => { loop.stop(btnPlay); st.step = (st.step + 1) % 5; render(); });
        const btnRst = makeBtn(TXT.reset, () => { loop.stop(btnPlay); st.step = 0; render(); });
        gN.append(btnN, btnPlay, btnStep, btnRst);
        controls.append(gStage, gN);

        const loop = makeLoop(() => {
            st.step = (st.step + 1) % 5;
            render();
        }, 1150);

        const stepNames = isZh
            ? ['0 · 稳态初始化', '1 · 前向传播 (Fwd)', '2 · 反向计算梯度', '3 · 梯度集合通信', '4 · Adam 参数更新']
            : ['0 · Steady State', '1 · Forward Pass', '2 · Backward Pass', '3 · Grad Sync', '4 · Adam & Weight Sync'];

        function drawGpuCard(x, idx) {
            const c = COLORS[idx];
            const Wfull = st.stage < 3 || st.step === 1 || st.step === 2;
            const Wtransient = st.stage === 3 && (st.step === 1 || st.step === 2);
            const hasFullGrad = (st.step === 2) || (st.stage < 2 && st.step === 3);
            const reducedGradOnly = st.stage >= 2 && st.step === 3;
            const osLabel = st.stage === 0 ? 'Full OS (12Φ)' : `OS_${idx} (12Φ/N)`;
            const gVal = idx === 0 ? 'g₀=[1,2]' : 'g₁=[3,4]';
            const sumVal = st.stage === 0 ? '[4, 6]' : (idx === 0 ? '[4] only' : '[6] only');

            svg.appendChild(el('rect', {
                x, y: 18, width: 296, height: 152, rx: 10,
                fill: 'var(--vz-card-bg)', stroke: c.stroke, 'stroke-width': 1.7,
            }));
            svg.appendChild(el('text', {
                x: x + 14, y: 40, 'font-size': 13, 'font-family': 'var(--mono)', 'font-weight': 700, fill: c.ink,
            }, `GPU ${idx}`));

            // Row 1: Weights W
            const wCol = Wtransient ? COLORS[2] : COLORS[0];
            svg.appendChild(el('rect', {
                x: x + 14, y: 50, width: Wfull ? 268 : Math.round(268 / st.N + 68), height: 30, rx: 5,
                fill: wCol.fill, stroke: wCol.stroke, 'stroke-width': 1.3, 'stroke-dasharray': Wtransient ? '5 3' : null,
            }));
            svg.appendChild(el('text', {
                x: x + 24, y: 69, 'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: wCol.ink,
            }, Wtransient ? `AllGather(W) → Full W (temp)` : (st.stage === 3 ? `W_${idx} (Shard 1/${st.N})` : `Full W (2Φ)`)));

            // Row 2: Grads g
            const gActive = st.step === 2 || st.step === 3;
            const gFill = st.step === 3 ? COLORS[1].fill : (st.step === 2 ? COLORS[3].fill : 'var(--vz-tile-bg)');
            const gStroke = st.step === 3 ? COLORS[1].stroke : (st.step === 2 ? COLORS[3].stroke : 'var(--vz-line)');
            const gInk = st.step === 3 ? COLORS[1].ink : (st.step === 2 ? COLORS[3].ink : 'var(--vz-muted)');
            svg.appendChild(el('rect', {
                x: x + 14, y: 88, width: (reducedGradOnly || (st.stage >= 2 && st.step === 4)) ? 132 : 268, height: 30, rx: 5,
                fill: gFill, stroke: gStroke, 'stroke-width': gActive ? 1.8 : 1.1,
            }));
            svg.appendChild(el('text', {
                x: x + 24, y: 107, 'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: gInk,
            }, st.step < 2 ? 'Grads (empty)' : (st.step === 2 ? `Local ${gVal}` : (st.step === 3 ? (st.stage >= 2 ? `Kept ${sumVal}` : `Synced ${sumVal}`) : (st.stage === 0 ? `Updated W` : `Updated W_${idx}`)))));

            // Row 3: Adam OS
            const osWidth = st.stage === 0 ? 268 : Math.max(96, Math.round(268 / st.N + 56));
            svg.appendChild(el('rect', {
                x: x + 14, y: 126, width: osWidth, height: 30, rx: 5,
                fill: COLORS[2].fill, stroke: COLORS[2].stroke, 'stroke-width': st.step === 4 ? 2.2 : 1.2,
            }));
            svg.appendChild(el('text', {
                x: x + 24, y: 145, 'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: COLORS[2].ink,
            }, osLabel));
        }

        function render() {
            for (const [k, b] of Object.entries(stBtns)) b.classList.toggle('is-active', Number(k) === st.stage);
            svg.innerHTML = '';
            addDefs(svg);

            drawGpuCard(20, 0);
            drawGpuCard(564, 1);

            // Center step pill & collective arrows
            svg.appendChild(el('rect', {
                x: 332, y: 24, width: 216, height: 34, rx: 17,
                fill: 'var(--vz-navy)',
            }));
            svg.appendChild(el('text', {
                x: 440, y: 45, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'var(--mono)', 'font-weight': 700, fill: '#ffffff',
            }, stepNames[st.step]));

            let commText = t('No collective right now', '本阶段无跨卡集合通信');
            let commCol = 'var(--vz-muted)';
            let arrowActive = false;
            if ((st.step === 1 || st.step === 2) && st.stage === 3) {
                commText = 'AllGather(W) → 1Ψ';
                commCol = 'var(--vz-amber)';
                arrowActive = true;
            } else if (st.step === 3) {
                commText = st.stage === 0 ? 'AllReduce(g) → [4,6]' : 'ReduceScatter(g) → [4]|[6]';
                commCol = 'var(--vz-teal)';
                arrowActive = true;
            } else if (st.step === 4 && (st.stage === 1 || st.stage === 2)) {
                commText = "AllGather(W') → 1Ψ";
                commCol = 'var(--vz-navy)';
                arrowActive = true;
            }

            svg.appendChild(el('line', {
                x1: 326, y1: 103, x2: 554, y2: 103,
                stroke: arrowActive ? commCol : 'var(--vz-line)',
                'stroke-width': arrowActive ? 2.8 : 1.4,
                'stroke-dasharray': arrowActive ? '6 3' : null,
                'marker-end': arrowActive ? 'url(#mTeal)' : null,
                'marker-start': arrowActive ? 'url(#mAmber)' : null,
                class: arrowActive ? 'vz-pulse' : null,
            }));
            svg.appendChild(el('rect', {
                x: 336, y: 120, width: 208, height: 30, rx: 6,
                fill: 'var(--vz-card-bg)', stroke: commCol, 'stroke-width': arrowActive ? 1.7 : 1,
            }));
            svg.appendChild(el('text', {
                x: 440, y: 139, 'text-anchor': 'middle', 'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: commCol,
            }, commText));

            // Bottom HBM Memory Bar (scale: 16 Phi = 600px -> 37.5px/Phi)
            const pPhi = st.stage < 3 ? 2 : 2 / st.N;
            const gPhi = st.stage < 2 ? 2 : 2 / st.N;
            const osPhi = st.stage === 0 ? 12 : 12 / st.N;
            const totalPhi = pPhi + gPhi + osPhi;
            const transientPhi = (st.stage === 3 && (st.step === 1 || st.step === 2)) ? 1.2 : 0; // visual transient buffer indicator

            svg.appendChild(el('rect', {
                x: 20, y: 186, width: 840, height: 116, rx: 10,
                fill: 'var(--vz-card-bg)', stroke: 'var(--border)', 'stroke-width': 1.4,
            }));
            svg.appendChild(el('text', {
                x: 36, y: 210, 'font-size': 13, 'font-family': 'var(--sans)', 'font-weight': 700, fill: 'var(--vz-ink)',
            }, t(`Per-GPU Static Model State HBM (N = ${st.N} GPUs, 16Φ scale)`, `单卡静态模型状态显存（N = ${st.N} 卡，满标尺 16Φ）`)));

            const bx = 36, by = 224, scale = 37.5;
            const wP = Math.max(8, pPhi * scale);
            const wG = Math.max(8, gPhi * scale);
            const wOS = osPhi * scale;

            svg.appendChild(el('rect', { x: bx, y: by, width: wP, height: 32, rx: 4, fill: 'var(--vz-navy)' }));
            svg.appendChild(el('rect', { x: bx + wP + 3, y: by, width: wG, height: 32, rx: 4, fill: 'var(--vz-teal)' }));
            svg.appendChild(el('rect', { x: bx + wP + wG + 6, y: by, width: wOS, height: 32, rx: 4, fill: 'var(--vz-amber)' }));

            if (transientPhi > 0) {
                svg.appendChild(el('rect', {
                    x: bx + wP + wG + wOS + 9, y: by, width: transientPhi * scale, height: 32, rx: 4,
                    fill: 'var(--vz-amber-bg)', stroke: 'var(--vz-amber)', 'stroke-width': 1.8, 'stroke-dasharray': '4 2',
                }));
            }

            const endX = bx + wP + wG + wOS + (transientPhi > 0 ? transientPhi * scale + 18 : 16);
            svg.appendChild(el('text', {
                x: endX, y: by + 21, 'font-size': 13.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--vz-ink)',
            }, `${totalPhi.toFixed(2)} Φ  (${Math.round(totalPhi * 70)} GB @ 70B)`));

            // Legend row at bottom
            const lgY = 282;
            const items = [
                { col: 'var(--vz-navy)', txt: `Params: ${pPhi.toFixed(2)}Φ` },
                { col: 'var(--vz-teal)', txt: `Grads: ${gPhi.toFixed(2)}Φ` },
                { col: 'var(--vz-amber)', txt: `Adam OS: ${osPhi.toFixed(2)}Φ` },
            ];
            let lx = 36;
            for (const it of items) {
                svg.appendChild(el('rect', { x: lx, y: lgY - 11, width: 13, height: 13, rx: 3, fill: it.col }));
                svg.appendChild(el('text', { x: lx + 19, y: lgY, 'font-size': 12, 'font-family': 'var(--mono)', fill: 'var(--vz-muted)' }, it.txt));
                lx += 165;
            }

            const commPsi = st.stage === 3 ? '3.0 Ψ (1.5×)' : '2.0 Ψ (1.0×)';
            setMetrics(metrics, [
                { label: t('Model State / GPU', '单卡模型状态'), val: `${totalPhi.toFixed(2)} Φ`, tone: totalPhi <= 4 ? 'good' : '' },
                { label: t('70B Static HBM', '70B 静态占用'), val: `${Math.round(totalPhi * 70)} GB` },
                { label: t('Step Comm Volume', '单步通信量'), val: commPsi, tone: st.stage === 3 ? 'warn' : 'good' },
            ]);

            caption.innerHTML = st.stage === 3
                ? t('<strong>ZeRO-3 / FSDP:</strong> Static HBM drops linearly as <code>16Φ / N</code>. During Forward &amp; Backward, transient layer weights arrive via <code>AllGather(W)</code> (prefetched layer ahead) and are discarded right after; Backward uses Kronecker-dual <code>ReduceScatter</code> keeping only <code>[4]</code> / <code>[6]</code>.',
                    '<strong>ZeRO-3 / FSDP：</strong>静态显存线性压缩至 <code>16Φ / N</code>。计算该层前通过异步预取 <code>AllGather(W)</code> 临时拿全权重、算完即删；反向借由 <code>AllGatherᵀ = ReduceScatter</code> 让每卡只留下 <code>[4]</code> 和 <code>[6]</code>。')
                : t('<strong>DDP vs. ZeRO-1/2:</strong> Both communicate identical total bytes <code>2Ψ</code> per step! ZeRO-1/2 replaces DDP’s second half (<code>AllGather</code> of gradients) with an <code>AllGather</code> of updated weights after sharded Adam.',
                    '<strong>DDP 与 ZeRO-1/2 对比：</strong>每步总通信量居然同为 <code>2Ψ</code>！因为 ZeRO-1/2 把传统 <code>AllReduce</code> 后半段的“拼接梯度”，换成了各卡更新完 <code>1/N</code> 权重切片后再去 <code>AllGather</code> 最新权重。');
        }

        render();
    }

    /* =====================================================================
       LAB 4: Megatron-LM TP f / g Forward-Backward & Sequence Parallelism
       ===================================================================== */
    function initTpLab(root, demoActive) {
        const { controls, svg, metrics, caption } = createShell(root, {
            eyebrow: t('Interactive Lab 4 · Megatron-LM Autograd f & g', '交互实验室 4 · Megatron-LM 算子 f / g 与序列并行'),
            title: t('Tensor Parallel MLP Forward & Backward Signal Animator (TP=2)', '张量并行 MLP 前向/反向信号流与 Megatron-SP 切换器'),
            hint: t('Watch ColumnParallel pair with RowParallel and f sync in backward', '观察前向零同步与反向 f 触发 AllReduce 的共轭配合'),
            viewBox: '0 0 880 280',
        });

        const st = {
            sp: false,
            step: demoActive ? 5 : 0, // 0..5: 0=Input, 1=f, 2=Col+GeLU, 3=Row->g, 4=Bwd Col/Row, 5=Bwd f.AllReduce
        };

        const gMode = h('div', 'viz-btn-group');
        const btnTP = makeBtn('Standard TP', () => { loop.stop(btnPlay); st.sp = false; render(); });
        const btnSP = makeBtn('TP + Sequence Parallel (SP)', () => { loop.stop(btnPlay); st.sp = true; render(); }, 'is-amber');
        gMode.append(btnTP, btnSP);

        const gCtrl = h('div', 'viz-btn-group');
        const btnPlay = makeBtn(TXT.play, () => loop.toggle(btnPlay), 'is-play');
        const btnStep = makeBtn(TXT.step, () => { loop.stop(btnPlay); st.step = (st.step + 1) % 6; render(); });
        const btnRst = makeBtn(TXT.reset, () => { loop.stop(btnPlay); st.step = 0; render(); });
        gCtrl.append(btnPlay, btnStep, btnRst);
        controls.append(gMode, gCtrl);

        const loop = makeLoop(() => {
            st.step = (st.step + 1) % 6;
            render();
        }, 1050);

        const stepsMeta = isZh ? [
            ['0 · 输入残差激活', 'Input LN'],
            ['1 · 前向穿过算子 f', 'Op f (前向)'],
            ['2 · 列并行 A + 局部 GeLU（0 同步！）', 'ColParallel → GeLU'],
            ['3 · 行并行 B + 前向 g 合拢', 'RowParallel → g'],
            ['4 · 反向梯度回流 Bᵀ → GeLU\' → Aᵀ', '反向链式回传'],
            ['5 · 算子 f 在反向触发 AllReduce / ReduceScatter！', 'Op f (反向聚合)'],
        ] : [
            ['0 · Input Activation', 'Input LN'],
            ['1 · Enter via Operator f', 'Op f (Fwd)'],
            ['2 · ColParallel A + Local GeLU (Zero Sync!)', 'ColParallel → GeLU'],
            ['3 · RowParallel B → Partial {U_TP} → Op g', 'RowParallel → g'],
            ['4 · Backward Gradients: Bᵀ → dGeLU → Aᵀ', 'Backward Flow'],
            ['5 · Op f fires Backward AllReduce / ReduceScatter!', 'Op f (Bwd Sync)'],
        ];

        function drawBlock(x, y, w, hgt, title, sub, colObj, active, bwdGlow) {
            const stroke = active ? (bwdGlow ? 'var(--vz-teal)' : 'var(--vz-navy)') : colObj.stroke;
            svg.appendChild(el('rect', {
                x, y, width: w, height: hgt, rx: 7,
                fill: active ? colObj.fill : 'var(--vz-card-bg)',
                stroke, 'stroke-width': active ? 2.5 : 1.3,
            }));
            svg.appendChild(el('text', {
                x: x + w / 2, y: y + hgt / 2 - 4, 'text-anchor': 'middle',
                'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: colObj.ink,
            }, title));
            if (sub) {
                svg.appendChild(el('text', {
                    x: x + w / 2, y: y + hgt / 2 + 13, 'text-anchor': 'middle',
                    'font-size': 10.5, 'font-family': 'var(--mono)', fill: 'var(--vz-muted)',
                }, sub));
            }
        }

        function render() {
            btnTP.classList.toggle('is-active', !st.sp);
            btnSP.classList.toggle('is-active', st.sp);
            svg.innerHTML = '';
            addDefs(svg);

            const isBwd = st.step >= 4;
            const s = st.step;

            // Phase Banner
            svg.appendChild(el('rect', { x: 24, y: 12, width: 832, height: 32, rx: 6, fill: isBwd ? 'var(--vz-teal-bg)' : 'var(--vz-navy-bg)' }));
            svg.appendChild(el('text', {
                x: 440, y: 33, 'text-anchor': 'middle', 'font-size': 12.5, 'font-family': 'var(--mono)', 'font-weight': 700,
                fill: isBwd ? 'var(--vz-teal)' : 'var(--vz-navy)',
            }, stepsMeta[s][0]));

            // Left LayerNorm Box (x=24..134, y=96..184)
            drawBlock(24, 96, 110, 88, 'LayerNorm', st.sp ? '[B, S/2, D]' : '[B, S, D]', COLORS[0], s === 0 || s === 5, isBwd);

            // Op f Pill (x=154..234, y=96..184)
            const fLabel = st.sp ? (isBwd ? 'RS_SP!' : 'AG_SP') : (isBwd ? 'AllReduce!' : 'Identity');
            drawBlock(152, 96, 94, 88, 'Op f', fLabel, isBwd ? COLORS[1] : COLORS[2], s === 1 || s === 5, isBwd);

            // Upper track GPU 0 (y=64..122), Lower track GPU 1 (y=158..216)
            drawBlock(268, 66, 126, 56, 'Col A₀ [D,F/2]', '[B,S,F/2]', COLORS[0], s === 2 || s === 4, isBwd);
            drawBlock(268, 158, 126, 56, 'Col A₁ [D,F/2]', '[B,S,F/2]', COLORS[1], s === 2 || s === 4, isBwd);

            drawBlock(412, 66, 98, 56, 'GeLU(Y₀)', '0 sync!', COLORS[1], s === 2 || s === 4, isBwd);
            drawBlock(412, 158, 98, 56, 'GeLU(Y₁)', '0 sync!', COLORS[1], s === 2 || s === 4, isBwd);

            drawBlock(528, 66, 128, 56, 'Row B₀ [F/2,D]', '{U_TP}', COLORS[0], s === 3 || s === 4, isBwd);
            drawBlock(528, 158, 128, 56, 'Row B₁ [F/2,D]', '{U_TP}', COLORS[1], s === 3 || s === 4, isBwd);

            // Op g Pill (x=676..766)
            const gLabel = st.sp ? (isBwd ? 'AG_SP' : 'RS_SP!') : (isBwd ? 'Identity' : 'AllReduce!');
            drawBlock(676, 96, 94, 88, 'Op g', gLabel, !isBwd && s === 3 ? COLORS[2] : COLORS[0], s === 3, isBwd);

            // Right Residual Out
            drawBlock(786, 96, 70, 88, 'Out Z', st.sp ? '[S/2,D]' : '[S,D]', COLORS[0], s === 3, isBwd);

            // Connecting horizontal flow lines (Forward -> right, Backward -> left)
            const links = [
                [134, 140, 152, 140], [246, 120, 268, 94], [246, 160, 268, 186],
                [394, 94, 412, 94], [394, 186, 412, 186], [510, 94, 528, 94], [510, 186, 528, 186],
                [656, 94, 676, 120], [656, 186, 676, 160], [770, 140, 786, 140],
            ];
            for (const [x1, y1, x2, y2] of links) {
                svg.appendChild(el('line', {
                    x1: isBwd ? x2 : x1, y1: isBwd ? y2 : y1,
                    x2: isBwd ? x1 : x2, y2: isBwd ? y1 : y2,
                    stroke: isBwd ? 'var(--vz-teal)' : 'var(--vz-navy)',
                    'stroke-width': 2, 'marker-end': isBwd ? 'url(#mTeal)' : 'url(#mNavy)',
                }));
            }

            // Highlight zero sync vertical badge between GeLUs
            svg.appendChild(el('rect', { x: 432, y: 127, width: 58, height: 24, rx: 12, fill: 'var(--vz-card-bg)', stroke: 'var(--vz-teal)', 'stroke-width': 1.2 }));
            svg.appendChild(el('text', { x: 461, y: 143, 'text-anchor': 'middle', 'font-size': 10.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--vz-teal)' }, '0 sync'));

            setMetrics(metrics, [
                { label: t('Pass', '方向'), val: isBwd ? TXT.bwd : TXT.fwd, tone: isBwd ? 'good' : '' },
                { label: t('Active Comm', '此刻同步通信'), val: (!isBwd && s === 3) ? (st.sp ? 'ReduceScatter' : 'AllReduce (g)') : (s === 5 ? (st.sp ? 'ReduceScatter' : 'AllReduce (f)') : 'None'), tone: (s === 3 || s === 5) ? 'warn' : 'good' },
                { label: t('LN/Drop Acts', 'LN/Dropout 激活'), val: st.sp ? '1 / TP (50% saved)' : '1.0× replicated', tone: st.sp ? 'good' : '' },
            ]);

            caption.innerHTML = st.sp
                ? t('<strong>TP + Sequence Parallelism:</strong> Same total byte traffic (<code>AllReduce ≡ AG + RS</code>), but replacing <code>f</code>/<code>g</code> with <code>AllGather</code>/<code>ReduceScatter</code> keeps LayerNorm &amp; Dropout sharded along <code>S</code>.',
                    '<strong>TP + 序列并行（Megatron-SP）：</strong>通信总字节一模一样（<code>AllReduce ≡ AG + RS</code>），但把 <code>f</code>/<code>g</code> 拆成 <code>AllGather</code>/<code>ReduceScatter</code> 后，LayerNorm 与 Dropout 的激活显存跟着按 <code>TP</code> 倍缩水！')
                : t('<strong>Conjugate Backward Sync on f:</strong> During Forward, <code>X</code> is replicated so <code>f</code> is an identity; during Backward, chain rule sums <code>dL/dX = ∑ (dL/dYᵢ)·Aᵢᵀ</code> across both shards inside <code>f.backward</code>!',
                    '<strong>算子 f 的反向奥秘：</strong>前向时各卡输入 <code>X</code> 一致所以 <code>f</code> 原样放行；反向回流时 <code>X</code> 同时流向所有 <code>Aᵢ</code>，必须由 <code>f.backward</code> 触发组内 <code>AllReduce</code> 加总偏导！');
        }

        render();
    }

    /* =====================================================================
       LAB 5: Pipeline Parallelism Schedule & Activation Queue (Naive / GPipe / 1F1B / Interleaved)
       ===================================================================== */
    function initPipelineLab(root, demoActive) {
        const { controls, svg, metrics, caption } = createShell(root, {
            eyebrow: t('Interactive Lab 5 · Pipeline Bubbles & Activation Memory', '交互实验室 5 · 流水线气泡与显存队列'),
            title: t('Naive vs. GPipe vs. 1F1B vs. Interleaved 1F1B Timeline Simulator', '流水线调度对比器：Naive / GPipe / 1F1B / 交错 1F1B（实时算气泡与峰值激活）'),
            hint: t('Drag P and M sliders to compare O(M) vs O(P) activation memory', '拖动级数 P 与微批 M，对比 GPipe O(M) 与 1F1B O(P) 峰值缓存'),
            viewBox: '0 0 880 318',
        });

        const st = {
            mode: demoActive ? '1F1B' : 'GPipe', // 'Naive' | 'GPipe' | '1F1B' | 'Interleaved'
            P: 4,
            M: demoActive ? 8 : 6,
            cursor: demoActive ? 9 : 0,
        };

        const gModes = h('div', 'viz-btn-group');
        const mBtns = {};
        for (const m of ['Naive', 'GPipe', '1F1B', 'Interleaved']) {
            const b = makeBtn(m === 'Interleaved' ? 'Interleaved v=2' : m, () => {
                loop.stop(btnPlay);
                st.mode = m;
                st.cursor = 0;
                render();
            });
            mBtns[m] = b;
            gModes.appendChild(b);
        }

        const gSliders = h('div', 'viz-btn-group');
        const wrapP = h('label', 'viz-slider-wrap');
        const spanP = h('span', null, `P=${st.P}`);
        const slP = h('input', 'viz-slider');
        slP.type = 'range'; slP.min = '2'; slP.max = '6'; slP.value = String(st.P);
        slP.addEventListener('input', () => {
            loop.stop(btnPlay);
            st.P = Number(slP.value);
            spanP.textContent = `P=${st.P}`;
            st.cursor = 0;
            render();
        });
        wrapP.append(spanP, slP);

        const wrapM = h('label', 'viz-slider-wrap');
        const spanM = h('span', null, `M=${st.M}`);
        const slM = h('input', 'viz-slider');
        slM.type = 'range'; slM.min = '1'; slM.max = '12'; slM.value = String(st.M);
        slM.addEventListener('input', () => {
            loop.stop(btnPlay);
            st.M = Number(slM.value);
            spanM.textContent = `M=${st.M}`;
            st.cursor = 0;
            render();
        });
        wrapM.append(spanM, slM);

        const btnPlay = makeBtn(TXT.play, () => loop.toggle(btnPlay), 'is-play');
        const btnStep = makeBtn(TXT.step, () => { loop.stop(btnPlay); st.cursor = (st.cursor + 1) % (curTotalT + 1); render(); });
        gSliders.append(wrapP, wrapM, btnPlay, btnStep);
        controls.append(gModes, gSliders);

        let curTotalT = 10;
        const loop = makeLoop(() => {
            st.cursor = (st.cursor + 1) % (curTotalT + 1);
            render();
        }, 480);

        function buildSchedule() {
            const P = st.P;
            const M = st.mode === 'Naive' ? 1 : st.M;
            const rows = Array.from({ length: P }, () => []);
            if (st.mode === 'Naive') {
                const totalT = 2 * P;
                for (let s = 0; s < P; s++) {
                    rows[s].push({ t: s, type: 'F', m: 0, v: 0 });
                    rows[s].push({ t: 2 * P - 1 - s, type: 'B', m: 0, v: 0 });
                }
                return { rows, totalT, maxBufS0: 1, bubbleFrac: (P - 1) / P };
            }
            if (st.mode === 'GPipe') {
                const totalT = 2 * (M + P - 1);
                for (let s = 0; s < P; s++) {
                    for (let m = 0; m < M; m++) {
                        rows[s].push({ t: s + m, type: 'F', m, v: 0 });
                        rows[s].push({ t: (M + P - 1) + (P - 1 - s) + (M - 1 - m), type: 'B', m: M - 1 - m, v: 0 });
                    }
                }
                return { rows, totalT, maxBufS0: M, bubbleFrac: (P - 1) / (M + P - 1) };
            }
            // Event-driven valid topological simulator for 1F1B & Interleaved v=2
            const V = st.mode === 'Interleaved' ? 2 : 1;
            const nVStages = P * V;
            // For realistic 1F1B visibility, let forward=1 tick, backward=1 tick cleanly with exact dependency check
            const doneF = Array.from({ length: M }, () => Array(nVStages).fill(-1));
            const doneB = Array.from({ length: M }, () => Array(nVStages).fill(-1));
            const nextF = Array(nVStages).fill(0);
            const nextB = Array(nVStages).fill(0);
            const s0Inflight = new Set();
            let maxBufS0 = 0;
            let tick = 0;

            while (tick < 200) {
                let allDone = true;
                for (let m = 0; m < M; m++) if (doneB[m][0] === -1) allDone = false;
                if (allDone) break;

                // Evaluate candidate task per physical GPU s
                const picks = [];
                for (let s = 0; s < P; s++) {
                    let chosen = null;
                    // Candidate virtual stages belonging to physical GPU s: s, s+P, ...
                    const vList = [];
                    for (let c = 0; c < V; c++) vList.push(s + c * P);

                    // Priority 1: Ready B (reverse virtual stage order, oldest microbatch first)
                    for (let ci = vList.length - 1; ci >= 0; ci--) {
                        const vs = vList[ci];
                        const m = nextB[vs];
                        if (m < M) {
                            const depReady = (vs === nVStages - 1)
                                ? (doneF[m][vs] >= 0 && doneF[m][vs] < tick)
                                : (doneB[m][vs + 1] >= 0 && doneB[m][vs + 1] < tick);
                            if (depReady) { chosen = { s, vs, type: 'B', m, v: ci }; break; }
                        }
                    }
                    // Priority 2: Ready F (respecting chunk order, throttle at S0 so active pipeline buffers ~ O(P*V))
                    if (!chosen) {
                        for (let ci = 0; ci < vList.length; ci++) {
                            const vs = vList[ci];
                            const m = nextF[vs];
                            if (m < M) {
                                const depReady = (vs === 0) ? true : (doneF[m][vs - 1] >= 0 && doneF[m][vs - 1] < tick);
                                const throttled = (st.mode === '1F1B' && vs === 0 && s0Inflight.size >= P);
                                if (depReady && !throttled) {
                                    chosen = { s, vs, type: 'F', m, v: ci };
                                    break;
                                }
                            }
                        }
                    }
                    if (chosen) picks.push(chosen);
                }

                for (const pk of picks) {
                    rows[pk.s].push({ t: tick, type: pk.type, m: pk.m, v: pk.v });
                    if (pk.type === 'F') {
                        doneF[pk.m][pk.vs] = tick;
                        nextF[pk.vs]++;
                        if (pk.vs === 0) {
                            s0Inflight.add(pk.m);
                            if (s0Inflight.size > maxBufS0) maxBufS0 = s0Inflight.size;
                        }
                    } else {
                        doneB[pk.m][pk.vs] = tick;
                        nextB[pk.vs]++;
                        if (pk.vs === 0) s0Inflight.delete(pk.m);
                    }
                }
                tick++;
            }
            const activeSlots = 2 * M * V;
            const totalT = tick;
            return { rows, totalT, maxBufS0, bubbleFrac: Math.max(0, (totalT - activeSlots) / totalT) };
        }

        function render() {
            for (const [k, b] of Object.entries(mBtns)) b.classList.toggle('is-active', st.mode === k);
            svg.innerHTML = '';
            addDefs(svg);

            const { rows, totalT, maxBufS0, bubbleFrac } = buildSchedule();
            curTotalT = totalT;
            if (st.cursor > totalT) st.cursor = totalT;

            const P = st.P;
            const gridX = 88, gridW = 590, gridY = 30, gridH = 228;
            const rowH = Math.min(44, Math.floor(gridH / P) - 5);
            const slotW = Math.max(11, Math.min(42, (gridW - 6) / totalT));

            // Activation queue panel on right (x=700..862)
            const qx = 700, qy = 26, qw = 160, qh = 250;
            svg.appendChild(el('rect', { x: qx, y: qy, width: qw, height: qh, rx: 10, fill: 'var(--vz-card-bg)', stroke: 'var(--border-strong)', 'stroke-width': 1.4 }));
            svg.appendChild(el('text', { x: qx + 12, y: qy + 22, 'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--vz-ink)' }, t('S0 Buffered Acts', 'Stage 0 缓存微批')));

            // Count buffered at current cursor
            let curBuf = 0;
            for (const blk of rows[0]) {
                if (blk.t < st.cursor && blk.v === 0) {
                    if (blk.type === 'F') curBuf++;
                    else curBuf = Math.max(0, curBuf - 1);
                }
            }
            const capReference = Math.max(st.M, P, maxBufS0);
            const slotBoxH = Math.min(16, Math.floor(156 / capReference) - 2);
            for (let i = 0; i < curBuf; i++) {
                svg.appendChild(el('rect', {
                    x: qx + 18, y: qy + 194 - i * (slotBoxH + 2), width: 124, height: Math.max(6, slotBoxH), rx: 3,
                    fill: 'var(--vz-amber)', stroke: 'var(--vz-card-bg)', 'stroke-width': 0.8,
                }));
            }
            svg.appendChild(el('text', {
                x: qx + 80, y: qy + 236, 'text-anchor': 'middle', 'font-size': 12.5, 'font-family': 'var(--mono)', 'font-weight': 700,
                fill: maxBufS0 > P && st.mode === 'GPipe' ? 'var(--vz-amber)' : 'var(--vz-teal)',
            }, t(`Now: ${curBuf} · Peak: ${maxBufS0}`, `当前 ${curBuf} · 峰值 ${maxBufS0}`)));

            // Timeline rows
            let activeNow = 0;
            for (let s = 0; s < P; s++) {
                const ry = gridY + s * (rowH + 6);
                svg.appendChild(el('text', {
                    x: gridX - 10, y: ry + rowH / 2 + 4, 'text-anchor': 'end',
                    'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--vz-ink)',
                }, `GPU ${s}`));
                svg.appendChild(el('rect', {
                    x: gridX, y: ry, width: totalT * slotW, height: rowH, rx: 4,
                    fill: 'var(--vz-tile-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1,
                }));

                for (const blk of rows[s]) {
                    const past = blk.t < st.cursor;
                    const now = blk.t === st.cursor;
                    if (now) activeNow++;
                    const bx = gridX + blk.t * slotW + 1;
                    const col = blk.type === 'F' ? (blk.v > 0 ? 'var(--vz-plum)' : 'var(--vz-navy)') : (blk.v > 0 ? 'var(--vz-amber)' : 'var(--vz-teal)');
                    svg.appendChild(el('rect', {
                        x: bx, y: ry + 2, width: Math.max(6, slotW - 2), height: rowH - 4, rx: 3.5,
                        fill: col, opacity: (st.cursor === 0 || past || now) ? 1 : 0.34,
                        stroke: now ? '#ffffff' : 'none', 'stroke-width': now ? 2 : 0,
                    }));
                    if (slotW >= 18) {
                        svg.appendChild(el('text', {
                            x: bx + (slotW - 2) / 2, y: ry + rowH / 2 + 4, 'text-anchor': 'middle',
                            'font-size': slotW >= 26 ? 10.5 : 9, 'font-family': 'var(--mono)', 'font-weight': 700, fill: '#ffffff',
                        }, `${blk.type}${blk.m}`));
                    }
                }
            }

            // Sweeping cursor line
            if (st.cursor < totalT) {
                const cx = gridX + st.cursor * slotW + slotW / 2;
                svg.appendChild(el('line', {
                    x1: cx, y1: gridY - 8, x2: cx, y2: gridY + P * (rowH + 6) - 2,
                    stroke: 'var(--vz-red)', 'stroke-width': 2, 'stroke-dasharray': '4 2',
                }));
            }

            // Footer formula
            svg.appendChild(el('text', {
                x: gridX, y: 294, 'font-size': 12, 'font-family': 'var(--mono)', fill: 'var(--vz-muted)',
            }, `Tick ${st.cursor}/${totalT} · Active GPUs now: ${st.cursor === 0 ? 0 : activeNow}/${P}`));

            const bubblePct = (bubbleFrac * 100).toFixed(1);
            setMetrics(metrics, [
                { label: t('Pipeline Bubble', '气泡空闲率'), val: `${bubblePct}%`, tone: bubbleFrac < 0.2 ? 'good' : (bubbleFrac > 0.5 ? 'bad' : 'warn') },
                { label: t('Peak S0 Buffered', 'S0 峰值激活微批'), val: `${maxBufS0} (${st.mode === 'GPipe' ? 'O(M)' : 'O(P)'})`, tone: maxBufS0 <= P ? 'good' : 'warn' },
                { label: t('Total Time Slots', '总耗时节拍'), val: `${totalT} ticks` },
            ]);

            caption.innerHTML = st.mode === '1F1B' || st.mode === 'Interleaved'
                ? t('<strong>Why 1F1B beats GPipe at large M:</strong> Drag <code>M</code> up to 12—GPipe piles all 12 micro-batches in Stage 0 HBM before releasing a single one, whereas <code>1F1B</code> stabilizes Stage 0 peak queue cleanly near <code>P</code>!',
                    '<strong>为什么大 M 时必用 1F1B：</strong>把上面 <code>M</code> 拖到 12 试试——GPipe 会把整整 12 份微批全堆在 Stage 0 显存里才开始释放；而 <code>1F1B</code> 稳稳把滞留峰值锁死在 <code>O(P)</code>，<code>Interleaved v=2</code> 还能再把气泡压缩一倍！')
                : t('<strong>Bubble Fraction (P-1)/(M+P-1):</strong> Watch how raising micro-batches <code>M</code> relative to pipeline stages <code>P</code> amortizes fill and drain idle slots.',
                    '<strong>气泡率公式 (P-1)/(M+P-1)：</strong>拖动微批数 <code>M</code>（如 <code>M ≥ 4P</code>），观察两端空转斜坡如何迅速被稠密的并行计算填平。');
        }

        render();
    }

    /* =====================================================================
       LAB 6: MoE All-to-All Token Flight, Capacity Factor & Aux Loss Simulator
       ===================================================================== */
    function initMoeLab(root, demoActive) {
        const { controls, svg, metrics, caption } = createShell(root, {
            eyebrow: t('Interactive Lab 6 · DeepSpeed-Megatron MoE & MOELayer', '交互实验室 6 · MoE All-to-All 路由与容量截断'),
            title: t('Two-Pass All-to-All Token Flight, Expert Capacity & Drop/Pad Simulator', 'MoE 两趟 All-to-All 动态飞行轨迹、Capacity 截断与负载均衡模拟器'),
            hint: t('Try Skewed mode at CF=1.0 vs CF=1.5 to rescue dropped tokens', '试试 Skewed 偏斜模式对比 CF=1.0 丢包与 CF=1.5 挽救效果'),
            viewBox: '0 0 880 318',
        });

        const st = {
            preset: demoActive ? 'skew' : '2gpu', // '2gpu' | '4bal' | 'skew'
            cf: 1.0,
            step: demoActive ? 2 : 0, // 0=Input, 1=Gate/Cap, 2=Dispatch A2A, 3=Expert FFN, 4=Combine A2A
        };

        const gPre = h('div', 'viz-btn-group');
        const pBtns = {};
        for (const [id, lbl] of [['2gpu', '2-GPU (a,b,c,d)'], ['4bal', t('4-GPU Balanced', '4卡均衡')], ['skew', t('4-GPU Skewed', '4卡热门偏斜')]]) {
            const b = makeBtn(lbl, () => { loop.stop(btnPlay); st.preset = id; st.step = 1; render(); });
            pBtns[id] = b;
            gPre.appendChild(b);
        }

        const gCF = h('div', 'viz-btn-group');
        const cfBtns = {};
        for (const v of [1.0, 1.25, 1.5]) {
            const b = makeBtn(`CF=${v}`, () => { st.cf = v; render(); }, 'is-amber');
            cfBtns[v] = b;
            gCF.appendChild(b);
        }
        const btnPlay = makeBtn(TXT.play, () => loop.toggle(btnPlay), 'is-play');
        const btnStep = makeBtn(TXT.step, () => { loop.stop(btnPlay); st.step = (st.step + 1) % 5; render(); });
        gCF.append(btnPlay, btnStep);
        controls.append(gPre, gCF);

        const loop = makeLoop(() => {
            st.step = (st.step + 1) % 5;
            render();
        }, 1100);

        const phaseTitles = isZh ? [
            '0 · Attention 输出各卡本地 Token',
            '1 · TopKGate 门控打分 & Capacity 槽位判定',
            '2 · 第 1 次 All-to-All (Dispatch) 跨卡奔赴目标专家',
            '3 · 目标卡就地执行 Expert FFN (权重不动！)',
            '4 · 第 2 次 All-to-All (Combine) 返回原卡汇入残差',
        ] : [
            '0 · Local Tokens After Shared Attention',
            '1 · TopKGate Routing Probabilities & Capacity Mask',
            '2 · 1st All-to-All (Dispatch): Tokens Fly to Pinpointed Experts',
            '3 · Local Expert FFN GEMMs (Weights Stay Stationary!)',
            '4 · 2nd All-to-All (Combine): Outputs Return & Merge Residuals',
        ];

        function buildScenario() {
            if (st.preset === '2gpu') {
                return {
                    nG: 2, nTokPerGpu: 2,
                    tokens: [
                        { id: 'a', src: 0, slot: 0, dst: 0, p: 0.85 },
                        { id: 'b', src: 0, slot: 1, dst: 1, p: 0.78 },
                        { id: 'c', src: 1, slot: 0, dst: 0, p: 0.82 },
                        { id: 'd', src: 1, slot: 1, dst: 1, p: 0.91 },
                    ],
                };
            }
            if (st.preset === '4bal') {
                return {
                    nG: 4, nTokPerGpu: 2,
                    tokens: [
                        { id: 't0', src: 0, slot: 0, dst: 2, p: 0.72 },
                        { id: 't1', src: 0, slot: 1, dst: 0, p: 0.68 },
                        { id: 't2', src: 1, slot: 0, dst: 3, p: 0.75 },
                        { id: 't3', src: 1, slot: 1, dst: 1, p: 0.69 },
                        { id: 't4', src: 2, slot: 0, dst: 1, p: 0.71 },
                        { id: 't5', src: 2, slot: 1, dst: 3, p: 0.66 },
                        { id: 't6', src: 3, slot: 0, dst: 0, p: 0.79 },
                        { id: 't7', src: 3, slot: 1, dst: 2, p: 0.74 },
                    ],
                };
            }
            // Skewed: 4 tokens flock to Expert 0, 2 to Expert 1, 2 to Expert 2, 0 to Expert 3!
            return {
                nG: 4, nTokPerGpu: 2,
                tokens: [
                    { id: 't0', src: 0, slot: 0, dst: 0, p: 0.92 },
                    { id: 't1', src: 0, slot: 1, dst: 0, p: 0.88 },
                    { id: 't2', src: 1, slot: 0, dst: 0, p: 0.86 },
                    { id: 't3', src: 1, slot: 1, dst: 1, p: 0.61 },
                    { id: 't4', src: 2, slot: 0, dst: 0, p: 0.79 },
                    { id: 't5', src: 2, slot: 1, dst: 2, p: 0.64 },
                    { id: 't6', src: 3, slot: 0, dst: 1, p: 0.63 },
                    { id: 't7', src: 3, slot: 1, dst: 2, p: 0.59 },
                ],
            };
        }

        function render() {
            for (const [k, b] of Object.entries(pBtns)) b.classList.toggle('is-active', st.preset === k);
            for (const [k, b] of Object.entries(cfBtns)) b.classList.toggle('is-active', st.cf === Number(k));
            svg.innerHTML = '';
            addDefs(svg);

            const sc = buildScenario();
            const nG = sc.nG;
            const totalTok = sc.tokens.length;
            const C = Math.ceil((totalTok / nG) * st.cf); // Expert Capacity per expert

            // Assign capacity slots & compute full normalized softmax L_aux / alpha >= 1.0
            const used = Array(nG).fill(0);
            const routedCounts = Array(nG).fill(0);
            const pSums = Array(nG).fill(0);
            for (const tok of sc.tokens) {
                routedCounts[tok.dst]++;
                const remP = (1 - tok.p) / Math.max(1, nG - 1);
                for (let e = 0; e < nG; e++) {
                    pSums[e] += (e === tok.dst) ? tok.p : remP;
                }
                if (used[tok.dst] < C) {
                    tok.capIdx = used[tok.dst]++;
                    tok.dropped = false;
                } else {
                    tok.capIdx = -1;
                    tok.dropped = true;
                }
            }
            const droppedCount = sc.tokens.filter((tk) => tk.dropped).length;
            let auxOverAlpha = 0;
            for (let e = 0; e < nG; e++) {
                auxOverAlpha += nG * (routedCounts[e] / totalTok) * (pSums[e] / totalTok);
            }

            // Phase Banner
            svg.appendChild(el('rect', { x: 24, y: 12, width: 832, height: 30, rx: 6, fill: 'var(--vz-amber-bg)' }));
            svg.appendChild(el('text', { x: 440, y: 32, 'text-anchor': 'middle', 'font-size': 12.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--vz-amber)' }, phaseTitles[st.step]));

            // Top GPUs (src) y=54..116, Bottom Experts (dst) y=224..294
            const spanW = 832 / nG;
            const boxW = Math.min(340, spanW - 22);
            const srcX = (g) => 24 + g * spanW + (spanW - boxW) / 2;

            for (let g = 0; g < nG; g++) {
                const bx = srcX(g);
                // Top GPU Source Box
                svg.appendChild(el('rect', {
                    x: bx, y: 54, width: boxW, height: 58, rx: 8,
                    fill: 'var(--vz-card-bg)', stroke: COLORS[g % 4].stroke, 'stroke-width': 1.5,
                }));
                svg.appendChild(el('text', {
                    x: bx + 12, y: 74, 'font-size': 12, 'font-family': 'var(--mono)', 'font-weight': 700, fill: COLORS[g % 4].ink,
                }, `GPU ${g}`));

                // Bottom Expert Box
                svg.appendChild(el('rect', {
                    x: bx, y: 218, width: boxW, height: 78, rx: 8,
                    fill: st.step === 3 ? COLORS[g % 4].fill : 'var(--vz-card-bg)',
                    stroke: COLORS[g % 4].stroke, 'stroke-width': st.step === 3 ? 2.4 : 1.5,
                }));
                svg.appendChild(el('text', {
                    x: bx + 12, y: 238, 'font-size': 12, 'font-family': 'var(--mono)', 'font-weight': 700, fill: COLORS[g % 4].ink,
                }, `Expert ${g} (GPU ${g}) · C=${C}`));

                // Capacity slot outlines inside Expert box
                const slotW = Math.min(54, (boxW - 24 - (C - 1) * 5) / C);
                for (let cIdx = 0; cIdx < C; cIdx++) {
                    const sx = bx + 12 + cIdx * (slotW + 5);
                    svg.appendChild(el('rect', {
                        x: sx, y: 248, width: slotW, height: 34, rx: 4,
                        fill: 'var(--vz-tile-bg)', stroke: 'var(--vz-line)', 'stroke-dasharray': '3 2',
                    }));
                    if (st.step >= 2 && cIdx >= used[g]) {
                        svg.appendChild(el('text', {
                            x: sx + slotW / 2, y: 269, 'text-anchor': 'middle',
                            'font-size': 10, 'font-family': 'var(--mono)', fill: 'var(--vz-muted)',
                        }, '0 pad'));
                    }
                }
            }

            // Render every token pill + smooth trajectory lines
            for (const tok of sc.tokens) {
                const startCx = srcX(tok.src) + boxW * (tok.slot === 0 ? 0.34 : 0.72);
                const startCy = 92;
                const slotW = Math.min(54, (boxW - 24 - (C - 1) * 5) / C);
                const dstCx = tok.dropped ? startCx : srcX(tok.dst) + 12 + tok.capIdx * (slotW + 5) + slotW / 2;
                const dstCy = 265;

                // Trajectory path during dispatch/expert/combine
                if (st.step >= 2) {
                    if (tok.dropped) {
                        svg.appendChild(el('line', {
                            x1: startCx, y1: 112, x2: startCx, y2: 204,
                            stroke: 'var(--vz-red)', 'stroke-width': 1.8, 'stroke-dasharray': '4 3',
                        }));
                        svg.appendChild(el('rect', {
                            x: startCx - 24, y: 125, width: 48, height: 18, rx: 4,
                            fill: 'var(--vz-red-bg)', stroke: 'var(--vz-red)', 'stroke-width': 1,
                        }));
                        svg.appendChild(el('text', {
                            x: startCx, y: 138, 'text-anchor': 'middle', 'font-size': 9.5, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--vz-red)',
                        }, 'DROP'));
                    } else {
                        const d = `M ${startCx} 112 C ${startCx} 165, ${dstCx} 165, ${dstCx} 218`;
                        const reverse = st.step === 4;
                        svg.appendChild(el('path', {
                            d: reverse ? `M ${dstCx} 218 C ${dstCx} 165, ${startCx} 165, ${startCx} 112` : d,
                            fill: 'none',
                            stroke: COLORS[tok.dst % 4].stroke,
                            'stroke-width': (st.step === 2 || st.step === 4) ? 2.2 : 1.3,
                            opacity: (st.step === 2 || st.step === 4) ? 0.92 : 0.4,
                            'marker-end': (st.step === 2 || st.step === 4) ? 'url(#mNavy)' : null,
                        }));
                    }
                }

                // Token pill position depending on current phase step (stagger y slightly on crossings so pills never collide)
                let px = startCx, py = startCy;
                if (st.step === 2 && !tok.dropped) {
                    const u = tok.slot === 0 ? 0.36 : 0.64;
                    const mt = 1 - u;
                    px = mt * mt * mt * startCx + 3 * mt * mt * u * startCx + 3 * mt * u * u * dstCx + u * u * u * dstCx;
                    py = mt * mt * mt * 112 + 3 * mt * mt * u * 165 + 3 * mt * u * u * 165 + u * u * u * 218;
                } else if (st.step === 3 && !tok.dropped) { px = dstCx; py = dstCy; }
                else if (st.step === 4 && !tok.dropped) { px = startCx; py = startCy; }

                const col = tok.dropped && st.step >= 1 ? { fill: 'var(--vz-red-bg)', stroke: 'var(--vz-red)', ink: 'var(--vz-red)' } : COLORS[tok.dst % 4];
                const label = st.step === 4 ? `${tok.id}'` : (st.step === 1 ? `${tok.id}→E${tok.dst}` : tok.id);
                const pw = st.step === 1 ? 56 : 40;
                svg.appendChild(el('rect', {
                    x: px - pw / 2, y: py - 13, width: pw, height: 26, rx: 5,
                    fill: col.fill, stroke: col.stroke, 'stroke-width': 1.7,
                }));
                svg.appendChild(el('text', {
                    x: px, y: py + 4, 'text-anchor': 'middle',
                    'font-size': 11, 'font-family': 'var(--mono)', 'font-weight': 700, fill: col.ink,
                }, label));
            }

            setMetrics(metrics, [
                { label: t('Capacity C / Expert', '单专家容量 C'), val: `${C} slots` },
                { label: t('Dropped Tokens', '溢出丢弃数'), val: `${droppedCount} / ${totalTok}`, tone: droppedCount > 0 ? 'bad' : 'good' },
                { label: 'L_aux / α', val: auxOverAlpha.toFixed(2) + (st.preset === 'skew' ? ' (skewed)' : ' (ideal ~1.0)'), tone: auxOverAlpha > 1.25 ? 'warn' : 'good' },
            ]);

            caption.innerHTML = st.preset === 'skew'
                ? t('<strong>Skewed Routing vs. Capacity Factor:</strong> When 4 of 8 tokens flood <code>Expert 0</code> at <code>CF=1.0</code> (<code>C=2</code>), tokens <code>t2</code> and <code>t4</code> overflow and are dropped onto the residual bypass while <code>Expert 3</code> pads zeros! Switch to <code>CF=1.5</code> (<code>C=3</code>) or raise <code>L_aux</code> to save them.',
                    '<strong>偏斜路由与 Capacity Factor：</strong>当 8 个 token 里有 4 个涌向 <code>Expert 0</code> 时，<code>CF=1.0</code>（<code>C=2</code>）会当场把 <code>t2</code>、<code>t4</code> 强制丢弃直通残差，而另一边 <code>Expert 3</code> 空着补零！点上方 <code>CF=1.5</code> 可立即观察扩容与 <code>L_aux</code> 对均衡度的影响。')
                : t('<strong>Why Experts stay put while Tokens fly:</strong> Compare with ZeRO-3: instead of <code>AllGather</code>ing huge expert FFNs, GPUs hold disjoint experts stationary and exchange small hidden tokens in two <code>All-to-All</code> passes (1/4× ring cost of AllGather!).',
                    '<strong>与 ZeRO-3 的核心反演：</strong>与其搬运庞大的百亿级专家权重，不如把专家权重钉死在原地，用两次 <code>All-to-All</code>（仅 <code>AllGather</code> 环代价的 <code>1/4</code>）把轻量 Token 寄过去算完再寄回！');
        }

        render();
    }

    /* =====================================================================
       Mount All Containers & Support ?viz_demo=active
       ===================================================================== */
    const REGISTRY = {
        'mesh-lab': initMeshLab,
        'ring-matmul-lab': initRingMatmulLab,
        'zero-lab': initZeroLab,
        'tp-lab': initTpLab,
        'pipeline-lab': initPipelineLab,
        'moe-lab': initMoeLab,
    };

    const demoActive = new URLSearchParams(window.location.search).get('viz_demo') === 'active';
    const containers = document.querySelectorAll('.viz-lab[data-viz]');
    for (const elBox of containers) {
        const key = elBox.getAttribute('data-viz');
        if (REGISTRY[key]) {
            REGISTRY[key](elBox, demoActive);
        }
    }
})();
