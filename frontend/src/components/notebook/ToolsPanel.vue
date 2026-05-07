<script setup>
import { ref } from "vue";
import { useNotebookStore } from "../../stores/notebook";
import Spinner from "../common/Spinner.vue";
import QuizTool from "../tools/QuizTool.vue";
import FlashcardsTool from "../tools/FlashcardsTool.vue";

const store = useNotebookStore();
const emit = defineEmits(["open-asset"]);

const openMenuId = ref(null);

function toggleMenu(id, e) {
  e.stopPropagation();
  openMenuId.value = openMenuId.value === id ? null : id;
}

function closeMenu() {
  openMenuId.value = null;
}

async function handleRemove(id, e) {
  e.stopPropagation();
  closeMenu();
  if (!confirm("Are you sure you want to delete this item?")) return;
  await store.removeAsset(id);
}

async function handleRename(a, e) {
  e.stopPropagation();
  closeMenu();
  const newName = prompt("New name:", a.title);
  if (!newName?.trim() || newName.trim() === a.title) return;
  await store.renameAsset(a.id, newName.trim());
}
</script>

<template>
  <aside class="flex flex-col bg-oc-dark min-h-0 h-full" @click="closeMenu">
    <div class="px-4 py-3 border-b border-warm shrink-0">
      <h2 class="font-semibold text-sm text-oc-light">Studio</h2>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4 min-h-0">
      <div class="grid grid-cols-2 gap-2">
        <QuizTool />
        <FlashcardsTool />
      </div>

      <div v-if="store.isGenerating" class="space-y-2">
        <div
          v-for="n in 1"
          :key="n"
          class="card !shadow-none p-3 flex items-start gap-3 animate-pulse"
        >
          <div class="w-9 h-9 rounded-lg shrink-0 bg-oc-surface"></div>
          <div class="flex-1 space-y-2 py-1">
            <div class="h-3 bg-oc-surface rounded" :class="n === 1 ? 'w-3/4' : 'w-2/3'"></div>
            <div class="h-2 bg-oc-surface/50 rounded" :class="n === 1 ? 'w-1/2' : 'w-2/5'"></div>
          </div>
        </div>
      </div>

      <div v-if="store.assets.length" class="space-y-2">
        <div
          v-for="a in store.assets"
          :key="a.id"
          class="group card !shadow-none cursor-pointer p-3 flex items-start gap-3 transition-all duration-fast hover:border-oc-border relative"
          @click="emit('open-asset', a)"
        >
          <div
            class="w-9 h-9 rounded-lg shrink-0 grid place-items-center text-xs font-semibold"
            :class="a.type === 'quiz' ? 'bg-[#007aff]/15 text-[#007aff]' : a.type === 'note' ? 'bg-amber-500/15 text-amber-400' : 'bg-success/15 text-success'"
          >
            <svg v-if="a.type === 'note'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z"/>
            </svg>
            <template v-else>{{ a.type === 'quiz' ? 'Q' : 'F' }}</template>
          </div>

          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-oc-light truncate">{{ a.title }}</div>
            <div class="text-[11px] text-oc-mid mt-0.5 uppercase tracking-wider">
              {{ new Date(a.created_at).toLocaleDateString() }}
            </div>
          </div>

          <!-- 3-dot menu trigger -->
          <div class="relative shrink-0">
            <button
              class="btn-ghost !p-1 text-oc-muted hover:text-oc-light transition-colors duration-fast"
              :class="openMenuId === a.id ? 'text-oc-light' : ''"
              title="More options"
              @click.stop="toggleMenu(a.id, $event)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>

            <!-- Dropdown -->
            <div
              v-if="openMenuId === a.id"
              class="absolute right-0 top-full mt-1 z-50 min-w-[130px] bg-oc-surface border border-warm rounded-lg shadow-lg py-1 overflow-hidden"
              @click.stop
            >
              <button
                class="w-full text-left px-3 py-2 text-sm text-oc-light hover:bg-white/5 transition-colors flex items-center gap-2"
                @click="handleRename(a, $event)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Rename
              </button>
              <button
                class="w-full text-left px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors flex items-center gap-2"
                @click="handleRemove(a.id, $event)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="store.loading.assets" class="text-sm text-oc-mid flex items-center gap-2 p-2">
        <Spinner /> Loading…
      </div>
      <div v-else-if="!store.assets.length && store.documents.length && !store.isGenerating" class="p-4 text-center text-sm text-oc-mid">
        Nothing yet. The result of the model will be stored here
      </div>
    </div>
  </aside>
</template>