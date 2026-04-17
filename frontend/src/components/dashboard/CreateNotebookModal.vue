<script setup>
import { ref, watch } from "vue";
import AppModal from "../common/AppModal.vue";
import Spinner from "../common/Spinner.vue";
import { useNotebooksStore } from "../../stores/notebooks";
import { DocumentsAPI } from "../../api/documents";
import { useToastStore } from "../../stores/toast";

const props = defineProps({ show: Boolean });
const emit = defineEmits(["close", "created"]);

const store = useNotebooksStore();
const toasts = useToastStore();

const title = ref("");
const files = ref([]);
const step = ref("form"); // form | processing
const progress = ref("");
const error = ref("");

function onPick(e) {
  files.value = [...e.target.files].filter((f) => f.type === "application/pdf");
}

watch(
  () => props.show,
  (v) => {
    if (v) {
      title.value = "";
      files.value = [];
      step.value = "form";
      progress.value = "";
      error.value = "";
    }
  }
);

async function submit() {
  if (!title.value.trim()) return;
  error.value = "";
  step.value = "processing";
  progress.value = "Creating notebook…";

  try {
    const nb = await store.create(title.value.trim());
    for (let i = 0; i < files.value.length; i++) {
      progress.value = `Uploading & processing ${i + 1}/${files.value.length}: ${files.value[i].name}`;
      await DocumentsAPI.upload(nb.id, files.value[i]);
    }
    emit("created", nb);
  } catch (e) {
    error.value = e.message;
    toasts.error(e.message);
    step.value = "form";
  }
}
</script>

<template>
  <AppModal :show="show" title="Create notebook" @close="$emit('close')">
    <div class="p-5 space-y-4">
      <div>
        <label class="label">Notebook title</label>
        <input
          v-model="title"
          class="input"
          placeholder="e.g. Machine Learning 101"
          :disabled="step === 'processing'"
        />
      </div>
      <div>
        <label class="label">Upload PDFs (optional)</label>
        <label
          class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-200 rounded-lg p-6 cursor-pointer hover:border-brand-400 hover:bg-brand-50/40"
          :class="{ 'pointer-events-none opacity-60': step === 'processing' }"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="text-neutral-400">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 5v12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="text-sm text-neutral-600">Click to browse or drop PDFs</span>
          <input type="file" multiple accept="application/pdf" class="hidden" @change="onPick" />
        </label>
        <ul v-if="files.length" class="mt-2 space-y-1 text-sm text-neutral-700">
          <li v-for="(f, i) in files" :key="i" class="flex items-center gap-2 truncate">
            <span class="text-neutral-400">•</span>{{ f.name }}
          </li>
        </ul>
      </div>

      <div v-if="step === 'processing'" class="flex items-center gap-2 text-sm text-neutral-600">
        <Spinner /> {{ progress }}
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    </div>
    <template #footer>
      <button class="btn-secondary" :disabled="step === 'processing'" @click="$emit('close')">Cancel</button>
      <button
        class="btn-primary"
        :disabled="!title.trim() || step === 'processing'"
        @click="submit"
      >
        <Spinner v-if="step === 'processing'" />
        <span>Create</span>
      </button>
    </template>
  </AppModal>
</template>
