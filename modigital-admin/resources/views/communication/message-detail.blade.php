@extends('layouts.app')
@section('title', 'Message Detail')
@section('content')

@php
    $statusColors = [
        'done'    => 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'sending' => 'bg-blue-50 text-blue-700 border-blue-200',
        'failed'  => 'bg-red-50 text-red-700 border-red-200',
        'pending' => 'bg-amber-50 text-amber-700 border-amber-200',
    ];
    $channelIcons = ['sms' => 'bi-phone', 'whatsapp' => 'bi-whatsapp', 'both' => 'bi-broadcast'];
    $pivotColors  = ['sent' => 'text-emerald-600', 'failed' => 'text-red-500', 'pending' => 'text-amber-500'];
@endphp

{{-- Breadcrumb --}}
<div class="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
    <a href="{{ route('communication.messages') }}" class="text-red-500 no-underline hover:underline">Messaging</a>
    <i class="bi bi-chevron-right text-xs"></i>
    <span>Message #{{ $message->id }}</span>
</div>

<div class="grid gap-8 xl:grid-cols-[1fr_2fr]">

    {{-- ── Left: Message Summary ── --}}
    <div class="space-y-5">
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="mb-4 text-lg font-black text-slate-950">Message details</h2>

            <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between gap-3">
                    <span class="font-extrabold text-slate-500">Channel</span>
                    <span class="flex items-center gap-1.5 font-black text-slate-800">
                        <i class="bi {{ $channelIcons[$message->channel] ?? 'bi-send' }}"></i>
                        {{ ucfirst($message->channel) }}
                    </span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="font-extrabold text-slate-500">Status</span>
                    <span class="rounded-full border px-2.5 py-0.5 text-xs font-black {{ $statusColors[$message->status] ?? 'bg-slate-100 text-slate-600 border-slate-200' }}">
                        {{ ucfirst($message->status) }}
                    </span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="font-extrabold text-slate-500">Sent by</span>
                    <span class="font-bold text-slate-700">{{ $message->sender?->name ?? '—' }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span class="font-extrabold text-slate-500">Date</span>
                    <span class="font-bold text-slate-700">{{ $message->created_at->format('d M Y H:i') }}</span>
                </div>
                <div class="flex items-start justify-between gap-3">
                    <span class="font-extrabold text-slate-500 pt-0.5">Recipients</span>
                    <span class="text-right font-bold text-slate-700">
                        {{ $message->sent_count }}/{{ $message->recipient_count }} sent
                        @if($message->failed_count > 0)
                            <br><span class="text-red-500">{{ $message->failed_count }} failed</span>
                        @endif
                    </span>
                </div>
                @if ($message->beem_request_id)
                    <div class="flex items-center justify-between gap-3">
                        <span class="font-extrabold text-slate-500">Beem Request ID</span>
                        <code class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{{ $message->beem_request_id }}</code>
                    </div>
                @endif
                @if ($message->attachment_name)
                    <div class="flex items-center justify-between gap-3">
                        <span class="font-extrabold text-slate-500">Attachment</span>
                        <span class="font-bold text-slate-700 text-right">
                            <i class="bi bi-paperclip me-1 text-slate-400"></i>{{ $message->attachment_name }}
                        </span>
                    </div>
                @endif
            </div>
        </div>

        {{-- Progress bar --}}
        @if ($message->recipient_count > 0)
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 class="mb-3 text-sm font-black text-slate-900">Delivery progress</h3>
            @php
                $pct     = round($message->sent_count / $message->recipient_count * 100);
                $failPct = round($message->failed_count / $message->recipient_count * 100);
            @endphp
            <div class="mb-2 h-3 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full bg-emerald-400" style="width:{{ $pct }}%"></div>
            </div>
            <div class="flex justify-between text-xs font-bold text-slate-500">
                <span>{{ $pct }}% delivered</span>
                @if ($message->failed_count > 0)
                    <span class="text-red-500">{{ $failPct }}% failed</span>
                @endif
            </div>
        </div>
        @endif

        {{-- Message body --}}
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 class="mb-3 text-sm font-black text-slate-900">Message body</h3>
            <p class="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700">{{ $message->body }}</p>
            <p class="mt-2 text-xs text-slate-400">{{ mb_strlen($message->body) }} characters</p>
        </div>

        <a href="{{ route('communication.messages') }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 no-underline hover:bg-slate-50">
            <i class="bi bi-arrow-left"></i> Back to messaging
        </a>
    </div>

    {{-- ── Right: Recipient list ── --}}
    <div>
        <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-lg font-black text-slate-950">Recipients ({{ $message->contacts->count() }})</h2>
            @if ($message->contacts->where('pivot.status', 'failed')->count() > 0)
                <span class="text-xs font-bold text-red-500">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    {{ $message->contacts->where('pivot.status', 'failed')->count() }} failed
                </span>
            @endif
        </div>

        <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table class="min-w-full divide-y divide-slate-100">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Name</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Phone</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Group</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Status</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Sent at</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    @forelse ($message->contacts as $contact)
                        @php $pivot = $contact->pivot; @endphp
                        <tr class="hover:bg-slate-50 {{ $pivot->status === 'failed' ? 'bg-red-50/40' : '' }}">
                            <td class="px-5 py-3 font-black text-slate-900">{{ $contact->name }}</td>
                            <td class="px-5 py-3 text-sm font-semibold text-slate-600">{{ $contact->phone ?: '—' }}</td>
                            <td class="px-5 py-3">
                                @if ($contact->group_tag)
                                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">{{ $contact->group_tag }}</span>
                                @else
                                    <span class="text-slate-400">—</span>
                                @endif
                            </td>
                            <td class="px-5 py-3">
                                <span class="inline-flex items-center gap-1 text-sm font-extrabold {{ $pivotColors[$pivot->status] ?? 'text-slate-500' }}">
                                    @if ($pivot->status === 'sent')
                                        <i class="bi bi-check-circle-fill"></i>
                                    @elseif ($pivot->status === 'failed')
                                        <i class="bi bi-x-circle-fill"></i>
                                    @else
                                        <i class="bi bi-clock"></i>
                                    @endif
                                    {{ ucfirst($pivot->status) }}
                                </span>
                                @if ($pivot->status === 'failed' && $pivot->error)
                                    <p class="mt-0.5 text-xs font-semibold text-red-500" title="{{ $pivot->error }}">
                                        {{ Str::limit($pivot->error, 60) }}
                                    </p>
                                @endif
                            </td>
                            <td class="px-5 py-3 text-sm font-semibold text-slate-500">
                                {{ $pivot->sent_at ? \Carbon\Carbon::parse($pivot->sent_at)->format('H:i d/m') : '—' }}
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="px-5 py-10 text-center text-sm font-semibold text-slate-500">No recipients found.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

</div>

@endsection
