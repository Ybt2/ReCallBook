<script setup>
import { computed } from "vue";
const props = defineProps({ message: Object });

const isUser = computed(() => props.message.role === "user");

function fmtSource(s) {
  const name = s.source_name || s.name || s.fileName || "Source";
  const ref = s.source_ref || s.location || s.page || "";
  return ref ? `${name} — ${ref}` : name;
}
</script>

<template>
  <div :class="['flex gap-3', isUser ? 'flex-row-reverse' : '']">
    <div
      class="w-8 h-8 shrink-0 rounded-full grid place-items-center text-xs font-semibold"
      :class="isUser ? 'bg-neutral-900 text-white' : 'bg-brand-100 text-brand-700'"
    >
      {{ isUser ? "You" : "AI" }}
    </div>
    <div class="max-w-[75%]">
      <div
        class="rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed"
        :class="isUser ? 'bg-brand-600 text-white' : 'text-neutral-800'"
      >
        {{ message.content }}
      </div>
      <div
        v-if="!isUser && message.sources?.length"
        class="mt-2 flex flex-wrap gap-1.5"
      >
        <span
          v-for="(s, i) in message.sources"
          :key="i"
          class="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200"
          :title="s.pageContent || s.content || ''"
        >
          {{ fmtSource(s) }}
        </span>
      </div>
    </div>
  </div>
</template>
