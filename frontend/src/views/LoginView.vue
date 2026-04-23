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
  <div class="min-h-full grid md:grid-cols-2">
    <div class="hidden md:flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800 text-white p-10">
      <div class="max-w-md">
        <div class="flex items-center gap-3 mb-6">
          <span class="w-10 h-10 rounded-lg bg-white/15 grid place-items-center font-bold">R</span>
          <span class="text-2xl font-semibold">RecallBook</span>
        </div>
        <h1 class="text-3xl font-bold leading-tight">
          Turn your Files into conversations, and use Tools to study them.
        </h1>
        <p class="mt-4 text-brand-100">
          Upload your study material, chat with an AI grounded in your own sources,
          and generate study tools in one click.
        </p>
      </div>
    </div>

    <div class="flex items-center justify-center p-6">
      <form @submit.prevent="onSubmit" class="card w-full max-w-sm p-6">
        <h2 class="text-xl font-semibold mb-1">Welcome back</h2>
        <p class="text-sm text-neutral-500 mb-6">Sign in to your RecallBook account.</p>

        <label class="label">Email</label>
        <input v-model="email" type="email" required class="input mb-4" placeholder="you@example.com" />

        <label class="label">Password</label>
        <input v-model="password" type="password" required class="input mb-4" placeholder="••••••••" />

        <p v-if="auth.error" class="text-sm text-red-600 mb-3">{{ auth.error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="auth.loading">
          <Spinner v-if="auth.loading" />
          <span>Sign in</span>
        </button>

        <p class="text-sm text-neutral-500 mt-4 text-center">
          New to RecallBook?
          <router-link to="/signup" class="text-brand-600 font-medium hover:underline">Create an account</router-link>
        </p>
      </form>
    </div>
  </div>
</template>
