<script setup>
defineProps({
  show: Boolean,
  title: { type: String, default: "" },
  size: { type: String, default: "md" }, // sm | md | lg
});
defineEmits(["close"]);
</script>

<template>
  <transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="$emit('close')"
    >
      <div
        class="card w-full max-h-[90vh] overflow-hidden flex flex-col"
        :class="{
          'max-w-sm': size === 'sm',
          'max-w-lg': size === 'md',
          'max-w-3xl': size === 'lg',
          'max-w-5xl': size === 'xl',
        }"
      >
        <div
          v-if="title"
          class="flex items-center justify-between px-5 py-3 border-b border-neutral-200"
        >
          <h3 class="font-semibold text-neutral-900">{{ title }}</h3>
          <button class="btn-ghost !p-1" @click="$emit('close')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto scrollbar-thin">
          <slot />
        </div>
        <div v-if="$slots.footer" class="border-t border-neutral-200 px-5 py-3 flex justify-end gap-2">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
