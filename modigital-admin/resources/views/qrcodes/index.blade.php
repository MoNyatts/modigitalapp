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
        <button type="button" onclick="document.getElementById('qr-upload-modal').showModal()" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-red-200 hover:text-red-600">
            <i class="bi bi-upload"></i> Upload sheet
        </button>
        <a href="{{ route('qrcodes.download', $event) }}" class="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white no-underline shadow-lg shadow-red-500/20 transition hover:bg-red-600">
            <i class="bi bi-download"></i> Download PNG ZIP
        </a>
    </div>
</div>

<dialog id="qr-upload-modal" class="w-full max-w-2xl rounded-lg p-0 backdrop:bg-slate-950/60">
    <form method="POST" action="{{ route('qrcodes.upload', $event) }}" enctype="multipart/form-data" class="bg-white">
        @csrf
        <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
                <h2 class="text-xl font-black text-slate-950">Upload guest sheet</h2>
                <p class="mt-1 text-sm font-semibold text-slate-500">{{ $event->name }}</p>
            </div>
            <button type="button" onclick="document.getElementById('qr-upload-modal').close()" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="space-y-4 px-6 py-5">
            <label class="block">
                <span class="mb-2 block text-sm font-extrabold text-slate-700">Guest sheet file</span>
                <input type="file" name="sheet" accept=".xlsx,.xls,.csv" required
                       class="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-black file:text-slate-700">
                <span class="mt-2 block text-xs font-semibold text-slate-500">
                    Required columns: CODE NO and NAME. Optional column: PHONE. S = single, D = double, M5/M10 = group sizes.
                </span>
            </label>

            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div class="text-sm font-black text-slate-800">Before upload</div>
                <div class="mt-1 text-sm font-semibold text-slate-500">Download the sample sheet, keep the column names, then upload the completed guest list to generate QR hashes.</div>
                <a href="{{ route('qrcodes.template') }}" class="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 no-underline transition hover:border-red-200 hover:text-red-600">
                    <i class="bi bi-file-earmark-spreadsheet"></i> Download sample sheet
                </a>
            </div>
        </div>

        <footer class="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button type="button" onclick="document.getElementById('qr-upload-modal').close()" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-white">
                Cancel
            </button>
            <button class="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600">
                <i class="bi bi-upload"></i> Import sheet
            </button>
        </footer>
    </form>
</dialog>

<section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
            <h2 class="text-lg font-black text-slate-950">Imported codes</h2>
            <p class="text-sm font-semibold text-slate-500">Search, select, download, validate, or remove guest codes.</p>
        </div>
        <form method="GET" action="{{ route('qrcodes.index', $event) }}" class="flex w-full max-w-xl gap-2">
            <label class="relative min-w-0 flex-1">
                <span class="sr-only">Search QR codes</span>
                <i class="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="search" name="search" value="{{ $search }}" placeholder="Code, guest, phone, or QR hash"
                       class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
            </label>
            <button class="rounded-lg bg-slate-900 px-4 text-sm font-black text-white hover:bg-slate-800">Search</button>
            @if ($search !== '')
                <a href="{{ route('qrcodes.index', $event) }}" class="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-slate-500 no-underline hover:border-red-200 hover:text-red-600" title="Clear search">
                    <i class="bi bi-x-lg"></i>
                </a>
            @endif
        </form>
    </div>

    <form id="qr-bulk-form" method="POST" action="{{ route('qrcodes.bulk', $event) }}" class="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center" onsubmit="return confirmQrBulkAction(this);">
        @csrf
        <div class="text-sm font-black text-slate-700"><span id="selected-qr-count">0</span> selected</div>
        <select name="action" required class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 outline-none focus:border-red-400">
            <option value="">Choose action</option>
            <option value="download">Download PNG ZIP</option>
            <option value="validate">Validate</option>
            <option value="invalidate">Invalidate</option>
            <option value="delete">Delete</option>
        </select>
        <button class="h-10 rounded-lg bg-red-500 px-4 text-sm font-black text-white hover:bg-red-600">Apply</button>
        <p class="text-xs font-semibold text-slate-500 sm:ml-auto">Selections apply to codes visible on this page.</p>
    </form>

    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100">
            <thead class="bg-slate-50">
                <tr>
                    <th class="w-12 px-5 py-3 text-left">
                        <input id="select-all-qr" type="checkbox" class="rounded border-slate-300" aria-label="Select all QR codes on this page">
                    </th>
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
                        <td class="px-5 py-4">
                            <input type="checkbox" name="qr_code_ids[]" value="{{ $qr->id }}" form="qr-bulk-form" class="qr-row-checkbox rounded border-slate-300" aria-label="Select {{ $qr->code }} for bulk action">
                        </td>
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
                            <div class="flex justify-end gap-2">
                                <a href="{{ route('qrcodes.download-one', [$event, $qr]) }}" class="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 no-underline transition hover:border-red-200 hover:text-red-600" title="Download PNG">
                                    <i class="bi bi-download"></i>
                                </a>
                                <form method="POST" action="{{ route('qrcodes.invalidate', [$event, $qr]) }}">
                                    @csrf @method('PATCH')
                                    <button class="rounded-lg border px-3 py-2 text-sm font-extrabold transition {{ $qr->is_valid ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' }}">
                                        {{ $qr->is_valid ? 'Invalidate' : 'Re-validate' }}
                                    </button>
                                </form>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="8" class="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                        @if ($search !== '')
                            No QR codes match “{{ $search }}”.
                        @else
                            No QR codes yet. Download the sample sheet, fill it, and upload it above.
                        @endif
                    </td></tr>
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

<script>
    (function () {
        var selectAll = document.getElementById('select-all-qr');
        var checkboxes = Array.from(document.querySelectorAll('.qr-row-checkbox'));
        var count = document.getElementById('selected-qr-count');

        function updateSelection() {
            var selected = checkboxes.filter(function (checkbox) { return checkbox.checked; }).length;
            count.textContent = selected;
            if (selectAll) {
                selectAll.checked = checkboxes.length > 0 && selected === checkboxes.length;
                selectAll.indeterminate = selected > 0 && selected < checkboxes.length;
            }
        }

        if (selectAll) {
            selectAll.addEventListener('change', function () {
                checkboxes.forEach(function (checkbox) { checkbox.checked = selectAll.checked; });
                updateSelection();
            });
        }
        checkboxes.forEach(function (checkbox) { checkbox.addEventListener('change', updateSelection); });

        window.confirmQrBulkAction = function (form) {
            var selected = checkboxes.filter(function (checkbox) { return checkbox.checked; }).length;
            var action = form.elements.namedItem('action').value;
            if (selected === 0) {
                alert('Select at least one QR code.');
                return false;
            }
            if (!action) {
                alert('Choose an action.');
                return false;
            }
            return action !== 'delete' || confirm('Delete the selected QR codes and their scan history?');
        };
    })();
</script>
@endsection
