<script setup>
import { ref, computed } from "vue";

const props = defineProps({ message: Object, isLastUser: Boolean, editDisabled: Boolean });
const emit = defineEmits(["open-source", "edit-last", "pin"]);

const isUser = computed(() => props.message.role === "user");
const hovered = ref(false);
const copied = ref(false);

const tokens = computed(() => {
  const text = props.message.content || "";
  const out = [];
  const re = /\[(\d+)\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: "cite", value: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
});

function sourceFor(n) {
  const list = props.message.sources || [];
  return (
    list.find((s) => Number(s.index) === Number(n)) ||
    list[n - 1] ||
    null
  );
}

function sourceLabel(s) {
  const name = s.source_name || s.source || "Source";
  const ref = s.source_ref || s.reference || (s.page ? `p. ${s.page}` : "");
  return ref ? `${name} · ${ref}` : name;
}

function citeTitle(n) {
  const s = sourceFor(n);
  if (!s) return "";
  const label = sourceLabel(s);
  const preview = (s.text || s.pageContent || "").slice(0, 400);
  return preview ? `${label}\n\n${preview}` : label;
}

function onCiteClick(n) {
  const s = sourceFor(n);
  if (s && (s.docId || s.source)) emit("open-source", s);
}

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.message.content || "");
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch (_) {}
}
</script>

<template>
  <div
    :class="['flex flex-col', isUser ? 'items-end' : 'items-start']"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div class="max-w-[85%] sm:max-w-[75%]">
      <div
        class="text-sm whitespace-pre-wrap leading-relaxed inline-block text-left"
        :class="isUser
          ? 'rounded-btn px-4 py-2.5 bg-[#f4f4f4] text-[#1a1a1a]'
          : 'text-oc-light py-1'"
      >
        <template v-for="(t, i) in tokens" :key="i">
          <span v-if="t.type === 'text'">{{ t.value }}</span>
          <button
            v-else
            type="button"
            class="cite"
            :title="citeTitle(t.value)"
            @click="onCiteClick(t.value)"
          >[{{ t.value }}]</button>
        </template>
      </div>

      <div
        v-if="!isUser && (message.model || message.tokens)"
        class="mt-1 text-[11px] text-oc-muted flex items-center gap-2"
      >
        <span v-if="message.model">{{ message.model }}</span>
        <span v-if="message.tokens">· {{ message.tokens }} tokens</span>
        <span v-if="message.processingTime">· {{ message.processingTime }}s</span>
      </div>
    </div>

    <!-- AI action buttons: always visible at bottom -->
    <div v-if="!isUser" class="flex items-center gap-0.5 mt-2">
      <button
        class="w-6 h-6 flex items-center justify-center rounded-md text-oc-muted hover:text-brand-400 hover:bg-white/5 transition-colors"
        title="Pin as note"
        @click="emit('pin', message)"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z"/>
        </svg>
      </button>
      <button
        class="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
        :class="copied ? 'text-success' : 'text-oc-muted hover:text-oc-light hover:bg-white/5'"
        :title="copied ? 'Copied!' : 'Copy'"
        @click="copyContent"
      >
        <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </button>
    </div>

    <!-- User action buttons: reserved space, visible only on hover for last message -->
    <div
      v-if="isUser"
      class="flex items-center gap-0.5 mt-2 transition-opacity duration-150"
      :class="isLastUser && hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <button
        v-if="isLastUser && !editDisabled"
        class="w-6 h-6 flex items-center justify-center rounded-md text-oc-muted hover:text-oc-light hover:bg-black/5 transition-colors"
        title="Edit message"
        @click="emit('edit-last')"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button
        v-if="isLastUser"
        class="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
        :class="copied ? 'text-success' : 'text-oc-muted hover:text-oc-light hover:bg-black/5'"
        :title="copied ? 'Copied!' : 'Copy'"
        @click="copyContent"
      >
        <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.cite {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0 0.25rem;
  margin: 0 1px;
  border-radius: 0.375rem;
  font-size: 11px;
  font-weight: 600;
  background: rgba(0, 122, 255, 0.15);
  color: #007aff;
  cursor: pointer;
  vertical-align: baseline;
  transition: background 150ms;
}
.cite:hover { background: rgba(0, 122, 255, 0.25); }
</style>