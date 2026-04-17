<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import Spinner from "../components/common/Spinner.vue";

const username = ref("");
const email = ref("");
const password = ref("");
const auth = useAuthStore();
const router = useRouter();

async function onSubmit() {
  const ok = await auth.register(username.value, email.value, password.value);
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
          Your private study assistant.
        </h1>
        <p class="mt-4 text-brand-100">
          Create notebooks, upload sources, chat with grounded answers and generate
          quizzes or flashcards — all in one place.
        </p>
      </div>
    </div>

    <div class="flex items-center justify-center p-6">
      <form @submit.prevent="onSubmit" class="card w-full max-w-sm p-6">
        <h2 class="text-xl font-semibold mb-1">Create account</h2>
        <p class="text-sm text-neutral-500 mb-6">Start organizing your knowledge.</p>

        <label class="label">Username</label>
        <input v-model="username" required class="input mb-4" placeholder="jane" />

        <label class="label">Email</label>
        <input v-model="email" type="email" required class="input mb-4" placeholder="you@example.com" />

        <label class="label">Password</label>
        <input v-model="password" type="password" required minlength="4" class="input mb-4" placeholder="••••••••" />

        <p v-if="auth.error" class="text-sm text-red-600 mb-3">{{ auth.error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="auth.loading">
          <Spinner v-if="auth.loading" />
          <span>Create account</span>
        </button>

        <p class="text-sm text-neutral-500 mt-4 text-center">
          Already have an account?
          <router-link to="/login" class="text-brand-600 font-medium hover:underline">Sign in</router-link>
        </p>
      </form>
    </div>
  </div>
</template>
