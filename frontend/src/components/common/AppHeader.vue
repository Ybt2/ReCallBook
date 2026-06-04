<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useThemeStore } from "../../stores/theme";

const router = useRouter();
const auth = useAuthStore();
const theme = useThemeStore();
const logoSrc = computed(() =>
  theme.resolvedTheme === "light" ? "/logo_black.png" : "/logo_white.png"
);
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
  <header class="h-14 bg-oc-dark border-b border-warm px-5 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-3">
      <router-link to="/dashboard" class="flex items-center gap-2 font-bold text-oc-light">
        <img :src="logoSrc" class="h-7 w-auto" alt="RecallBook" />
        RecallBook
      </router-link>
    </div>
    <div class="relative" @focusout="closeDropdown">
      <button
        class="flex items-center gap-2 rounded-btn px-2 py-1.5 hover:bg-oc-surface transition-colors duration-fast"
        @click="showDropdown = !showDropdown"
      >
        <span class="text-sm text-oc-mid hidden sm:block">
          {{ auth.user?.username }}
        </span>
        <div class="w-8 h-8 rounded-full bg-oc-surface text-oc-light grid place-items-center font-bold text-sm border border-warm">
          {{ (auth.user?.username || "?")[0].toUpperCase() }}
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          class="text-oc-mid transition-transform duration-fast" :class="showDropdown ? 'rotate-180' : ''"
        >
          <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div
        v-if="showDropdown"
        class="absolute right-0 top-full mt-1 w-48 bg-oc-surface border border-warm rounded-btn z-50 py-1"
      >
        <button
          class="w-full text-left px-4 py-2 text-sm text-oc-light hover:bg-oc-dark flex items-center gap-2"
          @click="openConfigurations"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          {{ $t("appHeader.configurations") }}
        </button>
        <div class="border-t border-warm my-1"></div>
        <button
          class="w-full text-left px-4 py-2 text-sm text-danger hover:bg-oc-dark flex items-center gap-2"
          @click="logout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          {{ $t("appHeader.logout") }}
        </button>
      </div>
    </div>
  </header>
</template>
