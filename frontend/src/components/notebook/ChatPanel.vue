<script setup>
import { ref, nextTick, watch, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useNotebookStore } from "../../stores/notebook";
import { useModelStore } from "../../stores/models";
import { useToastStore } from "../../stores/toast";
import { OllamaAPI } from "../../api/ollama";
import Spinner from "../common/Spinner.vue";
import ChatMessage from "./ChatMessage.vue";

const { t } = useI18n();
const store = useNotebookStore();
const modelStore = useModelStore();
const toasts = useToastStore();
const emit = defineEmits(["open-source"]);

const input = ref("");
const editText = ref("");
const editingLast = ref(false);
const scroller = ref(null);

// Model picker
const models = ref([]);
const loadingModels = ref(false);
const showModelMenu = ref(false);
const newModelName = ref("");
const installing = ref(false);
const installProgress = ref(null); // { percent, status, total, completed }

const disabled = computed(
  () =>
    !!store.streaming ||
    !input.value.trim() ||
    !store.notebook ||
    store.isGenerating ||
    store.loading.upload ||
    !store.selectedDocIds.size ||
    (!store.selectedModel && !modelStore.hasModels)
);

const lastUserMsgId = computed(() => {
  const last = [...store.messages].reverse().find((m) => m.role === "user");
  return last?.id ?? null;
});

const editDisabled = computed(() => !!store.streaming || !!store.loading.upload);

const currentModel = computed(() => store.selectedModel || modelStore.generalModel || models.value[0]?.name || "No model configured");

async function loadModels() {
  loadingModels.value = true;
  try {
    models.value = await OllamaAPI.list();
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
  if (store.selectedModel && models.value.length && !models.value.some((m) => m.name === store.selectedModel)) {
    toasts.error(t("chatPanel.modelNotAvailable", { name: store.selectedModel }));
    return;
  }
  if (!store.selectedModel && !modelStore.hasModels) {
    toasts.error(t("chatPanel.noModelConfigured"));
    return;
  }
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

function startEditLast() {
  const lastUser = [...store.messages].reverse().find((m) => m.role === "user");
  if (!lastUser || store.streaming || store.loading.upload) return;
  editText.value = lastUser.content || "";
  editingLast.value = true;
}

function cancelEditLast() {
  editingLast.value = false;
  editText.value = "";
}

async function saveEditLast() {
  if (!editText.value.trim()) return;
  await store.editLastUserMessage(editText.value);
  editingLast.value = false;
  editText.value = "";
}

function pickModel(name) {
  store.setModel(name === "__general__" ? "" : name);
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
      toasts.success(t("chatPanel.modelInstalled", { name }));
      newModelName.value = "";
      installing.value = false;
      installProgress.value = null;
      await loadModels();
      store.setModel(name);
    },
    onError: (m) => {
      toasts.error(t("chatPanel.installFailed", { message: m }));
      installing.value = false;
      installProgress.value = null;
    },
  });
}

function onSourceClick(s) {
  emit("open-source", s);
}

async function pinMessage(message) {
  try {
    await store.pinMessage(message);
    toasts.success(t("chatPanel.answerPinned"));
  } catch (e) {
    toasts.error(e.message || t("chatPanel.failedToPin"));
  }
}
</script>

