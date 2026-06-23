@php
    $isEdit = $user->exists;
    $assignedIds = $isEdit ? $user->assignedEvents->pluck('id')->all() : [];
@endphp

<dialog id="{{ $dialogId }}" class="w-full max-w-3xl rounded-lg p-0 backdrop:bg-slate-950/60">
    <form method="POST"
          action="{{ $isEdit ? route('users.update', $user) : route('users.store') }}"
          enctype="multipart/form-data"
          class="bg-white">
        @csrf
        @if ($isEdit) @method('PUT') @endif

        <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
                <h2 class="text-xl font-black text-slate-950">{{ $isEdit ? 'Edit user' : 'Add user' }}</h2>
                <p class="mt-1 text-sm font-semibold text-slate-500">{{ $isEdit ? $user->email : 'Create a new admin or scanner account.' }}</p>
            </div>
            <button type="button" onclick="document.getElementById('{{ $dialogId }}').close()" class="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="grid gap-5 px-6 py-5 md:grid-cols-[160px_1fr]">
            <div>
                <label class="mb-2 block text-sm font-extrabold text-slate-700">Profile photo</label>
                <div class="mb-3 grid h-32 w-32 place-items-center overflow-hidden rounded-lg bg-slate-100 text-3xl font-black text-slate-400">
                    @if ($isEdit && $user->profilePhotoUrl())
                        <img src="{{ $user->profilePhotoUrl() }}" alt="{{ $user->name }}" class="h-full w-full object-cover">
                    @else
                        {{ $isEdit ? strtoupper(substr($user->name, 0, 1)) : 'MD' }}
                    @endif
                </div>
                <input type="file" name="profile_photo" accept="image/*" class="block w-full text-sm font-semibold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-black file:text-slate-700">
                @if ($isEdit && $user->profile_photo_path)
                    <label class="mt-3 flex items-center gap-2 text-sm font-bold text-red-600">
                        <input type="checkbox" name="remove_profile_photo" value="1" class="rounded border-slate-300">
                        Remove photo
                    </label>
                @endif
            </div>

            <div class="space-y-4">
                <div class="grid gap-4 sm:grid-cols-2">
                    <label class="block">
                        <span class="mb-2 block text-sm font-extrabold text-slate-700">Name</span>
                        <input type="text" name="name" value="{{ old('name', $user->name) }}" required
                               class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                    </label>
                    <label class="block">
                        <span class="mb-2 block text-sm font-extrabold text-slate-700">Email</span>
                        <input type="email" name="email" value="{{ old('email', $user->email) }}" required
                               class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                    </label>
                </div>

                <div class="grid gap-4 sm:grid-cols-3">
                    <label class="block sm:col-span-1">
                        <span class="mb-2 block text-sm font-extrabold text-slate-700">Password</span>
                        <input type="password" name="password" {{ $isEdit ? '' : 'required' }}
                               class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100"
                               placeholder="{{ $isEdit ? 'Leave blank' : 'Min 8 chars' }}">
                    </label>
                    <label class="block">
                        <span class="mb-2 block text-sm font-extrabold text-slate-700">Role</span>
                        <select name="role" class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100">
                            <option value="staff" {{ old('role', $user->role ?: 'staff') === 'staff' ? 'selected' : '' }}>Staff scanner</option>
                            <option value="guest" {{ old('role', $user->role) === 'guest' ? 'selected' : '' }}>Guest</option>
                            <option value="admin" {{ old('role', $user->role) === 'admin' ? 'selected' : '' }}>Admin</option>
                        </select>
                    </label>
                    <label class="flex items-end gap-2 pb-2 text-sm font-extrabold text-slate-700">
                        <input type="hidden" name="scanner_enabled" value="0">
                        <input type="checkbox" name="scanner_enabled" value="1" class="rounded border-slate-300"
                               {{ old('scanner_enabled', $isEdit ? $user->scanner_enabled : true) ? 'checked' : '' }}>
                        Scanner access
                    </label>
                </div>

                <div>
                    <div class="mb-2 text-sm font-extrabold text-slate-700">Assigned events</div>
                    <div class="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                        @forelse ($events as $event)
                            <label class="flex items-center justify-between gap-3 border-b border-slate-200/70 py-2 last:border-0">
                                <span>
                                    <span class="block text-sm font-bold text-slate-800">{{ $event->name }}</span>
                                    <span class="text-xs font-semibold text-slate-500">{{ $event->start_date->format('d M Y') }}</span>
                                </span>
                                <input type="checkbox" name="event_ids[]" value="{{ $event->id }}" class="rounded border-slate-300"
                                       {{ in_array($event->id, old('event_ids', $assignedIds), true) ? 'checked' : '' }}>
                            </label>
                        @empty
                            <div class="py-4 text-center text-sm font-semibold text-slate-500">No events created yet.</div>
                        @endforelse
                    </div>
                </div>
            </div>
        </div>

        <footer class="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button type="button" onclick="document.getElementById('{{ $dialogId }}').close()" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-white">
                Cancel
            </button>
            <button class="rounded-lg bg-red-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-600">
                {{ $isEdit ? 'Save changes' : 'Create user' }}
            </button>
        </footer>
    </form>
</dialog>
