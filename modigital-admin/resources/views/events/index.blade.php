@extends('layouts.app')
@section('title', 'Events')
@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <h3 class="fw-bold mb-0">Events</h3>
    <a href="{{ route('events.create') }}" class="btn btn-brand"><i class="bi bi-plus-lg me-1"></i>New Event</a>
</div>

<div class="card border-0 shadow-sm">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
                <tr><th>Event</th><th>Location</th><th>Date</th><th class="text-center">Activities</th><th class="text-center">QR Codes</th><th></th></tr>
            </thead>
            <tbody>
            @forelse ($events as $event)
                <tr>
                    <td><a href="{{ route('events.show', $event) }}" class="fw-semibold text-decoration-none">{{ $event->name }}</a></td>
                    <td class="small">{{ $event->location }}</td>
                    <td class="small">
                        {{ $event->start_date->format('d M Y') }}
                        @if ($event->is_multi_day && $event->end_date) – {{ $event->end_date->format('d M Y') }} @endif
                    </td>
                    <td class="text-center"><span class="badge text-bg-light">{{ $event->activities_count }}</span></td>
                    <td class="text-center"><span class="badge text-bg-light">{{ $event->qr_codes_count }}</span></td>
                    <td class="text-end">
                        <a href="{{ route('events.edit', $event) }}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></a>
                        <form method="POST" action="{{ route('events.destroy', $event) }}" class="d-inline"
                              onsubmit="return confirm('Delete this event and all of its activities, QR codes and scans?');">
                            @csrf @method('DELETE')
                            <button class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr><td colspan="6" class="text-center text-secondary py-5">No events yet — create your first event.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
    @if ($events->hasPages())<div class="card-footer bg-white">{{ $events->links() }}</div>@endif
</div>
@endsection
