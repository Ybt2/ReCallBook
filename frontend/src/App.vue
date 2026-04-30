<script setup>
import { RouterView } from "vue-router";
import AppToast from "./components/common/AppToast.vue";
import { useThemeStore } from "./stores/theme";

const theme = useThemeStore();
theme.init();
</script>

<template>
  <RouterView />
  <AppToast />
</template>
