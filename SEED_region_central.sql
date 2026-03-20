-- ══════════════════════════════════════════════════════════════════════════════
-- SEED: Región Central — 91 sitios
-- Ejecutar DESPUÉS de MIGRATION_regions_v2.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Insertar la región
INSERT INTO regions (name, active)
VALUES ('Región Central', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Insertar los 91 sitios asociados a Región Central
INSERT INTO sites (region_id, site_id, name, lat, lng, height_m, province, active)
SELECT r.id,
       v.site_id,
       v.name,
       v.lat,
       v.lng,
       v.height_m,
       v.province,
       true
FROM regions r,
(VALUES
  ('PA-CC-1036', 'PENONOME CENTRO A', 8.514148, -80.35982, 24.0, 'Coclé'),
  ('PA-CC-1024', 'El Salao A', 8.247234, -80.527059, 50.0, 'Coclé'),
  ('PA-CC-1025', 'Farallon A', 8.37892, -80.13242, 42.0, 'Coclé'),
  ('PA-CC-1027', 'Penonome A', 8.505392, -80.348423, 12.0, 'Coclé'),
  ('PA-CC-1028', 'El Valle A', 8.60389, -80.128804, 42.0, 'Coclé'),
  ('PA-CC-1029', 'Rio Grande A', 8.423393, -80.485306, 42.0, 'Coclé'),
  ('PA-CC-1030', 'Nata A', 8.337294, -80.519878, 50.0, 'Coclé'),
  ('PA-CC-1031', 'Central de Aguadulce A', 8.240647, -80.549632, 115.0, 'Coclé'),
  ('PA-CC-1032', 'El Roble A', 8.16721, -80.659417, 51.0, 'Coclé'),
  ('PA-CC-1033', 'Aguadulce 02 (Pocri) A', 8.25673, -80.540563, 40.0, 'Coclé'),
  ('PA-CC-1034', 'CWP Penonome A', 8.52219, -80.35886, 31.0, 'Coclé'),
  ('PA-CC-1035', 'Santa Clara A', 8.380801, -80.109201, 40.0, 'Coclé'),
  ('PA-CC-1037', 'CHURUQUITA CHIQUITA A', 8.574486, -80.275885, 30.0, 'Coclé'),
  ('PA-CC-1038', 'La Pintada A', 8.59671, -80.448726, 40.0, 'Coclé'),
  ('PA-CC-1039', 'Rio Hato A', 8.370031, -80.161515, 40.0, 'Coclé'),
  ('PA-CC-1040', 'CWP Ola A', 8.411098, -80.663646, 30.0, 'Coclé'),
  ('PA-CC-1041', 'Estero de San Jose A', 8.219587, -80.611377, 40.0, 'Coclé'),
  ('PA-CC-1042', 'EL COPE A', 8.61757, -80.576084, 30.0, 'Coclé'),
  ('PA-CC-1043', 'Altos De Miraflores A', 8.630048, -80.27628, 30.0, 'Coclé'),
  ('PA-CC-1044', 'Santa Maria A', 8.540337, -80.434941, 50.0, 'Coclé'),
  ('PA-CC-1045', 'COCLE (CIRUELITO) A', 8.456679, -80.427312, 52.0, 'Coclé'),
  ('PA-CC-1046', 'JAGUITO A', 8.433394, -80.310429, 40.0, 'Coclé'),
  ('PA-CC-1047', 'Membrillal', 8.561909, -80.408837, 45.0, 'Coclé'),
  ('PA-CC-1048', 'TOABRE A', 8.648002, -80.322153, 51.0, 'Coclé'),
  ('PA-CC-1049', 'CAPELLANIA A', 8.297645, -80.551467, 40.0, 'Coclé'),
  ('PA-VG-1041', 'LLANO SANCHEZ A', 8.201701, -80.706773, 60.0, 'Coclé'),
  ('PA-CC-1050', 'SANTA RITA A', 8.505747, -80.183745, 54.0, 'Coclé'),
  ('PA-VG-1042', 'Divisa A', 8.125633, -80.688388, 50.0, 'Herrera'),
  ('PA-HE-1019', 'Parita A', 7.98898, -80.505118, 50.0, 'Herrera'),
  ('PA-HE-1020', 'El Vigia Chitre A', 7.965035, -80.431201, 54.0, 'Herrera'),
  ('PA-HE-1021', 'Paris Valdes A', 8.038329, -80.551963, 53.0, 'Herrera'),
  ('PA-HE-1022', 'Ocu A', 7.948159, -80.779413, 54.0, 'Herrera'),
  ('PA-HE-1012', 'Pese A', 7.907936, -80.613395, 52.0, 'Herrera'),
  ('PA-HE-1013', 'Monagrillo A', 7.976723, -80.435758, 30.0, 'Herrera'),
  ('PA-HE-1014', 'Chitre 02 A', 7.952995, -80.426797, 36.0, 'Herrera'),
  ('PA-VG-1043', 'Chupampa A', 8.080476, -80.776279, 41.0, 'Herrera'),
  ('PA-HE-1015', 'Potuga A', 8.069209, -80.61869, 40.0, 'Herrera'),
  ('PA-HE-1016', 'Los Hatillos A', 7.935571, -80.539277, 51.0, 'Herrera'),
  ('PA-HE-1017', 'Las Minas A', 7.800447, -80.744849, 60.0, 'Herrera'),
  ('PA-HE-1018', 'Los Castillos A', 7.983648, -80.619115, 50.0, 'Herrera'),
  ('PA-LS-1012', 'Cerro Cienaga Larga A', 7.834539, -80.306408, 50.0, 'Los Santos'),
  ('PA-LS-1013', 'Entrada de Las Tablas A', 7.776886, -80.274363, 50.0, 'Los Santos'),
  ('PA-LS-1014', 'Cerro Gordo A', 7.906572, -80.346277, 51.4, 'Los Santos'),
  ('PA-LS-1015', 'Macaracas A', 7.731456, -80.553731, 51.5, 'Los Santos'),
  ('PA-LS-1016', 'Pedasi A', 7.529469, -80.024803, 49.0, 'Los Santos'),
  ('PA-LS-1017', 'Pocri A', 7.656935, -80.119333, 50.0, 'Los Santos'),
  ('PA-LS-1018', 'Tonosi A', 7.409111, -80.439511, 50.0, 'Los Santos'),
  ('PA-LS-1019', 'Sabana Grande A', 7.840283, -80.364627, 51.0, 'Los Santos'),
  ('PA-LS-1020', 'La Palma A', 7.694018, -80.193674, 40.0, 'Los Santos'),
  ('PA-LS-1021', 'La Villa A', 7.933398, -80.415024, 42.0, 'Los Santos'),
  ('PA-LS-1022', 'CWP-Las Tablas A', 7.76792, -80.27516, 35.0, 'Los Santos'),
  ('PA-LS-1023', 'Canajagua A', 7.647893, -80.415731, 43.0, 'Los Santos'),
  ('PA-LS-1024', 'El Carate A', 7.736889, -80.282804, 50.0, 'Los Santos'),
  ('PA-LS-1025', 'El Canafistulo A', 7.60658, -80.229942, 50.0, 'Los Santos'),
  ('PA-LS-1026', 'Los Asientos A', 7.51877, -80.130156, 50.0, 'Los Santos'),
  ('PA-LS-1027', 'Ojo de Agua (LS) A', 7.448614, -80.294606, 50.0, 'Los Santos'),
  ('PA-LS-1028', 'GUARARE A', 7.822318, -80.283856, 30.0, 'Los Santos'),
  ('PA-LS-1029', 'Ave Maria A', 7.328223, -80.451108, 50.0, 'Los Santos'),
  ('PA-LS-1030', 'JAS - El Cortezo', 7.429394, -80.632186, 36.0, 'Los Santos'),
  ('PA-LS-1031', 'LAS TABLAS ABAJOS A', 7.79338, -80.254367, 54.0, 'Los Santos'),
  ('PA-LS-1032', 'LLANO DE PIEDRA A', 7.650842, -80.563601, 50.0, 'Los Santos'),
  ('PA-LS-1033', 'LA MIEL', 7.54664, -80.33527, 50.0, 'Los Santos'),
  ('PA-VG-1012', 'Santiago_CWP A', 8.098573, -80.986119, 120.0, 'Veraguas'),
  ('PA-VG-1013', 'Cardoze y Lindo A', 8.079499, -80.862861, 48.0, 'Veraguas'),
  ('PA-VG-1014', 'Cerro de la Tembladera A', 8.182765, -81.120421, 50.0, 'Veraguas'),
  ('PA-VG-1015', 'Cerro Alto la Flor A', 8.207817, -81.362906, 50.0, 'Veraguas'),
  ('PA-VG-1016', 'Sona A', 8.005831, -81.312828, 52.0, 'Veraguas'),
  ('PA-VG-1017', 'Santiago 02 Los Tucanes A', 8.105967, -80.969608, 40.0, 'Veraguas'),
  ('PA-VG-1018', 'Santiago 03 Lavautos A', 8.099254, -80.965614, 38.0, 'Veraguas'),
  ('PA-VG-1019', 'SANTA CATALINA A', 7.63461, -81.252161, 40.0, 'Veraguas'),
  ('PA-VG-1020', 'CANTO DEL LLANO A', 8.133025, -80.96163, 43.0, 'Veraguas'),
  ('PA-VG-1021', 'Atalaya A', 8.042518, -80.922864, 40.0, 'Veraguas'),
  ('PA-VG-1022', 'Montijo A', 7.990758, -81.05494, 49.0, 'Veraguas'),
  ('PA-VG-1023', 'Las Palmas Veraguas', 8.138258, -81.457301, 66.0, 'Veraguas'),
  ('PA-VG-1024', 'Canacitas Abajo A', 8.094871, -80.955596, 44.0, 'Veraguas'),
  ('PA-VG-1025', 'Ponuga', 7.881548, -80.975465, 60.0, 'Veraguas'),
  ('PA-VG-1026', 'Rio de Jesus A', 7.984898, -81.164781, 72.0, 'Veraguas'),
  ('PA-VG-1027', 'Canazas A', 8.331461, -81.21016, 34.0, 'Veraguas'),
  ('PA-VG-1028', 'La Mesa', 8.147645, -81.184297, 30.0, 'Veraguas'),
  ('PA-VG-1029', 'Guarumal -  Veraguas', 7.790959, -81.234964, 50.0, 'Veraguas'),
  ('PA-VG-1030', 'SAN FRANCISCO A', 8.259935, -80.977735, 50.0, 'Veraguas'),
  ('PA-VG-1031', 'EL JUNQUITO', 8.202298, -81.291538, 50.0, 'Veraguas'),
  ('PA-VG-1032', 'Santa Fe A', 8.511438, -81.080681, 31.0, 'Veraguas'),
  ('PA-VG-1033', 'LLANO CATIVAL', 7.652624, -80.983937, 50.0, 'Veraguas'),
  ('PA-VG-1034', 'CALOBRE A', 8.318196, -80.841783, 70.0, 'Veraguas'),
  ('PA-VG-1035', 'LA RAYA DE SANTAMARIA A', 8.166313, -80.815788, 60.0, 'Veraguas'),
  ('PA-VG-1036', 'Cerro Calidonia (CWP)', 7.934188, -81.403842, 75.0, 'Veraguas'),
  ('PA-VG-1037', 'La Pena CWP A', 8.134617, -81.028261, 38.0, 'Veraguas'),
  ('PA-VG-1038', 'Cerro San Cristobal (El Piro) A', 8.217155, -81.472118, 120.0, 'Veraguas'),
  ('PA-VG-1039', 'LAS GUIAS ABAJO A', 8.197468, -80.752752, 50.0, 'Veraguas'),
  ('PA-VG-1040', 'Mariato A', 7.6462, -80.99243, 38.0, 'Veraguas')
) AS v(site_id, name, lat, lng, height_m, province)
WHERE r.name = 'Región Central'
ON CONFLICT (site_id) DO NOTHING;

-- Verificar
SELECT r.name AS region, COUNT(s.id) AS total_sites
FROM regions r
LEFT JOIN sites s ON s.region_id = r.id
GROUP BY r.name;