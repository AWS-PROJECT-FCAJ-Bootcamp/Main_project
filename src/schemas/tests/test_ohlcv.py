import os
import pandas as pd
from src.schemas.ohlcv import DailyStockPrice
from pydantic import ValidationError

def test_raw_data_validation():
    # 1. Lấy đường dẫn của chính thư mục chứa file test này (src/schemas/tests)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Giả lập 2 nơi bạn có thể đã cất file CSV
    path_in_tests = os.path.join(current_dir, "ohlcv_samples_10_tickers.csv")
    path_in_root = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))), "ohlcv_samples_10_tickers.csv")
    
    # 2. Tự động check xem file đang nằm ở đâu để đọc
    if os.path.exists(path_in_root):
        csv_path = path_in_root
    elif os.path.exists(path_in_tests):
        csv_path = path_in_tests
    else:
        print(f"❌ LỖI: Không tìm thấy file CSV ở cả thư mục gốc lẫn thư mục tests!")
        print(f"Đã tìm ở gốc: {path_in_root}")
        print(f"Đã tìm ở tests: {path_in_tests}")
        return

    print(f"📖 Tìm thấy dữ liệu! Đang đọc file từ: {csv_path}")
    df_raw = pd.read_csv(csv_path)
    row_0 = df_raw.iloc[0].to_dict()
    
    print("\n--- Bắt đầu test chốt chặn Pydantic ---")
    try:
        # 3. Cố tình nhét data thô vào khuôn kiểm duyệt
        validated_data = DailyStockPrice(**row_0)
        print("LẠ QUÁ: Dữ liệu lọt qua được!")
    except ValidationError as e:
        # 4. Bắt lỗi thành công
        print("✅ BẮT LỖI THÀNH CÔNG! Dữ liệu thô của Dương đã bị chặn lại.")
        print(f"\n🔍 Chi tiết các trường sai hợp đồng:\n{e}")

if __name__ == "__main__":
    test_raw_data_validation()