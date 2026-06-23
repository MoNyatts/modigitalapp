@extends('layouts.app')
@section('title', 'Contacts')
@section('content')

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">Communication</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">Contacts</h1>
        <p class="mt-1 text-sm font-semibold text-slate-500">{{ $contacts->total() }} contact(s) total</p>
    </div>
    <div class="flex flex-wrap gap-2">
        <a href="{{ route('communication.contacts.template') }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 no-underline hover:border-teal-300 hover:text-teal-700">
            <i class="bi bi-download"></i> Template
        </a>
        <button type="button" onclick="document.getElementById('import-dialog').showModal()" class="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-black text-white hover:bg-red-600">
            <i class="bi bi-upload"></i> Import contacts
        </button>
        <a href="{{ route('communication.messages') }}" class="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800">
            <i class="bi bi-send"></i> Send message
        </a>
    </div>
</div>

{{-- Group filter --}}
@if ($groups->isNotEmpty())
<div class="mb-4 flex flex-wrap gap-2">
    <a href="{{ route('communication.contacts') }}" class="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-bold {{ !request('group') ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 hover:bg-slate-50' }}">All</a>
    @foreach ($groups as $group)
        <a href="{{ route('communication.contacts', ['group' => $group]) }}" class="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-bold {{ request('group') === $group ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 hover:bg-slate-50' }}">{{ $group }}</a>
    @endforeach
</div>
@endif

<div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <table class="min-w-full divide-y divide-slate-100">
        <thead class="bg-slate-50">
            <tr>
                <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Name</th>
                <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Phone</th>
                <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Email</th>
                <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Group</th>
                <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
            @forelse ($contacts as $contact)
                <tr class="hover:bg-slate-50">
                    <td class="px-5 py-3 font-black text-slate-900">{{ $contact->name }}</td>
                    <td class="px-5 py-3 text-sm font-semibold text-slate-600">{{ $contact->phone ?: '-' }}</td>
                    <td class="px-5 py-3 text-sm font-semibold text-slate-600">{{ $contact->email ?: '-' }}</td>
                    <td class="px-5 py-3">
                        @if ($contact->group_tag)
                            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">{{ $contact->group_tag }}</span>
                        @else
                            <span class="text-slate-400">-</span>
                        @endif
                    </td>
                    <td class="px-5 py-3 text-right">
                        <form method="POST" action="{{ route('communication.contacts.delete', $contact) }}" onsubmit="return confirm('Delete this contact?')">
                            @csrf @method('DELETE')
                            <button class="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-extrabold text-red-600 hover:bg-red-50"><i class="bi bi-trash"></i></button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr><td colspan="5" class="px-5 py-12 text-center text-sm font-semibold text-slate-500">No contacts yet. Import a spreadsheet to get started.</td></tr>
            @endforelse
        </tbody>
    </table>
    @if ($contacts->hasPages())
        <div class="border-t border-slate-100 px-5 py-3">{{ $contacts->links() }}</div>
    @endif
</div>

@if ($contacts->total() > 0)
<div class="mt-4">
    <form method="POST" action="{{ route('communication.contacts.deleteAll') }}" onsubmit="return confirm('Delete {{ request('group') ? 'all contacts in this group' : 'ALL contacts' }}? This cannot be undone.')">
        @csrf @method('DELETE')
        @if (request('group'))
            <input type="hidden" name="group" value="{{ request('group') }}">
        @endif
        <button class="text-sm font-bold text-red-500 hover:text-red-700">
            <i class="bi bi-trash me-1"></i>Delete {{ request('group') ? 'group' : 'all contacts' }}
        </button>
    </form>
</div>
@endif

{{-- Import Dialog --}}
<dialog id="import-dialog" class="w-full max-w-lg rounded-lg p-0 backdrop:bg-slate-950/60">
    <form method="POST" action="{{ route('communication.contacts.import') }}" enctype="multipart/form-data" class="bg-white">
        @csrf
        <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
                <h2 class="text-xl font-black text-slate-950">Import contacts</h2>
                <p class="mt-1 text-sm font-semibold text-slate-500">Upload an Excel/CSV file with columns: NAME, PHONE, EMAIL, GROUP</p>
            </div>
            <button type="button" onclick="document.getElementById('import-dialog').close()" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="px-6 py-5 space-y-4">
            <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <i class="bi bi-file-earmark-spreadsheet text-3xl text-slate-400"></i>
                <p class="mt-2 text-sm font-semibold text-slate-500">Excel (.xlsx, .xls) or CSV</p>
                <input type="file" name="sheet" accept=".xlsx,.xls,.csv" required class="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-black file:text-slate-700">
            </div>
            <p class="text-xs font-semibold text-slate-400">
                <a href="{{ route('communication.contacts.template') }}" class="text-red-500 no-underline hover:underline">Download template</a> to see the required format.
            </p>
        </div>
        <footer class="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button type="button" onclick="document.getElementById('import-dialog').close()" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-white">Cancel</button>
            <button class="rounded-lg bg-red-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600">Import</button>
        </footer>
    </form>
</dialog>

@endsection
