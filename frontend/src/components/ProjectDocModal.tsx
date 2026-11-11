import React, { useEffect, useRef } from 'react';
import { X, BookOpen, Layers, Telescope, Activity, Database, CheckCircle2, Award, ExternalLink, Orbit } from 'lucide-react';

interface ProjectDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'overview' | 'guide';
}

export const ProjectDocModal: React.FC<ProjectDocModalProps> = ({ isOpen, onClose, initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'guide'>(initialTab);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="doc-modal-title"
      className="fixed inset-0 z-50 m-auto w-full max-w-5xl rounded-xl border border-space-700 bg-space-950/95 p-0 text-slate-100 shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-md open:flex open:flex-col max-h-[90vh]"
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-space-800 bg-space-900/80 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-nasa-blue/20 border border-nasa-cyan/30 text-nasa-cyan">
            <Telescope className="h-5 w-5" />
          </div>
          <div>
            <h2 id="doc-modal-title" className="text-base font-bold text-white tracking-wide">
              NASA SPHEREx Explorer Documentation & Scientific Public Space
            </h2>
            <p className="text-xs text-slate-400">
              Hunting Planet X & Trans-Neptunian Objects with All-Sky Infrared Spectroscopy
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close documentation dialog"
          className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-space-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Tabs Bar */}
      <nav className="flex shrink-0 border-b border-space-800 bg-space-950 px-6 pt-2" role="tablist" aria-label="Documentation sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className={`focus-ring flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'border-nasa-cyan text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Giới Thiệu Dự Án & Khoa Học (Overview)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'guide'}
          onClick={() => setActiveTab('guide')}
          className={`focus-ring flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'guide'
              ? 'border-nasa-cyan text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Hướng Dẫn Sử Dụng Trạm Làm Việc (User Guide)</span>
        </button>
      </nav>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-slate-300 space-y-6">
        {activeTab === 'overview' ? (
          <article className="space-y-6">
            {/* Visual Space: Real NASA / Scientific Imagery */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NASA SPHEREx Observatory Hardware */}
              <div className="overflow-hidden rounded-xl border border-space-800 bg-space-900/60 p-3 space-y-2.5">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <img
                    src="/assets/images/spherex_observatory_hardware.jpg"
                    alt="NASA SPHEREx Space Observatory hardware in cleanroom testing"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] text-nasa-cyan">
                    NASA / JPL-Caltech Official Hardware
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Telescope className="h-3.5 w-3.5 text-nasa-cyan" />
                    Kính Viễn Vọng Không Gian NASA SPHEREx
                  </h4>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Trang bị 3 tầng tấm chắn bức xạ nón nhôm (V-groove cone radiators) giúp làm lạnh thụ động hệ thống quang học xuống dưới 80 K (-193°C), chụp quét toàn bộ vòm trời ở 102 dải bước sóng hồng ngoại (0.75 - 5.00 µm).
                  </p>
                </div>
              </div>

              {/* Batygin-Brown Planet Nine Orbit Model */}
              <div className="overflow-hidden rounded-xl border border-space-800 bg-space-900/60 p-3 space-y-2.5">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black flex items-center justify-center p-2">
                  <img
                    src="/assets/images/planet_nine_orbit.svg"
                    alt="Diagram of extreme trans-Neptunian object orbits and Planet Nine hypothesis"
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] text-nasa-amber">
                    Batygin &amp; Brown Orbital Clustering Model
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Orbit className="h-3.5 w-3.5 text-nasa-amber" />
                    Giả Thuyết Quỹ Đạo Planet Nine (Planet X)
                  </h4>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Sự cụm góc bất thường của cận điểm quỹ đạo các thiên thể ngoài Hải Vương Tinh (Sedna, 2012 VP113) cho thấy sự tồn tại của một siêu Trái Đất (5 - 10 M⊕) ở bán trục lớn 400 - 800 AU.
                  </p>
                </div>
              </div>
            </section>

            {/* Scientific Explanation */}
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Telescope className="h-4 w-4 text-nasa-cyan" />
                1. Sứ mệnh SPHEREx &amp; Bài toán Săn tìm Planet X
              </h3>
              <p>
                Kính viễn vọng không gian <strong>NASA SPHEREx</strong> thực hiện khảo sát toàn bầu trời ở 102 kênh phổ hồng ngoại gần (0.75 – 5.00 µm) với chu kỳ 6 tháng một lần. Khác với ánh sáng khả kiến mờ nhạt do khoảng cách xa xôi (&gt;300 AU), các thiên thể rìa ngoài Hệ Mặt Trời (Hành tinh Thứ Chín / TNOs) phát xạ nhiệt nội tại rõ rệt trong dải hồng ngoại.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-space-800 bg-space-900/50">
                  <div className="text-xs font-mono text-nasa-cyan uppercase tracking-wider mb-1">Chu kỳ khảo sát</div>
                  <div className="text-base font-bold text-white">6 Tháng / Epoch</div>
                  <p className="text-xs text-slate-400 mt-1">So sánh Survey 1 vs Survey 2 để phát hiện chuyển động riêng (Proper Motion).</p>
                </div>
                <div className="p-3 rounded-lg border border-space-800 bg-space-900/50">
                  <div className="text-xs font-mono text-nasa-amber uppercase tracking-wider mb-1">Dải phổ hồng ngoại</div>
                  <div className="text-base font-bold text-white">102 Kênh (0.75–5.00 µm)</div>
                  <p className="text-xs text-slate-400 mt-1">Trích xuất đường cong SED nhận diện băng H₂O, CH₄, CO₂ trên bề mặt thiên thể.</p>
                </div>
                <div className="p-3 rounded-lg border border-space-800 bg-space-900/50">
                  <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">Dữ liệu thực tế</div>
                  <div className="text-base font-bold text-white">NASA IRSA QR2</div>
                  <p className="text-xs text-slate-400 mt-1">Chuẩn FITS 7-HDU Level 2 MEF thực tế qua giao thức IVOA SIAv2.</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-nasa-cyan" />
                2. Điểm Đột Phá So Với Giải Pháp Truyền Thống
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-300">
                <li><strong>Trực quan hóa thời gian thực trên Web:</strong> Không cần cài đặt các phần mềm thiên văn máy tính để bàn phức tạp (DS9, Aladin), toàn bộ dữ liệu FITS được giải mã WCS và hiển thị qua Canvas mượt mà.</li>
                <li><strong>Triệt tiêu sao nền tự động (Difference Imaging):</strong> Tự động trừ hai niên kỷ epoch (&Delta;I = E₂ - E₁), làm lộ ra các cặp lưỡng cực Dipole đặc trưng của vật thể di chuyển.</li>
                <li><strong>Citizen Science Workflow:</strong> Cho phép cộng đồng ghi nhận, gắn nhãn phân loại (Planet X, TNO, Asteroid, Comet) và trích xuất dữ liệu khoa học tiêu chuẩn (CSV/JSON).</li>
              </ul>
            </section>
          </article>
        ) : (
          <article className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-nasa-cyan" />
                5 Chế Độ Quan Sát Khoa Học
              </h3>
              <div className="space-y-4">
                <div className="p-3 rounded-lg border border-space-800 bg-space-900/40">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="font-mono text-xs text-nasa-cyan">01</span>
                    <span>Blink Comparator (So sánh chớp)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Mô phỏng kỹ thuật của Clyde Tombaugh (người phát hiện Sao Diêm Vương). Hệ thống luân chuyển nhanh giữa Epoch 1 và Epoch 2 với tần số 0.5 – 5 Hz. Sao nền sẽ đứng yên, thiên thể di chuyển sẽ "nhấp nháy" qua lại giữa 2 vị trí.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-space-800 bg-space-900/40">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="font-mono text-xs text-nasa-cyan">02</span>
                    <span>Synchronized Epochs (Đồng bộ song song)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Hiển thị 2 niên kỷ cạnh nhau với con trỏ và thao tác Pan/Zoom (1x–16x) được đồng bộ hóa hoàn hảo theo tọa độ thực.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-space-800 bg-space-900/40">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="font-mono text-xs text-nasa-cyan">03</span>
                    <span>Difference Imaging (Ảnh vi phân &Delta;I)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Lấy Epoch 2 trừ Epoch 1. Các sao tĩnh triệt tiêu về 0, để lại cặp đốm âm/dương (Dipole). Dùng thanh trượt &sigma;-threshold để lọc sạch nhiễu nền.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-space-800 bg-space-900/40">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="font-mono text-xs text-nasa-cyan">04</span>
                    <span>Spectral Profile (Phổ 102 kênh SED)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Khảo sát mật độ thông lượng tại tọa độ chọn. Đối chiếu trực tiếp với các vạch hấp thụ của băng H₂O (3.05 µm), CH₄ (3.32 µm), và CO₂ (4.27 µm) để xác định bản chất vật lý của thiên thể.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-space-800 bg-space-900/40">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="font-mono text-xs text-nasa-cyan">05</span>
                    <span>Candidate Ledger (Sổ bộ ứng viên)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Xem danh sách các ứng viên chuyển động đã phát hiện, độ tin cậy S/N, tốc độ dịch chuyển góc và xuất báo cáo CSV/JSON.
                  </p>
                </div>
              </div>
            </section>
          </article>
        )}
      </div>

      {/* Footer */}
      <footer className="flex shrink-0 items-center justify-between border-t border-space-800 bg-space-900/60 px-6 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>NASA International Space Apps Challenge 2026</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring rounded-lg bg-space-800 hover:bg-space-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors"
        >
          Đóng (Esc)
        </button>
      </footer>
    </dialog>
  );
};
