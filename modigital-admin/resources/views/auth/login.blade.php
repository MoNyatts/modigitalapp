<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in — Mo' Digital Events</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #3B4E6C; min-height: 100vh; display: flex; align-items: center; }
        .brand-badge { width: 72px; height: 72px; border-radius: 20px; background: #EF4444; color: #fff;
                       display: inline-flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 800; }
        .btn-brand { background: #EF4444; border-color: #EF4444; color: #fff; }
        .btn-brand:hover { background: #DC2626; color: #fff; }
    </style>
</head>
<body>
<div class="container" style="max-width: 420px;">
    <div class="card shadow-lg border-0 rounded-4">
        <div class="card-body p-5 text-center">
            <span class="brand-badge mb-3">MD</span>
            <h4 class="fw-bold mb-0">Mo' Digital Events</h4>
            <p class="text-secondary mb-4">Admin Panel — For Your Peace of Mind</p>

            @if ($errors->any())
                <div class="alert alert-danger py-2 small">{{ $errors->first() }}</div>
            @endif

            <form method="POST" action="{{ route('login.attempt') }}" class="text-start">
                @csrf
                <div class="mb-3">
                    <label class="form-label">Email address</label>
                    <input type="email" name="email" value="{{ old('email') }}" class="form-control form-control-lg" required autofocus>
                </div>
                <div class="mb-4">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-control form-control-lg" required>
                </div>
                <button class="btn btn-brand btn-lg w-100">Sign in</button>
            </form>
        </div>
    </div>
</div>
</body>
</html>
