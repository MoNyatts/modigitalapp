<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        $users = User::withCount('assignedEvents')->orderBy('name')->paginate(20);

        return view('users.index', compact('users'));
    }

    public function create()
    {
        return view('users.form', ['user' => new User(), 'events' => Event::orderBy('name')->get()]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $user = User::create($data);
        $user->assignedEvents()->sync($request->input('event_ids', []));

        return redirect()->route('users.index')->with('status', "User {$user->name} created.");
    }

    public function edit(User $user)
    {
        $user->load('assignedEvents');

        return view('users.form', ['user' => $user, 'events' => Event::orderBy('name')->get()]);
    }

    public function update(Request $request, User $user)
    {
        $data = $this->validated($request, $user);

        if (empty($data['password'])) {
            unset($data['password']);
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

        $user->delete();

        return redirect()->route('users.index')->with('status', 'User deleted.');
    }

    private function validated(Request $request, ?User $user = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user?->id)],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'staff'])],
            'scanner_enabled' => ['sometimes', 'boolean'],
        ]) + ['scanner_enabled' => $request->boolean('scanner_enabled')];
    }
}
