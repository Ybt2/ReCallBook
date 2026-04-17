<script setup>
import { ref, nextTick, watch, computed } from "vue";
import { useNotebookStore } from "../../stores/notebook";
import Spinner from "../common/Spinner.vue";
import ChatMessage from "./ChatMessage.vue";

const store = useNotebookStore();
const input = ref("");
const scroller = ref(null);

const disabled = computed(
  () => store.loading.chat || !input.value.trim() || !store.notebook
);

async function scrollBottom() {
  await nextTick();
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
}

watch(() => store.messages.length, scrollBottom);
watch(() => store.loading.chat, scrollBottom);

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
</script>

<template>
  <section class="flex flex-col bg-neutral-50 min-h-0 border-r border-neutral-200">
    <div class="px-5 py-3 border-b border-neutral-200 bg-white shrink-0">
      <h2 class="font-semibold text-sm">Chat</h2>
      <p class="text-xs text-neutral-500">
        Ask anything grounded in your selected sources.
      </p>
    </div>

    <div ref="scroller" class="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-4 min-h-0">
      <div v-if="store.loading.messages" class="text-sm text-neutral-500 flex items-center gap-2">
        <Spinner /> Loading conversation…
      </div>
      <div
        v-else-if="!store.messages.length"
        class="max-w-md mx-auto text-center text-neutral-500 mt-10"
      >
        <div class="w-12 h-12 rounded-full bg-brand-100 text-brand-700 grid place-items-center mx-auto text-xl font-bold mb-3">R</div>
        <div class="text-neutral-800 font-medium">Start the conversation</div>
        <p class="text-sm mt-1">
          Select the files you want to include, then ask a question.
          Answers will cite their sources.
        </p>
      </div>
      <ChatMessage v-for="m in store.messages" :key="m.id" :message="m" />
      <div v-if="store.loading.chat" class="flex items-center gap-2 text-sm text-neutral-500">
        <Spinner /> Thinking…
      </div>
    </div>

    <div class="border-t border-neutral-200 bg-white p-3 shrink-0">
      <div class="flex items-end gap-2 max-w-4xl mx-auto">
        <textarea
          v-model="input"
          rows="1"
          class="input !py-3 resize-none max-h-40"
          placeholder="Ask about your sources…"
          @keydown="onKey"
        />
        <button class="btn-primary h-11" :disabled="disabled" @click="submit">
          <Spinner v-if="store.loading.chat" />
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="text-[11px] text-neutral-400 text-center mt-1">
        {{ store.selectedDocIds.size }} source(s) active · Enter to send · Shift+Enter for newline
      </div>
    </div>
  </section>
</template>
