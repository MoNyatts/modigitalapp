@extends('layouts.app')
@section('title', 'QR Codes - ' . $event->name)
@section('content')
<div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
        <a href="{{ route('events.show', $event) }}" class="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-slate-500 no-underline hover:text-red-600">
            <i class="bi bi-arrow-left"></i> {{ $event->name }}
        </a>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">QR inventory</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">QR Codes</h1>
        <p class="mt-1 text-sm font-semibold text-slate-500">Upload guest sheets, validate codes, and download printable PNG bundles.</p>
    </div>
    <div class="flex flex-wrap gap-2">
        <a href="{{ route('qrcodes.template') }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 no-underline transition hover:border-red-200 hover:text-red-600">
            <i class="bi bi-file-earmark-spreadsheet"></i> Sample sheet
        </a>
        <a href="{{ route('qrcodes.download', $event) }}" class="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white no-underline shadow-lg shadow-red-500/20 transition hover:bg-red-600">
            <i class="bi bi-download"></i> Download PNG ZIP
        </a>
    </div>
</div>

<section class="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <form method="POST" action="{{ route('qrcodes.upload', $event) }}" enctype="multipart/form-data" class="grid gap-4 lg:grid-cols-[1fr_220px] lg:items-end">
        @csrf
        <label class="block">
            <span class="mb-2 block text-sm font-extrabold text-slate-700">Upload guest sheet (.xlsx, .xls, .csv)</span>
            <input type="file" name="sheet" accept=".xlsx,.xls,.csv" required
                   class="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-black file:text-slate-700">
            <span class="mt-2 block text-xs font-semibold text-slate-500">
                Required columns: CODE NO and NAME. Optional column: PHONE. S = single, D = double, M5/M10 = group sizes.
            </span>
        </label>
        <button class="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600">
            <i class="bi bi-upload"></i> Import sheet
        </button>
    </form>
</section>

<section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h2 class="text-lg font-black text-slate-950">Imported codes</h2>
            <p class="text-sm font-semibold text-slate-500">Toggle validity when a code should no longer admit guests.</p>
        </div>
        <a href="{{ route('qrcodes.index', $event) }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-600 no-underline transition hover:border-red-200 hover:text-red-600">
            <i class="bi bi-arrow-clockwise"></i> Clear filters
        </a>
    </div>
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100">
            <thead class="bg-slate-50">
                <tr>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Code</th>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Guest</th>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Phone</th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Type</th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Used / Max</th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Status</th>
                    <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
                @forelse ($qrCodes as $qr)
                    <tr class="{{ $qr->is_valid ? 'hover:bg-slate-50' : 'bg-slate-50 text-slate-400' }}">
                        <td class="px-5 py-4"><span class="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{{ $qr->code }}</span></td>
                        <td class="px-5 py-4 text-sm font-bold text-slate-800">{{ $qr->guest_name }}</td>
                        <td class="px-5 py-4 text-sm font-semibold text-slate-500">{{ $qr->phone_number ?: '-' }}</td>
                        <td class="px-5 py-4 text-center text-sm font-black text-slate-800">{{ $qr->type }}</td>
                        <td class="px-5 py-4 text-center text-sm font-black text-slate-800">{{ (int) $qr->used }} / {{ $qr->max_admissions }}</td>
                        <td class="px-5 py-4 text-center">
                            <span class="rounded-lg px-2 py-1 text-xs font-black {{ $qr->is_valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700' }}">
                                {{ $qr->is_valid ? 'Valid' : 'Invalidated' }}
                            </span>
                        </td>
                        <td class="px-5 py-4">
                            <form method="POST" action="{{ route('qrcodes.invalidate', [$event, $qr]) }}" class="flex justify-end">
                                @csrf @method('PATCH')
                                <button class="rounded-lg border px-3 py-2 text-sm font-extrabold transition {{ $qr->is_valid ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' }}">
                                    {{ $qr->is_valid ? 'Invalidate' : 'Re-validate' }}
                                </button>
                            </form>
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="7" class="px-5 py-10 text-center text-sm font-semibold text-slate-500">No QR codes yet. Download the sample sheet, fill it, and upload it above.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <footer class="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm font-semibold text-slate-500">
            Showing {{ $qrCodes->firstItem() ?? 0 }} to {{ $qrCodes->lastItem() ?? 0 }} of {{ $qrCodes->total() }} QR codes
        </div>
        @if ($qrCodes->hasPages())
            <div>{{ $qrCodes->links() }}</div>
        @endif
    </footer>
</section>
@endsection
