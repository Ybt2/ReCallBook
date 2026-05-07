<script setup>
defineProps({ data: Object });
</script>

<template>
  <div class="p-5 max-h-[70vh] overflow-y-auto scrollbar-thin">
    <p class="text-sm text-oc-light whitespace-pre-wrap leading-relaxed">{{ data?.content }}</p>
  </div>
</template>
