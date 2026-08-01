# Ícones do PWA

Coloque aqui os PNGs referenciados no `manifest.webmanifest`:

- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `icon-maskable-512.png` (512×512, com margem de segurança ~10% para "maskable")

Gere a partir de `icon-source.svg` (incluído). Ex. com sharp/imagemagick:

```bash
# ImageMagick
convert -background none icon-source.svg -resize 192x192 icon-192.png
convert -background none icon-source.svg -resize 512x512 icon-512.png
convert -background none icon-source.svg -resize 512x512 icon-maskable-512.png
```

No app Next.js, copie estes arquivos para `public/icons/` e o manifest para `public/`.
