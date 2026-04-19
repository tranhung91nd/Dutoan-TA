-- Seed 8 văn bản pháp lý cơ bản đã có
insert into legal_documents (doc_number, doc_type, title, issue_date, issuer, applicable_fields) values
  ('02/2015/TT-BLDTBXH', 'TT', 'Thông tư 02/2015/TT-BLĐTBXH quy định mức lương tối thiểu vùng và các chế độ cho người lao động', '2015-01-23', 'Bộ LĐTB&XH', array['khcn','cds','mt']),
  ('004/2025/TT-BNV',    'TT', 'Thông tư 04/2025/TT-BNV hướng dẫn về cán bộ, công chức',                                         '2025-01-01', 'Bộ Nội vụ',  array['khcn','cds','mt']),
  ('08/2022/NĐ-CP',      'ND', 'Nghị định 08/2022/NĐ-CP quy định chi tiết một số điều của Luật Bảo vệ môi trường',              '2022-01-10', 'Chính phủ',  array['mt']),
  ('31/2023/TT-BTC',     'TT', 'Thông tư 31/2023/TT-BTC hướng dẫn quản lý, sử dụng kinh phí NSNN',                               '2023-05-25', 'Bộ Tài chính', array['khcn','cds','mt']),
  ('72/2020/QH14',       'QH', 'Luật 72/2020/QH14 - Luật Bảo vệ môi trường',                                                      '2020-11-17', 'Quốc hội',   array['mt']),
  ('83/2015/QH13',       'QH', 'Luật 83/2015/QH13 - Luật NSNN',                                                                   '2015-06-25', 'Quốc hội',   array['khcn','cds','mt']),
  ('94/2024/TT-BTC',     'TT', 'Thông tư 94/2024/TT-BTC quy định cơ chế tài chính cho hoạt động KHCN',                            '2024-12-01', 'Bộ Tài chính', array['khcn','cds']),
  ('163/2016/NĐ-CP',     'ND', 'Nghị định 163/2016/NĐ-CP quy định chi tiết Luật NSNN',                                            '2016-12-21', 'Chính phủ',  array['khcn','cds','mt'])
on conflict do nothing;

-- Seed một số định mức cơ bản (mẫu)
insert into budget_norms (category, description, amount_max, unit, source_doc, source_article, applicable_fields) values
  ('cong_lao_dong',    'Thù lao chủ nhiệm nhiệm vụ KHCN cấp cơ sở',                 15000000, 'VND/người/tháng', '94/2024/TT-BTC', 'Điều 6, khoản 1', array['khcn','cds']),
  ('cong_lao_dong',    'Thù lao thành viên nghiên cứu',                              10000000, 'VND/người/tháng', '94/2024/TT-BTC', 'Điều 6, khoản 2', array['khcn','cds']),
  ('hoi_thao',         'Tổ chức hội thảo khoa học',                                   5000000, 'VND/cuộc',        '94/2024/TT-BTC', 'Điều 8',          array['khcn','cds','mt']),
  ('cong_tac_phi',     'Công tác phí trong nước',                                      500000, 'VND/ngày',        '31/2023/TT-BTC', 'Điều 5',          array['khcn','cds','mt']),
  ('van_phong_pham',   'Văn phòng phẩm phục vụ nghiên cứu',                           2000000, 'VND/tháng',       '31/2023/TT-BTC', 'Điều 7',          array['khcn','cds','mt'])
on conflict do nothing;
