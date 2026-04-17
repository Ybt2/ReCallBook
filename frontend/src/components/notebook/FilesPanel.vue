<script setup>
import { ref, computed } from "vue";
import { useNotebookStore } from "../../stores/notebook";
import { useToastStore } from "../../stores/toast";
import Spinner from "../common/Spinner.vue";

const store = useNotebookStore();
const toasts = useToastStore();
const emit = defineEmits(["open-pdf"]);

const fileInput = ref(null);
const uploading = ref(false);

const allSelected = computed(
  () =>
    store.documents.length > 0 &&
    store.selectedDocIds.size === store.documents.length
);

async function onUpload(e) {
  const picked = [...e.target.files];
  e.target.value = "";
  if (!picked.length) return;

  uploading.value = true;
  try {
    for (const f of picked) {
      await store.uploadDocument(f);
    }
    toasts.success(`${picked.length} file(s) uploaded`);
  } catch (err) {
    toasts.error(err.message);
  } finally {
    uploading.value = false;
  }
}

async function remove(d) {
  if (!confirm(`Delete "${d.name}"?`)) return;
  try {
    await store.removeDocument(d.id);
    toasts.success("File deleted");
  } catch (e) {
    toasts.error(e.message);
  }
}
</script>

<template>
  <aside class="flex flex-col border-r border-neutral-200 bg-white min-h-0">
    <div class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between shrink-0">
      <div>
        <h2 class="font-semibold text-sm">Sources</h2>
        <p class="text-xs text-neutral-500">
          {{ store.selectedDocIds.size }}/{{ store.documents.length }} active in RAG
        </p>
      </div>
      <button
        class="btn-primary !py-1.5 !px-2.5 !text-xs"
        :disabled="uploading"
        @click="fileInput.click()"
      >
        <Spinner v-if="uploading" :size="12" />
        <span v-else>+ Add</span>
      </button>
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="application/pdf"
        class="hidden"
        @change="onUpload"
      />
    </div>

    <div class="px-4 py-2 border-b border-neutral-100 flex items-center gap-2 text-xs shrink-0">
      <input
        type="checkbox"
        class="accent-brand-600"
        :checked="allSelected"
        @change="store.selectAllDocs($event.target.checked)"
      />
      <span class="text-neutral-600">Select all</span>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1 min-h-0">
      <div v-if="store.loading.documents" class="p-3 text-sm text-neutral-500 flex items-center gap-2">
        <Spinner /> Loading…
      </div>
      <div v-else-if="!store.documents.length" class="p-5 text-center text-sm text-neutral-500">
        No files yet. Upload a PDF to get started.
      </div>
      <div
        v-for="d in store.documents"
        :key="d.id"
        class="group flex items-center gap-2 rounded-lg p-2 hover:bg-neutral-50"
      >
        <input
          type="checkbox"
          class="accent-brand-600 shrink-0"
          :checked="store.selectedDocIds.has(d.id)"
          @change="store.toggleDoc(d.id)"
        />
        <button
          class="flex-1 min-w-0 text-left flex items-center gap-2"
          @click="emit('open-pdf', d)"
          title="Open PDF"
        >
          <span class="w-7 h-7 shrink-0 rounded bg-red-50 text-red-600 grid place-items-center text-[10px] font-bold">
            PDF
          </span>
          <span class="truncate text-sm text-neutral-800">{{ d.name }}</span>
        </button>
        <button
          class="btn-ghost !p-1 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600"
          title="Delete"
          @click="remove(d)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>
