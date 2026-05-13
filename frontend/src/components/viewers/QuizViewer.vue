<script setup>
import { ref, computed, onMounted } from "vue";
import { ToolsAPI } from "../../api/tools";

const props = defineProps({
  data: Object,
  assetId: [String, Number],
  savedResult: Object, // data._result — may be null/undefined
});

const emit = defineEmits(["result-saved"]);

const questions = computed(() => props.data?.questions || []);
const current = ref(0);
const answers = ref({});
const submitted = ref(false);
const saving = ref(false);

// view: "result" | "quiz" | "revisit"
const view = ref("quiz");

const score = computed(() => {
  let s = 0;
  questions.value.forEach((qq, i) => {
    if (answers.value[i] === qq.correct) s++;
  });
  return s;
});

const wrong = computed(() => questions.value.length - score.value);

const q = computed(() => questions.value[current.value]);

onMounted(() => {
  if (props.savedResult) {
    // Open straight to the result screen
    answers.value = { ...(props.savedResult.answers || {}) };
    submitted.value = true;
    view.value = "result";
  }
});

function select(i) {
  if (view.value !== "quiz" || submitted.value) return;
  answers.value[current.value] = i;
}

function next() {
  if (current.value < questions.value.length - 1) current.value++;
}
function prev() {
  if (current.value > 0) current.value--;
}

async function submit() {
  submitted.value = true;
  current.value = 0;
  saving.value = true;
  try {
    const result = {
      score: score.value,
      total: questions.value.length,
      answers: { ...answers.value },
    };
    await ToolsAPI.saveResult(props.assetId, result);
    emit("result-saved", result);
  } finally {
    saving.value = false;
  }
  view.value = "result";
}

function retry() {
  answers.value = {};
  submitted.value = false;
  current.value = 0;
  view.value = "quiz";
}

function revisit() {
  // Load the saved attempt answers (already in answers from onMounted or last submit)
  answers.value = { ...(props.savedResult?.answers || answers.value) };
  submitted.value = true;
  current.value = 0;
  view.value = "revisit";
}

function backToResult() {
  current.value = 0;
  view.value = "result";
}
</script>

<template>
  <div class="p-6">
    <div v-if="!questions.length" class="text-center text-oc-mid">
      No questions available.
    </div>

    <div v-else>

      <!-- ── RESULT SCREEN ── -->
      <div v-if="view === 'result'" class="space-y-4">
        <div class="card p-5 border-[#007aff]/30 bg-[#007aff]/10">
          <div class="text-xs font-semibold uppercase tracking-wider text-[#007aff] mb-3">Last attempt</div>
          <div class="text-3xl font-semibold text-oc-light mb-1">
            {{ savedResult?.score ?? score }} / {{ savedResult?.total ?? questions.length }}
          </div>
          <div class="flex items-center gap-4 mt-2 text-sm">
            <span class="flex items-center gap-1.5 text-success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {{ savedResult?.score ?? score }} correct
            </span>
            <span class="flex items-center gap-1.5 text-danger">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              {{ savedResult ? (savedResult.total - savedResult.score) : wrong }} wrong
            </span>
            <span v-if="savedResult?._at" class="text-oc-muted ml-auto text-[11px]">
              {{ new Date(savedResult._at).toLocaleDateString() }}
            </span>
          </div>
        </div>

        <div class="flex gap-3">
          <button class="btn-secondary flex-1" @click="retry">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1.5 -mt-0.5">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
            </svg>
            Retry
          </button>
          <button class="btn-primary flex-1" @click="revisit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1.5 -mt-0.5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Revisit attempt
          </button>
        </div>
      </div>

      <!-- ── QUIZ / REVISIT SCREEN ── -->
      <div v-else>

        <!-- Revisit banner -->
        <div v-if="view === 'revisit'" class="mb-4 flex items-center justify-between rounded-btn border border-warm bg-oc-surface px-4 py-2.5 text-sm text-oc-mid">
          <span>Reviewing your last attempt</span>
          <button class="text-oc-light hover:text-[#007aff] transition-colors duration-fast font-medium" @click="backToResult">
            ← Back to result
          </button>
        </div>

        <!-- Progress -->
        <div class="flex items-center justify-between mb-3 text-sm text-oc-mid">
          <span>Question {{ current + 1 }} of {{ questions.length }}</span>
          <span v-if="view === 'quiz' && Object.keys(answers).length > 0" class="text-[11px] text-oc-muted">
            {{ Object.keys(answers).length }} / {{ questions.length }} answered
          </span>
        </div>

        <!-- Question card -->
        <div class="card p-5">
          <div class="font-medium text-oc-light mb-4">{{ q.question }}</div>
          <div class="space-y-2">
            <button
              v-for="(opt, i) in q.options"
              :key="i"
              class="w-full text-left rounded-btn border p-3 text-sm transition-colors duration-fast"
              :class="[
                // Active quiz — not yet submitted
                view === 'quiz' && !submitted && answers[current] === i
                  ? 'border-[#007aff] bg-[#007aff]/10 text-oc-light'
                  : view === 'quiz' && !submitted
                  ? 'border-warm hover:bg-oc-surface text-oc-light'
                  // Post-submit (quiz submitted or revisit)
                  : i === q.correct
                  ? 'border-success bg-success/10 text-oc-light'
                  : answers[current] === i
                  ? 'border-danger bg-danger/10 text-oc-light'
                  : 'border-warm text-oc-mid'
              ]"
              :disabled="view === 'revisit' || submitted"
              @click="select(i)"
            >
              <span class="font-medium mr-2">{{ String.fromCharCode(65 + i) }}.</span>
              {{ opt }}
            </button>
          </div>

          <div
            v-if="(submitted || view === 'revisit') && q.explanation"
            class="mt-4 text-sm text-oc-mid bg-oc-surface border border-warm rounded-btn p-3"
          >
            <span class="font-medium text-oc-light">Explanation: </span>{{ q.explanation }}
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex items-center justify-between mt-4">
          <button class="btn-secondary" :disabled="current === 0" @click="prev">Previous</button>
          <button
            v-if="current < questions.length - 1"
            class="btn-primary"
            @click="next"
          >Next</button>
          <button
            v-else-if="view === 'quiz' && !submitted"
            class="btn-primary"
            :disabled="saving"
            @click="submit"
          >{{ saving ? 'Saving…' : 'Submit' }}</button>
        </div>

      </div>
    </div>
  </div>
</template>
