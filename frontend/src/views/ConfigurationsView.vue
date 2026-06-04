<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { Sun, Moon, Monitor, Eye, Brain, Layers } from "lucide-vue-next";
import AppHeader from "../components/common/AppHeader.vue";
import { useAuthStore, SUPPORTED_LANGUAGES } from "../stores/auth";
import { useThemeStore } from "../stores/theme";
import { useModelStore } from "../stores/models";
import { useToastStore } from "../stores/toast";
import { OllamaAPI } from "../api/ollama";
import Spinner from "../components/common/Spinner.vue";

const { t } = useI18n();
const auth = useAuthStore();
const theme = useThemeStore();
const modelStore = useModelStore();
const toasts = useToastStore();

const selectedLanguage = ref(auth.userLanguage);

// --- Language ---
async function saveLanguage() {
  const ok = await auth.updateLanguage(selectedLanguage.value);
  if (ok) toasts.success(t("configurations.languageUpdated"));
  else toasts.error(auth.error || t("configurations.failedToUpdateLanguage"));
}

const themeOptions = [
  { value: "light", label: () => t("configurations.light"), icon: Sun },
  { value: "dark", label: () => t("configurations.dark"), icon: Moon },
  { value: "system", label: () => t("configurations.system"), icon: Monitor },
];

// --- Model pickers ---
const installedModels = ref([]);
const loadingModels = ref(false);
const savingModels = ref(false);

const newModelNames = ref({ general: "", query: "", vision: "" });
const installing = ref({ general: false, query: false, vision: false });
const installProgress = ref(null);

const MODEL_LABELS = {
  general: { title: () => t("configurations.generalModel"), desc: () => t("configurations.generalModelDesc"), icon: Brain },
  query: { title: () => t("configurations.queryModel"), desc: () => t("configurations.queryModelDesc"), icon: Layers },
  vision: { title: () => t("configurations.visionModel"), desc: () => t("configurations.visionModelDesc"), icon: Eye },
};

async function loadModels() {
  loadingModels.value = true;
  try {
    installedModels.value = await OllamaAPI.list();
  } catch {
    // silent
  } finally {
    loadingModels.value = false;
  }
}

async function loadSettings() {
  await modelStore.load();
}

onMounted(() => {
  loadModels();
  loadSettings();
});

async function selectModel(type, name) {
  if (type === "general") modelStore.setGeneralModel(name);
  else if (type === "query") modelStore.setQueryModel(name);
  else if (type === "vision") {
    const hasVision = await verifyVision(name);
    if (hasVision) {
      modelStore.setVisionModel(name);
    } else {
      toasts.error(t("configurations.visionNotSupported", { name }));
      modelStore.setVisionModel(null);
    }
  }
}

async function verifyVision(modelName) {
  if (!modelName) return false;
  try {
    const details = await OllamaAPI.show(modelName);
    const modelfile = details.modelfile || "";
    const capabilities = (details.details?.capabilities || []).map((c) => c.toLowerCase());
    const hasVision = capabilities.includes("vision") || /vision/i.test(modelfile);
    if (!hasVision) return false;
    return true;
  } catch {
    toasts.error(t("configurations.couldNotVerify", { name: modelName }));
    return false;
  }
}

async function saveModels() {
  savingModels.value = true;
  try {
    await modelStore.save();
    toasts.success(t("configurations.modelPrefsSaved"));
  } catch (e) {
    toasts.error(e.message || t("configurations.failedToSaveModelPrefs"));
  } finally {
    savingModels.value = false;
  }
}

async function installModel(type) {
  const name = newModelNames.value[type].trim();
  if (!name || installing.value[type]) return;
  installing.value[type] = true;
  installProgress.value = { percent: 0, status: "starting", total: 0, completed: 0 };
  await OllamaAPI.pull(name, {
    onProgress: (p) => (installProgress.value = p),
    onDone: async () => {
      toasts.success(t("configurations.modelInstalled", { name }));
      newModelNames.value[type] = "";
      installing.value[type] = false;
      installProgress.value = null;
      await loadModels();
      await selectModel(type, name);
    },
    onError: (m) => {
      toasts.error(t("configurations.installFailed", { message: m }));
      installing.value[type] = false;
      installProgress.value = null;
    },
  });
}
</script>

