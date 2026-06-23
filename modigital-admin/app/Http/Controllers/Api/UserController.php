<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only administrators can view users'], 403);
        }

        $users = User::with('assignedEvents:id,name')
            ->withCount('assignedEvents')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => $this->serialize($user));

        return response()->json(['users' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only administrators can create users'], 403);
        }

        $data = $this->validated($request);
        $eventIds = $data['event_ids'] ?? [];
        unset($data['event_ids']);

        $user = User::create($data);
        $user->assignedEvents()->sync($eventIds);

        return response()->json(['user' => $this->serialize($user->fresh())], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only administrators can update users'], 403);
        }

        $data = $this->validated($request, $user);
        $eventIds = $data['event_ids'] ?? [];
        unset($data['event_ids']);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);
        $user->assignedEvents()->sync($eventIds);

        return response()->json(['user' => $this->serialize($user->fresh())]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only administrators can delete users'], 403);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted']);
    }

    private function validated(Request $request, ?User $user = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user?->id)],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'staff', 'guest'])],
            'scanner_enabled' => ['sometimes', 'boolean'],
            'event_ids' => ['sometimes', 'array'],
            'event_ids.*' => ['integer', 'exists:events,id'],
        ]) + ['scanner_enabled' => $request->boolean('scanner_enabled')];
    }

    private function serialize(User $user): array
    {
        $user->loadMissing('assignedEvents:id,name');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'scanner_enabled' => $user->scanner_enabled,
            'assigned_events_count' => $user->isAdmin() ? null : $user->assignedEvents->count(),
            'assigned_event_ids' => $user->assignedEvents->pluck('id')->values(),
            'profile_photo_url' => $user->profilePhotoUrl(),
        ];
    }
}
