<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { DocumentsAPI } from "../../api/documents";

const props = defineProps({ doc: Object });
const src = ref("");
let objectUrl = null;

onMounted(async () => {
  try {
    objectUrl = await DocumentsAPI.fetchObjectUrl(props.doc.id);
    src.value = objectUrl;
  } catch {
    src.value = "";
  }
});

onUnmounted(() => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});
</script>

<template>
  <div class="h-[75vh] w-full">
    <iframe
      v-if="src"
      :src="src"
      class="w-full h-full"
      frameborder="0"
      :title="doc.name"
    />
    <p v-else class="flex items-center justify-center h-full text-oc-mid text-sm">
      {{ $t("pdfViewer.unableToLoad") }}
    </p>
  </div>
</template>
