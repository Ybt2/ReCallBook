<script setup>
import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useNotebooksStore } from "../stores/notebooks";
import { useToastStore } from "../stores/toast";
import AppHeader from "../components/common/AppHeader.vue";
import AppModal from "../components/common/AppModal.vue";
import Spinner from "../components/common/Spinner.vue";
import CreateNotebookModal from "../components/dashboard/CreateNotebookModal.vue";
import NotebookCard from "../components/dashboard/NotebookCard.vue";

const store = useNotebooksStore();
const toasts = useToastStore();
const router = useRouter();

const search = ref("");
const showCreate = ref(false);
const confirmDelete = ref(null);

const filtered = computed(() => {
  if (!search.value.trim()) return store.items;
  const q = search.value.toLowerCase();
  return store.items.filter((n) => n.titulo.toLowerCase().includes(q));
});

onMounted(() => store.fetch());

function open(id) {
  router.push({ name: "notebook", params: { id } });
}

async function onCreated(nb) {
  showCreate.value = false;
  toasts.success(`Notebook "${nb.titulo}" created`);
  router.push({ name: "notebook", params: { id: nb.id } });
}

async function doDelete() {
  if (!confirmDelete.value) return;
  try {
    await store.remove(confirmDelete.value.id);
    toasts.success("Notebook deleted");
  } catch (e) {
    toasts.error(e.message);
  } finally {
    confirmDelete.value = null;
  }
}
</script>

<template>
  <div class="min-h-full flex flex-col">
    <AppHeader />

    <main class="flex-1 px-6 py-8 max-w-7xl w-full mx-auto">
      <div class="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-semibold">Your notebooks</h1>
          <p class="text-sm text-neutral-500 mt-1">
            Create a notebook, upload sources, then chat and study.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="search"
            class="input !w-64"
            placeholder="Search notebooks…"
          />
          <button class="btn-primary" @click="showCreate = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14" stroke-linecap="round" />
            </svg>
            New notebook
          </button>
        </div>
      </div>

      <div v-if="store.loading" class="flex items-center gap-2 text-neutral-500">
        <Spinner /> Loading…
      </div>

      <div v-else-if="filtered.length === 0" class="card p-10 text-center">
        <div class="text-lg font-semibold">No notebooks yet</div>
        <p class="text-neutral-500 text-sm mt-1">
          Create your first notebook to start uploading PDFs and chatting with your notes.
        </p>
        <button class="btn-primary mt-4" @click="showCreate = true">Create notebook</button>
      </div>

      <div
        v-else
        class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <NotebookCard
          v-for="n in filtered"
          :key="n.id"
          :notebook="n"
          @open="open(n.id)"
          @delete="confirmDelete = n"
        />
      </div>
    </main>

    <CreateNotebookModal
      :show="showCreate"
      @close="showCreate = false"
      @created="onCreated"
    />

    <AppModal
      :show="!!confirmDelete"
      title="Delete notebook"
      size="sm"
      @close="confirmDelete = null"
    >
      <div class="p-5 text-sm text-neutral-700">
        Are you sure you want to delete
        <span class="font-semibold">"{{ confirmDelete?.titulo }}"</span>? This will
        remove all its files, chats and generated items.
      </div>
      <template #footer>
        <button class="btn-secondary" @click="confirmDelete = null">Cancel</button>
        <button class="btn-danger" @click="doDelete">Delete</button>
      </template>
    </AppModal>
  </div>
</template>
