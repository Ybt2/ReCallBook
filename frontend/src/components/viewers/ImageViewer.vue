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
  <div class="h-[75vh] w-full flex items-center justify-center bg-oc-dark rounded overflow-auto">
    <img
      v-if="src"
      :src="src"
      :alt="doc.name"
      class="max-w-full max-h-full object-contain"
    />
    <p v-else class="text-oc-mid text-sm">{{ $t("imageViewer.unableToLoad") }}</p>
  </div>
</template>