let cvReady = false;
let classifier = null;
let originalImage = null;
let originalImageData = null; // ★ canvasのImageDataも保存

// ★ 顔の位置を保存して再利用する
let savedFaces = [];

// OpenCV Ready
window.onOpenCvReady = onOpenCvReady;

function onOpenCvReady() {
    if (typeof cv === "undefined") {
        console.error("cv is undefined");
        return;
    }

    cv['onRuntimeInitialized'] = () => {
        startApp();
    };

    if (cv.Mat) startApp();
}

function startApp() {
    document.getElementById("status").innerText = "OpenCV.js 読み込み完了。ファイルを選んでください。";

    loadCascade("haarcascade_frontalface_default.xml")
        .then(() => {
            cvReady = true;
            setupEvents();
        })
        .catch(err => printError(err));
}

function loadCascade(path) {
    return new Promise((resolve, reject) => {
        let request = new XMLHttpRequest();
        request.open("GET", path, true);
        request.responseType = "arraybuffer";
        request.onload = () => {
            if (request.status === 200) {
                let data = new Uint8Array(request.response);
                cv.FS_createDataFile("/", path, data, true, false, false);
                classifier = new cv.CascadeClassifier();
                if (classifier.load(path)) resolve();
                else reject("Cascade load failed");
            } else reject("HTTP status " + request.status);
        };
        request.onerror = () => reject("XHR Error");
        request.send();
    });
}

function setupEvents() {
    const fileInput = document.getElementById("fileInput");
    const minNeighborsSlider = document.getElementById("minNeighbors");
    const minNeighborsValue = document.getElementById("minNeighborsValue");
    const scaleFactorSlider = document.getElementById("scaleFactor");
    const scaleFactorValue = document.getElementById("scaleFactorValue");

    fileInput.addEventListener("change", (e) => {
        if (!cvReady) return;

        const file = e.target.files[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        loadImage(url);
    });

    // minNeighborsスライダーの変更
    minNeighborsSlider.addEventListener("input", (e) => {
        minNeighborsValue.textContent = e.target.value;
        
        // 画像が読み込まれていれば再検出
        if (originalImage) {
            detectAndSaveFaces(originalImage);
            processImage(document.getElementById("canvas"));
        }
    });

    // scaleFactorスライダーの変更
    scaleFactorSlider.addEventListener("input", (e) => {
        scaleFactorValue.textContent = e.target.value;
        
        // 画像が読み込まれていれば再検出
        if (originalImage) {
            detectAndSaveFaces(originalImage);
            processImage(document.getElementById("canvas"));
        }
    });

    // チェックボックスで再描画
    document.querySelectorAll("#effects input[type='checkbox']").forEach(cb => {
        cb.addEventListener("change", () => {
            if (originalImage) {
                processImage(document.getElementById("canvas"));
            }
        });
    });

    document.getElementById("download").addEventListener("click", downloadImage);
}

function loadImage(imgUrl) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // ★ canvasのImageDataを保存（これは絶対に変更されない）
        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // ★ 元の画像を保存
        if (originalImage) {
            originalImage.delete(); // 前の画像を削除
        }
        originalImage = cv.imread(canvas);

        // ★ 顔を1回だけ検出して保存
        detectAndSaveFaces(originalImage);

        // 最初は元画像のまま表示（加工しない）
        document.getElementById("status").innerText = "画像を読み込みました。エフェクトを選択してください。";
        document.getElementById("download").disabled = false;
    };

    img.src = imgUrl;
}

// ★ 1回だけ顔を検出して savedFaces に保存
function detectAndSaveFaces(mat) {
    savedFaces = [];  // 初期化

    const gray = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

    const faces = new cv.RectVector();
    // スライダーから minNeighbors と scaleFactor の値を取得
    const minNeighbors = parseInt(document.getElementById("minNeighbors").value);
    const scaleFactor = parseFloat(document.getElementById("scaleFactor").value);
    classifier.detectMultiScale(gray, faces, scaleFactor, minNeighbors, 0);

    for (let i = 0; i < faces.size(); i++) {
        const f = faces.get(i);
        savedFaces.push({
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height
        });
    }

    gray.delete();
    faces.delete();
}

