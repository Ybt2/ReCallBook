jest.mock("@huggingface/transformers", () => ({
  env: { cacheDir: "" },
  AutoTokenizer: {
    from_pretrained: jest.fn(() => jest.fn(() => ({ input_ids: [] }))),
  },
  XLMRobertaModel: {
    from_pretrained: jest.fn(() => ({
      __call__: jest.fn(),
    })),
  },
}));

// Bypass the global mock in setup.js to test the real module
jest.unmock("../src/services/cross_encoder");
const crossEncoder = require("../src/services/cross_encoder");

describe("Reranker (in-process)", () => {
  it("returns empty array for empty documents", async () => {
    const result = await crossEncoder.rerank("query", [], 5);
    expect(result).toEqual([]);
  });

  it("returns empty array for null documents", async () => {
    const result = await crossEncoder.rerank("query", null, 5);
    expect(result).toEqual([]);
  });

  it("exports rerank and initCross_encoder", () => {
    expect(typeof crossEncoder.rerank).toBe("function");
    expect(typeof crossEncoder.initCross_encoder).toBe("function");
  });
});