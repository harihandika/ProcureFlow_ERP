import os
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
import logging
from config import DATABASE_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize connection pool
try:
    connection_pool = psycopg2.pool.SimpleConnectionPool(1, 5, dsn=DATABASE_URL)
    if connection_pool:
        logger.info("Connection pool created successfully")
except Exception as e:
    logger.error(f"Error creating connection pool: {e}")
    connection_pool = None

def get_connection():
    if connection_pool:
        try:
            return connection_pool.getconn()
        except Exception as e:
            logger.error(f"Error getting connection from pool: {e}")
            raise
    else:
        raise Exception("Connection pool is not initialized")

def release_connection(conn):
    if connection_pool and conn:
        try:
            connection_pool.putconn(conn)
        except Exception as e:
            logger.error(f"Error releasing connection to pool: {e}")

def close_pool():
    if connection_pool:
        connection_pool.closeall()
        logger.info("Connection pool closed")

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        release_connection(conn)
