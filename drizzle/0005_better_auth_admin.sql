ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'user';

ALTER TABLE user ADD COLUMN banned INTEGER DEFAULT 0;

ALTER TABLE user ADD COLUMN banReason TEXT;

ALTER TABLE user ADD COLUMN banExpires INTEGER;

ALTER TABLE session ADD COLUMN impersonatedBy TEXT;

UPDATE user
SET role = 'admin'
WHERE id IN (
  SELECT auth_user_id
  FROM members
  WHERE role = 'owner'
);