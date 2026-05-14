<script setup>
import { ref, computed } from "vue";
import { useNotebookStore } from "../../stores/notebook";
import { useToastStore } from "../../stores/toast";
import Spinner from "../common/Spinner.vue";
import ConfirmDialog from "../common/ConfirmDialog.vue";

const store = useNotebookStore();
const toasts = useToastStore();
const emit = defineEmits(["open-pdf", "open-image"]);

const IMAGE_TYPES = ["jpeg", "png", "svg"];
const TEXT_TYPES = ["md", "txt"];
function isImg(d) { return IMAGE_TYPES.includes(d.type); }
function isText(d) { return TEXT_TYPES.includes(d.type); }

const fileInput = ref(null);
const uploading = ref(false);
const uploadProgress = ref(0);

const allSelected = computed(
  () =>
    store.documents.length > 0 &&
    store.selectedDocIds.size === store.documents.length
);

const confirmDelete = ref(null);

async function onUpload(e) {
  const picked = [...e.target.files];
  e.target.value = "";
  if (!picked.length) return;

  uploading.value = true;
  uploadProgress.value = 0;
  try {
    for (let i = 0; i < picked.length; i++) {
      await store.uploadDocument(picked[i], (event) => {
        const fileBase = (i / picked.length) * 100;
        const filePart = (event.loaded / (event.total || 1)) * (100 / picked.length);
        uploadProgress.value = Math.round(fileBase + filePart);
      });
    }
    toasts.success(`${picked.length} file(s) uploaded`);
  } catch (err) {
    toasts.error(err.message);
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
}

async function confirmRemove() {
  if (!confirmDelete.value) return;
  const d = confirmDelete.value;
  confirmDelete.value = null;
  try {
    await store.removeDocument(d.id);
    toasts.success("File deleted");
  } catch (e) {
    toasts.error(e.message);
  }
}
</script>

<template>
  <aside class="flex flex-col border-r border-warm bg-oc-dark min-h-0">
    <div class="px-4 py-3 border-b border-warm flex items-center justify-between shrink-0">
      <div>
        <h2 class="font-bold text-sm text-oc-light">Sources</h2>
      </div>
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png,image/svg+xml,text/plain,text/markdown,.md,.txt"
        class="hidden"
        @change="onUpload"
      />
    </div>

    <div v-if="uploading" class="px-4 py-1 border-b border-warm shrink-0">
      <div class="w-full bg-oc-surface rounded-full h-1.5">
        <div
          class="bg-brand-500 h-1.5 rounded-full transition-all duration-200"
          :style="{ width: uploadProgress + '%' }"
        />
      </div>
      <p class="text-[10px] text-oc-mid mt-0.5">{{ uploadProgress }}%</p>
    </div>

    <label v-if="store.documents.length > 0" class="px-4 py-2 flex items-center gap-2 text-xs shrink-0">
      <input
        type="checkbox"
        class="accent-brand-500"
        :checked="allSelected"
        @change="store.selectAllDocs($event.target.checked)"
      />
      <span class="text-oc-mid">Select all</span>
    </label>

    <div class="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1 min-h-0">
      <div v-if="store.loading.documents" class="p-3 text-sm text-oc-mid flex items-center gap-2">
        <Spinner /> Loading…
      </div>
      <div v-else-if="!store.documents.length" class="p-5 text-center text-sm text-oc-mid">
        Upload file to get started.
      </div>
      <div
        v-for="d in store.documents"
        :key="d.id"
        class="group flex items-center gap-2 rounded-btn p-2 hover:bg-oc-surface"
      >
        <input
          type="checkbox"
          class="accent-brand-500 shrink-0"
          :checked="store.selectedDocIds.has(d.id)"
          @change="store.toggleDoc(d.id)"
          :aria-label="'Select ' + d.name"
        />
        <button
          class="flex-1 min-w-0 text-left flex items-center gap-2"
          @click="isImg(d) ? emit('open-image', d) : emit('open-pdf', d)"
          :title="isImg(d) ? 'Open Image' : 'Open PDF'"
        >
          <span
            v-if="isImg(d)"
            class="w-7 h-7 shrink-0 rounded-btn bg-oc-surface text-brand-500 grid place-items-center text-[10px] font-bold border border-warm"
          >
            {{ d.type.toUpperCase() }}
          </span>
          <span
            v-else-if="isText(d)"
            class="w-7 h-7 shrink-0 rounded-btn bg-oc-surface text-success grid place-items-center text-[10px] font-bold border border-warm"
          >
            {{ d.type.toUpperCase() }}
          </span>
          <span
            v-else
            class="w-7 h-7 shrink-0 rounded-btn bg-oc-surface text-danger grid place-items-center text-[10px] font-bold border border-warm"
          >
            PDF
          </span>
          <span class="truncate text-sm text-oc-light">{{ d.name }}</span>
        </button>
        <button
          class="btn-ghost !p-1 opacity-0 group-hover:opacity-100 text-oc-mid hover:text-danger"
          title="Delete"
          @click="confirmDelete = d"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
        </button>
      </div>

      <button
        class="w-full mt-1 py-2 rounded-btn text-xs text-oc-mid hover:bg-oc-surface hover:text-oc-light flex items-center justify-center gap-1.5 transition-colors"
        :disabled="uploading"
        @click="fileInput.click()"
      >
        <Spinner v-if="uploading" :size="12" />
        <template v-else>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add
        </template>
      </button>
    </div>

    <ConfirmDialog
      :show="!!confirmDelete"
      title="Delete file"
      :message="`Are you sure you want to delete &quot;${confirmDelete?.name}&quot;?`"
      @confirm="confirmRemove"
      @cancel="confirmDelete = null"
    />
  </aside>
</template>