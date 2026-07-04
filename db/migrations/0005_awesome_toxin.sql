CREATE TABLE "user_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"edited_by" text,
	"edited_at" bigint
);
