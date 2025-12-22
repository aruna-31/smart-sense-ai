
try:
    from app.db import init_db
    init_db()
    print("Init DB successful")
except Exception as e:
    import traceback
    traceback.print_exc()
