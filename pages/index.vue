<script setup lang="ts">
import type { ReminderOption, Trip } from "~/utils/types";

const { trips, error, parseCsv, filterByDate } = useFlightParser();
const { generateIcs, downloadIcs } = useIcsGenerator();

const dateFilter = ref("");
const csvLoaded = ref(false);
const selectedReminders = ref<number[]>([2, 3, 4, 6]);

const reminderOptions: ReminderOption[] = [
  { label: "2 hours", hours: 2 },
  { label: "3 hours", hours: 3 },
  { label: "4 hours", hours: 4 },
  { label: "6 hours", hours: 6 },
  { label: "12 hours", hours: 12 },
  { label: "24 hours", hours: 24 },
  { label: "48 hours", hours: 48 },
];

const filteredTrips = computed<Trip[]>(() => {
  if (!dateFilter.value) return trips.value;
  // Parse the date filter as SGT midnight, convert to UTC for comparison
  const [y, m, d] = dateFilter.value.split("-").map(Number);
  const fromDate = new Date(Date.UTC(y, m - 1, d, -8, 0)); // SGT midnight = UTC -8h
  return filterByDate(fromDate);
});

function onUpload(csvText: string) {
  parseCsv(csvText);
  csvLoaded.value = true;
}

function onDownload() {
  const ics = generateIcs(filteredTrips.value, selectedReminders.value);
  downloadIcs(ics);
}

function toggleReminder(hours: number) {
  const idx = selectedReminders.value.indexOf(hours);
  if (idx >= 0) {
    selectedReminders.value.splice(idx, 1);
  } else {
    selectedReminders.value.push(hours);
  }
}

function reset() {
  csvLoaded.value = false;
  trips.value = [];
  dateFilter.value = "";
  error.value = null;
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-3xl px-4 py-12">
      <header class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-gray-900">
          CrewCal
        </h1>
        <p class="mt-2 text-gray-500">
          Upload your flight roster CSV and export grouped trips to your
          calendar
        </p>
      </header>

      <!-- Upload -->
      <CsvUploader v-if="!csvLoaded" @upload="onUpload" />

      <!-- Error -->
      <div
        v-if="error"
        class="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700"
      >
        {{ error }}
      </div>

      <!-- Results -->
      <template v-if="csvLoaded && !error">
        <div
          class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <DateFilter v-model="dateFilter" />
          <button
            class="text-sm text-gray-500 hover:text-gray-700"
            @click="reset"
          >
            Upload different file
          </button>
        </div>

        <!-- Reminders -->
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-gray-700">Reminders:</span>
          <button
            v-for="opt in reminderOptions"
            :key="opt.hours"
            class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            :class="
              selectedReminders.includes(opt.hours)
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            "
            @click="toggleReminder(opt.hours)"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Trip count & download -->
        <div class="mt-6 flex items-center justify-between">
          <p class="text-sm text-gray-600">
            {{ filteredTrips.length }} trip{{
              filteredTrips.length === 1 ? "" : "s"
            }}
            found
          </p>
          <button
            :disabled="filteredTrips.length === 0"
            class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="onDownload"
          >
            Download .ics
          </button>
        </div>

        <!-- Preview -->
        <div class="mt-6">
          <TripPreview :trips="filteredTrips" />
        </div>
      </template>
    </div>
  </div>
</template>
