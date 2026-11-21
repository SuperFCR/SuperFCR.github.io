/* Auto-looping editorial inline animations for /blogs/distributed-training/.
   Mounts onto figure.anim-fig[data-anim] elements and renders EN or ZH automatically. */
(function () {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';
    const isZh = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
    const demoParam = new URLSearchParams(window.location.search).get('viz_demo');
    const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const COL = {
        navy:  { fg: 'var(--vz-navy)',  bg: 'var(--vz-navy-bg)' },
        teal:  { fg: 'var(--vz-teal)',  bg: 'var(--vz-teal-bg)' },
        amber: { fg: 'var(--vz-amber)', bg: 'var(--vz-amber-bg)' },
        plum:  { fg: 'var(--vz-plum)',  bg: 'var(--vz-plum-bg)' },
        red:   { fg: 'var(--vz-red)',   bg: 'var(--vz-red-bg)' },
        muted: { fg: 'var(--vz-muted)', bg: 'var(--vz-tile-bg)' }
    };
    const GROUP_COLS = [COL.navy, COL.teal, COL.amber, COL.plum];

    function t(en, zh) {
        return isZh ? zh : en;
    }

    function el(tag, attrs, text) {
        const node = document.createElementNS(NS, tag);
        if (attrs) {
            Object.keys(attrs).forEach((k) => {
                if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, String(attrs[k]));
            });
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

    function addArrowDefs(svg) {
        const defs = el('defs');
        [
            ['arr-navy', 'var(--vz-navy)'],
            ['arr-teal', 'var(--vz-teal)'],
            ['arr-amber', 'var(--vz-amber)'],
            ['arr-plum', 'var(--vz-plum)'],
            ['arr-muted', 'var(--vz-muted)']
        ].forEach(([id, color]) => {
            const m = el('marker', {
                id, viewBox: '0 0 10 10', refX: '8.5', refY: '5',
                markerWidth: '5.5', markerHeight: '5.5', orient: 'auto-start-reverse'
            });
            m.appendChild(el('path', { d: 'M 0 1.5 L 8.5 5 L 0 8.5 z', fill: color }));
            defs.appendChild(m);
        });
        svg.appendChild(defs);
    }

    function drawChip(svg, x, y, w, hgt, label, col, active) {
        svg.appendChild(el('rect', {
            x, y, width: w, height: hgt, rx: 4,
            fill: col.bg, stroke: col.fg,
            'stroke-width': active ? 1.8 : 1.1
        }));
        svg.appendChild(el('text', {
            x: x + w / 2, y: y + hgt / 2 + 3.5,
            'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 650,
            'font-family': 'var(--mono)', fill: col.fg
        }, label));
    }

    function drawBox(svg, x, y, w, hgt, label, sub, col, active) {
        svg.appendChild(el('rect', {
            x, y, width: w, height: hgt, rx: 6,
            fill: active ? col.bg : 'var(--vz-card-bg)',
            stroke: col.fg,
            'stroke-width': active ? 2 : 1.2
        }));
        if (sub) {
            svg.appendChild(el('text', {
                x: x + w / 2, y: y + hgt / 2 - 2,
                'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700,
                'font-family': 'var(--sans)', fill: active ? col.fg : 'var(--vz-ink)'
            }, label));
            svg.appendChild(el('text', {
                x: x + w / 2, y: y + hgt / 2 + 12,
                'text-anchor': 'middle', 'font-size': 9.5,
                'font-family': 'var(--mono)', fill: active ? col.fg : 'var(--vz-muted)'
            }, sub));
        } else {
            svg.appendChild(el('text', {
                x: x + w / 2, y: y + hgt / 2 + 4,
                'text-anchor': 'middle', 'font-size': 11, 'font-weight': 650,
                'font-family': 'var(--sans)', fill: active ? col.fg : 'var(--vz-ink)'
            }, label));
        }
    }

    function mountAnim(fig, cfg) {
        const box = h('div', 'anim-box');
        const bar = h('div', 'anim-bar');
        const pillsWrap = h('div', 'anim-pills');
        const rightWrap = h('div', 'anim-right');
        const statusEl = h('span', 'anim-status');
        const toggleBtn = h('button', 'anim-toggle');
        toggleBtn.type = 'button';

        const pillNodes = [];
        if (cfg.pills && cfg.pills.length) {
            cfg.pills.forEach((p, idx) => {
                const btn = h('button', 'anim-pill', p.label);
                btn.type = 'button';
                btn.addEventListener('click', () => {
                    if (cfg.onPill) cfg.onPill(idx, p);
                });
                pillsWrap.appendChild(btn);
                pillNodes.push(btn);
            });
        }
        bar.appendChild(pillsWrap);

        let paused = prefersReduced || demoParam === 'static';
        let visible = demoParam === 'active' || !('IntersectionObserver' in window);
        let timer = null;

        function syncToggleUI() {
            toggleBtn.textContent = paused ? '▶' : '❚❚';
            toggleBtn.title = paused ? t('Play animation', '播放动画') : t('Pause animation', '暂停动画');
            toggleBtn.setAttribute('aria-label', toggleBtn.title);
            box.classList.toggle('is-paused', paused);
        }

        function stopTimer() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }

        function startTimer() {
            stopTimer();
            if (paused || !visible || demoParam === 'active') return;
            timer = setInterval(() => {
                if (!paused && visible) cfg.onTick();
            }, cfg.stepMs || 1600);
        }

        toggleBtn.addEventListener('click', () => {
            paused = !paused;
            syncToggleUI();
            if (paused) stopTimer();
            else startTimer();
        });

        rightWrap.appendChild(statusEl);
        rightWrap.appendChild(toggleBtn);
        bar.appendChild(rightWrap);

        const stage = h('div', 'anim-stage');
        const svg = el('svg', { viewBox: `0 0 760 ${cfg.height}`, role: 'img', 'aria-label': cfg.aria || '' });
        stage.appendChild(svg);

        box.appendChild(bar);
        box.appendChild(stage);

        const cap = fig.querySelector('figcaption');
        if (cap) fig.insertBefore(box, cap);
        else fig.appendChild(box);

        if ('IntersectionObserver' in window && demoParam !== 'active') {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    visible = entry.isIntersecting;
                    if (visible) startTimer();
                    else stopTimer();
                });
            }, { threshold: 0.12 });
            io.observe(box);
        }

        syncToggleUI();
        startTimer();

        return {
            svg,
            setStatus: (s) => { statusEl.textContent = s; },
            setActivePill: (idx) => {
                pillNodes.forEach((n, i) => n.classList.toggle('is-active', i === idx));
            },
            setPaused: (val) => {
                paused = !!val;
                syncToggleUI();
                if (paused) stopTimer();
                else startTimer();
            }
        };
    }

    /* =========================================================================
       1. mesh-sharding: 8x4 Mesh(X=8, Y=4) + A[E_Y, F] vs A[E_XY, F] vs A[E_Y, F_X]
    ========================================================================= */
    function initMeshSharding(fig) {
        const MODES = [
            { id: 'ey_f',   label: 'A[E_Y, F]',   rows: 4, cols: 1, rep: 8,  local: '[512, 8192]', mib: '8 MiB',  key: 'rows=2048/4, cols=8192' },
            { id: 'exy_f',  label: 'A[E_XY, F]',  rows: 32, cols: 1, rep: 1, local: '[64, 8192]',  mib: '1 MiB',  key: 'rows=2048/32, cols=8192' },
            { id: 'ey_fx',  label: 'A[E_Y, F_X]', rows: 4, cols: 8, rep: 1,  local: '[512, 1024]', mib: '1 MiB',  key: 'rows=2048/4, cols=8192/8' }
        ];
        let modeIdx = 0;
        let selX = 0;
        let selY = 0;

        const ui = mountAnim(fig, {
            height: 248,
            stepMs: 2600,
            aria: t('32-GPU 8x4 device mesh sharding map', '32 卡 8x4 设备网格分片图'),
            pills: MODES.map((m) => ({ label: m.label })),
            onPill: (idx) => {
                modeIdx = idx;
                ui.setPaused(true);
                render();
            },
            onTick: () => {
                modeIdx = (modeIdx + 1) % MODES.length;
                render();
            }
        });

        function shardCoord(x, y, mode) {
            if (mode.id === 'ey_f') return { r: y, c: 0, sameShard: (ox, oy) => oy === y };
            if (mode.id === 'exy_f') return { r: x * 4 + y, c: 0, sameShard: (ox, oy) => ox === x && oy === y };
            return { r: y, c: x, sameShard: (ox, oy) => oy === y && ox === x };
        }

        function render() {
            const m = MODES[modeIdx];
            const svg = ui.svg;
            svg.innerHTML = '';
            ui.setActivePill(modeIdx);
            ui.setStatus(`${m.label} · ${m.local} · ${m.mib}`);

            // Column headers Y=0..3
            svg.appendChild(el('text', {
                x: 24, y: 20, 'font-size': 10.5, 'font-family': 'var(--mono)', fill: 'var(--vz-muted)'
            }, 'X\\Y'));
            for (let y = 0; y < 4; y++) {
                svg.appendChild(el('text', {
                    x: 92 + y * 98, y: 20, 'text-anchor': 'middle',
                    'font-size': 10.5, 'font-weight': 700, 'font-family': 'var(--mono)',
                    fill: GROUP_COLS[y].fg
                }, `Y=${y}`));
            }

            const selCoord = shardCoord(selX, selY, m);

            for (let x = 0; x < 8; x++) {
                const ry = 30 + x * 25;
                svg.appendChild(el('text', {
                    x: 24, y: ry + 15, 'font-size': 10.5, 'font-weight': x === selX ? 700 : 500,
                    'font-family': 'var(--mono)', fill: x === selX ? 'var(--vz-ink)' : 'var(--vz-muted)'
                }, `X=${x}`));

                for (let y = 0; y < 4; y++) {
                    const cx = 50 + y * 98;
                    const col = m.id === 'exy_f' ? GROUP_COLS[(x * 4 + y) % 4] : GROUP_COLS[y];
                    const isSel = x === selX && y === selY;
                    const isPeer = !isSel && selCoord.sameShard(x, y);

                    const g = el('g', { style: 'cursor:pointer' });
                    g.addEventListener('click', () => {
                        selX = x;
                        selY = y;
                        render();
                    });

                    g.appendChild(el('rect', {
                        x: cx, y: ry, width: 90, height: 21, rx: 4,
                        fill: isSel ? col.bg : (isPeer ? col.bg : 'var(--vz-card-bg)'),
                        stroke: col.fg,
                        'stroke-width': isSel ? 2.1 : (isPeer ? 1.5 : 0.9),
                        'stroke-dasharray': isPeer ? '3 2' : null,
                        opacity: isSel || isPeer || m.id === 'ey_f' ? 1 : 0.85
                    }));

                    const lbl = m.id === 'ey_f'
                        ? `(${y},${x}) 512×8k`
                        : (m.id === 'exy_f' ? `#${x * 4 + y} 64×8k` : `(${y},${x}) 512×1k`);
                    g.appendChild(el('text', {
                        x: cx + 45, y: ry + 14, 'text-anchor': 'middle',
                        'font-size': 9.5, 'font-weight': isSel ? 700 : 550,
                        'font-family': 'var(--mono)', fill: isSel ? col.fg : 'var(--vz-ink)'
                    }, lbl));
                    svg.appendChild(g);
                }
            }

            // Right panel: global tensor [2048, 8192] shard map
            svg.appendChild(el('rect', {
                x: 458, y: 20, width: 286, height: 212, rx: 7,
                fill: 'var(--vz-card-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
            }));
            svg.appendChild(el('text', {
                x: 474, y: 40, 'font-size': 11, 'font-weight': 700,
                'font-family': 'var(--sans)', fill: 'var(--vz-ink)'
            }, `GPU (X=${selX}, Y=${selY}) ${t('Local Shard', '本地分片')}`));
            svg.appendChild(el('text', {
                x: 474, y: 55, 'font-size': 10,
                'font-family': 'var(--mono)', fill: 'var(--vz-muted)'
            }, `Global A [E=2048, F=8192]`));

            const gx = 474, gy = 66, gw = 254, gh = 112;
            svg.appendChild(el('rect', {
                x: gx, y: gy, width: gw, height: gh, rx: 4,
                fill: 'var(--vz-tile-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
            }));

            const ch = gh / m.rows;
            const cw = gw / m.cols;
            for (let r = 0; r < m.rows; r++) {
                if (r > 0 && (m.rows <= 8 || r % 4 === 0)) {
                    svg.appendChild(el('line', {
                        x1: gx, y1: gy + r * ch, x2: gx + gw, y2: gy + r * ch,
                        stroke: 'var(--vz-line)', 'stroke-width': 0.7, 'stroke-dasharray': '2 2'
                    }));
                }
            }
            for (let c = 1; c < m.cols; c++) {
                svg.appendChild(el('line', {
                    x1: gx + c * cw, y1: gy, x2: gx + c * cw, y2: gy + gh,
                    stroke: 'var(--vz-line)', 'stroke-width': 0.7, 'stroke-dasharray': '2 2'
                }));
            }
            const selCol = m.id === 'exy_f' ? GROUP_COLS[(selX * 4 + selY) % 4] : GROUP_COLS[selY];
            svg.appendChild(el('rect', {
                x: gx + selCoord.c * cw + 1, y: gy + selCoord.r * ch + 1,
                width: Math.max(4, cw - 2), height: Math.max(3, ch - 2), rx: 2,
                fill: selCol.bg, stroke: selCol.fg, 'stroke-width': 1.8
            }));

            svg.appendChild(el('text', {
                x: 474, y: 198, 'font-size': 10.5, 'font-weight': 650,
                'font-family': 'var(--mono)', fill: selCol.fg
            }, `${t('Local', '局部形状')}: ${m.local} = ${m.mib}`));
            svg.appendChild(el('text', {
                x: 474, y: 215, 'font-size': 10,
                'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, m.rep > 1
                ? t(`Replicated ${m.rep}x along X (dashed peers)`, `沿 X 轴复制 ${m.rep} 份（虚线框为同片副本）`)
                : t(`No replicas (${m.key})`, `整网零冗余副本（${m.key}）`)));
        }

        render();
    }

    /* =========================================================================
       2. collectives-toy: [1,2] & [3,4] across AllGather / ReduceScatter / AllReduce / All-to-All
    ========================================================================= */
    function initCollectivesToy(fig) {
        const FRAMES = [
            { op: 'ag', pill: 0, label: 'AllGather',      g0: ['1', '2', '3', '4'], g1: ['1', '2', '3', '4'], flow: 'ag',  note: t('Gather all shards to both GPUs', '互发完整分片并按序拼接') },
            { op: 'rs', pill: 1, label: 'ReduceScatter',  g0: ['4'],                g1: ['6'],                flow: 'rs',  note: t('Sum [1+3, 2+4], scatter halves', '按位置相加再各自留下一半') },
            { op: 'ar1', pill: 2, label: 'AllReduce 1/2', g0: ['4'],                g1: ['6'],                flow: 'rs',  note: t('Phase 1/2: ReduceScatter -> [4] | [6]', '第 1 步先 ReduceScatter 得到 [4] 与 [6]') },
            { op: 'ar2', pill: 2, label: 'AllReduce 2/2', g0: ['4', '6'],           g1: ['4', '6'],           flow: 'ag',  note: t('Phase 2/2: AllGather -> [4, 6]', '第 2 步再 AllGather 拼出完整 [4, 6]') },
            { op: 'a2a', pill: 3, label: 'All-to-All',    g0: ['1', '3'],           g1: ['2', '4'],           flow: 'a2a', note: t('Chunk 0 -> GPU 0, Chunk 1 -> GPU 1', '按目标卡交换各自第 0/1 块') }
        ];
        const PILLS = [
            { label: 'AllGather', frame: 0 },
            { label: 'ReduceScatter', frame: 1 },
            { label: 'AllReduce (RS+AG)', frame: 2 },
            { label: 'All-to-All', frame: 4 }
        ];
        let step = 0;

        const ui = mountAnim(fig, {
            height: 196,
            stepMs: 1900,
            aria: t('Four collectives compared on [1,2] and [3,4]', '用 [1,2] 和 [3,4] 演示四种集合通信'),
            pills: PILLS.map((p) => ({ label: p.label })),
            onPill: (idx, p) => {
                step = PILLS[idx].frame;
                if (idx === 2) ui.setPaused(false);
                else ui.setPaused(true);
                render();
            },
            onTick: () => {
                step = (step + 1) % FRAMES.length;
                render();
            }
        });

        function render() {
            const f = FRAMES[step];
            const svg = ui.svg;
            svg.innerHTML = '';
            addArrowDefs(svg);
            ui.setActivePill(f.pill);
            ui.setStatus(f.label);

            // GPU 0 card (left) & GPU 1 card (right)
            const drawRankCard = (x, title, initVals, outVals, col, activeOut) => {
                svg.appendChild(el('rect', {
                    x, y: 16, width: 210, height: 152, rx: 8,
                    fill: 'var(--vz-card-bg)', stroke: col.fg, 'stroke-width': 1.4
                }));
                svg.appendChild(el('text', {
                    x: x + 14, y: 36, 'font-size': 12, 'font-weight': 700,
                    'font-family': 'var(--mono)', fill: col.fg
                }, title));

                svg.appendChild(el('text', {
                    x: x + 14, y: 58, 'font-size': 9.5, 'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
                }, t('Initial', '初始')));
                initVals.forEach((v, i) => {
                    drawChip(svg, x + 64 + i * 44, 42, 38, 22, v, col, false);
                });

                svg.appendChild(el('line', {
                    x1: x + 14, y1: 78, x2: x + 196, y2: 78, stroke: 'var(--vz-line)', 'stroke-width': 1
                }));

                svg.appendChild(el('text', {
                    x: x + 14, y: 98, 'font-size': 9.5, 'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
                }, t('Result', '结果')));

                const chipW = outVals.length > 2 ? 32 : 42;
                const gap = outVals.length > 2 ? 5 : 8;
                outVals.forEach((v, i) => {
                    drawChip(svg, x + 14 + i * (chipW + gap), 110, chipW, 28, v, activeOut, true);
                });
            };

            const outCol = f.flow === 'rs' ? COL.teal : (f.flow === 'a2a' ? COL.amber : COL.navy);
            drawRankCard(20, 'GPU 0', ['1', '2'], f.g0, COL.navy, outCol);
            drawRankCard(530, 'GPU 1', ['3', '4'], f.g1, COL.teal, outCol);

            // Center flow exchange zone (x=240..520)
            svg.appendChild(el('rect', {
                x: 248, y: 34, width: 264, height: 112, rx: 8,
                fill: 'var(--vz-tile-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
            }));
            svg.appendChild(el('text', {
                x: 380, y: 54, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: outCol.fg
            }, f.label));

            if (f.flow === 'ag') {
                const l1 = el('line', {
                    x1: 234, y1: 80, x2: 524, y2: 80,
                    stroke: COL.navy.fg, 'stroke-width': 1.8, 'marker-end': 'url(#arr-navy)'
                });
                l1.setAttribute('class', 'vz-flow');
                svg.appendChild(l1);
                drawChip(svg, 336, 67, 88, 22, f.op === 'ar2' ? 'send [4]' : 'send [1,2]', COL.navy, true);

                const l2 = el('line', {
                    x1: 526, y1: 112, x2: 236, y2: 112,
                    stroke: COL.teal.fg, 'stroke-width': 1.8, 'marker-end': 'url(#arr-teal)'
                });
                l2.setAttribute('class', 'vz-flow');
                svg.appendChild(l2);
                drawChip(svg, 336, 99, 88, 22, f.op === 'ar2' ? 'send [6]' : 'send [3,4]', COL.teal, true);
            } else if (f.flow === 'rs') {
                svg.appendChild(el('circle', {
                    cx: 380, cy: 95, r: 19, fill: COL.teal.bg, stroke: COL.teal.fg, 'stroke-width': 1.8
                }));
                svg.appendChild(el('text', {
                    x: 380, y: 100, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700,
                    'font-family': 'var(--mono)', fill: COL.teal.fg
                }, '+'));
                const l1 = el('line', {
                    x1: 234, y1: 95, x2: 356, y2: 95, stroke: COL.navy.fg, 'stroke-width': 1.6, 'marker-end': 'url(#arr-navy)'
                });
                l1.setAttribute('class', 'vz-flow');
                const l2 = el('line', {
                    x1: 526, y1: 95, x2: 404, y2: 95, stroke: COL.teal.fg, 'stroke-width': 1.6, 'marker-end': 'url(#arr-teal)'
                });
                l2.setAttribute('class', 'vz-flow');
                svg.appendChild(l1);
                svg.appendChild(l2);
                svg.appendChild(el('text', {
                    x: 380, y: 132, 'text-anchor': 'middle', 'font-size': 10,
                    'font-family': 'var(--mono)', fill: COL.teal.fg
                }, '[4] <- sum -> [6]'));
            } else {
                const p1 = el('path', {
                    d: 'M 234 76 C 320 76, 440 116, 524 116', fill: 'none',
                    stroke: COL.amber.fg, 'stroke-width': 1.8, 'marker-end': 'url(#arr-amber)'
                });
                p1.setAttribute('class', 'vz-flow');
                const p2 = el('path', {
                    d: 'M 526 76 C 440 76, 320 116, 236 116', fill: 'none',
                    stroke: COL.plum.fg, 'stroke-width': 1.8, 'marker-end': 'url(#arr-plum)'
                });
                p2.setAttribute('class', 'vz-flow');
                svg.appendChild(p1);
                svg.appendChild(p2);
                drawChip(svg, 316, 68, 44, 20, 'c1: 2', COL.amber, true);
                drawChip(svg, 400, 102, 44, 20, 'c0: 3', COL.plum, true);
            }

            svg.appendChild(el('text', {
                x: 380, y: 184, 'text-anchor': 'middle', 'font-size': 10.5,
                'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, f.note));
        }

        render();
    }

    /* =========================================================================
       3. allgather-vs-alltoall: AllGather_Y [E,F] 32 MiB vs AllToAll_Y [E,F_Y] 8 MiB
    ========================================================================= */
    function initAllgatherVsAlltoall(fig) {
        let phase = 0; // 0 = initial/dispatching, 1 = complete
        const ui = mountAnim(fig, {
            height: 224,
            stepMs: 2100,
            aria: t('AllGather_Y vs AllToAll_Y on A[E_Y, F]', 'AllGather_Y 与 AllToAll_Y 在 A[E_Y, F] 上的对照'),
            pills: [
                { label: t('Initial A[E_Y, F]', '初始 A[E_Y, F]') },
                { label: t('After Collective', '通信结果对比') }
            ],
            onPill: (idx) => {
                phase = idx;
                ui.setPaused(true);
                render();
            },
            onTick: () => {
                phase = (phase + 1) % 2;
                render();
            }
        });

        function renderPanel(x, title, sub, mode) {
            const svg = ui.svg;
            svg.appendChild(el('rect', {
                x, y: 10, width: 356, height: 202, rx: 8,
                fill: 'var(--vz-card-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
            }));
            svg.appendChild(el('text', {
                x: x + 14, y: 30, 'font-size': 11.5, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: mode === 'ag' ? COL.teal.fg : COL.amber.fg
            }, title));
            svg.appendChild(el('text', {
                x: x + 14, y: 45, 'font-size': 10,
                'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, sub));

            // 4 GPUs (Y=0..3) side-by-side
            const colW = 74, colGap = 10, baseX = x + 15, matY = 74, matW = 64, matH = 92;
            for (let y = 0; y < 4; y++) {
                const gx = baseX + y * (colW + colGap);
                svg.appendChild(el('text', {
                    x: gx + matW / 2, y: 66, 'text-anchor': 'middle',
                    'font-size': 10, 'font-weight': 700, 'font-family': 'var(--mono)',
                    fill: GROUP_COLS[y].fg
                }, `GPU ${y}`));

                svg.appendChild(el('rect', {
                    x: gx, y: matY, width: matW, height: matH, rx: 3,
                    fill: 'var(--vz-tile-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
                }));

                const rh = matH / 4;
                const cw = matW / 4;

                if (phase === 0) {
                    // Each rank initially owns row y across all 4 col chunks
                    for (let c = 0; c < 4; c++) {
                        svg.appendChild(el('rect', {
                            x: gx + c * cw + 1, y: matY + y * rh + 1,
                            width: cw - 2, height: rh - 2, rx: 1.5,
                            fill: GROUP_COLS[y].bg, stroke: GROUP_COLS[y].fg, 'stroke-width': 1
                        }));
                    }
                    // Show exchange indicator line above cards
                    if (y < 3) {
                        const arrowCol = mode === 'ag' ? 'url(#arr-teal)' : 'url(#arr-amber)';
                        const l = el('line', {
                            x1: gx + matW + 1, y1: matY + matH / 2, x2: gx + colW + colGap - 1, y2: matY + matH / 2,
                            stroke: mode === 'ag' ? COL.teal.fg : COL.amber.fg,
                            'stroke-width': 1.4, 'marker-end': arrowCol
                        });
                        l.setAttribute('class', 'vz-flow');
                        svg.appendChild(l);
                    }
                } else if (mode === 'ag') {
                    // AllGather_Y: every GPU holds all 4 full rows [2048, 8192]
                    for (let r = 0; r < 4; r++) {
                        svg.appendChild(el('rect', {
                            x: gx + 1, y: matY + r * rh + 1,
                            width: matW - 2, height: rh - 2, rx: 1.5,
                            fill: GROUP_COLS[r].bg, stroke: GROUP_COLS[r].fg, 'stroke-width': 0.9
                        }));
                    }
                } else {
                    // AllToAll_Y: GPU y holds all 4 rows for column slice y -> [2048, 2048]
                    for (let r = 0; r < 4; r++) {
                        svg.appendChild(el('rect', {
                            x: gx + y * cw + 1, y: matY + r * rh + 1,
                            width: cw - 2, height: rh - 2, rx: 1.5,
                            fill: GROUP_COLS[r].bg, stroke: GROUP_COLS[r].fg, 'stroke-width': 1
                        }));
                    }
                }

                svg.appendChild(el('text', {
                    x: gx + matW / 2, y: matY + matH + 15, 'text-anchor': 'middle',
                    'font-size': 9, 'font-family': 'var(--mono)', fill: 'var(--vz-ink)'
                }, phase === 0 ? '[512,8k]' : (mode === 'ag' ? '[2048,8k]' : '[2048,2k]')));
                svg.appendChild(el('text', {
                    x: gx + matW / 2, y: matY + matH + 28, 'text-anchor': 'middle',
                    'font-size': 9, 'font-weight': 700, 'font-family': 'var(--mono)',
                    fill: phase === 1 && mode === 'ag' ? COL.red.fg : COL.teal.fg
                }, phase === 0 ? '8 MiB' : (mode === 'ag' ? '32 MiB (4x)' : '8 MiB (1x)')));
            }
        }

        function render() {
            const svg = ui.svg;
            svg.innerHTML = '';
            addArrowDefs(svg);
            ui.setActivePill(phase);
            ui.setStatus(phase === 0 ? t('Step 1/2 · Initial', '阶段 1/2 · 初始分片') : t('Step 2/2 · Result', '阶段 2/2 · 变换完成'));
            renderPanel(14, 'AllGather_Y: [E_Y, F] -> [E, F]', t('Broadcasts full rows (memory grows 4x)', '互发整行分片，每卡攒齐全部列'), 'ag');
            renderPanel(390, 'AllToAll_Y: [E_Y, F] -> [E, F_Y]', t('Sends 1/4 cols to target card (constant HBM)', '按列切 4 份发往目标卡，显存零膨胀'), 'a2a');
        }

        render();
    }

    /* =========================================================================
       4. ring-cost: 4-GPU Ring hop animator + relative bandwidth roofline bars
    ========================================================================= */
    function initRingCost(fig) {
        const OPS = [
            { id: 'ar',  label: 'AllReduce (RS+AG)', maxHop: 4, mult: '2.00x', formula: '2V / W' },
            { id: 'ag',  label: 'AllGather',         maxHop: 2, mult: '1.00x', formula: 'V / W' },
            { id: 'rs',  label: 'ReduceScatter',     maxHop: 2, mult: '1.00x', formula: 'V / W' },
            { id: 'a2a', label: 'All-to-All',        maxHop: 1, mult: '0.25x', formula: 'V / 4W' }
        ];
        let opIdx = 0;
        let hop = 1;

        const ui = mountAnim(fig, {
            height: 215,
            stepMs: 1200,
            aria: t('4-GPU bidirectional ring hops and bandwidth roofline cost', '4 卡双向环跳数动画与带宽耗时对比'),
            pills: OPS.map((o) => ({ label: o.label })),
            onPill: (idx) => {
                opIdx = idx;
                hop = 1;
                render();
            },
            onTick: () => {
                const max = OPS[opIdx].maxHop;
                hop = (hop % max) + 1;
                render();
            }
        });

        function render() {
            const op = OPS[opIdx];
            const svg = ui.svg;
            svg.innerHTML = '';
            addArrowDefs(svg);
            ui.setActivePill(opIdx);
            ui.setStatus(`${op.label} · Hop ${hop}/${op.maxHop} · ${op.formula}`);

            // Bidirectional ring diamond on left (cx=205, cy=108)
            const pos = [
                { x: 155, y: 14,  c: COL.navy },  // GPU 0 (top)
                { x: 286, y: 84,  c: COL.teal },  // GPU 1 (right)
                { x: 155, y: 154, c: COL.amber }, // GPU 2 (bottom)
                { x: 24,  y: 84,  c: COL.plum }   // GPU 3 (left)
            ];

            // Links
            for (let i = 0; i < 4; i++) {
                const a = pos[i], b = pos[(i + 1) % 4];
                const l = el('line', {
                    x1: a.x + 50, y1: a.y + 22, x2: b.x + 50, y2: b.y + 22,
                    stroke: op.id === 'a2a' ? COL.amber.fg : (op.id === 'ar' && hop <= 2 ? COL.teal.fg : COL.navy.fg),
                    'stroke-width': 2, 'marker-end': 'url(#arr-teal)'
                });
                l.setAttribute('class', 'vz-flow');
                svg.appendChild(l);
            }

            // Center label inside diamond
            svg.appendChild(el('rect', {
                x: 136, y: 86, width: 138, height: 38, rx: 6,
                fill: 'var(--vz-card-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
            }));
            const subTxt = op.id === 'ar'
                ? (hop <= 2 ? t('Phase 1: ReduceScatter', '前半程: ReduceScatter') : t('Phase 2: AllGather', '后半程: AllGather'))
                : (op.id === 'a2a' ? t('Triangular sum = 1/4', '三角传输量仅 1/4') : t('Bi-ring saturates W', '双向链路同时满载'));
            svg.appendChild(el('text', {
                x: 205, y: 102, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: 'var(--vz-ink)'
            }, `Hop ${hop}/${op.maxHop}`));
            svg.appendChild(el('text', {
                x: 205, y: 116, 'text-anchor': 'middle', 'font-size': 9.2,
                'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, subTxt));

            // 4 GPU cards with 4 slots each
            pos.forEach((p, r) => {
                svg.appendChild(el('rect', {
                    x: p.x, y: p.y, width: 100, height: 44, rx: 6,
                    fill: 'var(--vz-card-bg)', stroke: p.c.fg, 'stroke-width': 1.4
                }));
                svg.appendChild(el('text', {
                    x: p.x + 50, y: p.y + 14, 'text-anchor': 'middle',
                    'font-size': 10, 'font-weight': 700, 'font-family': 'var(--mono)', fill: p.c.fg
                }, `GPU ${r}`));

                for (let s = 0; s < 4; s++) {
                    let filled = false;
                    let sym = '·';
                    let c = COL.muted;
                    if (op.id === 'ag') {
                        const dist = Math.min((s - r + 4) % 4, (r - s + 4) % 4);
                        filled = dist <= hop;
                        sym = filled ? `d${s}` : '·';
                        c = filled ? GROUP_COLS[s] : COL.muted;
                    } else if (op.id === 'rs') {
                        if (s === r) { filled = true; sym = hop === 2 ? 'Σ' : 'p'; c = COL.teal; }
                    } else if (op.id === 'ar') {
                        if (hop <= 2) {
                            if (s === r) { filled = true; sym = hop === 2 ? 'Σ' : 'p'; c = COL.teal; }
                        } else {
                            const agHop = hop - 2;
                            const dist = Math.min((s - r + 4) % 4, (r - s + 4) % 4);
                            filled = dist <= agHop;
                            sym = filled ? 'Σ' : '·';
                            c = filled ? p.c : COL.muted;
                        }
                    } else {
                        filled = true;
                        sym = `t${s}`;
                        c = GROUP_COLS[s];
                    }
                    svg.appendChild(el('rect', {
                        x: p.x + 6 + s * 22.5, y: p.y + 20, width: 19, height: 18, rx: 3,
                        fill: filled ? c.bg : 'var(--vz-tile-bg)', stroke: c.fg, 'stroke-width': filled ? 1.2 : 0.7
                    }));
                    svg.appendChild(el('text', {
                        x: p.x + 15.5 + s * 22.5, y: p.y + 32.5, 'text-anchor': 'middle',
                        'font-size': 9, 'font-weight': 700, 'font-family': 'var(--mono)', fill: c.fg
                    }, sym));
                }
            });

            // Right panel: Roofline relative latency bars
            svg.appendChild(el('rect', {
                x: 422, y: 14, width: 322, height: 184, rx: 7,
                fill: 'var(--vz-card-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
            }));
            svg.appendChild(el('text', {
                x: 438, y: 34, 'font-size': 11, 'font-weight': 700,
                'font-family': 'var(--sans)', fill: 'var(--vz-ink)'
            }, t('Bandwidth Time (Bi-Ring, Large V)', '大张量带宽耗时对比（双向环）')));

            const bars = [
                { id: 'ar',  name: 'AllReduce',     val: 2.00, txt: '2.00x (2V/W)',  c: COL.plum },
                { id: 'ag',  name: 'AllGather',     val: 1.00, txt: '1.00x (V/W)',   c: COL.navy },
                { id: 'rs',  name: 'ReduceScatter', val: 1.00, txt: '1.00x (V/W)',   c: COL.teal },
                { id: 'a2a', name: 'All-to-All',    val: 0.25, txt: '0.25x (V/4W)',  c: COL.amber }
            ];
            bars.forEach((b, i) => {
                const by = 52 + i * 36;
                const isSel = b.id === op.id;
                svg.appendChild(el('text', {
                    x: 438, y: by + 10, 'font-size': 10, 'font-weight': isSel ? 700 : 500,
                    'font-family': 'var(--mono)', fill: isSel ? b.c.fg : 'var(--vz-ink)'
                }, b.name));
                svg.appendChild(el('text', {
                    x: 728, y: by + 10, 'text-anchor': 'end', 'font-size': 10, 'font-weight': 700,
                    'font-family': 'var(--mono)', fill: b.c.fg
                }, b.txt));
                svg.appendChild(el('rect', {
                    x: 438, y: by + 15, width: 290, height: 10, rx: 3, fill: 'var(--vz-tile-bg)'
                }));
                svg.appendChild(el('rect', {
                    x: 438, y: by + 15, width: Math.max(12, 290 * (b.val / 2.0)), height: 10, rx: 3,
                    fill: b.c.fg, opacity: isSel ? 1 : 0.45
                }));
            });
        }

        render();
    }

    /* =========================================================================
       5. sharded-matmul: The 4 sharded matmul cases A * B -> C
    ========================================================================= */
    function initShardedMatmul(fig) {
        const CASES = [
            {
                id: 1, pill: t('Case 1', '情形 1'),
                sig: 'A[I_X, J] * B[J, K_Y] -> C[I_X, K_Y]',
                comm: t('0 Comm (forward free)', '前向零通信（本地直接算完）'),
                ex: t('Data Parallel fwd / Megatron Column-Parallel', '标准 DP 前向 / Megatron 列并行'),
                col: COL.teal
            },
            {
                id: 2, pill: t('Case 2', '情形 2'),
                sig: 'A[I, J_X] * B[J, K] -> AllGather_X -> C[I, K]',
                comm: t('AllGather_X before matmul', '收缩维仅单侧切：先 AllGather 拼完整再乘'),
                ex: t('ZeRO-3 / FSDP unsharding layer weights', 'ZeRO-3 / FSDP 前反向临时还原权重'),
                col: COL.navy
            },
            {
                id: 3, pill: t('Case 3', '情形 3'),
                sig: 'A[I, J_X] * B[J_X, K] -> C[I, K]{U_X} -> AR / RS',
                comm: t('AllReduce_X or ReduceScatter_X', '双侧切收缩维得 {U_X} -> AllReduce 或 RS'),
                ex: t('Megatron Row-Parallel / DDP dW / SP', 'Megatron 行并行 / DDP 梯度同步 / SP'),
                col: COL.amber
            },
            {
                id: 4, pill: t('Case 4', '情形 4'),
                sig: 'A[I_X, J] * B[J, K_X]  (diagonal only!)',
                comm: t('Invalid directly -> AllGather smaller side', '自由外维冲突 (x)：先对较小一侧做 AllGather'),
                ex: t('Rank i only holds diagonal (i, i) blocks', '第 i 卡缺席交叉块，无法直接相乘'),
                col: COL.red
            }
        ];
        let idx = 0;

        const ui = mountAnim(fig, {
            height: 204,
            stepMs: 2600,
            aria: t('Four sharded matrix multiplication cases', '分布式矩阵乘法四种情形'),
            pills: CASES.map((c) => ({ label: c.pill })),
            onPill: (i) => {
                idx = i;
                ui.setPaused(true);
                render();
            },
            onTick: () => {
                idx = (idx + 1) % CASES.length;
                render();
            }
        });

        function drawMiniGrid(svg, x, y, w, hgt, title, rows, cols, mode) {
            svg.appendChild(el('text', {
                x: x + w / 2, y: y - 7, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: 'var(--vz-ink)'
            }, title));
            const cw = w / cols, ch = hgt / rows;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    let fill = 'var(--vz-card-bg)', stroke = 'var(--vz-line)', sw = 1;
                    if (mode === 'row') { fill = GROUP_COLS[r % 2].bg; stroke = GROUP_COLS[r % 2].fg; }
                    else if (mode === 'col') { fill = GROUP_COLS[c % 2].bg; stroke = GROUP_COLS[c % 2].fg; }
                    else if (mode === 'grid') {
                        const gc = (r === 0 && c === 0) ? COL.navy : (r === 0 ? COL.teal : (c === 0 ? COL.amber : COL.plum));
                        fill = gc.bg; stroke = gc.fg;
                    } else if (mode === 'diag') {
                        if (r === c) { fill = COL.red.bg; stroke = COL.red.fg; sw = 1.6; }
                        else { fill = 'var(--vz-tile-bg)'; stroke = 'var(--vz-line)'; }
                    } else if (mode === 'full') {
                        fill = COL.teal.bg; stroke = COL.teal.fg;
                    } else if (mode === 'partial') {
                        fill = COL.amber.bg; stroke = COL.amber.fg;
                    }
                    svg.appendChild(el('rect', {
                        x: x + c * cw + 1.5, y: y + r * ch + 1.5, width: cw - 3, height: ch - 3, rx: 3,
                        fill, stroke, 'stroke-width': sw
                    }));
                    if (mode === 'diag' && r !== c) {
                        svg.appendChild(el('text', {
                            x: x + (c + 0.5) * cw, y: y + (r + 0.5) * ch + 4, 'text-anchor': 'middle',
                            'font-size': 12, 'font-weight': 700, 'font-family': 'var(--mono)', fill: COL.red.fg
                        }, 'x'));
                    }
                }
            }
        }

        function render() {
            const c = CASES[idx];
            const svg = ui.svg;
            svg.innerHTML = '';
            addArrowDefs(svg);
            ui.setActivePill(idx);
            ui.setStatus(`${c.pill} · ${c.id === 1 ? '0 comm' : c.id === 2 ? 'AG' : c.id === 3 ? 'AR / RS' : 'Conflict'}`);

            svg.appendChild(el('text', {
                x: 24, y: 26, 'font-size': 12.5, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: c.col.fg
            }, c.sig));

            // A * B -> C grids on left
            const A_mode = idx === 0 ? 'row' : (idx === 1 ? 'col' : (idx === 2 ? 'col' : 'row'));
            const B_mode = idx === 0 ? 'col' : (idx === 1 ? 'full' : (idx === 2 ? 'row' : 'col'));
            const C_mode = idx === 0 ? 'grid' : (idx === 1 ? 'full' : (idx === 2 ? 'partial' : 'diag'));

            drawMiniGrid(svg, 28,  66, 94, 84, idx === 0 ? 'A[I_X, J]' : (idx < 3 ? 'A[I, J_X]' : 'A[I_X, J]'), 2, 2, A_mode);
            svg.appendChild(el('text', { x: 138, y: 114, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: 'var(--vz-muted)' }, '×'));
            drawMiniGrid(svg, 154, 66, 94, 84, idx === 0 ? 'B[J, K_Y]' : (idx === 1 ? 'B[J, K]' : (idx === 2 ? 'B[J_X, K]' : 'B[J, K_X]')), 2, 2, B_mode);

            const arr = el('line', {
                x1: 262, y1: 108, x2: 322, y2: 108,
                stroke: c.col.fg, 'stroke-width': 2.2,
                'marker-end': idx === 0 ? 'url(#arr-teal)' : (idx === 1 ? 'url(#arr-navy)' : (idx === 2 ? 'url(#arr-amber)' : 'url(#arr-muted)'))
            });
            arr.setAttribute('class', 'vz-flow');
            svg.appendChild(arr);
            svg.appendChild(el('text', {
                x: 292, y: 98, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: c.col.fg
            }, idx === 0 ? '0 comm' : (idx === 1 ? 'AG_X' : (idx === 2 ? '{U_X}' : 'AG_X!'))));

            drawMiniGrid(svg, 332, 66, 94, 84, idx === 0 ? 'C[I_X, K_Y]' : (idx === 2 ? 'C{U_X}->C' : (idx === 3 ? 'Diag only' : 'C[I, K]')), 2, 2, C_mode);

            // Right card explaining action + usage
            svg.appendChild(el('rect', {
                x: 454, y: 54, width: 290, height: 112, rx: 7,
                fill: c.col.bg, stroke: c.col.fg, 'stroke-width': 1.4
            }));
            svg.appendChild(el('text', {
                x: 470, y: 80, 'font-size': 12, 'font-weight': 700,
                'font-family': 'var(--sans)', fill: c.col.fg
            }, c.comm));
            svg.appendChild(el('text', {
                x: 470, y: 108, 'font-size': 10.5, 'font-family': 'var(--sans)', fill: 'var(--vz-ink)'
            }, t('Real systems:', '对应工程：')));
            svg.appendChild(el('text', {
                x: 470, y: 128, 'font-size': 10.5, 'font-weight': 600,
                'font-family': 'var(--sans)', fill: 'var(--vz-ink)'
            }, c.ex));

            svg.appendChild(el('text', {
                x: 28, y: 184, 'font-size': 10, 'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, idx === 1
                ? t('Case 2 Option 2 (local + AllReduce) loses to FSDP when X is also sharded along axis X.', '注：当激活 X 也沿同轴切分时，无法用方案 2，只能用先 AllGather 权重的 FSDP 路线。')
                : (idx === 2
                    ? t('ReduceScatter keeps [I, K_X] sharded for downstream Sequence Parallelism or FSDP.', '若后续仍需切片（SP / FSDP），直接 ReduceScatter_X 比 AllReduce 省一半通信。')
                    : t('Rule: never duplicate the same physical axis label across an active matmul pair.', '铁律：同一物理轴下标在一次矩阵乘法输入里不能产生未合并的自由维冲突。'))));
        }

        render();
    }

    /* =========================================================================
       6. ddp-vs-fsdp: Side-by-side 4-step lifecycle + 16Phi -> 2Phi bar strip
    ========================================================================= */
    function initDdpVsFsdp(fig) {
        const STEPS = [
            { id: 0, en: '1. Forward',     zh: '1. 前向计算', ddpG: 'g0 / g1: idle',       fsdpComm: 'AllGather(W)',      fsdpCol: COL.navy },
            { id: 1, en: '2. Backward',    zh: '2. 反向计算', ddpG: 'g0=[1,2] | g1=[3,4]', fsdpComm: 'AllGather(W) -> dW', fsdpCol: COL.amber },
            { id: 2, en: '3. Grad Sync',   zh: '3. 梯度通信', ddpG: 'AllReduce -> [4,6]',  fsdpComm: 'ReduceScatter -> [4]|[6]', fsdpCol: COL.teal },
            { id: 3, en: '4. Adam Update', zh: '4. 参数更新', ddpG: 'Both update full W',  fsdpComm: 'Update local W0 | W1', fsdpCol: COL.plum }
        ];
        let step = 2; // Start active in Grad Sync

        const ui = mountAnim(fig, {
            height: 244,
            stepMs: 1800,
            aria: t('DDP vs ZeRO-3 / FSDP lifecycle and N=8 memory reduction', 'DDP 与 ZeRO-3 / FSDP 生命周期及显存压缩对照'),
            pills: STEPS.map((s) => ({ label: t(s.en, s.zh) })),
            onPill: (idx) => {
                step = idx;
                ui.setPaused(true);
                render();
            },
            onTick: () => {
                step = (step + 1) % STEPS.length;
                render();
            }
        });

        function render() {
            const s = STEPS[step];
            const svg = ui.svg;
            svg.innerHTML = '';
            addArrowDefs(svg);
            ui.setActivePill(step);
            ui.setStatus(t(s.en, s.zh));

            // Left panel: DDP (x=14..368, y=10..162)
            svg.appendChild(el('rect', {
                x: 14, y: 10, width: 356, height: 152, rx: 8,
                fill: 'var(--vz-card-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
            }));
            svg.appendChild(el('text', {
                x: 28, y: 30, 'font-size': 11.5, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: COL.navy.fg
            }, 'DDP (Replicated 16Φ, 2Ψ comm)'));

            drawBox(svg, 28,  44, 128, 52, 'GPU 0', 'Full W + OS + G', COL.navy, step === 2);
            drawBox(svg, 228, 44, 128, 52, 'GPU 1', 'Full W + OS + G', COL.navy, step === 2);
            if (step === 2) {
                const l = el('line', {
                    x1: 160, y1: 70, x2: 222, y2: 70,
                    stroke: COL.navy.fg, 'stroke-width': 2, 'marker-end': 'url(#arr-navy)', 'marker-start': 'url(#arr-navy)'
                });
                l.setAttribute('class', 'vz-flow');
                svg.appendChild(l);
            }
            svg.appendChild(el('text', {
                x: 192, y: 122, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 650,
                'font-family': 'var(--mono)', fill: step === 2 ? COL.navy.fg : 'var(--vz-ink)'
            }, s.ddpG));
            svg.appendChild(el('text', {
                x: 192, y: 144, 'text-anchor': 'middle', 'font-size': 9.5,
                'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, step === 3 ? t('Redundant identical Adam work on both GPUs', '两卡存整份参数并算一模一样的 Adam 更新') : t('Full weights resident permanently in HBM', '整网参数与优化器状态全程常驻 HBM')));

            // Right panel: ZeRO-3 / FSDP (x=390..746, y=10..162)
            svg.appendChild(el('rect', {
                x: 390, y: 10, width: 356, height: 152, rx: 8,
                fill: 'var(--vz-card-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
            }));
            svg.appendChild(el('text', {
                x: 404, y: 30, 'font-size': 11.5, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: COL.teal.fg
            }, 'ZeRO-3 / FSDP (16Φ/N, 3Ψ comm)'));

            drawBox(svg, 404, 44, 128, 52, 'GPU 0', step < 2 ? 'Temp Full W!' : (step === 2 ? 'Kept g=[4]' : 'W0 + OS0'), s.fsdpCol, true);
            drawBox(svg, 604, 44, 128, 52, 'GPU 1', step < 2 ? 'Temp Full W!' : (step === 2 ? 'Kept g=[6]' : 'W1 + OS1'), s.fsdpCol, true);
            if (step < 3) {
                const l = el('line', {
                    x1: 536, y1: 70, x2: 598, y2: 70,
                    stroke: s.fsdpCol.fg, 'stroke-width': 2,
                    'marker-end': step < 2 ? 'url(#arr-navy)' : 'url(#arr-teal)',
                    'marker-start': step < 2 ? 'url(#arr-navy)' : 'url(#arr-teal)'
                });
                l.setAttribute('class', 'vz-flow');
                svg.appendChild(l);
            }
            svg.appendChild(el('text', {
                x: 568, y: 122, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: s.fsdpCol.fg
            }, s.fsdpComm));
            svg.appendChild(el('text', {
                x: 568, y: 144, 'text-anchor': 'middle', 'font-size': 9.5,
                'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, step === 2 ? t('AllGather^T = ReduceScatter drops duplicate grads', 'AllGather 的伴随对偶正好是 ReduceScatter') : t('Prefetch next layer AllGather, free right after use', '边算边预取下一层权重，算完立刻释放他卡切片')));

            // Bottom N=8 memory strip (y=172..234)
            svg.appendChild(el('rect', {
                x: 14, y: 172, width: 732, height: 62, rx: 7,
                fill: 'var(--vz-card-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
            }));
            svg.appendChild(el('text', {
                x: 28, y: 190, 'font-size': 10, 'font-weight': 700,
                'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, t('Static HBM per GPU @ N=8:', 'N=8 单卡静态模型状态占用：')));

            const bars = [
                { name: 'DDP',   phi: 16.0, c: COL.muted },
                { name: 'ZeRO-1', phi: 5.50, c: COL.navy },
                { name: 'ZeRO-2', phi: 3.75, c: COL.amber },
                { name: 'ZeRO-3', phi: 2.00, c: COL.teal }
            ];
            bars.forEach((b, i) => {
                const bx = 28 + i * 178;
                svg.appendChild(el('text', {
                    x: bx, y: 207, 'font-size': 9.5, 'font-weight': 700,
                    'font-family': 'var(--mono)', fill: b.c.fg
                }, `${b.name}: ${b.phi.toFixed(b.phi === 16 ? 1 : 2)}Φ`));
                svg.appendChild(el('rect', {
                    x: bx, y: 213, width: 158, height: 8, rx: 3, fill: 'var(--vz-tile-bg)'
                }));
                svg.appendChild(el('rect', {
                    x: bx, y: 213, width: Math.max(8, 158 * (b.phi / 16.0)), height: 8, rx: 3, fill: b.c.fg
                }));
            });
        }

        render();
    }

    /* =========================================================================
       7. tp-megatron: Forward / Backward f & g conjugate flow + TP / TP+SP toggle
    ========================================================================= */
    function initTpMegatron(fig) {
        let step = 2; // Active on forward g(AllReduce) initially
        let useSP = false;

        const ui = mountAnim(fig, {
            height: 198,
            stepMs: 1350,
            aria: t('Megatron-LM MLP tensor parallelism forward and backward signal flow', 'Megatron-LM 张量并行前后向 f/g 信号流'),
            pills: [
                { label: 'Standard TP' },
                { label: 'TP + SP' }
            ],
            onPill: (idx) => {
                useSP = idx === 1;
                render();
            },
            onTick: () => {
                step = (step + 1) % 6;
                render();
            }
        });

        function render() {
            const bwd = step >= 3;
            const stage = step % 3; // 0: outer/inner entry, 1: middle local 0-sync, 2: sync exit
            const svg = ui.svg;
            svg.innerHTML = '';
            addArrowDefs(svg);
            ui.setActivePill(useSP ? 1 : 0);

            const commOp = useSP ? (bwd ? 'RS' : 'AG') : 'AllReduce';
            const fActive = (!bwd && stage === 0) || (bwd && stage === 2);
            const midActive = stage === 1;
            const gActive = (!bwd && stage === 2) || (bwd && stage === 0);

            const dirStr = bwd ? t('Backward', '反向传播') : t('Forward', '前向计算');
            const actionStr = (bwd && fActive) ? `f.backward -> ${useSP ? 'ReduceScatter' : 'AllReduce'}`
                : ((!bwd && gActive) ? `g.forward -> AllReduce` : (midActive ? t('0 comm inside GeLU', '激活层零通信') : t('Identity pass', '原样透传')));
            ui.setStatus(`${dirStr} · ${actionStr}`);

            const actCol = bwd ? COL.teal : COL.amber;

            // Horizontal pipeline: LN (22) -> Op f (126) -> [Col A0/A1 (240) -> GeLU (358) -> Row B0/B1 (466)] -> Op g (584) -> Out (678)
            drawBox(svg, 18, 66, 78, 58, 'LayerNorm', useSP ? '[B,S/2,D]' : '[B,S,D]', useSP ? COL.teal : COL.muted, false);
            drawBox(svg, 114, 66, 86, 58, 'Op f', bwd ? (useSP ? 'RS!' : 'AllReduce!') : (useSP ? 'AG!' : 'Identity'),
                (bwd && fActive) || (useSP && !bwd && fActive) ? actCol : COL.navy, fActive);

            // Top lane Rank 0 & Bottom lane Rank 1
            drawBox(svg, 222, 26, 108, 48, 'Col A0 [D, F/2]', 'Rank 0', COL.navy, midActive);
            drawBox(svg, 222, 118, 108, 48, 'Col A1 [D, F/2]', 'Rank 1', COL.navy, midActive);

            drawBox(svg, 348, 26, 94, 48, 'GeLU (Y0)', '0 sync', COL.teal, midActive);
            drawBox(svg, 348, 118, 94, 48, 'GeLU (Y1)', '0 sync', COL.teal, midActive);

            drawBox(svg, 460, 26, 108, 48, 'Row B0 [F/2, D]', '{U_TP}', COL.plum, midActive);
            drawBox(svg, 460, 118, 108, 48, 'Row B1 [F/2, D]', '{U_TP}', COL.plum, midActive);

            drawBox(svg, 588, 66, 86, 58, 'Op g', !bwd ? (useSP ? 'RS!' : 'AllReduce!') : (useSP ? 'AG!' : 'Identity'),
                (!bwd && gActive) || (useSP && bwd && gActive) ? actCol : COL.navy, gActive);
            drawBox(svg, 690, 66, 54, 58, 'Out Z', useSP ? '[S/2,D]' : '[S,D]', useSP ? COL.teal : COL.muted, false);

            // Arrows
            const arrowMarker = bwd ? 'url(#arr-teal)' : 'url(#arr-amber)';
            const arrowColor = bwd ? COL.teal.fg : COL.amber.fg;
            const conns = bwd
                ? [[688, 95, 676, 95], [586, 84, 570, 52], [586, 106, 570, 140], [458, 50, 444, 50], [458, 142, 444, 142], [346, 50, 332, 50], [346, 142, 332, 142], [220, 52, 202, 84], [220, 140, 202, 106], [112, 95, 98, 95]]
                : [[98, 95, 112, 95], [202, 84, 220, 52], [202, 106, 220, 140], [332, 50, 346, 50], [332, 142, 346, 142], [444, 50, 458, 50], [444, 142, 458, 142], [570, 52, 586, 84], [570, 140, 586, 106], [676, 95, 688, 95]];

            conns.forEach(([x1, y1, x2, y2]) => {
                const l = el('line', {
                    x1, y1, x2, y2, stroke: arrowColor, 'stroke-width': 1.5, 'marker-end': arrowMarker
                });
                l.setAttribute('class', 'vz-flow');
                svg.appendChild(l);
            });

            svg.appendChild(el('text', {
                x: 380, y: 186, 'text-anchor': 'middle', 'font-size': 10,
                'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, useSP
                ? t('SP splits LayerNorm & Dropout along sequence S_TP (saves 1/TP residual HBM at equal comm)', '序列并行把 LayerNorm / Dropout 残差也沿 S_TP 切开（总通信字节与 TP 完全相等）')
                : t('f forward identity -> f backward AllReduce sums partial grads from every A_i^T', '算子 f 前向放行、反向 AllReduce，与 Row 并行输出端的算子 g 刚好互为伴随')));
        }

        render();
    }

    /* =========================================================================
       8. pp-schedule: Naive / GPipe / 1F1B / Interleaved v=2 (P=4, M=8) loop
    ========================================================================= */
    function initPpSchedule(fig) {
        const P = 4, M = 8;
        const MODES = [
            { id: '1f1b', label: '1F1B', v: 1 },
            { id: 'gpipe', label: 'GPipe', v: 1 },
            { id: 'interleaved', label: 'Interleaved v=2', v: 2 },
            { id: 'naive', label: 'Naive (M=1)', v: 1 }
        ];
        let modeIdx = 0;
        let tick = 8;

        function buildOps(mode) {
            const mCnt = mode.id === 'naive' ? 1 : M;
            const v = mode.v;
            const chunks = mCnt * v;
            const stageFree = [0, 0, 0, 0];
            const fwdDone = {};
            const bwdDone = {};
            const blocks = [];

            if (mode.id === 'naive' || mode.id === 'gpipe') {
                for (let mb = 0; mb < mCnt; mb++) {
                    for (let s = 0; s < P; s++) {
                        const dep = s === 0 ? 0 : fwdDone[`${s - 1},${mb}`];
                        const st = Math.max(stageFree[s], dep);
                        stageFree[s] = st + 1;
                        fwdDone[`${s},${mb}`] = st + 1;
                        blocks.push({ s, t: st, type: 'F', label: `F${mb}`, mb, chunk: 0 });
                    }
                }
                for (let mb = 0; mb < mCnt; mb++) {
                    for (let s = P - 1; s >= 0; s--) {
                        const dep = s === P - 1 ? fwdDone[`${P - 1},${mb}`] : bwdDone[`${s + 1},${mb}`];
                        const st = Math.max(stageFree[s], dep);
                        stageFree[s] = st + 1;
                        bwdDone[`${s},${mb}`] = st + 1;
                        blocks.push({ s, t: st, type: 'B', label: `B${mb}`, mb, chunk: 0 });
                    }
                }
            } else {
                // Topological 1F1B (also handles Interleaved v=2 across stages s + c*P)
                const fwdOrder = [];
                for (let c = 0; c < v; c++) {
                    for (let mb = 0; mb < mCnt; mb++) fwdOrder.push({ mb, c });
                }
                const totalSteps = P * v;
                const done = {};
                const nextF = new Array(P).fill(0);
                const nextB = new Array(P).fill(0);
                const readyF = Array.from({ length: P }, () => []);
                const readyB = Array.from({ length: P }, () => []);

                // Simpler direct dependency scheduler per microbatch-step (0..totalSteps-1)
                const pending = [];
                for (let k = 0; k < mCnt; k++) {
                    for (let step = 0; step < totalSteps; step++) {
                        const s = step % P;
                        const c = Math.floor(step / P);
                        pending.push({ s, step, k, dir: 'F', lbl: v > 1 ? `F${k}` : `F${k}` });
                        pending.push({ s, step, k, dir: 'B', lbl: `B${k}` });
                    }
                }
                const placed = new Set();
                const gpuBusy = Array.from({ length: P }, () => new Set());
                // Respect warmup balance: prefer B whenever stage has >= (P - s) outstanding F or during cooldown
                const inflight = new Array(P).fill(0);
                let placedCount = 0;
                const totalOps = mCnt * totalSteps * 2;
                const activeCount = (s, tNow) => blocks.filter((b) => b.s === s && b.t < tNow && b.dir === 'F').length - blocks.filter((b) => b.s === s && b.t < tNow && b.dir === 'B').length;

                // Clean deterministic slot-by-slot scheduler
                for (let tNow = 0; tNow < 80 && placedCount < totalOps; tNow++) {
                    for (let s = 0; s < P; s++) {
                        // Prefer B if ready (1F1B steady rule: run B if warmup >= P-s-1 or no F left)
                        const bCand = pending.filter((op) => {
                            if (op.s !== s || op.dir !== 'B') return false;
                            const key = `B,${op.k},${op.step}`;
                            if (placed.has(key)) return false;
                            if (op.step === totalSteps - 1) return (done[`F,${op.k},${op.step}`] || 999) <= tNow;
                            return (done[`B,${op.k},${op.step + 1}`] || 999) <= tNow;
                        }).sort((a, b) => (Math.floor(a.k / P) - Math.floor(b.k / P)) || (b.step - a.step) || (a.k - b.k));

                        const fCand = pending.filter((op) => {
                            if (op.s !== s || op.dir !== 'F') return false;
                            const key = `F,${op.k},${op.step}`;
                            if (placed.has(key)) return false;
                            if (op.step === 0) return true;
                            return (done[`F,${op.k},${op.step - 1}`] || 999) <= tNow;
                        }).sort((a, b) => (Math.floor(a.k / P) * totalSteps + a.step) - (Math.floor(b.k / P) * totalSteps + b.step) || (a.k - b.k));

                        // Strict 1F1B activation cap per stage: v=1 => P - s (so Stage 0 peaks at P=4), v=2 => 2P - s half-stages (= 4 full)
                        const maxInflight = v === 1 ? (P - s) : (2 * P - s);
                        const canF = fCand.length > 0 && inflight[s] < maxInflight;
                        const canB = bCand.length > 0;
                        let pick = null;
                        if (canB && canF) {
                            const warmupGoal = v === 1 ? (P - s - 1) : (2 * P - s - 1);
                            pick = inflight[s] >= warmupGoal ? bCand[0] : fCand[0];
                        } else if (canB) {
                            pick = bCand[0];
                        } else if (canF) {
                            pick = fCand[0];
                        }
                        if (pick) {
                            const key = `${pick.dir},${pick.k},${pick.step}`;
                            placed.add(key);
                            done[key] = tNow + 1;
                            if (pick.dir === 'F') inflight[s]++;
                            else inflight[s]--;
                            placedCount++;
                            blocks.push({ s, t: tNow, type: pick.dir, label: pick.lbl, mb: pick.k, chunk: Math.floor(pick.step / P) });
                        }
                    }
                }
            }

            const totalTicks = blocks.reduce((acc, b) => Math.max(acc, b.t + 1), 1);
            // Stage 0 buffered activations by tick
            const s0Hist = [];
            let cur = 0, peak = 0;
            for (let tk = 0; tk < totalTicks; tk++) {
                const op = blocks.find((b) => b.s === 0 && b.t === tk);
                if (op) cur += op.type === 'F' ? 1 : -1;
                if (cur > peak) peak = cur;
                s0Hist.push(cur);
            }
            const activeSlots = blocks.length;
            const bubblePct = ((1 - activeSlots / (P * totalTicks)) * 100);
            return { blocks, totalTicks, s0Hist, peak, bubblePct };
        }

        let sched = buildOps(MODES[modeIdx]);

        const ui = mountAnim(fig, {
            height: 224,
            stepMs: 420,
            aria: t('Pipeline schedules: 1F1B vs GPipe vs Interleaved vs Naive', '流水线调度动画对比：1F1B / GPipe / Interleaved / Naive'),
            pills: MODES.map((m) => ({ label: m.label })),
            onPill: (idx) => {
                modeIdx = idx;
                sched = buildOps(MODES[modeIdx]);
                tick = Math.min(8, Math.floor(sched.totalTicks / 2));
                render();
            },
            onTick: () => {
                tick = (tick + 1) % sched.totalTicks;
                render();
            }
        });

        function render() {
            const m = MODES[modeIdx];
            const svg = ui.svg;
            svg.innerHTML = '';
            ui.setActivePill(modeIdx);
            ui.setStatus(`${m.label} · Tick ${tick + 1}/${sched.totalTicks} · Bubble ${sched.bubblePct.toFixed(1)}%`);

            const sx = 64, sy = 20, maxW = 526;
            const stepW = Math.min(24, maxW / sched.totalTicks);
            const blockW = Math.max(8, stepW - 2.5);

            for (let s = 0; s < P; s++) {
                const y = sy + s * 42;
                svg.appendChild(el('text', {
                    x: 16, y: y + 21, 'font-size': 10.5, 'font-weight': 700,
                    'font-family': 'var(--mono)', fill: GROUP_COLS[s].fg
                }, `GPU ${s}`));
                svg.appendChild(el('rect', {
                    x: sx, y: y + 2, width: sched.totalTicks * stepW, height: 30, rx: 4,
                    fill: 'var(--vz-tile-bg)', stroke: 'var(--vz-line)', 'stroke-width': 0.8
                }));
            }

            sched.blocks.forEach((b) => {
                const bx = sx + b.t * stepW + 1.2;
                const by = sy + b.s * 42 + 4;
                const passed = b.t <= tick;
                const col = b.type === 'F' ? (b.chunk > 0 ? COL.plum : COL.navy) : COL.teal;
                svg.appendChild(el('rect', {
                    x: bx, y: by, width: blockW, height: 26, rx: 3,
                    fill: col.fg, opacity: passed ? 0.92 : 0.25
                }));
                if (blockW >= 14) {
                    svg.appendChild(el('text', {
                        x: bx + blockW / 2, y: by + 16.5, 'text-anchor': 'middle',
                        'font-size': blockW >= 18 ? 8.5 : 7.2, 'font-weight': 700,
                        'font-family': 'var(--mono)', fill: '#ffffff', opacity: passed ? 1 : 0.65
                    }, b.label));
                }
            });

            // Playhead vertical line
            const px = sx + (tick + 0.5) * stepW;
            svg.appendChild(el('line', {
                x1: px, y1: sy - 4, x2: px, y2: sy + P * 42 - 6,
                stroke: COL.red.fg, 'stroke-width': 1.6, 'stroke-dasharray': '3 2'
            }));

            // Right Stage-0 buffered activations meter
            svg.appendChild(el('rect', {
                x: 604, y: 18, width: 140, height: 176, rx: 7,
                fill: 'var(--vz-card-bg)', stroke: 'var(--vz-line)', 'stroke-width': 1
            }));
            svg.appendChild(el('text', {
                x: 674, y: 36, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700,
                'font-family': 'var(--sans)', fill: 'var(--vz-ink)'
            }, t('Stage 0 Stored Act', 'Stage 0 缓存激活')));

            const curMem = sched.s0Hist[tick] || 0;
            const eqCur = m.v > 1 ? +(curMem / m.v).toFixed(1) : curMem;
            const eqPeak = m.v > 1 ? +(sched.peak / m.v).toFixed(1) : sched.peak;
            for (let i = 0; i < Math.min(curMem, 8); i++) {
                const barH = m.v > 1 ? 6 : 10;
                const gap = m.v > 1 ? 9 : 13;
                svg.appendChild(el('rect', {
                    x: 626, y: 150 - i * gap, width: 96, height: barH, rx: 2,
                    fill: m.id === 'gpipe' ? COL.amber.fg : COL.teal.fg
                }));
            }

            svg.appendChild(el('text', {
                x: 674, y: 172, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: m.id === 'gpipe' ? COL.amber.fg : COL.teal.fg
            }, `${t('Now', '当前')} ${eqCur} · ${t('Peak', '峰值')} ${eqPeak}`));
            svg.appendChild(el('text', {
                x: 674, y: 186, 'text-anchor': 'middle', 'font-size': 9,
                'font-family': 'var(--mono)', fill: 'var(--vz-muted)'
            }, m.id === 'gpipe' ? 'O(M)' : (m.id === 'naive' ? 'O(1)' : 'O(P)')));

            svg.appendChild(el('text', {
                x: 64, y: 210, 'font-size': 10, 'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, m.id === '1f1b'
                ? t('1F1B caps Stage 0 buffered activations at O(P)=4 instead of GPipe O(M)=8.', '1F1B 把 Stage 0 滞留激活从 GPipe 的 O(M)=8 压到 O(P)=4，大 M 时不会 OOM。')
                : (m.id === 'interleaved'
                    ? t('Interleaved 1F1B (v=2) halves bubble fraction with only 2x light P2P comm.', '交错 1F1B (v=2) 在同等显存下再把气泡压缩近一半。')
                    : (m.id === 'gpipe'
                        ? t('GPipe drains all M forwards before starting backwards -> O(M) activation peak.', 'GPipe 必须把全部 M 个微批次前向攒完才启动反向，峰值随 M 线性上涨。')
                        : t('Naive serial execution leaves 3/4 GPUs idle (75% bubble).', '朴素串行执行在 P=4 时有 75% 的硬件算力完全空转。')))));
        }

        render();
    }

    /* =========================================================================
       9. moe-alltoall: 2-pass All-to-All (2-GPU a,b,c,d or 4-GPU skewed drop)
    ========================================================================= */
    function initMoeAlltoall(fig) {
        let scenario = 0; // 0: 2-GPU (a,b,c,d), 1: 4-GPU Skewed CF=1.0
        let step = 1;     // Start mid-Dispatch

        const PHASES = [
            t('1. Gate Route', '1. 门控分发决策'),
            t('2. Pass 1 All-to-All (Dispatch)', '2. 第 1 趟 All-to-All（发往专家）'),
            t('3. Expert FFN Compute', '3. 本地专家计算'),
            t('4. Pass 2 All-to-All (Combine)', '4. 第 2 趟 All-to-All（原路归位）')
        ];

        const ui = mountAnim(fig, {
            height: 232,
            stepMs: 1700,
            aria: t('MoE two-pass All-to-All token routing animation', 'MoE 两趟 All-to-All 路由动画'),
            pills: [
                { label: '2-GPU (a,b,c,d)' },
                { label: t('4-GPU Skewed (CF=1.0)', '4 卡倾斜丢包 (CF=1.0)') }
            ],
            onPill: (idx) => {
                scenario = idx;
                step = 1;
                render();
            },
            onTick: () => {
                step = (step + 1) % 4;
                render();
            }
        });

        function renderTwoGpu(svg) {
            const topY = 44, botY = 148, cardW = 240;
            const g0x = 70, g1x = 450;

            drawBox(svg, g0x, topY, cardW, 44, 'GPU 0 · Attention', 'tokens: [a, b]', COL.navy, step === 0 || step === 3);
            drawBox(svg, g1x, topY, cardW, 44, 'GPU 1 · Attention', 'tokens: [c, d]', COL.teal, step === 0 || step === 3);

            drawBox(svg, g0x, botY, cardW, 48, 'Expert 0 (on GPU 0)', 'handles a, c', COL.navy, step === 2);
            drawBox(svg, g1x, botY, cardW, 48, 'Expert 1 (on GPU 1)', 'handles b, d', COL.teal, step === 2);

            // Paths
            const paths = [
                { id: 'a', sx: g0x + 65,  dx: g0x + 65,  c: COL.navy, cross: false },
                { id: 'b', sx: g0x + 175, dx: g1x + 65,  c: COL.amber, cross: true },
                { id: 'c', sx: g1x + 65,  dx: g0x + 175, c: COL.plum, cross: true },
                { id: 'd', sx: g1x + 175, dx: g1x + 175, c: COL.teal, cross: false }
            ];

            const bez = (p0, p1, p2, p3, u) => {
                const m = 1 - u;
                return m * m * m * p0 + 3 * m * m * u * p1 + 3 * m * u * u * p2 + u * u * u * p3;
            };

            paths.forEach((p, i) => {
                const combine = step === 3;
                const x0 = combine ? p.dx : p.sx;
                const x1 = combine ? p.sx : p.dx;
                const y0 = combine ? (botY - 2) : (topY + 46);
                const y1 = combine ? (topY + 46) : (botY - 2);
                const ym = (topY + botY) / 2;
                const d = `M ${x0} ${y0} C ${x0} ${ym}, ${x1} ${ym}, ${x1} ${y1}`;
                const pathEl = el('path', {
                    d, fill: 'none', stroke: p.c.fg,
                    'stroke-width': (step === 1 || step === 3) ? 1.8 : 1,
                    opacity: (step === 1 || step === 3) ? 0.9 : 0.25,
                    'marker-end': p.c === COL.navy ? 'url(#arr-navy)' : (p.c === COL.teal ? 'url(#arr-teal)' : (p.c === COL.amber ? 'url(#arr-amber)' : 'url(#arr-plum)'))
                });
                if (step === 1 || step === 3) pathEl.setAttribute('class', 'vz-flow');
                svg.appendChild(pathEl);

                // Place token directly along its cubic Bezier curve, clear of the x=380 midpoint crossing
                const u = step === 0 ? 0.14 : (step === 1 ? (i % 2 === 0 ? 0.26 : 0.34) : (step === 2 ? 0.86 : (i % 2 === 0 ? 0.26 : 0.34)));
                const bx = bez(x0, x0, x1, x1, u);
                const by = bez(y0, ym, ym, y1, u);
                const lbl = step >= 2 ? `${p.id}'` : p.id;
                drawChip(svg, bx - 15, by - 10, 30, 20, lbl, p.c, true);
            });

            svg.appendChild(el('text', {
                x: 380, y: 218, 'text-anchor': 'middle', 'font-size': 10,
                'font-family': 'var(--sans)', fill: 'var(--vz-muted)'
            }, step === 3
                ? t("Pass 2 returns [a', b'] to GPU 0 and [c', d'] to GPU 1 for the next Attention block", "第 2 趟归位把 [a', b'] 送回 GPU 0、[c', d'] 送回 GPU 1，无缝接回 Attention")
                : t('Weights never move: only tokens take two All-to-All trips (1/4 cost of AllGather)', '海量专家权重钉在本地不动，仅用两趟极省流量的 All-to-All 搬运 token')));
        }

        function renderFourGpuSkewed(svg) {
            const xs = [26, 208, 390, 572];
            const w = 160;
            const tokens = [
                { id: 't0', src: 0, exp: 0, drop: false },
                { id: 't1', src: 0, exp: 0, drop: false },
                { id: 't2', src: 1, exp: 0, drop: true },
                { id: 't3', src: 1, exp: 1, drop: false },
                { id: 't4', src: 2, exp: 0, drop: true },
                { id: 't5', src: 2, exp: 2, drop: false },
                { id: 't6', src: 3, exp: 1, drop: false },
                { id: 't7', src: 3, exp: 2, drop: false }
            ];

            for (let g = 0; g < 4; g++) {
                drawBox(svg, xs[g], 36, w, 34, `GPU ${g}`, '', GROUP_COLS[g], step === 0 || step === 3);
                drawBox(svg, xs[g], 150, w, 46, `Expert ${g} · C=2`, g === 3 ? '0 pad / 0 pad' : (g === 0 ? 'full (2/2)' : ''), GROUP_COLS[g], step === 2);
            }

            const slotSeen = [0, 0, 0, 0];
            tokens.forEach((tk, idx) => {
                const sx = xs[tk.src] + (idx % 2 === 0 ? 44 : 116);
                const c = GROUP_COLS[tk.exp];
                if (tk.drop) {
                    svg.appendChild(el('line', {
                        x1: sx, y1: 72, x2: sx, y2: 120,
                        stroke: COL.red.fg, 'stroke-width': 1.4, 'stroke-dasharray': '3 3'
                    }));
                    drawChip(svg, sx - 24, 96, 48, 19, `${tk.id} DROP`, COL.red, true);
                    return;
                }
                const slot = slotSeen[tk.exp]++;
                const dx = xs[tk.exp] + 44 + slot * 72;
                const d = `M ${sx} 72 C ${sx} 112, ${dx} 112, ${dx} 148`;
                const p = el('path', { d, fill: 'none', stroke: c.fg, 'stroke-width': 1.5, opacity: 0.7 });
                if (step === 1 || step === 3) p.setAttribute('class', 'vz-flow');
                svg.appendChild(p);

                const u = step === 0 ? 0.14 : (step === 1 ? (slot === 0 ? 0.35 : 0.65) : (step === 2 ? 0.88 : 0.45));
                const bx = sx + (dx - sx) * u;
                const by = 72 + 76 * u;
                drawChip(svg, bx - 15, by - 9, 30, 18, step >= 2 ? `${tk.id}'` : tk.id, c, true);
            });

            svg.appendChild(el('text', {
                x: 380, y: 218, 'text-anchor': 'middle', 'font-size': 10,
                'font-family': 'var(--sans)', fill: COL.red.fg
            }, t('4 tokens rush to Expert 0 at CF=1.0 (C=2) -> t2 & t4 overflow to residual drop; L_aux prevents collapse', 'CF=1.0 (C=2) 时 4 个 token 挤向 Expert 0，t2/t4 溢出丢弃；Expert 3 空转补零')));
        }

        function render() {
            const svg = ui.svg;
            svg.innerHTML = '';
            addArrowDefs(svg);
            ui.setActivePill(scenario);
            ui.setStatus(PHASES[step]);

            svg.appendChild(el('text', {
                x: 380, y: 22, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700,
                'font-family': 'var(--sans)', fill: step === 1 || step === 3 ? COL.amber.fg : COL.teal.fg
            }, PHASES[step]));

            if (scenario === 0) renderTwoGpu(svg);
            else renderFourGpuSkewed(svg);
        }

        render();
    }

    /* =========================================================================
       10. moe-groups: DP(8) = EP(4) x EDP(2) Orthogonal Communication Domains
    ========================================================================= */
    function initMoeGroups(fig) {
        const MODES = [
            { id: 'ep',  label: 'EP (All-to-All)',  col: COL.amber, desc: t('Horizontal EP groups {0,1,2,3} & {4,5,6,7} route tokens across distinct experts', '水平 EP 组 {0,1,2,3} 与 {4,5,6,7} 各凑齐一套 4 专家，负责 All-to-All 搬运 token') },
            { id: 'edp', label: 'EDP (Expert Grad)', col: COL.teal,  desc: t('Vertical EDP pairs {0,4}, {1,5}, {2,6}, {3,7} AllReduce identical expert replicas only', '垂直 EDP 对 {0,4}…{3,7} 只在同编号专家副本间同步梯度（绝不跨专家平均）') },
            { id: 'dp',  label: 'DP (Shared Grad)',  col: COL.navy,  desc: t('Global 8-GPU DP group synchronizes shared Attention, LayerNorm, Router weights', '全局 8 卡 DP 组照常跨全部机器同步共享 Attention、LN 与 Router 参数') }
        ];
        let step = 0;

        const ui = mountAnim(fig, {
            height: 204,
            stepMs: 2100,
            aria: t('DeepSpeed-Megatron DP(8) = EP(4) x EDP(2) communication groups', 'DeepSpeed-Megatron DP(8) = EP(4) x EDP(2) 通信分组'),
            pills: MODES.map((m) => ({ label: m.label })),
            onPill: (idx) => {
                step = idx;
                ui.setPaused(true);
                render();
            },
            onTick: () => {
                step = (step + 1) % MODES.length;
                render();
            }
        });

        function render() {
            const m = MODES[step];
            const svg = ui.svg;
            svg.innerHTML = '';
            addArrowDefs(svg);
            ui.setActivePill(step);
            ui.setStatus(m.label);

            const gx = (c) => 36 + c * 116;
            const gy = (r) => 36 + r * 72;

            // Highlight enclosures before drawing GPU cards
            if (m.id === 'ep') {
                [0, 1].forEach((r) => {
                    svg.appendChild(el('rect', {
                        x: 24, y: gy(r) - 10, width: 472, height: 60, rx: 9,
                        fill: COL.amber.bg, stroke: COL.amber.fg, 'stroke-width': 1.8, 'stroke-dasharray': '5 3'
                    }));
                });
            } else if (m.id === 'edp') {
                for (let c = 0; c < 4; c++) {
                    svg.appendChild(el('rect', {
                        x: gx(c) - 8, y: 24, width: 108, height: 136, rx: 9,
                        fill: COL.teal.bg, stroke: COL.teal.fg, 'stroke-width': 1.8, 'stroke-dasharray': '5 3'
                    }));
                }
            } else {
                svg.appendChild(el('rect', {
                    x: 20, y: 20, width: 480, height: 144, rx: 10,
                    fill: COL.navy.bg, stroke: COL.navy.fg, 'stroke-width': 2
                }));
            }

            // Draw 8 GPUs (2 rows x 4 cols)
            for (let r = 0; r < 2; r++) {
                for (let c = 0; c < 4; c++) {
                    const rank = r * 4 + c;
                    drawBox(svg, gx(c), gy(r), 92, 42, `GPU ${rank}`, `Expert ${c}`, GROUP_COLS[c], true);
                }
            }

            // Flow arrows
            if (m.id === 'ep') {
                [0, 1].forEach((r) => {
                    for (let c = 0; c < 3; c++) {
                        const l = el('line', {
                            x1: gx(c) + 94, y1: gy(r) + 21, x2: gx(c + 1) - 2, y2: gy(r) + 21,
                            stroke: COL.amber.fg, 'stroke-width': 1.8, 'marker-end': 'url(#arr-amber)', 'marker-start': 'url(#arr-amber)'
                        });
                        l.setAttribute('class', 'vz-flow');
                        svg.appendChild(l);
                    }
                });
            } else if (m.id === 'edp') {
                for (let c = 0; c < 4; c++) {
                    const l = el('line', {
                        x1: gx(c) + 46, y1: gy(0) + 44, x2: gx(c) + 46, y2: gy(1) - 2,
                        stroke: COL.teal.fg, 'stroke-width': 2, 'marker-end': 'url(#arr-teal)', 'marker-start': 'url(#arr-teal)'
                    });
                    l.setAttribute('class', 'vz-flow');
                    svg.appendChild(l);
                }
            }

            // Right summary card
            svg.appendChild(el('rect', {
                x: 516, y: 22, width: 228, height: 140, rx: 7,
                fill: 'var(--vz-card-bg)', stroke: m.col.fg, 'stroke-width': 1.4
            }));
            svg.appendChild(el('text', {
                x: 530, y: 46, 'font-size': 11.5, 'font-weight': 700,
                'font-family': 'var(--mono)', fill: m.col.fg
            }, 'DP(8) = EP(4) × EDP(2)'));
            svg.appendChild(el('text', {
                x: 530, y: 74, 'font-size': 10.5, 'font-weight': 650,
                'font-family': 'var(--sans)', fill: m.id === 'ep' ? COL.amber.fg : 'var(--vz-muted)'
            }, '• EP = {0,1,2,3} & {4,5,6,7}'));
            svg.appendChild(el('text', {
                x: 530, y: 98, 'font-size': 10.5, 'font-weight': 650,
                'font-family': 'var(--sans)', fill: m.id === 'edp' ? COL.teal.fg : 'var(--vz-muted)'
            }, '• EDP = {0,4},{1,5},{2,6},{3,7}'));
            svg.appendChild(el('text', {
                x: 530, y: 122, 'font-size': 10.5, 'font-weight': 650,
                'font-family': 'var(--sans)', fill: m.id === 'dp' ? COL.navy.fg : 'var(--vz-muted)'
            }, '• DP = {0..7} (Attn/LN/Gate)'));

            svg.appendChild(el('text', {
                x: 380, y: 190, 'text-anchor': 'middle', 'font-size': 10,
                'font-family': 'var(--sans)', fill: 'var(--vz-ink)'
            }, m.desc));
        }

        render();
    }

    const REGISTRY = {
        'mesh-sharding':        initMeshSharding,
        'collectives-toy':      initCollectivesToy,
        'allgather-vs-alltoall': initAllgatherVsAlltoall,
        'ring-cost':            initRingCost,
        'sharded-matmul':       initShardedMatmul,
        'ddp-vs-fsdp':          initDdpVsFsdp,
        'tp-megatron':          initTpMegatron,
        'pp-schedule':          initPpSchedule,
        'moe-alltoall':         initMoeAlltoall,
        'moe-groups':           initMoeGroups
    };

    document.querySelectorAll('figure.anim-fig[data-anim]').forEach((fig) => {
        const key = fig.getAttribute('data-anim');
        if (REGISTRY[key]) REGISTRY[key](fig);
    });
})();
