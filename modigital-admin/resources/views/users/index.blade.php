@extends('layouts.app')
@section('title', 'Users')
@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <h3 class="fw-bold mb-0">Users</h3>
    <a href="{{ route('users.create') }}" class="btn btn-brand"><i class="bi bi-person-plus me-1"></i>New User</a>
</div>

<div class="card border-0 shadow-sm">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr><th>Name</th><th>Email</th><th class="text-center">Role</th><th class="text-center">Scanner</th><th class="text-center">Events</th><th></th></tr></thead>
            <tbody>
            @foreach ($users as $user)
                <tr>
                    <td class="fw-semibold">{{ $user->name }}</td>
                    <td class="small">{{ $user->email }}</td>
                    <td class="text-center">
                        <span class="badge {{ $user->role === 'admin' ? 'text-bg-danger' : 'text-bg-secondary' }}">{{ $user->role }}</span>
                    </td>
                    <td class="text-center">
                        @if ($user->canScan())<i class="bi bi-check-circle-fill text-success"></i>
                        @else<i class="bi bi-dash-circle text-secondary"></i>@endif
                    </td>
                    <td class="text-center"><span class="badge text-bg-light">{{ $user->role === 'admin' ? 'all' : $user->assigned_events_count }}</span></td>
                    <td class="text-end">
                        <a href="{{ route('users.edit', $user) }}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></a>
                        @if ($user->id !== auth()->id())
                            <form method="POST" action="{{ route('users.destroy', $user) }}" class="d-inline"
                                  onsubmit="return confirm('Delete {{ $user->name }}?');">
                                @csrf @method('DELETE')
                                <button class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                            </form>
                        @endif
                    </td>
                </tr>
            @endforeach
            </tbody>
        </table>
    </div>
    @if ($users->hasPages())<div class="card-footer bg-white">{{ $users->links() }}</div>@endif
</div>
@endsection
