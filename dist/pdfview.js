/*
* @Author: anoduck
* @Date:   2024-09-27 17:22:34
* @Last Modified by:   anoduck
* @Last Modified time: 2024-09-27 17:23:18
*/
(function(){
var url = '{{ .Get "url" }}';

var hidePaginator = "{{ .Get "hidePaginator" }}" === "true";
var hideLoader = "{{ .Get "hideLoader" }}" === "true";
var selectedPageNum = parseInt("{{ .Get "renderPageNum" }}") || 1;

// Loaded via <script> tag, create shortcut to access PDF.js exports.
var pdfjsLib = window['pdfjs-dist/build/pdf'];

// The workerSrc property shall be specified.
if (pdfjsLib.GlobalWorkerOptions.workerSrc == '')
  pdfjsLib.GlobalWorkerOptions.workerSrc = "{{.Site.BaseURL}}" + '/js/pdf-js/build/pdf.worker.js';

// Change the Scale value for lower or higher resolution.
var pdfDoc = null,
    pageNum = selectedPageNum,
    pageRendering = false,
    pageNumPending = null,
    scale = 3,
    canvas = document.getElementById('pdf-canvas-{{ substr (.Get "url" | md5) 0 8 }}'),
    ctx = canvas.getContext('2d'),
    paginator = document.getElementById("pdf-paginator-{{ substr (.Get "url" | md5) 0 8 }}"),
    loadingWrapper = document.getElementById('pdf-loadingWrapper-{{ substr (.Get "url" | md5) 0 8 }}');


// Attempt to show paginator and loader if enabled
showPaginator();
showLoader();

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
  pageRendering = true;
  // Using promise to fetch the page
  pdfDoc.getPage(num).then(function(page) {
    var viewport = page.getViewport({scale: scale});
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page into canvas context
    var renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    var renderTask = page.render(renderContext);

    // Wait for rendering to finish
    renderTask.promise.then(function() {
      pageRendering = false;
      showContent();

      if (pageNumPending !== null) {
        // New page rendering is pending
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });

  // Update page counters
  document.getElementById('pdf-pagenum-{{ substr (.Get "url" | md5) 0 8 }}').textContent = num;
}

/**
 * Hides loader and shows canvas
 */
function showContent() {
  loadingWrapper.style.display = 'none';
  canvas.style.display = 'block';
}

/**
 * If we haven't disabled the loader, show loader and hide canvas
 */
function showLoader() {
  if(hideLoader) return
  loadingWrapper.style.display = 'flex';
  canvas.style.display = 'none';
}

/**
 * If we haven't disabled the paginator, show paginator
 */
function showPaginator() {
  if(hidePaginator) {
    paginator.style.display = 'none';
  }
  else {
    paginator.style.display = 'block';
  }
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finished. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}
document.getElementById('pdf-prev-{{ substr (.Get "url" | md5) 0 8 }}').addEventListener('click', onPrevPage);

/**
 * Displays next page.
 */
function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}
document.getElementById('pdf-next-{{ substr (.Get "url" | md5) 0 8 }}').addEventListener('click', onNextPage);

/**
 * Asynchronously downloads PDF.
 */
pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
  pdfDoc = pdfDoc_;
  var numPages = pdfDoc.numPages;
  document.getElementById('pdf-pagecount-{{ substr (.Get "url" | md5) 0 8 }}').textContent = numPages;

  // If the user passed in a number that is out of range, render the last page.
  if(pageNum > numPages) {
    pageNum = numPages
  }

  // Initial/first page rendering
  renderPage(pageNum);
});
})();