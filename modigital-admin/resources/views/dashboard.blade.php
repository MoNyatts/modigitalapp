@extends('layouts.app')
@section('title', 'Dashboard')
@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <h3 class="fw-bold mb-0">Dashboard</h3>
    <a href="{{ route('events.create') }}" class="btn btn-brand"><i class="bi bi-plus-lg me-1"></i>New Event</a>
</div>

<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card stat-card border-0 shadow-sm"><div class="card-body d-flex align-items-center gap-3">
            <span class="icon bg-danger-subtle text-danger"><i class="bi bi-calendar-event"></i></span>
            <div><div class="fs-3 fw-bold">{{ $eventCount }}</div><div class="text-secondary small">Events</div></div>
        </div></div>
    </div>
    <div class="col-md-3">
        <div class="card stat-card border-0 shadow-sm"><div class="card-body d-flex align-items-center gap-3">
            <span class="icon bg-primary-subtle text-primary"><i class="bi bi-qr-code"></i></span>
            <div><div class="fs-3 fw-bold">{{ $guestCount }}</div><div class="text-secondary small">QR Codes</div></div>
        </div></div>
    </div>
    <div class="col-md-3">
        <div class="card stat-card border-0 shadow-sm"><div class="card-body d-flex align-items-center gap-3">
            <span class="icon bg-success-subtle text-success"><i class="bi bi-person-check"></i></span>
            <div><div class="fs-3 fw-bold">{{ $admissionsToday }}</div><div class="text-secondary small">Admissions today ({{ $admissionsTotal }} total)</div></div>
        </div></div>
    </div>
    <div class="col-md-3">
        <div class="card stat-card border-0 shadow-sm"><div class="card-body d-flex align-items-center gap-3">
            <span class="icon bg-warning-subtle text-warning"><i class="bi bi-x-octagon"></i></span>
            <div><div class="fs-3 fw-bold">{{ $rejectionsToday }}</div><div class="text-secondary small">Rejections today</div></div>
        </div></div>
    </div>
</div>

<div class="row g-3">
    <div class="col-lg-7">
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold">Recent admissions</div>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light"><tr><th>Code</th><th>Guest</th><th>Event / Activity</th><th>By</th><th class="text-end">Guests</th><th>Time</th></tr></thead>
                    <tbody>
                    @forelse ($recentScans as $scan)
                        <tr>
                            <td><span class="badge text-bg-secondary">{{ $scan->qrCode?->code }}</span></td>
                            <td>{{ $scan->qrCode?->guest_name }}</td>
                            <td class="small">{{ $scan->activity?->event?->name }}<br><span class="text-secondary">{{ $scan->activity?->name }}</span></td>
                            <td class="small">{{ $scan->scanner?->name }}</td>
                            <td class="text-end fw-semibold">{{ $scan->admission_count }}</td>
                            <td class="small text-secondary">{{ $scan->created_at->diffForHumans() }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="text-center text-secondary py-4">No scans yet — admissions appear here in real time.</td></tr>
                    @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div class="col-lg-5">
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold">Upcoming events</div>
            <ul class="list-group list-group-flush">
                @forelse ($upcomingEvents as $event)
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <a href="{{ route('events.show', $event) }}" class="fw-semibold text-decoration-none">{{ $event->name }}</a>
                            <div class="small text-secondary"><i class="bi bi-geo-alt me-1"></i>{{ $event->location }}</div>
                        </div>
                        <span class="badge text-bg-light">{{ $event->start_date->format('d M Y') }}</span>
                    </li>
                @empty
                    <li class="list-group-item text-secondary text-center py-4">No upcoming events.</li>
                @endforelse
            </ul>
        </div>
    </div>
</div>
@endsection
