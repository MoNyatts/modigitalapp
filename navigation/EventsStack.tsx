import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EventsListScreen from '@/screens/events/EventsListScreen';
import CreateEventScreen from '@/screens/events/CreateEventScreen';
import EventDetailsScreen from '@/screens/events/EventDetailsScreen';

export type EventsStackParamList = {
  EventsList: undefined;
  CreateEvent: undefined;
  EventDetails: { eventId: string };
};

const Stack = createNativeStackNavigator<EventsStackParamList>();

export default function EventsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="EventsList"
        component={EventsListScreen}
        options={{ title: 'Events', headerShown: false }}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          title: 'Create Event',
          presentation: 'modal',
          headerStyle: { backgroundColor: '#1e40af' },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{
          title: 'Event Details',
          headerStyle: { backgroundColor: '#1e40af' },
          headerTintColor: '#ffffff',
        }}
      />
    </Stack.Navigator>
  );
}
