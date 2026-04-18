<script setup>
import { computed } from "vue";

const props = defineProps({ message: Object });
const emit = defineEmits(["open-source"]);

const isUser = computed(() => props.message.role === "user");

// Split content into plain-text spans and citation tokens like [1]
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
</script>

<template>
  <div :class="['flex', isUser ? 'justify-end' : 'justify-start']">
    <div :class="['max-w-[85%] sm:max-w-[75%]', isUser ? 'text-right' : '']">
      
      <div
        class="text-sm whitespace-pre-wrap leading-relaxed inline-block text-left"
        :class="isUser 
          ? 'rounded-2xl px-4 py-2.5 bg-brand-600 text-white' 
          : 'text-neutral-800 py-1'"
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
        class="mt-1 text-[11px] text-neutral-500 flex items-center gap-2"
      >
        <span v-if="message.model" class="inline-flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
          </svg>
          {{ message.model }}
        </span>
        <span v-if="message.tokens">· {{ message.tokens }} tokens</span>
        <span v-if="message.processingTime">· {{ message.processingTime }}s</span>
      </div>
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
  background: rgb(224 242 254);
  color: rgb(2 132 199);
  cursor: pointer;
  vertical-align: baseline;
  transition: background 0.15s;
}
.cite:hover { background: rgb(186 230 253); }
</style>
