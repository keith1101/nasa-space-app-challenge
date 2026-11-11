export interface ProjectStat {
  label: string;
  value: string;
  desc: string;
  colorClass: string;
}

export interface GalleryItem {
  id: string;
  imageSrc: string;
  alt: string;
  badge: string;
  badgeColorClass: string;
  title: string;
  desc: string;
  citationKey?: string;
  citationUrl?: string;
}

export interface ComparisonRow {
  criteria: string;
  traditional: string;
  spherex: string;
  citationKey?: string;
}

export interface ScientificCitation {
  id: string;
  citationKey: string;
  authors: string;
  title: string;
  venue: string;
  year: number;
  doi?: string;
  arxivId?: string;
  url: string;
  relevance: string;
}

export interface ProjectOverviewContent {
  badge: string;
  title: string;
  subtitle: string;
  breadcrumbHome: string;
  breadcrumbCurrent: string;
  langToggleLabel: string;
  summary: {
    title: string;
    p1: string;
    p2: string;
    stats: ProjectStat[];
  };
  gallery: {
    title: string;
    items: GalleryItem[];
  };
  rationale: {
    title: string;
    p1: string;
    p2: string;
  };
  comparison: {
    title: string;
    headers: [string, string, string];
    rows: ComparisonRow[];
  };
  citationsSection: {
    title: string;
    subtitle: string;
    badge: string;
    linkDirect: string;
    items: ScientificCitation[];
  };
  cta: {
    backHome: string;
    guideBtn: string;
    workstationBtn: string;
  };
}

