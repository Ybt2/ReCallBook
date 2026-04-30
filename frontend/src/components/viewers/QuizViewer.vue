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
    <div v-if="!questions.length" class="text-center text-oc-mid">
      No questions available.
    </div>

    <div v-else>
      <div v-if="submitted" class="mb-6 card p-4 bg-[#007aff]/10 border-[#007aff]/30">
        <div class="text-sm text-[#007aff]">Score</div>
        <div class="text-2xl font-semibold text-oc-light">
          {{ score }} / {{ questions.length }}
        </div>
        <button class="btn-secondary mt-3" @click="restart">Try again</button>
      </div>

      <div class="flex items-center justify-between mb-3 text-sm text-oc-mid">
        <span>Question {{ current + 1 }} of {{ questions.length }}</span>
        <div class="flex gap-1">
          <button
            v-for="(_, i) in questions"
            :key="i"
            class="w-6 h-6 rounded-full text-[11px] grid place-items-center"
            :class="[
              current === i ? 'bg-[#007aff] text-white' : 'bg-oc-surface text-oc-mid',
              submitted && answers[i] === questions[i].correct ? '!bg-success !text-white' : '',
              submitted && answers[i] !== undefined && answers[i] !== questions[i].correct ? '!bg-danger !text-white' : ''
            ]"
            @click="current = i"
          >
            {{ i + 1 }}
          </button>
        </div>
      </div>

      <div class="card p-5">
        <div class="font-medium text-oc-light mb-4">{{ q.question }}</div>
        <div class="space-y-2">
          <button
            v-for="(opt, i) in q.options"
            :key="i"
            class="w-full text-left rounded-btn border p-3 text-sm transition-colors duration-fast"
            :class="[
              !submitted && answers[current] === i ? 'border-[#007aff] bg-[#007aff]/10 text-oc-light' :
              !submitted ? 'border-warm hover:bg-oc-surface text-oc-light' :
              i === q.correct ? 'border-success bg-success/10 text-oc-light' :
              answers[current] === i ? 'border-danger bg-danger/10 text-oc-light' :
              'border-warm text-oc-mid'
            ]"
            @click="select(i)"
          >
            <span class="font-medium mr-2">{{ String.fromCharCode(65 + i) }}.</span>
            {{ opt }}
          </button>
        </div>

        <div
          v-if="submitted && q.explanation"
          class="mt-4 text-sm text-oc-mid bg-oc-surface border border-warm rounded-btn p-3"
        >
          <span class="font-medium text-oc-light">Explanation: </span>{{ q.explanation }}
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
