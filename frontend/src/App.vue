<script setup>
import { RouterView } from "vue-router";
import AppToast from "./components/common/AppToast.vue";
import { useThemeStore } from "./stores/theme";
import { useAuthStore } from "./stores/auth";
import { useModelStore } from "./stores/models";

const theme = useThemeStore();
theme.init();

const auth = useAuthStore();
const modelStore = useModelStore();
if (auth.isAuthenticated) modelStore.load();
</script>

<template>
  <RouterView />
  <AppToast />
</template>
