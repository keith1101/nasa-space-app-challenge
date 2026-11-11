import { WikipediaTocData } from '../components/WikipediaToc';
import { ScientificCitation } from './projectOverviewData';

export interface ObservationModeGuide {
  id: string;
  step: string;
  title: string;
  meta: string;
  desc: string;
}

export interface ShortcutItem {
  key: string;
  desc: string;
}

export interface TroubleshootingRow {
  issue: string;
  cause: string;
  solution: string;
}

export interface EquationParam {
  symbol: string;
  name: string;
  meaning: string;
}

export interface ScientificEquationGuide {
  id: string;
  name: string;
  formula: string;
  plainSummary: string;
  nonExpertAnalogy: string;
  scientificContext: string;
  parameters: EquationParam[];
}

export interface GlossaryItem {
  id: string;
  term: string;
  category: 'astrometry' | 'mechanics' | 'spectroscopy';
  categoryLabel: string;
  simpleDefinition: string;
  inDepthExplanation: string;
  practicalTip?: string;
}

export interface WorkflowStep {
  step: string;
  title: string;
  action: string;
  tip: string;
}

export interface UserGuideContent {
  badge: string;
  title: string;
  subtitle: string;
  breadcrumbHome: string;
  breadcrumbCurrent: string;
  langToggleLabel: string;
  quickNav: {
    title: string;
    items: { id: string; label: string }[];
  };
  wikipediaToc: WikipediaTocData;
  workflowSection: {
    title: string;
    subtitle: string;
    badge: string;
    steps: WorkflowStep[];
  };
  modesSection: {
    title: string;
    subtitle: string;
    modes: ObservationModeGuide[];
  };
  equationsSection: {
    title: string;
    subtitle: string;
    badge: string;
    analogyTitle: string;
    scientificTitle: string;
    parametersTitle: string;
    items: ScientificEquationGuide[];
  };
  glossarySection: {
    title: string;
    subtitle: string;
    badge: string;
    filterAll: string;
    tipTitle: string;
    categories: { id: string; label: string }[];
    items: GlossaryItem[];
  };
  artifactAtlas: {
    title: string;
    real: {
      badge: string;
      items: string[];
    };
    fake: {
      badge: string;
      items: string[];
    };
  };
  shortcuts: {
    title: string;
    items: ShortcutItem[];
  };
  troubleshooting: {
    title: string;
    subtitle: string;
    headers: [string, string, string];
    rows: TroubleshootingRow[];
  };
  referencesSection: {
    title: string;
    subtitle: string;
    badge: string;
    items: ScientificCitation[];
  };
  cta: {
    backHome: string;
    overviewBtn: string;
    workstationBtn: string;
  };
}

