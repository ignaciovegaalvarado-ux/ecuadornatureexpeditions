from markitdown import MarkItDown

md = MarkItDown() # Set to True to enable plugins
result = md.convert("HOTELES ECUADOR INGLÉS.docx")
print(result.text_content)