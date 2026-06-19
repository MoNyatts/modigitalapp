@php $isEdit = $activity->exists; @endphp

<dialog id="{{ $dialogId }}" class="w-full max-w-2xl rounded-lg p-0 backdrop:bg-slate-950/60">
    <form method="POST" action="{{ $isEdit ? route('activities.update', [$event, $activity]) : route('activities.store', $event) }}" class="bg-white">
        @csrf
        @if ($isEdit) @method('PUT') @endif

        <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
                <h2 class="text-xl font-black text-slate-950">{{ $isEdit ? 'Edit activity' : 'Add activity' }}</h2>
                <p class="mt-1 text-sm font-semibold text-slate-500">{{ $event->name }}</p>
            </div>
            <button type="button" onclick="document.getElementById('{{ $dialogId }}').close()" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="space-y-4 px-6 py-5">
            <label class="block">
                <span class="mb-2 block text-sm font-extrabold text-slate-700">Activity name</span>
                <input type="text" name="name" value="{{ old('name', $activity->name) }}" required
                       class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
            </label>

            <label class="block">
                <span class="mb-2 block text-sm font-extrabold text-slate-700">Description</span>
                <textarea name="description" rows="3"
                          class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">{{ old('description', $activity->description) }}</textarea>
            </label>

            <div class="grid gap-4 sm:grid-cols-3">
                <label class="block">
                    <span class="mb-2 block text-sm font-extrabold text-slate-700">Day</span>
                    <input type="number" min="1" max="60" name="day" value="{{ old('day', $activity->day) }}"
                           class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                </label>
                <label class="block">
                    <span class="mb-2 block text-sm font-extrabold text-slate-700">Start time</span>
                    <input type="time" name="start_time" value="{{ old('start_time', $activity->start_time ? substr($activity->start_time, 0, 5) : null) }}"
                           class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                </label>
                <label class="block">
                    <span class="mb-2 block text-sm font-extrabold text-slate-700">End time</span>
                    <input type="time" name="end_time" value="{{ old('end_time', $activity->end_time ? substr($activity->end_time, 0, 5) : null) }}"
                           class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                </label>
            </div>
        </div>

        <footer class="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button type="button" onclick="document.getElementById('{{ $dialogId }}').close()" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-white">
                Cancel
            </button>
            <button class="rounded-lg bg-red-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600">
                {{ $isEdit ? 'Save changes' : 'Add activity' }}
            </button>
        </footer>
    </form>
</dialog>
