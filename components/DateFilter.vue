<script setup lang="ts">
const model = defineModel<string>({ default: "" });
</script>

<template>
  <div class="flex items-center gap-3">
    <label for="date-filter" class="text-sm font-medium text-gray-700">
      Show trips from:
    </label>
    <input
      id="date-filter"
      v-model="model"
      type="date"
      class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
    <button
      v-if="model"
      class="text-sm text-gray-500 hover:text-gray-700"
      @click="model = ''"
    >
      Clear
    </button>
  </div>
</template>
