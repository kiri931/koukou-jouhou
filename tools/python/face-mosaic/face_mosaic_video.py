import cv2
import argparse
import subprocess
import os

def mosaic(frame, x, y, w, h, ratio=0.05):
    h_, w_ = frame.shape[:2]
    x = max(0, x); y = max(0, y)
    w = min(w, w_ - x); h = min(h, h_ - y)

    roi = frame[y:y+h, x:x+w]
    if roi.size == 0:
        return

    small = cv2.resize(roi, (0,0), fx=ratio, fy=ratio)
    frame[y:y+h, x:x+w] = cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)

def detect_faces(frame, net, th=0.5):
    h, w = frame.shape[:2]
    blob = cv2.dnn.blobFromImage(frame, 1.0, (300,300), (104,177,123))
    net.setInput(blob)
    dets = net.forward()

    faces = []
    for i in range(dets.shape[2]):
        conf = dets[0,0,i,2]
        if conf > th:
            x1, y1, x2, y2 = (dets[0,0,i,3:7] * [w,h,w,h]).astype(int)
            faces.append((x1, y1, x2-x1, y2-y1))
    return faces

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--ratio", type=float, default=0.05)
    args = parser.parse_args()

    temp_video = "temp_video_noaudio.mp4"
    raw_audio = "temp_audio.wav"
    vc_audio = "temp_audio_vc.wav"

    # DNNモデル読み込み
    net = cv2.dnn.readNetFromCaffe(
        "deploy.prototxt",
        "res10_300x300_ssd_iter_140000.caffemodel"
    )

    # 映像処理
    cap = cv2.VideoCapture(args.input)
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    out = cv2.VideoWriter(temp_video, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w,h))

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        for (x,y,w_,h_) in detect_faces(frame, net):
            pad = int(h_ * 0.2)
            mosaic(frame, x-pad, y-pad, w_+pad*2, h_+pad*2, args.ratio)

        out.write(frame)

    cap.release()
    out.release()
    print("✔ 映像処理完了。音声抽出へ...")

    # ---- 音声抽出 ----
    subprocess.run(["ffmpeg", "-i", args.input, raw_audio, "-y"])

    # ---- 音声ピッチ変更（声質だけ変えて速度維持）----
    subprocess.run([
        "ffmpeg",
        "-i", raw_audio,
        "-filter:a", "rubberband=pitch=0.85",
        vc_audio,
        "-y"
    ])
    print("🔊 音声を変換（速度完全維持・声質変更）")


    # ---- 映像＋加工済音声 合成 ----
    subprocess.run([
        "ffmpeg",
        "-i", temp_video,
        "-i", vc_audio,
        "-c:v", "copy",
        "-c:a", "aac",
        args.output,
        "-y"
    ])

    # ---- 一時ファイル削除 ----
    os.remove(temp_video)
    os.remove(raw_audio)
    os.remove(vc_audio)

    print(f"🎉 完了！音声変換済 → {args.output}")

if __name__ == "__main__":
    main()
