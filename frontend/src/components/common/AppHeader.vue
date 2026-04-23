<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";

const router = useRouter();
const auth = useAuthStore();
const showDropdown = ref(false);

function logout() {
  auth.logout();
  showDropdown.value = false;
  router.push({ name: "login" });
}

function openConfigurations() {
  showDropdown.value = false;
  router.push({ name: "configurations" });
}

function closeDropdown(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    showDropdown.value = false;
  }
}

defineProps({
  breadcrumbs: { type: Array, default: () => [] },
});
</script>

<template>
  <header class="h-14 bg-white border-b border-neutral-200 px-5 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-3">
      <router-link to="/dashboard" class="flex items-center gap-2 font-semibold text-neutral-900">
        <span class="w-7 h-7 rounded-md bg-brand-600 text-white grid place-items-center text-sm">R</span>
        RecallBook
      </router-link>
    </div>
    <div class="relative" @focusout="closeDropdown">
      <button
        class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-50 transition-colors"
        @click="showDropdown = !showDropdown"
      >
        <span class="text-sm text-neutral-600 hidden sm:block">
          {{ auth.user?.username }}
        </span>
        <div class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold text-sm">
          {{ (auth.user?.username || "?")[0].toUpperCase() }}
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          class="text-neutral-400 transition-transform" :class="showDropdown ? 'rotate-180' : ''"
        >
          <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div
        v-if="showDropdown"
        class="absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 py-1"
      >
        <button
          class="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
          @click="openConfigurations"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Configurations
        </button>
        <div class="border-t border-neutral-100 my-1"></div>
        <button
          class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          @click="logout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Logout
        </button>
      </div>
    </div>
  </header>
</template>
