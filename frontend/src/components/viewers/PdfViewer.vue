<script setup>
import { computed } from "vue";
import { DocumentsAPI } from "../../api/documents";

const props = defineProps({ doc: Object });
const src = computed(() => DocumentsAPI.fileUrl(props.doc.id, props.doc.page));
</script>

<template>
  <div class="h-[75vh] w-full">
    <iframe
      :src="src"
      class="w-full h-full"
      frameborder="0"
      :title="doc.name"
    />
  </div>
</template>
