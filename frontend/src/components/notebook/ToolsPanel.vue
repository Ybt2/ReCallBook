<script setup>
import { useNotebookStore } from "../../stores/notebook";
import Spinner from "../common/Spinner.vue";
import QuizTool from "../tools/QuizTool.vue";
import FlashcardsTool from "../tools/FlashcardsTool.vue";

const store = useNotebookStore();
const emit = defineEmits(["open-asset"]);
</script>

<template>
  <aside class="flex flex-col bg-white min-h-0 h-full">
    <div class="px-4 py-3 border-b border-neutral-200 shrink-0">
      <h2 class="font-semibold text-sm">Study tools</h2>
      <p class="text-xs text-neutral-500">Generate items from active sources.</p>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4 min-h-0">
      <div class="grid grid-cols-2 gap-2">
        <QuizTool @open-asset="emit('open-asset', $event)" />
        <FlashcardsTool @open-asset="emit('open-asset', $event)" />
      </div>
      <p v-if="!store.documents.length" class="text-[11px] text-neutral-500 text-center">
        Upload a file first.
      </p>

      <div v-if="store.loading.assets" class="text-sm text-neutral-500 flex items-center gap-2 p-2">
        <Spinner /> Loading…
      </div>
      <div v-else-if="!store.assets.length" class="p-4 text-center text-sm text-neutral-500">
        Nothing yet. The result of the model will be stored here
      </div>
    </div>
  </aside>
</template>