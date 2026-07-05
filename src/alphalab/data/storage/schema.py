"""
alphalab.data.storage.schema
============================
Defines the SchemaManager to initialize database table layouts.
"""

import logging

import duckdb

logger = logging.getLogger("alphalab.data.storage.schema")


class SchemaManager:
    """Manages table definition and validation for the storage engine."""

    def initialize_schema(self, conn: duckdb.DuckDBPyConnection) -> None:
        """Create analytical tables in the database if they do not exist.

        Args:
            conn: A DuckDB connection object.
        """
        logger.info("[DataIngestion] [SchemaManager] Initializing DuckDB schema")

        # Create ohlcv table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ohlcv (
                ticker VARCHAR NOT NULL,
                date DATE NOT NULL,
                open DOUBLE,
                high DOUBLE,
                low DOUBLE,
                close DOUBLE,
                volume BIGINT,
                adj_close DOUBLE,
                PRIMARY KEY (ticker, date)
            )
            """
        )
        logger.debug("[DataIngestion] [SchemaManager] Table 'ohlcv' initialized")

        # Create universe table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS universe (
                ticker VARCHAR NOT NULL,
                index_name VARCHAR NOT NULL,
                effective_from DATE NOT NULL,
                effective_to DATE,
                PRIMARY KEY (ticker, index_name, effective_from)
            )
            """
        )
        logger.debug("[DataIngestion] [SchemaManager] Table 'universe' initialized")
        logger.info("[DataIngestion] [SchemaManager] Schema initialization complete")
