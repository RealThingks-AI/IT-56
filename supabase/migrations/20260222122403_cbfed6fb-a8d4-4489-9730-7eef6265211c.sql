
-- Group 1: Concept IT Solutions (f439f48e)
UPDATE itam_assets SET vendor_id = 'f439f48e-f6f0-43ac-a5b5-5b0f06dbf130'
WHERE vendor_id IN ('aa8b76cf-eb9a-44b3-a845-8952db44abc9','687fe27c-b57a-49ec-8bf4-9ef8b272bae0','0cc8b1da-160a-44f1-aff3-cd6f3cc67862','bbfd7763-62bd-4d05-970a-2051b733f14d','35371356-2e91-44e2-96e8-f9bb17dc86ec','3b83cbfc-e00e-4d8f-814a-d5543968a7b7');

-- Group 2: ClearMotion Inc. (bc188875)
UPDATE itam_assets SET vendor_id = 'bc188875-83c7-4341-bab4-f86b604b6ecb'
WHERE vendor_id IN ('e9a99fe1-3515-46bd-979a-091894bd91d4','f423abdc-6fab-4007-a022-93a5c244dca4');

-- Group 3: Eco Logic Tech Solutions (47721941)
UPDATE itam_assets SET vendor_id = '47721941-7d39-426f-99fb-f8afa30195ee'
WHERE vendor_id IN ('63c00494-8612-45f5-90e2-aeb4db558dbc');

-- Group 4: Element14 India Pvt Ltd (9d92a849)
UPDATE itam_assets SET vendor_id = '9d92a849-aa2e-42c8-9881-5121ae4284cd'
WHERE vendor_id IN ('864b5c51-c550-4836-95b4-ba9641f3f546','1f2c7e5c-1b5d-41b2-a7ed-2316ea72c17e','534bdad1-d21b-433a-b3b2-23a4163f03d1','3d1b4203-3cc9-4201-ab7e-2e2318f6b0c3','23721d5b-6722-45f1-a7ce-b39fc5f3e37e');

-- Group 5: Kaspen IT Solutions Pvt Ltd (af3ef6e9)
UPDATE itam_assets SET vendor_id = 'af3ef6e9-9b9d-4f87-b22e-41ce638e82ec'
WHERE vendor_id IN ('c2286dac-fd6d-4693-bd26-8be4c285a4af','1e89cd96-15c7-4038-a53c-e12ffc116fb3','2c1bdfe2-9f14-49ad-9dd6-d39a08e29dbe','cd7442ca-c577-49f8-8b3e-4dfd4c29d9dd');

-- Group 6: RealThingks GmbH (b1cf258c)
UPDATE itam_assets SET vendor_id = 'b1cf258c-f7da-455a-a42c-d6a138e6275b'
WHERE vendor_id IN ('abb71e35-8757-4596-9b52-b957acb73171');

-- Group 7: REFU Drive (33f9973f)
UPDATE itam_assets SET vendor_id = '33f9973f-0958-4250-ab58-f84fd1a5303b'
WHERE vendor_id IN ('47d9d046-60da-43a7-b3a2-bc853c78401d','d4a194b7-0fca-41cd-8da3-22b2abdc8fb7');

-- Group 8: Sensata Technologies (238e6f88)
UPDATE itam_assets SET vendor_id = '238e6f88-98cf-4f95-8188-ab41204eded4'
WHERE vendor_id IN ('c7efd6ec-58a0-42d3-b0e9-4ec1950dab38');

-- Group 9: Vector Informatik India Pvt Ltd (c7e34fab)
UPDATE itam_assets SET vendor_id = 'c7e34fab-f1db-4bbc-a185-b8c9f0ee9e10'
WHERE vendor_id IN ('4a4a9a2b-8547-4c44-9dbf-ebeb1da95d21','c53af88c-dbce-476a-8117-a01153f2e1fc','75706f36-2ee2-4a8c-a27f-eaf50d27e1c8');

-- Group 10: VVDN Technologies PVT LTD (2ebe7b73)
UPDATE itam_assets SET vendor_id = '2ebe7b73-c59b-4ba3-a06d-6907caae8a8c'
WHERE vendor_id IN ('c6e3be28-66b8-4cda-9312-ec3f0e932cd8');

-- Group 11: Amazon India (525c4220)
UPDATE itam_assets SET vendor_id = '525c4220-441e-4e42-9706-4dfaefaf216f'
WHERE vendor_id IN ('c4f1279f-a76e-4a67-83a9-e9a6021e7eba');

-- Group 12: FEV (44263679)
UPDATE itam_assets SET vendor_id = '44263679-25a6-409e-b005-578708aa397c'
WHERE vendor_id IN ('ab30fe79-1102-4bb6-9c11-07098570eb0e');

-- Soft-delete all 30 duplicate vendors
UPDATE itam_vendors SET is_active = false WHERE id IN (
  'aa8b76cf-eb9a-44b3-a845-8952db44abc9','687fe27c-b57a-49ec-8bf4-9ef8b272bae0','0cc8b1da-160a-44f1-aff3-cd6f3cc67862','bbfd7763-62bd-4d05-970a-2051b733f14d','35371356-2e91-44e2-96e8-f9bb17dc86ec','3b83cbfc-e00e-4d8f-814a-d5543968a7b7',
  'e9a99fe1-3515-46bd-979a-091894bd91d4','f423abdc-6fab-4007-a022-93a5c244dca4',
  '63c00494-8612-45f5-90e2-aeb4db558dbc',
  '864b5c51-c550-4836-95b4-ba9641f3f546','1f2c7e5c-1b5d-41b2-a7ed-2316ea72c17e','534bdad1-d21b-433a-b3b2-23a4163f03d1','3d1b4203-3cc9-4201-ab7e-2e2318f6b0c3','23721d5b-6722-45f1-a7ce-b39fc5f3e37e',
  'c2286dac-fd6d-4693-bd26-8be4c285a4af','1e89cd96-15c7-4038-a53c-e12ffc116fb3','2c1bdfe2-9f14-49ad-9dd6-d39a08e29dbe','cd7442ca-c577-49f8-8b3e-4dfd4c29d9dd',
  'abb71e35-8757-4596-9b52-b957acb73171',
  '47d9d046-60da-43a7-b3a2-bc853c78401d','d4a194b7-0fca-41cd-8da3-22b2abdc8fb7',
  'c7efd6ec-58a0-42d3-b0e9-4ec1950dab38',
  '4a4a9a2b-8547-4c44-9dbf-ebeb1da95d21','c53af88c-dbce-476a-8117-a01153f2e1fc','75706f36-2ee2-4a8c-a27f-eaf50d27e1c8',
  'c6e3be28-66b8-4cda-9312-ec3f0e932cd8',
  'c4f1279f-a76e-4a67-83a9-e9a6021e7eba',
  'ab30fe79-1102-4bb6-9c11-07098570eb0e'
);

-- Fix primary vendor name: Vector Informatik India Pvt Ltd (ensure consistent casing)
UPDATE itam_vendors SET name = 'Vector Informatik India Pvt Ltd' WHERE id = 'c7e34fab-f1db-4bbc-a185-b8c9f0ee9e10';
