@php $isEdit = $event->exists; @endphp

<dialog id="{{ $dialogId }}" class="w-full max-w-3xl rounded-lg p-0 backdrop:bg-slate-950/60">
    <form method="POST" action="{{ $isEdit ? route('events.update', $event) : route('events.store') }}" class="bg-white">
        @csrf
        @if ($isEdit) @method('PUT') @endif

        <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
                <h2 class="text-xl font-black text-slate-950">{{ $isEdit ? 'Edit event' : 'Create event' }}</h2>
                <p class="mt-1 text-sm font-semibold text-slate-500">{{ $isEdit ? $event->name : 'Add event details and expected guest count.' }}</p>
            </div>
            <button type="button" onclick="document.getElementById('{{ $dialogId }}').close()" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="space-y-4 px-6 py-5">
            <label class="block">
                <span class="mb-2 block text-sm font-extrabold text-slate-700">Event name</span>
                <input type="text" name="name" value="{{ old('name', $event->name) }}" required
                       class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
            </label>

            <label class="block">
                <span class="mb-2 block text-sm font-extrabold text-slate-700">Description</span>
                <textarea name="description" rows="3"
                          class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">{{ old('description', $event->description) }}</textarea>
            </label>

            <label class="block">
                <span class="mb-2 block text-sm font-extrabold text-slate-700">Location</span>
                <input type="text" name="location" value="{{ old('location', $event->location) }}" required
                       class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
            </label>

            <div class="grid gap-4 md:grid-cols-3">
                <label class="block">
                    <span class="mb-2 block text-sm font-extrabold text-slate-700">Start date</span>
                    <input type="date" name="start_date" value="{{ old('start_date', $event->start_date?->toDateString()) }}" required
                           class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                </label>
                <label class="block">
                    <span class="mb-2 block text-sm font-extrabold text-slate-700">Start time</span>
                    <input type="time" name="start_time" value="{{ old('start_time', $event->start_time ? substr($event->start_time, 0, 5) : null) }}"
                           class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                </label>
                <label class="block" id="{{ $dialogId }}-enddate-wrap" style="{{ old('is_multi_day', $event->is_multi_day) ? '' : 'display:none' }}">
                    <span class="mb-2 block text-sm font-extrabold text-slate-700">End date</span>
                    <input type="date" name="end_date" value="{{ old('end_date', $event->end_date?->toDateString()) }}"
                           class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                </label>
                <label class="block">
                    <span class="mb-2 block text-sm font-extrabold text-slate-700">Invited guests</span>
                    <input type="number" name="invited_guests" min="0" value="{{ old('invited_guests', $event->invited_guests) }}"
                           class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                </label>
            </div>

            <label class="flex items-center gap-2 text-sm font-extrabold text-slate-700">
                <input type="hidden" name="is_multi_day" value="0">
                <input type="checkbox" name="is_multi_day" value="1" class="rounded border-slate-300"
                       id="{{ $dialogId }}-multiday"
                       {{ old('is_multi_day', $event->is_multi_day) ? 'checked' : '' }}>
                Multi-day event
            </label>
            <script>
                (function(){
                    var cb = document.getElementById('{{ $dialogId }}-multiday');
                    var wrap = document.getElementById('{{ $dialogId }}-enddate-wrap');
                    if(cb && wrap){
                        cb.addEventListener('change', function(){ wrap.style.display = this.checked ? '' : 'none'; });
                    }
                })();
            </script>
        </div>

        <footer class="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button type="button" onclick="document.getElementById('{{ $dialogId }}').close()" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-white">
                Cancel
            </button>
            <button class="rounded-lg bg-red-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600">
                {{ $isEdit ? 'Save changes' : 'Create event' }}
            </button>
        </footer>
    </form>
</dialog>