<template>
  <div class="h-full flex flex-col bg-oc-dark">
    <AppHeader :breadcrumbs="[{ label: t('configurations.title') }]" />
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-2xl mx-auto p-6 sm:p-10 space-y-6">
        <h1 class="text-xl font-bold text-oc-light">{{ $t("configurations.title") }}</h1>
        <div class="card p-5 space-y-4">
          <h2 class="text-sm font-bold text-oc-light">{{ $t("configurations.account") }}</h2>
          <div class="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <span class="text-oc-mid">{{ $t("configurations.username") }}</span>
            <span class="text-oc-light">{{ auth.user?.username || "—" }}</span>
            <span class="text-oc-mid">{{ $t("configurations.email") }}</span>
            <span class="text-oc-light">{{ auth.user?.email || "—" }}</span>
          </div>
        </div>
        <div class="card p-5 space-y-4">
          <h2 class="text-sm font-bold text-oc-light">{{ $t("configurations.language") }}</h2>
          <p class="text-sm text-oc-mid">{{ $t("configurations.languageDesc") }}</p>
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
              {{ $t("configurations.save") }}
            </button>
          </div>
        </div>
        <div class="card p-5 space-y-4">
          <h2 class="text-sm font-bold text-oc-light">{{ $t("configurations.appearance") }}</h2>
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
              {{ opt.label() }}
            </button>
          </div>
        </div>

        <!-- Model Preferences -->
        <div class="card p-5 space-y-4">
          <h2 class="text-sm font-bold text-oc-light">{{ $t("configurations.modelPreferences") }}</h2>
          <p class="text-sm text-oc-mid">
            {{ $t("configurations.modelPreferencesDesc") }}
          </p>

          <div v-if="loadingModels || modelStore.loading" class="flex items-center gap-2 text-sm text-oc-mid">
            <Spinner /> {{ $t("configurations.loadingModels") }}
          </div>

          <div v-for="(info, type) in MODEL_LABELS" :key="type" class="border border-warm rounded-btn p-4 space-y-3">
            <div class="flex items-center gap-2">
              <component :is="info.icon" class="w-4 h-4 text-brand-500 shrink-0" />
              <div>
                <h3 class="text-sm font-bold text-oc-light">{{ info.title() }}</h3>
                <p class="text-xs text-oc-mid">{{ info.desc() }}</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <select
                class="input flex-1"
                :value="modelStore[type + 'Model']"
                @change="selectModel(type, $event.target.value)"
              >
                <option value="">{{ $t("common.notConfigured") }}</option>
                <option v-for="m in installedModels" :key="m.name" :value="m.name">
                  {{ m.name }}
                </option>
              </select>
            </div>

            <div class="flex gap-1">
              <input
                v-model="newModelNames[type]"
                class="input !py-1.5 !text-xs flex-1"
                :placeholder="$t('common.modelPlaceholder')"
                :disabled="installing[type]"
                @keydown.enter.prevent="installModel(type)"
              />
              <button
                class="btn-primary !py-1.5 !px-2 !text-xs"
                :disabled="installing[type] || !newModelNames[type].trim()"
                @click="installModel(type)"
              >
                <Spinner v-if="installing[type]" :size="10" />
                <span v-else>{{ $t("common.pull") }}</span>
              </button>
            </div>

            <div v-if="installProgress && installing[type]" class="space-y-1">
              <div class="flex items-center justify-between text-[11px] text-oc-mid">
                <span>{{ $t("chatPanel.installing", { name: newModelNames[type], status: installProgress.status || "…" }) }}</span>
                <span v-if="installProgress.percent != null">{{ installProgress.percent }}%</span>
              </div>
              <div class="h-1.5 bg-oc-surface rounded-full overflow-hidden">
                <div
                  class="h-full bg-brand-500 transition-[width] duration-300"
                  :style="{ width: (installProgress?.percent ?? 10) + '%' }"
                />
              </div>
            </div>
          </div>

          <div class="pt-2">
            <button
              class="btn-primary"
              :disabled="savingModels"
              @click="saveModels"
            >
              <Spinner v-if="savingModels" :size="12" />
              <span v-else>{{ $t("configurations.saveModelPreferences") }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
