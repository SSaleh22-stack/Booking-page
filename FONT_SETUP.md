# Arabic Font Setup for PDF Generation

The PDF generation requires an Arabic font to display Arabic text correctly. Follow these steps to set up the font:

## Option 1: Automatic Download (Recommended)

Run the download script:
```powershell
powershell -ExecutionPolicy Bypass -File download-font.ps1
```

## Option 2: Manual Download

1. Visit: https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
2. Click "Download family" button
3. Extract the ZIP file
4. Find `NotoSansArabic-Regular.ttf` in the extracted folder
5. Copy it to the `public` folder in your project root
6. The file should be at: `public/NotoSansArabic-Regular.ttf`

## Option 3: Direct Download Link

You can also download directly from:
- https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf

Save it as `public/NotoSansArabic-Regular.ttf`

## Verification

After placing the font file, restart your development server. The PDF generation should now work with Arabic text.

If you still encounter errors, check:
1. The file exists at `public/NotoSansArabic-Regular.ttf`
2. The file is a valid TTF font file
3. Your server has read permissions for the file

