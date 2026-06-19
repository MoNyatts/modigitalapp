@extends('layouts.app')
@section('title', 'Events')
@section('content')
@php
    $activityTotal = $events->getCollection()->sum('activities_count');
    $qrTotal = $events->getCollection()->sum('qr_codes_count');
@endphp

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">Event operations</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">Events</h1>
        <p class="mt-1 text-sm font-semibold text-slate-500">Create events, review activity coverage, and open QR batches.</p>
    </div>
    <button type="button" onclick="document.getElementById('event-create-modal').showModal()"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600">
        <i class="bi bi-plus-lg"></i> New event
    </button>
</div>

<div class="mb-6 grid gap-4 sm:grid-cols-3">
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-3xl font-black text-slate-950">{{ $events->total() }}</div>
        <div class="mt-1 text-sm font-bold text-slate-500">Total events</div>
    </div>
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-3xl font-black text-teal-700">{{ $activityTotal }}</div>
        <div class="mt-1 text-sm font-bold text-slate-500">Activities on page</div>
    </div>
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-3xl font-black text-red-600">{{ $qrTotal }}</div>
        <div class="mt-1 text-sm font-bold text-slate-500">QR codes on page</div>
    </div>
</div>

<section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h2 class="text-lg font-black text-slate-950">Event list</h2>
            <p class="text-sm font-semibold text-slate-500">Open an event to manage activities, staff, and QR codes.</p>
        </div>
        <a href="{{ route('events.index') }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-600 no-underline transition hover:border-red-200 hover:text-red-600">
            <i class="bi bi-arrow-clockwise"></i> Clear filters
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
                    <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
                @forelse ($events as $event)
                    <tr class="hover:bg-slate-50">
                        <td class="px-5 py-4">
                            <a href="{{ route('events.show', $event) }}" class="font-black text-slate-900 no-underline hover:text-red-600">{{ $event->name }}</a>
                            <div class="text-xs font-semibold text-slate-400">{{ $event->invited_guests ?: 0 }} invited guests</div>
                        </td>
                        <td class="px-5 py-4 text-sm font-semibold text-slate-600">{{ $event->location }}</td>
                        <td class="px-5 py-4 text-sm font-semibold text-slate-600">
                            {{ $event->start_date->format('d M Y') }}
                            @if ($event->is_multi_day && $event->end_date) - {{ $event->end_date->format('d M Y') }} @endif
                        </td>
                        <td class="px-5 py-4 text-center text-sm font-black text-slate-900">{{ $event->activities_count }}</td>
                        <td class="px-5 py-4 text-center text-sm font-black text-slate-900">{{ $event->qr_codes_count }}</td>
                        <td class="px-5 py-4">
                            <div class="flex justify-end gap-2">
                                <button type="button" onclick="document.getElementById('event-edit-{{ $event->id }}').showModal()"
                                        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700 transition hover:border-red-200 hover:text-red-600">
                                    <i class="bi bi-pencil"></i> Edit
                                </button>
                                <a href="{{ route('qrcodes.index', $event) }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700 no-underline transition hover:border-red-200 hover:text-red-600">
                                    <i class="bi bi-qr-code"></i> QR
                                </a>
                                <form method="POST" action="{{ route('events.destroy', $event) }}" onsubmit="return confirm('Delete this event and all related data?');">
                                    @csrf @method('DELETE')
                                    <button class="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-extrabold text-red-600 transition hover:bg-red-50">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </form>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="6" class="px-5 py-10 text-center text-sm font-semibold text-slate-500">No events yet. Create your first event.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <footer class="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm font-semibold text-slate-500">
            Showing {{ $events->firstItem() ?? 0 }} to {{ $events->lastItem() ?? 0 }} of {{ $events->total() }} events
        </div>
        @if ($events->hasPages())
            <div>{{ $events->links() }}</div>
        @endif
    </footer>
</section>

@include('events.form', ['event' => new \App\Models\Event(), 'dialogId' => 'event-create-modal'])
@foreach ($events as $event)
    @include('events.form', ['event' => $event, 'dialogId' => 'event-edit-' . $event->id])
@endforeach
@endsection