<template>
  <section class="flex flex-col bg-oc-dark min-h-0 h-full">
    <div class="px-4 sm:px-5 py-3 border-b border-warm bg-oc-dark shrink-0 flex items-center justify-between">
      <div>
        <h2 class="font-bold text-sm text-oc-light">{{ $t("chatPanel.chat") }}</h2>
      </div>
      <div class="text-[11px] text-oc-mid hidden sm:block">
        {{ $t("chatPanel.sourcesActive", { count: store.selectedDocIds.size }) }}
      </div>
    </div>

    <div ref="scroller" class="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-6 py-4 sm:py-6 space-y-4 min-h-0">
      <div v-if="store.loading.messages" class="text-sm text-oc-mid flex items-center gap-2">
        <Spinner /> {{ $t("chatPanel.loadingConversation") }}
      </div>
      <div
        v-else-if="!store.messages.length && !store.streaming"
        class="max-w-md mx-auto text-center text-oc-mid mt-6 sm:mt-10"
      >
        <div class="w-12 h-12 rounded-full bg-oc-surface text-oc-light grid place-items-center mx-auto text-xl font-bold mb-3 border border-warm">R</div>
        <div class="text-oc-light font-medium">{{ $t("chatPanel.startConversation") }}</div>
        <p class="text-sm mt-1">
          {{ $t("chatPanel.startConversationDesc") }}
        </p>
      </div>

      <ChatMessage
        v-for="m in store.messages"
        :key="m.id"
        :message="m"
        :isLastUser="m.id === lastUserMsgId"
        :editDisabled="editDisabled"
        @open-source="onSourceClick"
        @edit-last="startEditLast"
        @pin="pinMessage"
      />

      <div v-if="store.streaming" class="space-y-2">
        <transition-group
          name="stage"
          tag="div"
          class="flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%]"
        >
          <div
            v-for="s in store.streaming.stages"
            :key="s.key"
            class="flex items-center justify-between gap-3 px-3 py-1.5 rounded-btn text-xs border transition-colors duration-fast"
            :class="s.state === 'done'
              ? 'bg-oc-surface border-success/30 text-success'
              : 'bg-oc-surface border-warm text-oc-mid'"
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
          class="rounded-btn px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed inline-block bg-oc-surface border border-warm text-oc-light max-w-[85%] sm:max-w-[75%]"
        >
          {{ store.streaming.content }}<span class="inline-block w-1.5 h-3.5 bg-brand-500 align-[-2px] ml-0.5 animate-pulse" />
        </div>
      </div>
    </div>

    <div class="p-3 shrink-0">
      <div v-if="installing" class="max-w-4xl mx-auto mb-2">
        <div class="flex items-center justify-between text-[11px] text-oc-mid mb-1">
           <span class="truncate">{{ $t("chatPanel.installing", { name: newModelName, status: installProgress?.status || "…" }) }}</span>
          <span v-if="installProgress?.percent != null">{{ installProgress.percent }}%</span>
        </div>
        <div class="h-1.5 bg-oc-surface rounded-full overflow-hidden">
          <div
            class="h-full bg-brand-500 transition-[width] duration-300"
            :style="{ width: (installProgress?.percent ?? 10) + '%' }"
          />
        </div>
      </div>

      <div class="max-w-4xl mx-auto">
        <div class="rounded-2xl border border-warm bg-oc-dark/60 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus-within:shadow-[0_0_0_2px_rgba(59,130,246,0.35)] transition-shadow">
          <textarea
            v-model="input"
            rows="1"
            class="w-full bg-transparent text-sm text-oc-light placeholder-oc-mid px-4 pt-3 pb-2 resize-none max-h-40 outline-none border-none focus:ring-0"
            :class="{ 'opacity-50 cursor-not-allowed': store.isGenerating || store.loading.upload || !store.documents.length }"
            :placeholder="store.loading.upload ? $t('chatPanel.placeholderUploading') : (!store.documents.length ? $t('chatPanel.placeholderNoDocs') : (store.isGenerating ? $t('chatPanel.placeholderGenerating') : (!store.selectedModel && !modelStore.hasModels ? $t('chatPanel.placeholderNoModel') : $t('chatPanel.placeholderAsk'))))"
            :disabled="store.isGenerating || store.loading.upload || !store.documents.length"
            @keydown="onKey"
          />

          <div class="flex items-center justify-between px-3 pb-3 pt-1 gap-2">
            <div class="relative">
              <button
                type="button"
                class="flex items-center gap-1.5 text-xs text-oc-mid hover:text-oc-light transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
                @click="showModelMenu = !showModelMenu"
                :title="currentModel"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <span class="max-w-[9rem] truncate">{{ currentModel }}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>

              <div
                v-if="showModelMenu"
                class="absolute bottom-full left-0 mb-2 w-72 bg-oc-surface border border-warm rounded-btn z-30 p-2 space-y-1"
              >
                <div class="flex items-center justify-between px-2 py-1">
                  <span class="text-[11px] font-bold text-oc-mid uppercase">{{ $t("common.installed") }}</span>
                  <button
                    class="text-[11px] text-brand-500 hover:underline"
                    @click="loadModels"
                    :disabled="loadingModels"
                  >{{ loadingModels ? "…" : $t("common.refresh") }}</button>
                </div>
                <div v-if="!models.length" class="text-xs text-oc-mid px-2 py-1">
                  {{ $t("common.noModelsFound") }}
                </div>
                <button
                  type="button"
                  class="w-full text-left px-2 py-1.5 rounded-btn text-sm hover:bg-oc-dark flex items-center justify-between"
                  :class="!store.selectedModel ? 'bg-oc-dark text-brand-500' : 'text-oc-mid'"
                  @click="pickModel('__general__')"
                >
                  <span class="truncate">{{ $t("common.generalFromSettings") }}</span>
                  <span v-if="modelStore.generalModel" class="text-[10px] text-oc-mid ml-2">{{ modelStore.generalModel }}</span>
                </button>
                <button
                  v-for="m in models"
                  :key="m.name"
                  type="button"
                  class="w-full text-left px-2 py-1.5 rounded-btn text-sm hover:bg-oc-dark flex items-center justify-between"
                  :class="m.name === store.selectedModel ? 'bg-oc-dark text-brand-500' : 'text-oc-light'"
                  @click="pickModel(m.name)"
                >
                  <span class="truncate">{{ m.name }}</span>
                  <span v-if="m.parameterSize" class="text-[10px] text-oc-mid ml-2">{{ m.parameterSize }}</span>
                </button>
                <div class="border-t border-warm pt-2 mt-2">
                  <div class="text-[11px] font-bold text-oc-mid uppercase px-2 mb-1">{{ $t("common.installNew") }}</div>
                  <div class="flex gap-1 px-1">
                    <input
                      v-model="newModelName"
                      class="input !py-1.5 !text-xs flex-1"
                      :placeholder="$t('common.modelPlaceholder')"
                      :disabled="installing"
                      @keydown.enter.prevent="installModel"
                    />
                    <button
                      class="btn-primary !py-1.5 !px-2 !text-xs"
                      :disabled="installing || !newModelName.trim()"
                      @click="installModel"
                    >
                      <Spinner v-if="installing" :size="10" />
                      <span v-else>{{ $t("common.pull") }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                :disabled="!store.streaming && disabled"
                @click="store.streaming ? store.stopStreaming() : submit()"
                :aria-label="store.streaming ? $t('chatPanel.stopGenerating') : $t('chatPanel.sendMessage')"
              >
                <svg v-if="store.streaming" width="12" height="12" viewBox="0 0 12 12" fill="white">
                  <rect x="0" y="0" width="12" height="12" rx="2"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="text-[11px] text-oc-muted text-center mt-1.5 hidden sm:block">
          {{ $t("chatPanel.disclaimer") }}
        </div>
      </div>

      <div v-if="editingLast" class="max-w-4xl mx-auto mt-2 p-2 rounded-btn border border-warm bg-oc-surface">
        <textarea
          v-model="editText"
          rows="3"
          class="input w-full resize-y"
          :disabled="store.streaming || store.loading.upload"
        />
        <div class="mt-2 flex justify-end gap-2">
          <button class="btn-ghost !py-1.5 !px-2.5 !text-xs" @click="cancelEditLast">{{ $t("chatPanel.cancel") }}</button>
          <button class="btn-primary !py-1.5 !px-2.5 !text-xs" :disabled="!editText.trim()" @click="saveEditLast">{{ $t("chatPanel.resend") }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stage-enter-active { transition: all 150ms ease; }
.stage-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.stage-move { transition: transform 150ms ease; }
</style>
