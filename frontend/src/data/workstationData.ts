import { Language } from '../types';

export interface WorkstationTranslations {
  toolbar: {
    presetLabel: string;
    raLabel: string;
    decLabel: string;
    prevChannel: string;
    nextChannel: string;
    channel: string;
    inspectBtn: string;
    inspecting: string;
    fitsBtn: string;
    liveSource: string;
    cacheSource: string;
    offlineSource: string;
  };
  modes: {
    blink: { label: string; subLabel: string };
    side_by_side: { label: string; subLabel: string };
    difference: { label: string; subLabel: string };
    spectral: { label: string; subLabel: string };
    candidates: { label: string; subLabel: string };
  };
  skyViewer: {
    modes: {
      blink: string;
      side_by_side: string;
      difference: string;
    };
    playBlink: string;
    pauseBlink: string;
    stepForward: string;
    speedHz: string;
    threshold: string;
    colormapLabel: string;
    stretchLabel: string;
    stretchOptions: {
      asinh: string;
      log: string;
      linear: string;
      zscale: string;
    };
    overlayToggle: string;
    resetView: string;
    epoch1Label: string;
    epoch2Label: string;
    diffLabel: string;
    loadingTitle: string;
    loadingSub: string;
    connectingTitle: string;
    connectingSub: string;
    hudGuide: string;
    hudWaiting: string;
  };
  spectral: {
    title: string;
    subtitle: string;
    activeChannel: string;
    loadingFlux: string;
    fluxDensity: string;
    hoverHint: string;
    calculating: string;
    pickerTitle: string;
    pickerDesc: string;
  };
  ledger: {
    title: string;
    targetsCount: string;
    subtitle: string;
    exportCsv: string;
    exportJson: string;
    flagSelected: string;
    colCandidate: string;
    colRa: string;
    colDec: string;
    colMotion: string;
    colDeltaFlux: string;
    colSnr: string;
    colClassification: string;
    emptyTitle: string;
    emptyDesc: string;
    footnote: string;
  };
  modal: {
    title: string;
    subtitle: string;
    targetCoords: string;
    observerLabel: string;
    observerPlaceholder: string;
    classificationLabel: string;
    classifications: {
      planetX: string;
      brownDwarf: string;
      asteroid: string;
      comet: string;
      artifact: string;
    };
    notesLabel: string;
    notesPlaceholder: string;
    cancelBtn: string;
    submittingBtn: string;
    submitBtn: string;
    successMsg: string;
    errorMsg: string;
    detectedShift: (type: string, shift: number) => string;
    defaultNotes: string;
  };
  error: {
    retry: string;
    defaultError: string;
  };
}

