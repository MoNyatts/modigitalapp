@extends('layouts.app')
@section('title', $event->exists ? 'Edit Event' : 'New Event')
@section('content')
<h3 class="fw-bold mb-4">{{ $event->exists ? 'Edit Event' : 'New Event' }}</h3>

<div class="card border-0 shadow-sm" style="max-width: 720px;">
    <div class="card-body p-4">
        <form method="POST" action="{{ $event->exists ? route('events.update', $event) : route('events.store') }}">
            @csrf
            @if ($event->exists) @method('PUT') @endif

            <div class="mb-3">
                <label class="form-label">Event name</label>
                <input type="text" name="name" class="form-control" value="{{ old('name', $event->name) }}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea name="description" rows="3" class="form-control">{{ old('description', $event->description) }}</textarea>
            </div>
            <div class="mb-3">
                <label class="form-label">Location</label>
                <input type="text" name="location" class="form-control" value="{{ old('location', $event->location) }}" required>
            </div>
            <div class="row">
                <div class="col-md-4 mb-3">
                    <label class="form-label">Start date</label>
                    <input type="date" name="start_date" class="form-control" value="{{ old('start_date', $event->start_date?->toDateString()) }}" required>
                </div>
                <div class="col-md-4 mb-3">
                    <label class="form-label">End date <span class="text-secondary">(multi-day)</span></label>
                    <input type="date" name="end_date" class="form-control" value="{{ old('end_date', $event->end_date?->toDateString()) }}">
                </div>
                <div class="col-md-4 mb-3">
                    <label class="form-label">Invited guests</label>
                    <input type="number" name="invited_guests" min="0" class="form-control" value="{{ old('invited_guests', $event->invited_guests) }}">
                </div>
            </div>
            <div class="form-check form-switch mb-4">
                <input type="hidden" name="is_multi_day" value="0">
                <input class="form-check-input" type="checkbox" name="is_multi_day" value="1" id="multiday"
                       {{ old('is_multi_day', $event->is_multi_day) ? 'checked' : '' }}>
                <label class="form-check-label" for="multiday">Multi-day event</label>
            </div>

            <button class="btn btn-brand px-4">{{ $event->exists ? 'Save changes' : 'Create event' }}</button>
            <a href="{{ $event->exists ? route('events.show', $event) : route('events.index') }}" class="btn btn-light">Cancel</a>
        </form>
    </div>
</div>
@endsection
