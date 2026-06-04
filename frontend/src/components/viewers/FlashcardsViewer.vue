<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
const { t } = useI18n();
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
    <div v-if="!cards.length" class="text-center text-oc-mid">
      {{ $t("flashcardsViewer.noFlashcards") }}
    </div>

    <div v-else>
      <div class="flex items-center justify-between mb-3 text-sm text-oc-mid">
        <span>{{ $t("flashcardsViewer.cardOf", { current: current + 1, total: cards.length }) }}</span>
        <button v-if="card.hint" class="text-[#007aff] hover:underline" @click="showHint = !showHint">
          {{ showHint ? $t("flashcardsViewer.hideHint") : $t("flashcardsViewer.showHint") }}
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
            class="absolute inset-0 card p-6 flex items-center justify-center text-center text-lg font-medium text-oc-light"
            style="backface-visibility: hidden"
          >
            {{ card.front }}
          </div>
          <div
            class="absolute inset-0 card p-6 flex items-center justify-center text-center bg-oc-surface border-warm text-oc-light"
            style="backface-visibility: hidden; transform: rotateY(180deg)"
          >
            {{ card.back }}
          </div>
        </div>
      </div>

      <div v-if="showHint && card.hint" class="mt-3 text-sm text-oc-mid bg-oc-surface border border-warm rounded-btn p-3">
        <span class="font-medium text-oc-light">{{ $t("flashcardsViewer.hint") }}</span>{{ card.hint }}
      </div>

      <div class="flex items-center justify-between mt-4">
        <button class="btn-secondary" :disabled="current === 0" @click="prev">{{ $t("flashcardsViewer.previous") }}</button>
        <button class="btn-ghost" @click="flipped = !flipped">{{ $t("flashcardsViewer.flipCard") }}</button>
        <button class="btn-primary" :disabled="current === cards.length - 1" @click="next">{{ $t("flashcardsViewer.next") }}</button>
      </div>

      <div class="text-center text-xs text-oc-muted mt-3">{{ $t("flashcardsViewer.clickToFlip") }}</div>
    </div>
  </div>
</template>
