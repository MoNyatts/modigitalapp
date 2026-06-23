<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('assignedEvents')->withCount('assignedEvents')->orderBy('name')->paginate(20);
        $events = Event::orderBy('name')->get();

        return view('users.index', compact('users', 'events'));
    }

    public function create()
    {
        return redirect()->route('users.index');
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['profile_photo_path'] = $this->storeProfilePhoto($request);
        $user = User::create($data);
        $user->assignedEvents()->sync($request->input('event_ids', []));

        return redirect()->route('users.index')->with('status', "User {$user->name} created.");
    }

    public function edit(User $user)
    {
        return redirect()->route('users.index');
    }

    public function update(Request $request, User $user)
    {
        $data = $this->validated($request, $user);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        if ($request->boolean('remove_profile_photo')) {
            $this->deleteProfilePhoto($user);
            $data['profile_photo_path'] = null;
        }

        if ($photoPath = $this->storeProfilePhoto($request)) {
            $this->deleteProfilePhoto($user);
            $data['profile_photo_path'] = $photoPath;
        }

        $user->update($data);
        $user->assignedEvents()->sync($request->input('event_ids', []));

        return redirect()->route('users.index')->with('status', "User {$user->name} updated.");
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return back()->withErrors(['user' => 'You cannot delete your own account.']);
        }

        $this->deleteProfilePhoto($user);
        $user->delete();

        return redirect()->route('users.index')->with('status', 'User deleted.');
    }

    private function validated(Request $request, ?User $user = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user?->id)],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'staff', 'guest'])],
            'scanner_enabled' => ['sometimes', 'boolean'],
            'profile_photo' => ['nullable', 'image', 'max:2048'],
            'remove_profile_photo' => ['sometimes', 'boolean'],
        ]) + ['scanner_enabled' => $request->boolean('scanner_enabled')];

        unset($data['profile_photo'], $data['remove_profile_photo']);

        return $data;
    }

    private function storeProfilePhoto(Request $request): ?string
    {
        return $request->hasFile('profile_photo')
            ? $request->file('profile_photo')->store('profile-photos', 'public')
            : null;
    }

    private function deleteProfilePhoto(User $user): void
    {
        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
        }
    }
}
