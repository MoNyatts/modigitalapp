@extends('layouts.app')
@section('title', 'Reports')
@section('content')
@php
    $maxAdmissions = max(1, $topEvents->max('total_admissions') ?? 1);
    $stats = [
        ['label' => 'Events', 'value' => $summary['events'], 'icon' => 'bi-calendar-event', 'tone' => 'bg-red-50 text-red-600'],
        ['label' => 'Activities', 'value' => $summary['activities'], 'icon' => 'bi-list-check', 'tone' => 'bg-teal-50 text-teal-700'],
        ['label' => 'QR codes', 'value' => $summary['qr_codes'], 'icon' => 'bi-qr-code', 'tone' => 'bg-slate-100 text-slate-700'],
        ['label' => 'Admissions', 'value' => $summary['admissions'], 'icon' => 'bi-person-check', 'tone' => 'bg-emerald-50 text-emerald-700'],
        ['label' => 'Rejections', 'value' => $summary['rejections'], 'icon' => 'bi-shield-exclamation', 'tone' => 'bg-amber-50 text-amber-700'],
    ];
@endphp

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">Analytics</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">Reports</h1>
        <p class="mt-1 text-sm font-semibold text-slate-500">Compare event performance and export admission registers.</p>
    </div>
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

<section class="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
            <h2 class="text-lg font-black text-slate-950">Top admissions by event</h2>
            <p class="text-sm font-semibold text-slate-500">Quick comparison across recent event reports</p>
        </div>
        <span class="text-sm font-bold text-slate-400">{{ $summary['admissions'] }} total admissions</span>
    </div>
    <div class="space-y-4">
        @forelse ($topEvents as $event)
            @php $width = max(3, round(($event->total_admissions / $maxAdmissions) * 100)); @endphp
            <div>
                <div class="mb-2 flex items-center justify-between gap-4">
                    <div class="truncate text-sm font-extrabold text-slate-800">{{ $event->name }}</div>
                    <div class="shrink-0 text-xs font-black text-slate-500">{{ $event->total_admissions }} admitted</div>
                </div>
                <div class="h-3 overflow-hidden rounded-lg bg-slate-100">
                    <div class="h-full rounded-lg bg-red-500" style="width: {{ $width }}%"></div>
                </div>
            </div>
        @empty
            <div class="rounded-lg bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">No admissions yet.</div>
        @endforelse
    </div>
</section>

<section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="border-b border-slate-100 px-5 py-4">
        <h2 class="text-lg font-black text-slate-950">Event reports</h2>
        <p class="text-sm font-semibold text-slate-500">Open a detailed report or export the XLSX workbook.</p>
    </div>
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100">
            <thead class="bg-slate-50">
                <tr>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Event</th>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Date</th>
                    <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">QR</th>
                    <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Admissions</th>
                    <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Rejected</th>
                    <th class="px-5 py-3"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
                @forelse ($events as $event)
                    <tr class="hover:bg-slate-50">
                        <td class="px-5 py-4">
                            <div class="font-black text-slate-900">{{ $event->name }}</div>
                            <div class="text-sm font-semibold text-slate-500">{{ $event->activities_count }} activities</div>
                        </td>
                        <td class="px-5 py-4 text-sm font-semibold text-slate-500">{{ $event->start_date->format('d M Y') }}</td>
                        <td class="px-5 py-4 text-right text-sm font-black text-slate-900">{{ $event->qr_codes_count }}</td>
                        <td class="px-5 py-4 text-right text-sm font-black text-emerald-700">{{ $event->total_admissions }}</td>
                        <td class="px-5 py-4 text-right text-sm font-black text-amber-700">{{ $event->rejected_scans_count }}</td>
                        <td class="px-5 py-4">
                            <div class="flex justify-end gap-2">
                                <a href="{{ route('reports.show', $event) }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700 no-underline transition hover:border-red-200 hover:text-red-600">
                                    <i class="bi bi-eye"></i> View
                                </a>
                                <a href="{{ route('reports.export', $event) }}" class="inline-flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm font-extrabold text-white no-underline transition hover:bg-red-600">
                                    <i class="bi bi-file-earmark-excel"></i> Export
                                </a>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="6" class="px-5 py-10 text-center text-sm font-semibold text-slate-500">No events yet.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
</section>
@endsection
