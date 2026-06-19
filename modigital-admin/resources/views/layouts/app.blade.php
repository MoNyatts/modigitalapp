@php
    $navItems = [
        ['label' => 'Dashboard', 'route' => 'dashboard', 'match' => 'dashboard', 'icon' => 'bi-speedometer2'],
        ['label' => 'Events', 'route' => 'events.index', 'match' => ['events.*', 'qrcodes.*'], 'icon' => 'bi-calendar-event'],
        ['label' => 'Users', 'route' => 'users.index', 'match' => 'users.*', 'icon' => 'bi-people'],
        ['label' => 'Reports', 'route' => 'reports.index', 'match' => 'reports.*', 'icon' => 'bi-bar-chart'],
    ];
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Dashboard') - Mo' Digital Events</title>
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @else
        <script src="https://cdn.tailwindcss.com"></script>
    @endif
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        :root { --brand: #EF4444; --brand-dark: #B91C1C; --navy: #3B4E6C; }
        .btn-brand { background: var(--brand); border-color: var(--brand); color: #fff; }
        .btn-brand:hover { background: var(--brand-dark); border-color: var(--brand-dark); color: #fff; }
    </style>
</head>
<body class="min-h-screen bg-slate-100 text-slate-900 antialiased">
<div class="min-h-screen lg:flex">
    <aside class="hidden w-72 shrink-0 bg-slate-950 text-white lg:flex lg:flex-col">
        <div class="p-6">
            <a href="{{ route('dashboard') }}" class="flex items-center gap-3 text-white no-underline">
                <span class="grid h-12 w-12 place-items-center rounded-lg bg-red-500 text-lg font-black shadow-lg shadow-red-950/30">MD</span>
                <span>
                    <span class="block text-lg font-black leading-tight">Mo' Digital</span>
                    <span class="text-sm font-semibold text-slate-400">Events Admin</span>
                </span>
            </a>
        </div>

        <nav class="flex-1 space-y-1 px-3">
            @foreach ($navItems as $item)
                @php $active = request()->routeIs(...(array) $item['match']); @endphp
                <a href="{{ route($item['route']) }}"
                   class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-extrabold no-underline transition {{ $active ? 'bg-red-500 text-white shadow-lg shadow-red-950/20' : 'text-slate-300 hover:bg-white/10 hover:text-white' }}">
                    <i class="bi {{ $item['icon'] }} text-base"></i>
                    <span>{{ $item['label'] }}</span>
                </a>
            @endforeach
        </nav>

        <div class="m-4 rounded-lg border border-white/10 bg-white/5 p-4">
            <div class="mb-3 flex items-center gap-3">
                <span class="grid h-10 w-10 place-items-center rounded-lg bg-white/10 font-black">{{ strtoupper(substr(auth()->user()->name, 0, 1)) }}</span>
                <div class="min-w-0">
                    <div class="truncate text-sm font-extrabold">{{ auth()->user()->name }}</div>
                    <div class="truncate text-xs text-slate-400">{{ auth()->user()->email }}</div>
                </div>
            </div>
            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <button class="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10">
                    <i class="bi bi-box-arrow-right"></i> Sign out
                </button>
            </form>
        </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <div class="flex items-center justify-between gap-3">
                <a href="{{ route('dashboard') }}" class="flex items-center gap-2 text-slate-900 no-underline">
                    <span class="grid h-10 w-10 place-items-center rounded-lg bg-red-500 font-black text-white">MD</span>
                    <span class="font-black">Mo' Digital</span>
                </a>
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
                        <i class="bi bi-box-arrow-right"></i>
                    </button>
                </form>
            </div>
            <nav class="mt-3 flex gap-2 overflow-x-auto pb-1">
                @foreach ($navItems as $item)
                    @php $active = request()->routeIs(...(array) $item['match']); @endphp
                    <a href="{{ route($item['route']) }}"
                       class="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold no-underline {{ $active ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-700' }}">
                        <i class="bi {{ $item['icon'] }} me-1"></i>{{ $item['label'] }}
                    </a>
                @endforeach
            </nav>
        </header>

        <main class="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8" data-live-refresh-interval="@yield('live_refresh', auth()->check() ? '20' : '0')">
            <div class="mx-auto max-w-7xl">
                @if (session('status'))
                    <div class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                        {{ session('status') }}
                    </div>
                @endif
                @if (session('warning'))
                    <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                        {{ session('warning') }}
                    </div>
                @endif
                @if (session('importErrors'))
                    <div class="mb-4 space-y-2">
                        @foreach (session('importErrors') as $err)
                            <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">{{ $err }}</div>
                        @endforeach
                    </div>
                @endif
                @if ($errors->any())
                    <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                        <ul class="mb-0">
                            @foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach
                        </ul>
                    </div>
                @endif

                @yield('content')
            </div>
        </main>
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
    (() => {
        const page = document.querySelector('[data-live-refresh-interval]');
        const interval = Number(page?.dataset.liveRefreshInterval || 0);
        if (!page || !interval) return;

        let lastRefresh = Date.now();
        let dirtyForms = new WeakSet();

        const isEditable = (element) => element?.matches?.('input, textarea, select, [contenteditable="true"]');
        const hasOpenDialog = () => Boolean(document.querySelector('dialog[open]'));
        const hasDirtyForm = () => Array.from(document.forms).some((form) => dirtyForms.has(form));
        const shouldPause = () => document.hidden || hasOpenDialog() || hasDirtyForm() || isEditable(document.activeElement);

        document.addEventListener('input', (event) => {
            const form = event.target.closest?.('form');
            if (form) dirtyForms.add(form);
        });

        document.addEventListener('change', (event) => {
            const form = event.target.closest?.('form');
            if (form) dirtyForms.add(form);
        });

        document.addEventListener('submit', (event) => {
            dirtyForms.delete(event.target);
        });

        document.querySelectorAll('dialog').forEach((dialog) => {
            dialog.addEventListener('close', () => {
                dialog.querySelectorAll('form').forEach((form) => dirtyForms.delete(form));
                lastRefresh = Date.now();
            });
        });

        window.setInterval(() => {
            if (shouldPause()) {
                lastRefresh = Date.now();
                return;
            }

            if (Date.now() - lastRefresh >= interval * 1000) {
                window.location.reload();
            }
        }, 1000);
    })();
</script>
</body>
</html>
