# Main_project
 
## Cấu hình trước khi chạy
```bash
pip install virtualenv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Lệnh chạy
```bash
cd frontend
streamlit run app.py
```

## Cấu trúc file
```text
Demo_Project/
├── .gitignore              
├── README.md               
├── requirements.txt        
└── frontend/               
    ├── .streamlit/         # Cấu hình giao diện Streamlit
    │   └── config.toml     # File cấu hình tùy chỉnh
    ├── app.py              # File chạy chính (Main Entry Point)
    ├── utils/              
    │   ├── auth.py         
    │   └── mock_data.py    
    └── views/              
        ├── __init__.py     
        ├── auth/           
        │   ├── login.py    
        │   └── register.py 
        ├── dashboard.py    
        ├── indicators.py   
        ├── portfolio.py    
        ├── prediction.py   
        └── settings.py     
```