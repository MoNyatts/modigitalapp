<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\RejectedScan;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index()
    {
        $events = Event::withCount(['activities', 'qrCodes'])
            ->orderByDesc('start_date')
            ->paginate(15);

        return view('events.index', compact('events'));
    }

    public function create()
    {
        return redirect()->route('events.index');
    }

    public function store(Request $request)
    {
        $event = Event::create($this->validated($request) + ['created_by' => $request->user()->id]);

        return redirect()->route('events.show', $event)->with('status', 'Event created.');
    }

    public function show(Event $event)
    {
        $event->load([
            'activities' => fn ($query) => $query
                ->withCount(['scans', 'rejectedScans'])
                ->withSum('scans as admissions_sum', 'admission_count'),
            'assignedUsers',
        ]);

        $stats = [
            'qr_count' => $event->qrCodes()->count(),
            'admissions' => (int) $event->scans()->sum('admission_count'),
            'activities' => $event->activities->count(),
            'rejections' => RejectedScan::whereHas('activity', fn ($query) => $query->where('event_id', $event->id))->count(),
        ];

        $staff = \App\Models\User::where('role', 'staff')->orderBy('name')->get();

        return view('events.show', compact('event', 'stats', 'staff'));
    }

    public function edit(Event $event)
    {
        return redirect()->route('events.show', $event);
    }

    public function update(Request $request, Event $event)
    {
        $event->update($this->validated($request));

        return redirect()->route('events.show', $event)->with('status', 'Event updated.');
    }

    public function destroy(Event $event)
    {
        $event->delete();

        return redirect()->route('events.index')->with('status', 'Event deleted.');
    }

    public function assignStaff(Request $request, Event $event)
    {
        $data = $request->validate(['user_ids' => ['array'], 'user_ids.*' => ['integer', 'exists:users,id']]);
        $event->assignedUsers()->sync($data['user_ids'] ?? []);

        return back()->with('status', 'Staff assignments updated.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['required', 'string', 'max:255'],
            'is_multi_day' => ['sometimes', 'boolean'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'invited_guests' => ['nullable', 'integer', 'min:0'],
        ]) + ['is_multi_day' => $request->boolean('is_multi_day')];
    }
}
