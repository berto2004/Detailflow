CREATE TABLE `inspections` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `work_order_id` text NOT NULL,
  `body_checked` integer DEFAULT false NOT NULL,
  `wheels_checked` integer DEFAULT false NOT NULL,
  `glass_checked` integer DEFAULT false NOT NULL,
  `interior_checked` integer DEFAULT false NOT NULL,
  `notes` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `inspections_org_wo_uq` ON `inspections` (`organization_id`,`work_order_id`);
