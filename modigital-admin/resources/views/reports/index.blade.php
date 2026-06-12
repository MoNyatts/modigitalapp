@extends('layouts.app')
@section('title', 'Reports')
@section('content')
<h3 class="fw-bold mb-4">Reports</h3>

<div class="card border-0 shadow-sm">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr><th>Event</th><th>Date</th><th class="text-center">QR Codes</th><th></th></tr></thead>
            <tbody>
            @forelse ($events as $event)
                <tr>
                    <td class="fw-semibold">{{ $event->name }}</td>
                    <td class="small">{{ $event->start_date->format('d M Y') }}</td>
                    <td class="text-center"><span class="badge text-bg-light">{{ $event->qr_codes_count }}</span></td>
                    <td class="text-end">
                        <a href="{{ route('reports.show', $event) }}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-eye me-1"></i>View</a>
                        <a href="{{ route('reports.export', $event) }}" class="btn btn-sm btn-brand"><i class="bi bi-file-earmark-excel me-1"></i>Export XLSX</a>
                    </td>
                </tr>
            @empty
                <tr><td colspan="4" class="text-center text-secondary py-5">No events yet.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
</div>
@endsection
