@extends('layouts.app')
@section('title', 'Admissions')
@section('content')
@php
    $stats = [
        ['label' => 'Admissions today', 'value' => $admissionsToday, 'icon' => 'bi-person-check', 'tone' => 'bg-emerald-50 text-emerald-700'],
        ['label' => 'Scans today', 'value' => $scanCountToday, 'icon' => 'bi-qr-code-scan', 'tone' => 'bg-red-50 text-red-600'],
        ['label' => 'Active scanners', 'value' => $scannerCountToday, 'icon' => 'bi-phone', 'tone' => 'bg-teal-50 text-teal-700'],
        ['label' => 'Total admissions', 'value' => $admissionsTotal, 'icon' => 'bi-graph-up-arrow', 'tone' => 'bg-slate-100 text-slate-700'],
    ];
@endphp

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-red-500">Arrival feed</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">Recent admissions</h1>
        <p class="mt-1 text-sm font-semibold text-slate-500">Latest successful scans from every event and scanner device.</p>
    </div>
    <a href="{{ route('admissions.index') }}" class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 no-underline transition hover:border-red-200 hover:text-red-600">
        <i class="bi bi-arrow-clockwise"></i> Refresh
    </a>
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
            <h2 class="text-lg font-black text-slate-950">Admission log</h2>
            <p class="text-sm font-semibold text-slate-500">Newest scan records are listed first.</p>
        </div>
        <a href="{{ route('reports.index') }}" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-600 no-underline transition hover:border-red-200 hover:text-red-600">
            <i class="bi bi-bar-chart"></i> Reports
        </a>
    </div>

    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100">
            <thead class="bg-slate-50">
                <tr>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Code</th>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Guest</th>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Event / Activity</th>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Scanner</th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Type</th>
                    <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Guests</th>
                    <th class="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Time</th>
                    <th class="px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
                @forelse ($recentScans as $scan)
                    <tr class="hover:bg-slate-50">
                        <td class="px-5 py-4">
                            <span class="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{{ $scan->qrCode?->code ?: '-' }}</span>
                        </td>
                        <td class="px-5 py-4 text-sm font-bold text-slate-800">{{ $scan->qrCode?->guest_name ?: 'Unknown guest' }}</td>
                        <td class="px-5 py-4 text-sm font-bold text-slate-800">
                            {{ $scan->activity?->event?->name ?: 'Unknown event' }}
                            <div class="text-xs font-semibold text-slate-400">{{ $scan->activity?->name ?: 'No activity' }}</div>
                        </td>
                        <td class="px-5 py-4">
                            <div class="text-sm font-bold text-slate-800">{{ $scan->scanner?->name ?: 'Unknown scanner' }}</div>
                            <div class="text-xs font-semibold text-slate-400">{{ $scan->scanner?->email }}</div>
                        </td>
                        <td class="px-5 py-4 text-center">
                            <span class="rounded-lg bg-red-50 px-2 py-1 text-xs font-black text-red-600">{{ $scan->qrCode?->type ?: '-' }}</span>
                        </td>
                        <td class="px-5 py-4 text-right text-sm font-black text-slate-900">{{ $scan->admission_count }}</td>
                        <td class="px-5 py-4 text-sm font-semibold text-slate-500">
                            {{ $scan->created_at->format('d M Y H:i') }}
                            <div class="text-xs text-slate-400">{{ $scan->created_at->diffForHumans() }}</div>
                        </td>
                        <td class="px-5 py-4">
                            <div class="flex justify-end gap-2">
                                @if ($scan->activity?->event)
                                    <a href="{{ route('reports.show', $scan->activity->event) }}" class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700 no-underline transition hover:border-red-200 hover:text-red-600">
                                        <i class="bi bi-eye"></i>
                                    </a>
                                @else
                                    <span class="rounded-lg border border-slate-100 px-3 py-2 text-sm font-extrabold text-slate-300"><i class="bi bi-eye"></i></span>
                                @endif
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="8" class="px-5 py-12 text-center text-sm font-semibold text-slate-500">No admissions yet. Successful scans will appear here.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <footer class="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm font-semibold text-slate-500">
            Showing {{ $recentScans->firstItem() ?? 0 }} to {{ $recentScans->lastItem() ?? 0 }} of {{ $recentScans->total() }} admissions
        </div>
        @if ($recentScans->hasPages())
            <div>{{ $recentScans->links() }}</div>
        @endif
    </footer>
</section>
@endsection
