@extends('layouts.app')
@section('title', 'QR Codes — ' . $event->name)
@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-0">QR Codes</h3>
        <span class="text-secondary">{{ $event->name }}</span>
    </div>
    <div>
        <a href="{{ route('qrcodes.download', $event) }}" class="btn btn-outline-secondary"><i class="bi bi-download me-1"></i>Download PNGs (ZIP)</a>
        <a href="{{ route('events.show', $event) }}" class="btn btn-light">Back to event</a>
    </div>
</div>

<div class="card border-0 shadow-sm mb-4">
    <div class="card-body">
        <form method="POST" action="{{ route('qrcodes.upload', $event) }}" enctype="multipart/form-data" class="row g-2 align-items-end">
            @csrf
            <div class="col-md-6">
                <label class="form-label fw-semibold">Upload guest sheet (.xlsx / .csv)</label>
                <input type="file" name="sheet" class="form-control" accept=".xlsx,.xls,.csv" required>
            </div>
            <div class="col-md-3">
                <button class="btn btn-brand w-100"><i class="bi bi-upload me-1"></i>Import</button>
            </div>
            <div class="col-12 small text-secondary">
                Required columns: <code>CODE NO</code> (e.g. S001, D012, M5003) and <code>NAME</code>. Optional: a phone column.
                S = single (1), D = double (2), M5/M10 = group of 5/10. You can upload additional sheets at any time.
            </div>
        </form>
    </div>
</div>

<div class="card border-0 shadow-sm">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr><th>Code</th><th>Guest</th><th>Phone</th><th class="text-center">Type</th><th class="text-center">Used / Max</th><th class="text-center">Status</th><th></th></tr></thead>
            <tbody>
            @forelse ($qrCodes as $qr)
                <tr class="{{ $qr->is_valid ? '' : 'table-secondary' }}">
                    <td><span class="badge text-bg-secondary">{{ $qr->code }}</span></td>
                    <td>{{ $qr->guest_name }}</td>
                    <td class="small">{{ $qr->phone_number }}</td>
                    <td class="text-center">{{ $qr->type }}</td>
                    <td class="text-center">{{ (int) $qr->used }} / {{ $qr->max_admissions }}</td>
                    <td class="text-center">
                        @if ($qr->is_valid)<span class="badge text-bg-success">valid</span>
                        @else<span class="badge text-bg-danger">invalidated</span>@endif
                    </td>
                    <td class="text-end">
                        <form method="POST" action="{{ route('qrcodes.invalidate', [$event, $qr]) }}">
                            @csrf @method('PATCH')
                            <button class="btn btn-sm btn-outline-{{ $qr->is_valid ? 'danger' : 'success' }}">
                                {{ $qr->is_valid ? 'Invalidate' : 'Re-validate' }}
                            </button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr><td colspan="7" class="text-center text-secondary py-5">No QR codes yet — upload a guest sheet above.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
    @if ($qrCodes->hasPages())<div class="card-footer bg-white">{{ $qrCodes->links() }}</div>@endif
</div>
@endsection
