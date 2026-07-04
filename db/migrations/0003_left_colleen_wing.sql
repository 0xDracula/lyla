CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" integer NOT NULL,
	"change_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"case_number" integer,
	"target_user_id" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_subject_idx" ON "audit_log" USING btree ("subject_type","subject_id");