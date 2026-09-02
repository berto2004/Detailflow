CREATE TABLE `invoices` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `work_order_id` text NOT NULL,
  `invoice_number` text NOT NULL,
  `status` text DEFAULT 'unpaid' NOT NULL,
  `subtotal` integer DEFAULT 0 NOT NULL,
  `discount` integer DEFAULT 0 NOT NULL,
  `total` integer DEFAULT 0 NOT NULL,
  `paid_amount` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `invoices_org_wo_uq` ON `invoices` (`organization_id`,`work_order_id`);
CREATE UNIQUE INDEX `invoices_org_number_uq` ON `invoices` (`organization_id`,`invoice_number`);

CREATE TABLE `payments` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `invoice_id` text NOT NULL,
  `amount` integer NOT NULL,
  `method` text NOT NULL,
  `notes` text,
  `paid_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `payments_org_invoice_idx` ON `payments` (`organization_id`,`invoice_id`);
