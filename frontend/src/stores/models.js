import { defineStore } from "pinia";
import { UserAPI } from "../api/user";

export const useModelStore = defineStore("models", {
  state: () => ({
    generalModel: null,
    queryModel: null,
    visionModel: null,
    loading: false,
  }),
  getters: {
    hasModels: (s) => !!s.generalModel,
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        const res = await UserAPI.getModels();
        this.generalModel = res.general_model || null;
        this.queryModel = res.query_model || null;
        this.visionModel = res.vision_model || null;
      } catch {
        // silently fail — models will be null
      } finally {
        this.loading = false;
      }
    },
    async save() {
      await UserAPI.setModels({
        general_model: this.generalModel,
        query_model: this.queryModel,
        vision_model: this.visionModel,
      });
    },
    setGeneralModel(name) {
      this.generalModel = name || null;
    },
    setQueryModel(name) {
      this.queryModel = name || null;
    },
    setVisionModel(name) {
      this.visionModel = name || null;
    },
  },
});
