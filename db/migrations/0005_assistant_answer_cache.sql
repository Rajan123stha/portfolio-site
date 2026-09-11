CREATE TABLE IF NOT EXISTS "assistant_answer_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistant_answer_cache_created_idx" ON "assistant_answer_cache" USING btree ("created_at");