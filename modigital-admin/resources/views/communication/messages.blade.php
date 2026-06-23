@extends('layouts.app')
@section('title', 'Messaging')
@section('content')

{{-- Page header --}}
<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">Communication</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">Messaging</h1>
    </div>
    <div class="flex flex-wrap items-center gap-2">
        @if ($balance !== null)
            <span class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
                <i class="bi bi-coin"></i> {{ number_format($balance, 2) }} SMS credits
            </span>
        @endif
        <a href="{{ route('communication.contacts') }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 no-underline hover:border-red-300 hover:text-red-600">
            <i class="bi bi-people"></i> Contacts
        </a>
    </div>
</div>

<div class="grid gap-8 xl:grid-cols-[1.4fr_1fr]">

{{-- ══════════════════════════════════════════════════════════ COMPOSE FORM ══ --}}
<section>
<form method="POST" action="{{ route('communication.compose') }}" enctype="multipart/form-data" id="compose-form" class="space-y-4">
    @csrf

    {{-- ── Step 1: Channel ─────────────────────────────────────────────────── --}}
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="mb-3 text-xs font-extrabold uppercase tracking-widest text-slate-400">Step 1 — Channel</p>
        <div class="flex gap-2">
            @foreach ([
                'sms'      => ['SMS',       'bi-phone',     'peer-checked:bg-blue-500   peer-checked:border-blue-500   peer-checked:text-white', 'border-blue-500   text-blue-600'],
                'whatsapp' => ['WhatsApp',  'bi-whatsapp',  'peer-checked:bg-green-500  peer-checked:border-green-500  peer-checked:text-white', 'border-green-500  text-green-600'],
                'both'     => ['Both',      'bi-broadcast', 'peer-checked:bg-purple-500 peer-checked:border-purple-500 peer-checked:text-white', 'border-purple-500 text-purple-600'],
            ] as $val => [$lbl, $ico, $chk, $ring])
            <label class="flex-1 cursor-pointer">
                <input type="radio" name="channel" value="{{ $val }}"
                       {{ old('channel','sms') === $val ? 'checked' : '' }}
                       class="peer sr-only" onchange="toggleAttachment()">
                <span class="flex flex-col items-center gap-1 rounded-xl border-2 border-slate-200 py-3 text-slate-500 transition {{ $chk }}">
                    <i class="bi {{ $ico }} text-xl"></i>
                    <span class="text-xs font-black">{{ $lbl }}</span>
                </span>
            </label>
            @endforeach
        </div>
    </div>

    {{-- ── Step 2: Recipients ───────────────────────────────────────────────── --}}
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="mb-3 text-xs font-extrabold uppercase tracking-widest text-slate-400">Step 2 — Recipients</p>

        {{-- Tab switcher --}}
        <div class="mb-4 flex rounded-lg border border-slate-200 bg-slate-50 p-1 gap-1">
            <button type="button" onclick="switchTab('manual')"   id="tab-manual"   class="tab-btn flex-1 rounded-md py-2 text-xs font-black transition">
                <i class="bi bi-keyboard me-1"></i>Enter numbers
            </button>
            <button type="button" onclick="switchTab('contacts')" id="tab-contacts" class="tab-btn flex-1 rounded-md py-2 text-xs font-black transition">
                <i class="bi bi-person-check me-1"></i>Contacts
            </button>
            @if($groups->isNotEmpty())
            <button type="button" onclick="switchTab('group')"    id="tab-group"    class="tab-btn flex-1 rounded-md py-2 text-xs font-black transition">
                <i class="bi bi-collection me-1"></i>Group
            </button>
            @endif
        </div>

        {{-- Panel: Manual numbers (tag input) --}}
        <div id="panel-manual" class="tab-panel">
            <p class="mb-2 text-xs font-semibold text-slate-500">Type a number and press <kbd class="rounded border border-slate-200 bg-slate-100 px-1 text-slate-600">Enter</kbd> or <kbd class="rounded border border-slate-200 bg-slate-100 px-1 text-slate-600">,</kbd> to add it.</p>

            {{-- Tags display --}}
            <div id="number-tags" class="mb-2 flex min-h-[40px] flex-wrap gap-1.5"></div>

            {{-- Hidden textarea that stores comma-separated numbers for submission --}}
            <input type="hidden" name="manual_numbers" id="manual_numbers_hidden">

            {{-- Tag input --}}
            <div class="flex gap-2">
                <input type="tel" id="number-input" placeholder="+255 700 000 001"
                       class="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                <button type="button" onclick="addNumberFromInput()"
                        class="h-10 rounded-lg bg-slate-900 px-4 text-sm font-black text-white hover:bg-slate-700">
                    <i class="bi bi-plus-lg"></i>
                </button>
            </div>
            <p id="manual-count" class="mt-2 text-xs font-semibold text-slate-400"></p>
        </div>

        {{-- Panel: Contacts --}}
        <div id="panel-contacts" class="tab-panel hidden">
            <input type="text" id="contact-search" placeholder="Search contacts…" oninput="filterContacts()"
                   class="mb-3 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100">
            <div class="mb-2 flex items-center justify-between">
                <span id="contacts-count" class="text-xs font-bold text-slate-400"></span>
                <button type="button" onclick="toggleSelectAll()" id="select-all-btn"
                        class="text-xs font-extrabold text-red-500 hover:text-red-700">Select all</button>
            </div>
            <div id="contacts-list" class="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                @php $allContacts = \App\Models\Contact::orderBy('name')->get(); @endphp
                @forelse ($allContacts as $contact)
                    <label class="contact-row flex cursor-pointer items-center gap-3 border-b border-slate-200/70 px-3 py-2.5 last:border-0 hover:bg-white"
                           data-name="{{ strtolower($contact->name) }}" data-phone="{{ $contact->phone }}">
                        <input type="checkbox" name="contact_ids[]" value="{{ $contact->id }}"
                               onchange="updateContactsCount()"
                               {{ in_array($contact->id, (array) old('contact_ids', []), true) ? 'checked' : '' }}
                               class="h-4 w-4 rounded border-slate-300 text-red-500 accent-red-500">
                        <span class="min-w-0 flex-1">
                            <span class="block truncate text-sm font-black text-slate-800">{{ $contact->name }}</span>
                            <span class="text-xs font-semibold text-slate-500">{{ $contact->phone ?: $contact->email ?: '—' }}</span>
                        </span>
                        @if($contact->group_tag)
                            <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">{{ $contact->group_tag }}</span>
                        @endif
                    </label>
                @empty
                    <p class="px-3 py-6 text-center text-sm font-semibold text-slate-500">
                        No contacts yet. <a href="{{ route('communication.contacts') }}" class="text-red-500 no-underline hover:underline">Import contacts</a> first.
                    </p>
                @endforelse
            </div>
        </div>

        {{-- Panel: Group --}}
        @if($groups->isNotEmpty())
        <div id="panel-group" class="tab-panel hidden">
            <div class="space-y-2">
                @foreach($groups as $group)
                @php $cnt = \App\Models\Contact::where('group_tag', $group)->count(); @endphp
                <label class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 has-[:checked]:border-red-300 has-[:checked]:bg-red-50">
                    <input type="radio" name="group_tag" value="{{ $group }}"
                           {{ old('group_tag') === $group ? 'checked' : '' }}
                           class="h-4 w-4 accent-red-500">
                    <span class="flex-1 text-sm font-black text-slate-800">{{ $group }}</span>
                    <span class="text-xs font-extrabold text-slate-500">{{ $cnt }} contact{{ $cnt !== 1 ? 's' : '' }}</span>
                </label>
                @endforeach
            </div>
        </div>
        @endif

    </div>

    {{-- ── Step 3: Message ─────────────────────────────────────────────────── --}}
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
            <p class="text-xs font-extrabold uppercase tracking-widest text-slate-400">Step 3 — Message</p>
            <span id="char-counter" class="text-xs font-extrabold text-slate-400">0 / 160</span>
        </div>
        <textarea name="body" id="msg-body" rows="5" required maxlength="1600"
                  oninput="updateCounter()"
                  placeholder="Type your message here…"
                  class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold leading-relaxed outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">{{ old('body') }}</textarea>
        <p id="sms-segments" class="mt-1 text-xs font-semibold text-slate-400"></p>
    </div>

    {{-- ── Step 4: Attachment (WhatsApp only) ─────────────────────────────── --}}
    <div id="attachment-section" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" style="display:none">
        <div class="mb-3 flex items-center justify-between">
            <p class="text-xs font-extrabold uppercase tracking-widest text-slate-400">Step 4 — Attachment <span class="normal-case font-semibold text-slate-400">(optional)</span></p>
        </div>
        <p class="mb-3 text-sm font-semibold text-slate-500">Attach a file for WhatsApp recipients. Images, PDFs, and documents accepted.</p>
        <label class="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 p-4 text-center hover:border-red-300 hover:bg-red-50/30 transition">
            <i class="bi bi-paperclip text-xl text-slate-400"></i>
            <div class="text-left">
                <p class="text-sm font-black text-slate-700">Click to attach a file</p>
                <p class="text-xs font-semibold text-slate-400">Images, PDF, DOC — max 10 MB</p>
            </div>
            <input type="file" name="attachment" accept="image/*,.pdf,.doc,.docx" class="sr-only"
                   onchange="showFileName(this)">
        </label>
        <p id="file-name" class="mt-2 hidden text-xs font-semibold text-emerald-600"><i class="bi bi-check-circle-fill me-1"></i><span></span></p>
    </div>

    {{-- Validation errors --}}
    @error('contact_ids')
        <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <i class="bi bi-exclamation-triangle me-2"></i>{{ $message }}
        </div>
    @enderror

    {{-- Send button --}}
    <button type="submit"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3.5 text-sm font-black text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600 active:scale-[.99]">
        <i class="bi bi-send"></i> Send message
    </button>
