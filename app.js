/**
 * 图片转 Word — Pure frontend, no build tools.
 * CDN deps: docx, saveAs (FileSaver), Sortable — loaded via <script> in index.html.
 */
(function () {
  'use strict';

  /* ========== State ========== */
  const state = {
    images: [],        // { id, file, name, arrayBuffer, objectUrl, naturalWidth, naturalHeight, title }
    settings: {
      perPage: true,
      imageWidth: 600,
      orientation: 'portrait',
      align: 'center',
    },
  };

  /* ========== DOM refs ========== */
  const $ = (s) => document.querySelector(s);
  const uploadZone = $('#uploadZone');
  const fileInput = $('#fileInput');
  const gallery = $('#gallery');
  const countDisplay = $('#countDisplay');
  const clearBtn = $('#clearBtn');
  const settingsPanel = $('#settingsPanel');
  const perPageChk = $('#perPageChk');
  const imgWidthRange = $('#imgWidthRange');
  const imgWidthVal = $('#imgWidthVal');
  const orientationSel = $('#orientationSel');
  const alignSel = $('#alignSel');
  const generateBtn = $('#generateBtn');
  const sizeHint = $('#sizeHint');

  /* ========== Utilities ========== */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function updateStats() {
    const n = state.images.length;
    if (n === 0) {
      countDisplay.textContent = '暂无图片';
      clearBtn.style.display = 'none';
      settingsPanel.style.display = 'none';
      generateBtn.classList.add('empty');
      sizeHint.textContent = '';
    } else {
      countDisplay.textContent = '已上传 ' + n + ' 张图片';
      clearBtn.style.display = '';
      settingsPanel.style.display = '';
      generateBtn.classList.remove('empty');
      const total = state.images.reduce((s, i) => s + i.file.size, 0);
      sizeHint.textContent = '共 ' + n + ' 张图片，总大小 ' + formatSize(total);
    }
  }

  /* ========== Upload ========== */
  function handleFiles(files) {
    const valid = Array.from(files).filter(function (f) { return f.type.startsWith('image/'); });
    var skipped = files.length - valid.length;
    if (skipped > 0) alert('已跳过 ' + skipped + ' 个非图片文件');

    var loaded = 0;
    var total = valid.length;
    var failures = 0;

    valid.forEach(function (file, idx) {
      var objectUrl = URL.createObjectURL(file);
      var img = new Image();

      img.onload = function () {
        var reader = new FileReader();
        reader.onload = function (e) {
          state.images.push({
            id: Date.now() + '-' + idx + '-' + Math.random().toString(36).slice(2, 6),
            file: file,
            name: file.name,
            arrayBuffer: e.target.result,
            objectUrl: objectUrl,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            title: '',
          });
          loaded++;
          if (loaded + failures === total) finishUpload();
        };
        reader.onerror = function () {
          URL.revokeObjectURL(objectUrl);
          failures++;
          if (loaded + failures === total) finishUpload();
        };
        reader.readAsArrayBuffer(file);
      };

      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        failures++;
        if (loaded + failures === total) finishUpload();
      };

      img.src = objectUrl;
    });

    if (total === 0 && skipped > 0) return;
    if (total === 0) return;
  }

  function finishUpload() {
    renderGallery();
    updateStats();
  }

  /* ========== Gallery rendering ========== */
  function renderGallery() {
    if (state.images.length === 0) {
      gallery.innerHTML = '<div class="empty-state">上传图片后会显示在这里</div>';
      return;
    }

    gallery.innerHTML = state.images.map(function (img, i) {
      return '' +
        '<div class="image-card" data-index="' + i + '">' +
          '<div class="drag-handle" title="拖拽排序">⠿</div>' +
          '<button class="delete-btn" data-id="' + img.id + '" title="删除">✕</button>' +
          '<img class="thumbnail" src="' + img.objectUrl + '" alt="' + escapeHtml(img.name) + '" loading="lazy">' +
          '<div class="card-body">' +
            '<input type="text" class="title-input" ' +
                   'placeholder="输入图片标题（可选）" ' +
                   'value="' + escapeHtml(img.title) + '" ' +
                   'data-id="' + img.id + '">' +
          '</div>' +
          '<div class="card-footer">' +
            '<span>' + formatSize(img.file.size) + '</span>' +
            '<span>' + img.naturalWidth + ' × ' + img.naturalHeight + '</span>' +
          '</div>' +
        '</div>';
    }).join('');

    // bind title inputs
    [].forEach.call(gallery.querySelectorAll('.title-input'), function (input) {
      input.addEventListener('input', function (e) {
        var found = state.images.find(function (i) { return i.id === e.target.dataset.id; });
        if (found) found.title = e.target.value;
      });
    });

    // bind delete buttons
    [].forEach.call(gallery.querySelectorAll('.delete-btn'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeImage(e.target.dataset.id);
      });
    });

    initSortable();
  }

  /* ========== Sortable ========== */
  var sortableInstance = null;
  function initSortable() {
    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(gallery, {
      animation: 200,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: function (evt) {
        var item = state.images.splice(evt.oldIndex, 1)[0];
        state.images.splice(evt.newIndex, 0, item);
      },
    });
  }

  /* ========== Remove ========== */
  function removeImage(id) {
    var idx = -1;
    for (var i = 0; i < state.images.length; i++) {
      if (state.images[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    var removed = state.images.splice(idx, 1)[0];
    URL.revokeObjectURL(removed.objectUrl);
    renderGallery();
    updateStats();
  }

  /* ========== Generate .docx ========== */
  function alignToEnum(a) {
    if (a === 'center') return docx.AlignmentType.CENTER;
    if (a === 'left')   return docx.AlignmentType.LEFT;
    return docx.AlignmentType.RIGHT;
  }

  function calcSize(nw, nh, targetW) {
    var ratio = nw / nh;
    var w = targetW;
    var h = Math.round(targetW / ratio);
    if (h > 900) { h = 900; w = Math.round(900 * ratio); }
    return { width: w, height: h };
  }

  async function generateDocument() {
    var images = state.images;
    var s = state.settings;

    if (images.length === 0) {
      alert('请先上传图片');
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ 正在生成文档...';

    try {
      var isLandscape = s.orientation === 'landscape';
      var pageW = isLandscape ? 16838 : 11906;
      var pageH = isLandscape ? 11906 : 16838;

      var children = [];

      images.forEach(function (img, idx) {
        // page break
        if (idx > 0 && s.perPage) {
          children.push(new docx.Paragraph({
            children: [new docx.PageBreak()],
            spacing: { before: 0, after: 0 },
          }));
        }

        // title
        if (img.title && img.title.trim()) {
          children.push(new docx.Paragraph({
            children: [new docx.TextRun({
              text: img.title.trim(),
              bold: true,
              size: 28,
              font: { name: "Microsoft YaHei", hint: "eastAsia" },
              color: "333333",
            })],
            alignment: alignToEnum(s.align),
            spacing: { after: 200 },
          }));
        }

        // image
        var dim = calcSize(img.naturalWidth, img.naturalHeight, s.imageWidth);
        children.push(new docx.Paragraph({
          children: [new docx.ImageRun({
            data: img.arrayBuffer,
            transformation: { width: dim.width, height: dim.height },
          })],
          alignment: alignToEnum(s.align),
          spacing: { before: 100, after: 400 },
        }));
      });

      var doc = new docx.Document({
        title: "图片文档",
        styles: {
          default: {
            document: {
              run: { font: "Microsoft YaHei", size: 22 },
            },
          },
        },
        sections: [{
          properties: {
            page: {
              size: { width: pageW, height: pageH },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: children,
        }],
      });

      var blob = await docx.Packer.toBlob(doc);
      saveAs(blob, '图片文档.docx');
    } catch (err) {
      console.error(err);
      alert('生成失败：' + err.message);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '📥 生成 Word 文档并下载';
    }
  }

  /* ========== Event wiring ========== */
  function init() {
    // upload click
    uploadZone.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function (e) {
      handleFiles(e.target.files);
      fileInput.value = '';
    });

    // drag & drop
    uploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', function () {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    // clear
    clearBtn.addEventListener('click', function () {
      state.images.forEach(function (i) { URL.revokeObjectURL(i.objectUrl); });
      state.images = [];
      renderGallery();
      updateStats();
    });

    // settings bindings
    perPageChk.addEventListener('change', function (e) { state.settings.perPage = e.target.checked; });
    imgWidthRange.addEventListener('input', function (e) {
      state.settings.imageWidth = parseInt(e.target.value);
      imgWidthVal.textContent = e.target.value + 'px';
    });
    orientationSel.addEventListener('change', function (e) { state.settings.orientation = e.target.value; });
    alignSel.addEventListener('change', function (e) { state.settings.align = e.target.value; });

    // generate
    generateBtn.addEventListener('click', generateDocument);

    // initial render
    updateStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
