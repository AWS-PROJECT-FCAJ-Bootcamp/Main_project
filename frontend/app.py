import streamlit as st

st.set_page_config(page_title="Financial Data Lake", page_icon="🏦", layout="wide")

# Tạo Session State
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False
if 'username' not in st.session_state:
    st.session_state['username'] = ''

def login():
    st.session_state['logged_in'] = True
    st.success("Đăng nhập thành công!")

def logout():
    st.session_state['logged_in'] = False
    st.session_state['username'] = ''
    st.info("Đã đăng xuất.")

# --- UI GIAO DIỆN AUTH ---
if not st.session_state['logged_in']:
    st.title("🏦 Financial Research Platform")
    st.markdown("Hệ thống Data Lake phân tích thị trường chứng khoán Việt Nam (Dữ liệu từ VNStock, HOSE, HNX).")
    
    tab1, tab2 = st.tabs(["Đăng nhập", "Đăng ký"])
    
    with tab1:
        st.subheader("Đăng nhập hệ thống")
        username = st.text_input("Tên đăng nhập", key="login_user")
        password = st.text_input("Mật khẩu", type="password", key="login_pass")
        if st.button("Đăng nhập", type="primary"):
            if username and password:
                st.session_state['username'] = username
                login()
                st.rerun() # Load lại trang để vào app
            else:
                st.error("Vui lòng nhập tài khoản và mật khẩu.")
                
    with tab2:
        st.subheader("Tạo tài khoản mới")
        new_user = st.text_input("Tên đăng nhập mới")
        new_pass = st.text_input("Mật khẩu mới", type="password")
        new_email = st.text_input("Email")
        if st.button("Đăng ký"):
            st.success("Tạo tài khoản thành công! Vui lòng đăng nhập.")
else:
    # --- KHI ĐÃ ĐĂNG NHẬP THÀNH CÔNG ---
    st.sidebar.title(f"Xin chào, {st.session_state['username']} 👋")
    st.sidebar.button("Đăng xuất", on_click=logout)
    
    st.sidebar.markdown("---")
    st.sidebar.info("Vui lòng chọn chức năng từ Menu bên trái.")
    
    st.title("Trang chủ Hệ thống")
    st.write("Bạn đã đăng nhập thành công. Các module chức năng (Dashboard, Prediction...) hiện đã khả dụng ở thanh điều hướng.")