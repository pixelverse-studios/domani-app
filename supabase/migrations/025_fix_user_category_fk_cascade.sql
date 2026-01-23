-- Fix user_category_id foreign key to cascade SET NULL on delete
-- This allows categories to be deleted even when tasks reference them
-- Tasks will have their category cleared to null instead of blocking deletion

ALTER TABLE tasks
DROP CONSTRAINT tasks_user_category_id_fkey;

ALTER TABLE tasks
ADD CONSTRAINT tasks_user_category_id_fkey
FOREIGN KEY (user_category_id)
REFERENCES user_categories(id)
ON DELETE SET NULL;
