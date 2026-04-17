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
        class="card px-4 py-3 flex items-start gap-3 shadow-md"
        :class="{
          'border-l-4 border-l-green-500': t.type === 'success',
          'border-l-4 border-l-red-500': t.type === 'error',
          'border-l-4 border-l-brand-500': t.type === 'info',
        }"
      >
        <div class="flex-1 text-sm text-neutral-800">{{ t.message }}</div>
        <button
          class="text-neutral-400 hover:text-neutral-700"
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
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
