CREATE TABLE `features` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'boolean' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `features_code_uq` ON `features` (`code`);--> statement-breakpoint
CREATE INDEX `features_active_idx` ON `features` (`active`);--> statement-breakpoint
CREATE TABLE `plan_features` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`feature_id` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`limit_value` integer,
	`unlimited` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_features_plan_feature_uq` ON `plan_features` (`plan_id`,`feature_id`);--> statement-breakpoint
CREATE INDEX `plan_features_plan_idx` ON `plan_features` (`plan_id`);--> statement-breakpoint
CREATE INDEX `plan_features_feature_idx` ON `plan_features` (`feature_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price_monthly` integer DEFAULT 0 NOT NULL,
	`price_yearly` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'IDR' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_code_uq` ON `plans` (`code`);--> statement-breakpoint
CREATE INDEX `plans_active_sort_idx` ON `plans` (`active`,`sort_order`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`status` text DEFAULT 'trialing' NOT NULL,
	`started_at` integer NOT NULL,
	`current_period_start` integer,
	`current_period_end` integer,
	`trial_ends_at` integer,
	`cancelled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `subscriptions_org_idx` ON `subscriptions` (`organization_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_plan_idx` ON `subscriptions` (`plan_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);