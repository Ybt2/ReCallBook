<script setup>
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import AppToast from "./components/common/AppToast.vue";
import { useThemeStore } from "./stores/theme";
import { useAuthStore } from "./stores/auth";
import { useModelStore } from "./stores/models";

const theme = useThemeStore();
const auth = useAuthStore();
const modelStore = useModelStore();

onMounted(() => {
  theme.init();
  if (auth.isAuthenticated) modelStore.load();
});
</script>

<template>
  <RouterView />
  <AppToast />
</template>
