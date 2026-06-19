<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in - Mo' Digital Events</title>
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @else
        <script src="https://cdn.tailwindcss.com"></script>
    @endif
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
</head>
<body class="min-h-screen bg-slate-950 text-slate-900 antialiased">
<main class="grid min-h-screen lg:grid-cols-[1fr_520px]">
    <section class="hidden bg-[linear-gradient(135deg,#3B4E6C_0%,#111827_54%,#B91C1C_100%)] p-10 text-white lg:flex lg:flex-col">
        <div class="flex items-center gap-3">
            <span class="grid h-12 w-12 place-items-center rounded-lg bg-red-500 text-lg font-black shadow-lg shadow-red-950/30">MD</span>
            <div>
                <div class="text-lg font-black leading-tight">Mo' Digital Events</div>
                <div class="text-sm font-semibold text-white/60">Admin command center</div>
            </div>
        </div>

        <div class="mt-auto max-w-2xl">
            <p class="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-red-200">Guest admission control</p>
            <h1 class="text-5xl font-black leading-tight">Run arrivals, scanners, and reports from one clean CMS.</h1>
            <p class="mt-5 max-w-xl text-lg font-medium leading-8 text-white/70">
                Monitor admissions, manage QR batches, assign scanner teams, and export attendance reports without jumping between tools.
            </p>
            <div class="mt-8 grid max-w-2xl grid-cols-3 gap-3">
                <div class="rounded-lg border border-white/10 bg-white/10 p-4">
                    <i class="bi bi-qr-code-scan text-2xl text-red-200"></i>
                    <div class="mt-3 text-sm font-extrabold">QR scanning</div>
                </div>
                <div class="rounded-lg border border-white/10 bg-white/10 p-4">
                    <i class="bi bi-people text-2xl text-red-200"></i>
                    <div class="mt-3 text-sm font-extrabold">Team access</div>
                </div>
                <div class="rounded-lg border border-white/10 bg-white/10 p-4">
                    <i class="bi bi-bar-chart text-2xl text-red-200"></i>
                    <div class="mt-3 text-sm font-extrabold">Live reports</div>
                </div>
            </div>
        </div>
    </section>

    <section class="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
        <div class="w-full max-w-md">
            <div class="mb-8 flex items-center gap-3 lg:hidden">
                <span class="grid h-12 w-12 place-items-center rounded-lg bg-red-500 text-lg font-black text-white">MD</span>
                <div>
                    <div class="text-lg font-black leading-tight">Mo' Digital Events</div>
                    <div class="text-sm font-semibold text-slate-500">Admin command center</div>
                </div>
            </div>

            <div class="rounded-lg bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-8">
                <div class="mb-7">
                    <p class="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-red-500">Secure login</p>
                    <h2 class="text-3xl font-black text-slate-950">Welcome back</h2>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-500">Use your administrator account to access the CMS.</p>
                </div>

                @if ($errors->any())
                    <div class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        <i class="bi bi-exclamation-circle me-1"></i>{{ $errors->first() }}
                    </div>
                @endif

                <form method="POST" action="{{ route('login.attempt') }}" class="space-y-5">
                    @csrf
                    <label class="block">
                        <span class="mb-2 block text-sm font-extrabold text-slate-700">Email address</span>
                        <span class="relative block">
                            <i class="bi bi-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="email" name="email" value="{{ old('email') }}"
                                   class="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100"
                                   required autofocus autocomplete="email">
                        </span>
                    </label>

                    <label class="block">
                        <span class="mb-2 block text-sm font-extrabold text-slate-700">Password</span>
                        <span class="relative block">
                            <i class="bi bi-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="password" name="password"
                                   class="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100"
                                   required autocomplete="current-password">
                        </span>
                    </label>

                    <button class="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600">
                        <i class="bi bi-box-arrow-in-right"></i> Sign in
                    </button>
                </form>
            </div>
        </div>
    </section>
</main>
</body>
</html>
