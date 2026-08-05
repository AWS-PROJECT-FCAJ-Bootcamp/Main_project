"""Quick route check."""
import sys
sys.path.insert(0, '.')
try:
    from src.api.main import app
    routes = [r.path for r in app.routes if hasattr(r, 'path')]
    print(f'✅ Backend OK — {len(routes)} routes')
    for r in routes:
        print(f'  {r}')
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
