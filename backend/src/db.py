import psycopg2

from src.app_config import app_config


def get_db():
    conn = psycopg2.connect(
        dbname=app_config.DB_NAME,
        user=app_config.DB_USER,
        password=app_config.DB_PASS,
        host=app_config.DB_HOST,
        port=app_config.DB_PORT,
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
