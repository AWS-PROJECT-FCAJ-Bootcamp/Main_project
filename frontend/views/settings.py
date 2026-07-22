import streamlit as st

def render(): # Đã xóa tham số search_query và selected_ticker
    # Tiêu đề module chuẩn Terminal
    st.markdown("""
        <div style='border-left: 4px solid #64748b; padding-left: 12px; margin-bottom: 20px;'>
            <span style='font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase;'>System Settings</span>
            <span style='color: #64748b; font-weight: 600; margin-left: 8px;'>// SECURITY & CONFIGURATION</span>
        </div>
    """, unsafe_allow_html=True)

    # Chia layout: Bên trái là các tab điều hướng, bên phải là nội dung form
    tab_security, tab_general = st.tabs(["🔐 Security", "⚙️ General Preferences"])

    with tab_security:
        with st.container(border=True):
            st.markdown("##### Change Password")
            st.markdown("Ensure your account is using a long, random password to stay secure.")
            
            # Form đổi mật khẩu
            with st.form("password_change_form"):
                current_password = st.text_input("Current Password", type="password")
                new_password = st.text_input("New Password", type="password")
                confirm_password = st.text_input("Confirm New Password", type="password")
                
                submitted = st.form_submit_button("Update Password")
                
                if submitted:
                    if new_password != confirm_password:
                        st.error("Passwords do not match!")
                    elif len(new_password) < 8:
                        st.warning("Password must be at least 8 characters long.")
                    else:
                        # Logic xử lý API ở đây
                        st.success("Password updated successfully!")

    with tab_general:
        with st.container(border=True):
            st.markdown("##### Preferences")
            st.checkbox("Enable Two-Factor Authentication (2FA)", value=True)
            st.checkbox("Receive Email Notifications for Alerts", value=True)