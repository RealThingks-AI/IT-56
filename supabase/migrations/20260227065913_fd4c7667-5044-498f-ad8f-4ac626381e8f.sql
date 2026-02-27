
CREATE POLICY "auth_all" ON itam_licenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON itam_repairs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON itam_purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON itam_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON itam_tag_series FOR ALL USING (true) WITH CHECK (true);
