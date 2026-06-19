@extends('layouts.app')
@section('title', 'Report - ' . $event->name)
@section('content')
@php
    $maxActivityAdmissions = max(1, $activityChart->max('admissions') ?? 1);
    $stats = [
        ['label' => 'Activities', 'value' => $totals['activities'], 'icon' => 'bi-list-check', 'tone' => 'bg-teal-50 text-teal-700'],
        ['label' => 'Admissions', 'value' => $totals['admissions'], 'icon' => 'bi-person-check', 'tone' => 'bg-emerald-50 text-emerald-700'],
        ['label' => 'Scans', 'value' => $totals['scans'], 'icon' => 'bi-qr-code-scan', 'tone' => 'bg-slate-100 text-slate-700'],
        ['label' => 'Unique codes', 'value' => $totals['unique_codes'], 'icon' => 'bi-fingerprint', 'tone' => 'bg-red-50 text-red-600'],
        ['label' => 'Rejections', 'value' => $totals['rejections'], 'icon' => 'bi-shield-exclamation', 'tone' => 'bg-amber-50 text-amber-700'],
    ];
@endphp

<div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
        <a href="{{ route('reports.index') }}" class="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-slate-500 no-underline hover:text-red-600">
            <i class="bi bi-arrow-left"></i> Reports
        </a>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">Attendance report</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">{{ $event->name }}</h1>
        <p class="mt-1 text-sm font-semibold text-slate-500">
            {{ $event->start_date->format('d M Y') }}
            @if ($event->end_date) - {{ $event->end_date->format('d M Y') }} @endif
            <span class="mx-2">-</span>{{ $event->location }}
        </p>
    </div>
    <a href="{{ route('reports.export', $event) }}" class="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-black text-white no-underline shadow-lg shadow-red-500/20 transition hover:bg-red-600">
        <i class="bi bi-file-earmark-excel"></i> Export XLSX
    </a>
</div>

<div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    @foreach ($stats as $stat)
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <div class="text-3xl font-black text-slate-950">{{ $stat['value'] }}</div>
                    <div class="mt-1 text-sm font-bold text-slate-500">{{ $stat['label'] }}</div>
                </div>
                <span class="grid h-11 w-11 place-items-center rounded-lg {{ $stat['tone'] }}">
                    <i class="bi {{ $stat['icon'] }} text-lg"></i>
                </span>
            </div>
        </div>
    @endforeach
</div>

<div class="mb-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-5">
            <h2 class="text-lg font-black text-slate-950">Activity admissions</h2>
            <p class="text-sm font-semibold text-slate-500">Admissions and rejection pressure by activity</p>
        </div>
        <div class="space-y-4">
            @forelse ($activityChart as $item)
                @php $width = max(3, round(($item['admissions'] / $maxActivityAdmissions) * 100)); @endphp
                <div>
                    <div class="mb-2 flex items-center justify-between gap-3">
                        <div class="truncate text-sm font-extrabold text-slate-800">{{ $item['name'] }}</div>
                        <div class="shrink-0 text-xs font-black text-slate-500">{{ $item['admissions'] }} admitted</div>
                    </div>
                    <div class="h-3 overflow-hidden rounded-lg bg-slate-100">
                        <div class="h-full rounded-lg bg-emerald-500" style="width: {{ $width }}%"></div>
                    </div>
                    <div class="mt-1 text-xs font-bold text-amber-600">{{ $item['rejections'] }} rejected scans</div>
                </div>
            @empty
                <div class="rounded-lg bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">No activity report data yet.</div>
            @endforelse
        </div>
    </section>

    <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-5 py-4">
            <h2 class="text-lg font-black text-slate-950">Recent scans</h2>
            <p class="text-sm font-semibold text-slate-500">Latest admissions for this event</p>
        </div>
        <div class="max-h-[420px] overflow-auto">
            <table class="min-w-full divide-y divide-slate-100">
                <thead class="sticky top-0 bg-slate-50">
                    <tr>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Code</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Guest</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Activity</th>
                        <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Guests</th>
                        <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Time</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                    @forelse ($recentScans as $scan)
                        <tr class="hover:bg-slate-50">
                            <td class="px-5 py-4"><span class="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{{ $scan->qrCode?->code }}</span></td>
                            <td class="px-5 py-4 text-sm font-bold text-slate-800">{{ $scan->qrCode?->guest_name }}</td>
                            <td class="px-5 py-4 text-sm font-semibold text-slate-500">{{ $scan->activity?->name }}</td>
                            <td class="px-5 py-4 text-right text-sm font-black text-slate-900">{{ $scan->admission_count }}</td>
                            <td class="px-5 py-4 text-sm font-semibold text-slate-500">{{ $scan->created_at->format('d M H:i') }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="px-5 py-10 text-center text-sm font-semibold text-slate-500">No admissions recorded.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </section>
</div>

@forelse ($activityReports as $report)
    <section class="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <h2 class="text-lg font-black text-slate-950">
                    {{ $report['activity']->name }}
                    @if ($report['activity']->day)
                        <span class="ml-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">Day {{ $report['activity']->day }}</span>
                    @endif
                </h2>
                <p class="mt-1 text-sm font-semibold text-slate-500">
                    {{ $report['total_admissions'] }} admissions, {{ $report['unique_codes'] }} unique codes, {{ $report['rejected']->count() }} rejections
                </p>
            </div>
        </div>
        <div class="grid lg:grid-cols-[1fr_360px]">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-100">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Code</th>
                            <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Guest</th>
                            <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Type</th>
                            <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Admitted</th>
                            <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">By</th>
                            <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Time</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">
                        @forelse ($report['scans'] as $scan)
                            <tr class="hover:bg-slate-50">
                                <td class="px-5 py-4"><span class="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{{ $scan->qrCode?->code }}</span></td>
                                <td class="px-5 py-4 text-sm font-bold text-slate-800">{{ $scan->qrCode?->guest_name }}</td>
                                <td class="px-5 py-4 text-center text-sm font-semibold text-slate-500">{{ $scan->qrCode?->type }}</td>
                                <td class="px-5 py-4 text-right text-sm font-black text-slate-900">{{ $scan->admission_count }}</td>
                                <td class="px-5 py-4 text-sm font-semibold text-slate-500">{{ $scan->scanner?->name }}</td>
                                <td class="px-5 py-4 text-sm font-semibold text-slate-500">{{ $scan->created_at->format('d M H:i') }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="6" class="px-5 py-10 text-center text-sm font-semibold text-slate-500">No admissions recorded.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
            <aside class="border-t border-slate-100 bg-slate-50 p-5 lg:border-l lg:border-t-0">
                <h3 class="text-sm font-black uppercase tracking-wide text-slate-500">Rejected scans</h3>
                <div class="mt-4 max-h-80 space-y-3 overflow-y-auto">
                    @forelse ($report['rejected'] as $rej)
                        <div class="rounded-lg border border-amber-100 bg-white p-3">
                            <div class="flex items-start justify-between gap-3">
                                <span class="rounded-lg bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">{{ $rej->qr_code_raw }}</span>
                                <span class="shrink-0 text-xs font-bold text-slate-400">{{ $rej->created_at->format('d M H:i') }}</span>
                            </div>
                            <p class="mt-2 text-sm font-semibold text-slate-600">{{ $rej->reason }}</p>
                        </div>
                    @empty
                        <div class="rounded-lg bg-white p-6 text-center text-sm font-semibold text-slate-500">No rejections recorded.</div>
                    @endforelse
                </div>
            </aside>
        </div>
    </section>
@empty
    <div class="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-sm">
        This event has no activities yet.
    </div>
@endforelse
@endsection
