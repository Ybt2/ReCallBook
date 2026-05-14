<script setup>
import { computed } from "vue";
const props = defineProps({ notebook: Object });
defineEmits(["open", "delete"]);

const date = computed(() => {
  const d = new Date(props.notebook.updated_at || props.notebook.created_at);
  return d.toLocaleDateString();
});

const colors = [
  "from-brand-400 to-brand-600",
  "from-emerald-400 to-emerald-600",
  "from-sky-400 to-blue-500",
  "from-pink-400 to-rose-500",
  "from-purple-400 to-indigo-500",
  "from-sky-400 to-cyan-500",
];

function hashId(id) {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const color = computed(() => colors[hashId(props.notebook.id) % colors.length]);
</script>

<template>
  <div
    class="card group hover:border-oc-border transition-colors duration-fast cursor-pointer overflow-hidden"
    @click="$emit('open')"
  >
    <div
      class="h-28 bg-oc-surface flex items-end p-3 border-b border-warm"
    >
      <div class="text-oc-mid text-xs font-medium">
        {{ notebook.fileCount || 0 }} file{{ (notebook.fileCount || 0) === 1 ? "" : "s" }}
      </div>
    </div>
    <div class="p-4 flex items-start justify-between gap-2">
      <div class="min-w-0">
        <div class="font-bold text-oc-light truncate">{{ notebook.titulo }}</div>
        <div class="text-xs text-oc-mid mt-0.5">Updated {{ date }}</div>
      </div>
      <button
        class="btn-ghost !p-1.5 opacity-0 group-hover:opacity-100 text-oc-mid hover:text-danger"
        title="Delete"
        @click.stop="$emit('delete')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      </button>
    </div>
  </div>
</template>