</form>
</section>

{{-- ══════════════════════════════════════════════════════════ MESSAGE HISTORY ══ --}}
<section>
    <h2 class="mb-4 text-lg font-black text-slate-950">Sent messages</h2>
    <div class="space-y-3">
        @forelse ($messages as $msg)
            @php
                $statusMap = [
                    'done'    => ['bg-emerald-50 text-emerald-700', 'bi-check-circle-fill'],
                    'sending' => ['bg-blue-50 text-blue-700',    'bi-arrow-repeat'],
                    'failed'  => ['bg-red-50 text-red-700',      'bi-x-circle-fill'],
                    'pending' => ['bg-amber-50 text-amber-700',  'bi-clock'],
                ];
                $chanIcon  = ['sms' => 'bi-phone', 'whatsapp' => 'bi-whatsapp', 'both' => 'bi-broadcast'];
                [$stCls, $stIco] = $statusMap[$msg->status] ?? ['bg-slate-100 text-slate-600', 'bi-question'];
            @endphp
            <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-2">
                        <span class="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
                            <i class="bi {{ $chanIcon[$msg->channel] ?? 'bi-send' }}"></i>
                        </span>
                        <div>
                            <span class="text-sm font-black text-slate-900">{{ ucfirst($msg->channel) }}</span>
                            <p class="text-xs font-semibold text-slate-400">{{ $msg->created_at->format('d M Y H:i') }}</p>
                        </div>
                    </div>
                    <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black {{ $stCls }}">
                        <i class="bi {{ $stIco }}"></i> {{ ucfirst($msg->status) }}
                    </span>
                </div>
                <p class="mt-3 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-600">{{ $msg->body }}</p>
                <div class="mt-3 flex items-center gap-3 text-xs font-bold">
                    <span class="text-emerald-600"><i class="bi bi-check2 me-0.5"></i>{{ $msg->sent_count }} sent</span>
                    @if($msg->failed_count > 0)
                        <span class="text-red-500"><i class="bi bi-x me-0.5"></i>{{ $msg->failed_count }} failed</span>
                    @endif
                    <span class="ml-auto text-slate-400">{{ $msg->recipient_count }} total</span>
                </div>
                @if ($msg->attachment_name)
                    <p class="mt-2 text-xs font-semibold text-slate-500"><i class="bi bi-paperclip me-1"></i>{{ $msg->attachment_name }}</p>
                @endif
                <a href="{{ route('communication.messages.show', $msg) }}"
                   class="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-red-500 no-underline hover:text-red-700">
                    View recipients <i class="bi bi-arrow-right"></i>
                </a>
            </div>
        @empty
            <div class="rounded-xl border border-dashed border-slate-200 py-14 text-center">
                <i class="bi bi-chat-dots text-4xl text-slate-200"></i>
                <p class="mt-3 text-sm font-semibold text-slate-400">No messages sent yet.</p>
            </div>
        @endforelse
    </div>
    @if ($messages->hasPages())
        <div class="mt-4">{{ $messages->links() }}</div>
    @endif
