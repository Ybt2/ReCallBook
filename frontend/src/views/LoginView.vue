<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";
import { useThemeStore } from "../stores/theme";
import Spinner from "../components/common/Spinner.vue";

const email = ref("");
const password = ref("");
const auth = useAuthStore();
const theme = useThemeStore();
const logoSrc = computed(() =>
  theme.resolvedTheme === "light" ? "/logo_black.png" : "/logo_white.png"
);
const { t } = useI18n();
const router = useRouter();

async function onSubmit() {
  const ok = await auth.login(email.value, password.value);
  if (ok) router.push({ name: "dashboard" });
}
</script>

<template>
  <div class="min-h-full flex items-center justify-center bg-oc-dark p-6">
    <div class="w-full max-w-sm">
      <div class="flex items-center gap-3 mb-8 justify-center">
        <img :src="logoSrc" class="h-8 w-auto" alt="RecallBook" />
        <span class="text-xl font-bold text-oc-light">RecallBook</span>
      </div>
      <form @submit.prevent="onSubmit" class="space-y-4">
        <div class="text-center mb-6">
          <h2 class="text-[38px] font-bold leading-[1.50] text-oc-light">{{ $t("login.welcomeBack") }}</h2>
          <p class="text-base text-oc-mid mt-2">{{ $t("login.signInTo") }}</p>
        </div>

        <div>
          <label class="label">{{ $t("login.email") }}</label>
          <input v-model="email" type="email" required class="input" :placeholder="$t('login.emailPlaceholder')" />
        </div>

        <div>
          <label class="label">{{ $t("login.password") }}</label>
          <input v-model="password" type="password" required class="input" placeholder="••••••••" />
        </div>

        <p v-if="auth.error" class="text-sm text-danger">{{ auth.error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="auth.loading">
          <Spinner v-if="auth.loading" />
          <span>{{ $t("login.signIn") }}</span>
        </button>

        <p class="text-sm text-oc-mid mt-4 text-center">
          {{ $t("login.newToRecallBook") }}
          <router-link to="/signup" class="text-oc-light underline font-medium">{{ $t("login.createAccount") }}</router-link>
        </p>
      </form>
    </div>
  </div>
</template>
