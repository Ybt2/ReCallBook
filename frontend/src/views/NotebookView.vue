<script setup>
import { onMounted, watch, ref, computed } from "vue";
import { useNotebookStore } from "../stores/notebook";
import AppHeader from "../components/common/AppHeader.vue";
import FilesPanel from "../components/notebook/FilesPanel.vue";
import ChatPanel from "../components/notebook/ChatPanel.vue";
import ToolsPanel from "../components/notebook/ToolsPanel.vue";
import PdfViewer from "../components/viewers/PdfViewer.vue";
import ImageViewer from "../components/viewers/ImageViewer.vue";
import QuizViewer from "../components/viewers/QuizViewer.vue";
import FlashcardsViewer from "../components/viewers/FlashcardsViewer.vue";
import AppModal from "../components/common/AppModal.vue";
import Spinner from "../components/common/Spinner.vue";
import { ToolsAPI } from "../api/tools";

const props = defineProps({ id: [String, Number] });
const store = useNotebookStore();

const pdfDoc = ref(null); // { id, name, page? }
const imageDoc = ref(null);
const assetView = ref(null);
const loadingAsset = ref(false);

// mobile tab: files | chat | tools
const mobileTab = ref("chat");

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

function openPdf(doc) {
  pdfDoc.value = doc;
}

function openImage(doc) {
  imageDoc.value = doc;
}

function openSource(src) {
  if (!src) return;
  const docId = src.docId || src.source;
  if (!docId) return;
  const doc = store.documents.find((d) => d.id === docId || d.id === Number(docId));
  if (!doc) return;
  const imageTypes = ["jpeg", "png", "svg"];
  if (imageTypes.includes(doc.type)) {
    imageDoc.value = { id: docId, name: doc.name || src.source_name || "Source" };
  } else if (String(doc.type).toLowerCase() === "pdf") {
    pdfDoc.value = {
      id: docId,
      name: doc.name || src.source_name || "Source",
      page: src.page || 1,
    };
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

    <template v-else>
      <!-- Desktop: 3-column layout -->
      <div class="flex-1 min-h-0 hidden lg:grid grid-cols-[280px_1fr_340px]">
        <div class="border-r border-neutral-200 min-h-0">
          <FilesPanel @open-pdf="openPdf" @open-image="openImage" />
        </div>
        <div class="border-r border-neutral-200 min-h-0">
          <ChatPanel @open-source="openSource" />
        </div>
        <div class="border-l border-neutral-200 min-h-0">
          <ToolsPanel @open-asset="openAsset" />
        </div>
      </div>

      <!-- Mobile/Tablet: tabbed layout with bottom nav -->
      <div class="flex-1 min-h-0 flex flex-col lg:hidden">
        <div class="flex-1 min-h-0">
          <FilesPanel v-show="mobileTab === 'files'" @open-pdf="openPdf" @open-image="openImage" />
          <ChatPanel v-show="mobileTab === 'chat'" @open-source="openSource" />
          <ToolsPanel v-show="mobileTab === 'tools'" @open-asset="openAsset" />
        </div>
        <nav class="shrink-0 grid grid-cols-3 border-t border-neutral-200 bg-white safe-bottom">
          <button
            class="py-3 flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors"
            :class="mobileTab === 'files' ? 'text-brand-600' : 'text-neutral-500'"
            @click="mobileTab = 'files'"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
            </svg>
            Files
            <span v-if="store.documents.length" class="text-[9px] opacity-70">{{ store.documents.length }}</span>
          </button>
          <button
            class="py-3 flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors"
            :class="mobileTab === 'chat' ? 'text-brand-600' : 'text-neutral-500'"
            @click="mobileTab = 'chat'"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat
          </button>
          <button
            class="py-3 flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors"
            :class="mobileTab === 'tools' ? 'text-brand-600' : 'text-neutral-500'"
            @click="mobileTab = 'tools'"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
            </svg>
            Tools
            <span v-if="store.assets.length" class="text-[9px] opacity-70">{{ store.assets.length }}</span>
          </button>
        </nav>
      </div>
    </template>

    <!-- PDF viewer modal -->
    <AppModal
      :show="!!pdfDoc"
      :title="pdfDoc?.name"
      size="xl"
      @close="pdfDoc = null"
    >
      <PdfViewer v-if="pdfDoc" :doc="pdfDoc" />
    </AppModal>

    <!-- Image viewer modal -->
    <AppModal
      :show="!!imageDoc"
      :title="imageDoc?.name"
      size="xl"
      @close="imageDoc = null"
    >
      <ImageViewer v-if="imageDoc" :doc="imageDoc" />
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

<style scoped>
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
</style>