export const projectOverviewData: Record<'vi' | 'en', ProjectOverviewContent> = {
  vi: {
    badge: 'NASA SPACE APPS CHALLENGE 2026 · SCIENTIFIC DOSSIER',
    title: 'Hành Trình Săn Tìm Planet Nine Cùng Kính Viễn Vọng NASA SPHEREx',
    subtitle: 'Tài liệu kỹ thuật tổng quan về cơ sở vật lý thiên văn, nguồn dữ liệu vi phân hồng ngoại và giải pháp dân chủ hóa khoa học công dân săn tìm thiên thể ngoài rìa Thái Dương Hệ.',
    breadcrumbHome: 'Trang Chủ',
    breadcrumbCurrent: 'Giới Thiệu Dự Án',
    langToggleLabel: 'Ngôn ngữ',
    summary: {
      title: '1. Tổng Quan Dự Án',
      p1: 'SPHEREx Explorer là nền tảng trạm làm việc trực quan hóa thiên văn học thời gian thực mã nguồn mở, được thiết kế nhằm hỗ trợ các nhà nghiên cứu và nhà khoa học công dân phát hiện Planet Nine (Hành tinh Thứ Chín) và các vật thể ngoài Hải Vương Tinh (Trans-Neptunian Objects - TNOs) [1, 2].',
      p2: 'Hệ thống kết nối trực tiếp đến kho lưu trữ mở NASA IRSA (Infrared Science Archive) và chuẩn IVOA SIAv2 [4], tự động trích xuất các tệp tin FITS 7-HDU Level 2 MEF (Multi-Extension FITS) thực tế [4, 7], căn chỉnh hệ tọa độ cầu xích đạo J2000, tính toán ma trận vi phân triệt tiêu sao nền (Difference Imaging ΔI = E₂ − E₁), và dựng đường cong phổ phân bố năng lượng 102 kênh SED (0.75 – 5.00 µm) [3] giúp xác thực thành phần hóa học của băng (H₂O, CH₄, CO₂) trên bề mặt các thiên thể xa xôi [6].',
      stats: [
        {
          label: 'Chu kỳ khảo sát',
          value: '6 Tháng / Vòng Quét',
          desc: 'So sánh Survey 1 và Survey 2 để đo chuyển động riêng (Proper Motion) [3].',
          colorClass: 'text-nasa-blue'
        },
        {
          label: 'Dải phổ hồng ngoại',
          value: '102 Kênh Siêu Phổ',
          desc: 'Bao phủ bước sóng 0.75 – 5.00 µm đo phổ phản xạ và bức xạ nhiệt [3].',
          colorClass: 'text-amber-600'
        },
        {
          label: 'Tính xác thực',
          value: '100% NASA IRSA',
          desc: 'Sử dụng tệp tin FITS 7-HDU Level 2 nguyên bản từ Caltech IPAC [4].',
          colorClass: 'text-emerald-600'
        }
      ]
    },
    gallery: {
      title: '2. Tư Liệu Hình Ảnh & Bằng Chứng Khoa Học Xác Thực',
      items: [
        {
          id: 'spherex-hardware',
          imageSrc: '/assets/images/spherex_observatory_hardware.jpg',
          alt: 'Kính viễn vọng NASA SPHEREx trong phòng sạch thử nghiệm',
          badge: 'NASA / JPL-Caltech Official Hardware Cleanroom',
          badgeColorClass: 'text-nasa-cyan',
          title: 'Phần Cứng Kính Viễn Vọng Không Gian NASA SPHEREx',
          desc: 'Thiết bị quang học nghiêng được bao bọc bởi 3 tầng nón nhôm tản nhiệt (V-groove cone radiators) giúp làm lạnh thụ động toàn bộ hệ thống xuống dưới 80 K (-193°C), chụp quét toàn bộ vòm trời ở 102 kênh phổ hồng ngoại [3].',
          citationKey: '[3]',
          citationUrl: 'https://arxiv.org/abs/1606.07039'
        },
        {
          id: 'batygin-brown-orbit',
          imageSrc: '/assets/images/planet_nine_orbit.svg',
          alt: 'Mô hình toán học quỹ đạo Planet Nine của Batygin và Brown',
          badge: 'Batygin & Brown Orbital Clustering Model (Caltech)',
          badgeColorClass: 'text-amber-400',
          title: 'Giả Thuyết Quỹ Đạo Planet Nine (Batygin & Brown, 2016)',
          desc: 'Sự cụm góc bất thường của cận điểm quỹ đạo các thiên thể ngoài Hải Vương Tinh (Extreme TNOs: Sedna, 2012 VP113, Leleakūhonua) chỉ ra lực hấp dẫn của một siêu Trái Đất (5 – 10 M⊕) ở cự ly 400 – 800 AU [1, 2].',
          citationKey: '[1]',
          citationUrl: 'https://doi.org/10.3847/0004-6256/151/2/22'
        }
      ]
    },
    rationale: {
      title: '3. Tại Sao Kính Quang Học Bỏ Sót và SPHEREx Lại Là Chìa Khóa?',
      p1: 'Ở khoảng cách trên 400 AU, cường độ ánh sáng Mặt Trời phản xạ từ bề mặt một hành tinh giảm theo nghịch đảo lũy thừa bậc bốn của khoảng cách (F ∝ 1/r⁴) [2], khiến thiên thể mờ nhạt đến mức mắt thường hay các kính viễn vọng quang học khả kiến mặt đất khó lòng phát hiện.',
      p2: 'Tuy nhiên, theo quy luật bức xạ vật đen Planck, các hành tinh khí siêu Trái Đất hay thiên thể băng khổng lồ vẫn liên tục phát xạ nhiệt nội tại mờ nhạt ở nhiệt độ cực thấp (T ≈ 30 – 45 K) [2]. Bức xạ này đạt đỉnh trong dải cận hồng ngoại mà kính viễn vọng NASA SPHEREx với 102 dải phổ liên tục có thể thu nhận được [3, 6].'
    },
    comparison: {
      title: '4. Điểm Đột Phá So Với Phương Pháp Truyền Thống',
      headers: ['Tiêu chí', 'Giải pháp truyền thống', 'SPHEREx Explorer'],
      rows: [
        {
          criteria: 'Truy cập dữ liệu',
          traditional: 'Tải FITS thủ công hàng gigabyte qua cổng web portal nặng nề',
          spherex: 'Kết nối trực tiếp IVOA SIAv2 & streaming FITS cutout kèm LRU Cache 500MB [4]',
          citationKey: '[4]'
        },
        {
          criteria: 'So sánh chuyển động',
          traditional: 'Cài đặt phần mềm desktop phức tạp (DS9, Aladin)',
          spherex: 'Blink Comparator 0.5 – 5 Hz tương tác ngay trên trình duyệt web qua Canvas GPU',
          citationKey: '[1]'
        },
        {
          criteria: 'Triệt tiêu sao nền',
          traditional: 'Lọc ngưỡng thủ công, dễ sót dị thường mờ',
          spherex: 'Ma trận vi phân ΔI = E₂ − E₁ tự động với thanh trượt lọc độ lệch chuẩn σ-threshold',
          citationKey: '[5]'
        },
        {
          criteria: 'Nhận diện thành phần',
          traditional: 'Cần đo trắc quang bổ sung từ các kính viễn vọng mặt đất khác',
          spherex: 'Tích hợp sẵn phổ 102 kênh SED với vạch nhận diện băng H₂O, CH₄, CO₂ [6]',
          citationKey: '[6]'
        }
      ]
    },
    citationsSection: {
      title: '5. Tài Liệu Tham Khảo & Trích Dẫn Khoa Học',
      subtitle: 'Toàn bộ mô hình vật lý thiên văn, dữ liệu phổ và thuật toán được bảo chứng bởi các công trình công bố bình duyệt quốc tế (Peer-Reviewed).',
      badge: 'BẢO CHỨNG HỌC THUẬT',
      linkDirect: 'Mở bài báo gốc (DOI/arXiv)',
      items: [
        {
          id: 'ref-1',
          citationKey: '[1]',
          authors: 'Batygin, K. & Brown, M. E.',
          title: 'Evidence for a Distant Giant Planet in the Solar System',
          venue: 'The Astronomical Journal, Vol. 151, No. 2, p. 22',
          year: 2016,
          doi: '10.3847/0004-6256/151/2/22',
          arxivId: 'arXiv:1601.05438',
          url: 'https://doi.org/10.3847/0004-6256/151/2/22',
          relevance: 'Bài báo nền tảng chứng minh hiện tượng gom cụm góc cận điểm của các thiên thể Extreme TNOs, đặt nền móng toán học cho sự tồn tại của Planet Nine.'
        },
        {
          id: 'ref-2',
          citationKey: '[2]',
          authors: 'Batygin, K., Adams, F. C., Brown, M. E., & Becker, J. C.',
          title: 'The Planet Nine Hypothesis',
          venue: 'Physics Reports, Vol. 805, pp. 1–53',
          year: 2019,
          doi: '10.1016/j.physrep.2019.01.009',
          arxivId: 'arXiv:1902.10103',
          url: 'https://doi.org/10.1016/j.physrep.2019.01.009',
          relevance: 'Khảo sát vật lý toàn diện về các đặc tính quỹ đạo (400 – 800 AU), khối lượng (5 – 10 M⊕) và nhiệt độ bức xạ hồng ngoại của Planet Nine.'
        },
        {
          id: 'ref-3',
          citationKey: '[3]',
          authors: 'Doré, O., Werner, M. W., Ashby, M., et al. (SPHEREx Science Team)',
          title: 'Science Impacts of the SPHEREx All-Sky Optical to Near-Infrared Spectral Survey',
          venue: 'NASA JPL Technical Report & arXiv:1606.07039',
          year: 2016,
          arxivId: 'arXiv:1606.07039',
          url: 'https://arxiv.org/abs/1606.07039',
          relevance: 'Tài liệu khoa học sứ mệnh SPHEREx mô tả cấu hình 102 dải phổ (0.75 – 5.0 µm), 6 cảm biến Teledyne H2RG và chu kỳ quét toàn trời 6 tháng.'
        },
        {
          id: 'ref-4',
          citationKey: '[4]',
          authors: 'NASA / IPAC Infrared Science Archive (Caltech)',
          title: 'SPHEREx Quick Release 2 (QR2) Level 2 Data Access Protocols & IVOA SIAv2',
          venue: 'Caltech / IPAC Documentation',
          year: 2024,
          url: 'https://irsa.ipac.caltech.edu/data/SPHEREx/',
          relevance: 'Quy chuẩn truy xuất tệp tin FITS 7-HDU Level 2 MEF và giao thức IVOA SIAv2 được ứng dụng kết nối thời gian thực.'
        },
        {
          id: 'ref-5',
          citationKey: '[5]',
          authors: 'Lupton, R., Blanton, M. R., Fekete, G., Hogg, D. W., & Munn, J. A.',
          title: 'Preparing Red-Green-Blue Images from CCD Data',
          venue: 'Publications of the Astronomical Society of the Pacific (PASP), Vol. 116, pp. 133–137',
          year: 2004,
          doi: '10.1086/382245',
          arxivId: 'astro-ph/0312483',
          url: 'https://doi.org/10.1086/382245',
          relevance: 'Cơ sở toán học của hàm co giãn độ sáng phi tuyến Asinh Stretch dùng trong trạm quan sát để cân bằng dải sáng động.'
        },
        {
          id: 'ref-6',
          citationKey: '[6]',
          authors: 'Cruikshank, D. P., Grundy, W. M., DeMeo, F. E., et al.',
          title: 'The Surface Compositions of Trans-Neptunian Objects and Centaurs',
          venue: 'The Trans-Neptunian Solar System, Elsevier, pp. 101–124',
          year: 2020,
          doi: '10.1016/B978-0-12-816490-7.00005-9',
          url: 'https://doi.org/10.1016/B978-0-12-816490-7.00005-9',
          relevance: 'Xác định các vạch phổ hấp thụ chẩn đoán của băng nước (3.05 µm), mê-tan (3.32 µm) và carbon dioxide (4.27 µm) trên thiên thể đóng băng.'
        },
        {
          id: 'ref-7',
          citationKey: '[7]',
          authors: 'The Astropy Collaboration (Price-Whelan, A. M. et al.)',
          title: 'The Astropy Project: Building an Open-science Python Package',
          venue: 'The Astronomical Journal, Vol. 156, No. 3, p. 123',
          year: 2018,
          doi: '10.3847/1538-3881/aabc4f',
          arxivId: 'arXiv:1801.02634',
          url: 'https://doi.org/10.3847/1538-3881/aabc4f',
          relevance: 'Thư viện vật lý thiên văn chuẩn hóa được backend sử dụng để phân tích FITS, căn chỉnh WCS và trắc quang vi phân.'
        }
      ]
    },
    cta: {
      backHome: '← Quay lại Trang Chủ',
      guideBtn: 'Xem Cẩm Nang Hướng Dẫn Sử Dụng & Wiki',
      workstationBtn: 'Khởi Chạy Trạm Làm Việc'
    }
  },
  en: {
    badge: 'NASA SPACE APPS CHALLENGE 2026 · SCIENTIFIC DOSSIER',
    title: 'Hunting for Planet Nine with the NASA SPHEREx Observatory',
    subtitle: 'Comprehensive technical overview of astrophysical foundations, infrared difference imaging pipelines, and citizen science democratization for outer solar system discovery.',
    breadcrumbHome: 'Home',
    breadcrumbCurrent: 'Project Overview',
    langToggleLabel: 'Language',
    summary: {
      title: '1. Executive Summary',
      p1: 'SPHEREx Explorer is an open-source, real-time astronomical workstation designed to empower researchers and Citizen Astronomers in discovering Planet Nine (Planet X) and Extreme Trans-Neptunian Objects (ETNOs) [1, 2].',
      p2: 'Connecting directly to the open NASA IRSA (Infrared Science Archive) repository and IVOA SIAv2 standard [4], the pipeline ingests authentic 7-HDU Level 2 MEF (Multi-Extension FITS) cubes [4, 7], aligns to the J2000 equatorial celestial frame, computes epoch difference matrices (Difference Imaging ΔI = E₂ − E₁), and plots 102-channel continuous SED profiles (0.75 – 5.00 µm) [3] to identify molecular ice signatures (H₂O, CH₄, CO₂) on distant bodies [6].',
      stats: [
        {
          label: 'Survey Cadence',
          value: '6 Months / Sky Pass',
          desc: 'Cross-comparing Survey 1 and Survey 2 to measure proper motion [3].',
          colorClass: 'text-nasa-blue'
        },
        {
          label: 'Spectral Coverage',
          value: '102 Channels',
          desc: 'Continuous 0.75 – 5.00 µm coverage measuring reflectance and thermal glow [3].',
          colorClass: 'text-amber-600'
        },
        {
          label: 'Data Authenticity',
          value: '100% NASA IRSA',
          desc: 'Ingests authentic 7-HDU Level 2 FITS directly from Caltech IPAC [4].',
          colorClass: 'text-emerald-600'
        }
      ]
    },
    gallery: {
      title: '2. Scientific Archive & Observational Evidence',
      items: [
        {
          id: 'spherex-hardware',
          imageSrc: '/assets/images/spherex_observatory_hardware.jpg',
          alt: 'NASA SPHEREx space observatory in cleanroom acoustic test facility',
          badge: 'NASA / JPL-Caltech Official Hardware Cleanroom',
          badgeColorClass: 'text-nasa-cyan',
          title: 'NASA SPHEREx Space Observatory Flight Hardware',
          desc: 'Off-axis telescope assembly enclosed within 3-stage passive V-groove cone radiators that maintain optical bench temperatures below 80 K (-193°C), dispersing 102 spectral bands [3].',
          citationKey: '[3]',
          citationUrl: 'https://arxiv.org/abs/1606.07039'
        },
        {
          id: 'batygin-brown-orbit',
          imageSrc: '/assets/images/planet_nine_orbit.svg',
          alt: 'Mathematical orbital clustering model by Batygin and Brown',
          badge: 'Batygin & Brown Orbital Clustering Model (Caltech)',
          badgeColorClass: 'text-amber-400',
          title: 'Planet Nine Orbital Clustering Hypothesis (Batygin & Brown, 2016)',
          desc: 'Physical perihelion clustering of Extreme TNOs (Sedna, 2012 VP113, Leleakūhonua) dynamically constrains an unobserved 5–10 M⊕ super-Earth at 400 – 800 AU [1, 2].',
          citationKey: '[1]',
          citationUrl: 'https://doi.org/10.3847/0004-6256/151/2/22'
        }
      ]
    },
    rationale: {
      title: '3. Why Optical Telescopes Miss It and SPHEREx Is The Key',
      p1: 'Beyond 400 AU, reflected optical solar irradiance plummets with the fourth power of heliocentric distance (F ∝ 1/r⁴) [2], rendering outer solar system bodies invisible to optical ground-based telescopes.',
      p2: 'However, pursuant to Planck\'s blackbody radiation law, super-Earths and giant icy bodies radiate intrinsic thermal heat at cryogenic temperatures (T ≈ 30 – 45 K) [2]. This thermal emissions peak in the mid-to-far infrared, perfectly matching SPHEREx\'s 102 continuous channels [3, 6].'
    },
    comparison: {
      title: '4. Breakthrough Capabilities vs. Legacy Workflows',
      headers: ['Capability', 'Legacy Tooling', 'SPHEREx Explorer'],
      rows: [
        {
          criteria: 'Data Ingestion',
          traditional: 'Manual gigabyte FITS downloads via static web forms',
          spherex: 'Direct IVOA SIAv2 streaming cutout queries with 500MB LRU disk caching [4]',
          citationKey: '[4]'
        },
        {
          criteria: 'Motion Detection',
          traditional: 'Heavy desktop software installations (DS9, Aladin)',
          spherex: 'Interactive in-browser 0.5 – 5 Hz Blink Comparator powered by GPU Canvas',
          citationKey: '[1]'
        },
        {
          criteria: 'Background Subtraction',
          traditional: 'Static threshold masks with high false-alarm rates',
          spherex: 'Automated epoch difference matrix ΔI = E₂ − E₁ with dynamic σ-thresholding [5]',
          citationKey: '[5]'
        },
        {
          criteria: 'Composition Verification',
          traditional: 'Separate multi-facility follow-up photometry required',
          spherex: 'Built-in 102-channel SED graph with diagnostic H₂O, CH₄, CO₂ ice lines [6]',
          citationKey: '[6]'
        }
      ]
    },
    citationsSection: {
      title: '5. Scientific References & Academic Citations',
      subtitle: 'All astrophysical models, spectral databases, and reduction pipelines are grounded in peer-reviewed literature.',
      badge: 'PEER-REVIEWED CITATIONS',
      linkDirect: 'Open Canonical Article (DOI/arXiv)',
      items: [
        {
          id: 'ref-1',
          citationKey: '[1]',
          authors: 'Batygin, K. & Brown, M. E.',
          title: 'Evidence for a Distant Giant Planet in the Solar System',
          venue: 'The Astronomical Journal, Vol. 151, No. 2, p. 22',
          year: 2016,
          doi: '10.3847/0004-6256/151/2/22',
          arxivId: 'arXiv:1601.05438',
          url: 'https://doi.org/10.3847/0004-6256/151/2/22',
          relevance: 'Foundational paper demonstrating the perihelion clustering of Extreme Trans-Neptunian Objects, providing the mathematical rationale for Planet Nine.'
        },
        {
          id: 'ref-2',
          citationKey: '[2]',
          authors: 'Batygin, K., Adams, F. C., Brown, M. E., & Becker, J. C.',
          title: 'The Planet Nine Hypothesis',
          venue: 'Physics Reports, Vol. 805, pp. 1–53',
          year: 2019,
          doi: '10.1016/j.physrep.2019.01.009',
          arxivId: 'arXiv:1902.10103',
          url: 'https://doi.org/10.1016/j.physrep.2019.01.009',
          relevance: 'Comprehensive review establishing Planet Nine orbital constraints (400 – 800 AU), mass limits (5 – 10 M⊕), and thermal infrared signatures.'
        },
        {
          id: 'ref-3',
          citationKey: '[3]',
          authors: 'Doré, O., Werner, M. W., Ashby, M., et al. (SPHEREx Science Team)',
          title: 'Science Impacts of the SPHEREx All-Sky Optical to Near-Infrared Spectral Survey',
          venue: 'NASA JPL Technical Report & arXiv:1606.07039',
          year: 2016,
          arxivId: 'arXiv:1606.07039',
          url: 'https://arxiv.org/abs/1606.07039',
          relevance: 'SPHEREx mission definition document covering 102 continuous channels (0.75 – 5.0 µm), 6 Teledyne H2RG focal planes, and 6-month sky cadences.'
        },
        {
          id: 'ref-4',
          citationKey: '[4]',
          authors: 'NASA / IPAC Infrared Science Archive (Caltech)',
          title: 'SPHEREx Quick Release 2 (QR2) Level 2 Data Access Protocols & IVOA SIAv2',
          venue: 'Caltech / IPAC Documentation',
          year: 2024,
          url: 'https://irsa.ipac.caltech.edu/data/SPHEREx/',
          relevance: 'Data release standards and IVOA SIAv2 cutout query endpoints integrated in real time by the SPHEREx Explorer backend.'
        },
        {
          id: 'ref-5',
          citationKey: '[5]',
          authors: 'Lupton, R., Blanton, M. R., Fekete, G., Hogg, D. W., & Munn, J. A.',
          title: 'Preparing Red-Green-Blue Images from CCD Data',
          venue: 'Publications of the Astronomical Society of the Pacific (PASP), Vol. 116, pp. 133–137',
          year: 2004,
          doi: '10.1086/382245',
          arxivId: 'astro-ph/0312483',
          url: 'https://doi.org/10.1086/382245',
          relevance: 'Mathematical formulation of the non-linear Asinh stretch utilized in the workstation to balance dynamic range without saturation.'
        },
        {
          id: 'ref-6',
          citationKey: '[6]',
          authors: 'Cruikshank, D. P., Grundy, W. M., DeMeo, F. E., et al.',
          title: 'The Surface Compositions of Trans-Neptunian Objects and Centaurs',
          venue: 'The Trans-Neptunian Solar System, Elsevier, pp. 101–124',
          year: 2020,
          doi: '10.1016/B978-0-12-816490-7.00005-9',
          url: 'https://doi.org/10.1016/B978-0-12-816490-7.00005-9',
          relevance: 'Diagnostic spectral absorption laboratory references for H₂O ice (3.05 µm), methane (3.32 µm), and carbon dioxide (4.27 µm) on icy bodies.'
        },
        {
          id: 'ref-7',
          citationKey: '[7]',
          authors: 'The Astropy Collaboration (Price-Whelan, A. M. et al.)',
          title: 'The Astropy Project: Building an Open-science Python Package',
          venue: 'The Astronomical Journal, Vol. 156, No. 3, p. 123',
          year: 2018,
          doi: '10.3847/1538-3881/aabc4f',
          arxivId: 'arXiv:1801.02634',
          url: 'https://doi.org/10.3847/1538-3881/aabc4f',
          relevance: 'Core Python astrophysics package powering the backend FITS parser, WCS astrometric solver, and difference matrix engines.'
        }
      ]
    },
    cta: {
      backHome: '← Back to Home',
      guideBtn: 'Explore Operations Manual & Wiki',
      workstationBtn: 'Launch Observatory Workstation'
    }
  }
};
