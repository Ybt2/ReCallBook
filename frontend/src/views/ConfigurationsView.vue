<script setup>
import AppHeader from "../components/common/AppHeader.vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
</script>

<template>
  <div class="h-full flex flex-col">
    <AppHeader :breadcrumbs="[{ label: 'Configurations' }]" />
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-2xl mx-auto p-6 sm:p-10 space-y-6">
        <h1 class="text-xl font-semibold text-neutral-900">Configurations</h1>
        <div class="card p-5 space-y-4">
          <h2 class="text-sm font-semibold text-neutral-700">Account</h2>
          <div class="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <span class="text-neutral-500">Username</span>
            <span class="text-neutral-900">{{ auth.user?.username || "—" }}</span>
            <span class="text-neutral-500">Email</span>
            <span class="text-neutral-900">{{ auth.user?.email || "—" }}</span>
          </div>
        </div>
        <div class="card p-5 space-y-4">
          <h2 class="text-sm font-semibold text-neutral-700">Model Preferences</h2>
          <p class="text-sm text-neutral-500">
            Model selection is available per-notebook in the chat panel.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>