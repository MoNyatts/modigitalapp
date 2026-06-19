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
<body
    class="min-h-screen bg-slate-950 text-white antialiased"
    style="background-image: linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(15,23,42,0.78) 42%, rgba(127,29,29,0.58) 100%), url('{{ asset('images/admin-login-bg.jpg') }}'); background-size: cover; background-position: center;">
<main class="flex min-h-screen items-stretch">
    <section class="hidden flex-1 flex-col justify-between px-10 py-8 lg:flex xl:px-14">
        <a href="{{ route('login') }}" class="flex w-max items-center gap-3 text-white no-underline">
            <span class="grid h-12 w-12 place-items-center rounded-lg bg-red-500 text-lg font-black shadow-lg shadow-red-950/30">MD</span>
            <span>
                <span class="block text-lg font-black leading-tight">Mo' Digital Events</span>
                <span class="text-sm font-semibold text-white/60">Admin command center</span>
            </span>
        </a>

        <div class="max-w-2xl pb-10">
            <p class="mb-4 text-sm font-bold uppercase text-red-200">Guest admission control</p>
            <h1 class="text-5xl font-black leading-tight xl:text-6xl">Own every arrival moment.</h1>
            <p class="mt-5 max-w-xl text-lg font-semibold leading-8 text-white/70">
                Manage events, scanner teams, QR batches, and live attendance reports from one focused control room.
            </p>
            <div class="mt-8 grid max-w-xl grid-cols-3 gap-3">
                <div class="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur">
                    <i class="bi bi-qr-code-scan text-2xl text-red-200"></i>
                    <div class="mt-3 text-sm font-extrabold">QR control</div>
                </div>
                <div class="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur">
                    <i class="bi bi-people text-2xl text-red-200"></i>
                    <div class="mt-3 text-sm font-extrabold">Staff access</div>
                </div>
                <div class="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur">
                    <i class="bi bi-graph-up-arrow text-2xl text-red-200"></i>
                    <div class="mt-3 text-sm font-extrabold">Live reports</div>
                </div>
            </div>
        </div>
    </section>

    <section class="flex min-h-screen w-full items-center justify-center px-5 py-8 lg:w-[520px] lg:bg-white/95 lg:text-slate-950 lg:shadow-2xl lg:shadow-slate-950/30 xl:w-[560px]">
        <div class="w-full max-w-md">
            <div class="mb-7 flex items-center gap-3 lg:hidden">
                <span class="grid h-12 w-12 place-items-center rounded-lg bg-red-500 text-lg font-black text-white">MD</span>
                <div>
                    <div class="text-lg font-black leading-tight text-white">Mo' Digital Events</div>
                    <div class="text-sm font-semibold text-white/70">Admin command center</div>
                </div>
            </div>

            <div class="rounded-lg border border-white/20 bg-white/95 p-6 text-slate-950 shadow-2xl shadow-slate-950/25 backdrop-blur sm:p-8 lg:border-slate-200 lg:bg-white lg:shadow-none">
                <div class="mb-7">
                    <span class="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-black uppercase text-red-600">
                        <i class="bi bi-shield-lock"></i> Secure login
                    </span>
                    <h2 class="mt-4 text-3xl font-black text-slate-950">Welcome back</h2>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-500">Sign in with your administrator account to manage events and admissions.</p>
                </div>

                @if ($errors->any())
                    <div class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        <i class="bi bi-exclamation-circle mr-1"></i>{{ $errors->first() }}
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

                <div class="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-xs font-bold text-slate-400">
                    <span>Mo' Digital Events CMS</span>
                    <span>{{ now()->format('Y') }}</span>
                </div>
            </div>
        </div>
    </section>
</main>
</body>
</html>
