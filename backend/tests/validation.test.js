const { sanitizeDocIds, buildNotebookFilter } = require("../src/utils/validation");

describe("sanitizeDocIds", () => {
  it("returns null for non-array input", () => {
    expect(sanitizeDocIds(undefined)).toBeNull();
    expect(sanitizeDocIds(null)).toBeNull();
    expect(sanitizeDocIds("string")).toBeNull();
    expect(sanitizeDocIds(123)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(sanitizeDocIds([])).toBeNull();
  });

  it("accepts valid UUIDs", () => {
    const ids = ["550e8400-e29b-41d4-a716-446655440000"];
    expect(sanitizeDocIds(ids)).toEqual(ids);
  });

  it("accepts numeric IDs", () => {
    expect(sanitizeDocIds(["123", "456"])).toEqual(["123", "456"]);
    expect(sanitizeDocIds([123, 456])).toEqual(["123", "456"]);
  });

  it("rejects injection attempts", () => {
    expect(sanitizeDocIds(["'; DROP TABLE--"])).toBeNull();
    expect(sanitizeDocIds(["../../../etc/passwd"])).toBeNull();
    expect(sanitizeDocIds(["<script>alert(1)</script>"])).toBeNull();
  });

  it("filters mixed valid/invalid keeping only valid", () => {
    const result = sanitizeDocIds(["123", "bad-val", "550e8400-e29b-41d4-a716-446655440000"]);
    expect(result).toEqual(["123", "550e8400-e29b-41d4-a716-446655440000"]);
  });
});

describe("buildNotebookFilter", () => {
  it("builds filter with only notebookId when no docIds", () => {
    const filter = buildNotebookFilter("nb-1", null);
    expect(filter).toEqual({
      must: [{ key: "metadata.notebookId", match: { value: "nb-1" } }],
    });
  });

  it("builds filter with notebookId and valid docIds", () => {
    const filter = buildNotebookFilter("nb-1", ["123", "456"]);
    expect(filter.must).toHaveLength(1);
    expect(filter.should).toHaveLength(2);
    expect(filter.should[0]).toEqual({ key: "metadata.docId", match: { value: "123" } });
  });

  it("ignores invalid docIds and omits should clause", () => {
    const filter = buildNotebookFilter("nb-1", ["<script>"]);
    expect(filter.should).toBeUndefined();
  });
});