</section>

</div>{{-- /grid --}}

<script>
// ── Tab switcher ──────────────────────────────────────────────────────────────
function switchTab(name) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
        b.classList.add('text-slate-500');
    });
    document.getElementById('panel-' + name).classList.remove('hidden');
    const btn = document.getElementById('tab-' + name);
    btn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
    btn.classList.remove('text-slate-500');
}
switchTab('manual');

// ── Manual number tag input ───────────────────────────────────────────────────
const numbers = [];

function renderTags() {
    const container = document.getElementById('number-tags');
    container.innerHTML = numbers.map((n, i) => `
        <span class="inline-flex items-center gap-1 rounded-full bg-slate-900 pl-3 pr-1 py-1 text-xs font-black text-white">
            ${n}
            <button type="button" onclick="removeNumber(${i})"
                    class="ml-0.5 grid h-4 w-4 place-items-center rounded-full bg-white/20 hover:bg-white/40">
                <i class="bi bi-x text-xs"></i>
            </button>
        </span>`).join('');
    document.getElementById('manual_numbers_hidden').value = numbers.join(',');
    const cnt = document.getElementById('manual-count');
    cnt.textContent = numbers.length ? numbers.length + ' number' + (numbers.length > 1 ? 's' : '') + ' added' : '';
}

