<script setup lang="ts">
import { getAirportInfo, getLocationText } from "~/utils/airports";
import type { Trip } from "~/utils/types";

defineProps<{
  trips: Trip[];
}>();

function formatSgtDate(date: Date): string {
  // Convert UTC date to SGT for display
  const sgt = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return sgt.toISOString().replace("T", " ").slice(0, 16) + " SGT";
}

function formatDateTime(iso: string): string {
  // "2026-01-20T12:30" → "20 Jan 12:30"
  const d = new Date(iso + "+08:00");
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Singapore",
    }) +
    " " +
    iso.split("T")[1]
  );
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="(trip, i) in trips"
      :key="i"
      class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-lg font-semibold">
            {{ getAirportInfo(trip.destination).flag }}
            {{ getAirportInfo(trip.destination).city }} -
            {{ getAirportInfo(trip.destination).country }}
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            {{ trip.flightNumbers.join(" / ") }}
          </p>
        </div>
        <a
          :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getLocationText(trip.destination))}`"
          target="_blank"
          class="text-sm text-blue-600 hover:underline"
        >
          Map
        </a>
      </div>

      <div class="mt-3 text-sm text-gray-600">
        <p>
          {{ formatSgtDate(trip.departureDate) }} &rarr;
          {{ formatSgtDate(trip.returnDate) }}
        </p>
      </div>

      <div class="mt-3 space-y-1">
        <div
          v-for="(leg, j) in trip.legs"
          :key="j"
          class="flex items-center gap-2 text-sm text-gray-700"
        >
          <span class="font-mono text-xs text-gray-400">{{
            leg.flightNo
          }}</span>
          <span>{{ leg.from }}</span>
          <span class="text-gray-400">&rarr;</span>
          <span>{{ leg.to }}</span>
          <span class="text-gray-400">|</span>
          <span class="text-gray-500"
            >{{ formatDateTime(leg.departAt) }} -
            {{ formatDateTime(leg.arriveAt) }}</span
          >
        </div>
      </div>
    </div>

    <p v-if="trips.length === 0" class="text-center text-gray-400 py-8">
      No trips to display
    </p>
  </div>
</template>
