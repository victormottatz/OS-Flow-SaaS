-- Rollback: reinserir as 33 OS excluídas do SH Oficina
BEGIN;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('990451f6-da5e-4b16-bed6-543860aef12b', '230165', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('4393ee17-3410-439e-b093-9af7137260dd', '230636', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('5cc720ae-2186-4aed-9919-594cee3523bd', '230703', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('ce5c07ae-1725-452c-8697-38220aa2ac75', '230704', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('9c130122-3ece-4a58-a246-4e3852abc60a', '231175', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('3ebbd0ed-692a-4916-b6cf-4e04dd5dfc55', '231229', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('2917577e-c9dd-43cd-bf5e-3f4d46ef7716', '231817', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('e035de24-d18b-43b8-9a94-cb1f58a7583e', '231824', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('a7a8028d-3396-46aa-895f-e4dc39e5b245', '231825', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('81bbb6e5-5b5b-4577-a8b3-160c326b5b59', '231832', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('201ae054-4789-49f1-b8a0-49034cc268a8', '232936', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('0879b1f0-1b13-4177-85a0-b82c24f7b194', '233050', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('238e0537-295f-4203-a67c-869ff36b45d0', '233187', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('dfd3082b-1f7e-41d9-b876-da9dafb584ed', '233383', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('e7088778-e161-4555-8fe5-760464cf0812', '233538', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('cddb18cc-9a8a-4b4c-95b9-720f64209358', '233898', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('921e62b3-9c1c-4de8-b1f2-e908bfd0b0e4', '234126', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('c7d76733-f707-4de3-9f07-0b5ea0e6ab94', '234130', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('bd9dfe3b-ddc8-4cd5-856c-6c344f64d1cb', '234665', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('5bc77e3d-3bf6-4c3d-89af-5f2b27ed768e', '234703', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('52c1bf84-b729-49fd-8a88-0b0e268cd64b', '234727', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('c5f128bd-b29a-4405-b596-0147192c3859', '234826', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('1658e224-c973-4222-822a-e038212776b3', '234827', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('aefd286b-9a16-4409-9707-1d9720d64042', '234834', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('525761d7-3a2b-4d6d-a7ce-b97ebf7ef9ff', '234836', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('e2e7c49e-3faa-4477-bb83-c5f0b1ef4e11', '234837', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('7657aa95-937c-4a89-8c97-456b2bf4c100', '234928', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('fb226710-0649-4c54-8bda-cbf38264db80', '235001', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('8bfd79fd-b273-460e-93a6-b35ff957d8c5', '235025', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('23c0068e-cb9a-479f-8ece-be28fe378d6c', '235029', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('c8b6a7a5-34bd-4448-8575-0f4c28a6b442', '235030', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('c13bc1ec-d469-483b-97a5-e91070753bed', '235087', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('41dd2aa6-2a5a-4884-8eeb-6472c70f7b1c', '235088', 'AGUARDANDO_AVALIACAO', 0, '0', '0', NOW())
            ON CONFLICT (id) DO NOTHING;
COMMIT;
