<script setup>
import { computed } from "vue";
import { DocumentsAPI } from "../../api/documents";

const props = defineProps({ doc: Object });
const src = computed(() => DocumentsAPI.fileUrl(props.doc.id));
</script>

<template>
  <div class="h-[75vh] w-full flex items-center justify-center bg-neutral-50 rounded overflow-auto">
    <img
      :src="src"
      :alt="doc.name"
      class="max-w-full max-h-full object-contain"
    />
  </div>
</template>
