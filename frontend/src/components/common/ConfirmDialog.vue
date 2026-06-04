<script setup>
import AppModal from "./AppModal.vue";

defineProps({
  show: Boolean,
  title: { type: String, default: "Confirm" },
  message: { type: String, default: "Are you sure?" },
  confirmLabel: { type: String, default: "Delete" },
  danger: { type: Boolean, default: true },
});

const emit = defineEmits(["confirm", "cancel"]);
</script>

<template>
  <AppModal :show="show" :title="title" size="sm" @close="emit('cancel')">
    <div class="p-5 text-sm text-oc-mid">
      {{ message }}
    </div>
    <template #footer>
      <button class="btn-secondary" @click="emit('cancel')">{{ $t("confirmDialog.cancel") }}</button>
      <button
        :class="danger ? 'btn-danger' : 'btn-primary'"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </AppModal>
</template>
