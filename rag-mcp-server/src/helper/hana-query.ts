export const CREATE_TABLE_SQL = `
  DO BEGIN
  DECLARE table_exists INT;
  SELECT COUNT(*) INTO table_exists 
  FROM TABLES 
  WHERE TABLE_NAME = ?;
  IF :table_exists = 0 THEN
  EXEC 'CREATE TABLE ? (
  "file_id" NVARCHAR(255),
  "page_content" NCLOB,
  "metadata" NCLOB,
  "vector" REAL_VECTOR(3072)
  )';
  END IF;
  END;
`;

export const CREATE_META_TABLE_SQL = `
  DO BEGIN
  DECLARE table_exists INT;
  SELECT COUNT(*) INTO table_exists 
  FROM TABLES 
  WHERE TABLE_NAME = ?;
  IF :table_exists = 0 THEN
  EXEC 'CREATE TABLE ? (
  "file_id" NVARCHAR(255) PRIMARY KEY,
  "entries" INTEGER
  )';
  END IF;
  END;
`;

export const GET_INGESTED_FILES_SQL = `SELECT "file_id" FROM ?`;

export const GET_SIMILAR_DOCUMENTS_SQL = `WITH input_vector AS (
  SELECT TO_REAL_VECTOR(?) AS vec
)
SELECT similarity_score, page_content, metadata
FROM (
  SELECT TOP ? 
    t.*, 
    COSINE_SIMILARITY(t."vector", iv.vec) AS "similarity_score"
  FROM ? t, input_vector iv
) scored
WHERE "similarity_score" > ?
ORDER BY "similarity_score" DESC;
`;

export const INSERT_CHUNKS_SQL = `
  INSERT INTO ? ("file_id", "page_content", "metadata", "vector")
  VALUES (?, ?, ?, ?)
`;

export const INSERT_META_SQL = `
  INSERT INTO ? ("file_id", "entries")
  VALUES (?, ?)
`;

export const DELETE_DOCUMENT_SQL = `
  DELETE FROM ? WHERE "file_id" = ?
`;

export const DELETE_META_SQL = `
  DELETE FROM ? WHERE "file_id" = ?
`;