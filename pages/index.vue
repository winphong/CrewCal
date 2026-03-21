<script setup lang="ts">
import type { ReminderOption, Trip } from "~/utils/types";

const { trips, error, parseCsv, filterByDate } = useFlightParser();
const { generateIcs, downloadIcs } = useIcsGenerator();

function todaySGT(): string {
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return sgt.toISOString().slice(0, 10);
}

const dateFrom = ref(todaySGT());
const dateTo = ref("");
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

function parseSgtDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, -8, 0)); // SGT midnight = UTC-8h
}

const filteredTrips = computed<Trip[]>(() => {
  const from = dateFrom.value ? parseSgtDate(dateFrom.value) : null;
  const to = dateTo.value ? parseSgtDate(dateTo.value) : null;
  return filterByDate(from, to);
});

function onUpload(csvText: string) {
  parseCsv(csvText);
  csvLoaded.value = !error.value;
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
  dateFrom.value = "";
  dateTo.value = "";
  error.value = null;
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-3xl px-4 py-12">
      <header class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-gray-900">CrewCal</h1>
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
          <DateFilter v-model:from="dateFrom" v-model:to="dateTo" />
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
            :disabled="filteredTrips.length === 0 || !dateFrom"
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
      <!-- How to import -->
      <div class="mt-12 rounded-xl border border-gray-200 bg-white p-6">
        <h2 class="text-base font-semibold text-gray-900">
          How to import to your calendar
        </h2>
        <ol class="mt-4 space-y-3 text-sm text-gray-600">
          <li class="flex gap-3">
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
              >1</span
            >
            <span>Upload your CSV roster file and select your settings.</span>
          </li>
          <li class="flex gap-3">
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
              >2</span
            >
            <span
              >Set <strong>Show trips from</strong> to today's date to avoid
              duplicating past flights.</span
            >
          </li>
          <li class="flex gap-3">
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
              >3</span
            >
            <span>Click <strong>Download .ics</strong> to save the file.</span>
          </li>
          <li class="flex gap-3">
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
              >4</span
            >
            <span
              ><strong>On iPhone:</strong> opening the .ics file from the Files
              app may not trigger calendar import. Instead, email the file to
              yourself, then tap it from the <strong>Mail app</strong> — this
              will prompt you to add the events to your calendar.</span
            >
          </li>
          <li class="flex gap-3">
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
              >5</span
            >
            <span
              >Select your existing calendar when prompted. Each event has a
              unique ID, so importing the same file twice will not create
              duplicates.</span
            >
          </li>
        </ol>

        <div class="mt-6 border-t border-gray-100 pt-5">
          <p class="text-sm font-semibold text-gray-700">
            Importing via Google Calendar (desktop only)
          </p>
          <ol class="mt-3 space-y-2 text-sm text-gray-600">
            <li class="flex gap-3">
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600"
                >1</span
              >
              <span
                >Open <strong>calendar.google.com</strong> on your desktop
                browser.</span
              >
            </li>
            <li class="flex gap-3">
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600"
                >2</span
              >
              <span
                >Click the <strong>⚙ Settings</strong> gear icon (top right) →
                <strong>Settings</strong>.</span
              >
            </li>
            <li class="flex gap-3">
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600"
                >3</span
              >
              <span
                >In the left sidebar, click
                <strong>Import &amp; export</strong>.</span
              >
            </li>
            <li class="flex gap-3">
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600"
                >4</span
              >
              <span
                >Under <strong>Import</strong>, select the downloaded
                <strong>.ics</strong> file, choose your existing calendar, then
                click <strong>Import</strong>.</span
              >
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>
