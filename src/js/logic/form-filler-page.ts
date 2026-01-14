// Self-contained Form Filler logic for standalone page
import { createIcons, icons } from 'lucide';
import { getPDFDocument, downloadFile } from '../utils/helpers.js';

let viewerIframe: HTMLIFrameElement | null = null;
let viewerReady = false;
let currentFile: File | null = null;
let pdfArrayBuffer: ArrayBuffer | null = null;

// UI helpers
function showLoader(message: string = 'Processing...') {
    const loader = document.getElementById('loader-modal');
    const loaderText = document.getElementById('loader-text');
    if (loader) loader.classList.remove('hidden');
    if (loaderText) loaderText.textContent = message;
}

function hideLoader() {
    const loader = document.getElementById('loader-modal');
    if (loader) loader.classList.add('hidden');
}

function showAlert(title: string, message: string, type: string = 'error', callback?: () => void) {
    const modal = document.getElementById('alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const okBtn = document.getElementById('alert-ok');

    if (alertTitle) alertTitle.textContent = title;
    if (alertMessage) alertMessage.textContent = message;
    if (modal) modal.classList.remove('hidden');

    if (okBtn) {
        const newOkBtn = okBtn.cloneNode(true) as HTMLElement;
        okBtn.replaceWith(newOkBtn);
        newOkBtn.addEventListener('click', () => {
            modal?.classList.add('hidden');
            if (callback) callback();
        });
    }
}

function updateFileDisplay() {
    const displayArea = document.getElementById('file-display-area');
    if (!displayArea || !currentFile) return;

    const fileSize = currentFile.size < 1024 * 1024
        ? `${(currentFile.size / 1024).toFixed(1)} KB`
        : `${(currentFile.size / 1024 / 1024).toFixed(2)} MB`;

    displayArea.innerHTML = `
        <div class="bg-gray-700 p-3 rounded-lg border border-gray-600 hover:border-indigo-500 transition-colors">
            <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                    <p class="truncate font-medium text-white">${currentFile.name}</p>
                    <p class="text-gray-400 text-sm">${fileSize}</p>
                </div>
                <button id="remove-file" class="text-red-400 hover:text-red-300 p-2 flex-shrink-0 ml-2" title="Remove file">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;

    createIcons({ icons });

    document.getElementById('remove-file')?.addEventListener('click', () => resetState());
}

function resetState() {
    viewerIframe = null;
    viewerReady = false;
    currentFile = null;
    pdfArrayBuffer = null;
    const displayArea = document.getElementById('file-display-area');
    if (displayArea) displayArea.innerHTML = '';
    document.getElementById('form-filler-options')?.classList.add('hidden');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    // Clear viewer
    const viewerContainer = document.getElementById('pdf-viewer-container');
    if (viewerContainer) {
        viewerContainer.innerHTML = '';
        viewerContainer.style.height = '';
        viewerContainer.style.aspectRatio = '';
    }

    const toolUploader = document.getElementById('tool-uploader');
    const isFullWidth = localStorage.getItem('fullWidthMode') !== 'false';
    if (toolUploader && !isFullWidth) {
        toolUploader.classList.remove('max-w-6xl');
        toolUploader.classList.add('max-w-2xl');
    }

    // Remove message listener
    window.removeEventListener('message', handleViewerMessage);
}

// Handle messages from the form-viewer iframe
function handleViewerMessage(event: MessageEvent) {
    const { type, data, message, numPages } = event.data;

    switch (type) {
        case 'viewerReady':
            console.log('Form viewer ready, loading PDF...');
            if (pdfArrayBuffer && viewerIframe?.contentWindow) {
                viewerIframe.contentWindow.postMessage(
                    { type: 'loadPDF', data: new Uint8Array(pdfArrayBuffer) },
                    '*'
                );
            }
            break;

        case 'pdfLoaded':
            console.log(`PDF loaded with ${numPages} pages`);
            viewerReady = true;
            hideLoader();
            break;

        case 'error':
            console.error('Form viewer error:', message);
            hideLoader();
            showAlert('Error', message || 'An error occurred while processing the PDF.');
            break;

        case 'downloadPDF':
            console.log('Downloading filled PDF...');
            if (data) {
                const pdfBytes = new Uint8Array(data);
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const filename = currentFile?.name?.replace('.pdf', '-filled.pdf') || 'filled-form.pdf';
                downloadFile(blob, filename);
            }
            break;
    }
}

// File handling
async function handleFileUpload(file: File) {
    if (!file || file.type !== 'application/pdf') {
        showAlert('Error', 'Please upload a valid PDF file.');
        return;
    }

    currentFile = file;
    pdfArrayBuffer = await file.arrayBuffer();
    updateFileDisplay();
    await setupFormViewer();
}

async function adjustViewerHeight(file: File) {
    const viewerContainer = document.getElementById('pdf-viewer-container');
    if (!viewerContainer) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = getPDFDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });

        // Add ~50px for toolbar height
        const aspectRatio = viewport.width / (viewport.height + 50);

        viewerContainer.style.height = 'auto';
        viewerContainer.style.aspectRatio = `${aspectRatio}`;
    } catch (e) {
        console.error('Error adjusting viewer height:', e);
        viewerContainer.style.height = '80vh';
    }
}

async function setupFormViewer() {
    if (!currentFile || !pdfArrayBuffer) return;

    showLoader('Loading PDF form...');
    const pdfViewerContainer = document.getElementById('pdf-viewer-container');

    if (!pdfViewerContainer) {
        console.error('PDF viewer container not found');
        hideLoader();
        return;
    }

    const toolUploader = document.getElementById('tool-uploader');
    // Default to true if not set
    const isFullWidth = localStorage.getItem('fullWidthMode') !== 'false';
    if (toolUploader && !isFullWidth) {
        toolUploader.classList.remove('max-w-2xl');
        toolUploader.classList.add('max-w-6xl');
    }

    try {
        // Apply dynamic height
        await adjustViewerHeight(currentFile);

        pdfViewerContainer.innerHTML = '';

        // Set up message listener for communication with iframe
        window.removeEventListener('message', handleViewerMessage);
        window.addEventListener('message', handleViewerMessage);

        // Create iframe and load form-viewer.html (NOT the standard viewer.html)
        viewerIframe = document.createElement('iframe');
        viewerIframe.src = `${import.meta.env.BASE_URL}pdfjs-viewer/form-viewer.html`;
        viewerIframe.style.width = '100%';
        viewerIframe.style.height = '100%';
        viewerIframe.style.border = 'none';
        viewerIframe.style.minHeight = '600px';

        pdfViewerContainer.appendChild(viewerIframe);

        const formFillerOptions = document.getElementById('form-filler-options');
        if (formFillerOptions) formFillerOptions.classList.remove('hidden');
    } catch (e) {
        console.error('Critical error setting up form filler:', e);
        showAlert('Error', 'Failed to load PDF form viewer.');
        hideLoader();
    }
}

async function processAndDownloadForm() {
    if (!viewerIframe || !viewerReady) {
        showAlert('Viewer not ready', 'Please wait for the form to finish loading.');
        return;
    }

    try {
        // Request the viewer to save and send back the PDF data
        viewerIframe.contentWindow?.postMessage({ type: 'getData' }, '*');
    } catch (e) {
        console.error('Failed to trigger download:', e);
        showAlert('Download', 'Failed to process the form. Please try using the Download button in the viewer toolbar.');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const dropZone = document.getElementById('drop-zone');
    const processBtn = document.getElementById('process-btn');
    const backBtn = document.getElementById('back-to-tools');

    fileInput?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleFileUpload(file);
    });

    dropZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500');
    });

    dropZone?.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-indigo-500');
    });

    dropZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500');
        const file = e.dataTransfer?.files[0];
        if (file) handleFileUpload(file);
    });

    processBtn?.addEventListener('click', processAndDownloadForm);

    backBtn?.addEventListener('click', () => {
        window.location.href = '../../index.html';
    });
});
