<script setup>
import { ref } from "vue";
import { useNotebookStore } from "../../stores/notebook";
import { useToastStore } from "../../stores/toast";
import Spinner from "../common/Spinner.vue";
import AppModal from "../common/AppModal.vue";

const store = useNotebookStore();
const toasts = useToastStore();

const showConfig = ref(false);
const prompt = ref("");
const count = ref(5);
const difficulty = ref("medium");

function openConfig() {
  if (!store.documents.length) {
    toasts.error("Upload at least one document first.");
    return;
  }
  if (store.isGenerating) {
    toasts.error("A generation is already in progress.");
    return;
  }
  showConfig.value = true;
}

async function generate() {
  if (!store.notebook) return;
  showConfig.value = false;
  try {
    await store.generateTool({
      type: "quiz",
      prompt: prompt.value,
      count: Number(count.value),
      difficulty: difficulty.value,
    });
    toasts.success("Quiz generated");
    prompt.value = "";
  } catch (e) {
    toasts.error(e.message);
  }
}
</script>

<template>
  <div>
    <button
      class="w-full py-2 rounded-btn text-sm border border-warm bg-oc-dark text-oc-mid hover:bg-oc-surface hover:text-oc-light flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-oc-dark disabled:hover:text-oc-mid transition-colors duration-fast"
      :disabled="!store.documents.length || store.isGenerating"
      @click="openConfig"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
      <span class="text-xs font-medium">Quiz</span>
    </button>

    <AppModal :show="showConfig" title="Create a Quiz" size="md" @close="showConfig = false">
      <div class="p-5 space-y-4">
        <div>
          <label class="label">Prompt (optional)</label>
          <textarea v-model="prompt" rows="3" class="input resize-none" placeholder="e.g. Focus on chapter 3 concepts" />
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
        <button class="btn-primary" :disabled="store.loading.tool || !store.documents.length" @click="generate">
          <Spinner v-if="store.loading.tool" />
          <span>Generate</span>
        </button>
      </template>
    </AppModal>
  </div>
</template>