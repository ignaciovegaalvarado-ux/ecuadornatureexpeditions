
import markitdown

# Lee el archivo de hoteles
with open('HOTELES_ECUADOR_INGLE_S.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Convierte a markdown limpio
resultado = markitdown.convert(content)

# Guarda el resultado
with open('hoteles_limpio.md', 'w', encoding='utf-8') as f:
    f.write(resultado)

print("✓ Hoteles procesados y guardados en hoteles_limpio.md")
