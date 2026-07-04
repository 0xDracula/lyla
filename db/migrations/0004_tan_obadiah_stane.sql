CREATE TABLE "infraction_categories" (
	"code" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group_name" text,
	"ladder_no_priors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ladder_with_priors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "category_code" integer;--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "category_extra" text;--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "updated_at" bigint;--> statement-breakpoint
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_category_code_infraction_categories_code_fk" FOREIGN KEY ("category_code") REFERENCES "public"."infraction_categories"("code") ON DELETE set null ON UPDATE no action;