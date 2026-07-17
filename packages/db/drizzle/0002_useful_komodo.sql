ALTER TABLE "credits_ledger" DROP CONSTRAINT "credits_ledger_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payouts" DROP CONSTRAINT "payouts_merchant_id_merchants_id_fk";
--> statement-breakpoint
ALTER TABLE "credits_ledger" ADD CONSTRAINT "credits_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credits_ledger_order_redeemed_unique" ON "credits_ledger" USING btree ("order_id") WHERE reason = 'redeemed' AND order_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_picked_up_at_idx" ON "orders" USING btree ("picked_up_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_pickup_code_reserved_unique" ON "orders" USING btree ("store_id","pickup_code") WHERE status = 'reserved' AND pickup_code IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_payment_active_unique" ON "refunds" USING btree ("payment_id") WHERE status IN ('pending', 'succeeded');--> statement-breakpoint
CREATE INDEX "notifications_user_type_sent_idx" ON "notifications" USING btree ("user_id","type","sent_at");--> statement-breakpoint
ALTER TABLE "bag_instances" ADD CONSTRAINT "bag_instances_window_valid" CHECK ("bag_instances"."pickup_end_at" > "bag_instances"."pickup_start_at");--> statement-breakpoint
ALTER TABLE "bag_instances" ADD CONSTRAINT "bag_instances_price_valid" CHECK ("bag_instances"."price_minor" >= 0 AND "bag_instances"."original_value_minor" >= 0 AND "bag_instances"."price_minor" <= "bag_instances"."original_value_minor");--> statement-breakpoint
ALTER TABLE "bag_schedules" ADD CONSTRAINT "bag_schedules_weekday_valid" CHECK ("bag_schedules"."weekday" BETWEEN 0 AND 6);--> statement-breakpoint
ALTER TABLE "bag_schedules" ADD CONSTRAINT "bag_schedules_window_valid" CHECK ("bag_schedules"."pickup_end" > "bag_schedules"."pickup_start");--> statement-breakpoint
ALTER TABLE "bag_schedules" ADD CONSTRAINT "bag_schedules_qty_nonneg" CHECK ("bag_schedules"."quantity" >= 0);--> statement-breakpoint
ALTER TABLE "bag_templates" ADD CONSTRAINT "bag_templates_price_valid" CHECK ("bag_templates"."price_minor" >= 0 AND "bag_templates"."original_value_minor" >= 0 AND "bag_templates"."price_minor" <= "bag_templates"."original_value_minor");