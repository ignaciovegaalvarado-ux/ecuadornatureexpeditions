from markitdown import markitdown
import os

# Pide el archivo
archivo = input("¿Cuál es el archivo a convertir? (ej: hoteles.xlsx, documento.pdf): ")

# Verifica que existe
if not os.path.exists(archivo):
    print(f"❌ Archivo '{archivo}' no encontrado")
else:
    try:
        # Convierte usando la clase correcta
        md = markitdown.MarkItDown()
        resultado = md.convert(archivo)
        
        # Genera nombre de salida
        nombre_base = os.path.splitext(archivo)[0]
        salida = f"{nombre_base}_limpio.md"
        
        # Guarda
        with open(salida, 'w', encoding='utf-8') as f:
            f.write(resultado)
        
        print(f"✓ Convertido: {archivo} → {salida}")
        print(f"Primeras 300 caracteres:")
        print(resultado[:300])
        
    except Exception as e:
        print(f"❌ Error: {e}")