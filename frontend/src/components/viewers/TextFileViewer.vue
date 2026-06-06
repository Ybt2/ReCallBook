<script setup>
import { ref, onMounted } from "vue";
import { DocumentsAPI } from "../../api/documents";

const props = defineProps({ doc: Object });
const content = ref("");
const loading = ref(true);
const error = ref(false);

onMounted(async () => {
  try {
    const blob = await DocumentsAPI.fetchBlob(props.doc.id);
    content.value = await blob.text();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="h-[75vh] w-full flex flex-col bg-oc-dark rounded overflow-hidden">
    <p v-if="loading" class="flex items-center justify-center h-full text-oc-mid text-sm">
      {{ $t("textViewer.loading") }}
    </p>
    <p v-else-if="error" class="flex items-center justify-center h-full text-oc-mid text-sm">
      {{ $t("textViewer.unableToLoad") }}
    </p>
    <pre
      v-else
      class="flex-1 overflow-auto text-sm text-oc-light leading-relaxed p-5 whitespace-pre-wrap font-mono m-0 scrollbar-thin"
    >{{ content }}</pre>
  </div>
</template>
