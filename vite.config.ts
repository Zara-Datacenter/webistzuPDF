import { defineConfig, Plugin } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import viteCompression from 'vite-plugin-compression';
import handlebars from 'vite-plugin-handlebars';
import { resolve } from 'path';
import fs from 'fs';
import { constants as zlibConstants } from 'zlib';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function pagesRewritePlugin(): Plugin {
  const rewriteMiddleware = (req: any, res: any, next: any) => {
    const url = req.url?.split('?')[0] || '';

    const langMatch = url.match(
      /^\/(en|de|es|zh|zh-TW|vi|it|id|tr|fr|pt)(\/.*)?$/
    );
    if (langMatch) {
      const lang = langMatch[1];
      const restOfPath = langMatch[2] || '/';

      if (!langMatch[2]) {
        res.writeHead(302, { Location: `/${lang}/` });
        res.end();
        return;
      }
      if (restOfPath === '/') {
        req.url = '/index.html';
        return next();
      }
      const pagePath = restOfPath.slice(1);
      if (pagePath.endsWith('.html')) {
        const srcPath = resolve(__dirname, 'src/pages', pagePath);
        const rootPath = resolve(__dirname, pagePath);
        const distPath = resolve(__dirname, 'dist', pagePath);
        if (fs.existsSync(srcPath)) {
          req.url = `/src/pages/${pagePath}`;
        } else if (fs.existsSync(distPath)) {
          req.url = `/${pagePath}`;
        } else if (fs.existsSync(rootPath)) {
          req.url = `/${pagePath}`;
        } else {
          req.url = `/${pagePath}`;
        }
      } else if (!pagePath.includes('.')) {
        const htmlPath = pagePath + '.html';
        const srcPath = resolve(__dirname, 'src/pages', htmlPath);
        const rootPath = resolve(__dirname, htmlPath);
        const distPath = resolve(__dirname, 'dist', htmlPath);
        if (fs.existsSync(srcPath)) {
          req.url = `/src/pages/${htmlPath}`;
        } else if (fs.existsSync(distPath)) {
          req.url = `/${htmlPath}`;
        } else if (fs.existsSync(rootPath)) {
          req.url = `/${htmlPath}`;
        } else {
          req.url = `/${htmlPath}`;
        }
      } else {
        req.url = restOfPath;
      }
      return next();
    }
    if (url.endsWith('.html') && !url.startsWith('/src/')) {
      const pageName = url.slice(1);
      const pagePath = resolve(__dirname, 'src/pages', pageName);
      if (fs.existsSync(pagePath)) {
        req.url = `/src/pages${url}`;
      } else if (
        url !== '/404.html' &&
        !fs.existsSync(resolve(__dirname, pageName))
      ) {
        const rootExists = fs.existsSync(resolve(__dirname, pageName));
        const publicExists = fs.existsSync(resolve(__dirname, 'public', pageName));
        if (!rootExists && !publicExists) {
          req.url = '/404.html';
        }
      }
    }
    next();
  };

  return {
    name: 'pages-rewrite',
    configureServer(server) {
      server.middlewares.use(rewriteMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0] || '';
        const langMatch = url.match(
          /^\/(en|de|es|zh|zh-TW|vi|it|id|tr|fr|pt)(\/.*)?$/
        );

        if (langMatch && langMatch[2]) {
          const restOfPath = langMatch[2];
          if (restOfPath !== '/') {
            const pagePath = restOfPath.slice(1);
            if (pagePath.endsWith('.html')) {
              const distPath = resolve(__dirname, 'dist', pagePath);
              if (fs.existsSync(distPath)) {
                const content = fs.readFileSync(distPath, 'utf-8');
                res.setHeader('Content-Type', 'text/html');
                res.end(content);
                return;
              }
            }
          }
        }
        next();
      });
    },
  };
}

function flattenPagesPlugin(): Plugin {
  return {
    name: 'flatten-pages',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (fileName.startsWith('src/pages/') && fileName.endsWith('.html')) {
          const newFileName = fileName.replace('src/pages/', '');
          bundle[newFileName] = bundle[fileName];
          bundle[newFileName].fileName = newFileName;
          delete bundle[fileName];
        }
      }
      if (process.env.SIMPLE_MODE === 'true' && bundle['simple-index.html']) {
        bundle['index.html'] = bundle['simple-index.html'];
        bundle['index.html'].fileName = 'index.html';
        delete bundle['simple-index.html'];
      }
    },
  };
}

