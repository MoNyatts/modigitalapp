@extends('layouts.app')
@section('title', $user->exists ? 'Edit User' : 'New User')
@section('content')
<h3 class="fw-bold mb-4">{{ $user->exists ? "Edit {$user->name}" : 'New User' }}</h3>

<div class="card border-0 shadow-sm" style="max-width: 720px;">
    <div class="card-body p-4">
        <form method="POST" action="{{ $user->exists ? route('users.update', $user) : route('users.store') }}">
            @csrf
            @if ($user->exists) @method('PUT') @endif

            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Name</label>
                    <input type="text" name="name" class="form-control" value="{{ old('name', $user->name) }}" required>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-control" value="{{ old('email', $user->email) }}" required>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Password @if ($user->exists)<span class="text-secondary">(leave blank to keep)</span>@endif</label>
                    <input type="password" name="password" class="form-control" {{ $user->exists ? '' : 'required' }}>
                </div>
                <div class="col-md-3 mb-3">
                    <label class="form-label">Role</label>
                    <select name="role" class="form-select">
                        <option value="staff" {{ old('role', $user->role) === 'staff' ? 'selected' : '' }}>Staff (scanner)</option>
                        <option value="admin" {{ old('role', $user->role) === 'admin' ? 'selected' : '' }}>Admin</option>
                    </select>
                </div>
                <div class="col-md-3 mb-3 d-flex align-items-end">
                    <div class="form-check form-switch">
                        <input type="hidden" name="scanner_enabled" value="0">
                        <input class="form-check-input" type="checkbox" name="scanner_enabled" value="1" id="scanner"
                               {{ old('scanner_enabled', $user->exists ? $user->scanner_enabled : true) ? 'checked' : '' }}>
                        <label class="form-check-label" for="scanner">Scanner access</label>
                    </div>
                </div>
            </div>

            <div class="mb-4">
                <label class="form-label fw-semibold">Assigned events <span class="text-secondary">(staff only — admins see all)</span></label>
                @forelse ($events as $event)
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="event_ids[]" value="{{ $event->id }}" id="ev{{ $event->id }}"
                               {{ $user->exists && $user->assignedEvents->contains($event->id) ? 'checked' : '' }}>
                        <label class="form-check-label" for="ev{{ $event->id }}">
                            {{ $event->name }} <span class="text-secondary small">{{ $event->start_date->format('d M Y') }}</span>
                        </label>
                    </div>
                @empty
                    <div class="text-secondary small">No events created yet.</div>
                @endforelse
            </div>

            <button class="btn btn-brand px-4">{{ $user->exists ? 'Save changes' : 'Create user' }}</button>
            <a href="{{ route('users.index') }}" class="btn btn-light">Cancel</a>
        </form>
    </div>
</div>
@endsection
