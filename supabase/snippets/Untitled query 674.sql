INSERT INTO convenios (id, nombre, codigo_regcon, ambito, fecha_vigencia, estado) VALUES
    ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Convenio Estatal de Hostelería', 'BOE-A-2023-23456', 'estatal',
  '2023-04-01', 'activo'),
    ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'Comercio de Barcelona', 'BOE-A-2023-34567', 'provincial', '2023-03-01',
  'activo'),
    ('d4e5f6a7-b8c9-0123-def0-456789012345', 'Construcción y Obras Públicas', 'BOE-A-2023-45678', 'estatal',
  '2023-05-01', 'activo'),
    ('e5f6a7b8-c9d0-1234-ef01-567890123456', 'Empresa XYZ S.A.', 'BOE-A-2023-56789', 'empresa', '2023-06-01', 'activo')
ON CONFLICT (id) DO NOTHING;