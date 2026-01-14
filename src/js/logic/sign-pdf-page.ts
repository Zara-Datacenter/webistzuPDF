import { createIcons, icons } from 'lucide';
import { showAlert, showLoader, hideLoader } from '../ui.js';
import { readFileAsArrayBuffer, formatBytes, downloadFile, getPDFDocument } from '../utils/helpers.js';
import { PDFDocument } from 'pdf-lib';

interface SignState {
    file: File | null;
    pdfDoc: any;
    viewerIframe: HTMLIFrameElement | null;
    viewerReady: boolean;
    blobUrl: string | null;
}

const signState: SignState = {
    file: null,
    pdfDoc: null,
    viewerIframe: null,
    viewerReady: false,
    blobUrl: null,
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

function initializePage() {
    createIcons({ icons });

    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const dropZone = document.getElementById('drop-zone');
    const processBtn = document.getElementById('process-btn');

    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('bg-slate-700/50', 'border-sky-400');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('bg-slate-700/50', 'border-sky-400');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('bg-slate-700/50', 'border-sky-400');
            const droppedFiles = e.dataTransfer?.files;
            if (droppedFiles && droppedFiles.length > 0) {
                handleFile(droppedFiles[0]);
            }
        });

        // Clear value on click to allow re-selecting the same file
        fileInput?.addEventListener('click', () => {
            if (fileInput) fileInput.value = '';
        });
    }

    if (processBtn) {
        processBtn.addEventListener('click', applyAndSaveSignatures);
    }

    document.getElementById('back-to-tools')?.addEventListener('click', () => {
        cleanup();
        window.location.href = import.meta.env.BASE_URL;
    });
}

function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
        handleFile(input.files[0]);
    }
}

function handleFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showAlert('Invalid File', 'Please select a PDF file.');
        return;
    }

    signState.file = file;
    updateFileDisplay();
    setupSignTool();
}

async function updateFileDisplay() {
    const fileDisplayArea = document.getElementById('file-display-area');

    if (!fileDisplayArea || !signState.file) return;

    fileDisplayArea.innerHTML = '';

    const fileDiv = document.createElement('div');
    fileDiv.className = 'flex items-center justify-between bg-slate-700/50 border border-slate-600 p-3 rounded-lg shadow-sm';

    const infoContainer = document.createElement('div');
    infoContainer.className = 'flex flex-col flex-1 min-w-0';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'truncate font-medium text-slate-200 text-sm mb-1';
    nameSpan.textContent = signState.file.name;

    const metaSpan = document.createElement('div');
    metaSpan.className = 'text-xs text-slate-400';
    metaSpan.textContent = `${formatBytes(signState.file.size)} • Loading pages...`;

    infoContainer.append(nameSpan, metaSpan);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'ml-4 text-rose-400 hover:text-rose-300 transition-colors p-1 rounded-md hover:bg-rose-500/10 flex-shrink-0';
    removeBtn.innerHTML = '<i data-lucide=\"trash-2\" class=\"w-4 h-4\"></i>';
    removeBtn.onclick = () => {
        signState.file = null;
        signState.pdfDoc = null;
        fileDisplayArea.innerHTML = '';
        document.getElementById('signature-editor')?.classList.add('hidden');
    };

    fileDiv.append(infoContainer, removeBtn);
    fileDisplayArea.appendChild(fileDiv);
    createIcons({ icons });

    // Load page count
    try {
        const arrayBuffer = await readFileAsArrayBuffer(signState.file);
        const pdfDoc = await getPDFDocument({ data: arrayBuffer }).promise;
        metaSpan.textContent = `${formatBytes(signState.file.size)} • ${pdfDoc.numPages} pages`;
    } catch (error) {
        console.error('Error loading PDF:', error);
    }
}

