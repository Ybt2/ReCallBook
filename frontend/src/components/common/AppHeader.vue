<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";

const router = useRouter();
const auth = useAuthStore();

function logout() {
  auth.logout();
  router.push({ name: "login" });
}

defineProps({
  breadcrumbs: { type: Array, default: () => [] }, // [{label, to?}]
});
</script>

<template>
  <header class="h-14 bg-white border-b border-neutral-200 px-5 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-3">
      <router-link to="/dashboard" class="flex items-center gap-2 font-semibold text-neutral-900">
        <span class="w-7 h-7 rounded-md bg-brand-600 text-white grid place-items-center text-sm">R</span>
        RecallBook
      </router-link>
      <template v-for="(b, i) in breadcrumbs" :key="i">
        <span class="text-neutral-300">/</span>
        <router-link
          v-if="b.to"
          :to="b.to"
          class="text-sm text-neutral-500 hover:text-neutral-900"
        >{{ b.label }}</router-link>
        <span v-else class="text-sm text-neutral-800 font-medium">{{ b.label }}</span>
      </template>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm text-neutral-600 hidden sm:block">
        {{ auth.user?.username }}
      </span>
      <div class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold text-sm">
        {{ (auth.user?.username || "?")[0].toUpperCase() }}
      </div>
      <button class="btn-ghost" @click="logout">Logout</button>
    </div>
  </header>
</template>
