"""
ocr.py — extracts text from uploaded documents using tesseract

handles both images (jpg, png) and pdfs
keeps it simple: file in → text out
"""

import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import os


def extract_text_from_image(file_path: str) -> str:
    """
    read an image file and pull out the text using tesseract.
    returns the raw text as a string.
    """
    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        print(f"ocr failed for {file_path}: {e}")
        return ""


def extract_text_from_pdf(file_path: str) -> str:
    """
    first try native text extraction (fast and accurate for digital pdfs).
    if it fails (e.g., scanned image), fallback to ocr.
    """
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += f"--- page {i + 1} ---\n{page_text.strip()}\n\n"
        
        # if we found a good amount of text, return it
        if len(text.strip()) > 50:
            return text.strip()
    except Exception as e:
        print(f"native pdf extraction failed: {e}")

    # fallback to OCR
    try:
        pages = convert_from_path(file_path)
        all_text = []
        for i, page in enumerate(pages):
            text = pytesseract.image_to_string(page)
            all_text.append(f"--- page {i + 1} ---\n{text.strip()}")
        return "\n\n".join(all_text)
    except Exception as e:
        print(f"pdf ocr failed for {file_path}: {e}")
        return ""


def extract_text(file_path: str) -> str:
    """
    main entry point — figures out the file type and runs the right extractor.
    returns raw text from the document.
    """
    if not os.path.exists(file_path):
        print(f"file not found: {file_path}")
        return ""

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"]:
        return extract_text_from_image(file_path)
    else:
        print(f"unsupported file type: {ext}")
        return ""
