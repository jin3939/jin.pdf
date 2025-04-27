// 指定 PDF.js 的 worker 路徑
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// 初始化變數
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0;
let canvas = null;
let ctx = null;
let lastX = 0;
let lastY = 0;
let dragStart = null;
let viewer = document.getElementById('pdf-viewer');
let isDragging = false;

// 取得元素
const fileInput = document.getElementById('file-input');
const prevButton = document.getElementById('prev-page');
const nextButton = document.getElementById('next-page');
const currentPage = document.getElementById('current-page');
const totalPages = document.getElementById('total-pages');
const zoomIn = document.getElementById('zoom-in');
const zoomOut = document.getElementById('zoom-out');
const fitPage = document.getElementById('fit-page');
const pageTree = document.getElementById('page-tree');

// 監聽檔案選擇
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        loadPDF(file);
    }
});

// 載入PDF
function loadPDF(file) {
    const fileReader = new FileReader();
    
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        
        // 使用 PDF.js 載入 PDF
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            totalPages.textContent = pdf.numPages;
            
            // 啟用按鈕
            prevButton.disabled = false;
            nextButton.disabled = false;
            
            // 載入頁面樹狀結構
            loadPageTree();
            
            // 渲染第一頁
            pageNum = 1;
            renderPage(pageNum);
        });
    };
    
    fileReader.readAsArrayBuffer(file);
}

// 加載頁面樹狀結構
function loadPageTree() {
    pageTree.innerHTML = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const li = document.createElement('li');
        li.textContent = `頁面 ${i}`;
        li.dataset.page = i;
        li.addEventListener('click', function() {
            pageNum = parseInt(this.dataset.page);
            renderPage(pageNum);
        });
        pageTree.appendChild(li);
    }
}

// 渲染PDF頁面
function renderPage(num) {
    pageRendering = true;
    
    // 獲取頁面
    pdfDoc.getPage(num).then(function(page) {
        // 清除上一頁
        while (viewer.firstChild) {
            viewer.removeChild(viewer.firstChild);
        }
        
        // 創建新的 canvas
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d');
        viewer.appendChild(canvas);
        
        // 設定 canvas 比例
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // 渲染 PDF 頁面
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        const renderTask = page.render(renderContext);
        
        // 渲染完成後
        renderTask.promise.then(function() {
            pageRendering = false;
            
            // 更新頁碼
            currentPage.textContent = num;
            
            // 如果有待處理的頁面，渲染它
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });
}

// 顯示上一頁
function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
}

// 顯示下一頁
function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
}

// 頁面渲染排隊
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

// 放大
function onZoomIn() {
    scale *= 1.2;
    renderPage(pageNum);
}

// 縮小
function onZoomOut() {
    scale /= 1.2;
    if (scale < 0.1) scale = 0.1;
    renderPage(pageNum);
}

// 符合頁面
function onFitPage() {
    if (!pdfDoc) return;
    
    // 取得視圖大小
    const viewerRect = viewer.parentElement.getBoundingClientRect();
    const viewerWidth = viewerRect.width - 20; // 減去一些邊距
    
    // 獲取頁面
    pdfDoc.getPage(pageNum).then(function(page) {
        const viewport = page.getViewport({ scale: 1.0 });
        
        // 計算合適的比例
        const newScale = viewerWidth / viewport.width;
        scale = newScale;
        
        renderPage(pageNum);
    });
}

// 滑鼠拖曳功能 - 開始拖曳
viewer.addEventListener('mousedown', function(e) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    viewer.style.cursor = 'grabbing';
});

// 滑鼠拖曳功能 - 拖曳中
viewer.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    // 計算移動距離
    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;
    
    // 移動視圖
    viewer.parentElement.scrollLeft -= deltaX;
    viewer.parentElement.scrollTop -= deltaY;
    
    // 更新最後位置
    lastX = e.clientX;
    lastY = e.clientY;
});

// 滑鼠拖曳功能 - 結束拖曳
viewer.addEventListener('mouseup', function() {
    isDragging = false;
    viewer.style.cursor = 'default';
});

viewer.addEventListener('mouseleave', function() {
    isDragging = false;
    viewer.style.cursor = 'default';
});

// 綁定按鈕事件
prevButton.addEventListener('click', onPrevPage);
nextButton.addEventListener('click', onNextPage);
zoomIn.addEventListener('click', onZoomIn);
zoomOut.addEventListener('click', onZoomOut);
fitPage.addEventListener('click', onFitPage);
