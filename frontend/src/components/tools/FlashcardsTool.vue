<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useNotebookStore } from "../../stores/notebook";
import { useModelStore } from "../../stores/models";
import { useToastStore } from "../../stores/toast";
import Spinner from "../common/Spinner.vue";
import AppModal from "../common/AppModal.vue";

const { t } = useI18n();
const store = useNotebookStore();
const modelStore = useModelStore();
const toasts = useToastStore();

const showConfig = ref(false);
const prompt = ref("");
const count = ref(15);
const difficulty = ref("medium");

const countOptions = [
  { value: 8, label: () => t("flashcardsTool.few") },
  { value: 15, label: () => t("flashcardsTool.moderate") },
  { value: 25, label: () => t("flashcardsTool.aLot") },
];

function openConfig() {
  if (!store.selectedDocIds.size) {
    toasts.error(t("flashcardsTool.selectDocFirst"));
    return;
  }
  if (!modelStore.hasModels) {
    toasts.error(t("flashcardsTool.noModelConfigured"));
    return;
  }
  if (store.isGenerating || store.streaming) {
    toasts.error(t("flashcardsTool.generationInProgress"));
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
    if (completed) toasts.success(t("flashcardsTool.flashcardsGenerated"));
  } catch (e) {
    toasts.error(e.message);
  }
}

function stopGeneration() {
  store.stopTool();
  toasts.success(t("flashcardsTool.generationStopped"));
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
      <span class="text-xs font-medium">{{ $t("flashcardsTool.stop") }}</span>
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
      <span class="text-xs font-medium">{{ $t("flashcardsTool.flashcards") }}</span>
    </button>

    <AppModal :show="showConfig" :title="$t('flashcardsTool.createFlashcards')" size="md" @close="showConfig = false">
      <div class="p-5 space-y-4">
        <div>
          <label class="label">{{ $t("flashcardsTool.promptOptional") }}</label>
          <textarea v-model="prompt" rows="3" class="input resize-none" :placeholder="$t('flashcardsTool.promptPlaceholder')" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label">{{ $t("flashcardsTool.numCards") }}</label>
            <select v-model="count" class="input">
              <option v-for="opt in countOptions" :key="opt.value" :value="opt.value">{{ opt.label() }}</option>
            </select>
          </div>
          <div>
            <label class="label">{{ $t("flashcardsTool.difficulty") }}</label>
            <select v-model="difficulty" class="input">
              <option value="easy">{{ $t("flashcardsTool.easy") }}</option>
              <option value="medium">{{ $t("flashcardsTool.medium") }}</option>
              <option value="hard">{{ $t("flashcardsTool.hard") }}</option>
            </select>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="showConfig = false">{{ $t("flashcardsTool.cancel") }}</button>
        <button class="btn-primary" :disabled="store.loading.tool || !store.selectedDocIds.size" @click="generate">
          <Spinner v-if="store.loading.tool" />
          <span>{{ $t("flashcardsTool.generate") }}</span>
        </button>
      </template>
    </AppModal>
  </div>
</template>