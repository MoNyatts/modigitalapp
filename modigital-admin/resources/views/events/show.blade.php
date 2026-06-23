@extends('layouts.app')
@section('title', $event->name)
@section('content')
@php
    $capacity = $event->invited_guests ?: max(1, $stats['qr_count']);
    $progress = $capacity ? min(100, round(($stats['admissions'] / $capacity) * 100)) : 0;
    $statCards = [
        ['label' => 'Admissions', 'value' => $stats['admissions'], 'tone' => 'bg-emerald-50 text-emerald-700', 'icon' => 'bi-person-check'],
        ['label' => 'QR codes', 'value' => $stats['qr_count'], 'tone' => 'bg-red-50 text-red-600', 'icon' => 'bi-qr-code'],
        ['label' => 'Activities', 'value' => $stats['activities'], 'tone' => 'bg-teal-50 text-teal-700', 'icon' => 'bi-list-check'],
        ['label' => 'Rejections', 'value' => $stats['rejections'], 'tone' => 'bg-amber-50 text-amber-700', 'icon' => 'bi-shield-exclamation'],
    ];
@endphp

<div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
        <a href="{{ route('events.index') }}" class="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-slate-500 no-underline hover:text-red-600">
            <i class="bi bi-arrow-left"></i> Events
        </a>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">Event detail</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">{{ $event->name }}</h1>
        <p class="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
            <i class="bi bi-geo-alt me-1"></i>{{ $event->location }}
            <span class="mx-2">-</span>
            <i class="bi bi-calendar3 me-1"></i>{{ $event->start_date->format('d M Y') }}@if ($event->is_multi_day && $event->end_date) - {{ $event->end_date->format('d M Y') }}@endif
        </p>
    </div>
    <div class="flex flex-wrap gap-2">
        <a href="{{ route('reports.show', $event) }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 no-underline transition hover:border-red-200 hover:text-red-600">
            <i class="bi bi-bar-chart"></i> Report
        </a>
        <a href="{{ route('qrcodes.index', $event) }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 no-underline transition hover:border-red-200 hover:text-red-600">
            <i class="bi bi-qr-code"></i> QR Codes
        </a>
        <button type="button" onclick="document.getElementById('event-edit-modal').showModal()" class="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600">
            <i class="bi bi-pencil"></i> Edit
        </button>
    </div>
</div>

<section class="mb-6 rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
    <div class="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-center">
        <div>
            <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-200">Admission progress</p>
            <div class="mt-3 h-3 overflow-hidden rounded-lg bg-white/10">
                <div class="h-full rounded-lg bg-red-500" style="width: {{ $progress }}%"></div>
            </div>
            <p class="mt-3 text-sm font-bold text-white/70">{{ $stats['admissions'] }} admissions@if ($event->invited_guests) of {{ $event->invited_guests }} invited guests@endif</p>
        </div>
        <div class="rounded-lg border border-white/10 bg-white/10 p-4">
            <div class="text-4xl font-black">{{ $progress }}%</div>
            <div class="mt-1 text-sm font-bold text-white/60">Capacity progress</div>
        </div>
    </div>
</section>

<div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    @foreach ($statCards as $card)
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <div class="text-3xl font-black text-slate-950">{{ $card['value'] }}</div>
                    <div class="mt-1 text-sm font-bold text-slate-500">{{ $card['label'] }}</div>
                </div>
                <span class="grid h-11 w-11 place-items-center rounded-lg {{ $card['tone'] }}"><i class="bi {{ $card['icon'] }} text-lg"></i></span>
            </div>
        </div>
    @endforeach
</div>

