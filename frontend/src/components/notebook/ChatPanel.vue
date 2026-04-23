<script setup>
import { ref, nextTick, watch, computed, onMounted } from "vue";
import { useNotebookStore } from "../../stores/notebook";
import { useToastStore } from "../../stores/toast";
import { OllamaAPI } from "../../api/ollama";
import Spinner from "../common/Spinner.vue";
import ChatMessage from "./ChatMessage.vue";

const store = useNotebookStore();
const toasts = useToastStore();
const emit = defineEmits(["open-source"]);

const input = ref("");
const scroller = ref(null);

// Model picker
const models = ref([]);
const loadingModels = ref(false);
const showModelMenu = ref(false);
const newModelName = ref("");
const installing = ref(false);
const installProgress = ref(null); // { percent, status, total, completed }

const disabled = computed(
  () => !!store.streaming || !input.value.trim() || !store.notebook || store.isGenerating
);

const currentModel = computed(() => store.selectedModel || models.value[0]?.name || "default");

async function loadModels() {
  loadingModels.value = true;
  try {
    models.value = await OllamaAPI.list();
    if (!store.selectedModel && models.value[0]) store.setModel(models.value[0].name);
  } catch (e) {
    // silent — Ollama may be offline
  } finally {
    loadingModels.value = false;
  }
}

onMounted(loadModels);

async function scrollBottom() {
  await nextTick();
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
}

watch(() => store.messages.length, scrollBottom);
watch(() => store.streaming?.content, scrollBottom);
watch(() => store.streaming?.stages?.length, scrollBottom);

async function submit() {
  if (disabled.value) return;
  const text = input.value;
  input.value = "";
  await store.sendMessage(text);
}

function onKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
}

function pickModel(name) {
  store.setModel(name);
  showModelMenu.value = false;
}

async function installModel() {
  const name = newModelName.value.trim();
  if (!name || installing.value) return;
  installing.value = true;
  installProgress.value = { percent: 0, status: "starting", total: 0, completed: 0 };
  await OllamaAPI.pull(name, {
    onProgress: (p) => (installProgress.value = p),
    onDone: async () => {
      toasts.success(`Model "${name}" installed`);
      newModelName.value = "";
      installing.value = false;
      installProgress.value = null;
      await loadModels();
      store.setModel(name);
    },
    onError: (m) => {
      toasts.error(`Install failed: ${m}`);
      installing.value = false;
      installProgress.value = null;
    },
  });
}

function onSourceClick(s) {
  emit("open-source", s);
}
</script>

