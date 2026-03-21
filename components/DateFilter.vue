<script setup lang="ts">
const from = defineModel<string>("from", { default: "" });
const to = defineModel<string>("to", { default: "" });
</script>

<template>
  <div
    class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4"
  >
    <div class="flex items-center gap-2">
      <label
        for="date-from"
        class="w-10 sm:w-auto text-sm font-medium text-gray-700"
      >
        From:
      </label>
      <input
        id="date-from"
        v-model="from"
        type="date"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        v-if="from"
        class="text-sm text-gray-400 hover:text-gray-600"
        @click="from = ''"
      >
        ✕
      </button>
    </div>
    <div class="flex items-center gap-2">
      <label
        for="date-to"
        class="w-10 sm:w-auto text-sm font-medium text-gray-700"
      >
        To:
      </label>
      <input
        id="date-to"
        v-model="to"
        type="date"
        :min="from || undefined"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        v-if="to"
        class="text-sm text-gray-400 hover:text-gray-600"
        @click="to = ''"
      >
        ✕
      </button>
    </div>
  </div>
</template>
