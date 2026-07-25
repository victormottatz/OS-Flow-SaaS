-- Rollback: revert code 4 OS 231035 to EM_MANUTENCAO
UPDATE ordem_servicos SET status = 'EM_MANUTENCAO'::"OSStatus" WHERE id = '729925a4-6c4a-4b4a-b1fd-9dd17f7e8d82';