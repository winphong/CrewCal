<script setup lang="ts">
import { buildIcsEvents } from "~/composables/useIcsGenerator";
import type { IcsEvent } from "~/utils/ics";
import type { Trip } from "~/utils/types";

const props = defineProps<{
  trips: Trip[];
  reminderHours: number[];
}>();

const events = computed<IcsEvent[]>(() =>
  buildIcsEvents(props.trips, props.reminderHours),
);

const expanded = ref<Record<number, boolean>>({});

function toggle(i: number) {
  expanded.value[i] = !expanded.value[i];
}

function formatEventDate(date: Date): string {
  const sgt = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return sgt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC", // already shifted to SGT above
  });
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="(event, i) in events"
      :key="event.uid"
      class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <!-- Title -->
      <p class="font-semibold text-gray-900">{{ event.summary }}</p>

      <!-- Date range -->
      <p class="mt-1 text-sm text-gray-500">
        {{ formatEventDate(event.dtstart) }} &rarr;
        {{ formatEventDate(event.dtend) }} SGT
      </p>

      <!-- Location -->
      <div class="mt-2 flex items-start gap-1.5 text-sm text-gray-600">
        <span class="mt-px shrink-0">📍</span>
        <a
          :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`"
          target="_blank"
          class="hover:underline"
          >{{ event.location }}</a
        >
      </div>

      <!-- Reminders -->
      <div
        v-if="event.reminderHours.length"
        class="mt-2 flex items-center gap-1.5 text-sm text-gray-600"
      >
        <span>🔔</span>
        <span>{{
          event.reminderHours.map((h) => `${h}h before`).join(", ")
        }}</span>
      </div>

      <!-- Description toggle -->
      <button
        class="mt-3 text-xs text-blue-600 hover:underline"
        @click="toggle(i)"
      >
        {{ expanded[i] ? "Hide" : "Show" }} itinerary
      </button>
      <pre
        v-if="expanded[i]"
        class="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-600"
        >{{ event.description }}</pre
      >
    </div>

    <p v-if="events.length === 0" class="py-8 text-center text-gray-400">
      No events to preview
    </p>
  </div>
</template>