function processImage(canvas) {
    if (!originalImage) return;

    // チェック状態
    const fx_mosaic = document.getElementById("fx_mosaic").checked;
    const fx_blur = document.getElementById("fx_blur").checked;
    const fx_black = document.getElementById("fx_black").checked;
    const fx_rect = document.getElementById("fx_rect").checked;

    console.log("チェック状態:", { fx_mosaic, fx_blur, fx_black, fx_rect });

    // 何もチェックされていない場合は元画像をそのまま表示
    if (!fx_mosaic && !fx_blur && !fx_black && !fx_rect) {
        console.log("何もチェックされていないため、元の画像を表示します");
        
        // ★ ImageDataから復元して表示
        const ctx = canvas.getContext("2d");
        ctx.putImageData(originalImageData, 0, 0);
        
        document.getElementById("status").innerText = "元の画像";
        document.getElementById("download").disabled = false;
        return;
    }

    // ★ 枠線だけの場合は、元画像に枠線を描くだけ
    if (fx_rect && !fx_mosaic && !fx_blur && !fx_black) {
        const ctx = canvas.getContext("2d");
        ctx.putImageData(originalImageData, 0, 0);
        applyRectOnCanvas(canvas, savedFaces);
        
        document.getElementById("status").innerText = "枠線表示";
        document.getElementById("download").disabled = false;
        return;
    }

    const src = originalImage.clone();

    // ★ 保存済みの顔位置を使って加工する
    savedFaces.forEach(f => {
        // 矩形が画像範囲内に収まっているか確認
        const x = Math.max(0, Math.min(f.x, src.cols - 1));
        const y = Math.max(0, Math.min(f.y, src.rows - 1));
        const width = Math.min(f.width, src.cols - x);
        const height = Math.min(f.height, src.rows - y);

        // サイズが有効かチェック
        if (width <= 0 || height <= 0) {
            console.warn("無効な矩形をスキップ:", f);
            return;
        }

        const rect = new cv.Rect(x, y, width, height);

        if (fx_mosaic) applyMosaic(src, rect);
        if (fx_blur) applyBlur(src, rect);
        if (fx_black) applyBlackout(src, rect);
    });

    // Canvas再描画
    cv.imshow(canvas, src);

    // 枠線
    if (fx_rect) applyRectOnCanvas(canvas, savedFaces);

    src.delete();
}

// --- エフェクト処理はそのまま ---
function applyMosaic(mat, rect) {
    const roi = mat.roi(rect);
    const small = new cv.Mat();
    const scale = 0.15;

    const w = Math.max(1, Math.round(rect.width * scale));
    const h = Math.max(1, Math.round(rect.height * scale));

    cv.resize(roi, small, new cv.Size(w, h));
    cv.resize(small, roi, roi.size(), 0, 0, cv.INTER_NEAREST);

    roi.delete();
    small.delete();
}

function applyBlur(mat, rect) {
    const roi = mat.roi(rect);
    cv.GaussianBlur(roi, roi, new cv.Size(25, 25), 0, 0);
    roi.delete();
}

function applyBlackout(mat, rect) {
    cv.rectangle(mat,
        new cv.Point(rect.x, rect.y),
        new cv.Point(rect.x + rect.width, rect.y + rect.height),
        new cv.Scalar(0, 0, 0, 255), -1);
}

function applyRectOnCanvas(canvas, faces) {
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 4;
    ctx.strokeStyle = "red";

    faces.forEach(f => {
        ctx.strokeRect(f.x, f.y, f.width, f.height);
    });
}

function downloadImage() {
    const canvas = document.getElementById("canvas");
    const link = document.createElement("a");
    link.download = "processed.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function printError(err) {
    console.error(err);
    document.getElementById("error").textContent = err;
}