export const userGuideData: Record<'vi' | 'en', UserGuideContent> = {
  vi: {
    badge: 'CẨM NANG VẬN HÀNH · WIKI KHOA HỌC DỰ ÁN',
    title: 'Cẩm Nang Vận Hành Trạm Quan Sát & Bách Khoa Toàn Thư Thiên Văn',
    subtitle: 'Hướng dẫn toàn diện cách phân tích ảnh FITS 7-HDU, 5 chế độ quan sát, giải thích dễ hiểu các phương trình toán - lý thiên văn, và từ điển thuật ngữ cho nhà khoa học công dân.',
    breadcrumbHome: 'Trang Chủ',
    breadcrumbCurrent: 'Hướng Dẫn Sử Dụng & Wiki',
    langToggleLabel: 'Ngôn ngữ',
    quickNav: {
      title: 'MỤC LỤC NHANH WIKI:',
      items: [
        { id: 'modes', label: '1. 5 Chế Độ Quan Sát' },
        { id: 'equations', label: '2. Phương Trình Khoa Học' },
        { id: 'glossary', label: '3. Bách Khoa Thuật Ngữ' },
        { id: 'workflow', label: '4. Quy Trình Săn Planet 9' },
        { id: 'pipeline', label: '5. Pipeline Dữ Liệu Tương Tác' },
        { id: 'artifacts', label: '6. Phân Biệt Thật vs Giả' },
        { id: 'troubleshooting', label: '7. Xử Lý Sự Cố & Phím Tắt' },
        { id: 'references', label: '8. Trích Dẫn Khoa Học' }
      ]
    },
    wikipediaToc: {
      title: 'Mục lục nội dung Wiki',
      hideLabel: 'ẩn',
      showLabel: 'hiện',
      items: [
        {
          id: 'modes',
          number: '1',
          label: '5 Chế Độ Quan Sát Thiên Văn Trực Quan',
          subItems: [
            { id: 'mode-blink', number: '1.1', label: 'So Sánh Chớp Clyde Tombaugh (Blink)' },
            { id: 'mode-side-by-side', number: '1.2', label: 'Đồng Bộ Niên Kỷ Song Song (Synchronized)' },
            { id: 'mode-difference', number: '1.3', label: 'Ảnh Vi Phân Triệt Tiêu Sao Nền (ΔI)' },
            { id: 'mode-spectral', number: '1.4', label: 'Hồ Sơ Quang Phổ 102 Kênh (SED)' },
            { id: 'mode-candidates', number: '1.5', label: 'Sổ Bộ & Báo Cáo Ứng Viên (Ledger)' }
          ]
        },
        {
          id: 'equations',
          number: '2',
          label: 'Giải Thích Các Phương Trình Khoa Học (Dành Cho Dân Không Chuyên)',
          subItems: [
            { id: 'eq-diff', number: '2.1', label: 'Phương Trình Trừ Ảnh Vi Phân (ΔI)' },
            { id: 'eq-sigma', number: '2.2', label: 'Ngưỡng Lọc Nhiễu Thống Kê (3.5σ)' },
            { id: 'eq-kepler', number: '2.3', label: 'Định Luật Kepler III & Chuyển Động Riêng' },
            { id: 'eq-asinh', number: '2.4', label: 'Hàm Co Giãn Phi Tuyến Asinh' },
            { id: 'eq-wcs', number: '2.5', label: 'Ma Trận Tọa Độ Thiên Cầu WCS' }
          ]
        },
        {
          id: 'glossary',
          number: '3',
          label: 'Bách Khoa Thuật Ngữ Thiên Văn',
          subItems: [
            { id: 'glossary-astrometry', number: '3.1', label: 'Định Dạng FITS & Trắc Tinh' },
            { id: 'glossary-mechanics', number: '3.2', label: 'Cơ Học Thiên Thể & Planet Nine' },
            { id: 'glossary-spectroscopy', number: '3.3', label: 'Quang Phổ 102 Kênh & Băng Ngoại Vi' }
          ]
        },
        {
          id: 'workflow',
          number: '4',
          label: 'Quy Trình 4 Bước Săn Tìm Planet Nine',
          subItems: [
            { id: 'step-1', number: '4.1', label: 'Bước 1: Chọn Vùng Trời & Kênh Bước Sóng' },
            { id: 'step-2', number: '4.2', label: 'Bước 2: So Sánh Chớp & Trừ Ảnh Vi Phân' },
            { id: 'step-3', number: '4.3', label: 'Bước 3: Trích Xuất Phổ SED 102 Kênh' },
            { id: 'step-4', number: '4.4', label: 'Bước 4: Kiểm Tra Tốc Độ Góc & Gắn Cờ Báo Cáo' }
          ]
        },
        {
          id: 'pipeline',
          number: '5',
          label: 'Quy Trình Khảo Sát & Xử Lý Dữ Liệu Tương Tác'
        },
        {
          id: 'artifacts',
          number: '6',
          label: 'Cẩm Nang Phân Biệt Thiên Thể Thật vs Nhiễu Giả',
          subItems: [
            { id: 'artifacts-real', number: '6.1', label: 'Đặc Điểm Thiên Thể Thật (High Confidence)' },
            { id: 'artifacts-fake', number: '6.2', label: 'Tia Vũ Trụ & Nhiễu Cảm Biến Cần Loại Trừ' }
          ]
        },
        {
          id: 'troubleshooting',
          number: '7',
          label: 'Xử Lý Sự Cố Thường Gặp & Phím Tắt',
          subItems: [
            { id: 'shortcuts', number: '7.1', label: 'Bảng Phím Tắt Điều Khiển Nhanh' },
            { id: 'faq', number: '7.2', label: 'Bảng Khắc Phục Lỗi Kỹ Thuật' }
          ]
        },
        {
          id: 'references',
          number: '8',
          label: 'Tài Liệu Tham Khảo & Trích Dẫn Khoa Học'
        }
      ]
    },
    workflowSection: {
      title: 'Quy Trình 4 Bước Săn Tìm Planet Nine Dành Cho Nhà Khoa Học Công Dân',
      subtitle: 'Quy chuẩn khảo sát khoa học thực nghiệm giúp bạn không bị choáng ngợp giữa hàng triệu ngôi sao.',
      badge: 'CHUẨN THỰC NGHIỆM',
      steps: [
        {
          step: 'BƯỚC 1',
          title: 'Chọn Vùng Trời & Kênh Bước Sóng Thích Hợp',
          action: 'Chọn các vùng Presets (Cygnus Field hoặc Planet X Search Field). Đặt bước sóng kênh 60 (~2.45 µm) hoặc kênh 80 (~3.50 µm) để giảm nhiễu sao nền quang học.',
          tip: 'Hành tinh xa xôi phát xạ chủ yếu ở dải hồng ngoại nhiệt, không nhìn thấy được bằng mắt thường.'
        },
        {
          step: 'BƯỚC 2',
          title: 'So Sánh Chớp (Blink) & Trừ Ảnh (Difference)',
          action: 'Bật chế độ Blink để mắt bắt chuyển động, sau đó chuyển sang Difference Imaging (ΔI). Kéo thanh trượt σ-threshold lên 3.5σ.',
          tip: 'Nếu thấy một cặp đốm âm/dương (lưỡng cực Dipole) xuất hiện rõ rệt, bạn đã tìm thấy một thiên thể chuyển động!'
        },
        {
          step: 'BƯỚC 3',
          title: 'Trích Xuất Quang Phổ SED 102 Kênh',
          action: 'Chuyển sang tab Spectral Profile, dùng con trỏ chuột click thẳng vào tâm đốm sáng trên ảnh FITS để hệ thống vẽ đồ thị năng lượng.',
          tip: 'Tìm kiếm hố lõm hấp thụ tại 3.05 µm (băng nước H₂O) hoặc 4.27 µm (băng CO₂). Đây là "chứng minh thư" của thiên thể băng giá rìa Hệ Mặt Trời.'
        },
        {
          step: 'BƯỚC 4',
          title: 'Kiểm Tra Tốc Độ Góc & Gắn Cờ Báo Cáo',
          action: 'Vào Candidate Ledger, đọc tốc độ dịch chuyển góc μ. Nếu μ trong khoảng 0.1 – 1.5 arcsec/năm, bấm "Flag selected" để gửi báo cáo phân loại.',
          tip: 'Tốc độ quá nhanh (> 10 arcsec/ngày) là tiểu hành tinh gần Trái Đất; tốc độ chậm ổn định mới là ứng viên ngoài Hải Vương Tinh.'
        }
      ]
    },
    modesSection: {
      title: '1. Chi Tiết 5 Chế Độ Quan Sát Thiên Văn Trực Quan',
      subtitle: 'Chuyển đổi linh hoạt giữa 5 chế độ trên thanh điều hướng của trạm làm việc để đa chiều hóa thông tin quan sát.',
      modes: [
        {
          id: 'blink',
          step: '01',
          title: 'So Sánh Chớp Clyde Tombaugh (Blink Comparator)',
          meta: 'Tần số: 0.5 – 5.0 Hz',
          desc: 'Luân chuyển liên tục giữa 2 bức ảnh chụp cách nhau 6 tháng (Epoch 1 & Epoch 2). Kỹ thuật này kích hoạt khả năng phát hiện chuyển động tự nhiên của võng mạc: các ngôi sao đứng yên xa xôi sẽ biến mất khỏi nhận thức thị giác, trong khi thiên thể chuyển động (Planet Nine, TNOs) sẽ "nhảy" qua lại giữa 2 vị trí.'
        },
        {
          id: 'side_by_side',
          step: '02',
          title: 'Đồng Bộ Niên Kỷ Song Song (Synchronized Epochs)',
          meta: 'Thu phóng: 1× – 16×',
          desc: 'Đặt hai khung hình Survey 1 và Survey 2 cạnh nhau. Toàn bộ thao tác cuộn chuột (Zoom), kéo rê (Pan) và di chuột đều được đồng bộ hóa toán học 1:1 theo tọa độ thiên văn thực tế, giúp so sánh hình thái chi tiết của mục tiêu.'
        },
        {
          id: 'difference',
          step: '03',
          title: 'Ảnh Vi Phân Triệt Tiêu Sao Nền (Difference Imaging ΔI)',
          meta: 'Ngưỡng: 2.0σ – 10.0σ',
          desc: 'Lấy bức ảnh thứ hai trừ đi bức ảnh thứ nhất (ΔI = E₂ − E₁). Ánh sáng của các ngôi sao cố định bị triệt tiêu về 0, để lộ ra cặp đốm đen - đốm sáng (lưỡng cực Dipole). Kéo thanh trượt σ-threshold để lọc sạch 99.9% nhiễu hạt nền của vũ trụ.'
        },
        {
          id: 'spectral',
          step: '04',
          title: 'Hồ Sơ Quang Phổ 102 Kênh SED (Spectral Profile)',
          meta: 'Bước sóng: 0.75 – 5.00 µm',
          desc: 'SPHEREx không chỉ là máy chụp ảnh mà là đài đo phổ toàn trời. Click chuột trực tiếp vào bất kỳ điểm nào trên ảnh để trích xuất 102 kênh năng lượng, đối chiếu với các vạch hấp thụ phân tử băng vũ trụ: H₂O (3.05 µm), CH₄ (3.32 µm) và CO₂ (4.27 µm).'
        },
        {
          id: 'candidates',
          step: '05',
          title: 'Sổ Bộ & Báo Cáo Ứng Viên (Candidate Discovery Ledger)',
          meta: 'Xuất CSV / JSON',
          desc: 'Bảng cơ sở dữ liệu thời gian thực ghi nhận các dị thường: Tọa độ xích đạo J2000, tốc độ dịch chuyển góc μ, tỷ lệ tín hiệu trên nhiễu (SNR) và độ lệch quang thông. Hỗ trợ nút xuất báo cáo và hộp thoại gắn cờ gửi về cơ sở dữ liệu mở của NASA.'
        }
      ]
    },
    equationsSection: {
      title: '2. Giải Thích Các Phương Trình Khoa Học (Dành Cho Dân Không Chuyên)',
      subtitle: 'Toán học và vật lý thiên văn ẩn sau ứng dụng được diễn giải bằng ngôn ngữ đời sống bình dị, không đòi hỏi kiến thức chuyên sâu.',
      badge: 'TOÁN HỌC TRỰC QUAN',
      analogyTitle: 'Dành Cho Người Không Chuyên (Ví Dụ Bình Dân):',
      scientificTitle: 'Ý Nghĩa Vật Lý Thiên Văn Chính Xác:',
      parametersTitle: 'Ký hiệu tham số:',
      items: [
        {
          id: 'eq-diff',
          name: 'Phương Trình Trừ Ảnh Vi Phân (ΔI = E₂ − E₁)',
          formula: '\\Delta I(x, y) = E_2(x, y) - E_1(x, y)',
          plainSummary: 'Trừ ảnh hai thời điểm để sao đứng yên biến mất, làm lộ thiên thể di chuyển.',
          nonExpertAnalogy: 'Tưởng tượng bạn chụp ảnh một quảng trường đông đúc lúc 8 giờ sáng và 8 giờ tối. Tòa nhà và tượng đài đứng yên ở cả 2 ảnh nên khi lấy Ảnh 2 trừ Ảnh 1, các khối nhà biến mất hoàn toàn (bằng 0). Chiếc xe ô tô đỗ ở vị trí A lúc sáng và chạy sang vị trí B lúc tối sẽ để lại một "khoảng trống màu đỏ" ở vị trí A và một "chiếc xe màu xanh" ở vị trí B. Cặp đốm này báo hiệu chiếc xe đã di chuyển!',
          scientificContext: 'Các ngôi sao cách chúng ta hàng trăm năm ánh sáng nên vị trí biểu kiến trên cảm biến gần như bất biến sau 6 tháng. Khi trừ hai mảng ảnh ma trận, thông lượng tĩnh bị triệt tiêu về mức kỳ vọng 0. Vật thể trong Hệ Mặt Trời di chuyển sẽ tạo ra một hố thông lượng âm (negative flux depression) tại Epoch 1 và đỉnh thông lượng dương (positive peak) tại Epoch 2, gọi là "Astrometric Dipole Signature".',
          parameters: [
            { symbol: 'ΔI(x, y)', name: 'Ma trận vi phân', meaning: 'Giá trị chênh lệch ánh sáng tại tọa độ pixel (x, y).' },
            { symbol: 'E₂(x, y)', name: 'Niên kỷ 2 (Epoch 2)', meaning: 'Thông lượng đo được trong lần quét bầu trời thứ 2 (sau 6 tháng).' },
            { symbol: 'E₁(x, y)', name: 'Niên kỷ 1 (Epoch 1)', meaning: 'Thông lượng đo được trong lần quét bầu trời ban đầu.' }
          ]
        },
        {
          id: 'eq-sigma',
          name: 'Ngưỡng Lọc Nhiễu Thống Kê (Significance Threshold 3.5σ)',
          formula: '\\text{Cutoff} = \\mu_{\\text{residual}} + k \\cdot \\sigma_{\\text{residual}} \\quad (k \\ge 3.5\\sigma)',
          plainSummary: 'Bộ lọc tiếng ồn vũ trụ giúp phân biệt hành tinh thật với hạt nhiễu cảm biến.',
          nonExpertAnalogy: 'Giống như bạn ngồi trong một quán cà phê ồn ào. Tiếng thì thầm nhỏ hay tiếng quạt gió là "nhiễu nền" (noise). Để biết chắc có ai đó đang gọi tên mình thật hay bạn chỉ nghe nhầm, tiếng gọi đó phải to gấp 3.5 lần mức ồn thông thường (3.5σ). Nếu đặt ngưỡng này, tỷ lệ nghe nhầm giảm xuống dưới 0.05%, bạn sẽ không tốn công quay đầu lại vì những tiếng động giả!',
          scientificContext: 'Cảm biến hồng ngoại vũ trụ luôn chịu ảnh hưởng của photon nền vũ trụ (Zodiacal background) và dòng tối cảm biến tuân theo phân phối Poisson/Gaussian. Đặt ngưỡng phát hiện tại k = 3.5σ tương ứng với mức tin cậy thống kê p < 0.00023, giúp loại bỏ hầu hết các dao động ngẫu nhiên và chỉ gắn cờ các nguồn sáng thực sự có ý nghĩa vật lý.',
          parameters: [
            { symbol: 'μ_residual', name: 'Giá trị trung bình dư', meaning: 'Mức thông lượng nền trung bình của ảnh sau khi trừ sao tĩnh.' },
            { symbol: 'σ_residual', name: 'Độ lệch chuẩn nền', meaning: 'Biên độ dao động của nhiễu hạt nền vũ trụ và cảm biến.' },
            { symbol: 'k (hệ số sigma)', name: 'Ngưỡng ý nghĩa', meaning: 'Thường chọn từ 3.0 đến 5.0 để đảm bảo độ tin cậy trắc quang.' }
          ]
        },
        {
          id: 'eq-kepler',
          name: 'Định Luật Kepler III & Chuyển Động Riêng (Proper Motion)',
          formula: 'v_{\\text{orb}} = \\sqrt{\\frac{G \\cdot M_\\odot}{r}} \\implies \\mu \\approx \\frac{v_{\\text{trans}}}{r} \\propto r^{-3/2}',
          plainSummary: 'Hành tinh càng ở xa Mặt Trời thì di chuyển trên bầu trời càng chậm chạp.',
          nonExpertAnalogy: 'Hãy nhìn máy bay bay trên bầu trời so với một chú chim sẻ bay ngang qua cửa sổ. Chú chim dù bay chậm hơn nhưng vì ở sát bạn nên vụt qua chỉ trong 1 giây. Máy bay bay cực nhanh nhưng vì ở tít trên cao nên bạn thấy nó dường như đứng im, trôi rất chậm. Planet Nine ở khoảng cách không tưởng (400 – 800 lần khoảng cách Trái Đất đến Mặt Trời), nên nhìn từ Trái Đất nó chỉ nhích từng chút một mỗi năm!',
          scientificContext: 'Theo Định luật Kepler III, vận tốc quỹ đạo tỷ lệ nghịch với căn bậc hai khoảng cách v_orb ∝ r^(−1/2). Tốc độ dịch chuyển góc biểu kiến trên vòm trời μ = v_trans / r do đó tỷ lệ nghịch với r^(3/2). Một tiểu hành tinh gần Trái Đất có thể di chuyển hàng chục arcsec/giờ, trong khi Planet Nine ở cự ly 400 – 800 AU chỉ di chuyển khoảng 0.1 – 1.5 arcsec/năm. Đây là bộ lọc vàng để loại trừ tiểu hành tinh.',
          parameters: [
            { symbol: 'v_orb', name: 'Vận tốc quỹ đạo', meaning: 'Vận tốc thực tế của thiên thể quay quanh Mặt Trời (km/s).' },
            { symbol: 'r', name: 'Khoảng cách nhật tâm', meaning: 'Cự ly từ Mặt Trời đến thiên thể (tính bằng AU - Đơn vị thiên văn).' },
            { symbol: 'μ (mu)', name: 'Chuyển động riêng', meaning: 'Tốc độ dịch chuyển vị trí biểu kiến trên vòm trời (arcsec/năm).' },
            { symbol: 'M_☉', name: 'Khối lượng Mặt Trời', meaning: 'Hằng số hấp dẫn chuẩn của Hệ Mặt Trời (~1.989 × 10³⁰ kg).' }
          ]
        },
        {
          id: 'eq-asinh',
          name: 'Hàm Co Giãn Độ Sáng Phi Tuyến Asinh (Lupton Stretch)',
          formula: 'I_{\\text{display}} = \\frac{\\operatorname{asinh}(I / \\beta)}{\\operatorname{asinh}(I_{\\max} / \\beta)}',
          plainSummary: '"Kính râm thông minh" kéo sáng thiên thể cực tối mà không làm cháy trắng các ngôi sao rực rỡ.',
          nonExpertAnalogy: 'Nếu bạn chụp ảnh một người đứng trước bóng đèn pha ô tô chói lóa, bức ảnh sẽ chỉ thấy một đốm trắng xóa còn khuôn mặt người đó đen sì. Hàm Asinh giống như công nghệ HDR thông minh: nó tự động hạ bớt ánh sáng chói chang của đèn pha xuống, đồng thời kích sáng các chi tiết mờ tối trên khuôn mặt, giúp bạn nhìn rõ cả hai cùng một lúc trên một màn hình.',
          scientificContext: 'Ảnh thiên văn FITS có dải sáng động khổng lồ (Dynamic Range > 10⁶), từ các photon cực yếu của rìa vũ trụ đến những ngôi sao sáng rực. Hàm tuyến tính (Linear) sẽ làm cháy sao hoặc dìm tối vật thể mờ. Hàm Asinh của giáo sư Lupton (SDSS) hoạt động như hàm tuyến tính ở vùng ánh sáng yếu (I ≪ β) để bảo toàn tỷ số tín hiệu, và chuyển mượt sang hàm logarit ở vùng ánh sáng mạnh (I ≫ β) để nén vùng sáng.',
          parameters: [
            { symbol: 'I_display', name: 'Độ sáng hiển thị', meaning: 'Giá trị pixel chuẩn hóa đưa lên màn hình máy tính (0.0 đến 1.0).' },
            { symbol: 'I', name: 'Cường độ thông lượng gốc', meaning: 'Thông lượng bức xạ thực tế ghi nhận trong tệp FITS (MJy/sr).' },
            { symbol: 'β (beta)', name: 'Hệ số làm mềm nền', meaning: 'Ngưỡng thông lượng phân cách giữa vùng xấp xỉ tuyến tính và vùng logarit.' }
          ]
        },
        {
          id: 'eq-wcs',
          name: 'Ma Trận Hệ Tọa Độ Thiên Cầu WCS (World Coordinate System)',
          formula: '\\begin{pmatrix} \\alpha \\\\ \\delta \\end{pmatrix} = \\begin{pmatrix} \\text{CRVAL}_1 \\\\ \\text{CRVAL}_2 \\end{pmatrix} + \\mathbf{CD} \\begin{pmatrix} x - \\text{CRPIX}_1 \\\\ y - \\text{CRPIX}_2 \\end{pmatrix}',
          plainSummary: 'Bản đồ định vị GPS vũ trụ: Biến tọa độ pixel trên màn hình thành tọa độ thật trên bầu trời.',
          nonExpertAnalogy: 'Giống hệt như khi bạn mở ứng dụng Google Maps trên điện thoại: bạn chạm ngón tay vào một điểm pixel bất kỳ trên màn hình kính, phần mềm sẽ dùng công thức toán học để tính ra ngay vị trí đó tương ứng với bao nhiêu độ vĩ Bắc và bao nhiêu độ kinh Đông trên mặt đất.',
          scientificContext: 'Cảm biến SPHEREx ghi nhận hình ảnh dưới dạng lưới pixel 2D (x, y). Để biết chính xác vị trí thiên thể trên vòm cầu thiên văn J2000, chuẩn FITS WCS sử dụng ma trận xoay và tỷ lệ CD kết hợp tọa độ tham chiếu CRVAL và pixel mốc CRPIX theo phép chiếu tiếp tuyến (TAN projection) với độ sai số dưới 0.1 pixel.',
          parameters: [
            { symbol: '(α, δ)', name: 'Tọa độ Xích kinh / Xích vĩ', meaning: 'Góc thiên văn thực tế trên bầu trời tính bằng độ thập phân (J2000).' },
            { symbol: '(x, y)', name: 'Tọa độ pixel', meaning: 'Vị trí điểm ảnh trên lưới cảm biến mảng FITS.' },
            { symbol: 'CD (Matrix)', name: 'Ma trận tỷ lệ & góc xoay', meaning: 'Chuyển đổi kích thước pixel sang đơn vị độ trên vòm trời (deg/pix).' },
            { symbol: '(CRVAL, CRPIX)', name: 'Điểm mốc quy chiếu', meaning: 'Tọa độ thiên văn và tọa độ pixel tại tâm quang học của kính viễn vọng.' }
          ]
        }
      ]
    },
    glossarySection: {
      title: '3. Bách Khoa Toàn Thư Thuật Ngữ Thiên Văn',
      subtitle: 'Tra cứu nhanh định nghĩa, bản chất và mẹo quan sát thực tế của các thuật ngữ chuyên ngành.',
      badge: 'BÁCH KHOA TOÀN THƯ',
      filterAll: 'Tất Cả Thuật Ngữ',
      tipTitle: 'Mẹo quan sát:',
      categories: [
        { id: 'all', label: 'Tất Cả' },
        { id: 'astrometry', label: 'Định Dạng & Trắc Tinh' },
        { id: 'mechanics', label: 'Cơ Học & Planet Nine' },
        { id: 'spectroscopy', label: 'Quang Phổ & Băng Vũ Trụ' }
      ],
      items: [
        {
          id: 'fits-7hdu',
          term: 'FITS 7-HDU Level 2 MEF',
          category: 'astrometry',
          categoryLabel: 'Định Dạng & Trắc Tinh',
          simpleDefinition: 'Định dạng tệp dữ liệu khoa học tiêu chuẩn của NASA, chứa cả ảnh số thực nghiệm và siêu dữ liệu thiên văn học.',
          inDepthExplanation: 'FITS (Flexible Image Transport System) là định dạng số 1 của thiên văn học quốc tế. Multi-Extension FITS (MEF) chứa 7 khối dữ liệu (HDU) riêng biệt: HDU 0 lưu thông tin kính và thời gian; HDU 1 lưu ma trận ảnh thông lượng; HDU 2 lưu bản đồ phương sai sai số; HDU 3 lưu mặt nạ cờ chất lượng; HDU 4-6 lưu hệ số WCS và trắc phổ. Dữ liệu Level 2 là dữ liệu đã được làm sạch và hiệu chuẩn đầy đủ bởi NASA IRSA.',
          practicalTip: 'Không bao giờ chuyển FITS sang JPG khi nghiên cứu khoa học, vì JPG sẽ làm tròn mất 99% thông tin trắc quang tinh tế.'
        },
        {
          id: 'wcs-j2000',
          term: 'WCS J2000 (World Coordinate System)',
          category: 'astrometry',
          categoryLabel: 'Định Dạng & Trắc Tinh',
          simpleDefinition: 'Hệ tọa độ kinh độ - vĩ độ trên vòm trời vũ trụ lấy mốc thời gian chuẩn lúc 12:00 trưa ngày 01/01/2000.',
          inDepthExplanation: 'Do trục Trái Đất tự đảo lắc (tiến động - precession) theo chu kỳ 26.000 năm, bầu trời luôn trôi nhẹ theo thời gian. J2000 là kỷ nguyên mốc cố định được toàn bộ các cơ quan hàng không vũ trụ (NASA, ESA, JAXA) thống nhất. Xích kinh (Right Ascension - α) tương đương kinh độ (0° đến 360°), Xích vĩ (Declination - δ) tương đương vĩ độ (-90° đến +90°).',
          practicalTip: 'Khi rê chuột trên ảnh FITS trong ứng dụng, thanh HUD bên dưới sẽ đọc trực tiếp tọa độ J2000 này.'
        },
        {
          id: 'dipole-signature',
          term: 'Astrometric Dipole (Lưỡng Cực Trắc Tinh)',
          category: 'astrometry',
          categoryLabel: 'Định Dạng & Trắc Tinh',
          simpleDefinition: 'Cặp dấu vết gồm một điểm tối và một điểm sáng nằm sát nhau, xuất hiện khi trừ ảnh hai thời điểm.',
          inDepthExplanation: 'Khi lấy ảnh Epoch 2 trừ Epoch 1, vị trí mà vật thể rời đi sẽ thiếu sáng so với nền, tạo ra một giá trị âm (hiển thị màu đỏ cam). Vị trí mới mà vật thể vừa xuất hiện sẽ thừa sáng so với nền, tạo ra giá trị dương (hiển thị màu lam/cyan). Khoảng cách giữa 2 cực này cho biết quãng đường vật thể đã di chuyển sau 6 tháng.',
          practicalTip: 'Đường nối từ đốm đỏ sang đốm xanh chính là véc-tơ chỉ hướng bay thực tế của thiên thể!'
        },
        {
          id: 'planet-nine',
          term: 'Planet Nine (Hành Tinh Thứ Chín)',
          category: 'mechanics',
          categoryLabel: 'Cơ Học & Planet Nine',
          simpleDefinition: 'Hành tinh khổng lồ giả thuyết nằm ở rìa ngoài cùng Hệ Mặt Trời, nặng gấp 5 – 10 lần Trái Đất.',
          inDepthExplanation: 'Năm 2016, hai nhà vật lý thiên văn Konstantin Batygin và Mike Brown (Viện Công nghệ California - Caltech) phát hiện quỹ đạo của các thiên thể ngoài Hải Vương Tinh (ETNOs) kỳ lạ thay đều bị nghiêng cùng một hướng và cụm lại một phía trong không gian. Xác suất điều này xảy ra ngẫu nhiên chỉ là 0.007%. Lực hấp dẫn của một hành tinh lớn chưa từng được nhìn thấy ở cự ly 400 – 800 AU là lời giải thích duy nhất hợp lý.',
          practicalTip: 'Planet Nine phản xạ ánh sáng Mặt Trời cực kỳ yếu, nhưng vẫn phát ra bức xạ nhiệt hồng ngoại yếu (~35 - 45 K), nằm đúng dải cảm nhận của SPHEREx.'
        },
        {
          id: 'tno-etno',
          term: 'TNO & ETNO (Thiên Thể Ngoài Hải Vương Tinh)',
          category: 'mechanics',
          categoryLabel: 'Cơ Học & Planet Nine',
          simpleDefinition: 'Bất kỳ hành tinh lùn, sao chổi hay khối băng đá nào có quỹ đạo quay nằm ngoài quỹ đạo của sao Hải Vương (> 30 AU).',
          inDepthExplanation: 'Khu vực này bao gồm Vành đai Kuiper (Kuiper Belt) và Đĩa phân tán (Scattered Disc). Extreme TNOs (ETNOs) là những thiên thể có bán trục lớn quỹ đạo a > 150 AU và khoảng cách cận điểm q > 30 AU. Các thiên thể này giữ vai trò như "kim chỉ nam trọng lực", giúp các nhà khoa học khoanh vùng vị trí ẩn nấp của Planet Nine.',
          practicalTip: 'Sao Diêm Vương (Pluto) và Eris chính là 2 thiên thể TNO nổi tiếng nhất.'
        },
        {
          id: 'au-astronomical-unit',
          term: 'AU (Astronomical Unit - Đơn Vị Thiên Văn)',
          category: 'mechanics',
          categoryLabel: 'Cơ Học & Planet Nine',
          simpleDefinition: 'Khoảng cách trung bình từ Trái Đất đến Mặt Trời, xấp xỉ 149.6 triệu kilômét.',
          inDepthExplanation: 'Được dùng làm thước đo chuẩn trong Hệ Mặt Trời. Sao Thủy cách Mặt Trời 0.4 AU; Trái Đất 1.0 AU; Sao Mộc 5.2 AU; Sao Hải Vương 30.1 AU; Vành đai Kuiper từ 30 – 50 AU. Trong khi đó, Planet Nine ước tính ở khoảng cách từ 400 đến 800 AU — tức là gấp 13 đến 26 lần khoảng cách đến sao Hải Vương!',
          practicalTip: 'Ánh sáng Mặt Trời mất 8 phút 20 giây để đến Trái Đất, nhưng mất hơn 4 ngày để bay tới Planet Nine ở cự ly 700 AU.'
        },
        {
          id: 'sed-spectrum',
          term: 'SED (Spectral Energy Distribution)',
          category: 'spectroscopy',
          categoryLabel: 'Quang Phổ & Băng Vũ Trụ',
          simpleDefinition: 'Đồ thị miêu tả năng lượng ánh sáng của thiên thể tỏa ra theo từng bước sóng khác nhau.',
          inDepthExplanation: 'Giống như dấu vân tay quang học, mỗi loại vật chất phát xạ và hấp thụ ánh sáng ở những bước sóng riêng biệt. Kính viễn vọng SPHEREx đo đạc đồng thời 102 kênh bước sóng từ 0.75 µm đến 5.00 µm, giúp phân biệt rõ ràng giữa một ngôi sao nguội, một thiên hà xa xôi hay một thiên thể phủ băng trong Hệ Mặt Trời.',
          practicalTip: 'Click vào một điểm sáng trên màn hình ở Tab 04, đồ thị SED sẽ tự động hiển thị.'
        },
        {
          id: 'volatile-ices',
          term: 'Băng Ngoại Vi (Volatile Ices: H₂O, CH₄, CO₂)',
          category: 'spectroscopy',
          categoryLabel: 'Quang Phổ & Băng Vũ Trụ',
          simpleDefinition: 'Lớp băng đông lạnh của nước, khí mê-tan và khí carbonic bao phủ bề mặt các vật thể ở rìa Hệ Mặt Trời.',
          inDepthExplanation: 'Ở nhiệt độ dưới -230°C ở khoảng cách hàng trăm AU, các loại khí quen thuộc trên Trái Đất đều đóng băng thành thể rắn. Băng nước (H₂O ice) tạo ra vạch hấp thụ cực sâu ở 3.05 µm; Băng mê-tan (CH₄) hấp thụ tại 3.32 µm; Băng carbonic (CO₂) hấp thụ tại 4.27 µm. Nếu một dị thường chuyển động có vạch hấp thụ này, nó chắc chắn là một thiên thể thuộc Hệ Mặt Trời!',
          practicalTip: 'Ứng dụng tự động kẻ sẵn 3 vạch màu vàng đánh dấu vị trí 3.05, 3.32 và 4.27 µm trên đồ thị để bạn dễ dàng so khớp.'
        },
        {
          id: 'asinh-stretch',
          term: 'Asinh Stretch (Hàm Co Giãn Nghịch Đảo Sin Hyperbolic)',
          category: 'spectroscopy',
          categoryLabel: 'Quang Phổ & Băng Vũ Trụ',
          simpleDefinition: 'Công thức toán học dùng để hiển thị ảnh vũ trụ có cả chi tiết cực tối lẫn nguồn sáng cực mạnh.',
          inDepthExplanation: 'Được phát triển bởi nhà thiên văn học Robert Lupton (SDSS). Không làm bão hòa (cháy trắng) các ngôi sao sáng như hàm Logarit, đồng thời không làm đen sì các đám mây bụi mờ như hàm Tuyến tính (Linear). Đây là hàm co giãn mặc định và tối ưu nhất của trạm làm việc SPHEREx Explorer.',
          practicalTip: 'Nếu thấy ảnh FITS tối thui, hãy kiểm tra xem menu Stretch đã chọn "Asinh" chưa!'
        }
      ]
    },
    artifactAtlas: {
      title: '5. Cẩm Nang Phân Biệt Thiên Thể Thật vs Nhiễu Giả',
      real: {
        badge: 'ỨNG VIÊN PLANET NINE / TNO THẬT (TÍN HIỆU ĐÁNG TIN)',
        items: [
          'Xuất hiện cặp lưỡng cực âm/dương (Dipole) rõ rệt và đối xứng trên ảnh vi phân ΔI.',
          'Dịch chuyển góc nhất quán dọc theo mặt phẳng hoàng đạo (Ecliptic) với tốc độ 0.1 – 1.5 arcsec/năm.',
          'Đốm sáng trải rộng qua 2-3 pixel theo hàm tán xạ điểm (PSF - Point Spread Function) của kính.',
          'Phổ SED 102 kênh thể hiện độ sâu hấp thụ phân tử băng nước (3.05 µm) hoặc CO₂ (4.27 µm).'
        ]
      },
      fake: {
        badge: 'TIA VŨ TRỤ & NHIỄU CẢM BIẾN (LOẠI TRỪ)',
        items: [
          'Đốm cực sáng chỉ chiếm đúng 1 pixel duy nhất (Cosmic Ray Hit), sắc cạnh và không có PSF.',
          'Chỉ xuất hiện ở 1 epoch duy nhất, không tạo ra cặp lưỡng cực âm/dương khi trừ ảnh.',
          'Vệt sáng dài sắc nhọn hoặc gai nhiễu xạ (Diffraction Spikes) xuất phát từ các ngôi sao quá sáng gần đó.',
          'Phổ SED nhảy vọt ngẫu nhiên dị thường chỉ ở 1 bước sóng mà không có đường cong vật lý thiên văn.'
        ]
      }
    },
    shortcuts: {
      title: 'Bảng Phím Tắt Điều Khiển Nhanh',
      items: [
        { key: 'Space', desc: 'Tạm dừng / Bật chớp' },
        { key: '1 – 5', desc: 'Đổi chế độ quan sát' },
        { key: '+ / -', desc: 'Chuyển kênh bước sóng' },
        { key: 'Esc', desc: 'Đóng các cửa sổ modal' }
      ]
    },
    troubleshooting: {
      title: '6. Xử Lý Sự Cố Thường Gặp & Phím Tắt',
      subtitle: 'Các bước xử lý nhanh khi gặp sự cố về luồng dữ liệu hoặc hình ảnh quan sát.',
      headers: ['Tình huống', 'Nguyên nhân', 'Hướng khắc phục'],
      rows: [
        {
          issue: 'Huy hiệu hiển thị OFFLINE CACHE',
          cause: 'Kết nối mạng đến NASA IRSA IPAC bị timeout hoặc IP bị giới hạn.',
          solution: 'Hệ thống tự động nạp FITS MEF 7-HDU thật đã lưu trong bộ đệm cục bộ backend. Ứng dụng vẫn hoạt động 100% với dữ liệu chuẩn.'
        },
        {
          issue: 'Ảnh bị tối hoặc cháy sáng quá mức',
          cause: 'Dải thông lượng quang học quá rộng so với thang màu mặc định.',
          solution: 'Chuyển đổi hàm co giãn độ sáng (Stretch) sang asinh hoặc log trên thanh công cụ để cân bằng dải sáng động.'
        },
        {
          issue: 'Không tải được ảnh khi nhập tọa độ mới',
          cause: 'Tọa độ nằm ngoài vùng trời khảo sát đợt đầu QR2 của SPHEREx.',
          solution: 'Chọn các vùng trời có sẵn trong danh sách Presets (như Cygnus Deep Field RA=304.6935°, Dec=42.4437°) đã có dữ liệu Level 2.'
        },
        {
          issue: 'Frontend báo lỗi Network Error',
          cause: 'Dịch vụ Backend FastAPI chưa được kích hoạt trên cổng 8000.',
          solution: 'Kiểm tra terminal backend hoặc chạy script .\\run_dev.ps1 để khởi chạy đầy đủ cả 2 dịch vụ.'
        }
      ]
    },
    referencesSection: {
      title: '8. Tài Liệu Tham Khảo & Trích Dẫn Khoa Học',
      subtitle: 'Các công trình nghiên cứu phản biện đồng cấp (Peer-Reviewed) làm nền tảng toán học, trắc quang và cơ học thiên thể cho trạm quan sát.',
      badge: 'TRÍCH DẪN ĐỒNG CẤP',
      items: [
        {
          id: 'ref-batygin-2016',
          citationKey: '[1]',
          authors: 'Batygin, K., & Brown, M. E.',
          title: 'Evidence for a Distant Giant Planet in the Solar System',
          venue: 'The Astronomical Journal, 151(2), 22',
          year: 2016,
          doi: '10.3847/0004-6256/151/2/22',
          arxivId: '1601.05438',
          url: 'https://doi.org/10.3847/0004-6256/151/2/22',
          relevance: 'Bài báo khởi nguyên chứng minh bằng mô phỏng số về sự tập trung dị thường trong quỹ đạo của các thiên thể ngoài Hải Vương Tinh (ETNOs), dự đoán sự tồn tại của Planet Nine.'
        },
        {
          id: 'ref-batygin-2019',
          citationKey: '[2]',
          authors: 'Batygin, K., Adams, F. C., Brown, M. E., & Becker, J. C.',
          title: 'The Planet Nine Hypothesis',
          venue: 'Physics Reports, 805, 1-53',
          year: 2019,
          doi: '10.1016/j.physrep.2019.01.009',
          arxivId: '1902.10103',
          url: 'https://doi.org/10.1016/j.physrep.2019.01.009',
          relevance: 'Chuyên khảo toàn diện cập nhật khối lượng (5 - 10 M⊕), bán trục lớn (400 - 800 AU) và độ sáng nhiệt hồng ngoại dự kiến (~35-45 K).'
        },
        {
          id: 'ref-lupton-2004',
          citationKey: '[3]',
          authors: 'Lupton, R., Blanton, M. R., Fekete, G., Hogg, D. W., et al.',
          title: 'Preparing Red-Green-Blue Images from Sloan Digital Sky Survey Data',
          venue: 'Publications of the Astronomical Society of the Pacific, 116(816), 133-137',
          year: 2004,
          doi: '10.1086/382245',
          arxivId: 'astro-ph/0312483',
          url: 'https://doi.org/10.1086/382245',
          relevance: 'Nền tảng của thuật toán hàm co giãn phi tuyến Asinh (Lupton stretch) được sử dụng để hiển thị ảnh FITS trong SPHEREx Explorer.'
        },
        {
          id: 'ref-calabretta-2002',
          citationKey: '[4]',
          authors: 'Calabretta, M. R., & Greisen, E. W.',
          title: 'Representations of celestial coordinates in FITS',
          venue: 'Astronomy & Astrophysics, 395(3), 1077-1122',
          year: 2002,
          doi: '10.1051/0004-6361:20021327',
          arxivId: 'astro-ph/0207413',
          url: 'https://doi.org/10.1051/0004-6361:20021327',
          relevance: 'Quy chuẩn tiêu chuẩn quốc tế FITS WCS cho phép chuyển đổi ma trận tọa độ pixel (x, y) sang hệ tọa độ thiên cầu xích đạo J2000 (α, δ).'
        },
        {
          id: 'ref-dore-2016',
          citationKey: '[5]',
          authors: 'Doré, O., Werner, M. W., Ashby, M. L. N., et al.',
          title: 'Science Extracts from the SPHEREx All-Sky Spectral Survey',
          venue: 'NASA JPL / Caltech White Paper',
          year: 2016,
          arxivId: '1606.07039',
          url: 'https://arxiv.org/abs/1606.07039',
          relevance: 'Đặc tả sứ mệnh kính viễn vọng SPHEREx: 102 dải bước sóng 0.75 - 5.0 µm phục vụ phát hiện băng sinh học và đo dịch chuyển thiên thể.'
        },
        {
          id: 'ref-cruikshank-2020',
          citationKey: '[6]',
          authors: 'Cruikshank, D. P., Grundy, W. M., DeMeo, F. E., et al.',
          title: 'The surface compositions of Kuiper Belt Objects and Centaurs',
          venue: 'The Trans-Neptunian Solar System, Elsevier, 245-274',
          year: 2020,
          doi: '10.1016/B978-0-12-816490-7.00011-8',
          url: 'https://doi.org/10.1016/B978-0-12-816490-7.00011-8',
          relevance: 'Dữ liệu quang phổ chuẩn về vạch hấp thụ của băng nước H2O (3.05 µm), băng mê-tan CH4 (3.32 µm) và băng CO2 (4.27 µm) trên các thiên thể TNO.'
        },
        {
          id: 'ref-tombaugh-1946',
          citationKey: '[7]',
          authors: 'Tombaugh, C. W.',
          title: 'The Search for the Ninth Planet, Pluto',
          venue: 'Astronomical Society of the Pacific Leaflets, 5(209), 73-80',
          year: 1946,
          url: 'https://ui.adsabs.harvard.edu/abs/1946ASPL....5...73T/abstract',
          relevance: 'Kỹ thuật so sánh chớp (Blink Comparator) được nhà thiên văn học Clyde Tombaugh phát minh để tìm ra Sao Diêm Vương năm 1930, nay được số hóa trong trạm quan sát.'
        }
      ]
    },
    cta: {
      backHome: '← Quay lại Trang Chủ',
      overviewBtn: 'Xem Giới Thiệu Dự Án Khoa Học',
      workstationBtn: 'Khởi Chạy Trạm Làm Việc'
    }
  },
  en: {
    badge: 'ASTRONOMER FIELD MANUAL · PROJECT SCIENTIFIC WIKI',
    title: 'SPHEREx Explorer Operations Manual & Astrophysics Wiki',
    subtitle: 'Comprehensive guide to inspecting 7-HDU Level 2 FITS, mastering 5 observation modes, plain-language explanations of astrophysical equations, and a citizen science glossary.',
    breadcrumbHome: 'Home',
    breadcrumbCurrent: 'User Guide & Wiki',
    langToggleLabel: 'Language',
    quickNav: {
      title: 'QUICK WIKI JUMP:',
      items: [
        { id: 'modes', label: '1. 5 Observation Modes' },
        { id: 'equations', label: '2. Plain Equations Explained' },
        { id: 'glossary', label: '3. Astrophysics Wiki Glossary' },
        { id: 'workflow', label: '4. 4-Step Planet Nine Hunting' },
        { id: 'pipeline', label: '5. Interactive Pipeline' },
        { id: 'artifacts', label: '6. Artifact Atlas' },
        { id: 'troubleshooting', label: '7. Troubleshooting & Shortcuts' },
        { id: 'references', label: '8. Scientific Citations' }
      ]
    },
    wikipediaToc: {
      title: 'Wiki Contents',
      hideLabel: 'hide',
      showLabel: 'show',
      items: [
        {
          id: 'modes',
          number: '1',
          label: 'Five Core Astronomical Observation Modes',
          subItems: [
            { id: 'mode-blink', number: '1.1', label: 'Blink Comparator (Clyde Tombaugh Technique)' },
            { id: 'mode-side-by-side', number: '1.2', label: 'Synchronized Epochs (Dual-Survey Comparison)' },
            { id: 'mode-difference', number: '1.3', label: 'Difference Imaging (Residual Matrix ΔI)' },
            { id: 'mode-spectral', number: '1.4', label: 'Spectral Profile (102-Channel SED)' },
            { id: 'mode-candidates', number: '1.5', label: 'Candidate Discovery Ledger' }
          ]
        },
        {
          id: 'equations',
          number: '2',
          label: 'Scientific Equations Explained in Plain Language',
          subItems: [
            { id: 'eq-diff', number: '2.1', label: 'Epoch Difference Imaging Equation' },
            { id: 'eq-sigma', number: '2.2', label: 'Statistical Significance Threshold' },
            { id: 'eq-kepler', number: '2.3', label: 'Kepler\'s Third Law & Proper Motion' },
            { id: 'eq-asinh', number: '2.4', label: 'Lupton Non-Linear Asinh Stretch' },
            { id: 'eq-wcs', number: '2.5', label: 'World Coordinate System (WCS) Matrix' }
          ]
        },
        {
          id: 'glossary',
          number: '3',
          label: 'Astrophysics Wiki & Operational Lexicon (A-Z Glossary)',
          subItems: [
            { id: 'glossary-astrometry', number: '3.1', label: 'FITS Format & Astrometry' },
            { id: 'glossary-mechanics', number: '3.2', label: 'Orbital Mechanics & Planet Nine' },
            { id: 'glossary-spectroscopy', number: '3.3', label: '102-Channel Spectroscopy & Volatile Ices' }
          ]
        },
        {
          id: 'workflow',
          number: '4',
          label: '4-Step Citizen Science Hunting Protocol',
          subItems: [
            { id: 'step-1', number: '4.1', label: 'Step 1: Target Preset & Wavelength Band' },
            { id: 'step-2', number: '4.2', label: 'Step 2: Blink Comparator & Difference Imaging' },
            { id: 'step-3', number: '4.3', label: 'Step 3: Extract 102-Channel SED Spectrum' },
            { id: 'step-4', number: '4.4', label: 'Step 4: Verify Proper Motion & Submit Flag' }
          ]
        },
        {
          id: 'pipeline',
          number: '5',
          label: 'Interactive Data Processing Workflow'
        },
        {
          id: 'artifacts',
          number: '6',
          label: 'Identifying Genuine Signals vs Optical Artifacts',
          subItems: [
            { id: 'artifacts-real', number: '6.1', label: 'Genuine Planet Nine / TNO Candidates' },
            { id: 'artifacts-fake', number: '6.2', label: 'Cosmic Rays & Sensor Defects to Discard' }
          ]
        },
        {
          id: 'troubleshooting',
          number: '7',
          label: 'Troubleshooting Guide & Keyboard Shortcuts',
          subItems: [
            { id: 'shortcuts', number: '7.1', label: 'Workstation Keyboard Shortcuts' },
            { id: 'faq', number: '7.2', label: 'Technical Issue Diagnostic Table' }
          ]
        },
        {
          id: 'references',
          number: '8',
          label: 'Scientific References & Academic Citations'
        }
      ]
    },
    workflowSection: {
      title: '4-Step Citizen Science Protocol to Hunt for Planet Nine',
      subtitle: 'Standard astrophysical methodology designed to prevent observer fatigue across millions of stars.',
      badge: 'SCIENTIFIC PROTOCOL',
      steps: [
        {
          step: 'STEP 1',
          title: 'Select Target Preset & Wavelength Band',
          action: 'Choose a validated preset (Cygnus Field or Planet X Search Field). Set channel stepper to channel 60 (~2.45 µm) or 80 (~3.50 µm) to mitigate stellar foreground glare.',
          tip: 'Distant outer solar system bodies emit faint thermal infrared radiation invisible to optical telescopes.'
        },
        {
          step: 'STEP 2',
          title: 'Blink Comparator & Residual Difference Imaging',
          action: 'Engage Blink mode to catch human retinal motion cues, then switch to Difference Imaging (ΔI) with σ-threshold set to 3.5σ.',
          tip: 'A distinct positive/negative dipole pair indicates a high-proper-motion celestial object.'
        },
        {
          step: 'STEP 3',
          title: 'Extract 102-Channel SED Spectral Profile',
          action: 'Switch to Spectral Profile mode and click directly on the dipole center in the FITS canvas to generate the energy distribution curve.',
          tip: 'Look for signature molecular ice absorption dips at 3.05 µm (H₂O ice) and 4.27 µm (CO₂ ice).'
        },
        {
          step: 'STEP 4',
          title: 'Verify Proper Motion & Submit Candidate Flag',
          action: 'Open the Astrometry Ledger. If proper motion μ is between 0.1 – 1.5 arcsec/yr, click "Flag selected" to record the observation into NASA citizen science records.',
          tip: 'Rapid objects (> 10 arcsec/day) are near-Earth asteroids; slow, consistent motion indicates Trans-Neptunian distance.'
        }
      ]
    },
    modesSection: {
      title: '1. Five Core Astronomical Observation Modes',
      subtitle: 'Switch seamlessly across the 5 workstation modes to cross-examine target fields across complementary analytical dimensions.',
      modes: [
        {
          id: 'blink',
          step: '01',
          title: 'Blink Comparator (Clyde Tombaugh Technique)',
          meta: 'Cadence: 0.5 – 5.0 Hz',
          desc: 'Rapidly alternates between Epoch 1 and Epoch 2 images captured 6 months apart. Leverages human visual persistence of vision: stationary background stars blend into cognitive background, while moving objects (Planet Nine, TNOs) visibly oscillate.'
        },
        {
          id: 'side_by_side',
          step: '02',
          title: 'Synchronized Epochs (Dual-Survey Comparison)',
          meta: 'Zoom: 1× – 16×',
          desc: 'Renders Survey 1 and Survey 2 side by side. All mouse wheel zoom, pan, and cursor interactions are mathematically locked to identical celestial coordinate centers with twin real-time crosshairs.'
        },
        {
          id: 'difference',
          step: '03',
          title: 'Difference Imaging (Residual Matrix ΔI = E₂ − E₁)',
          meta: 'Threshold: 2.0σ – 10.0σ',
          desc: 'Direct pixel subtraction cancels static background flux to zero, leaving a distinct positive/negative astrometric dipole. Use the σ-threshold slider to isolate high-confidence candidates against cosmic background noise.'
        },
        {
          id: 'spectral',
          step: '04',
          title: 'Spectral Profile (102-Channel SED Spectroscopy)',
          meta: 'Coverage: 0.75 – 5.00 µm',
          desc: 'SPHEREx is a full all-sky disperser. Click anywhere on the FITS image to extract 102 continuous spectral channels, revealing molecular ice absorption lines: H₂O (3.05 µm), CH₄ (3.32 µm), and CO₂ (4.27 µm).'
        },
        {
          id: 'candidates',
          step: '05',
          title: 'Candidate Discovery Ledger (Citizen Science Registry)',
          meta: 'Export CSV / JSON',
          desc: 'Real-time astrometric discovery ledger detailing detected dipoles: J2000 celestial coordinates, annual proper motion μ, signal-to-noise ratio (SNR), and flux displacement with one-click export and classification flagging.'
        }
      ]
    },
    equationsSection: {
      title: '2. Scientific Equations Explained in Plain Language (For Non-Experts)',
      subtitle: 'The astrophysics and mathematics powering this workstation demystified using intuitive everyday analogies.',
      badge: 'INTUITIVE MATH',
      analogyTitle: 'For Non-Experts (Everyday Analogy):',
      scientificTitle: 'Exact Astrophysical Rigor:',
      parametersTitle: 'Parameter Breakdown:',
      items: [
        {
          id: 'eq-diff',
          name: 'Epoch Difference Imaging Equation',
          formula: '\\Delta I(x, y) = E_2(x, y) - E_1(x, y)',
          plainSummary: 'Subtracting two time epochs cancels stationary stars and highlights moving bodies.',
          nonExpertAnalogy: 'Imagine taking a photo of a busy plaza at 8:00 AM and again at 8:00 PM. Buildings and statues never move, so when you subtract Photo 1 from Photo 2, all buildings cancel out to pure zero. A car that was parked at spot A in the morning and moved to spot B in the evening leaves a "red shadow hole" at spot A and a "blue car shape" at spot B. This pair of dots immediately reveals where the car went!',
          scientificContext: 'Distant stars have essentially zero apparent motion over a 6-month baseline. Matrix subtraction of calibrated photometric flux cancels stationary sources to zero expected flux. Moving Solar System bodies produce an astrometric dipole: a negative flux deficit at Epoch 1 and a positive flux peak at Epoch 2.',
          parameters: [
            { symbol: 'ΔI(x, y)', name: 'Difference residual', meaning: 'Net flux delta at sensor pixel coordinate (x, y).' },
            { symbol: 'E₂(x, y)', name: 'Survey Epoch 2', meaning: 'Photometric flux detected during the second 6-month all-sky scan.' },
            { symbol: 'E₁(x, y)', name: 'Survey Epoch 1', meaning: 'Photometric flux detected during the initial all-sky baseline scan.' }
          ]
        },
        {
          id: 'eq-sigma',
          name: 'Statistical Detection Significance Threshold',
          formula: '\\text{Cutoff} = \\mu_{\\text{residual}} + k \\cdot \\sigma_{\\text{residual}} \\quad (k \\ge 3.5\\sigma)',
          plainSummary: 'Cosmic noise filter that separates real planets from camera sensor speckles.',
          nonExpertAnalogy: 'Think of sitting in a noisy coffee shop. The gentle hum of voices and background music is "noise". If someone calls your name softly, you might imagine it. But if someone shouts your name 3.5 times louder than the room noise (3.5σ), you know with 99.95% certainty they are actually calling you, not just background chatter!',
          scientificContext: 'Space infrared detectors are subjected to Poisson zodiacal photon noise and read noise. Setting the candidate detection significance threshold at k = 3.5σ corresponds to a false positive probability p < 0.00023 under Gaussian statistics, eliminating spurious cosmic ray hits while keeping genuine faint dipoles.',
          parameters: [
            { symbol: 'μ_residual', name: 'Residual mean flux', meaning: 'Average background level of the difference image after subtraction.' },
            { symbol: 'σ_residual', name: 'Residual standard deviation', meaning: 'Standard deviation (noise floor) of background pixel fluctuations.' },
            { symbol: 'k (sigma multiplier)', name: 'Significance factor', meaning: 'Confidence multiplier typically set between 3.0σ and 5.0σ.' }
          ]
        },
        {
          id: 'eq-kepler',
          name: 'Kepler\'s Third Law & Annual Proper Motion',
          formula: 'v_{\\text{orb}} = \\sqrt{\\frac{G \\cdot M_\\odot}{r}} \\implies \\mu \\approx \\frac{v_{\\text{trans}}}{r} \\propto r^{-3/2}',
          plainSummary: 'The farther an object is from the Sun, the slower it moves across our night sky.',
          nonExpertAnalogy: 'Watch a jetliner cruising at 35,000 feet versus a sparrow darting past your window. The sparrow moves much slower than the airplane in real speed, but because it is right next to you, it zips past in a split second. The airplane is flying at 900 km/h, but because it is miles away, it appears to crawl across the sky. Planet Nine is 400 to 800 times farther than Earth is from the Sun, so it crawls at a glacial pace!',
          scientificContext: 'Keplerian orbital velocity decreases with distance: v_orb ∝ r^(−1/2). The apparent proper motion across the celestial sphere μ = v_trans / r scales as r^(−3/2). While near-Earth asteroids move tens of arcseconds per hour, Planet Nine at 400 – 800 AU exhibits subtle motion of only 0.1 – 1.5 arcsec/year, serving as a clean physical discriminant.',
          parameters: [
            { symbol: 'v_orb', name: 'Orbital velocity', meaning: 'Physical heliocentric orbital speed of the body (km/s).' },
            { symbol: 'r', name: 'Heliocentric distance', meaning: 'Distance from the Sun in Astronomical Units (AU).' },
            { symbol: 'μ (mu)', name: 'Apparent proper motion', meaning: 'Angular drift rate across the sky (arcsec/year).' },
            { symbol: 'M_☉', name: 'Solar mass', meaning: 'Standard gravitational parameter of the Sun (~1.989 × 10³⁰ kg).' }
          ]
        },
        {
          id: 'eq-asinh',
          name: 'Lupton Non-Linear Asinh Stretch Function',
          formula: 'I_{\\text{display}} = \\frac{\\operatorname{asinh}(I / \\beta)}{\\operatorname{asinh}(I_{\\max} / \\beta)}',
          plainSummary: 'Smart sunglasses that brighten invisible dark planets without blowing out bright stars.',
          nonExpertAnalogy: 'If you take a photo of someone standing in front of high-beam car headlights, standard cameras give you a blinded white glare while the person remains pitch black. The Asinh function acts like intelligent HDR: it tames the blistering headlights while pulling bright, crisp detail out of the shadows, allowing you to see both simultaneously on one screen.',
          scientificContext: 'FITS astronomical images encompass immense dynamic ranges (> 10⁶). Linear stretching saturates bright stars, while pure logarithmic stretching washes out background noise statistics. Robert Lupton\'s Asinh stretch behaves linearly at low signal levels (I ≪ β) to preserve photometry, and transitions smoothly into logarithmic compression at high flux levels (I ≫ β).',
          parameters: [
            { symbol: 'I_display', name: 'Display intensity', meaning: 'Normalized pixel brightness rendered on the monitor (0.0 to 1.0).' },
            { symbol: 'I', name: 'Raw pixel flux', meaning: 'True calibrated photometric surface brightness in MJy/sr.' },
            { symbol: 'β (beta)', name: 'Softening parameter', meaning: 'Flux threshold defining the linear-to-logarithmic transition.' }
          ]
        },
        {
          id: 'eq-wcs',
          name: 'World Coordinate System (WCS) Projection Matrix',
          formula: '\\begin{pmatrix} \\alpha \\\\ \\delta \\end{pmatrix} = \\begin{pmatrix} \\text{CRVAL}_1 \\\\ \\text{CRVAL}_2 \\end{pmatrix} + \\mathbf{CD} \\begin{pmatrix} x - \\text{CRPIX}_1 \\\\ y - \\text{CRPIX}_2 \\end{pmatrix}',
          plainSummary: 'Cosmic GPS: Converts a 2D screen mouse click into true astronomical sky coordinates.',
          nonExpertAnalogy: 'Exactly like Google Maps on your smartphone: whenever you tap a finger on the glass screen (x, y pixels), the underlying software calculates the exact latitude and longitude coordinates on planet Earth.',
          scientificContext: 'SPHEREx detector arrays record photons on a 2D discrete grid (x, y). The FITS WCS standard applies reference tangent projections (TAN), using the coordinate description matrix CD and reference coordinates (CRVAL, CRPIX) to calculate astrometrically accurate Right Ascension α and Declination δ with sub-pixel precision.',
          parameters: [
            { symbol: '(α, δ)', name: 'Right Ascension & Declination', meaning: 'True equatorial celestial coordinates in degrees (J2000 epoch).' },
            { symbol: '(x, y)', name: 'Detector pixel coordinates', meaning: 'Pixel coordinate location on the 2D FITS image array.' },
            { symbol: 'CD (Matrix)', name: 'Coordinate Description Matrix', meaning: 'Rotation and plate scale transformation matrix (deg/pixel).' },
            { symbol: '(CRVAL, CRPIX)', name: 'Astrometric Reference Values', meaning: 'Celestial coordinates and pixel indices of the optical reference center.' }
          ]
        }
      ]
    },
    glossarySection: {
      title: '3. Astrophysics Wiki & Operational Lexicon (A-Z Glossary)',
      subtitle: 'Instant lookups for scientific concepts, terminology, and practical observatory tips.',
      badge: 'ENCYCLOPEDIA',
      filterAll: 'All Categories',
      tipTitle: 'Observing Tip:',
      categories: [
        { id: 'all', label: 'All Terms' },
        { id: 'astrometry', label: 'FITS & Astrometry' },
        { id: 'mechanics', label: 'Orbital Mechanics & Planet 9' },
        { id: 'spectroscopy', label: 'Spectroscopy & Volatile Ices' }
      ],
      items: [
        {
          id: 'fits-7hdu',
          term: 'FITS 7-HDU Level 2 MEF',
          category: 'astrometry',
          categoryLabel: 'FITS & Astrometry',
          simpleDefinition: 'NASA standard scientific file format containing calibrated multi-extension imagery and astrometric metadata.',
          inDepthExplanation: 'FITS (Flexible Image Transport System) is the gold standard of professional astrophysics. A Multi-Extension FITS (MEF) file bundles 7 distinct Header Data Units (HDUs): Primary header, Calibrated science image, Variance noise map, Bitmask flag array, and WCS tables. Level 2 data has undergone rigorous dark current subtraction, flat-fielding, and flux calibration via NASA IRSA.',
          practicalTip: 'Never convert FITS files to JPEG/PNG for scientific analysis, as 8-bit quantization permanently discards 99% of photometric precision.'
        },
        {
          id: 'wcs-j2000',
          term: 'WCS J2000 (World Coordinate System)',
          category: 'astrometry',
          categoryLabel: 'FITS & Astrometry',
          simpleDefinition: 'Universal celestial latitude and longitude coordinate grid pegged to noon on January 1, 2000.',
          inDepthExplanation: 'Because the Earth precesses on its axis in a 26,000-year cycle, celestial coordinates drift over time. J2000 is the international epoch standard agreed upon by NASA, ESA, and the IAU. Right Ascension (RA α, 0° to 360°) represents celestial longitude; Declination (Dec δ, -90° to +90°) represents celestial latitude.',
          practicalTip: 'Hovering over any pixel in the SPHEREx viewport reads real-time J2000 RA/Dec in the bottom HUD.'
        },
        {
          id: 'dipole-signature',
          term: 'Astrometric Dipole Signature',
          category: 'astrometry',
          categoryLabel: 'FITS & Astrometry',
          simpleDefinition: 'A paired dark deficit hole and bright surplus peak left behind when subtracting images across time.',
          inDepthExplanation: 'In epoch difference imaging (E₂ − E₁), the departure position of a moving body leaves an uncompensated negative flux crater (rendered in deep red), while its arrival position creates a positive flux peak (rendered in electric cyan). The angular vector connecting the negative hole to the positive peak indicates the exact travel direction.',
          practicalTip: 'The vector from the red crater to the cyan peak points in the direction of the object\'s orbital motion!'
        },
        {
          id: 'planet-nine',
          term: 'Planet Nine (Hypothetical Super-Earth)',
          category: 'mechanics',
          categoryLabel: 'Orbital Mechanics & Planet 9',
          simpleDefinition: 'A predicted giant planet on the frozen fringes of our Solar System, estimated at 5 to 10 Earth masses.',
          inDepthExplanation: 'In 2016, Caltech astrophysicists Konstantin Batygin and Mike Brown demonstrated that the orbits of Extreme Trans-Neptunian Objects (ETNOs) share anomalous physical clustering in argument of perihelion with a p-value < 0.007. Gravitational perturbations from a distant 5–10 M⊕ planet at 400 – 800 AU provide the most rigorous dynamical explanation.',
          practicalTip: 'Planet Nine is too cold for visible light, but its internal heat radiates faint infrared glow (~35 - 45 K), within SPHEREx sensitivity.'
        },
        {
          id: 'tno-etno',
          term: 'TNO & ETNO (Trans-Neptunian Objects)',
          category: 'mechanics',
          categoryLabel: 'Orbital Mechanics & Planet 9',
          simpleDefinition: 'Any minor planet, comet, or icy planetesimal orbiting beyond Neptune\'s semi-major axis (> 30 AU).',
          inDepthExplanation: 'Populates the Kuiper Belt, Scattered Disc, and inner Oort Cloud. Extreme TNOs (ETNOs) possess semi-major axes a > 150 AU and perihelia q > 30 AU. These bodies act as dynamical tracer beacons, guiding astronomers toward the gravitational habitat of Planet Nine.',
          practicalTip: 'Pluto and Eris are the two most massive known Trans-Neptunian Objects.'
        },
        {
          id: 'au-astronomical-unit',
          term: 'AU (Astronomical Unit)',
          category: 'mechanics',
          categoryLabel: 'Orbital Mechanics & Planet 9',
          simpleDefinition: 'The mean distance from the Earth to the Sun, approximately 149.6 million kilometers (93 million miles).',
          inDepthExplanation: 'The standard yardstick of planetary astronomy. Neptune lies at 30 AU; the Kuiper belt spans 30 – 50 AU. Planet Nine is estimated between 400 and 800 AU — meaning sunlight takes over 4 full days to reach it compared to 8.3 minutes for Earth.',
          practicalTip: 'At 700 AU, the Sun appears merely as an intensely bright point of light rather than an illuminating disc.'
        },
        {
          id: 'sed-spectrum',
          term: 'SED (Spectral Energy Distribution)',
          category: 'spectroscopy',
          categoryLabel: 'Spectroscopy & Volatile Ices',
          simpleDefinition: 'A continuous plot showing how much radiation an astronomical body emits across different wavelengths.',
          inDepthExplanation: 'Functioning like an atomic fingerprint, specific molecular species absorb and emit light at discrete quantum wavelengths. SPHEREx samples 102 continuous spectral channels between 0.75 µm and 5.00 µm, allowing observers to classify cool brown dwarfs, distant galaxies, and icy outer Solar System bodies.',
          practicalTip: 'Clicking any candidate in Tab 04 plots its full 102-point SED curve in real time.'
        },
        {
          id: 'volatile-ices',
          term: 'Volatile Ices (H₂O, CH₄, CO₂ Absorption)',
          category: 'spectroscopy',
          categoryLabel: 'Spectroscopy & Volatile Ices',
          simpleDefinition: 'Frozen surface crusts of water, methane, and carbon dioxide covering distant Solar System bodies.',
          inDepthExplanation: 'At outer solar system temperatures below 40 K (-233°C), common atmospheric gases freeze into solid surface mantles. H₂O ice exhibits a profound absorption trough at 3.05 µm; Methane (CH₄) absorbs at 3.32 µm; Carbon Dioxide (CO₂) absorbs at 4.27 µm. Finding these dips in a candidate\'s SED proves Solar System origin.',
          practicalTip: 'The application automatically highlights the 3.05, 3.32, and 4.27 µm diagnostic ice lines in gold on the spectral plot.'
        },
        {
          id: 'asinh-stretch',
          term: 'Asinh Stretch (Lupton Non-Linear Function)',
          category: 'spectroscopy',
          categoryLabel: 'Spectroscopy & Volatile Ices',
          simpleDefinition: 'A mathematical contrast curve that preserves faint nebulae and planets without saturating bright stars.',
          inDepthExplanation: 'Invented by SDSS astronomer Robert Lupton. Unlike linear stretching which turns deep fields dark or log stretching which clips bright stars, Asinh scales smoothly between both extremes. It is the default, recommended stretch algorithm in SPHEREx Explorer.',
          practicalTip: 'Select "Asinh" in the toolbar dropdown whenever you are exploring faint candidate dipoles.'
        }
      ]
    },
    artifactAtlas: {
      title: '5. Identifying Genuine Signals vs Optical Artifacts (Artifact Atlas)',
      real: {
        badge: 'GENUINE PLANET NINE / TNO CANDIDATES (HIGH CONFIDENCE)',
        items: [
          'Symmetric, coherent positive/negative astrometric dipole on difference frames (ΔI).',
          'Angular motion oriented along the ecliptic plane at 0.1 – 1.5 arcsec/year.',
          'Spatial extent spans 2–3 detector pixels, matching the telescope Point Spread Function (PSF).',
          '102-channel SED exhibits molecular ice absorption troughs at 3.05 µm (H₂O) or 4.27 µm (CO₂).'
        ]
      },
      fake: {
        badge: 'COSMIC RAYS & SENSOR DEFECTS (ARTIFACTS - DISCARD)',
        items: [
          'Sharp, unblurred energy spike concentrated on a single pixel with no optical PSF.',
          'Appears in only one survey epoch without forming a matched negative dipole hole upon subtraction.',
          'Diffraction spikes and radial halos originating from over-saturated nearby stars.',
          'SED shows a single rogue spike without physical continuum or absorption physics.'
        ]
      }
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      items: [
        { key: 'Space', desc: 'Pause / Resume blink' },
        { key: '1 – 5', desc: 'Switch observation modes' },
        { key: '+ / -', desc: 'Step spectral channels' },
        { key: 'Esc', desc: 'Close dialog modals' }
      ]
    },
    troubleshooting: {
      title: '6. Troubleshooting Guide',
      subtitle: 'Fast diagnostics and remedies for data stream anomalies.',
      headers: ['Condition', 'Probable Cause', 'Recommended Remedy'],
      rows: [
        {
          issue: 'Badge displays OFFLINE CACHE',
          cause: 'Network connection to NASA IRSA IPAC timed out or IP throttled.',
          solution: 'System seamlessly loads authentic 7-HDU MEF FITS from local backend cache. All science features remain 100% operational.'
        },
        {
          issue: 'Image is pitch black or oversaturated',
          cause: 'Dynamic flux range exceeds default linear colormap bounds.',
          solution: 'Switch the astronomical Stretch setting to "asinh" or "log" in the top toolbar to balance dynamic range.'
        },
        {
          issue: 'Cutout fails to load for custom coordinates',
          cause: 'Coordinates lie outside current SPHEREx QR2 early survey footprint.',
          solution: 'Select preset sky regions (e.g. Cygnus Deep Field RA=304.6935°, Dec=42.4437°) which have verified Level 2 coverage.'
        },
        {
          issue: 'Frontend displays Network Error',
          cause: 'FastAPI backend service is not running on port 8000.',
          solution: 'Check backend console or run .\\run_dev.ps1 to launch both backend and frontend services.'
        }
      ]
    },
    referencesSection: {
      title: '8. Scientific References & Academic Citations',
      subtitle: 'Peer-reviewed literature underpinning the mathematical models, photometric scaling, and orbital astrometry utilized in this workstation.',
      badge: 'PEER-REVIEWED CITATIONS',
      items: [
        {
          id: 'ref-batygin-2016',
          citationKey: '[1]',
          authors: 'Batygin, K., & Brown, M. E.',
          title: 'Evidence for a Distant Giant Planet in the Solar System',
          venue: 'The Astronomical Journal, 151(2), 22',
          year: 2016,
          doi: '10.3847/0004-6256/151/2/22',
          arxivId: '1601.05438',
          url: 'https://doi.org/10.3847/0004-6256/151/2/22',
          relevance: 'Seminal paper demonstrating dynamical orbital clustering in arguments of perihelion among ETNOs, predicting Planet Nine.'
        },
        {
          id: 'ref-batygin-2019',
          citationKey: '[2]',
          authors: 'Batygin, K., Adams, F. C., Brown, M. E., & Becker, J. C.',
          title: 'The Planet Nine Hypothesis',
          venue: 'Physics Reports, 805, 1-53',
          year: 2019,
          doi: '10.1016/j.physrep.2019.01.009',
          arxivId: '1902.10103',
          url: 'https://doi.org/10.1016/j.physrep.2019.01.009',
          relevance: 'Comprehensive review updating Planet Nine mass (5-10 M⊕), semi-major axis (400-800 AU), and expected infrared thermal signature (~35-45 K).'
        },
        {
          id: 'ref-lupton-2004',
          citationKey: '[3]',
          authors: 'Lupton, R., Blanton, M. R., Fekete, G., Hogg, D. W., et al.',
          title: 'Preparing Red-Green-Blue Images from Sloan Digital Sky Survey Data',
          venue: 'Publications of the Astronomical Society of the Pacific, 116(816), 133-137',
          year: 2004,
          doi: '10.1086/382245',
          arxivId: 'astro-ph/0312483',
          url: 'https://doi.org/10.1086/382245',
          relevance: 'Foundation of the inverse hyperbolic sine (Asinh) stretch algorithm applied to prevent star blooming while highlighting faint deep-space targets.'
        },
        {
          id: 'ref-calabretta-2002',
          citationKey: '[4]',
          authors: 'Calabretta, M. R., & Greisen, E. W.',
          title: 'Representations of celestial coordinates in FITS',
          venue: 'Astronomy & Astrophysics, 395(3), 1077-1122',
          year: 2002,
          doi: '10.1051/0004-6361:20021327',
          arxivId: 'astro-ph/0207413',
          url: 'https://doi.org/10.1051/0004-6361:20021327',
          relevance: 'The international standard for FITS World Coordinate Systems (WCS), mapping sensor pixel coordinates to J2000 celestial coordinates.'
        },
        {
          id: 'ref-dore-2016',
          citationKey: '[5]',
          authors: 'Doré, O., Werner, M. W., Ashby, M. L. N., et al.',
          title: 'Science Extracts from the SPHEREx All-Sky Spectral Survey',
          venue: 'NASA JPL / Caltech White Paper',
          year: 2016,
          arxivId: '1606.07039',
          url: 'https://arxiv.org/abs/1606.07039',
          relevance: 'SPHEREx mission architecture: 102 continuous spectral channels across 0.75 - 5.0 µm calibrated for ice detection and all-sky astrometry.'
        },
        {
          id: 'ref-cruikshank-2020',
          citationKey: '[6]',
          authors: 'Cruikshank, D. P., Grundy, W. M., DeMeo, F. E., et al.',
          title: 'The surface compositions of Kuiper Belt Objects and Centaurs',
          venue: 'The Trans-Neptunian Solar System, Elsevier, 245-274',
          year: 2020,
          doi: '10.1016/B978-0-12-816490-7.00011-8',
          url: 'https://doi.org/10.1016/B978-0-12-816490-7.00011-8',
          relevance: 'Reference laboratory and observational spectral templates for water ice (3.05 µm), methane ice (3.32 µm), and carbon dioxide ice (4.27 µm) on TNOs.'
        },
        {
          id: 'ref-tombaugh-1946',
          citationKey: '[7]',
          authors: 'Tombaugh, C. W.',
          title: 'The Search for the Ninth Planet, Pluto',
          venue: 'Astronomical Society of the Pacific Leaflets, 5(209), 73-80',
          year: 1946,
          url: 'https://ui.adsabs.harvard.edu/abs/1946ASPL....5...73T/abstract',
          relevance: 'Historical documentation of the optical blink comparator technique invented by Clyde Tombaugh in 1930 to discover Pluto, now digitized in our workstation.'
        }
      ]
    },
    cta: {
      backHome: '← Back to Home',
      overviewBtn: 'Explore Scientific Overview',
      workstationBtn: 'Launch Observatory Workstation'
    }
  }
};
