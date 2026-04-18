<script setup>
import { ref, computed } from "vue";
import { useNotebookStore } from "../../stores/notebook";
import { useToastStore } from "../../stores/toast";
import Spinner from "../common/Spinner.vue";
import AppModal from "../common/AppModal.vue";

const store = useNotebookStore();
const toasts = useToastStore();
const emit = defineEmits(["open-asset"]);

const showConfig = ref(false);
const prompt = ref("");
const count = ref(5);
const difficulty = ref("medium");

const quizzes = computed(() => store.assets.filter((a) => a.type === "quiz"));

async function generate() {
  if (!store.notebook) return;
  try {
    await store.generateTool({
      type: "quiz",
      prompt: prompt.value,
      count: Number(count.value),
      difficulty: difficulty.value,
    });
    toasts.success("Quiz generated");
    prompt.value = "";
    showConfig.value = false;
  } catch (e) {
    toasts.error(e.message);
  }
}

async function remove(a) {
  if (!confirm("Delete this quiz?")) return;
  try {
    await store.removeAsset(a.id);
  } catch (e) {
    toasts.error(e.message);
  }
}
</script>

<template>
  <div>
    <button
      class="w-full py-2 rounded-lg text-sm border bg-white border-neutral-200 text-neutral-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 flex flex-col items-center gap-1"
      :disabled="!store.documents.length"
      @click="showConfig = true"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
      <span class="text-xs font-medium">Quiz</span>
    </button>

    <div v-if="quizzes.length" class="mt-3 space-y-2">
      <div
        v-for="a in quizzes"
        :key="a.id"
        class="group card !shadow-none hover:border-amber-300 cursor-pointer p-3 flex items-start gap-3"
        @click="emit('open-asset', a)"
      >
        <div class="w-9 h-9 rounded-lg shrink-0 grid place-items-center text-xs font-semibold bg-amber-100 text-amber-700">
          Q
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ a.title }}</div>
          <div class="text-[11px] text-neutral-500 mt-0.5">
            Quiz · {{ new Date(a.created_at).toLocaleDateString() }}
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

    <AppModal
      :show="showConfig"
      title="Create a Quiz"
      size="md"
      @close="showConfig = false"
    >
      <div class="p-5 space-y-4">
        <div>
          <label class="label">Prompt (optional)</label>
          <textarea
            v-model="prompt"
            rows="3"
            class="input resize-none"
            placeholder="e.g. Focus on chapter 3 concepts"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label">Number of questions</label>
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
      </div>
      <template #footer>
        <button class="btn-ghost" @click="showConfig = false">Cancel</button>
        <button
          class="btn-primary"
          :disabled="store.loading.tool || !store.documents.length"
          @click="generate"
        >
          <Spinner v-if="store.loading.tool" />
          <span>Generate</span>
        </button>
      </template>
    </AppModal>
  </div>
</template>