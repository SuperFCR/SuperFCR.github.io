// Interactive architecture explorer for PocketRig (blogs/pocketrig/).
// Zero external dependencies; renders a multi-view SVG+DOM architecture graph with guided
// walkthroughs, L1 route filtering, click-to-inspect details, and fullscreen expansion.
(() => {
    const WORLD_W = 1120;
    const WORLD_H = 520;
    const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ICONS = {
        phone: '<svg class="pk-node-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.4"/><line x1="10.5" y1="18.2" x2="13.5" y2="18.2"/></svg>',
        laptop: '<svg class="pk-node-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="11.5" rx="1.6"/><line x1="2" y1="19" x2="22" y2="19"/></svg>',
    };

    const METRIC_CARDS = [
        {
            view: 'network',
            label: 'Layer 1 · Private Network',
            tag: 'No public ports',
            body: 'Tailscale tailnet or company VPN; relay off, per-user port grants.',
        },
        {
            view: 'paseo',
            label: 'Layer 2 · Paseo & Wrappers',
            tag: '24/7 daemon',
            body: 'systemd / launchd per-UID session; shared wrapper runs pre-launch checks.',
        },
        {
            view: 'compute',
            label: 'Layer 3 · GPU Compute Loop',
            tag: '≤ 50 MB back',
            body: 'Pin commit, detach over SSH, pull only metrics, plots & summary.md.',
        },
        {
            view: 'team',
            label: 'Multi-User Workstation',
            tag: 'UID · chmod 700',
            body: 'Shared read-only binaries; separate ports, homes, passwords & logins.',
        },
    ];

    const FOCUS_PRESETS = {
        all: null,
        native: {
            nodes: ['n_phone', 'n_mac', 'n_ts_serve', 'n_paseo_listen'],
            edges: ['e_cli_native', 'e_mac_native', 'e_native_dst'],
            groups: ['g_dev', 'g_tunnel', 'g_dst'],
        },
        wsl2: {
            nodes: ['n_phone', 'n_mac', 'n_wsl_proxy', 'n_wsl_fw', 'n_paseo_listen'],
            edges: ['e_cli_wsl', 'e_wsl_hop', 'e_wsl_dst'],
            groups: ['g_dev', 'g_tunnel', 'g_dst'],
        },
        vpn: {
            nodes: ['n_phone', 'n_mac', 'n_vpn_gate', 'n_paseo_listen', 'n_fw_deny'],
            edges: ['e_cli_vpn', 'e_vpn_dst', 'e_vpn_warn'],
            groups: ['g_dev', 'g_tunnel', 'g_dst'],
        },
    };

    const VIEWS = {
        overview: {
            id: 'overview',
            num: 'ALL',
            label: 'Overview',
            groups: [
                { id: 'g_priv', x: 14, y: 16, w: 742, h: 488, tone: 'teal', dashed: true, title: 'Private network', sub: 'Tailscale tailnet or company VPN · no public ports' },
                { id: 'g_ws', x: 332, y: 66, w: 406, h: 418, tone: 'navy', title: 'Always-on workstation', sub: 'Linux · macOS · WSL2 · online 24/7' },
                { id: 'g_gpu', x: 868, y: 102, w: 238, h: 356, tone: 'amber', title: 'GPU / compute nodes', sub: 'reached over SSH' },
            ],
            nodes: [
                {
                    id: 'phone', x: 132, y: 168, w: 196, h: 78, tone: 'teal', icon: 'phone', badge: 'Thin client',
                    title: 'Phone', sub: 'Paseo app · start, check, steer',
                    section: '#architecture',
                    summary: 'Thin mobile client for launching tasks on the move, reading short status summaries, and sending the next instruction.',
                    details: [
                        'Holds only the Paseo app and Tailscale (or company VPN) client; closing it never stops the session.',
                        'Verified on iPhone over Tailscale; connects with Use SSL switched off because Tailscale encrypts the tunnel.',
                        'Stop agent commands in Paseo do not cancel detached GPU jobs automatically.',
                    ],
                },
                {
                    id: 'mac', x: 132, y: 382, w: 196, h: 78, tone: 'teal', icon: 'laptop', badge: 'Thin client',
                    title: 'Mac / Laptop', sub: 'Paseo app or web · larger screen',
                    section: '#architecture',
                    summary: 'Optional desktop/laptop window onto the exact same persistent workstation session when you want a keyboard or bigger screen.',
                    details: [
                        'No repository state, environment, or conversation history depends on the laptop.',
                        'Connects to the same host and workspace to continue mid-flight work from the phone.',
                        'Double SSH tunnels (node → workstation → laptop) can forward dashboards like TensorBoard.',
                    ],
                },
                {
                    id: 'paseo', x: 535, y: 158, w: 362, h: 74, tone: 'navy', badge: '1 / person',
                    title: 'Your Paseo instance', sub: 'systemd paseo@user / launchd · own port · relay off',
                    section: '#paseo',
                    summary: 'Long-running per-user daemon created by paseo-user that owns session continuity and connection authentication.',
                    details: [
                        'Listens only on 127.0.0.1 (behind tailscale serve / WSL portproxy) or intranet IP—never exposed publicly.',
                        'Runs under the real UID with umask 077; random connection password is stored in ~/.paseo/client.env (0600).',
                        'Paseo relay is explicitly disabled so clients talk directly over your private network.',
                    ],
                    cmd: 'sudo paseo-user add "$USER" 6767',
                },
                {
                    id: 'agent', x: 535, y: 282, w: 362, h: 74, tone: 'navy', badge: 'UID · wrapper',
                    title: 'Claude Code / Codex', sub: 'shared wrapper · runs as your UID · pre-launch checks',
                    section: '#paseo',
                    summary: 'Coding agents invoked through shared root-maintained wrapper scripts rather than bare binaries.',
                    details: [
                        'Checks caller membership in ai-cli-users and runs /etc/paseo-workstation/pre-launch.d/ before exec.',
                        'Injects workstation-wide defaults such as /etc/paseo-workstation/proxy.env cleanly.',
                        'Prompts on stderr on refusal so Paseo\'s stdio protocol remains uncorrupted.',
                    ],
                },
                {
                    id: 'projects', x: 441, y: 420, w: 174, h: 72, tone: 'slate', monoTitle: true, badge: 'Local',
                    title: '~/projects', sub: 'code · git · light checks',
                    section: '#compute',
                    summary: 'Local code clones, Git history, and fast non-GPU checks pinned to commits before dispatching remote runs.',
                    details: [
                        'Agent commits and pushes locally before checking out the matching commit on GPU nodes.',
                        'Each repo stores remote host, dir, virtualenv, and scheduler details in untracked CLAUDE.local.md.',
                    ],
                },
                {
                    id: 'results', x: 629, y: 420, w: 174, h: 72, tone: 'amber', monoTitle: true, badge: '≤ 50 MB',
                    title: '~/results', sub: 'metrics · plots · summary.md',
                    section: '#compute',
                    summary: 'Landing zone for compact, phone-readable metrics tables, 1200px PNG charts, and structured run summaries.',
                    details: [
                        'Stored under ~/results/<project>/<job-id>/ with a 3–5 line summary.md ready for phone review.',
                        'Agent measures du -sh on the node and asks before transferring more than 50 MB.',
                    ],
                },
                {
                    id: 'gpu_jobs', x: 987, y: 224, w: 208, h: 80, tone: 'amber', badge: 'Detached',
                    title: 'Training & Inference', sub: 'Slurm · systemd-run · tmux',
                    section: '#compute',
                    summary: 'Detached compute workloads running independently of Phone, Mac, or open SSH connections.',
                    details: [
                        'Logs write to logs/<job-id>.log with the pinned Git commit on line 1.',
                        'Status checks return scheduler state, key metrics, and the last 20 log lines—sized for one phone screen.',
                    ],
                },
                {
                    id: 'gpu_store', x: 987, y: 376, w: 208, h: 80, tone: 'muted', badge: 'Stays on node',
                    title: 'Data & Checkpoints', sub: 'datasets · weights · full artifacts',
                    section: '#compute',
                    summary: 'Heavy artifacts remain on compute storage and never sync back to the workstation.',
                    details: [
                        'Prevents filling workstation disks or clogging residential/tailnet links with multi-GB checkpoints.',
                        'rsync pulls never use --delete, avoiding accidental local data loss.',
                    ],
                },
            ],
            edges: [
                {
                    id: 'e_handoff', from: 'phone', to: 'mac', type: 'net', bidir: true,
                    d: 'M 132 211 V 338', label: 'same session', lx: 132, ly: 275,
                    section: '#paseo',
                    summary: 'Phone and Mac attach to the same daemon-hosted conversation rather than syncing client state.',
                    details: ['Switch from phone on a commute to laptop at a desk mid-run without losing context.'],
                },
                {
                    id: 'e_phone_paseo', from: 'phone', to: 'paseo', type: 'net',
                    d: 'M 230 152 H 354', label: 'Tailnet / VPN', lx: 288, ly: 132,
                    section: '#network',
                    summary: 'Direct encrypted private-network connection to your personal Paseo port.',
                    details: ['Tailscale grants (or company VPN host firewall rules) restrict which clients can reach the port.'],
                },
                {
                    id: 'e_mac_paseo', from: 'mac', to: 'paseo', type: 'net',
                    d: 'M 230 382 H 270 Q 282 382 282 370 V 188 Q 282 176 294 176 H 354',
                    label: 'same host', lx: 274, ly: 294,
                    section: '#paseo',
                    summary: 'Secondary client opening the identical workstation session over the same private route.',
                    details: ['Multiple clients can watch; keeping one controller at a time avoids racing prompts.'],
                },
                {
                    id: 'e_paseo_agent', from: 'paseo', to: 'agent', type: 'local',
                    d: 'M 535 195 V 243', label: 'wrapper + checks', lx: 535, ly: 219,
                    section: '#paseo',
                    summary: 'Paseo invokes wrapper scripts that verify group access and pre-launch checks before running claude or codex.',
                    details: ['Shared policy lives outside user dotfiles in /etc/paseo-workstation/.'],
                },
                {
                    id: 'e_agent_proj', from: 'agent', to: 'projects', type: 'local',
                    d: 'M 441 319 V 382', label: 'code & git', lx: 441, ly: 348,
                    section: '#compute',
                    summary: 'Agent reads, edits, tests, and commits code inside ~/projects on the workstation.',
                    details: ['Lightweight unit checks happen locally before shipping jobs to GPUs.'],
                },
                {
                    id: 'e_agent_gpu', from: 'agent', to: 'gpu_jobs', type: 'ssh',
                    d: 'M 716 262 H 774 Q 786 262 786 250 V 216 Q 786 204 798 204 H 881',
                    label: 'SSH: submit job', lx: 814, ly: 184,
                    section: '#compute',
                    summary: 'remote-compute checks out the pinned commit on the compute node and submits a detached scheduler job.',
                    details: ['Stops and asks instead of overwriting if uncommitted remote edits exist.'],
                },
                {
                    id: 'e_gpu_store', from: 'gpu_jobs', to: 'gpu_store', type: 'local',
                    d: 'M 987 264 V 334', label: 'writes artifacts', lx: 987, ly: 298,
                    section: '#compute',
                    summary: 'Training checkpoints, caches, and full datasets remain on fast node storage.',
                    details: ['Only aggregated CSV/JSON metrics and ≤1200px PNGs are candidates to pull back.'],
                },
                {
                    id: 'e_gpu_res', from: 'gpu_jobs', to: 'results', type: 'return',
                    d: 'M 883 248 H 846 Q 834 248 834 260 V 408 Q 834 420 822 420 H 718',
                    label: 'pull ≤ 50 MB', lx: 814, ly: 342,
                    section: '#compute',
                    summary: 'Checks artifact size with du -sh first, asks if >50 MB, and syncs compact results back without --delete.',
                    details: ['Lands directly in ~/results/<project>/<job-id>/ for quick phone inspection.'],
                },
                {
                    id: 'e_res_agent', from: 'results', to: 'agent', type: 'return',
                    d: 'M 629 382 V 321', label: 'summary.md', lx: 629, ly: 348,
                    section: '#compute',
                    summary: 'Agent distills logs and metrics into a 3–5 line reply with deltas vs. the previous run.',
                    details: ['Ready to steer from your phone with short follow-ups like "rerun with lower lr".'],
                },
            ],
            simSteps: [
                { badge: 'STEP 1/6', tone: 'pass', desc: 'Open Paseo on your phone over Tailscale or company VPN and kick off a task.', nodes: ['phone', 'paseo'], edges: ['e_phone_paseo'], groups: ['g_priv', 'g_ws'] },
                { badge: 'STEP 2/6', tone: 'pass', desc: 'Your persistent Paseo instance receives the prompt; locking the phone will not drop the session.', nodes: ['paseo'], edges: [], groups: ['g_ws'] },
                { badge: 'STEP 3/6', tone: 'pass', desc: 'The shared wrapper validates ai-cli-users & pre-launch checks, then execs Claude Code or Codex in ~/projects.', nodes: ['paseo', 'agent', 'projects'], edges: ['e_paseo_agent', 'e_agent_proj'], groups: ['g_ws'] },
                { badge: 'STEP 4/6', tone: 'pass', desc: 'Agent pins the Git commit and submits a detached Slurm / systemd-run / tmux job to GPU nodes over SSH.', nodes: ['agent', 'gpu_jobs', 'gpu_store'], edges: ['e_agent_gpu', 'e_gpu_store'], groups: ['g_ws', 'g_gpu'] },
                { badge: 'STEP 5/6', tone: 'pass', desc: 'Full checkpoints stay on the node; only compact metrics and plots (≤ 50 MB) return to ~/results and summary.md.', nodes: ['gpu_jobs', 'results', 'agent'], edges: ['e_gpu_res', 'e_res_agent'], groups: ['g_gpu', 'g_ws'] },
                { badge: 'STEP 6/6', tone: 'pass', desc: 'Open Paseo on your Mac later to pick up the exact same conversation and artifacts with zero re-setup.', nodes: ['mac', 'paseo', 'phone'], edges: ['e_handoff', 'e_mac_paseo'], groups: ['g_priv', 'g_ws'] },
            ],
        },

        network: {
            id: 'network',
            num: 'L1',
            label: 'Network',
            hasFocusBar: true,
            groups: [
                { id: 'g_dev', x: 16, y: 48, w: 196, h: 426, tone: 'teal', dashed: true, title: 'Devices', sub: 'Tailnet / VPN' },
                { id: 'g_tunnel', x: 274, y: 48, w: 514, h: 426, tone: 'slate', title: 'Private transport', sub: 'Three equivalent ways to reach the host' },
                { id: 'g_dst', x: 866, y: 48, w: 238, h: 426, tone: 'navy', title: 'Host gate', sub: 'Zero public exposure' },
            ],
            nodes: [
                {
                    id: 'n_phone', x: 114, y: 186, w: 168, h: 80, tone: 'teal', icon: 'phone', badge: 'SSL off',
                    title: 'Phone', sub: 'Tailscale / VPN client',
                    section: '#network',
                    summary: 'Traffic is encrypted by Tailscale or the corporate VPN tunnel, so Paseo SSL stays disabled.',
                    details: ['Tailscale connects devices without exposing any host port to the public internet.', 'Note: Tailscale is not an outbound exit proxy by default; it only bridges your devices.'],
                },
                {
                    id: 'n_mac', x: 114, y: 344, w: 168, h: 80, tone: 'teal', icon: 'laptop', badge: 'Same key',
                    title: 'Mac / Laptop', sub: 'App or browser client',
                    section: '#network',
                    summary: 'Reaches the identical workstation address and port without duplicating environments.',
                    details: ['Uses per-user Tailscale grants (tailnet) or host password + firewall CIDR (VPN).'],
                },
                {
                    id: 'n_ts_serve', x: 531, y: 128, w: 454, h: 74, tone: 'success',
                    badge: 'Linux / macOS',
                    title: 'tailscale serve → 127.0.0.1:6767', sub: 'Survives IP changes · per-user Tailscale grants · no public port',
                    section: '#network',
                    summary: 'Recommended path on native Linux and macOS: Paseo stays on loopback while Tailscale handles tailnet routing and per-person ACL grants.',
                    details: [
                        'Single command forwards TCP from the workstation\'s tailnet identity to loopback.',
                        'Tailscale grants ensure Alice cannot reach Bob\'s Paseo port even on a shared machine.',
                    ],
                    cmd: 'sudo tailscale serve --bg --tcp=6767 tcp://127.0.0.1:6767',
                },
                {
                    id: 'n_wsl_proxy', x: 398, y: 266, w: 196, h: 80, tone: 'amber',
                    badge: 'WSL2 · Hop 1',
                    title: 'netsh portproxy', sub: 'Tailnet → 127.0.0.1 → WSL',
                    section: '#network',
                    summary: 'Bridges Tailscale running on the Windows host into Paseo listening on 127.0.0.1 inside WSL2.',
                    details: [
                        'Necessary because WSL2 cannot directly bind the Windows host\'s Tailscale interface.',
                        'Workstation scripts forward each user\'s tailnet port into Windows localhost forwarding.',
                    ],
                },
                {
                    id: 'n_wsl_fw', x: 668, y: 266, w: 196, h: 80, tone: 'amber',
                    badge: 'WSL2 · Hop 2',
                    title: 'Firewall & 30s Loop', sub: '100.64.0.0/10 only · auto-syncs',
                    section: '#network',
                    summary: 'Locks down every forwarded port on Windows to CGNAT tailnet range 100.64.0.0/10.',
                    details: [
                        'A scheduled PowerShell loop polls paseo-user list --json every 30 seconds.',
                        'Automatically refreshes rules if Tailscale reassigns IPs or a member is added.',
                    ],
                },
                {
                    id: 'n_vpn_gate', x: 531, y: 400, w: 454, h: 74, tone: 'navy',
                    badge: 'Corporate LAN',
                    title: 'Company VPN · PW_LISTEN_HOST', sub: 'Intranet IP + VPN CIDR firewall · Paseo password is main gate',
                    section: '#network',
                    summary: 'When the workstation already sits on a corporate network reachable via company VPN, skip Tailscale and bind the intranet IP.',
                    details: [
                        'A corporate VPN admits every employee rather than per-user grants, so strong Paseo passwords + host firewall CIDR checks matter.',
                        'Confirm IT policy before leaving persistent daemons running on a company host.',
                    ],
                    cmd: 'PW_LISTEN_HOST=<workstation intranet IP>',
                },
                {
                    id: 'n_paseo_listen', x: 985, y: 192, w: 204, h: 82, tone: 'navy',
                    badge: 'Loopback / LAN',
                    title: 'Paseo Listener :6767', sub: 'Direct socket · relay off',
                    section: '#network',
                    summary: 'Receives authenticated client traffic after passing tailnet grants or VPN firewall filters.',
                    details: ['Password-protected connection; relay disabled so no third-party relay sees traffic.'],
                },
                {
                    id: 'n_fw_deny', x: 985, y: 360, w: 204, h: 82, tone: 'warn',
                    badge: 'Zero exposure',
                    title: 'Public / Wrong CIDR', sub: 'Dropped by tailnet / firewall',
                    section: '#network',
                    summary: 'Any packet from the public internet or unauthorized LAN subnets is rejected before reaching Paseo.',
                    details: ['No port forwarding is opened on home routers, and 0.0.0.0 is never used unless gated by host firewall.'],
                },
            ],
            edges: [
                { id: 'e_cli_native', from: 'n_phone', to: 'n_ts_serve', type: 'net', focus: 'native', d: 'M 198 158 C 242 158, 244 128, 302 128', label: 'Tailnet', lx: 243, ly: 120 },
                { id: 'e_mac_native', from: 'n_mac', to: 'n_ts_serve', type: 'net', focus: 'native', d: 'M 198 314 C 236 314, 236 144, 302 144', label: '', lx: 243, ly: 220 },
                { id: 'e_native_dst', from: 'n_ts_serve', to: 'n_paseo_listen', type: 'ssh', focus: 'native', d: 'M 758 128 C 814 128, 822 174, 881 174', label: 'grants ok', lx: 827, ly: 118 },

                { id: 'e_cli_wsl', from: 'n_phone', to: 'n_wsl_proxy', type: 'net', focus: 'wsl2', d: 'M 198 202 C 240 202, 240 266, 298 266', label: '100.64/10', lx: 243, ly: 250 },
                { id: 'e_wsl_hop', from: 'n_wsl_proxy', to: 'n_wsl_fw', type: 'local', focus: 'wsl2', d: 'M 496 266 H 568', label: 'rule sync', lx: 533, ly: 238 },
                { id: 'e_wsl_dst', from: 'n_wsl_fw', to: 'n_paseo_listen', type: 'ssh', focus: 'wsl2', d: 'M 766 266 C 818 266, 824 208, 881 208', label: '127.0.0.1', lx: 827, ly: 214 },

                { id: 'e_cli_vpn', from: 'n_mac', to: 'n_vpn_gate', type: 'net', focus: 'vpn', d: 'M 198 368 C 242 368, 246 400, 302 400', label: 'VPN', lx: 243, ly: 404 },
                { id: 'e_vpn_dst', from: 'n_vpn_gate', to: 'n_paseo_listen', type: 'ssh', focus: 'vpn', d: 'M 758 394 C 824 394, 820 226, 881 226', label: 'VPN CIDR', lx: 827, ly: 312 },
                { id: 'e_vpn_warn', from: 'n_vpn_gate', to: 'n_fw_deny', type: 'warn', focus: 'vpn', d: 'M 758 416 C 818 416, 826 364, 881 364', label: 'non-VPN', lx: 827, ly: 416 },
            ],
            simSteps: [
                { badge: 'ROUTE A', tone: 'pass', desc: 'Native Linux / macOS: tailscale serve keeps Paseo on 127.0.0.1 and checks per-user Tailscale grants.', nodes: ['n_phone', 'n_ts_serve', 'n_paseo_listen'], edges: ['e_cli_native', 'e_native_dst'], groups: ['g_dev', 'g_tunnel', 'g_dst'] },
                { badge: 'ROUTE B', tone: 'pass', desc: 'Windows PC + WSL2: netsh portproxy bridges Windows Tailnet IP → localhost → WSL2, fenced to 100.64.0.0/10 every 30s.', nodes: ['n_phone', 'n_wsl_proxy', 'n_wsl_fw', 'n_paseo_listen'], edges: ['e_cli_wsl', 'e_wsl_hop', 'e_wsl_dst'], groups: ['g_dev', 'g_tunnel', 'g_dst'] },
                { badge: 'ROUTE C', tone: 'pass', desc: 'Company network: set PW_LISTEN_HOST to intranet IP, connect over corporate VPN, and restrict host firewall to VPN CIDR.', nodes: ['n_mac', 'n_vpn_gate', 'n_paseo_listen'], edges: ['e_cli_vpn', 'e_vpn_dst'], groups: ['g_dev', 'g_tunnel', 'g_dst'] },
                { badge: 'GUARDRAIL', tone: 'warn', desc: 'Public traffic and unauthorized subnets never pass host firewall filters or per-user Tailscale grants.', nodes: ['n_vpn_gate', 'n_fw_deny'], edges: ['e_vpn_warn'], groups: ['g_tunnel', 'g_dst'] },
            ],
        },

        paseo: {
            id: 'paseo',
            num: 'L2',
            label: 'Paseo & Wrapper',
            groups: [
                { id: 'g_boot', x: 16, y: 48, w: 240, h: 426, tone: 'slate', title: 'Always-on service', sub: 'Survives lid close & logout' },
                { id: 'g_paseo_core', x: 326, y: 48, w: 462, h: 426, tone: 'navy', title: 'Host daemon & policy wrapper', sub: 'Root policy + user UID' },
                { id: 'g_exec', x: 862, y: 48, w: 242, h: 426, tone: 'amber', title: 'Execution outcome', sub: 'Clean protocol I/O' },
            ],
            nodes: [
                {
                    id: 'p_boot', x: 136, y: 170, w: 204, h: 86, tone: 'slate', badge: 'Boot',
                    title: 'Service Manager', sub: 'systemd paseo@user / launchd',
                    section: '#always-on',
                    summary: 'Launches each user\'s Paseo instance automatically on boot without requiring an interactive terminal session.',
                    details: [
                        'Linux / WSL2 uses systemd template unit paseo@<user>; macOS uses a per-user LaunchDaemon.',
                        'Closing your laptop terminal leaves the background daemon completely intact.',
                    ],
                },
                {
                    id: 'p_sleep', x: 136, y: 356, w: 204, h: 86, tone: 'success', badge: 'Acceptance',
                    title: 'No-Sleep Guard', sub: 'pmset / WSL keep-alive task',
                    section: '#always-on',
                    summary: 'Prevents host sleep or WSL hibernation so phones can always reconnect.',
                    details: [
                        'Linux desktop disables suspend; macOS configures pmset (FileVault still requires boot unlock).',
                        'Windows uses Install-PaseoWorkstationTask.ps1 to keep WSL alive with nobody logged in.',
                    ],
                },
                {
                    id: 'p_daemon', x: 432, y: 262, w: 184, h: 92, tone: 'navy', badge: 'umask 077',
                    title: 'Paseo Daemon', sub: 'Real UID · client.env · :6767',
                    section: '#paseo',
                    summary: 'Owns agent transcripts, session persistence, and client hand-offs under the user\'s private directory.',
                    details: [
                        'Connection secret sits in ~/.paseo/client.env (chmod 0600); the paseo CLI loads it automatically.',
                        'Background daemons skip interactive shell aliases, so per-task modes live inside Paseo.',
                    ],
                },
                {
                    id: 'p_wrapper', x: 682, y: 262, w: 180, h: 92, tone: 'navy', badge: 'Shared Gate',
                    title: 'Wrapper Script', sub: 'ai-cli-users · pre-launch.d',
                    section: '#paseo',
                    summary: 'Enforces shared workstation checks and environment settings before handing control to the agent binary.',
                    details: [
                        'Step 1: Verify caller is a member of ai-cli-users.',
                        'Step 2: Execute every script in /etc/paseo-workstation/pre-launch.d/.',
                        'Step 3: Load /etc/paseo-workstation/proxy.env without editing user dotfiles.',
                    ],
                },
                {
                    id: 'p_agent', x: 983, y: 170, w: 210, h: 86, tone: 'amber', badge: 'Pass',
                    title: 'Claude / Codex', sub: 'exec unchanged args as UID',
                    section: '#paseo',
                    summary: 'Runs the real installed binary cleanly once all pre-launch checks pass.',
                    details: ['Exec replaces the wrapper process with arguments untouched, keeping TTY/protocol clean.'],
                },
                {
                    id: 'p_refuse', x: 983, y: 356, w: 210, h: 86, tone: 'warn', badge: 'Check fails',
                    title: 'Refuse Launch', sub: 'Errors go strictly to stderr',
                    section: '#paseo',
                    summary: 'If any pre-launch check or group test fails, the wrapper aborts cleanly without breaking Paseo.',
                    details: ['Pre-launch checks write exclusively to stderr so stdout protocol framing stays uncorrupted.'],
                },
            ],
            edges: [
                { id: 'e_boot_d', from: 'p_boot', to: 'p_daemon', type: 'local', d: 'M 238 170 C 282 170, 286 244, 338 244', label: 'on boot', lx: 291, ly: 184 },
                { id: 'e_sleep_d', from: 'p_sleep', to: 'p_daemon', type: 'local', d: 'M 238 356 C 282 356, 286 280, 338 280', label: 'no sleep', lx: 291, ly: 342 },
                { id: 'e_d_wrap', from: 'p_daemon', to: 'p_wrapper', type: 'ssh', d: 'M 524 262 H 590', label: 'invokes', lx: 558, ly: 234 },
                { id: 'e_wrap_ok', from: 'p_wrapper', to: 'p_agent', type: 'ssh', d: 'M 772 246 C 814 246, 820 170, 876 170', label: 'checks pass', lx: 825, ly: 186 },
                { id: 'e_wrap_no', from: 'p_wrapper', to: 'p_refuse', type: 'warn', d: 'M 772 278 C 814 278, 820 356, 876 356', label: 'stderr exit', lx: 825, ly: 342 },
            ],
            simSteps: [
                { badge: 'BOOT', tone: 'pass', desc: 'Boot manager starts paseo@user automatically; no-sleep rules keep workstation reachable after cold boot.', nodes: ['p_boot', 'p_sleep', 'p_daemon'], edges: ['e_boot_d', 'e_sleep_d'], groups: ['g_boot', 'g_paseo_core'] },
                { badge: 'SPAWN', tone: 'pass', desc: 'Paseo triggers the provider command—pointed at a shared wrapper rather than bare claude/codex.', nodes: ['p_daemon', 'p_wrapper'], edges: ['e_d_wrap'], groups: ['g_paseo_core'] },
                { badge: 'EXEC', tone: 'pass', desc: 'Caller is in ai-cli-users and all pre-launch.d checks pass; wrapper injects proxy.env and execs real agent.', nodes: ['p_wrapper', 'p_agent'], edges: ['e_wrap_ok'], groups: ['g_paseo_core', 'g_exec'] },
                { badge: 'REFUSE', tone: 'warn', desc: 'If any pre-launch check fails, wrapper refuses start and writes diagnostics only to stderr.', nodes: ['p_wrapper', 'p_refuse'], edges: ['e_wrap_no'], groups: ['g_paseo_core', 'g_exec'] },
            ],
        },

        compute: {
            id: 'compute',
            num: 'L3',
            label: 'GPU Loop',
            groups: [
                { id: 'g_ws_l3', x: 18, y: 50, w: 368, h: 422, tone: 'navy', title: 'Workstation', sub: 'Code, Git & small summaries' },
                { id: 'g_node_l3', x: 454, y: 50, w: 648, h: 422, tone: 'amber', title: 'GPU / compute node', sub: 'remote-compute skill discipline' },
            ],
            nodes: [
                {
                    id: 'c_pin', x: 202, y: 146, w: 288, h: 78, tone: 'navy', badge: 'Step 1',
                    title: 'Pin Code Commit', sub: 'git commit + push locally; clean node checkout',
                    section: '#compute',
                    summary: 'Every remote run starts from an explicit commit so logs match code reproducibly.',
                    details: [
                        'Checks CLAUDE.local.md for host alias, remote working dir, virtualenv, and scheduler.',
                        'If the node has uncommitted local changes, the agent stops and asks instead of overwriting them.',
                    ],
                },
                {
                    id: 'c_sub', x: 604, y: 146, w: 244, h: 78, tone: 'amber', badge: 'Step 2',
                    title: 'Submit Detached Job', sub: 'Slurm / systemd-run / tmux · logs/<id>',
                    section: '#compute',
                    summary: 'Launches training or eval in the background so closing your phone or SSH never interrupts compute.',
                    details: ['Line 1 of logs/<job-id>.log records the pinned Git commit hash for full traceability.'],
                },
                {
                    id: 'c_stat', x: 960, y: 146, w: 236, h: 78, tone: 'amber', badge: 'Step 3',
                    title: 'Phone-Sized Status', sub: 'State · key metrics · last 20 log lines',
                    section: '#compute',
                    summary: 'Formats progress concisely so it reads cleanly on a single mobile viewport.',
                    details: ['Returns job ID, commit, scheduler status, metric deltas, and tail of log without dumping noise.'],
                },
                {
                    id: 'c_guard', x: 616, y: 272, w: 288, h: 72, tone: 'warn', badge: 'Guardrail',
                    title: 'Stop Agent ≠ Cancel Job', sub: 'scancel / kill requires explicit ask',
                    section: '#compute',
                    summary: 'Pausing or stopping an agent session in Paseo leaves background scheduler jobs running cleanly.',
                    details: ['Cancelling an active Slurm or systemd-run workload is always a deliberate, confirmed step.'],
                },
                {
                    id: 'c_gate', x: 960, y: 394, w: 236, h: 80, tone: 'amber', badge: 'Step 4',
                    title: 'Size Gate (du -sh)', sub: 'Ask if > 50 MB · no rsync --delete',
                    section: '#compute',
                    summary: 'Prevents multi-GB weights, datasets, and full checkpoints from flooding workstation storage.',
                    details: [
                        'Aggregates CSVs and renders plots on the GPU node first before checking transfer size.',
                        'Any transfer over 50 MB triggers confirmation before copying.',
                    ],
                },
                {
                    id: 'c_sum', x: 202, y: 394, w: 288, h: 80, tone: 'success', badge: 'Step 5',
                    title: 'summary.md + Plots', sub: '~/results/<proj>/<id>/ · ≤1200px PNGs',
                    section: '#compute',
                    summary: 'Writes structured markdown tables + charts locally and replies in 3–5 lines for fast mobile steering.',
                    details: [
                        'Includes job ID, commit, runtime, metric comparison table, and crisp plots.',
                        'Lets you reply from the phone: "compare with last run" or "rerun with lr=1e-4".',
                    ],
                },
            ],
            edges: [
                { id: 'e_c12', from: 'c_pin', to: 'c_sub', type: 'ssh', d: 'M 346 146 H 480', label: 'SSH checkout', lx: 414, ly: 122 },
                { id: 'e_c23', from: 'c_sub', to: 'c_stat', type: 'local', d: 'M 726 146 H 840', label: 'monitor', lx: 783, ly: 122 },
                { id: 'e_c2g', from: 'c_sub', to: 'c_guard', type: 'warn', d: 'M 604 185 L 616 234', label: 'detached PID', lx: 562, ly: 210 },
                { id: 'e_c34', from: 'c_stat', to: 'c_gate', type: 'local', d: 'M 960 185 V 352', label: 'finish & aggregate', lx: 960, ly: 272 },
                { id: 'e_c45', from: 'c_gate', to: 'c_sum', type: 'return', d: 'M 842 394 H 348', label: 'rsync small results (≤ 50 MB)', lx: 598, ly: 374 },
                { id: 'e_c51', from: 'c_sum', to: 'c_pin', type: 'net', d: 'M 202 354 V 187', label: 'steer next run on phone', lx: 202, ly: 272 },
            ],
            simSteps: [
                { badge: 'STEP 1/5', tone: 'pass', desc: 'Pin code locally with git commit + push; read CLAUDE.local.md and verify node tree is clean.', nodes: ['c_pin'], edges: ['e_c12'], groups: ['g_ws_l3'] },
                { badge: 'STEP 2/5', tone: 'pass', desc: 'Submit detached Slurm / systemd-run / tmux job over SSH; record Git commit on line 1 of the job log.', nodes: ['c_sub', 'c_guard'], edges: ['e_c2g'], groups: ['g_node_l3'] },
                { badge: 'STEP 3/5', tone: 'pass', desc: 'Inspect scheduler state, latest metrics, and last 20 log lines cleanly from your phone screen.', nodes: ['c_stat'], edges: ['e_c23', 'e_c34'], groups: ['g_node_l3'] },
                { badge: 'STEP 4/5', tone: 'pass', desc: 'Aggregate on node, check du -sh size gate (ask if > 50 MB), and rsync without --delete.', nodes: ['c_gate', 'c_sum'], edges: ['e_c45'], groups: ['g_node_l3', 'g_ws_l3'] },
                { badge: 'STEP 5/5', tone: 'pass', desc: 'Review 3–5 line summary.md & 1200px plots in Paseo and reply from your phone to queue the next experiment.', nodes: ['c_sum', 'c_pin'], edges: ['e_c51'], groups: ['g_ws_l3'] },
            ],
        },

        team: {
            id: 'team',
            num: 'Team',
            label: 'Multi-User',
            groups: [
                { id: 'g_shared', x: 18, y: 30, w: 1084, h: 126, tone: 'slate', title: 'Shared host layer', sub: 'Maintained by root · CPU, RAM, disk & proxy shared' },
                { id: 'g_alice', x: 18, y: 214, w: 458, h: 274, tone: 'navy', title: 'Member A · alice', sub: 'UID alice · isolated home' },
                { id: 'g_bob', x: 644, y: 214, w: 458, h: 274, tone: 'teal', title: 'Member B · bob', sub: 'UID bob · isolated home' },
            ],
            nodes: [
                {
                    id: 't_bins', x: 298, y: 104, w: 500, h: 70, tone: 'slate', badge: 'Read-only',
                    title: 'Node · Paseo · Claude Code · Codex', sub: 'Single root install + shared /etc/paseo-workstation/ wrappers',
                    section: '#team',
                    summary: 'One clean binary and policy installation shared by every team or family member on the host.',
                    details: ['Avoids duplicating Node toolchains or wrapper policies across user home directories.'],
                },
                {
                    id: 't_trust', x: 836, y: 104, w: 472, h: 70, tone: 'muted', badge: 'Trusted team',
                    title: 'Unix UID & Permission Boundary', sub: 'Trusted co-users (not hostile-tenant container/VM isolation)',
                    section: '#team',
                    summary: 'Designed for family members or small trusted engineering teams sharing one always-on machine.',
                    details: ['Root, sudo admins, and Windows host administrators remain inside the trust boundary.'],
                },
                {
                    id: 't_alice_p', x: 247, y: 292, w: 416, h: 72, tone: 'navy', badge: ':6767',
                    title: 'paseo@alice', sub: 'Own Tailscale grant + client.env password (0600)',
                    section: '#team',
                    summary: 'Dedicated systemd unit / LaunchDaemon listening exclusively on Alice\'s assigned port.',
                    details: ['Runs as Alice\'s real UID; created with sudo paseo-user add alice 6767.'],
                },
                {
                    id: 't_alice_h', x: 247, y: 418, w: 416, h: 72, tone: 'success', badge: 'chmod 700',
                    title: '/home/alice · Private State', sub: 'Own ~/projects, SSH keys & Claude/Codex login',
                    section: '#team',
                    summary: 'Private directories with mode 700 and credential files mode 600; separate model quota & billing.',
                    details: ['Each person signs into Claude Code and Codex independently so OAuth refreshes never collide.'],
                },
                {
                    id: 't_barrier', x: 560, y: 356, w: 138, h: 86, tone: 'warn', badge: 'Boundary',
                    title: 'Isolated UID', sub: 'umask 077 + Tailscale grants',
                    section: '#team',
                    summary: 'Cross-member sessions, transcripts, projects, and model tokens stay unreadable across accounts.',
                    details: ['No shared API keys or copied credentials; optionally add cgroup CPU/memory limits per user.'],
                },
                {
                    id: 't_bob_p', x: 873, y: 292, w: 416, h: 72, tone: 'teal', badge: ':6768',
                    title: 'paseo@bob', sub: 'Own Tailscale grant + client.env password (0600)',
                    section: '#team',
                    summary: 'Dedicated systemd unit / LaunchDaemon listening exclusively on Bob\'s assigned port.',
                    details: ['Created in one command via sudo paseo-user add bob 6768.'],
                },
                {
                    id: 't_bob_h', x: 873, y: 418, w: 416, h: 72, tone: 'success', badge: 'chmod 700',
                    title: '/home/bob · Private State', sub: 'Own ~/projects, SSH keys & Claude/Codex login',
                    section: '#team',
                    summary: 'Private directories with mode 700 and separate model login credentials.',
                    details: ['Keeps quotas, SSH keys, and project histories cleanly separated.'],
                },
            ],
            edges: [
                { id: 'e_t_ba', from: 't_bins', to: 't_alice_p', type: 'local', d: 'M 247 139 V 254', label: 'shared wrapper', lx: 247, ly: 185 },
                { id: 'e_t_bb', from: 't_bins', to: 't_bob_p', type: 'local', d: 'M 380 139 C 380 185, 873 185, 873 254', label: 'shared wrapper', lx: 640, ly: 185 },
                { id: 'e_t_ah', from: 't_alice_p', to: 't_alice_h', type: 'ssh', d: 'M 247 328 V 380', label: 'runs as alice', lx: 247, ly: 354 },
                { id: 'e_t_bh', from: 't_bob_p', to: 't_bob_h', type: 'net', d: 'M 873 328 V 380', label: 'runs as bob', lx: 873, ly: 354 },
                { id: 'e_t_bar_a', from: 't_barrier', to: 't_alice_p', type: 'warn', d: 'M 491 336 L 455 308', label: '', lx: 472, ly: 322 },
                { id: 'e_t_bar_b', from: 't_barrier', to: 't_bob_p', type: 'warn', d: 'M 629 336 L 665 308', label: '', lx: 648, ly: 322 },
            ],
            simSteps: [
                { badge: 'SHARED', tone: 'pass', desc: 'Root maintains one read-only install of Node, Paseo, Claude Code, Codex, and /etc/paseo-workstation/.', nodes: ['t_bins', 't_trust'], edges: ['e_t_ba', 'e_t_bb'], groups: ['g_shared'] },
                { badge: 'ALICE', tone: 'pass', desc: 'paseo@alice serves on :6767 as Alice\'s UID with private /home/alice (700) and her own AI subscription.', nodes: ['t_alice_p', 't_alice_h'], edges: ['e_t_ah'], groups: ['g_alice'] },
                { badge: 'BOB', tone: 'pass', desc: 'paseo@bob serves on :6768 as Bob\'s UID with independent credentials and workspace.', nodes: ['t_bob_p', 't_bob_h'], edges: ['e_t_bh'], groups: ['g_bob'] },
                { badge: 'BOUNDARY', tone: 'warn', desc: 'UID isolation, umask 077, 0600 client.env, and Tailscale grants prevent cross-user access.', nodes: ['t_barrier', 't_alice_p', 't_bob_p'], edges: ['e_t_bar_a', 'e_t_bar_b'], groups: ['g_alice', 'g_bob'] },
            ],
        },
    };

    const escapeHtml = (str) => String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const el = (tag, cls, attrs = {}) => {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        for (const [k, v] of Object.entries(attrs)) {
            if (v !== undefined && v !== null) node.setAttribute(k, String(v));
        }
        return node;
    };

    const svgEl = (tag, attrs = {}) => {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (v !== undefined && v !== null) node.setAttribute(k, String(v));
        }
        return node;
    };

    function mountExplorer(root) {
        const state = {
            viewId: 'overview',
            focus: 'all',
            selected: null,
            inspectorOpen: false,
            expanded: false,
            simActive: false,
            simPlaying: false,
            simIdx: -1,
            zoom: 1,
            panX: 0,
            panY: 0,
            isVisible: true,
        };

        let simTimer = null;
        let rafId = null;
        let prevBodyOverflow = '';

        const shell = el('div', 'pk-shell');
        const frame = el('div', 'pk-frame');
        shell.appendChild(frame);

        // Header
        const header = el('div', 'pk-header');
        const nav = el('div', 'pk-nav', { role: 'tablist', 'aria-label': 'Architecture layers' });
        const navBtns = {};
        for (const v of Object.values(VIEWS)) {
            const b = el('button', 'pk-pill' + (v.id === state.viewId ? ' is-active' : ''), {
                type: 'button',
                role: 'tab',
                'aria-selected': v.id === state.viewId ? 'true' : 'false',
                'data-view': v.id,
            });
            b.innerHTML = `<span class="pk-pill-num">${escapeHtml(v.num)}</span><span>${escapeHtml(v.label)}</span>`;
            b.addEventListener('click', () => switchView(v.id));
            nav.appendChild(b);
            navBtns[v.id] = b;
        }

        const actions = el('div', 'pk-actions');
        const btnSim = el('button', 'pk-btn pk-btn-primary', { type: 'button', title: 'Step through how requests and results move across this layer' });
        btnSim.textContent = '▶ Walk through';
        const btnIns = el('button', 'pk-btn', { type: 'button', title: 'Inspect details for selected block or link' });
        btnIns.textContent = 'Inspector';
        const btnExpand = el('button', 'pk-btn', { type: 'button', title: 'Expand interactive diagram' });
        btnExpand.textContent = '⤢ Expand';
        actions.append(btnSim, btnIns, btnExpand);
        header.append(nav, actions);
        frame.appendChild(header);

        // Workspace
        const workspace = el('div', 'pk-workspace');
        const canvasFrame = el('div', 'pk-canvas-frame');

        // L1 Route Filter Bar
        const focusBar = el('div', 'pk-focus-bar');
        focusBar.innerHTML = '<div class="pk-focus-title"><span>Route filter</span></div>';
        const focusPillsWrap = el('div', 'pk-focus-pills');
        const focusChoices = [
            ['all', 'All routes'],
            ['native', 'Linux / macOS'],
            ['wsl2', 'Windows WSL2'],
            ['vpn', 'Company VPN'],
        ];
        const focusBtns = {};
        for (const [key, label] of focusChoices) {
            const fp = el('button', 'pk-focus-pill' + (key === 'all' ? ' is-active' : ''), {
                type: 'button',
                'data-focus': key,
            });
            fp.textContent = label;
            fp.addEventListener('click', () => {
                stopSim();
                state.focus = key;
                renderGraph();
            });
            focusPillsWrap.appendChild(fp);
            focusBtns[key] = fp;
        }
        focusBar.appendChild(focusPillsWrap);
        canvasFrame.appendChild(focusBar);

        // Simulation HUD
        const simHud = el('div', 'pk-sim-hud');
        const simBadge = el('span', 'pk-sim-badge');
        const simDesc = el('span', 'pk-sim-desc');
        const simControls = el('div', 'pk-sim-controls');
        const simDots = el('div', 'pk-sim-dots');
        const btnSimNext = el('button', 'pk-btn', { type: 'button' });
        btnSimNext.textContent = 'Next';
        const btnSimPause = el('button', 'pk-btn', { type: 'button' });
        btnSimPause.textContent = 'Pause';
        const btnSimExit = el('button', 'pk-btn', { type: 'button' });
        btnSimExit.textContent = 'Exit';
        simControls.append(simDots, btnSimNext, btnSimPause, btnSimExit);
        simHud.append(simBadge, simDesc, simControls);
        canvasFrame.appendChild(simHud);

        // Viewport + World
        const viewport = el('div', 'pk-viewport');
        const world = el('div', 'pk-world');
        const groupsLayer = el('div', 'pk-groups-layer');
        const edgesSvg = svgEl('svg', { class: 'pk-edges-svg', viewBox: `0 0 ${WORLD_W} ${WORLD_H}` });
        const defs = svgEl('defs');
        for (const [id, color] of [
            ['pk-arr-net', '#0f766e'],
            ['pk-arr-local', '#475569'],
            ['pk-arr-ssh', '#1f4e79'],
            ['pk-arr-return', '#b45309'],
            ['pk-arr-warn', '#b43c3c'],
        ]) {
            const m = svgEl('marker', {
                id,
                viewBox: '0 0 10 10',
                refX: '8.5',
                refY: '5',
                markerWidth: '6.5',
                markerHeight: '6.5',
                orient: 'auto-start-reverse',
            });
            m.appendChild(svgEl('path', { d: 'M 1 1.5 L 9 5 L 1 8.5 z', fill: color }));
            defs.appendChild(m);
        }
        const edgesGroup = svgEl('g');
        const packetsGroup = svgEl('g');
        edgesSvg.append(defs, edgesGroup, packetsGroup);

        const nodesLayer = el('div', 'pk-nodes-layer');
        const edgeLabelsLayer = el('div', 'pk-edge-labels-layer');
        world.append(groupsLayer, edgesSvg, nodesLayer, edgeLabelsLayer);
        viewport.appendChild(world);

        // Zoom floating bar
        const zoomWrap = el('div', 'pk-zoom');
        const btnZoomOut = el('button', 'pk-zoom-btn', { type: 'button', title: 'Zoom out', 'aria-label': 'Zoom out' });
        btnZoomOut.textContent = '−';
        const zoomLabel = el('span', 'pk-zoom-label');
        zoomLabel.textContent = '100%';
        const btnZoomIn = el('button', 'pk-zoom-btn', { type: 'button', title: 'Zoom in', 'aria-label': 'Zoom in' });
        btnZoomIn.textContent = '+';
        const btnZoomFit = el('button', 'pk-zoom-btn', { type: 'button', title: 'Reset zoom and fit canvas' });
        btnZoomFit.textContent = 'Fit';
        zoomWrap.append(btnZoomOut, zoomLabel, btnZoomIn, btnZoomFit);
        viewport.appendChild(zoomWrap);
        canvasFrame.appendChild(viewport);

        // Legend bar
        const legend = el('div', 'pk-legend');
        const legendItems = [
            ['net', '6 4', 'Private network (Tailscale / VPN)'],
            ['local', '2 5', 'Workstation / local check'],
            ['ssh', '7 4', 'SSH job / wrapper exec'],
            ['return', '7 4', 'Small results returned (≤ 50 MB)'],
        ];
        for (const [kind, dash, text] of legendItems) {
            const item = el('div', 'pk-legend-item');
            const sw = svgEl('svg', { class: `pk-legend-line type-${kind}`, viewBox: '0 0 28 6', 'aria-hidden': 'true' });
            sw.appendChild(svgEl('line', {
                x1: '1', y1: '3', x2: '27', y2: '3',
                'stroke-width': '2', 'stroke-dasharray': dash, 'stroke-linecap': 'round',
            }));
            const lbl = el('span');
            lbl.textContent = text;
            item.append(sw, lbl);
            legend.appendChild(item);
        }
        canvasFrame.appendChild(legend);

        // Inspector Drawer
        const inspector = el('aside', 'pk-inspector', { 'aria-label': 'Details inspector' });
        workspace.append(canvasFrame, inspector);
        frame.appendChild(workspace);

        // Bottom Metric Cards
        const metricsGrid = el('section', 'pk-metrics', { 'aria-label': 'Architecture layer shortcuts' });
        const metricBtns = [];
        for (const m of METRIC_CARDS) {
            const card = el('button', 'pk-metric-card' + (m.view === state.viewId ? ' is-active-view' : ''), {
                type: 'button',
                'data-view-jump': m.view,
            });
            card.innerHTML =
                `<div class="pk-metric-top"><span class="pk-metric-label">${escapeHtml(m.label)}</span>` +
                `<span class="pk-metric-tag">${escapeHtml(m.tag)}</span></div>` +
                `<div class="pk-metric-body">${escapeHtml(m.body)}</div>`;
            card.addEventListener('click', () => {
                switchView(m.view);
                viewport.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
            metricsGrid.appendChild(card);
            metricBtns.push(card);
        }
        frame.appendChild(metricsGrid);

        root.textContent = '';
        root.appendChild(shell);

        let activePacketPaths = [];

        function updateTransform() {
            world.style.transform = `translate(${state.panX.toFixed(1)}px, ${state.panY.toFixed(1)}px) scale(${state.zoom.toFixed(4)})`;
            zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
        }

        function fitCanvas() {
            const vw = viewport.clientWidth;
            const vh = viewport.clientHeight;
            if (!vw || !vh) return;
            const pad = 16;
            const scale = Math.min((vw - pad) / WORLD_W, (vh - pad) / WORLD_H);
            state.zoom = Math.max(0.24, Math.min(1.4, scale));
            state.panX = (vw - WORLD_W * state.zoom) / 2;
            state.panY = (vh - WORLD_H * state.zoom) / 2;
            updateTransform();
        }

        function getHighlightState() {
            const view = VIEWS[state.viewId];
            if (state.simActive && state.simIdx >= 0 && view.simSteps[state.simIdx]) {
                const step = view.simSteps[state.simIdx];
                return {
                    active: true,
                    tone: step.tone === 'warn' ? 'warn' : 'pass',
                    nodes: new Set(step.nodes || []),
                    edges: new Set(step.edges || []),
                    groups: new Set(step.groups || []),
                };
            }
            if (state.viewId === 'network' && state.focus !== 'all' && FOCUS_PRESETS[state.focus]) {
                const fp = FOCUS_PRESETS[state.focus];
                return {
                    active: true,
                    tone: 'pass',
                    nodes: new Set(fp.nodes),
                    edges: new Set(fp.edges),
                    groups: new Set(fp.groups),
                };
            }
            return { active: false, nodes: new Set(), edges: new Set(), groups: new Set() };
        }

        function renderGraph() {
            const view = VIEWS[state.viewId];
            const hl = getHighlightState();

            focusBar.classList.toggle('is-visible', Boolean(view.hasFocusBar));
            for (const [k, btn] of Object.entries(focusBtns)) {
                btn.classList.toggle('is-active', state.focus === k);
            }

            // Groups
            groupsLayer.textContent = '';
            for (const g of view.groups) {
                const div = el('div', `pk-group tone-${g.tone}` + (g.dashed ? ' is-dashed' : ''));
                div.style.left = `${g.x}px`;
                div.style.top = `${g.y}px`;
                div.style.width = `${g.w}px`;
                div.style.height = `${g.h}px`;
                if (hl.active) {
                    div.classList.add(hl.groups.has(g.id) ? 'sim-active' : 'sim-dim');
                }
                const head = el('div', 'pk-group-head');
                const t = el('span', 'pk-group-title');
                t.textContent = g.title;
                head.appendChild(t);
                if (g.sub) {
                    const s = el('span', 'pk-group-sub');
                    s.textContent = g.sub;
                    head.appendChild(s);
                }
                div.appendChild(head);
                groupsLayer.appendChild(div);
            }

            // Edges & Labels
            edgesGroup.textContent = '';
            packetsGroup.textContent = '';
            edgeLabelsLayer.textContent = '';
            activePacketPaths = [];

            const markerMap = {
                net: 'url(#pk-arr-net)',
                local: 'url(#pk-arr-local)',
                ssh: 'url(#pk-arr-ssh)',
                return: 'url(#pk-arr-return)',
                warn: 'url(#pk-arr-warn)',
            };
            const packetColors = {
                net: '#0f766e',
                local: '#475569',
                ssh: '#1f4e79',
                return: '#b45309',
                warn: '#b43c3c',
            };

            for (const edge of view.edges) {
                const isSelected = state.selected?.kind === 'edge' && state.selected.id === edge.id;
                const isEdgeActive = hl.active && hl.edges.has(edge.id);
                const isDim = hl.active && !isEdgeActive;

                const pathAttrs = {
                    class: `pk-edge-path type-${edge.type}` + (isSelected ? ' is-selected' : '') + (isEdgeActive ? ' sim-active' : '') + (isDim ? ' sim-dim' : ''),
                    d: edge.d,
                    'marker-end': markerMap[edge.type] || 'url(#pk-arr-local)',
                };
                if (edge.bidir) pathAttrs['marker-start'] = markerMap[edge.type] || 'url(#pk-arr-net)';
                const pathEl = svgEl('path', pathAttrs);

                const hitEl = svgEl('path', { class: 'pk-edge-hit', d: edge.d });
                hitEl.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    selectItem('edge', edge.id);
                });
                edgesGroup.append(pathEl, hitEl);

                if (edge.label) {
                    const pill = el('button', `pk-edge-pill type-${edge.type}` + (isSelected ? ' is-selected' : '') + (isEdgeActive ? ' sim-active' : '') + (isDim ? ' sim-dim' : ''), {
                        type: 'button',
                    });
                    pill.style.left = `${edge.lx}px`;
                    pill.style.top = `${edge.ly}px`;
                    pill.textContent = edge.label;
                    pill.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        selectItem('edge', edge.id);
                    });
                    edgeLabelsLayer.appendChild(pill);
                }

                if (!REDUCED_MOTION && (!hl.active || isEdgeActive)) {
                    const dot = svgEl('circle', {
                        class: `pk-packet type-${edge.type}`,
                        r: isEdgeActive ? '4.5' : '3.4',
                        opacity: isEdgeActive ? '0.96' : '0.82',
                    });
                    packetsGroup.appendChild(dot);
                    activePacketPaths.push({ path: pathEl, dot, speed: isEdgeActive ? 0.34 : 0.22, offset: Math.random() });
                }
            }

            // Nodes
            nodesLayer.textContent = '';
            for (const n of view.nodes) {
                const isSelected = state.selected?.kind === 'node' && state.selected.id === n.id;
                const isNodeActive = hl.active && hl.nodes.has(n.id);
                const isDim = hl.active && !isNodeActive;

                const box = el('button', `pk-node tone-${n.tone}` + (n.icon ? ' has-icon' : '') + (isSelected ? ' is-selected' : ''), {
                    type: 'button',
                    'aria-label': `${n.title}: ${n.sub}`,
                });
                box.style.left = `${n.x}px`;
                box.style.top = `${n.y}px`;
                box.style.width = `${n.w}px`;
                box.style.height = `${n.h}px`;

                if (isNodeActive && state.simActive) {
                    box.classList.add(n.tone === 'warn' || hl.tone === 'warn' ? 'sim-warn' : 'sim-current');
                } else if (isDim) {
                    box.classList.add('sim-dim');
                }

                if (n.badge) {
                    const badge = el('span', 'pk-node-badge');
                    badge.textContent = n.badge;
                    box.appendChild(badge);
                }
                if (n.icon && ICONS[n.icon]) {
                    const iconWrap = el('span');
                    iconWrap.innerHTML = ICONS[n.icon];
                    box.appendChild(iconWrap.firstChild);
                }
                const textWrap = el('div', 'pk-node-text');
                const titleEl = el('div', 'pk-node-title' + (n.monoTitle ? ' is-mono' : ''));
                titleEl.textContent = n.title;
                const subEl = el('div', 'pk-node-sub');
                subEl.textContent = n.sub;
                textWrap.append(titleEl, subEl);
                box.appendChild(textWrap);

                box.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    selectItem('node', n.id);
                });
                nodesLayer.appendChild(box);
            }

            renderSimHud();
            renderInspector();
        }

        function renderSimHud() {
            const view = VIEWS[state.viewId];
            simHud.classList.toggle('is-visible', state.simActive);
            btnSim.classList.toggle('is-active', state.simActive);
            if (!state.simActive) return;

            const steps = view.simSteps || [];
            const cur = steps[state.simIdx] || steps[0];
            if (!cur) return;

            simBadge.textContent = cur.badge;
            simBadge.className = 'pk-sim-badge ' + (cur.tone === 'warn' ? 'is-warn' : 'is-pass');
            simDesc.textContent = cur.desc;
            btnSimPause.textContent = state.simPlaying ? 'Pause' : 'Resume';

            simDots.textContent = '';
            steps.forEach((st, idx) => {
                const d = el('button', 'pk-sim-dot' +
                    (idx < state.simIdx ? ' is-done' : '') +
                    (idx === state.simIdx ? ' is-current' : '') +
                    (st.tone === 'warn' ? ' is-warn' : ''), {
                    type: 'button',
                    title: st.badge,
                    'aria-label': st.badge,
                });
                d.textContent = String(idx + 1);
                d.addEventListener('click', () => {
                    pauseSim();
                    state.simIdx = idx;
                    renderGraph();
                });
                simDots.appendChild(d);
            });
        }

        function renderInspector() {
            inspector.classList.toggle('is-open', state.inspectorOpen);
            btnIns.classList.toggle('is-active', state.inspectorOpen);
            if (!state.inspectorOpen) return;

            const view = VIEWS[state.viewId];
            let item = null;
            if (state.selected?.kind === 'node') {
                item = view.nodes.find((n) => n.id === state.selected.id);
            } else if (state.selected?.kind === 'edge') {
                item = view.edges.find((e) => e.id === state.selected.id);
            }

            inspector.textContent = '';
            const head = el('div', 'pk-ins-head');
            const titleWrap = el('div', 'pk-ins-title-wrap');
            const h = el('h4', 'pk-ins-title');
            const badge = el('span', 'pk-ins-badge');
            const closeBtn = el('button', 'pk-ins-close', { type: 'button', 'aria-label': 'Close inspector' });
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', () => {
                state.inspectorOpen = false;
                renderInspector();
            });

            if (!item) {
                h.textContent = `${view.num}: ${view.label}`;
                badge.textContent = 'Overview';
                titleWrap.append(h, badge);
                head.append(titleWrap, closeBtn);
                const p = el('p', 'pk-ins-summary');
                p.textContent = 'Click any node card or connector pill in the diagram to see how traffic, Unix permissions, wrappers, and remote jobs work—or start the guided walkthrough.';
                inspector.append(head, p);
                return;
            }

            h.textContent = item.title || item.label || item.id;
            badge.textContent = item.badge || (state.selected.kind === 'edge' ? 'Flow' : 'Component');
            titleWrap.append(h, badge);
            head.append(titleWrap, closeBtn);
            inspector.appendChild(head);

            if (item.summary) {
                const p = el('p', 'pk-ins-summary');
                p.textContent = item.summary;
                inspector.appendChild(p);
            }
            if (Array.isArray(item.details) && item.details.length) {
                const ul = el('ul', 'pk-ins-list');
                for (const d of item.details) {
                    const li = el('li');
                    li.textContent = d;
                    ul.appendChild(li);
                }
                inspector.appendChild(ul);
            }
            if (item.cmd) {
                const wrap = el('div', 'pk-cmd-wrap');
                const pre = el('pre', 'pk-cmd');
                const code = el('code');
                code.textContent = item.cmd;
                pre.appendChild(code);
                const cp = el('button', 'pk-cmd-copy', { type: 'button' });
                cp.textContent = 'Copy';
                cp.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(item.cmd);
                        cp.textContent = 'Copied';
                        cp.classList.add('is-copied');
                        window.setTimeout(() => {
                            cp.textContent = 'Copy';
                            cp.classList.remove('is-copied');
                        }, 1400);
                    } catch (_) { /* clipboard unavailable */ }
                });
                wrap.append(pre, cp);
                inspector.appendChild(wrap);
            }
            if (item.section) {
                const foot = el('div', 'pk-ins-foot');
                const link = el('a', 'pk-jump-link', { href: item.section });
                link.textContent = 'Jump to section in post ↓';
                link.addEventListener('click', () => {
                    if (state.expanded) setExpanded(false);
                });
                foot.appendChild(link);
                inspector.appendChild(foot);
            }
        }

        function selectItem(kind, id) {
            state.selected = { kind, id };
            state.inspectorOpen = true;
            renderGraph();
        }

        function switchView(viewId) {
            if (!VIEWS[viewId]) return;
            stopSim();
            state.viewId = viewId;
            state.selected = null;
            if (viewId !== 'network') state.focus = 'all';
            for (const [id, b] of Object.entries(navBtns)) {
                const active = id === viewId;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-selected', active ? 'true' : 'false');
            }
            for (const m of metricBtns) {
                m.classList.toggle('is-active-view', m.dataset.viewJump === viewId);
            }
            renderGraph();
            window.requestAnimationFrame(fitCanvas);
        }

        function scheduleSimTick() {
            window.clearTimeout(simTimer);
            if (!state.simPlaying) return;
            simTimer = window.setTimeout(() => {
                const steps = VIEWS[state.viewId].simSteps || [];
                if (!steps.length) return;
                state.simIdx = (state.simIdx + 1) % steps.length;
                renderGraph();
                scheduleSimTick();
            }, 2600);
        }

        function startSim() {
            state.simActive = true;
            state.simPlaying = true;
            state.simIdx = 0;
            renderGraph();
            scheduleSimTick();
        }

        function pauseSim() {
            state.simPlaying = false;
            window.clearTimeout(simTimer);
            renderSimHud();
        }

        function stopSim() {
            state.simActive = false;
            state.simPlaying = false;
            state.simIdx = -1;
            window.clearTimeout(simTimer);
            renderGraph();
        }

        function setExpanded(next) {
            if (state.expanded === next) return;
            state.expanded = next;
            shell.classList.toggle('is-expanded', next);
            btnExpand.textContent = next ? '✕ Close' : '⤢ Expand';
            if (next) {
                prevBodyOverflow = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = prevBodyOverflow;
            }
            window.requestAnimationFrame(() => {
                fitCanvas();
                renderInspector();
            });
        }

        // Actions wiring
        btnSim.addEventListener('click', () => {
            if (state.simActive) stopSim();
            else startSim();
        });
        btnSimNext.addEventListener('click', () => {
            pauseSim();
            const steps = VIEWS[state.viewId].simSteps || [];
            if (!steps.length) return;
            state.simIdx = (state.simIdx + 1) % steps.length;
            renderGraph();
        });
        btnSimPause.addEventListener('click', () => {
            if (state.simPlaying) pauseSim();
            else {
                state.simPlaying = true;
                renderSimHud();
                scheduleSimTick();
            }
        });
        btnSimExit.addEventListener('click', stopSim);

        btnIns.addEventListener('click', () => {
            state.inspectorOpen = !state.inspectorOpen;
            renderInspector();
        });
        btnExpand.addEventListener('click', () => setExpanded(!state.expanded));

        shell.addEventListener('click', (ev) => {
            if (state.expanded && ev.target === shell) setExpanded(false);
        });
        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape' && state.expanded) setExpanded(false);
        });

        // Pan / Zoom controls
        btnZoomIn.addEventListener('click', () => {
            const cx = viewport.clientWidth / 2;
            const cy = viewport.clientHeight / 2;
            const next = Math.min(2.0, state.zoom * 1.15);
            const factor = next / state.zoom;
            state.panX = cx - (cx - state.panX) * factor;
            state.panY = cy - (cy - state.panY) * factor;
            state.zoom = next;
            updateTransform();
        });
        btnZoomOut.addEventListener('click', () => {
            const cx = viewport.clientWidth / 2;
            const cy = viewport.clientHeight / 2;
            const next = Math.max(0.24, state.zoom / 1.15);
            const factor = next / state.zoom;
            state.panX = cx - (cx - state.panX) * factor;
            state.panY = cy - (cy - state.panY) * factor;
            state.zoom = next;
            updateTransform();
        });
        btnZoomFit.addEventListener('click', fitCanvas);

        viewport.addEventListener('wheel', (ev) => {
            if (!ev.ctrlKey && !ev.metaKey) return;
            ev.preventDefault();
            const rect = viewport.getBoundingClientRect();
            const px = ev.clientX - rect.left;
            const py = ev.clientY - rect.top;
            const step = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
            const next = Math.max(0.24, Math.min(2.0, state.zoom * step));
            const factor = next / state.zoom;
            state.panX = px - (px - state.panX) * factor;
            state.panY = py - (py - state.panY) * factor;
            state.zoom = next;
            updateTransform();
        }, { passive: false });

        let dragStart = null;
        viewport.addEventListener('pointerdown', (ev) => {
            if (ev.target.closest('button, a, .pk-edge-pill, .pk-zoom')) return;
            dragStart = { x: ev.clientX, y: ev.clientY, px: state.panX, py: state.panY };
            viewport.classList.add('is-panning');
            viewport.setPointerCapture(ev.pointerId);
        });
        viewport.addEventListener('pointermove', (ev) => {
            if (!dragStart) return;
            state.panX = dragStart.px + (ev.clientX - dragStart.x);
            state.panY = dragStart.py + (ev.clientY - dragStart.y);
            updateTransform();
        });
        const endDrag = () => {
            if (!dragStart) return;
            dragStart = null;
            viewport.classList.remove('is-panning');
        };
        viewport.addEventListener('pointerup', endDrag);
        viewport.addEventListener('pointercancel', endDrag);

        // Animate packets cleanly along active paths while visible
        let lastTs = 0;
        function animatePackets(ts) {
            const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
            lastTs = ts;
            if (state.isVisible && !REDUCED_MOTION) {
                for (const item of activePacketPaths) {
                    const total = item.path.getTotalLength();
                    if (!total) continue;
                    item.offset = (item.offset + item.speed * dt) % 1;
                    const pt = item.path.getPointAtLength(item.offset * total);
                    item.dot.setAttribute('cx', pt.x.toFixed(1));
                    item.dot.setAttribute('cy', pt.y.toFixed(1));
                }
            }
            rafId = window.requestAnimationFrame(animatePackets);
        }

        if (typeof ResizeObserver === 'function') {
            const ro = new ResizeObserver(() => fitCanvas());
            ro.observe(viewport);
        } else {
            window.addEventListener('resize', fitCanvas, { passive: true });
        }

        if (typeof IntersectionObserver === 'function') {
            const io = new IntersectionObserver((entries) => {
                state.isVisible = entries[0] ? entries[0].isIntersecting : true;
            }, { threshold: 0.05 });
            io.observe(viewport);
        }

        renderGraph();
        fitCanvas();
        if (!REDUCED_MOTION) {
            rafId = window.requestAnimationFrame(animatePackets);
        }
        window.addEventListener('unload', () => {
            if (rafId) window.cancelAnimationFrame(rafId);
        }, { once: true });
    }

    const mountAll = () => {
        for (const root of document.querySelectorAll('[data-pk-arch]')) {
            mountExplorer(root);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountAll, { once: true });
    } else {
        mountAll();
    }
})();
