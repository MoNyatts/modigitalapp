@extends('layouts.app')
@section('title', $event->name)
@section('content')
<div class="d-flex justify-content-between align-items-center mb-1">
    <h3 class="fw-bold mb-0">{{ $event->name }}</h3>
    <div>
        <a href="{{ route('reports.show', $event) }}" class="btn btn-outline-secondary"><i class="bi bi-bar-chart me-1"></i>Report</a>
        <a href="{{ route('qrcodes.index', $event) }}" class="btn btn-outline-secondary"><i class="bi bi-qr-code me-1"></i>QR Codes ({{ $stats['qr_count'] }})</a>
        <a href="{{ route('events.edit', $event) }}" class="btn btn-brand"><i class="bi bi-pencil me-1"></i>Edit</a>
    </div>
</div>
<p class="text-secondary mb-4">
    <i class="bi bi-geo-alt me-1"></i>{{ $event->location }} ·
    <i class="bi bi-calendar3 me-1"></i>{{ $event->start_date->format('d M Y') }}@if ($event->is_multi_day && $event->end_date) – {{ $event->end_date->format('d M Y') }}@endif ·
    <i class="bi bi-person-check me-1"></i>{{ $stats['admissions'] }} admissions
    @if ($event->invited_guests) of {{ $event->invited_guests }} invited @endif
</p>

<div class="row g-3">
    <div class="col-lg-7">
        <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white fw-semibold">Activities</div>
            <ul class="list-group list-group-flush">
                @forelse ($event->activities as $activity)
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <span class="fw-semibold">{{ $activity->name }}</span>
                            @if ($activity->day)<span class="badge text-bg-light ms-1">Day {{ $activity->day }}</span>@endif
                            <div class="small text-secondary">
                                @if ($activity->start_time){{ substr($activity->start_time, 0, 5) }}@endif
                                @if ($activity->end_time) – {{ substr($activity->end_time, 0, 5) }}@endif
                                {{ $activity->description ? ' · ' . $activity->description : '' }}
                            </div>
                        </div>
                        <form method="POST" action="{{ route('activities.destroy', [$event, $activity]) }}"
                              onsubmit="return confirm('Delete this activity and its scan history?');">
                            @csrf @method('DELETE')
                            <button class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                        </form>
                    </li>
                @empty
                    <li class="list-group-item text-secondary text-center py-4">No activities yet — scanners need at least one.</li>
                @endforelse
            </ul>
            <div class="card-body border-top">
                <form method="POST" action="{{ route('activities.store', $event) }}" class="row g-2">
                    @csrf
                    <div class="col-md-4"><input name="name" class="form-control form-control-sm" placeholder="Activity name (e.g. Main Entrance)" required></div>
                    <div class="col-md-2"><input name="day" type="number" min="1" class="form-control form-control-sm" placeholder="Day #"></div>
                    <div class="col-md-2"><input name="start_time" type="time" class="form-control form-control-sm"></div>
                    <div class="col-md-2"><input name="end_time" type="time" class="form-control form-control-sm"></div>
                    <div class="col-md-2"><button class="btn btn-brand btn-sm w-100">Add</button></div>
                </form>
            </div>
        </div>
    </div>

    <div class="col-lg-5">
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold">Assigned scanner staff</div>
            <div class="card-body">
                <form method="POST" action="{{ route('events.staff', $event) }}">
                    @csrf
                    @forelse ($staff as $member)
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="user_ids[]" value="{{ $member->id }}"
                                   id="staff{{ $member->id }}"
                                   {{ $event->assignedUsers->contains($member->id) ? 'checked' : '' }}>
                            <label class="form-check-label" for="staff{{ $member->id }}">
                                {{ $member->name }} <span class="text-secondary small">({{ $member->email }})</span>
                                @unless ($member->scanner_enabled)<span class="badge text-bg-warning">scanner off</span>@endunless
                            </label>
                        </div>
                    @empty
                        <p class="text-secondary mb-2">No staff accounts yet — create them under <a href="{{ route('users.create') }}">Users</a>.</p>
                    @endforelse
                    @if ($staff->isNotEmpty())
                        <button class="btn btn-brand btn-sm mt-3">Save assignments</button>
                    @endif
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