export const workstationTranslations: Record<Language, WorkstationTranslations> = {
  vi: {
    toolbar: {
      presetLabel: 'Mục tiêu thiên văn định sẵn',
      raLabel: 'α:',
      decLabel: 'δ:',
      prevChannel: 'Kênh trước',
      nextChannel: 'Kênh kế tiếp',
      channel: 'Kênh',
      inspectBtn: 'Truy Vấn',
      inspecting: 'Đang nạp...',
      fitsBtn: 'FITS',
      liveSource: 'LIVE NASA IRSA',
      cacheSource: 'LOCAL CACHE',
      offlineSource: 'OFFLINE SAMPLE'
    },
    modes: {
      blink: { label: 'So Sánh Nhấp Nháy (Blink)', subLabel: '01' },
      side_by_side: { label: 'Đồng Bộ Thời Kỳ (Compare)', subLabel: '02' },
      difference: { label: 'Ảnh Vi Phân (ΔI)', subLabel: '03' },
      spectral: { label: 'Hồ Sơ Phổ SED', subLabel: '04' },
      candidates: { label: 'Sổ Bộ Mục Tiêu (Ledger)', subLabel: '05' }
    },
    skyViewer: {
      modes: {
        blink: 'Blink Comparator',
        side_by_side: 'Đồng Bộ Thời Kỳ',
        difference: 'Ảnh Vi Phân (ΔI)'
      },
      playBlink: 'Bật nhấp nháy',
      pauseBlink: 'Dừng nhấp nháy',
      stepForward: 'Chuyển thời kỳ tiếp',
      speedHz: 'Hz',
      threshold: 'Ngưỡng:',
      colormapLabel: 'Bảng màu',
      stretchLabel: 'Giãn mức ảnh',
      stretchOptions: {
        asinh: 'Asinh (Khuyên dùng)',
        log: 'Logarithmic',
        linear: 'Linear',
        zscale: 'Z-Scale'
      },
      overlayToggle: 'Đánh dấu ứng viên dịch chuyển',
      resetView: 'Reset 1:1',
      epoch1Label: 'Thời kỳ 1',
      epoch2Label: 'Thời kỳ 2',
      diffLabel: 'Ảnh vi phân · ΔI = Epoch 2 − Epoch 1',
      loadingTitle: 'Đang nạp ảnh FITS từ NASA IRSA & IPAC',
      loadingSub: 'Cập nhật ma trận dữ liệu quang học bước sóng',
      connectingTitle: 'Đang kết nối trạm quan sát SPHEREx',
      connectingSub: 'Chờ kết quả nạp ma trận FITS 2 thời kỳ từ máy chủ AstroPy...',
      hudGuide: 'Cuộn chuột: Thu phóng · Kéo chuột: Di chuyển · Phím mũi tên & +/-',
      hudWaiting: 'WCS HUD · Rà chuột hoặc chọn điểm trên ảnh để xem tọa độ thực địa J2000'
    },
    spectral: {
      title: 'HỒ SƠ PHỔ BƯỚC SÓNG / SPECTRAL PROFILE',
      subtitle: 'SPHEREx 102 Kênh SED · Phổ liên tục 0.75 – 5.00 µm · Phân tích vạch hấp thụ băng ngoại vi',
      activeChannel: 'KÊNH',
      loadingFlux: 'Đang nạp dữ liệu quang phổ...',
      fluxDensity: 'FLUX DENSITY · MJy/sr',
      hoverHint: 'Di chuột hoặc nhấn vào vạch phổ để kiểm tra',
      calculating: 'Đang tính toán phân bố năng lượng quang phổ 102 kênh SPHEREx...',
      pickerTitle: 'BỘ CHỌN TỌA ĐỘ 2D',
      pickerDesc: 'Nhấp chuột trực tiếp lên ảnh thiên văn để trích xuất đường cong SED 102 bước sóng tại điểm đó.'
    },
    ledger: {
      title: 'SỔ BỘ ỨNG VIÊN DỊCH CHUYỂN',
      targetsCount: 'MỤC TIÊU',
      subtitle: 'Các nguồn thiên văn chuyển động riêng được định vị chính xác từ hệ tọa độ chuẩn WCS SPHEREx',
      exportCsv: 'Xuất CSV',
      exportJson: 'Xuất JSON',
      flagSelected: 'Báo Cáo Mục Tiêu',
      colCandidate: 'Mã Ứng Viên',
      colRa: 'RA (J2000)',
      colDec: 'Dec (J2000)',
      colMotion: 'μ (arcsec/yr)',
      colDeltaFlux: 'Biến Thiên Δ Flux',
      colSnr: 'Độ Tin Cậy (S/N)',
      colClassification: 'Phân Loại Dự Đoán',
      emptyTitle: 'Chưa Phát Hiện Lưỡng Cực Dịch Chuyển Trong Trường Quan Sát Này',
      emptyDesc: 'Không có nguồn đối tượng nào vượt ngưỡng thống kê tín hiệu trên nhiễu (Signal-to-Noise Ratio). Hãy thử hạ ngưỡng phát hiện (Sigma Threshold) trên thanh công cụ hoặc chọn một tọa độ mục tiêu thiên văn khác.',
      footnote: '* Giá trị biến thiên thông lượng quang phổ (Δ Flux) chỉ hiển thị khi có dữ liệu từ thuật toán vi phân AstroPy; không áp dụng giá trị suy diễn giả lập.'
    },
    modal: {
      title: 'Báo Cáo Mục Tiêu Nghi Vấn',
      subtitle: 'Citizen Science Discovery Registry · NASA SPHEREx',
      targetCoords: 'Tọa Độ Thiên Văn Mục Tiêu (Epoch 2 · J2000):',
      observerLabel: 'Tên Nhà Thiên Văn / Đội Nghiên Cứu:',
      observerPlaceholder: 'VD: Nguyễn Văn A (Citizen Astronomer)',
      classificationLabel: 'Dự Đoán Phân Loại Thiên Thể (Hypothesized Object):',
      classifications: {
        planetX: 'Hành Tinh Thứ Chín / Vật Thể Ngoài Hải Vương Tinh (Planet X / TNO)',
        brownDwarf: 'Sao Lùn Nâu Lạnh (Cold Brown Dwarf)',
        asteroid: 'Tiểu Hành Tinh Vành Đai Kuiper (Kuiper Belt Asteroid)',
        comet: 'Sao Chổi Vùng Rìa (Oort Cloud Comet)',
        artifact: 'Nhiễu Quang Học / Tia Vũ Trụ (Optical Artifact)'
      },
      notesLabel: 'Ghi Chú Quan Sát & Bằng Chứng Khoa Học:',
      notesPlaceholder: 'Mô tả chuyển động riêng, độ sáng vi phân hoặc các đặc điểm phát hiện...',
      cancelBtn: 'Hủy Bỏ',
      submittingBtn: 'Đang Đăng Ký...',
      submitBtn: 'Gửi Khám Phá Vào Hồ Sơ NASA',
      successMsg: 'Đã ghi nhận mục tiêu vào cơ sở dữ liệu khám phá SPHEREx của NASA thành công!',
      errorMsg: 'Gửi báo cáo thất bại',
      detectedShift: (type, shift) => `Phát hiện đối tượng ${type} dịch chuyển ${shift.toFixed(2)} arcsec giữa 2 thời kỳ khảo sát SPHEREx.`,
      defaultNotes: 'Ghi nhận dấu vết dịch chuyển lưỡng cực (dipole) rõ rệt giữa Thời kỳ 1 và Thời kỳ 2.'
    },
    error: {
      retry: 'Thử Lại',
      defaultError: 'Không thể kết nối máy chủ AstroPy cục bộ. Vui lòng kiểm tra API.'
    }
  },
  en: {
    toolbar: {
      presetLabel: 'Preset Astronomical Targets',
      raLabel: 'α:',
      decLabel: 'δ:',
      prevChannel: 'Previous channel',
      nextChannel: 'Next channel',
      channel: 'Ch',
      inspectBtn: 'Inspect',
      inspecting: 'Loading...',
      fitsBtn: 'FITS',
      liveSource: 'LIVE NASA IRSA',
      cacheSource: 'LOCAL CACHE',
      offlineSource: 'OFFLINE SAMPLE'
    },
    modes: {
      blink: { label: 'Blink Comparator', subLabel: '01' },
      side_by_side: { label: 'Synchronized Epochs', subLabel: '02' },
      difference: { label: 'Difference Imaging (ΔI)', subLabel: '03' },
      spectral: { label: 'Spectral Profile (SED)', subLabel: '04' },
      candidates: { label: 'Candidate Ledger', subLabel: '05' }
    },
    skyViewer: {
      modes: {
        blink: 'Blink Comparator',
        side_by_side: 'Epoch Compare',
        difference: 'Difference ΔI'
      },
      playBlink: 'Play blink',
      pauseBlink: 'Pause blink',
      stepForward: 'Step forward',
      speedHz: 'Hz',
      threshold: 'Threshold:',
      colormapLabel: 'Colormap',
      stretchLabel: 'Image stretch',
      stretchOptions: {
        asinh: 'Asinh (Recommended)',
        log: 'Logarithmic',
        linear: 'Linear',
        zscale: 'Z-Scale'
      },
      overlayToggle: 'Toggle candidate overlays',
      resetView: 'Reset 1:1',
      epoch1Label: 'Epoch 1',
      epoch2Label: 'Epoch 2',
      diffLabel: 'Difference · ΔI = Epoch 2 − Epoch 1',
      loadingTitle: 'Loading FITS Cutout from NASA IRSA & IPAC',
      loadingSub: 'Updating optical data array at wavelength',
      connectingTitle: 'Connecting to SPHEREx Observatory',
      connectingSub: 'Awaiting dual-epoch FITS matrix from local AstroPy engine...',
      hudGuide: 'Scroll: Zoom · Drag: Pan · Arrow keys & +/- to navigate',
      hudWaiting: 'WCS HUD · Hover or click sky image to inspect real-time J2000 coordinates'
    },
    spectral: {
      title: 'SPECTRAL PROFILE / 102-CHANNEL SED',
      subtitle: 'SPHEREx 102-channel spectrophotometry · 0.75 – 5.00 µm · Outer solar system volatile ice absorption',
      activeChannel: 'CHANNEL',
      loadingFlux: 'Awaiting spectral data...',
      fluxDensity: 'FLUX DENSITY · MJy/sr',
      hoverHint: 'Hover or click spectral channels to inspect',
      calculating: 'Synthesizing 102-channel SPHEREx spectral energy distribution...',
      pickerTitle: '2D COORDINATE PICKER',
      pickerDesc: 'Click anywhere on the sky cutout to extract its 102-channel SED profile.'
    },
    ledger: {
      title: 'CANDIDATE DISCOVERY LEDGER',
      targetsCount: 'TARGETS',
      subtitle: 'Detected proper-motion astronomical sources precisely calibrated with SPHEREx WCS',
      exportCsv: 'Export CSV',
      exportJson: 'Export JSON',
      flagSelected: 'Flag Selected',
      colCandidate: 'Candidate ID',
      colRa: 'RA (J2000)',
      colDec: 'Dec (J2000)',
      colMotion: 'μ (arcsec/yr)',
      colDeltaFlux: 'Flux Residual (ΔI)',
      colSnr: 'Confidence (S/N)',
      colClassification: 'Classification',
      emptyTitle: 'No Detected Dipoles in This Field',
      emptyDesc: 'No moving sources exceeded the signal-to-noise detection threshold. Try lowering the sigma threshold or selecting a different preset target field.',
      footnote: '* Flux delta (Δ Flux) is only reported when computed by AstroPy difference engine; no simulated values are inferred.'
    },
    modal: {
      title: 'Flag Moving Candidate',
      subtitle: 'Citizen Science Discovery Registry · NASA SPHEREx',
      targetCoords: 'Target Coordinates (Epoch 2 · J2000):',
      observerLabel: 'Observer / Team Name:',
      observerPlaceholder: 'e.g. John Doe (Citizen Astronomer)',
      classificationLabel: 'Hypothesized Object Classification:',
      classifications: {
        planetX: 'Planet Nine / Trans-Neptunian Object (Planet X / TNO)',
        brownDwarf: 'Cold Brown Dwarf',
        asteroid: 'Kuiper Belt Asteroid',
        comet: 'Outer Oort Cloud Comet',
        artifact: 'Optical Artifact / Cosmic Ray Hit'
      },
      notesLabel: 'Observation Notes & Scientific Evidence:',
      notesPlaceholder: 'Describe displacement, residual flux, and detection notes...',
      cancelBtn: 'Cancel',
      submittingBtn: 'Registering...',
      submitBtn: 'Submit Finding to NASA Registry',
      successMsg: 'Candidate successfully logged into the NASA SPHEREx discovery database!',
      errorMsg: 'Submission failed',
      detectedShift: (type, shift) => `Detected ${type} shifting by ${shift.toFixed(2)} arcsec over the SPHEREx survey interval.`,
      defaultNotes: 'Visual inspection shows distinct shifting dipole between Survey 1 and Survey 2.'
    },
    error: {
      retry: 'Retry',
      defaultError: 'Unable to reach the local AstroPy service. Check that the API is running.'
    }
  }
};