<div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 class="text-lg font-black text-slate-950">Activities</h2>
                <p class="text-sm font-semibold text-slate-500">Manage event checkpoints and scan sessions.</p>
            </div>
            <button type="button" onclick="document.getElementById('activity-create-modal').showModal()" class="inline-flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm font-black text-white hover:bg-red-600">
                <i class="bi bi-plus-lg"></i> Add activity
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Activity</th>
                        <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Day</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Time</th>
                        <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Admissions</th>
                        <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Rejected</th>
                        <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                    @forelse ($event->activities as $activity)
                        <tr class="hover:bg-slate-50">
                            <td class="px-5 py-4">
                                <div class="font-black text-slate-900">{{ $activity->name }}</div>
                                @if ($activity->description)<div class="text-sm font-semibold text-slate-500">{{ $activity->description }}</div>@endif
                            </td>
                            <td class="px-5 py-4 text-center text-sm font-black text-slate-700">{{ $activity->day ?: '-' }}</td>
                            <td class="px-5 py-4 text-sm font-semibold text-slate-500">
                                {{ $activity->start_time ? substr($activity->start_time, 0, 5) : '-' }}
                                @if ($activity->end_time) - {{ substr($activity->end_time, 0, 5) }} @endif
                            </td>
                            <td class="px-5 py-4 text-right text-sm font-black text-emerald-700">{{ (int) ($activity->admissions_sum ?? 0) }}</td>
                            <td class="px-5 py-4 text-right text-sm font-black text-amber-700">{{ $activity->rejected_scans_count }}</td>
                            <td class="px-5 py-4">
                                <div class="flex justify-end gap-2">
                                    <button type="button" onclick="document.getElementById('activity-edit-{{ $activity->id }}').showModal()" class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700 hover:border-red-200 hover:text-red-600" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <form method="POST" action="{{ route('activities.duplicate', [$event, $activity]) }}">
                                        @csrf
                                        <button class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700 hover:border-teal-300 hover:text-teal-700" title="Duplicate"><i class="bi bi-copy"></i></button>
                                    </form>
                                    <form method="POST" action="{{ route('activities.destroy', [$event, $activity]) }}" onsubmit="return confirm('Delete this activity and its scan history?');">
                                        @csrf @method('DELETE')
                                        <button class="rounded-lg border border-red-200 px-3 py-2 text-sm font-extrabold text-red-600 hover:bg-red-50" title="Delete"><i class="bi bi-trash"></i></button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="px-5 py-10 text-center text-sm font-semibold text-slate-500">No activities yet. Add one before scanning.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-4">
            <h2 class="text-lg font-black text-slate-950">Assigned scanner staff</h2>
            <p class="text-sm font-semibold text-slate-500">Staff users selected here can scan this event.</p>
        </div>
        <form method="POST" action="{{ route('events.staff', $event) }}" class="space-y-3">
            @csrf
            <div class="max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                @forelse ($staff as $member)
                    <label class="flex items-center justify-between gap-3 border-b border-slate-200/70 py-3 last:border-0">
                        <span>
                            <span class="block text-sm font-black text-slate-800">{{ $member->name }}</span>
                            <span class="text-xs font-semibold text-slate-500">{{ $member->email }}</span>
                            @unless ($member->scanner_enabled)<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-black text-amber-700">scanner off</span>@endunless
                        </span>
                        <input type="checkbox" name="user_ids[]" value="{{ $member->id }}" class="rounded border-slate-300"
                               {{ $event->assignedUsers->contains($member->id) ? 'checked' : '' }}>
                    </label>
                @empty
                    <div class="py-6 text-center text-sm font-semibold text-slate-500">
                        No staff accounts yet. Create them under <a href="{{ route('users.index') }}" class="font-black text-red-600 no-underline">Users</a>.
                    </div>
                @endforelse
            </div>
            @if ($staff->isNotEmpty())
                <button class="w-full rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white hover:bg-red-600">Save assignments</button>
            @endif
        </form>
    </section>
</div>

@include('events.form', ['event' => $event, 'dialogId' => 'event-edit-modal'])

@include('events.activity-form', ['event' => $event, 'activity' => new \App\Models\Activity(), 'dialogId' => 'activity-create-modal'])
@foreach ($event->activities as $activity)
    @include('events.activity-form', ['event' => $event, 'activity' => $activity, 'dialogId' => 'activity-edit-' . $activity->id])
@endforeach
@endsection
