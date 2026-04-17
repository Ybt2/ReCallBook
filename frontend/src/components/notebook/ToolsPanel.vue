<script setup>
import { ref } from "vue";
import { useNotebookStore } from "../../stores/notebook";
import { useToastStore } from "../../stores/toast";
import Spinner from "../common/Spinner.vue";

const store = useNotebookStore();
const toasts = useToastStore();
const emit = defineEmits(["open-asset"]);

const type = ref("quiz"); // quiz | flashcards
const prompt = ref("");
const count = ref(5);
const difficulty = ref("medium");

async function generate() {
  if (!store.notebook) return;
  try {
    await store.generateTool({
      type: type.value,
      prompt: prompt.value,
      count: Number(count.value),
      difficulty: difficulty.value,
    });
    toasts.success(`${type.value === "quiz" ? "Quiz" : "Flashcards"} generated`);
    prompt.value = "";
  } catch (e) {
    toasts.error(e.message);
  }
}

async function remove(a) {
  if (!confirm("Delete this item?")) return;
  try {
    await store.removeAsset(a.id);
  } catch (e) {
    toasts.error(e.message);
  }
}

function badge(t) {
  return t === "quiz" ? "Quiz" : "Flashcards";
}
</script>

<template>
  <aside class="flex flex-col border-l border-neutral-200 bg-white min-h-0">
    <div class="px-4 py-3 border-b border-neutral-200 shrink-0">
      <h2 class="font-semibold text-sm">Study tools</h2>
      <p class="text-xs text-neutral-500">Generate items from active sources.</p>
    </div>

    <div class="p-4 border-b border-neutral-200 space-y-3 shrink-0">
      <div class="grid grid-cols-2 gap-2">
        <button
          class="py-2 rounded-lg text-sm border text-center"
          :class="type === 'quiz' ? 'bg-brand-50 border-brand-400 text-brand-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'"
          @click="type = 'quiz'"
        >
          Quiz
        </button>
        <button
          class="py-2 rounded-lg text-sm border text-center"
          :class="type === 'flashcards' ? 'bg-brand-50 border-brand-400 text-brand-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'"
          @click="type = 'flashcards'"
        >
          Flashcards
        </button>
      </div>

      <div>
        <label class="label">Prompt (optional)</label>
        <textarea
          v-model="prompt"
          rows="2"
          class="input resize-none"
          :placeholder="type === 'quiz' ? 'e.g. Focus on chapter 3 concepts' : 'e.g. Key terms for exam review'"
        />
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="label">Number of items</label>
          <input v-model.number="count" type="number" min="1" max="30" class="input" />
        </div>
        <div>
          <label class="label">Difficulty</label>
          <select v-model="difficulty" class="input">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <button
        class="btn-primary w-full"
        :disabled="store.loading.tool || !store.documents.length"
        @click="generate"
      >
        <Spinner v-if="store.loading.tool" />
        <span>Generate</span>
      </button>
      <p v-if="!store.documents.length" class="text-xs text-neutral-500 text-center">
        Upload a file first.
      </p>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2 min-h-0">
      <div class="text-xs font-medium text-neutral-500 px-1 mb-1">Generated</div>
      <div v-if="store.loading.assets" class="text-sm text-neutral-500 flex items-center gap-2 p-2">
        <Spinner /> Loading…
      </div>
      <div v-else-if="!store.assets.length" class="p-4 text-center text-sm text-neutral-500">
        Nothing yet. Generate a quiz or flashcards to see it here.
      </div>
      <div
        v-for="a in store.assets"
        :key="a.id"
        class="group card !shadow-none hover:border-brand-300 cursor-pointer p-3 flex items-start gap-3"
        @click="emit('open-asset', a)"
      >
        <div
          class="w-9 h-9 rounded-lg shrink-0 grid place-items-center text-xs font-semibold"
          :class="a.type === 'quiz' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
        >
          {{ a.type === "quiz" ? "Q" : "F" }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ a.title }}</div>
          <div class="text-[11px] text-neutral-500 mt-0.5">
            {{ badge(a.type) }} · {{ new Date(a.created_at).toLocaleDateString() }}
          </div>
        </div>
        <button
          class="btn-ghost !p-1 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600"
          @click.stop="remove(a)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>