function addNumber(raw) {
    const n = raw.replace(/[\s\-\(\)]/g, '').trim();
    if (!n) return;
    if (!numbers.includes(n)) {
        numbers.push(n);
        renderTags();
    }
}

function removeNumber(i) { numbers.splice(i, 1); renderTags(); }

function addNumberFromInput() {
    const inp = document.getElementById('number-input');
    addNumber(inp.value);
    inp.value = '';
    inp.focus();
}

document.getElementById('number-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addNumberFromInput();
    }
});

// ── Contact search & select-all ───────────────────────────────────────────────
function filterContacts() {
    const q = document.getElementById('contact-search').value.toLowerCase();
    document.querySelectorAll('.contact-row').forEach(row => {
        const match = row.dataset.name.includes(q) || (row.dataset.phone || '').includes(q);
        row.style.display = match ? '' : 'none';
    });
}

let allSelected = false;
function toggleSelectAll() {
    allSelected = !allSelected;
    document.querySelectorAll('.contact-row input[type=checkbox]').forEach(cb => {
        if (cb.closest('.contact-row').style.display !== 'none') cb.checked = allSelected;
    });
    document.getElementById('select-all-btn').textContent = allSelected ? 'Deselect all' : 'Select all';
    updateContactsCount();
}

function updateContactsCount() {
    const checked = document.querySelectorAll('.contact-row input:checked').length;
    document.getElementById('contacts-count').textContent = checked ? checked + ' selected' : '';
}
updateContactsCount();

// ── Character counter ─────────────────────────────────────────────────────────
function updateCounter() {
    const len  = document.getElementById('msg-body').value.length;
    const segs = Math.ceil(len / 160) || 1;
    document.getElementById('char-counter').textContent = len + ' / 160';
    const segEl = document.getElementById('sms-segments');
    if (len > 160) {
        segEl.textContent = segs + ' SMS segments (' + len + ' chars)';
        segEl.className = 'mt-1 text-xs font-semibold text-amber-500';
    } else {
        segEl.textContent = (160 - len) + ' characters remaining';
        segEl.className = 'mt-1 text-xs font-semibold text-slate-400';
    }
}
updateCounter();

// ── Attachment toggle ─────────────────────────────────────────────────────────
function toggleAttachment() {
    const channel = document.querySelector('input[name=channel]:checked')?.value;
    const show = channel === 'whatsapp' || channel === 'both';
    document.getElementById('attachment-section').style.display = show ? '' : 'none';
}
toggleAttachment();

// ── File name preview ─────────────────────────────────────────────────────────
function showFileName(input) {
    const el = document.getElementById('file-name');
    if (input.files.length) {
        el.querySelector('span').textContent = input.files[0].name;
        el.classList.remove('hidden');
    }
}
</script>

@endsection
