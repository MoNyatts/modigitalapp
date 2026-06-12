<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Dashboard') — Mo' Digital Events</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        :root { --brand: #EF4444; --brand-dark: #DC2626; --navy: #3B4E6C; }
        body { background: #F9FAFB; }
        .sidebar { width: 240px; min-height: 100vh; background: var(--navy); }
        .sidebar .nav-link { color: rgba(255,255,255,.8); border-radius: .5rem; margin: .1rem .5rem; }
        .sidebar .nav-link:hover { color: #fff; background: rgba(255,255,255,.08); }
        .sidebar .nav-link.active { color: #fff; background: var(--brand); }
        .brand-badge { width: 38px; height: 38px; border-radius: 10px; background: var(--brand); color: #fff;
                       display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
        .btn-brand { background: var(--brand); border-color: var(--brand); color: #fff; }
        .btn-brand:hover { background: var(--brand-dark); border-color: var(--brand-dark); color: #fff; }
        .stat-card .icon { font-size: 1.6rem; width: 52px; height: 52px; border-radius: 12px;
                           display: inline-flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>
<div class="d-flex">
    <nav class="sidebar d-flex flex-column p-2">
        <div class="d-flex align-items-center gap-2 text-white p-3">
            <span class="brand-badge">MD</span>
            <div>
                <div class="fw-bold lh-1">Mo' Digital</div>
                <small class="opacity-75">Events Admin</small>
            </div>
        </div>
        <ul class="nav nav-pills flex-column mb-auto">
            <li><a href="{{ route('dashboard') }}" class="nav-link {{ request()->routeIs('dashboard') ? 'active' : '' }}"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a></li>
            <li><a href="{{ route('events.index') }}" class="nav-link {{ request()->routeIs('events.*', 'qrcodes.*') ? 'active' : '' }}"><i class="bi bi-calendar-event me-2"></i>Events</a></li>
            <li><a href="{{ route('users.index') }}" class="nav-link {{ request()->routeIs('users.*') ? 'active' : '' }}"><i class="bi bi-people me-2"></i>Users</a></li>
            <li><a href="{{ route('reports.index') }}" class="nav-link {{ request()->routeIs('reports.*') ? 'active' : '' }}"><i class="bi bi-bar-chart me-2"></i>Reports</a></li>
        </ul>
        <div class="p-3 text-white-50 small">
            <div class="mb-2"><i class="bi bi-person-circle me-1"></i>{{ auth()->user()->name }}</div>
            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <button class="btn btn-sm btn-outline-light w-100"><i class="bi bi-box-arrow-right me-1"></i>Sign out</button>
            </form>
        </div>
    </nav>

    <main class="flex-grow-1 p-4">
        @if (session('status'))
            <div class="alert alert-success alert-dismissible fade show">{{ session('status') }}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>
        @endif
        @if (session('warning'))
            <div class="alert alert-warning alert-dismissible fade show">{{ session('warning') }}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>
        @endif
        @if (session('importErrors'))
            @foreach (session('importErrors') as $err)
                <div class="alert alert-warning py-1 small mb-1">{{ $err }}</div>
            @endforeach
        @endif
        @if ($errors->any())
            <div class="alert alert-danger"><ul class="mb-0">
                @foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach
            </ul></div>
        @endif

        @yield('content')
    </main>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
