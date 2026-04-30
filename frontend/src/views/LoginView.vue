<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import Spinner from "../components/common/Spinner.vue";

const email = ref("");
const password = ref("");
const auth = useAuthStore();
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
        <span class="w-8 h-8 rounded-btn bg-oc-surface border border-warm grid place-items-center font-bold text-oc-light text-sm">R</span>
        <span class="text-xl font-bold text-oc-light">RecallBook</span>
      </div>
      <form @submit.prevent="onSubmit" class="space-y-4">
        <div class="text-center mb-6">
          <h2 class="text-[38px] font-bold leading-[1.50] text-oc-light">Welcome back</h2>
          <p class="text-base text-oc-mid mt-2">Sign in to your RecallBook account.</p>
        </div>

        <div>
          <label class="label">Email</label>
          <input v-model="email" type="email" required class="input" placeholder="you@example.com" />
        </div>

        <div>
          <label class="label">Password</label>
          <input v-model="password" type="password" required class="input" placeholder="••••••••" />
        </div>

        <p v-if="auth.error" class="text-sm text-danger">{{ auth.error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="auth.loading">
          <Spinner v-if="auth.loading" />
          <span>Sign in</span>
        </button>

        <p class="text-sm text-oc-mid mt-4 text-center">
          New to RecallBook?
          <router-link to="/signup" class="text-oc-light underline font-medium">Create an account</router-link>
        </p>
      </form>
    </div>
  </div>
</template>
