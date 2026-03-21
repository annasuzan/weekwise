"""
PDF text extraction module.

Uses pdfplumber to extract text from uploaded PDF files.
Handles multi-page documents and basic text cleaning.
"""

import pdfplumber
import io
from typing import Optional


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract all text from a PDF file.

    Args:
        pdf_bytes: Raw bytes of the PDF file.

    Returns:
        Combined text from all pages, separated by newlines.
    """
    text_parts = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text.strip())

    return "\n\n".join(text_parts)


def extract_tables_from_pdf(pdf_bytes: bytes) -> list:
    """
    Extract tables from a PDF file (useful for grading breakdowns).

    Args:
        pdf_bytes: Raw bytes of the PDF file.

    Returns:
        List of tables, where each table is a list of rows (list of strings).
    """
    tables = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables()
            if page_tables:
                tables.extend(page_tables)

    return tables
