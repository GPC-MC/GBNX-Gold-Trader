import psycopg2
from fastapi import HTTPException

from src.app_config import app_config


def get_db():
    try:
        conn = psycopg2.connect(
            dbname=app_config.DB_NAME,
            user=app_config.DB_USER,
            password=app_config.DB_PASS,
            host=app_config.DB_HOST,
            port=app_config.DB_PORT,
        )
    except psycopg2.OperationalError as e:
        raise HTTPException(503, detail=f"Database unavailable: {e}")

    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
