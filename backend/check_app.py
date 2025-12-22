
try:
    from app.main import app
    print("Import successful")
except Exception as e:
    import traceback
    traceback.print_exc()
