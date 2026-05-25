const { requireNotebookOwner, requireDocumentOwner, requireAssetOwner } = require("../src/middleware/ownership");
const { pool } = require("../src/db/init");

function mockReqResNext(user = { id: 1 }, params = {}, body = {}, query = {}) {
  const req = { user, params, body, query };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe("requireNotebookOwner", () => {
  beforeEach(() => pool.query.mockReset());

  it("calls next() when no notebookId found", async () => {
    const { req, res, next } = mockReqResNext({ id: 1 }, {}, {}, {});
    await requireNotebookOwner(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("returns 404 when notebook does not exist", async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const { req, res, next } = mockReqResNext({ id: 1 }, { id: 999 });
    await requireNotebookOwner(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it("returns 403 when user is not the owner", async () => {
    pool.query.mockResolvedValueOnce([[{ utilizadores_ID: 999 }]]);
    const { req, res, next } = mockReqResNext({ id: 1 }, { id: 1 });
    await requireNotebookOwner(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("calls next() when user is the owner", async () => {
    pool.query.mockResolvedValueOnce([[{ utilizadores_ID: 1 }]]);
    const { req, res, next } = mockReqResNext({ id: 1 }, { id: 1 });
    await requireNotebookOwner(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe("requireDocumentOwner", () => {
  beforeEach(() => pool.query.mockReset());

  it("returns 404 when document does not exist", async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const { req, res, next } = mockReqResNext({ id: 1 }, { id: "abc-123" });
    await requireDocumentOwner(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it("returns 403 when user is not the owner", async () => {
    pool.query.mockResolvedValueOnce([[{ notebooks_ID: 1, utilizadores_ID: 999 }]]);
    const { req, res, next } = mockReqResNext({ id: 1 }, { id: "abc-123" });
    await requireDocumentOwner(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("calls next() for the owner", async () => {
    pool.query.mockResolvedValueOnce([[{ notebooks_ID: 1, utilizadores_ID: 1 }]]);
    const { req, res, next } = mockReqResNext({ id: 1 }, { id: "abc-123" });
    await requireDocumentOwner(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe("requireAssetOwner", () => {
  beforeEach(() => pool.query.mockReset());

  it("returns 404 when asset does not exist", async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const { req, res, next } = mockReqResNext({ id: 1 }, { id: 5 });
    await requireAssetOwner(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it("returns 403 for non-owner", async () => {
    pool.query.mockResolvedValueOnce([[{ notebook_ID: 1, utilizadores_ID: 999 }]]);
    const { req, res, next } = mockReqResNext({ id: 1 }, { id: 5 });
    await requireAssetOwner(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("calls next() for the owner", async () => {
    pool.query.mockResolvedValueOnce([[{ notebook_ID: 1, utilizadores_ID: 1 }]]);
    const { req, res, next } = mockReqResNext({ id: 1 }, { id: 5 });
    await requireAssetOwner(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
