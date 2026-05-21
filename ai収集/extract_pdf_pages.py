"""PDF→ページ画像抽出ヘルパー。指定ページを extracted_pages/ にJPG保存。"""
import sys
import os
import pypdfium2 as pdfium

PDF_DIR = os.path.join(os.path.dirname(__file__), "rashinban_pdfs", "スロット営業資料")
OUT_DIR = os.path.join(os.path.dirname(__file__), "rashinban_pdfs", "extracted_pages")

os.makedirs(OUT_DIR, exist_ok=True)


def extract(pdf_name: str, slug: str, pages):
    pdf_path = os.path.join(PDF_DIR, pdf_name)
    pdf = pdfium.PdfDocument(pdf_path)
    n = len(pdf)
    saved = []
    for p in pages:
        if p < 1 or p > n:
            continue
        page = pdf[p - 1]
        bm = page.render(scale=1.6)
        img = bm.to_pil()
        out = os.path.join(OUT_DIR, f"{slug}_p{p:02d}.jpg")
        img.convert("RGB").save(out, "JPEG", quality=82)
        saved.append(out)
    print(f"{slug}: {len(saved)} pages / total={n}")
    for s in saved:
        print("  ", os.path.basename(s))


if __name__ == "__main__":
    # 引数: pdf_name slug pages_csv
    pdf_name = sys.argv[1]
    slug = sys.argv[2]
    pages = [int(x) for x in sys.argv[3].split(",")]
    extract(pdf_name, slug, pages)
