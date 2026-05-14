<script setup>
import { ref } from "vue";
import { useNotebookStore } from "../../stores/notebook";
import { useModelStore } from "../../stores/models";
import { useToastStore } from "../../stores/toast";
import Spinner from "../common/Spinner.vue";
import AppModal from "../common/AppModal.vue";

const store = useNotebookStore();
const modelStore = useModelStore();
const toasts = useToastStore();

const showConfig = ref(false);
const prompt = ref("");
const count = ref(15);
const difficulty = ref("medium");

const countOptions = [
  { value: 8, label: "A few (8)" },
  { value: 15, label: "Moderate (15)" },
  { value: 25, label: "A lot (25)" },
];

function openConfig() {
  if (!store.selectedDocIds.size) {
    toasts.error("Select at least one document first.");
    return;
  }
  if (!modelStore.hasModels) {
    toasts.error("No model configured. Go to Settings to configure a model.");
    return;
  }
  if (store.isGenerating || store.streaming) {
    toasts.error("A generation is already in progress.");
    return;
  }
  showConfig.value = true;
}

async function generate() {
  if (!store.notebook) return;
  showConfig.value = false;
  try {
    const completed = await store.generateTool({
      type: "flashcards",
      prompt: prompt.value,
      count: Number(count.value),
      difficulty: difficulty.value,
    });
    if (completed) toasts.success("Flashcards generated");
    prompt.value = "";
  } catch (e) {
    toasts.error(e.message);
  }
}

function stopGeneration() {
  store.stopTool();
  toasts.success("Generation stopped.");
}
</script>

<template>
  <div>
    <button
      v-if="store.generatingToolType === 'flashcards'"
      class="w-full py-2 rounded-btn text-sm border border-warm bg-oc-surface text-danger hover:bg-oc-dark flex flex-col items-center gap-1 transition-colors duration-fast"
      @click="stopGeneration"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
      </svg>
      <span class="text-xs font-medium">Stop</span>
    </button>

    <button
      v-else
      class="w-full py-2 rounded-btn text-sm border border-warm bg-oc-dark text-oc-mid hover:bg-oc-surface hover:text-oc-light flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-oc-dark disabled:hover:text-oc-mid transition-colors duration-fast"
      :disabled="!store.selectedDocIds.size || store.isGenerating || store.streaming || !modelStore.hasModels"
      @click="openConfig"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>
      </svg>
      <span class="text-xs font-medium">Flashcards</span>
    </button>

    <AppModal :show="showConfig" title="Create Flashcards" size="md" @close="showConfig = false">
      <div class="p-5 space-y-4">
        <div>
          <label class="label">Prompt (optional)</label>
          <textarea v-model="prompt" rows="3" class="input resize-none" placeholder="e.g. Key terms for exam review" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label">Number of cards</label>
            <select v-model="count" class="input">
              <option v-for="opt in countOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
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
        <button class="btn-primary" :disabled="store.loading.tool || !store.selectedDocIds.size" @click="generate">
          <Spinner v-if="store.loading.tool" />
          <span>Generate</span>
        </button>
      </template>
    </AppModal>
  </div>
</template>