@extends('layouts.app')
@section('title', 'Report — ' . $event->name)
@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-0">Attendance Report</h3>
        <span class="text-secondary">{{ $event->name }} · {{ $event->start_date->format('d M Y') }}</span>
    </div>
    <a href="{{ route('reports.export', $event) }}" class="btn btn-brand"><i class="bi bi-file-earmark-excel me-1"></i>Export XLSX</a>
</div>

@forelse ($activityReports as $report)
    <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
            <span class="fw-semibold">
                {{ $report['activity']->name }}
                @if ($report['activity']->day)<span class="badge text-bg-light">Day {{ $report['activity']->day }}</span>@endif
            </span>
            <span class="small text-secondary">
                {{ $report['total_admissions'] }} admissions · {{ $report['unique_codes'] }} unique codes · {{ $report['rejected']->count() }} rejections
            </span>
        </div>
        <div class="row g-0">
            <div class="col-lg-8 border-end">
                <div class="table-responsive" style="max-height: 360px;">
                    <table class="table table-sm table-hover align-middle mb-0">
                        <thead class="table-light sticky-top"><tr><th>Code</th><th>Guest</th><th class="text-center">Type</th><th class="text-end">Admitted</th><th>By</th><th>Time</th></tr></thead>
                        <tbody>
                        @forelse ($report['scans'] as $scan)
                            <tr>
                                <td><span class="badge text-bg-secondary">{{ $scan->qrCode?->code }}</span></td>
                                <td class="small">{{ $scan->qrCode?->guest_name }}</td>
                                <td class="text-center small">{{ $scan->qrCode?->type }}</td>
                                <td class="text-end fw-semibold">{{ $scan->admission_count }}</td>
                                <td class="small">{{ $scan->scanner?->name }}</td>
                                <td class="small text-secondary">{{ $scan->created_at->format('d M H:i') }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="6" class="text-center text-secondary py-3">No admissions recorded.</td></tr>
                        @endforelse
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="col-lg-4">
                <div class="p-2 small fw-semibold text-secondary border-bottom">Rejected scans</div>
                <div style="max-height: 330px; overflow-y: auto;">
                    @forelse ($report['rejected'] as $rej)
                        <div class="px-2 py-1 border-bottom small">
                            <span class="badge text-bg-danger-subtle text-danger">{{ $rej->qr_code_raw }}</span>
                            {{ $rej->reason }}
                            <span class="text-secondary">· {{ $rej->created_at->format('d M H:i') }}</span>
                        </div>
                    @empty
                        <div class="p-3 text-secondary small">No rejections 🎉</div>
                    @endforelse
                </div>
            </div>
        </div>
    </div>
@empty
    <div class="alert alert-light border text-center py-5">This event has no activities yet.</div>
@endforelse
@endsection
