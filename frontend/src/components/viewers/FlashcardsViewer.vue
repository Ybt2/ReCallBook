<script setup>
import { ref, computed } from "vue";
const props = defineProps({ data: Object });

const cards = computed(() => props.data?.flashcards || []);
const current = ref(0);
const flipped = ref(false);
const showHint = ref(false);

const card = computed(() => cards.value[current.value]);

function next() {
  if (current.value < cards.value.length - 1) {
    current.value++;
    flipped.value = false;
    showHint.value = false;
  }
}
function prev() {
  if (current.value > 0) {
    current.value--;
    flipped.value = false;
    showHint.value = false;
  }
}
</script>

<template>
  <div class="p-6">
    <div v-if="!cards.length" class="text-center text-neutral-500">
      No flashcards available.
    </div>

    <div v-else>
      <div class="flex items-center justify-between mb-3 text-sm text-neutral-500">
        <span>Card {{ current + 1 }} of {{ cards.length }}</span>
        <button v-if="card.hint" class="text-brand-600 hover:underline" @click="showHint = !showHint">
          {{ showHint ? "Hide hint" : "Show hint" }}
        </button>
      </div>

      <div
        class="relative select-none cursor-pointer mx-auto"
        style="perspective: 1000px"
        @click="flipped = !flipped"
      >
        <div
          class="relative w-full h-72 transition-transform duration-500"
          :style="{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }"
        >
          <div
            class="absolute inset-0 card p-6 flex items-center justify-center text-center text-lg font-medium"
            style="backface-visibility: hidden"
          >
            {{ card.front }}
          </div>
          <div
            class="absolute inset-0 card p-6 flex items-center justify-center text-center bg-brand-50 border-brand-200 text-brand-900"
            style="backface-visibility: hidden; transform: rotateY(180deg)"
          >
            {{ card.back }}
          </div>
        </div>
      </div>

      <div v-if="showHint && card.hint" class="mt-3 text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
        <span class="font-medium">Hint: </span>{{ card.hint }}
      </div>

      <div class="flex items-center justify-between mt-4">
        <button class="btn-secondary" :disabled="current === 0" @click="prev">Previous</button>
        <button class="btn-ghost" @click="flipped = !flipped">Flip card</button>
        <button class="btn-primary" :disabled="current === cards.length - 1" @click="next">Next</button>
      </div>

      <div class="text-center text-xs text-neutral-400 mt-3">Click the card to flip.</div>
    </div>
  </div>
</template>
