<script setup>
import { useToastStore } from "../../stores/toast";
const toasts = useToastStore();
</script>

<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
    <transition-group name="toast">
      <div
        v-for="t in toasts.items"
        :key="t.id"
        class="card px-4 py-3 flex items-start gap-3"
        :class="{
          'border-l-4 border-l-success': t.type === 'success',
          'border-l-4 border-l-danger': t.type === 'error',
          'border-l-4 border-l-brand-500': t.type === 'info',
        }"
      >
        <div class="flex-1 text-sm text-oc-light">{{ t.message }}</div>
        <button
          class="text-oc-mid hover:text-oc-light"
          @click="toasts.dismiss(t.id)"
        >
          ×
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 150ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
