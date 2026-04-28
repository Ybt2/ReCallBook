const { pool } = require("../db/init");
const { AppError } = require("./errorHandler");

async function requireNotebookOwner(req, res, next) {
  const notebookId = req.params.id || req.params.notebookId || req.body.notebookId || req.query.notebookId;
  if (!notebookId) return next();

  try {
    const [rows] = await pool.query(
      "SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1",
      [notebookId]
    );
    if (rows.length === 0) {
      return next(new AppError("Notebook não encontrado.", "NOT_FOUND", 404));
    }
    if (rows[0].utilizadores_ID !== req.user.id) {
      return next(new AppError("Access denied.", "FORBIDDEN", 403));
    }
    req.notebook = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

async function requireDocumentOwner(req, res, next) {
  const docId = req.params.id;
  if (!docId) return next();

  try {
    const [rows] = await pool.query(
      `SELECT f.notebooks_ID, n.utilizadores_ID
       FROM Fontes f JOIN NoteBooks n ON f.notebooks_ID = n.ID
       WHERE f.ID = ? LIMIT 1`,
      [docId]
    );
    if (rows.length === 0) {
      return next(new AppError("Documento não encontrado.", "NOT_FOUND", 404));
    }
    if (rows[0].utilizadores_ID !== req.user.id) {
      return next(new AppError("Access denied.", "FORBIDDEN", 403));
    }
    next();
  } catch (err) {
    next(err);
  }
}

async function requireAssetOwner(req, res, next) {
  const assetId = req.params.id;
  if (!assetId) return next();

  try {
    const [rows] = await pool.query(
      `SELECT a.notebook_ID, n.utilizadores_ID
       FROM Notebook_assets a JOIN NoteBooks n ON a.notebook_ID = n.ID
       WHERE a.ID = ? LIMIT 1`,
      [assetId]
    );
    if (rows.length === 0) {
      return next(new AppError("Recurso não encontrado.", "NOT_FOUND", 404));
    }
    if (rows[0].utilizadores_ID !== req.user.id) {
      return next(new AppError("Access denied.", "FORBIDDEN", 403));
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireNotebookOwner, requireDocumentOwner, requireAssetOwner };
