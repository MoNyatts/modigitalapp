@extends('layouts.app')
@section('title', 'Upcoming Events')
@section('content')
@php
    $stats = [
        ['label' => 'This week', 'value' => $eventsThisWeek, 'icon' => 'bi-calendar-week', 'tone' => 'bg-red-50 text-red-600'],
        ['label' => 'This month', 'value' => $eventsThisMonth, 'icon' => 'bi-calendar3', 'tone' => 'bg-teal-50 text-teal-700'],
        ['label' => 'Guest capacity', 'value' => $guestCapacity, 'icon' => 'bi-people', 'tone' => 'bg-emerald-50 text-emerald-700'],
        ['label' => 'Listed events', 'value' => $events->total(), 'icon' => 'bi-list-check', 'tone' => 'bg-slate-100 text-slate-700'],
    ];
@endphp

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">Schedule</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">Upcoming events</h1>
        <p class="mt-1 text-sm font-semibold text-slate-500">Future events separated from the dashboard for cleaner planning.</p>
    </div>
    <button type="button" onclick="document.getElementById('upcoming-event-create-modal').showModal()" class="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600">
        <i class="bi bi-plus-lg"></i> New event
    </button>
</div>

<div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    @foreach ($stats as $stat)
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <div class="text-3xl font-black text-slate-950">{{ $stat['value'] }}</div>
                    <div class="mt-1 text-sm font-bold text-slate-500">{{ $stat['label'] }}</div>
                </div>
                <span class="grid h-12 w-12 place-items-center rounded-lg {{ $stat['tone'] }}">
                    <i class="bi {{ $stat['icon'] }} text-xl"></i>
                </span>
            </div>
        </div>
    @endforeach
</div>

<section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h2 class="text-lg font-black text-slate-950">Event schedule</h2>
            <p class="text-sm font-semibold text-slate-500">Open an event to manage activities, scanners, and QR inventory.</p>
        </div>
        <a href="{{ route('events.index') }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-600 no-underline transition hover:border-red-200 hover:text-red-600">
            <i class="bi bi-calendar-event"></i> All events
        </a>
    </div>

    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100">
            <thead class="bg-slate-50">
                <tr>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Event</th>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Location</th>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Date</th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Activities</th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">QR codes</th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Staff</th>
                    <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
                @forelse ($events as $event)
                    @php
                        $daysAway = now()->startOfDay()->diffInDays($event->start_date->copy()->startOfDay(), false);
                    @endphp
                    <tr class="hover:bg-slate-50">
                        <td class="px-5 py-4">
                            <a href="{{ route('events.show', $event) }}" class="font-black text-slate-900 no-underline hover:text-red-600">{{ $event->name }}</a>
                            <div class="text-xs font-semibold text-slate-400">{{ (int) $event->guest_count }} guests from QR capacity</div>
                        </td>
                        <td class="px-5 py-4 text-sm font-semibold text-slate-600">{{ $event->location }}</td>
                        <td class="px-5 py-4">
                            <div class="text-sm font-black text-slate-900">
                                {{ $event->start_date->format('d M Y') }}
                                @if ($event->is_multi_day && $event->end_date) - {{ $event->end_date->format('d M Y') }} @endif
                            </div>
                            <div class="text-xs font-semibold {{ $daysAway == 0 ? 'text-red-600' : 'text-slate-400' }}">
                                {{ $daysAway == 0 ? 'Today' : $daysAway . ' day' . ($daysAway == 1 ? '' : 's') . ' away' }}
                            </div>
                        </td>
                        <td class="px-5 py-4 text-center text-sm font-black text-slate-900">{{ $event->activities_count }}</td>
                        <td class="px-5 py-4 text-center text-sm font-black text-slate-900">{{ $event->qr_codes_count }}</td>
                        <td class="px-5 py-4 text-center text-sm font-black text-slate-900">{{ $event->assigned_users_count }}</td>
                        <td class="px-5 py-4">
                            <div class="flex justify-end gap-2">
                                <a href="{{ route('events.show', $event) }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700 no-underline transition hover:border-red-200 hover:text-red-600">
                                    <i class="bi bi-eye"></i> Open
                                </a>
                                <a href="{{ route('qrcodes.index', $event) }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700 no-underline transition hover:border-red-200 hover:text-red-600">
                                    <i class="bi bi-qr-code"></i> QR
                                </a>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="7" class="px-5 py-12 text-center text-sm font-semibold text-slate-500">No upcoming events. Create an event to start planning.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <footer class="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm font-semibold text-slate-500">
            Showing {{ $events->firstItem() ?? 0 }} to {{ $events->lastItem() ?? 0 }} of {{ $events->total() }} upcoming events
        </div>
        @if ($events->hasPages())
            <div>{{ $events->links() }}</div>
        @endif
    </footer>
</section>

@include('events.form', ['event' => new \App\Models\Event(), 'dialogId' => 'upcoming-event-create-modal'])
@endsection
