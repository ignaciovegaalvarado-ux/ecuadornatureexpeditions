import markitdown
import sys
import os

# Pide el nombre del archivo
archivo = input("¿Cuál es el archivo a convertir? (ej: hoteles.xlsx, documento.pdf): ")

# Verifica que existe
if not os.path.exists(archivo):
    print(f"❌ Archivo '{archivo}' no encontrado")
    sys.exit()

# Lee y convierte
try:
   with open(archivo, 'rb') as f:
    contenido = f.read()
    
    resultado = markitdown.markitdown(file_path=archivo)
    
    # Genera nombre del archivo de salida
    nombre_base = os.path.splitext(archivo)[0]
    salida = f"{nombre_base}_limpio.md"
    
    # Guarda
    with open(salida, 'w', encoding='utf-8') as f:
        f.write(resultado)
    
    print(f"✓ Convertido: {archivo} → {salida}")

except Exception as e:
    print(f"❌ Error: {e}")