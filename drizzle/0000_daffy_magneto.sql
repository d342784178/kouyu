CREATE TABLE "phrase_examples" (
	"id" serial PRIMARY KEY NOT NULL,
	"phrase_id" text NOT NULL,
	"title" text NOT NULL,
	"desc" text NOT NULL,
	"english" text NOT NULL,
	"chinese" text NOT NULL,
	"usage" text NOT NULL,
	"audio_url" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "phrases" (
	"id" text PRIMARY KEY NOT NULL,
	"english" text NOT NULL,
	"chinese" text NOT NULL,
	"part_of_speech" text NOT NULL,
	"scene" text NOT NULL,
	"difficulty" text NOT NULL,
	"pronunciation_tips" text NOT NULL,
	"audio_url" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "qa_pairs" (
	"id" text PRIMARY KEY NOT NULL,
	"sub_scene_id" text NOT NULL,
	"speaker_text" text NOT NULL,
	"speaker_text_cn" text NOT NULL,
	"responses" jsonb NOT NULL,
	"usage_note" text,
	"audio_url" text,
	"qa_type" text NOT NULL,
	"order" integer NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "scene_tests" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text NOT NULL,
	"type" text NOT NULL,
	"order" integer NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"difficulty" text NOT NULL,
	"duration" integer DEFAULT 10,
	"tags" jsonb,
	"dialogue" jsonb,
	"vocabulary" jsonb,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "sub_scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"order" integer NOT NULL,
	"estimated_minutes" integer DEFAULT 5,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "phrase_examples" ADD CONSTRAINT "phrase_examples_phrase_id_phrases_id_fk" FOREIGN KEY ("phrase_id") REFERENCES "public"."phrases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_pairs" ADD CONSTRAINT "qa_pairs_sub_scene_id_sub_scenes_id_fk" FOREIGN KEY ("sub_scene_id") REFERENCES "public"."sub_scenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_tests" ADD CONSTRAINT "scene_tests_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_scenes" ADD CONSTRAINT "sub_scenes_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE no action ON UPDATE no action;