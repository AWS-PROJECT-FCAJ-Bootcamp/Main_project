import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  Sparkles,
  Mail,
  CheckCircle2,
  Copy,
  Check,
  Cpu,
  Layers,
  Globe,
  Award,
  Zap,
  Server,
  Calculator,
  Clock,
  CheckSquare,
  Activity,
  LineChart,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const contactEmail = 'duyphong242004@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10 max-w-screen-xl mx-auto pb-16 font-sans">
      {/* ── Hero Banner Section (AWS Cloud / Fintech Standard) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 sm:p-10 shadow-2xl border border-sky-500/20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-950/60 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold tracking-wider uppercase shadow-sm">
            <Sparkles size={14} className="text-sky-400 animate-pulse" />
            AWS Serverless Data Lake Platform
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-sky-200 font-sans">
            Giới Thiệu Dự Án AWS Financial Data Lake
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Hệ thống kho dữ liệu tài chính đám mây serverless (AWS Data Lake) tự động thu thập, chuẩn hóa báo cáo tài chính
            từ các nguồn uy tín, cung cấp bộ công cụ phân tích doanh nghiệp, biểu đồ kỹ thuật và cảnh báo sức khỏe tài chính cho nhà đầu tư.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-xl bg-sky-950/50 backdrop-blur-md border border-sky-500/30 text-sky-200 flex items-center gap-1.5 font-bold shadow-2xs">
              <Server size={14} className="text-sky-400" /> AWS S3 &amp; Athena
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-950/50 backdrop-blur-md border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 font-bold shadow-2xs">
              <Zap size={14} className="text-emerald-400" /> Real-time Pipeline
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-cyan-950/50 backdrop-blur-md border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5 font-bold shadow-2xs">
              <Cpu size={14} className="text-cyan-400" /> Glassmorphism Design
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 1: Tổng Quan Các Chức Năng Ứng Dụng (Web Capabilities) ── */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 font-mono">
          <Award size={22} className="text-indigo-600" />
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 font-sans">
              CÁC CHỨC NĂNG NỔI BẬT CỦA ỨNG DỤNG
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Hệ thống cung cấp đầy đủ các mô-đun phục vụ thu thập, phân tích và khai thác dữ liệu chứng khoán.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Database size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Cào &amp; Nạp Dữ Liệu</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tự động kích hoạt các luồng thu thập dữ liệu giá OHLCV, giao dịch Tick và Báo cáo tài chính lưu trữ trực tiếp trên AWS S3.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <Activity size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Bảng Giá &amp; Dòng Tiền Live</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Theo dõi biến động dòng tiền cá mập, dòng tiền bán lẻ và khớp lệnh từng giây (Tick-by-Tick Monitor) cho mã cổ phiếu.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
              <LineChart size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Biểu Đồ Kỹ Thuật Canvas</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Trực quan hóa lịch sử giá nến (OHLCV) tích hợp các đường chỉ báo kỹ thuật RSI (14), MACD, ADX và khối lượng giao dịch.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <FileText size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Báo Cáo Tài Chính BCTC</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Truy vấn Bảng cân đối kế toán, Kết quả kinh doanh và Lưu chuyển tiền tệ chính xác theo từng năm hoặc quý.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <Calculator size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Phân Tích Chỉ Số &amp; Z-Score</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tự động tính toán 5 nhóm chỉ số tài chính (Thanh khoản, Sinh lời, Đòn bẩy, Hoạt động, Định giá) và chỉ số sức khỏe Altman Z-Score.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold">
              <FileSpreadsheet size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Xuất Tập Dữ Liệu Dataset</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hỗ trợ kết xuất tập dữ liệu tài chính đã làm sạch dưới dạng Apache Parquet hoặc CSV để phục vụ phân tích chuyên sâu.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold">
              <CheckSquare size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Chuẩn Hóa Dữ Liệu</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Làm sạch tên chỉ tiêu BCTC biến thể, kiểm tra tỷ lệ missing rate và áp dụng kỹ thuật Winsorizing 1%-99% loại bỏ ngoại lệ.
            </p>
          </div>

          <div className="bg-amber-50/80 backdrop-blur-xl rounded-2xl p-5 border border-amber-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-2.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Clock size={18} />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-amber-200 text-amber-900">
                Future Roadmap
              </span>
            </div>
            <h3 className="text-sm font-bold text-amber-950">AI Cảnh Báo Rủi Ro</h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              Mô hình học máy AI cảnh báo rủi ro tài chính đang được nghiên cứu triển khai trong tương lai.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Nguồn Dữ Liệu Uy Tín ── */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/70 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5 font-mono">
            <ShieldCheck size={22} className="text-emerald-600 flex-shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-sans">
                NGUỒN DỮ LIỆU UY TÍN &amp; QUY TRÌNH KIỂM SOÁT CHẤT LƯỢNG
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Đảm bảo dữ liệu tài chính chính xác, đầy đủ và tuân thủ chuẩn kiểm toán công bố thông tin.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
            ✓ Verified Sources
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs font-mono">
              <Globe size={16} /> 1. DỮ LIỆU THỊ TRƯỜNG UY TÍN
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Thu thập dữ liệu khớp lệnh và chỉ số thị trường từ các cổng tài chính lớn tại Việt Nam như <strong>Vietstock, CafeF, HOSE, HNX</strong> thông qua các gói thư viện dữ liệu tiêu chuẩn (<code className="bg-slate-200 font-mono px-1 py-0.5 rounded text-[11px]">vnstock</code>).
            </p>
          </div>

          <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs font-mono">
              <CheckCircle2 size={16} /> 2. BÁO CÁO TÀI CHÍNH ĐÃ KIỂM TOÁN
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Bảng cân đối kế toán, Kết quả hoạt động kinh doanh và Lưu chuyển tiền tệ được truy xuất từ dữ liệu công bố thông tin chính thức của hơn 1,000+ doanh nghiệp niêm yết.
            </p>
          </div>

          <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-xs font-mono">
              <Layers size={16} /> 3. LƯU TRỮ VÀ TỐI ƯU HÓA AWS
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Dữ liệu sau khi làm sạch được quy đổi đồng nhất đơn vị (Tỷ VNĐ) và lưu trữ dưới định dạng nén <strong>Apache Parquet</strong> trên AWS S3, cho phép truy vấn siêu tốc qua AWS Athena.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 3: Mô Hình Altman Z-Score & Thuật Ngữ Quốc Tế ── */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/70 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5 font-mono">
            <Calculator size={22} className="text-indigo-600 flex-shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-sans">
                MÔ HÌNH ALTMAN Z-SCORE &amp; THUẬT NGỮ CHỈ SỐ TÀI CHÍNH (ENGLISH METRICS)
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Các chỉ số tài chính được hệ thống trích xuất theo tiêu chuẩn quốc tế giúp nhà phân tích dễ dàng đánh giá sức khỏe doanh nghiệp.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 self-start sm:self-auto">
            Z-Score: 1.2X₁ + 1.4X₂ + 3.3X₃ + 0.6X₄ + 0.999X₅
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-indigo-700 block">X₁ = Working Capital / Total Assets</span>
            <p className="text-slate-600 font-sans text-[11px] leading-relaxed">
              <strong>Vốn lưu động / Tổng tài sản:</strong> Đo lường tính thanh khoản ngắn hạn ròng của doanh nghiệp.
            </p>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-indigo-700 block">X₂ = Retained Earnings / Total Assets</span>
            <p className="text-slate-600 font-sans text-[11px] leading-relaxed">
              <strong>Lợi nhuận giữ lại / Tổng tài sản:</strong> Phản ánh tích lũy lợi nhuận tự có tài trợ cho tài sản.
            </p>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-indigo-700 block">X₃ = EBIT / Total Assets</span>
            <p className="text-slate-600 font-sans text-[11px] leading-relaxed">
              <strong>EBIT / Tổng tài sản:</strong> Khả năng tạo lợi nhuận thuần túy của tài sản trước chi phí vốn và thuế.
            </p>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-indigo-700 block">X₄ = Market Equity / Total Debt</span>
            <p className="text-slate-600 font-sans text-[11px] leading-relaxed">
              <strong>Vốn hóa thị trường (Vốn chủ) / Tổng nợ:</strong> Mức độ bảo vệ nợ vay bằng giá trị thị trường của vốn chủ.
            </p>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-indigo-700 block">X₅ = Sales / Total Assets</span>
            <p className="text-slate-600 font-sans text-[11px] leading-relaxed">
              <strong>Doanh thu / Tổng tài sản:</strong> Vòng quay tài sản thể hiện năng lực sinh doanh thu.
            </p>
          </div>

          <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-2">
            <span className="font-bold text-indigo-900 block font-sans">Phân Vùng Đánh Giá Sức Khỏe:</span>
            <div className="space-y-1 text-[11px] font-mono">
              <p className="text-emerald-700 font-bold">🟢 Safe Zone: Z &gt; 2.99 (Sức khỏe an toàn)</p>
              <p className="text-amber-700 font-bold">🟡 Grey Zone: 1.81 &lt; Z ≤ 2.99 (Vùng rủi ro trung bình)</p>
              <p className="text-rose-700 font-bold">🔴 Distress Zone: Z ≤ 1.81 (Nguy cơ kiệt quệ tài chính)</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Contact Card (Email Liên Hệ) ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-indigo-500/30 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 text-indigo-400 font-bold font-mono text-xs uppercase tracking-wider">
              <Mail size={16} /> THÔNG TIN LIÊN HỆ QUẢN TRỊ DỰ ÁN
            </div>
            <h3 className="text-xl font-black text-white font-sans">Bạn có câu hỏi hoặc cần hỗ trợ/hợp tác?</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Mọi góp ý, thắc mắc về hệ thống hoặc nhu cầu tích hợp dữ liệu tài chính vui lòng liên hệ trực tiếp với quản trị viên dự án:
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-3 min-w-[280px]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs sm:text-sm font-bold text-indigo-200 truncate">
                {contactEmail}
              </span>
              <button
                onClick={handleCopyEmail}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer flex-shrink-0"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Đã sao chép!' : 'Copy Email'}
              </button>
            </div>

            <a
              href={`mailto:${contactEmail}?subject=G%E1%BB%9Fi%20y%C3%AAu%20c%E1%BA%A7u%20li%C3%AAn%20h%E1%BB%87%20AWS%20Data%20Lake`}
              className="btn-primary w-full py-2.5 text-xs font-mono font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
            >
              <Mail size={15} /> GỬI EMAIL CHÍNH THỨC
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