async function setupSignTool() {
    const signatureEditor = document.getElementById('signature-editor');
    if (signatureEditor) {
        signatureEditor.classList.remove('hidden');
    }

    showLoader('Loading PDF viewer...');

    const container = document.getElementById('canvas-container-sign');
    if (!container) {
        console.error('Sign tool canvas container not found');
        hideLoader();
        return;
    }

    if (!signState.file) {
        console.error('No file loaded for signing');
        hideLoader();
        return;
    }

    container.textContent = '';
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    container.appendChild(iframe);
    signState.viewerIframe = iframe;

    // Use sign-viewer.html which is designed for this specific functionality
    const viewerUrl = new URL(`${import.meta.env.BASE_URL}pdfjs-viewer/sign-viewer.html`, window.location.origin);
    iframe.src = viewerUrl.toString();

    // Set up message listener
    window.removeEventListener('message', handleViewerMessage);
    window.addEventListener('message', handleViewerMessage);
}

async function handleViewerMessage(event: MessageEvent) {
    // Verify origin if needed, but for local/same-origin it's fine

    if (event.data.type === 'viewerReady') {
        signState.viewerReady = true;
        hideLoader();

        // Load the PDF once viewer is ready
        if (signState.file && signState.viewerIframe) {
            try {
                const arrayBuffer = await readFileAsArrayBuffer(signState.file);
                signState.viewerIframe.contentWindow?.postMessage({
                    type: 'loadPDF',
                    data: arrayBuffer
                }, '*');
            } catch (error) {
                console.error('Error reading file for viewer:', error);
                showAlert('Error', 'Failed to load PDF file.');
            }
        }
    } else if (event.data.type === 'pdfLoaded') {
        const saveBtn = document.getElementById('process-btn');
        if (saveBtn) {
            saveBtn.style.display = '';
        }
    } else if (event.data.type === 'downloadPDF') {
        // Handle the signed PDF data returned from the viewer
        const data = event.data.data;
        if (data) {
            const blob = new Blob([new Uint8Array(data)], { type: 'application/pdf' });
            // Check if flattening is requested (this might need backend set processing or specific handling)
            // Currently sign-viewer.html returns the PDF data. 
            // If flattening was checked, we might need a different approach or rely on the viewer's save.

            // For now, save what we got
            downloadFile(blob, `signed_${signState.file?.name || 'document.pdf'}`);

            hideLoader();
            showAlert('Success', 'Signed PDF downloaded successfully!', 'success', () => {
                resetState();
            });
        }
    } else if (event.data.type === 'error') {
        hideLoader();
        showAlert('Error', event.data.message || 'An error occurred in the viewer.');
    }
}

async function applyAndSaveSignatures() {
    if (!signState.viewerReady || !signState.viewerIframe) {
        showAlert('Viewer not ready', 'Please wait for the PDF viewer to load.');
        return;
    }

    showLoader('Processing...');

    // Request "save" from the viewer
    signState.viewerIframe.contentWindow?.postMessage({ type: 'save' }, '*');

    // Note: The actual download will be handled by the 'downloadPDF' message listener
}

function resetState() {
    cleanup();
    signState.file = null;
    signState.viewerIframe = null;
    signState.viewerReady = false;

    const signatureEditor = document.getElementById('signature-editor');
    if (signatureEditor) {
        signatureEditor.classList.add('hidden');
    }

    const container = document.getElementById('canvas-container-sign');
    if (container) {
        container.textContent = '';
    }

    const fileDisplayArea = document.getElementById('file-display-area');
    if (fileDisplayArea) {
        fileDisplayArea.innerHTML = '';
    }

    const processBtn = document.getElementById('process-btn') as HTMLButtonElement | null;
    if (processBtn) {
        processBtn.style.display = 'none';
    }

    const flattenCheckbox = document.getElementById('flatten-signature-toggle') as HTMLInputElement | null;
    if (flattenCheckbox) {
        flattenCheckbox.checked = false;
    }
}

function cleanup() {
    if (signState.blobUrl) {
        URL.revokeObjectURL(signState.blobUrl);
        signState.blobUrl = null;
    }
}
