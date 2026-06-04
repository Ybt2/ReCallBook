<script setup>
import { onMounted, watch } from "vue";
import { RouterView } from "vue-router";
import { useI18n } from "vue-i18n";
import AppToast from "./components/common/AppToast.vue";
import { useThemeStore } from "./stores/theme";
import { useAuthStore } from "./stores/auth";
import { useModelStore } from "./stores/models";
import { mapUserLanguageToLocale } from "./i18n";

const { locale } = useI18n();
const theme = useThemeStore();
const auth = useAuthStore();
const modelStore = useModelStore();

watch(() => auth.user?.language, (lang) => {
  locale.value = mapUserLanguageToLocale(lang);
}, { immediate: true });

onMounted(() => {
  theme.init();
  if (auth.isAuthenticated) modelStore.load();
});
</script>

<template>
  <RouterView />
  <AppToast />
</template>
