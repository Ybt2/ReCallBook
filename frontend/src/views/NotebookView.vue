<script setup>
import { onMounted, watch, ref } from "vue";
import { useNotebookStore } from "../stores/notebook";
import AppHeader from "../components/common/AppHeader.vue";
import FilesPanel from "../components/notebook/FilesPanel.vue";
import ChatPanel from "../components/notebook/ChatPanel.vue";
import ToolsPanel from "../components/notebook/ToolsPanel.vue";
import PdfViewer from "../components/viewers/PdfViewer.vue";
import QuizViewer from "../components/viewers/QuizViewer.vue";
import FlashcardsViewer from "../components/viewers/FlashcardsViewer.vue";
import AppModal from "../components/common/AppModal.vue";
import Spinner from "../components/common/Spinner.vue";
import { ToolsAPI } from "../api/tools";

const props = defineProps({ id: [String, Number] });
const store = useNotebookStore();

const pdfDoc = ref(null);
const assetView = ref(null); // {type, data, title}
const loadingAsset = ref(false);

onMounted(() => store.loadAll(props.id));
watch(() => props.id, (nv) => store.loadAll(nv));

async function openAsset(a) {
  loadingAsset.value = true;
  try {
    const full = await ToolsAPI.get(a.id);
    assetView.value = {
      type: full.type,
      data: full.data,
      title: full.data?._meta?.title || (full.type === "quiz" ? "Quiz" : "Flashcards"),
    };
  } finally {
    loadingAsset.value = false;
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <AppHeader
      :breadcrumbs="[
        { label: 'Notebooks', to: '/dashboard' },
        { label: store.notebook?.titulo || '…' },
      ]"
    />

    <div v-if="store.loading.notebook" class="flex-1 flex items-center justify-center text-neutral-500 gap-2">
      <Spinner /> Loading notebook…
    </div>

    <div v-else class="flex-1 grid min-h-0 grid-cols-1 lg:grid-cols-[280px_1fr_340px]">
      <FilesPanel @open-pdf="pdfDoc = $event" />
      <ChatPanel />
      <ToolsPanel @open-asset="openAsset" />
    </div>

    <!-- PDF viewer modal -->
    <AppModal
      :show="!!pdfDoc"
      :title="pdfDoc?.name"
      size="xl"
      @close="pdfDoc = null"
    >
      <PdfViewer v-if="pdfDoc" :doc="pdfDoc" />
    </AppModal>

    <!-- Asset viewer modal -->
    <AppModal
      :show="!!assetView || loadingAsset"
      :title="assetView?.title || 'Loading…'"
      size="lg"
      @close="assetView = null"
    >
      <div v-if="loadingAsset" class="p-10 flex items-center justify-center gap-2 text-neutral-500">
        <Spinner /> Loading…
      </div>
      <QuizViewer v-else-if="assetView?.type === 'quiz'" :data="assetView.data" />
      <FlashcardsViewer v-else-if="assetView?.type === 'flashcards'" :data="assetView.data" />
    </AppModal>
  </div>
</template>
