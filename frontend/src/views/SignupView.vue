<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore, SUPPORTED_LANGUAGES } from "../stores/auth";
import { useThemeStore } from "../stores/theme";
import Spinner from "../components/common/Spinner.vue";

const username = ref("");
const email = ref("");
const password = ref("");
const language = ref("English");
const auth = useAuthStore();
const theme = useThemeStore();
const logoSrc = computed(() =>
  theme.resolvedTheme === "light" ? "/logo_black.png" : "/logo_white.png"
);
const router = useRouter();

async function onSubmit() {
  const ok = await auth.register(username.value, email.value, password.value, language.value);
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
          <h2 class="text-[38px] font-bold leading-[1.50] text-oc-light">Create account</h2>
          <p class="text-base text-oc-mid mt-2">Start organizing your knowledge.</p>
        </div>

        <div>
          <label class="label">Username</label>
          <input v-model="username" required class="input" placeholder="jane" />
        </div>

        <div>
          <label class="label">Email</label>
          <input v-model="email" type="email" required class="input" placeholder="you@example.com" />
        </div>

        <div>
          <label class="label">Password</label>
          <input v-model="password" type="password" required minlength="4" class="input" placeholder="••••••••" />
        </div>

        <div>
          <label class="label">Language</label>
          <select v-model="language" class="input">
            <option v-for="lang in SUPPORTED_LANGUAGES" :key="lang.value" :value="lang.value">
              {{ lang.label }}
            </option>
          </select>
        </div>

        <p v-if="auth.error" class="text-sm text-danger">{{ auth.error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="auth.loading">
          <Spinner v-if="auth.loading" />
          <span>Create account</span>
        </button>

        <p class="text-sm text-oc-mid mt-4 text-center">
          Already have an account?
          <router-link to="/login" class="text-oc-light underline font-medium">Sign in</router-link>
        </p>
      </form>
    </div>
  </div>
</template>