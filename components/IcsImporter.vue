<script setup lang="ts">
import {
  parseIcs,
  formatIcsDate,
  type ParsedIcsEvent,
} from "~/utils/icsParser";

const events = ref<ParsedIcsEvent[]>([]);
const error = ref<string | null>(null);
const fileName = ref<string | null>(null);
const expanded = ref<Record<number, boolean>>({});

function toggle(i: number) {
  expanded.value[i] = !expanded.value[i];
}

function handleFile(file: File) {
  if (!file.name.endsWith(".ics")) {
    error.value = "Please upload an .ics file";
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result as string;
    try {
      error.value = null;
      const parsed = parseIcs(text);
      if (parsed.length === 0) {
        error.value = "No events found in this .ics file";
        return;
      }
      events.value = parsed;
      fileName.value = file.name;
      expanded.value = {};
    } catch {
      error.value = "Failed to parse .ics file";
    }
  };
  reader.readAsText(file);
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) handleFile(file);
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) handleFile(file);
}

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement>();

function reset() {
  events.value = [];
  error.value = null;
  fileName.value = null;
  expanded.value = {};
  if (fileInput.value) fileInput.value.value = "";
}
</script>

<template>
  <div class="mt-12 rounded-xl border border-gray-200 bg-white p-6">
    <h2 class="text-base font-semibold text-gray-900">Preview an .ics file</h2>
    <p class="mt-1 text-sm text-gray-500">
      Upload an existing .ics file to inspect its calendar events before
      importing.
    </p>

    <!-- Uploader -->
    <div
      v-if="!events.length"
      class="mt-4 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors"
      :class="
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      "
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".ics"
        class="hidden"
        @change="onFileChange"
      />
      <p class="text-sm font-medium text-gray-500 sm:hidden">
        Tap to select an .ics file
      </p>
      <p class="hidden text-sm font-medium text-gray-500 sm:block">
        Drop an .ics file here or click to browse
      </p>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
    >
      {{ error }}
    </div>

    <!-- Results -->
    <template v-if="events.length">
      <div class="mt-4 flex items-center justify-between">
        <p class="text-sm text-gray-600">
          <span class="font-medium">{{ fileName }}</span> —
          {{ events.length }} event{{ events.length === 1 ? "" : "s" }}
        </p>
        <button
          class="text-sm text-gray-400 hover:text-gray-600"
          @click="reset"
        >
          Clear
        </button>
      </div>

      <div class="mt-4 space-y-4">
        <div
          v-for="(event, i) in events"
          :key="event.uid || i"
          class="rounded-xl border border-gray-200 bg-gray-50 p-4"
        >
          <!-- Summary -->
          <p class="font-semibold text-gray-900">{{ event.summary }}</p>

          <!-- Dates -->
          <p class="mt-1 text-sm text-gray-500">
            {{ formatIcsDate(event.dtstart) }} &rarr;
            {{ formatIcsDate(event.dtend) }}
          </p>

          <!-- Location -->
          <div
            v-if="event.location"
            class="mt-2 flex items-start gap-1.5 text-sm text-gray-600"
          >
            <span class="mt-px shrink-0">📍</span>
            <a
              :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`"
              target="_blank"
              class="hover:underline"
              >{{ event.location }}</a
            >
          </div>

          <!-- Description toggle -->
          <button
            v-if="event.description"
            class="mt-3 text-xs text-blue-600 hover:underline"
            @click="toggle(i)"
          >
            {{ expanded[i] ? "Hide" : "Show" }} details
          </button>
          <pre
            v-if="expanded[i] && event.description"
            class="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 font-mono text-xs text-gray-600"
            >{{ event.description }}</pre
          >
        </div>
      </div>
    </template>
  </div>
</template>
