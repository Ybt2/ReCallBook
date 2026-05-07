<script setup>
import { ref } from "vue";
import { Sun, Moon, Monitor } from "lucide-vue-next";
import AppHeader from "../components/common/AppHeader.vue";
import { useAuthStore, SUPPORTED_LANGUAGES } from "../stores/auth";
import { useThemeStore } from "../stores/theme";
import { useToastStore } from "../stores/toast";

const auth = useAuthStore();
const theme = useThemeStore();
const toasts = useToastStore();

const selectedLanguage = ref(auth.userLanguage);

async function saveLanguage() {
  const ok = await auth.updateLanguage(selectedLanguage.value);
  if (ok) toasts.success("Language updated.");
  else toasts.error(auth.error || "Failed to update language.");
}

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];
</script>

<template>
  <div class="h-full flex flex-col bg-oc-dark">
    <AppHeader :breadcrumbs="[{ label: 'Configurations' }]" />
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-2xl mx-auto p-6 sm:p-10 space-y-6">
        <h1 class="text-xl font-bold text-oc-light">Configurations</h1>
        <div class="card p-5 space-y-4">
          <h2 class="text-sm font-bold text-oc-light">Account</h2>
          <div class="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <span class="text-oc-mid">Username</span>
            <span class="text-oc-light">{{ auth.user?.username || "—" }}</span>
            <span class="text-oc-mid">Email</span>
            <span class="text-oc-light">{{ auth.user?.email || "—" }}</span>
          </div>
        </div>
        <div class="card p-5 space-y-4">
          <h2 class="text-sm font-bold text-oc-light">Language</h2>
          <p class="text-sm text-oc-mid">Choose the language the AI will use to respond.</p>
          <div class="flex items-center gap-3">
            <select v-model="selectedLanguage" class="input max-w-xs">
              <option v-for="lang in SUPPORTED_LANGUAGES" :key="lang.value" :value="lang.value">
                {{ lang.label }}
              </option>
            </select>
            <button
              class="btn-primary"
              :disabled="auth.loading || selectedLanguage === auth.userLanguage"
              @click="saveLanguage"
            >
              Save
            </button>
          </div>
        </div>
        <div class="card p-5 space-y-4">
          <h2 class="text-sm font-bold text-oc-light">Appearance</h2>
          <div class="flex gap-2">
            <button
              v-for="opt in themeOptions"
              :key="opt.value"
              @click="theme.setMode(opt.value)"
              class="flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-medium transition-colors duration-fast border"
              :class="theme.mode === opt.value
                ? 'bg-oc-surface text-oc-light border-oc-border'
                : 'bg-transparent text-oc-mid border-transparent hover:text-oc-light hover:bg-oc-surface'"
            >
              <component :is="opt.icon" class="w-4 h-4" />
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="card p-5 space-y-4">
          <h2 class="text-sm font-bold text-oc-light">Model Preferences</h2>
          <p class="text-sm text-oc-mid">
            Model selection is available per-notebook in the chat panel.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>