function rewriteHtmlPathsPlugin(): Plugin {
  const baseUrl = process.env.BASE_URL || '/';
  const normalizedBase = baseUrl.replace(/\/?$/, '/');

  const escapedBase = normalizedBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return {
    name: 'rewrite-html-paths',
    enforce: 'post',
    generateBundle(_, bundle) {
      if (normalizedBase === '/') return;

      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith('.html')) {
          const asset = bundle[fileName];
          if (asset.type === 'asset' && typeof asset.source === 'string') {
            const hrefRegex = new RegExp(
              `href="\\/(?!${escapedBase.slice(1)}|test\\/|http|\\/\\/)`,
              'g'
            );
            const srcRegex = new RegExp(
              `src="\\/(?!${escapedBase.slice(1)}|test\\/|http|\\/\\/)`,
              'g'
            );
            const contentRegex = new RegExp(
              `content="\\/(?!${escapedBase.slice(1)}|test\\/|http|\\/\\/)`,
              'g'
            );

            asset.source = asset.source
              .replace(hrefRegex, `href="${normalizedBase}`)
              .replace(srcRegex, `src="${normalizedBase}`)
              .replace(contentRegex, `content="${normalizedBase}`);
          }
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const USE_CDN = process.env.VITE_USE_CDN === 'true';

  if (USE_CDN) {
    console.log('[Vite] Using CDN for WASM files (with local fallback)');
  } else {
    console.log('[Vite] Using local WASM files only');
  }

  const staticCopyTargets = [
    {
      src: 'node_modules/@bentopdf/pymupdf-wasm/assets/*.wasm',
      dest: 'pymupdf-wasm',
    },
    {
      src: 'node_modules/@bentopdf/pymupdf-wasm/assets/*.js',
      dest: 'pymupdf-wasm',
    },
    {
      src: 'node_modules/@bentopdf/pymupdf-wasm/assets/*.whl',
      dest: 'pymupdf-wasm',
    },
    {
      src: 'node_modules/@bentopdf/pymupdf-wasm/assets/*.zip',
      dest: 'pymupdf-wasm',
    },
    {
      src: 'node_modules/@bentopdf/pymupdf-wasm/assets/*.json',
      dest: 'pymupdf-wasm',
    },
    {
      src: 'node_modules/@bentopdf/gs-wasm/assets/*.wasm',
      dest: 'ghostscript-wasm',
    },
    {
      src: 'node_modules/@bentopdf/gs-wasm/assets/*.js',
      dest: 'ghostscript-wasm',
    },
    {
      src: 'node_modules/embedpdf-snippet/dist/pdfium.wasm',
      dest: 'embedpdf',
    },
  ];

  return {
    base: (process.env.BASE_URL || '/').replace(/\/?$/, '/'),
    plugins: [
      handlebars({
        partialDirectory: resolve(__dirname, 'src/partials'),
      }),
      pagesRewritePlugin(),
      flattenPagesPlugin(),
      rewriteHtmlPathsPlugin(),
      tailwindcss(),
      nodePolyfills({
        include: ['buffer', 'stream', 'util', 'zlib', 'process'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      viteStaticCopy({
        targets: staticCopyTargets,
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
        compressionOptions: {
          params: {
            [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
            [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
          },
        },
        deleteOriginFile: false,
      }),
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
        compressionOptions: {
          level: 9,
        },
        deleteOriginFile: false,
      }),
    ],
    define: {
      __SIMPLE_MODE__: JSON.stringify(process.env.SIMPLE_MODE === 'true'),
    },
    resolve: {
      alias: {
        '@/types': resolve(__dirname, 'src/js/types/index.ts'),
        stream: 'stream-browserify',
        zlib: 'browserify-zlib',
      },
    },
    optimizeDeps: {
      include: ['pdfkit', 'blob-stream'],
      exclude: ['coherentpdf'],
    },
    server: {
      host: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    build: {
      rollupOptions: {
        input: {
          main:
            process.env.SIMPLE_MODE === 'true'
              ? 'simple-index.html'
              : 'index.html',
          about: 'about.html',
          contact: 'contact.html',
          faq: 'faq.html',
          privacy: 'privacy.html',
          terms: 'terms.html',
          licensing: 'licensing.html',
          tools: 'tools.html',
          '404': '404.html',
          // Category Hub Pages
          'pdf-converter': 'pdf-converter.html',
          'pdf-editor': 'pdf-editor.html',
          'pdf-security': 'pdf-security.html',
          'pdf-merge-split': 'pdf-merge-split.html',
          // Tool Pages
          bookmark: 'src/pages/bookmark.html',
          'table-of-contents': 'src/pages/table-of-contents.html',
          'pdf-to-json': 'src/pages/pdf-to-json.html',
          'json-to-pdf': 'src/pages/json-to-pdf.html',
          'pdf-multi-tool': 'src/pages/pdf-multi-tool.html',
          'add-stamps': 'src/pages/add-stamps.html',
          'form-creator': 'src/pages/form-creator.html',
          'repair-pdf': 'src/pages/repair-pdf.html',
          'merge-pdf': 'src/pages/merge-pdf.html',
          'split-pdf': 'src/pages/split-pdf.html',
          'compress-pdf': 'src/pages/compress-pdf.html',
          'edit-pdf': 'src/pages/edit-pdf.html',
          'jpg-to-pdf': 'src/pages/jpg-to-pdf.html',
          'sign-pdf': 'src/pages/sign-pdf.html',
          'crop-pdf': 'src/pages/crop-pdf.html',
          'extract-pages': 'src/pages/extract-pages.html',
          'delete-pages': 'src/pages/delete-pages.html',
          'organize-pdf': 'src/pages/organize-pdf.html',
          'page-numbers': 'src/pages/page-numbers.html',
          'add-watermark': 'src/pages/add-watermark.html',
          'header-footer': 'src/pages/header-footer.html',
          'invert-colors': 'src/pages/invert-colors.html',
          'background-color': 'src/pages/background-color.html',
          'text-color': 'src/pages/text-color.html',
          'remove-annotations': 'src/pages/remove-annotations.html',
          'remove-blank-pages': 'src/pages/remove-blank-pages.html',
          'image-to-pdf': 'src/pages/image-to-pdf.html',
          'png-to-pdf': 'src/pages/png-to-pdf.html',
          'webp-to-pdf': 'src/pages/webp-to-pdf.html',
          'svg-to-pdf': 'src/pages/svg-to-pdf.html',
          'form-filler': 'src/pages/form-filler.html',
          'reverse-pages': 'src/pages/reverse-pages.html',
          'add-blank-page': 'src/pages/add-blank-page.html',
          'divide-pages': 'src/pages/divide-pages.html',
          'rotate-pdf': 'src/pages/rotate-pdf.html',
          'rotate-custom': 'src/pages/rotate-custom.html',
          'n-up-pdf': 'src/pages/n-up-pdf.html',
          'combine-single-page': 'src/pages/combine-single-page.html',
          'view-metadata': 'src/pages/view-metadata.html',
          'edit-metadata': 'src/pages/edit-metadata.html',
          'pdf-to-zip': 'src/pages/pdf-to-zip.html',
          'alternate-merge': 'src/pages/alternate-merge.html',
          'compare-pdfs': 'src/pages/compare-pdfs.html',
          'add-attachments': 'src/pages/add-attachments.html',
          'edit-attachments': 'src/pages/edit-attachments.html',
          'extract-attachments': 'src/pages/extract-attachments.html',
          'ocr-pdf': 'src/pages/ocr-pdf.html',
          'posterize-pdf': 'src/pages/posterize-pdf.html',
          'fix-page-size': 'src/pages/fix-page-size.html',
          'remove-metadata': 'src/pages/remove-metadata.html',
          'decrypt-pdf': 'src/pages/decrypt-pdf.html',
          'flatten-pdf': 'src/pages/flatten-pdf.html',
          'encrypt-pdf': 'src/pages/encrypt-pdf.html',
          'linearize-pdf': 'src/pages/linearize-pdf.html',
          'remove-restrictions': 'src/pages/remove-restrictions.html',
          'change-permissions': 'src/pages/change-permissions.html',
          'sanitize-pdf': 'src/pages/sanitize-pdf.html',
          'page-dimensions': 'src/pages/page-dimensions.html',
          'bmp-to-pdf': 'src/pages/bmp-to-pdf.html',
          'heic-to-pdf': 'src/pages/heic-to-pdf.html',
          'tiff-to-pdf': 'src/pages/tiff-to-pdf.html',
          'txt-to-pdf': 'src/pages/txt-to-pdf.html',
          'markdown-to-pdf': 'src/pages/markdown-to-pdf.html',
          'pdf-to-bmp': 'src/pages/pdf-to-bmp.html',
          'pdf-to-greyscale': 'src/pages/pdf-to-greyscale.html',
          'pdf-to-jpg': 'src/pages/pdf-to-jpg.html',
          'pdf-to-png': 'src/pages/pdf-to-png.html',
          'pdf-to-tiff': 'src/pages/pdf-to-tiff.html',
          'pdf-to-webp': 'src/pages/pdf-to-webp.html',
          'pdf-to-docx': 'src/pages/pdf-to-docx.html',
          'extract-images': 'src/pages/extract-images.html',
          'pdf-to-markdown': 'src/pages/pdf-to-markdown.html',
          'rasterize-pdf': 'src/pages/rasterize-pdf.html',
          'prepare-pdf-for-ai': 'src/pages/prepare-pdf-for-ai.html',
          'pdf-layers': 'src/pages/pdf-layers.html',
          'pdf-to-pdfa': 'src/pages/pdf-to-pdfa.html',
          'odt-to-pdf': 'src/pages/odt-to-pdf.html',
          'csv-to-pdf': 'src/pages/csv-to-pdf.html',
          'rtf-to-pdf': 'src/pages/rtf-to-pdf.html',
          'word-to-pdf': 'src/pages/word-to-pdf.html',
          'excel-to-pdf': 'src/pages/excel-to-pdf.html',
          'powerpoint-to-pdf': 'src/pages/powerpoint-to-pdf.html',
          'pdf-booklet': 'src/pages/pdf-booklet.html',
          'xps-to-pdf': 'src/pages/xps-to-pdf.html',
          'mobi-to-pdf': 'src/pages/mobi-to-pdf.html',
          'epub-to-pdf': 'src/pages/epub-to-pdf.html',
          'fb2-to-pdf': 'src/pages/fb2-to-pdf.html',
          'cbz-to-pdf': 'src/pages/cbz-to-pdf.html',
          'wpd-to-pdf': 'src/pages/wpd-to-pdf.html',
          'wps-to-pdf': 'src/pages/wps-to-pdf.html',
          'xml-to-pdf': 'src/pages/xml-to-pdf.html',
          'pages-to-pdf': 'src/pages/pages-to-pdf.html',
          'odg-to-pdf': 'src/pages/odg-to-pdf.html',
          'ods-to-pdf': 'src/pages/ods-to-pdf.html',
          'odp-to-pdf': 'src/pages/odp-to-pdf.html',
          'pub-to-pdf': 'src/pages/pub-to-pdf.html',
          'vsd-to-pdf': 'src/pages/vsd-to-pdf.html',
          'psd-to-pdf': 'src/pages/psd-to-pdf.html',
          'pdf-to-svg': 'src/pages/pdf-to-svg.html',
          'extract-tables': 'src/pages/extract-tables.html',
          'pdf-to-csv': 'src/pages/pdf-to-csv.html',
          'pdf-to-excel': 'src/pages/pdf-to-excel.html',
          'pdf-to-text': 'src/pages/pdf-to-text.html',
          'digital-sign-pdf': 'src/pages/digital-sign-pdf.html',
          'validate-signature-pdf': 'src/pages/validate-signature-pdf.html',
          'email-to-pdf': 'src/pages/email-to-pdf.html',
          'font-to-outline': 'src/pages/font-to-outline.html',
          'deskew-pdf': 'src/pages/deskew-pdf.html',
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/tests/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/tests/',
          '*.config.ts',
          '**/*.d.ts',
          'dist/',
        ],
      },
    },
  };
});
