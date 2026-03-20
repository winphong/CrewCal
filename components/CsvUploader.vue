<script setup lang="ts">
const emit = defineEmits<{
  upload: [csvText: string]
}>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>()

function handleFile(file: File) {
  if (!file.name.endsWith('.csv')) {
    alert('Please upload a CSV file')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (text) emit('upload', text)
  }
  reader.readAsText(file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
}

function openFilePicker() {
  fileInput.value?.click()
}
</script>

<template>
  <div
    class="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
    :class="isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop.prevent="onDrop"
    @click="openFilePicker"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".csv"
      class="hidden"
      @change="onFileChange"
    >
    <div class="text-gray-500">
      <p class="text-lg font-medium">Drop your CSV file here</p>
      <p class="mt-1 text-sm">or click to browse</p>
    </div>
  </div>
</template>
