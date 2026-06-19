@extends('layouts.app')
@section('title', 'Dashboard')
@section('content')
@php
    $maxDaily = max(1, $admissionsByDay->max('value') ?? 1);
    $maxEventAdmissions = max(1, $eventPerformance->max('admissions') ?? 1);
    $stats = [
        ['label' => 'Events', 'value' => $eventCount, 'icon' => 'bi-calendar-event', 'tone' => 'bg-red-50 text-red-600 ring-red-100'],
        ['label' => 'QR Codes', 'value' => $guestCount, 'icon' => 'bi-qr-code', 'tone' => 'bg-slate-100 text-slate-700 ring-slate-200'],
        ['label' => 'Admissions today', 'value' => $admissionsToday, 'hint' => $admissionsTotal . ' total', 'icon' => 'bi-person-check', 'tone' => 'bg-emerald-50 text-emerald-700 ring-emerald-100'],
        ['label' => 'Rejections today', 'value' => $rejectionsToday, 'icon' => 'bi-x-octagon', 'tone' => 'bg-amber-50 text-amber-700 ring-amber-100'],
    ];
@endphp

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">Operations</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">Dashboard</h1>
        <p class="mt-1 text-sm font-semibold text-slate-500">Monitor arrivals, QR inventory, and scanner activity.</p>
    </div>
    <button type="button" onclick="document.getElementById('dashboard-event-create-modal').showModal()" class="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600">
        <i class="bi bi-plus-lg"></i> New Event
    </button>
</div>

<div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    @foreach ($stats as $stat)
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <div class="text-3xl font-black text-slate-950">{{ $stat['value'] }}</div>
                    <div class="mt-1 text-sm font-bold text-slate-500">{{ $stat['label'] }}</div>
                    @isset($stat['hint'])
                        <div class="mt-1 text-xs font-bold text-slate-400">{{ $stat['hint'] }}</div>
                    @endisset
                </div>
                <span class="grid h-12 w-12 place-items-center rounded-lg ring-1 {{ $stat['tone'] }}">
                    <i class="bi {{ $stat['icon'] }} text-xl"></i>
                </span>
            </div>
        </div>
    @endforeach
</div>

<div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-5 flex items-center justify-between">
            <div>
                <h2 class="text-lg font-black text-slate-950">Admissions this week</h2>
                <p class="text-sm font-semibold text-slate-500">Daily admitted guest count</p>
            </div>
            <span class="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">{{ $admissionsTotal }} total</span>
        </div>
        <div class="flex h-64 items-end gap-3">
            @foreach ($admissionsByDay as $day)
                @php $height = max(8, round(($day['value'] / $maxDaily) * 100)); @endphp
                <div class="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div class="flex h-52 w-full items-end rounded-lg bg-slate-50 px-2 pb-2">
                        <div class="w-full rounded-lg bg-red-500" style="height: {{ $height }}%"></div>
                    </div>
                    <div class="text-xs font-black text-slate-950">{{ $day['value'] }}</div>
                    <div class="text-xs font-bold text-slate-400">{{ $day['label'] }}</div>
                </div>
            @endforeach
        </div>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-5">
            <h2 class="text-lg font-black text-slate-950">Event performance</h2>
            <p class="text-sm font-semibold text-slate-500">Recent event admissions vs QR inventory</p>
        </div>
        <div class="space-y-4">
            @forelse ($eventPerformance as $event)
                @php $width = max(3, round(($event['admissions'] / $maxEventAdmissions) * 100)); @endphp
                <div>
                    <div class="mb-2 flex items-center justify-between gap-3">
                        <div class="truncate text-sm font-extrabold text-slate-800">{{ $event['name'] }}</div>
                        <div class="shrink-0 text-xs font-black text-slate-500">{{ $event['admissions'] }} admitted</div>
                    </div>
                    <div class="h-3 overflow-hidden rounded-lg bg-slate-100">
                        <div class="h-full rounded-lg bg-emerald-500" style="width: {{ $width }}%"></div>
                    </div>
                    <div class="mt-1 text-xs font-bold text-slate-400">{{ $event['qr_codes'] }} QR codes</div>
                </div>
            @empty
                <div class="rounded-lg bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">No event data yet.</div>
            @endforelse
        </div>
    </section>
</div>

<div class="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-5 py-4">
            <h2 class="text-lg font-black text-slate-950">Recent admissions</h2>
            <p class="text-sm font-semibold text-slate-500">Latest successful scans across all events</p>
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Code</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Guest</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Event / Activity</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">By</th>
                        <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Guests</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Time</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                    @forelse ($recentScans as $scan)
                        <tr class="hover:bg-slate-50">
                            <td class="px-5 py-4"><span class="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{{ $scan->qrCode?->code }}</span></td>
                            <td class="px-5 py-4 text-sm font-bold text-slate-800">{{ $scan->qrCode?->guest_name }}</td>
                            <td class="px-5 py-4 text-sm font-bold text-slate-800">
                                {{ $scan->activity?->event?->name }}
                                <div class="text-xs font-semibold text-slate-400">{{ $scan->activity?->name }}</div>
                            </td>
                            <td class="px-5 py-4 text-sm font-semibold text-slate-500">{{ $scan->scanner?->name }}</td>
                            <td class="px-5 py-4 text-right text-sm font-black text-slate-900">{{ $scan->admission_count }}</td>
                            <td class="px-5 py-4 text-sm font-semibold text-slate-500">{{ $scan->created_at->diffForHumans() }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="px-5 py-10 text-center text-sm font-semibold text-slate-500">No scans yet. Admissions appear here in real time.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-5">
            <h2 class="text-lg font-black text-slate-950">Upcoming events</h2>
            <p class="text-sm font-semibold text-slate-500">Next scheduled experiences</p>
        </div>
        <div class="space-y-3">
            @forelse ($upcomingEvents as $event)
                <a href="{{ route('events.show', $event) }}" class="block rounded-lg border border-slate-100 p-4 no-underline transition hover:border-red-200 hover:bg-red-50/40">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <div class="truncate font-black text-slate-900">{{ $event->name }}</div>
                            <div class="mt-1 text-sm font-semibold text-slate-500"><i class="bi bi-geo-alt me-1"></i>{{ $event->location }}</div>
                        </div>
                        <span class="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{{ $event->start_date->format('d M') }}</span>
                    </div>
                </a>
            @empty
                <div class="rounded-lg bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">No upcoming events.</div>
            @endforelse
        </div>
    </section>
</div>
@include('events.form', ['event' => new \App\Models\Event(), 'dialogId' => 'dashboard-event-create-modal'])
@endsection
