<script setup>
import { ref, computed } from "vue";
const props = defineProps({ data: Object });

const questions = computed(() => props.data?.questions || []);
const current = ref(0);
const answers = ref({}); // idx -> chosen option index
const submitted = ref(false);

const q = computed(() => questions.value[current.value]);

const score = computed(() => {
  let s = 0;
  questions.value.forEach((qq, i) => {
    if (answers.value[i] === qq.correct) s++;
  });
  return s;
});

function select(i) {
  if (submitted.value) return;
  answers.value[current.value] = i;
}

function next() {
  if (current.value < questions.value.length - 1) current.value++;
}
function prev() {
  if (current.value > 0) current.value--;
}
function submit() {
  submitted.value = true;
  current.value = 0;
}
function restart() {
  answers.value = {};
  submitted.value = false;
  current.value = 0;
}
</script>

<template>
  <div class="p-6">
    <div v-if="!questions.length" class="text-center text-neutral-500">
      No questions available.
    </div>

    <div v-else>
      <!-- Results -->
      <div v-if="submitted" class="mb-6 card p-4 bg-brand-50 border-brand-200">
        <div class="text-sm text-brand-700">Score</div>
        <div class="text-2xl font-semibold text-brand-900">
          {{ score }} / {{ questions.length }}
        </div>
        <button class="btn-secondary mt-3" @click="restart">Try again</button>
      </div>

      <div class="flex items-center justify-between mb-3 text-sm text-neutral-500">
        <span>Question {{ current + 1 }} of {{ questions.length }}</span>
        <div class="flex gap-1">
          <button
            v-for="(_, i) in questions"
            :key="i"
            class="w-6 h-6 rounded-full text-[11px] grid place-items-center"
            :class="[
              current === i ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-600',
              submitted && answers[i] === questions[i].correct ? '!bg-emerald-500 !text-white' : '',
              submitted && answers[i] !== undefined && answers[i] !== questions[i].correct ? '!bg-red-500 !text-white' : ''
            ]"
            @click="current = i"
          >
            {{ i + 1 }}
          </button>
        </div>
      </div>

      <div class="card p-5">
        <div class="font-medium text-neutral-900 mb-4">{{ q.question }}</div>
        <div class="space-y-2">
          <button
            v-for="(opt, i) in q.options"
            :key="i"
            class="w-full text-left rounded-lg border p-3 text-sm transition-colors"
            :class="[
              !submitted && answers[current] === i ? 'border-brand-500 bg-brand-50' :
              !submitted ? 'border-neutral-200 hover:bg-neutral-50' :
              i === q.correct ? 'border-emerald-500 bg-emerald-50' :
              answers[current] === i ? 'border-red-500 bg-red-50' :
              'border-neutral-200'
            ]"
            @click="select(i)"
          >
            <span class="font-medium mr-2">{{ String.fromCharCode(65 + i) }}.</span>
            {{ opt }}
          </button>
        </div>

        <div
          v-if="submitted && q.explanation"
          class="mt-4 text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg p-3"
        >
          <span class="font-medium">Explanation: </span>{{ q.explanation }}
        </div>
      </div>

      <div class="flex items-center justify-between mt-4">
        <button class="btn-secondary" :disabled="current === 0" @click="prev">Previous</button>
        <button
          v-if="current < questions.length - 1"
          class="btn-primary"
          @click="next"
        >Next</button>
        <button
          v-else-if="!submitted"
          class="btn-primary"
          @click="submit"
        >Submit</button>
      </div>
    </div>
  </div>
</template>
