-- Μετρητές για το όριο ερωτήσεων του chat (functions/api/chat.js, checkRateLimit).
-- key: '<sha256 της IP>:m:<λεπτό από epoch>' ή '<sha256 της IP>:d:<YYYY-MM-DD ώρας Ελλάδας>'
-- expires: epoch ms· μετά από αυτό η γραμμή σβήνεται.
CREATE TABLE IF NOT EXISTS rate_limits (
  key     TEXT PRIMARY KEY,
  count   INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expires ON rate_limits (expires);
