<script setup>
import { useNotebookStore } from "../../stores/notebook";
import Spinner from "../common/Spinner.vue";
import QuizTool from "../tools/QuizTool.vue";
import FlashcardsTool from "../tools/FlashcardsTool.vue";

const store = useNotebookStore();
const emit = defineEmits(["open-asset"]);

async function handleRemove(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;
  await store.removeAsset(id);
}
</script>

<template>
  <aside class="flex flex-col bg-white min-h-0 h-full">
    <div class="px-4 py-3 border-b border-neutral-200 shrink-0">
      <h2 class="font-semibold text-sm">Study tools</h2>
      <p class="text-xs text-neutral-500">Generate items from active sources.</p>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4 min-h-0">
      <div class="grid grid-cols-2 gap-2">
        <QuizTool />
        <FlashcardsTool />
      </div>

      <p v-if="!store.documents.length" class="text-[11px] text-neutral-500 text-center">
        Upload a file first.
      </p>

      <div v-if="store.isGenerating" class="space-y-2">
        <div 
          v-for="n in 1" 
          :key="n" 
          class="card !shadow-none p-3 flex items-start gap-3 animate-pulse"
        >
          <div class="w-9 h-9 rounded-lg shrink-0 bg-neutral-200"></div>
          <div class="flex-1 space-y-2 py-1">
            <div class="h-3 bg-neutral-200 rounded" :class="n === 1 ? 'w-3/4' : 'w-2/3'"></div>
            <div class="h-2 bg-neutral-100 rounded" :class="n === 1 ? 'w-1/2' : 'w-2/5'"></div>
          </div>
        </div>
      </div>

      <div v-if="store.assets.length" class="space-y-2">
        <div
          v-for="a in store.assets"
          :key="a.id"
          class="group card !shadow-none cursor-pointer p-3 flex items-start gap-3 transition-all"
          :class="a.type === 'quiz' ? 'hover:border-brand-300' : 'hover:border-emerald-300'"
          @click="emit('open-asset', a)"
        >
          <div
            class="w-9 h-9 rounded-lg shrink-0 grid place-items-center text-xs font-semibold"
            :class="a.type === 'quiz' ? 'bg-brand-100 text-brand-700' : 'bg-emerald-100 text-emerald-700'"
          >
            {{ a.type === 'quiz' ? 'Q' : 'F' }}
          </div>

          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ a.title }}</div>
            <div class="text-[11px] text-neutral-500 mt-0.5 uppercase tracking-wider">
              {{ a.type }} · {{ new Date(a.created_at).toLocaleDateString() }}
            </div>
          </div>

          <button
            class="btn-ghost !p-1 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 transition-opacity"
            @click.stop="handleRemove(a.id)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="store.loading.assets" class="text-sm text-neutral-500 flex items-center gap-2 p-2">
        <Spinner /> Loading…
      </div>
      <div v-else-if="!store.assets.length && store.documents.length && !store.isGenerating" class="p-4 text-center text-sm text-neutral-500">
        Nothing yet. The result of the model will be stored here
      </div>
    </div>
  </aside>
</template>