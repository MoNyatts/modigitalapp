@extends('layouts.app')
@section('title', 'Users')
@section('content')
@php
    $adminCount = $users->getCollection()->where('role', 'admin')->count();
    $staffCount = $users->getCollection()->where('role', 'staff')->count();
@endphp

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">Access control</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">Users</h1>
        <p class="mt-1 text-sm font-semibold text-slate-500">Manage administrators, scanner staff, profile photos, and event assignments.</p>
    </div>
    <button type="button" onclick="document.getElementById('user-create-modal').showModal()"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600">
        <i class="bi bi-person-plus"></i> Add user
    </button>
</div>

<div class="mb-6 grid gap-4 sm:grid-cols-3">
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-3xl font-black text-slate-950">{{ $users->total() }}</div>
        <div class="mt-1 text-sm font-bold text-slate-500">Total users</div>
    </div>
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-3xl font-black text-red-600">{{ $adminCount }}</div>
        <div class="mt-1 text-sm font-bold text-slate-500">Admins on page</div>
    </div>
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-3xl font-black text-teal-700">{{ $staffCount }}</div>
        <div class="mt-1 text-sm font-bold text-slate-500">Scanner staff on page</div>
    </div>
</div>

<section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h2 class="text-lg font-black text-slate-950">User directory</h2>
            <p class="text-sm font-semibold text-slate-500">Edit users inline from the table actions.</p>
        </div>
        <a href="{{ route('users.index') }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-600 no-underline transition hover:border-red-200 hover:text-red-600">
            <i class="bi bi-arrow-clockwise"></i> Clear filters
        </a>
    </div>
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100">
            <thead class="bg-slate-50">
                <tr>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">User</th>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Email</th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Role</th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Scanner</th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Events</th>
                    <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
                @forelse ($users as $user)
                    <tr class="hover:bg-slate-50">
                        <td class="px-5 py-4">
                            <div class="flex items-center gap-3">
                                @if ($user->profilePhotoUrl())
                                    <img src="{{ $user->profilePhotoUrl() }}" alt="{{ $user->name }}" class="h-11 w-11 rounded-lg object-cover">
                                @else
                                    <span class="grid h-11 w-11 place-items-center rounded-lg {{ $user->role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700' }} font-black">
                                        {{ strtoupper(substr($user->name, 0, 1)) }}
                                    </span>
                                @endif
                                <div>
                                    <div class="font-black text-slate-900">{{ $user->name }}</div>
                                    <div class="text-xs font-semibold text-slate-400">Joined {{ $user->created_at->format('d M Y') }}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-5 py-4 text-sm font-semibold text-slate-600">{{ $user->email }}</td>
                        <td class="px-5 py-4 text-center">
                            <span class="rounded-lg px-2 py-1 text-xs font-black {{ $user->role === 'admin' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700' }}">{{ ucfirst($user->role) }}</span>
                        </td>
                        <td class="px-5 py-4 text-center">
                            <span class="rounded-lg px-2 py-1 text-xs font-black {{ $user->canScan() ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700' }}">{{ $user->canScan() ? 'Enabled' : 'Off' }}</span>
                        </td>
                        <td class="px-5 py-4 text-center text-sm font-black text-slate-900">{{ $user->role === 'admin' ? 'All' : $user->assigned_events_count }}</td>
                        <td class="px-5 py-4">
                            <div class="flex justify-end gap-2">
                                <button type="button" onclick="document.getElementById('user-edit-{{ $user->id }}').showModal()"
                                        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700 transition hover:border-red-200 hover:text-red-600">
                                    <i class="bi bi-pencil"></i> Edit
                                </button>
                                @if ($user->id !== auth()->id())
                                    <form method="POST" action="{{ route('users.destroy', $user) }}" onsubmit="return confirm('Delete {{ $user->name }}?');">
                                        @csrf @method('DELETE')
                                        <button class="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-extrabold text-red-600 transition hover:bg-red-50">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </form>
                                @endif
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="6" class="px-5 py-10 text-center text-sm font-semibold text-slate-500">No users yet.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <footer class="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm font-semibold text-slate-500">
            Showing {{ $users->firstItem() ?? 0 }} to {{ $users->lastItem() ?? 0 }} of {{ $users->total() }} users
        </div>
        @if ($users->hasPages())
            <div>{{ $users->links() }}</div>
        @endif
    </footer>
</section>

@include('users.form', ['user' => new \App\Models\User(), 'events' => $events, 'dialogId' => 'user-create-modal'])
@foreach ($users as $user)
    @include('users.form', ['user' => $user, 'events' => $events, 'dialogId' => 'user-edit-' . $user->id])
@endforeach
@endsection
