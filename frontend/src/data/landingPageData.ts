export interface StatItem {
  value: string;
  label: string;
}

export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  iconName: 'Radio' | 'Layers' | 'Activity' | 'Target' | 'Eye' | 'Database';
  colorBg: string;
  iconColor: string;
}

export interface ShowcaseCard {
  id: string;
  imageSrc: string;
  alt: string;
  title: string;
  description: string;
  badge?: string;
}

export interface LandingPageContent {
  missionBadge: string;
  hero: {
    headlinePrefix: string;
    headlineHighlight: string;
    headlineSuffix: string;
    description: string;
    ctaLaunch: string;
    ctaOverview: string;
    ctaGuide: string;
  };
  stats: StatItem[];
  features: {
    badge: string;
    title: string;
    subtitle: string;
    cards: FeatureCard[];
  };
  showcase: {
    badge: string;
    title: string;
    cards: ShowcaseCard[];
  };
  ctaBanner: {
    badge: string;
    title: string;
    description: string;
    buttonText: string;
  };
  footer: {
    brandTitle: string;
    brandSubtitle: string;
    navHome: string;
    navOverview: string;
    navGuide: string;
    linkIrsa: string;
    linkSpaceApps: string;
    legalNote: string;
  };
}

export const landingPageData: Record<'vi' | 'en', LandingPageContent> = {
  vi: {
    missionBadge: 'CHALLENGE: HUNTING FOR PLANET NINE WITH SPHEREx',
    hero: {
      headlinePrefix: 'Săn Tìm ',
      headlineHighlight: 'Planet Nine',
      headlineSuffix: ' Cùng Trạm Siêu Phổ NASA SPHEREx',
      description: 'Trực quan hóa và xử lý tệp tin FITS 7-HDU Level 2 MEF nguyên bản từ NASA IRSA. Kết hợp kỹ thuật so sánh chớp Clyde Tombaugh, ma trận vi phân triệt tiêu sao nền và phân tích quang phổ SED 102 kênh phát hiện băng ngoại vi.',
      ctaLaunch: 'Khởi Chạy Trạm Làm Việc',
      ctaOverview: 'Giới Thiệu Dự Án',
      ctaGuide: 'Hướng Dẫn Sử Dụng'
    },
    stats: [
      { value: '100% REAL', label: 'Dữ liệu NASA IRSA QR2' },
      { value: '102 KÊNH', label: 'Hồng ngoại 0.75 – 5.00 µm' },
      { value: '6 THÁNG', label: 'Chu kỳ khảo sát bầu trời' },
      { value: 'J2000 WCS', label: 'Độ chính xác Sub-pixel' }
    ],
    features: {
      badge: 'GIẢI PHÁP KHOA HỌC ĐỘT PHÁ',
      title: '5 Công Cụ Chuyên Sâu Cho Nhà Khoa Học Công Dân',
      subtitle: 'Toàn bộ quy trình xử lý dữ liệu vi phân hồng ngoại được chuẩn hóa theo quy chuẩn nghiên cứu thiên văn học hiện đại.',
      cards: [
        {
          id: 'blink',
          title: 'Blink Comparator Kỹ Thuật Số',
          description: 'Tái hiện kỹ thuật phát hiện Sao Diêm Vương của Clyde Tombaugh với tần số chớp 0.5 – 5.0 Hz trên nền tảng Canvas HTML5 tăng tốc GPU.',
          iconName: 'Radio',
          colorBg: 'bg-spaceapps-neonblue',
          iconColor: 'text-white'
        },
        {
          id: 'difference',
          title: 'Ảnh Vi Phân Triệt Tiêu Sao Nền',
          description: 'Tự động trừ hai niên kỷ epoch (ΔI = E₂ − E₁) nhằm xóa nhòa các thiên thể tĩnh. Thanh trượt σ-threshold giúp lọc sạch nhiễu nền vũ trụ.',
          iconName: 'Layers',
          colorBg: 'bg-spaceapps-electricblue',
          iconColor: 'text-spaceapps-neonyellow'
        },
        {
          id: 'spectral',
          title: 'Trắc Phổ 102 Kênh SED Liên Tục',
          description: 'Khảo sát năng lượng bức xạ từ 0.75 đến 5.00 µm. Tích hợp 2D coordinate picker click trực tiếp trên ảnh FITS để trích xuất phổ hấp thụ băng.',
          iconName: 'Activity',
          colorBg: 'bg-emerald-600',
          iconColor: 'text-white'
        },
        {
          id: 'ledger',
          title: 'Sổ Bộ Ứng Viên & Báo Cáo',
          description: 'Gắn nhãn phân loại (Planet X, TNO, Tiểu hành tinh, Sao lùn nâu) và kết xuất tức thì sang định dạng CSV/JSON phục vụ thẩm định khoa học.',
          iconName: 'Target',
          colorBg: 'bg-spaceapps-nasared',
          iconColor: 'text-white'
        },
        {
          id: 'nightvision',
          title: 'Night-Vision Red Mode',
          description: 'Bảo vệ khả năng thích ứng tối của mắt khi quan sát thực địa tại các đài thiên văn. Bộ lọc đơn sắc đỏ chuẩn quang học đạt tương phản 12.03:1.',
          iconName: 'Eye',
          colorBg: 'bg-purple-700',
          iconColor: 'text-white'
        },
        {
          id: 'astropy',
          title: 'AstroPy Core Engine & IVOA SIAv2',
          description: 'Hạ tầng xử lý FITS chuẩn quốc tế kết hợp bộ đệm cục bộ LRU Cache 500MB, truyền dẫn dữ liệu thời gian thực từ các máy chủ NASA.',
          iconName: 'Database',
          colorBg: 'bg-spaceapps-nearblack',
          iconColor: 'text-spaceapps-neonyellow'
        }
      ]
    },
    showcase: {
      badge: 'TƯ LIỆU HÌNH ẢNH KHOA HỌC THỰC TẾ',
      title: 'Cơ Sở Vật Lý Thiên Văn & Sứ Mệnh SPHEREx',
      cards: [
        {
          id: 'hardware',
          imageSrc: '/assets/images/spherex_observatory_hardware.jpg',
          alt: 'Kính viễn vọng SPHEREx trong phòng thí nghiệm sạch',
          title: 'Phần Cứng Kính Viễn Vọng NASA SPHEREx',
          description: 'Ảnh chụp thực tế phần cứng đài quan sát SPHEREx trong phòng sạch thử nghiệm cùng 3 tầng tấm tản nhiệt nón (V-groove cone radiators) giúp làm lạnh thụ động xuống dưới 80 K.'
        },
        {
          id: 'orbit',
          imageSrc: '/assets/images/planet_nine_orbit.svg',
          alt: 'Mô hình toán học quỹ đạo Planet Nine Batygin Brown',
          title: 'Mô Hình Quỹ Đạo Planet Nine (Batygin & Brown, Caltech)',
          description: 'Sơ đồ toán học mô tả hiện tượng cụm góc bất thường của cận điểm quỹ đạo các thiên thể ngoài Hải Vương Tinh (Extreme TNOs) chứng minh sự tồn tại của Hành tinh Thứ Chín ở cự ly 400 - 800 AU.'
        }
      ]
    },
    ctaBanner: {
      badge: 'NASA SPACE APPS CHALLENGE 2026',
      title: 'Sẵn Sàng Phát Hiện Dị Thường Rìa Hệ Mặt Trời?',
      description: 'Hàng ngàn ô quét FITS của SPHEREx đang chờ bạn khảo sát. Mọi phát hiện của bạn đều được ghi nhận vào cơ sở dữ liệu mở của NASA.',
      buttonText: 'Khởi Chạy Trạm Làm Việc Ngay Bây Giờ'
    },
    footer: {
      brandTitle: 'SPHEREx Explorer Workstation',
      brandSubtitle: 'NASA International Space Apps Challenge 2026',
      navHome: 'Trang Chủ',
      navOverview: 'Giới Thiệu',
      navGuide: 'Hướng Dẫn',
      linkIrsa: 'NASA IRSA',
      linkSpaceApps: 'Space Apps Official',
      legalNote: 'Dự án tham gia cuộc thi NASA Space Apps Challenge 2026. Toàn bộ dữ liệu trắc quang FITS được cấp phép truy cập mở qua NASA IRSA & IPAC.'
    }
  },
  en: {
    missionBadge: 'CHALLENGE: HUNTING FOR PLANET NINE WITH SPHEREx',
    hero: {
      headlinePrefix: 'Hunt for ',
      headlineHighlight: 'Planet Nine',
      headlineSuffix: ' with NASA SPHEREx All-Sky Spectral Observatory',
      description: 'Visualize and process authentic 7-HDU Level 2 MEF FITS cubes directly from NASA IRSA. Combine Clyde Tombaugh blink comparator techniques, stellar difference subtraction, and 102-channel SED spectroscopy to identify volatile ice spectral absorption.',
      ctaLaunch: 'Launch Workstation',
      ctaOverview: 'Project Overview',
      ctaGuide: 'User Guide'
    },
    stats: [
      { value: '100% REAL', label: 'NASA IRSA QR2 Data' },
      { value: '102 BANDS', label: 'Infrared 0.75 – 5.00 µm' },
      { value: '6 MONTHS', label: 'All-Sky Survey Cadence' },
      { value: 'J2000 WCS', label: 'Sub-pixel WCS Astrometry' }
    ],
    features: {
      badge: 'BREAKTHROUGH SCIENTIFIC CAPABILITIES',
      title: '5 Specialized Tools for Citizen Astronomers',
      subtitle: 'A complete infrared differential processing pipeline conforming to modern astrophysical research standards.',
      cards: [
        {
          id: 'blink',
          title: 'Digital Blink Comparator',
          description: 'Recreate Clyde Tombaugh Pluto discovery technique at 0.5 – 5.0 Hz toggle rates powered by hardware-accelerated HTML5 Canvas.',
          iconName: 'Radio',
          colorBg: 'bg-spaceapps-neonblue',
          iconColor: 'text-white'
        },
        {
          id: 'difference',
          title: 'Stellar Residual Difference Imaging',
          description: 'Compute epoch difference (ΔI = E₂ − E₁) to cancel out static background stars. Dynamic σ-thresholding isolates moving candidate pixels.',
          iconName: 'Layers',
          colorBg: 'bg-spaceapps-electricblue',
          iconColor: 'text-spaceapps-neonyellow'
        },
        {
          id: 'spectral',
          title: '102-Channel SED Spectral Extraction',
          description: 'Continuous spectral coverage across 0.75 to 5.00 µm. Interactive 2D coordinate picker on FITS image reveals volatile ice absorption signatures.',
          iconName: 'Activity',
          colorBg: 'bg-emerald-600',
          iconColor: 'text-white'
        },
        {
          id: 'ledger',
          title: 'Astrometric Candidate Ledger & Export',
          description: 'Classify high-proper-motion targets (Planet X, TNO, Asteroid, Brown Dwarf) and export verified logs to CSV/JSON for scientific scrutiny.',
          iconName: 'Target',
          colorBg: 'bg-spaceapps-nasared',
          iconColor: 'text-white'
        },
        {
          id: 'nightvision',
          title: 'Night-Vision Red Mode',
          description: 'Preserve dark-adapted scotopic vision during live observatory night runs. Optical-grade monochromatic red filter passes 12.03:1 contrast ratio.',
          iconName: 'Eye',
          colorBg: 'bg-purple-700',
          iconColor: 'text-white'
        },
        {
          id: 'astropy',
          title: 'AstroPy Engine & IVOA SIAv2 Query',
          description: 'IVOA compliant FITS streaming architecture backed by a 500 MB LRU disk cache and low-latency pipeline to NASA server clusters.',
          iconName: 'Database',
          colorBg: 'bg-spaceapps-nearblack',
          iconColor: 'text-spaceapps-neonyellow'
        }
      ]
    },
    showcase: {
      badge: 'AUTHENTIC SCIENTIFIC ARCHIVE',
      title: 'Astrophysical Foundation & SPHEREx Mission Architecture',
      cards: [
        {
          id: 'hardware',
          imageSrc: '/assets/images/spherex_observatory_hardware.jpg',
          alt: 'SPHEREx space observatory in cleanroom acoustic test facility',
          title: 'NASA SPHEREx Flight Observatory Hardware',
          description: 'Photograph of the SPHEREx flight telescope undergoing cleanroom thermal vacuum integration, showing 3-stage passive V-groove cone radiators maintaining detectors < 80 K.'
        },
        {
          id: 'orbit',
          imageSrc: '/assets/images/planet_nine_orbit.svg',
          alt: 'Mathematical orbital clustering model by Batygin and Brown',
          title: 'Planet Nine Orbital Clustering Model (Batygin & Brown, Caltech)',
          description: 'Orbital geometry diagram depicting anomalous perihelion clustering of Extreme Trans-Neptunian Objects (ETNOs), constraining Planet Nine at 400 – 800 AU.'
        }
      ]
    },
    ctaBanner: {
      badge: 'NASA SPACE APPS CHALLENGE 2026',
      title: 'Ready to Uncover Outer Solar System Anomalies?',
      description: 'Thousands of SPHEREx FITS cutouts await your inspection. All citizen science detections are logged into open astrophysics ledgers.',
      buttonText: 'Launch Observatory Workstation Now'
    },
    footer: {
      brandTitle: 'SPHEREx Explorer Workstation',
      brandSubtitle: 'NASA International Space Apps Challenge 2026',
      navHome: 'Home',
      navOverview: 'Overview',
      navGuide: 'User Guide',
      linkIrsa: 'NASA IRSA',
      linkSpaceApps: 'Space Apps Official',
      legalNote: 'NASA International Space Apps Challenge 2026 entry. All FITS photometric cubes are open-access via NASA IRSA & IPAC.'
    }
  }
};
