<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mo' Digital Events — Smarter Event Check-Ins</title>
    <meta name="description" content="Mo' Digital Events is a professional event management and card scanning platform. Manage guests, scan cards, and track admissions in real time.">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --red:      #EF4444;
            --red-dark: #B91C1C;
            --navy:     #1E293B;
            --navy-deep:#0F172A;
            --teal:     #14B8A6;
            --gold:     #F59E0B;
            --surface:  #F8FAFC;
            --border:   #E2E8F0;
        }

        html { scroll-behavior: smooth; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: var(--navy);
            background: #fff;
            line-height: 1.65;
        }

        /* ─── Navbar ─── */
        .navbar {
            position: sticky; top: 0; z-index: 100;
            background: rgba(255,255,255,0.96);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid var(--border);
            padding: 0 2rem;
            display: flex; align-items: center; justify-content: space-between;
            height: 68px;
        }
        .nav-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--navy); }
        .nav-logo-badge {
            width: 42px; height: 42px; background: var(--red); border-radius: 11px;
            display: grid; place-items: center;
            font-weight: 900; font-size: 15px; color: #fff;
            box-shadow: 0 4px 14px rgba(239,68,68,.36);
        }
        .nav-logo-text strong { display: block; font-weight: 900; font-size: 16px; line-height: 1.15; }
        .nav-logo-text small  { font-size: 12px; color: #94A3B8; font-weight: 600; }
        .nav-links { display: flex; gap: 4px; align-items: center; }
        .nav-links a {
            padding: 8px 14px; border-radius: 8px; text-decoration: none;
            font-size: 14px; font-weight: 700; color: #475569;
            transition: background .15s, color .15s;
        }
        .nav-links a:hover { background: var(--surface); color: var(--navy); }
        .nav-cta {
            background: var(--red); color: #fff; border: none; border-radius: 9px;
            padding: 10px 22px; font-size: 14px; font-weight: 900; text-decoration: none;
            box-shadow: 0 4px 14px rgba(239,68,68,.32);
            transition: background .15s, transform .1s;
        }
        .nav-cta:hover { background: var(--red-dark); transform: translateY(-1px); }

        /* ─── Container ─── */
        .container { max-width: 1120px; margin: 0 auto; padding: 0 1.5rem; }

        /* ─── Hero ─── */
        .hero {
            background: linear-gradient(145deg, var(--navy-deep) 0%, #1a2d4a 55%, #0c1829 100%);
            color: #fff; padding: 108px 2rem 96px;
            text-align: center; position: relative; overflow: hidden;
        }
        .hero::before {
            content: ''; position: absolute; inset: 0;
            background:
                radial-gradient(ellipse 70% 60% at 65% 40%, rgba(239,68,68,.16) 0%, transparent 65%),
                radial-gradient(ellipse 50% 40% at 20% 70%, rgba(20,184,166,.10) 0%, transparent 60%);
        }
        .hero-inner { position: relative; z-index: 1; }
        .hero-badge {
            display: inline-flex; align-items: center; gap: 7px;
            background: rgba(239,68,68,.18); border: 1px solid rgba(239,68,68,.32); color: #FCA5A5;
            font-size: 12px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase;
            padding: 6px 16px; border-radius: 999px; margin-bottom: 28px;
        }
        .hero h1 {
            font-size: clamp(2.5rem, 6.5vw, 4.4rem);
            font-weight: 900; line-height: 1.08; letter-spacing: -.03em;
            max-width: 820px; margin: 0 auto 22px;
        }
        .hero h1 em { font-style: normal; color: var(--red); }
        .hero-sub {
            font-size: clamp(1rem, 2.4vw, 1.18rem); color: rgba(255,255,255,.66);
            max-width: 580px; margin: 0 auto 40px; font-weight: 500; line-height: 1.7;
        }
        .hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-bottom: 68px; }
        .btn-red {
            background: var(--red); color: #fff; border: none; border-radius: 11px;
            padding: 15px 30px; font-size: 15px; font-weight: 900; text-decoration: none;
            box-shadow: 0 8px 26px rgba(239,68,68,.42); transition: background .15s, transform .1s;
            display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-red:hover { background: var(--red-dark); transform: translateY(-2px); }
        .btn-ghost {
            background: rgba(255,255,255,.08); color: rgba(255,255,255,.82);
            border: 1.5px solid rgba(255,255,255,.2); border-radius: 11px;
            padding: 15px 30px; font-size: 15px; font-weight: 700; text-decoration: none;
            display: inline-flex; align-items: center; gap: 8px;
            transition: border-color .15s, background .15s;
        }
        .btn-ghost:hover { border-color: rgba(255,255,255,.5); background: rgba(255,255,255,.12); }

        /* Dashboard mockup */
        .hero-mockup {
            background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.13);
            border-radius: 18px; padding: 24px 20px 20px; max-width: 760px; margin: 0 auto;
        }
        .mockup-bar {
            display: flex; align-items: center; gap: 6px;
            margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .mockup-dot { width: 10px; height: 10px; border-radius: 50%; }
        .mockup-title { font-size: 13px; font-weight: 900; color: rgba(255,255,255,.5); margin-left: 8px; }
        .mockup-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .mockup-stat { background: rgba(255,255,255,.07); border-radius: 12px; padding: 16px 12px; text-align: center; }
        .mockup-stat .n { font-size: 1.9rem; font-weight: 900; line-height: 1; }
        .mockup-stat .l { font-size: 11px; color: rgba(255,255,255,.42); font-weight: 700; margin-top: 5px; text-transform: uppercase; letter-spacing: .06em; }
        .mockup-scan-row {
            margin-top: 14px; background: rgba(52,211,153,.12); border: 1px solid rgba(52,211,153,.22);
            border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
        }
        .mockup-scan-label { font-size: 13px; font-weight: 900; color: #6EE7B7; display: flex; align-items: center; gap: 8px; }
        .mockup-scan-time  { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.35); }

        /* ─── Sections ─── */
        section { padding: 88px 0; }
        .section-label { font-size: 12px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; color: var(--red); margin-bottom: 10px; }
        .section-title { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 900; margin-bottom: 14px; letter-spacing: -.02em; }
        .section-sub { font-size: 1rem; color: #64748B; max-width: 540px; font-weight: 500; }

        /* ─── Features ─── */
        #features { background: #fff; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(295px, 1fr)); gap: 24px; }
        .feat {
            background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 30px 28px;
            transition: box-shadow .22s, transform .22s;
        }
        .feat:hover { box-shadow: 0 12px 36px rgba(30,41,59,.09); transform: translateY(-3px); }
        .feat-icon { width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center; font-size: 24px; margin-bottom: 18px; }
        .feat h3 { font-size: 1.07rem; font-weight: 900; margin-bottom: 9px; }
        .feat p  { font-size: .92rem; color: #64748B; line-height: 1.65; }

        /* ─── Steps ─── */
        #how { background: var(--surface); }
        .steps-wrap { max-width: 720px; margin: 0 auto; }
        .step {
            display: grid; grid-template-columns: 58px 1fr; gap: 22px; align-items: start;
            padding: 26px 0; border-bottom: 1px solid var(--border);
        }
        .step:last-child { border-bottom: none; }
        .step-num {
            width: 54px; height: 54px; background: var(--red); color: #fff;
            border-radius: 14px; display: grid; place-items: center;
            font-size: 1.35rem; font-weight: 900; box-shadow: 0 5px 14px rgba(239,68,68,.3); flex-shrink: 0;
        }
        .step h3 { font-size: 1.05rem; font-weight: 900; margin-bottom: 7px; }
        .step p  { font-size: .92rem; color: #64748B; }

        /* ─── Roles ─── */
        #roles { background: #fff; }
        .roles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(235px, 1fr)); gap: 22px; }
        .role-card { border-radius: 16px; padding: 26px; border: 1px solid var(--border); transition: box-shadow .2s; }
        .role-card:hover { box-shadow: 0 8px 28px rgba(30,41,59,.08); }
        .role-badge { display: inline-block; border-radius: 999px; padding: 4px 13px; font-size: 11px; font-weight: 900; margin-bottom: 14px; letter-spacing: .04em; text-transform: uppercase; }
        .role-card h3 { font-size: 1rem; font-weight: 900; margin-bottom: 10px; }
        .role-card ul { list-style: none; padding: 0; }
        .role-card li { font-size: .875rem; color: #475569; padding: 4px 0; display: flex; gap: 9px; align-items: flex-start; }
        .ck { color: var(--teal); font-size: .85rem; margin-top: 2px; flex-shrink: 0; }
        .cx { color: #CBD5E1; font-size: .85rem; margin-top: 2px; flex-shrink: 0; }

        /* ─── Messaging ─── */
        #messaging { background: var(--surface); }
        .msg-grid { display: grid; gap: 48px; align-items: center; }
        @media (min-width: 900px) { .msg-grid { grid-template-columns: 1fr 1fr; } }
        .msg-mock {
            background: #fff; border: 1px solid var(--border); border-radius: 18px; padding: 28px;
            box-shadow: 0 8px 32px rgba(30,41,59,.08);
        }
        .msg-mock-head { font-size: 14px; font-weight: 900; margin-bottom: 18px; color: var(--navy); display: flex; align-items: center; gap: 8px; }
        .channel-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .channel-pill { border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 900; display: flex; align-items: center; gap: 6px; border: 1.5px solid; }
        .pill-sms { background: #EFF6FF; border-color: #93C5FD; color: #1D4ED8; }
        .pill-wa  { background: #F0FDF4; border-color: #86EFAC; color: #166534; }
        .msg-field { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 13px; font-weight: 600; color: #64748B; margin-bottom: 12px; }
        .msg-send-btn { background: var(--red); color: #fff; border: none; border-radius: 9px; padding: 11px 20px; font-size: 13px; font-weight: 900; width: 100%; }

        /* ─── CTA ─── */
        #cta { background: #fff; }
        .cta-inner {
            background: linear-gradient(135deg, var(--red) 0%, #DC2626 100%);
            border-radius: 22px; padding: 64px 48px; text-align: center; color: #fff;
            position: relative; overflow: hidden;
        }
        .cta-inner::before {
            content: ''; position: absolute; inset: 0;
            background: radial-gradient(ellipse 60% 70% at 80% 30%, rgba(255,255,255,.12) 0%, transparent 60%);
        }
        .cta-inner > * { position: relative; z-index: 1; }
        .cta-inner h2 { font-size: clamp(1.7rem, 4vw, 2.5rem); font-weight: 900; margin-bottom: 14px; }
        .cta-inner p  { font-size: 1.05rem; color: rgba(255,255,255,.78); margin-bottom: 36px; max-width: 480px; margin-left: auto; margin-right: auto; }
        .btn-white {
            display: inline-flex; align-items: center; gap: 8px;
            background: #fff; color: var(--red); border: none; border-radius: 11px;
            padding: 15px 34px; font-size: 15px; font-weight: 900; text-decoration: none;
            box-shadow: 0 8px 28px rgba(0,0,0,.18); transition: transform .1s;
        }
        .btn-white:hover { transform: translateY(-2px); }

        /* ─── Footer ─── */
        footer {
            background: var(--navy-deep); padding: 40px 2rem; text-align: center;
            color: rgba(255,255,255,.42); font-size: 13px; font-weight: 600;
        }
        footer strong { color: rgba(255,255,255,.78); }
        .footer-logo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 12px; text-decoration: none; }
        .footer-badge { width: 36px; height: 36px; background: var(--red); border-radius: 9px; display: grid; place-items: center; font-weight: 900; font-size: 13px; color: #fff; }

        /* ─── Responsive ─── */
        @media (max-width: 700px) {
            .nav-links { display: none; }
            .mockup-stats { grid-template-columns: repeat(2, 1fr); }
            .cta-inner { padding: 44px 24px; }
            .hero { padding: 80px 1.5rem 72px; }
        }
    </style>
</head>
<body>

<!-- Navbar -->
<nav class="navbar">
    <a href="#" class="nav-logo">
        <div class="nav-logo-badge">MD</div>
        <div class="nav-logo-text">
            <strong>Mo' Digital</strong>
            <small>Events Platform</small>
        </div>
    </a>
    <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#how">How it works</a>
        <a href="#roles">Roles</a>
        <a href="#messaging">Messaging</a>
    </div>
    <a href="{{ route('login') }}" class="nav-cta">
        <i class="bi bi-box-arrow-in-right"></i> Sign in
    </a>
</nav>

<!-- Hero -->
<section class="hero">
    <div class="hero-inner container">
        <div class="hero-badge">
            <i class="bi bi-qr-code"></i>
            Professional Event Management
        </div>
        <h1>Check in guests with<br><em>confidence &amp; speed</em></h1>
        <p class="hero-sub">
            Mo' Digital Events is your all-in-one platform for event access control — card scanning, real-time admission tracking, staff management, and smart reporting.
        </p>
        <div class="hero-actions">
            <a href="{{ route('login') }}" class="btn-red">
                <i class="bi bi-box-arrow-in-right"></i> Get started
            </a>
            <a href="#features" class="btn-ghost">
                See features <i class="bi bi-arrow-down"></i>
            </a>
        </div>

        <div class="hero-mockup">
            <div class="mockup-bar">
                <span class="mockup-dot" style="background:#EF4444"></span>
                <span class="mockup-dot" style="background:#F59E0B"></span>
                <span class="mockup-dot" style="background:#34D399"></span>
                <span class="mockup-title">Mo' Digital — Live Dashboard</span>
            </div>
            <div class="mockup-stats">
                <div class="mockup-stat"><div class="n" style="color:#34D399">1,240</div><div class="l">Admitted</div></div>
                <div class="mockup-stat"><div class="n" style="color:#F59E0B">1,500</div><div class="l">Cards issued</div></div>
                <div class="mockup-stat"><div class="n" style="color:#38BDF8">8</div><div class="l">Activities</div></div>
                <div class="mockup-stat"><div class="n" style="color:#EF4444">12</div><div class="l">Rejections</div></div>
            </div>
            <div class="mockup-scan-row">
                <span class="mockup-scan-label"><i class="bi bi-check-circle-fill"></i> Card accepted — Amara Osei</span>
                <span class="mockup-scan-time">just now</span>
            </div>
        </div>
    </div>
</section>

<!-- Features -->
<section id="features">
    <div class="container">
        <div style="margin-bottom:52px">
            <p class="section-label">Features</p>
            <h2 class="section-title">Everything you need to run a flawless event</h2>
            <p class="section-sub">From small private gatherings to large multi-day conferences — Mo' Digital handles it all.</p>
        </div>
        <div class="features-grid">
            <div class="feat">
                <div class="feat-icon" style="background:rgba(239,68,68,.1);color:var(--red)"><i class="bi bi-qr-code-scan"></i></div>
                <h3>Card Scanning</h3>
                <p>Scan guest cards instantly with any Android or iOS device. Single, double, and multi-person cards supported out of the box.</p>
            </div>
            <div class="feat">
                <div class="feat-icon" style="background:rgba(20,184,166,.12);color:var(--teal)"><i class="bi bi-bar-chart-line"></i></div>
                <h3>Real-time Reports</h3>
                <p>Live admission feeds, per-activity breakdowns, rejection logs, and exportable reports — updated the moment a card is scanned.</p>
            </div>
            <div class="feat">
                <div class="feat-icon" style="background:rgba(245,158,11,.12);color:var(--gold)"><i class="bi bi-calendar-check"></i></div>
                <h3>Multi-day Events</h3>
                <p>Organise events spanning multiple days with individual activity slots. Duplicate activities in one click for recurring schedules.</p>
            </div>
            <div class="feat">
                <div class="feat-icon" style="background:rgba(99,102,241,.12);color:#6366F1"><i class="bi bi-people"></i></div>
                <h3>Staff Management</h3>
                <p>Assign scanner staff and guest users to specific events. Role-based access ensures each person sees only what they need.</p>
            </div>
            <div class="feat">
                <div class="feat-icon" style="background:rgba(239,68,68,.1);color:var(--red)"><i class="bi bi-send"></i></div>
                <h3>SMS &amp; WhatsApp</h3>
                <p>Send personalised SMS or WhatsApp messages to your guest list directly from the platform. Upload contacts and send in seconds.</p>
            </div>
            <div class="feat">
                <div class="feat-icon" style="background:rgba(20,184,166,.12);color:var(--teal)"><i class="bi bi-clock-history"></i></div>
                <h3>Time-gated Access</h3>
                <p>Lock scanner access until the event starts. Set the exact date and time — the app enforces it automatically for every scanner.</p>
            </div>
        </div>
    </div>
</section>

<!-- How it works -->
<section id="how">
    <div class="container">
        <div style="margin-bottom:52px">
            <p class="section-label">How it works</p>
            <h2 class="section-title">From setup to check-in in minutes</h2>
        </div>
        <div class="steps-wrap">
            <div class="step">
                <div class="step-num">1</div>
                <div><h3>Create your event</h3><p>Set the event name, location, date, and time. Add activities like entrance gates, VIP areas, or breakout sessions. Multi-day support built in.</p></div>
            </div>
            <div class="step">
                <div class="step-num">2</div>
                <div><h3>Upload your guest list</h3><p>Import a spreadsheet with guest names and card codes. Single (S), double (D), and group (M) card types are all supported.</p></div>
            </div>
            <div class="step">
                <div class="step-num">3</div>
                <div><h3>Assign scanner staff</h3><p>Create scanner accounts and assign them to your event. They log into the Mo' Digital app on their phone and they're ready to go.</p></div>
            </div>
            <div class="step">
                <div class="step-num">4</div>
                <div><h3>Scan and track live</h3><p>Scanners point their phone at a guest card. Instant admission. The web dashboard shows every check-in across all devices in real time.</p></div>
            </div>
            <div class="step">
                <div class="step-num">5</div>
                <div><h3>Review &amp; export reports</h3><p>After the event, export detailed per-activity and per-guest admission reports to Excel for your records and analysis.</p></div>
            </div>
        </div>
    </div>
</section>

<!-- Roles -->
<section id="roles">
    <div class="container">
        <div style="margin-bottom:52px">
            <p class="section-label">User Roles</p>
            <h2 class="section-title">The right access for every person</h2>
            <p class="section-sub">Three role types, each with exactly the right capabilities — nothing more, nothing less.</p>
        </div>
        <div class="roles-grid">
            <div class="role-card" style="background:rgba(239,68,68,.03);border-color:rgba(239,68,68,.18)">
                <span class="role-badge" style="background:rgba(239,68,68,.1);color:var(--red)">Admin</span>
                <h3>Administrator</h3>
                <ul>
                    <li><i class="bi bi-check2 ck"></i> Create &amp; manage events</li>
                    <li><i class="bi bi-check2 ck"></i> Upload guest lists</li>
                    <li><i class="bi bi-check2 ck"></i> Manage users &amp; roles</li>
                    <li><i class="bi bi-check2 ck"></i> Full reports &amp; exports</li>
                    <li><i class="bi bi-check2 ck"></i> Send SMS / WhatsApp</li>
                    <li><i class="bi bi-check2 ck"></i> Card scanner access</li>
                </ul>
            </div>
            <div class="role-card" style="background:rgba(20,184,166,.03);border-color:rgba(20,184,166,.18)">
                <span class="role-badge" style="background:rgba(20,184,166,.1);color:var(--teal)">Staff</span>
                <h3>Staff Scanner</h3>
                <ul>
                    <li><i class="bi bi-check2 ck"></i> View assigned events</li>
                    <li><i class="bi bi-check2 ck"></i> Scan guest cards</li>
                    <li><i class="bi bi-check2 ck"></i> View admission reports</li>
                    <li><i class="bi bi-check2 ck"></i> Profile management</li>
                    <li><i class="bi bi-x cx"></i> No admin access</li>
                    <li><i class="bi bi-x cx"></i> No messaging</li>
                </ul>
            </div>
            <div class="role-card" style="background:rgba(245,158,11,.03);border-color:rgba(245,158,11,.18)">
                <span class="role-badge" style="background:rgba(245,158,11,.1);color:var(--gold)">Guest</span>
                <h3>Guest User</h3>
                <ul>
                    <li><i class="bi bi-check2 ck"></i> View assigned events</li>
                    <li><i class="bi bi-check2 ck"></i> View admission reports</li>
                    <li><i class="bi bi-check2 ck"></i> Profile management</li>
                    <li><i class="bi bi-x cx"></i> No card scanner</li>
                    <li><i class="bi bi-x cx"></i> No admin access</li>
                    <li><i class="bi bi-x cx"></i> No messaging</li>
                </ul>
            </div>
        </div>
    </div>
</section>

<!-- Messaging -->
<section id="messaging">
    <div class="container">
        <div class="msg-grid">
            <div>
                <p class="section-label">Communication</p>
                <h2 class="section-title">Reach your guests directly</h2>
                <p class="section-sub" style="margin-bottom:28px">Send personalised SMS or WhatsApp messages to any group or individual from a single, simple interface.</p>
                <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:14px">
                    <li style="display:flex;gap:14px;align-items:flex-start">
                        <span style="width:38px;height:38px;background:rgba(239,68,68,.1);color:var(--red);border-radius:10px;display:grid;place-items:center;flex-shrink:0;font-size:17px"><i class="bi bi-upload"></i></span>
                        <div>
                            <strong style="display:block;font-size:.95rem;margin-bottom:3px">Upload contacts</strong>
                            <span style="font-size:.87rem;color:#64748B">Import an Excel or CSV file with names, phone numbers, email addresses, and groups.</span>
                        </div>
                    </li>
                    <li style="display:flex;gap:14px;align-items:flex-start">
                        <span style="width:38px;height:38px;background:rgba(20,184,166,.1);color:var(--teal);border-radius:10px;display:grid;place-items:center;flex-shrink:0;font-size:17px"><i class="bi bi-people"></i></span>
                        <div>
                            <strong style="display:block;font-size:.95rem;margin-bottom:3px">Target by group</strong>
                            <span style="font-size:.87rem;color:#64748B">Segment contacts into groups (VIP, General, Press) and message them independently.</span>
                        </div>
                    </li>
                    <li style="display:flex;gap:14px;align-items:flex-start">
                        <span style="width:38px;height:38px;background:rgba(245,158,11,.1);color:var(--gold);border-radius:10px;display:grid;place-items:center;flex-shrink:0;font-size:17px"><i class="bi bi-paperclip"></i></span>
                        <div>
                            <strong style="display:block;font-size:.95rem;margin-bottom:3px">Attach files</strong>
                            <span style="font-size:.87rem;color:#64748B">Include tickets, schedules, or images as attachments for WhatsApp recipients.</span>
                        </div>
                    </li>
                </ul>
            </div>
            <div class="msg-mock">
                <div class="msg-mock-head"><i class="bi bi-send" style="color:var(--red)"></i> Compose Message</div>
                <div class="channel-row">
                    <span class="channel-pill pill-sms"><i class="bi bi-phone"></i> SMS</span>
                    <span class="channel-pill pill-wa"><i class="bi bi-whatsapp"></i> WhatsApp</span>
                </div>
                <div class="msg-field">VIP Guests (143 contacts)</div>
                <div class="msg-field" style="min-height:80px;line-height:1.5">Dear {name}, your invitation is confirmed for the Annual Gala on 28 June...</div>
                <button class="msg-send-btn"><i class="bi bi-send"></i> &nbsp;Send to 143 recipients</button>
            </div>
        </div>
    </div>
</section>

<!-- CTA -->
<section id="cta">
    <div class="container">
        <div class="cta-inner">
            <h2>Ready to run your next event?</h2>
            <p>Sign in to the admin dashboard and set up your first event in under 10 minutes.</p>
            <a href="{{ route('login') }}" class="btn-white">
                <i class="bi bi-box-arrow-in-right"></i> Sign in to admin
            </a>
        </div>
    </div>
</section>

<!-- Footer -->
<footer>
    <div>
        <a href="#" class="footer-logo">
            <span class="footer-badge">MD</span>
            <strong>Mo' Digital Events</strong>
        </a>
    </div>
    <p>Professional event management &amp; card scanning platform</p>
    <p style="margin-top:8px">&copy; {{ date('Y') }} Mo' Digital. All rights reserved.</p>
</footer>

</body>
</html>
