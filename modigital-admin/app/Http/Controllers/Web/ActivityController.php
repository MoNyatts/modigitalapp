<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Event;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function store(Request $request, Event $event)
    {
        $event->activities()->create($this->validated($request));

        return back()->with('status', 'Activity added.');
    }

    public function update(Request $request, Event $event, Activity $activity)
    {
        abort_unless($activity->event_id === $event->id, 404);
        $activity->update($this->validated($request));

        return back()->with('status', 'Activity updated.');
    }

    public function destroy(Event $event, Activity $activity)
    {
        abort_unless($activity->event_id === $event->id, 404);
        $activity->delete();

        return back()->with('status', 'Activity deleted.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'day' => ['nullable', 'integer', 'min:1', 'max:60'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
        ]) + ['is_active' => true];
    }
}
