from zipfile import ZipFile
import base64
import json

docx_path = "HOTELES ECUADOR INGLÉS - copia.docx"
images_data = {}

with ZipFile(docx_path) as docx:
    for file in docx.namelist():
        if 'media' in file and any(file.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif']):
            img_bytes = docx.read(file)
            images_data[file] = base64.b64encode(img_bytes).decode()
            print(f"Extracted: {file} ({len(img_bytes)} bytes)")

# Save as JSON (share this file instead of DOCX)
with open('images.json', 'w') as f:
    json.dump(images_data, f)

    
    