<template>
  <section class="flex flex-col bg-neutral-50 min-h-0 h-full">
    <div class="px-4 sm:px-5 py-3 border-b border-neutral-200 bg-white shrink-0 flex items-center justify-between">
      <div>
        <h2 class="font-semibold text-sm">Chat</h2>
        <p class="text-xs text-neutral-500 hidden sm:block">
          Ask anything grounded in your selected sources.
        </p>
      </div>
      <div class="text-[11px] text-neutral-500 hidden sm:block">
        {{ store.selectedDocIds.size }} source(s) active
      </div>
    </div>

    <div ref="scroller" class="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-6 py-4 sm:py-6 space-y-4 min-h-0">
      <div v-if="store.loading.messages" class="text-sm text-neutral-500 flex items-center gap-2">
        <Spinner /> Loading conversation…
      </div>
      <div
        v-else-if="!store.messages.length && !store.streaming"
        class="max-w-md mx-auto text-center text-neutral-500 mt-6 sm:mt-10"
      >
        <div class="w-12 h-12 rounded-full bg-brand-100 text-brand-700 grid place-items-center mx-auto text-xl font-bold mb-3">R</div>
        <div class="text-neutral-800 font-medium">Start the conversation</div>
        <p class="text-sm mt-1">
          Select the files you want to include, then ask a question.
          Answers will cite their sources.
        </p>
      </div>

      <ChatMessage
        v-for="m in store.messages"
        :key="m.id"
        :message="m"
        @open-source="onSourceClick"
      />

      <!-- Streaming assistant bubble -->
      <div v-if="store.streaming" class="space-y-2">
        <!-- Pipeline stages -->
        <transition-group
          name="stage"
          tag="div"
          class="flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%]"
        >
          <div
            v-for="s in store.streaming.stages"
            :key="s.key"
            class="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg text-xs border transition-colors duration-300"
            :class="s.state === 'done'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-neutral-200 text-neutral-700'"
          >
            <span>{{ s.label }}</span>
            <span>
              <svg
                v-if="s.state === 'done'"
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="3"
              >
                <path d="M5 12l5 5 9-11" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <Spinner v-else :size="12" />
            </span>
          </div>
        </transition-group>

        <div
          v-if="store.streaming.content"
          class="rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed inline-block bg-white border border-neutral-200 text-neutral-800 max-w-[85%] sm:max-w-[75%]"
        >
          {{ store.streaming.content }}<span class="inline-block w-1.5 h-3.5 bg-brand-500 align-[-2px] ml-0.5 animate-pulse" />
        </div>
      </div>
    </div>

    <div class="p-3 shrink-0">
      <!-- Install progress bar -->
      <div v-if="installing" class="max-w-4xl mx-auto mb-2">
        <div class="flex items-center justify-between text-[11px] text-neutral-600 mb-1">
          <span class="truncate">Installing {{ newModelName }} · {{ installProgress?.status || "…" }}</span>
          <span v-if="installProgress?.percent != null">{{ installProgress.percent }}%</span>
        </div>
        <div class="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-brand-500 transition-[width] duration-300"
            :style="{ width: (installProgress?.percent ?? 10) + '%' }"
          />
        </div>
      </div>

      <div class="flex items-end gap-2 max-w-4xl mx-auto">
        <!-- Model selector -->
        <div class="relative">
          <button
            type="button"
            class="btn-ghost !px-2.5 !py-2 !text-xs border border-neutral-200 rounded-lg flex items-center gap-1 h-11"
            @click="showModelMenu = !showModelMenu"
            :title="currentModel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span class="max-w-[7rem] truncate hidden sm:inline">{{ currentModel }}</span>
          </button>
          <div
            v-if="showModelMenu"
            class="absolute bottom-full left-0 mb-2 w-72 bg-white border border-neutral-200 rounded-xl shadow-lg z-30 p-2 space-y-1"
          >
            <div class="flex items-center justify-between px-2 py-1">
              <span class="text-[11px] font-semibold text-neutral-500 uppercase">Installed</span>
              <button
                class="text-[11px] text-brand-600 hover:underline"
                @click="loadModels"
                :disabled="loadingModels"
              >{{ loadingModels ? "…" : "refresh" }}</button>
            </div>
            <div v-if="!models.length" class="text-xs text-neutral-500 px-2 py-1">
              No models found. Install one below.
            </div>
            <button
              v-for="m in models"
              :key="m.name"
              type="button"
              class="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-neutral-50 flex items-center justify-between"
              :class="m.name === store.selectedModel ? 'bg-brand-50 text-brand-700' : 'text-neutral-800'"
              @click="pickModel(m.name)"
            >
              <span class="truncate">{{ m.name }}</span>
              <span v-if="m.parameterSize" class="text-[10px] text-neutral-500 ml-2">{{ m.parameterSize }}</span>
            </button>
            <div class="border-t border-neutral-100 pt-2 mt-2">
              <div class="text-[11px] font-semibold text-neutral-500 uppercase px-2 mb-1">Install new</div>
              <div class="flex gap-1 px-1">
                <input
                  v-model="newModelName"
                  class="input !py-1.5 !text-xs flex-1"
                  placeholder="e.g. llama3.2:3b"
                  :disabled="installing"
                  @keydown.enter.prevent="installModel"
                />
                <button
                  class="btn-primary !py-1.5 !px-2 !text-xs"
                  :disabled="installing || !newModelName.trim()"
                  @click="installModel"
                >
                  <Spinner v-if="installing" :size="10" />
                  <span v-else>Pull</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <textarea
          v-model="input"
          rows="1"
          class="input !py-3 resize-none max-h-40 flex-1"
          :class="{ 'opacity-50 cursor-not-allowed': store.isGenerating }"
          :placeholder="store.isGenerating ? 'Generating…' : 'Ask about your sources…'"
          :disabled="store.isGenerating"
          @keydown="onKey"
        />
        <button class="btn-primary h-11" :disabled="disabled" @click="submit" aria-label="Send message">
          <Spinner v-if="store.streaming" />
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="text-[11px] text-neutral-600 text-center mt-1 hidden sm:block">
        ReCallBook may be inaccurate. We advise verifying the answers.
      </div>
    </div>
  </section>
</template>

<style scoped>
.stage-enter-active { transition: all 0.3s ease; }
.stage-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.stage-move { transition: transform 0.3s ease; }
</style>
