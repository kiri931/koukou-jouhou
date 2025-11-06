export class SpriteSheetLoader {
  constructor(imagePath, cols, rows) {
    this.image = new Image();
    this.cols = cols;
    this.rows = rows;
    this.loaded = false;

    this.spriteWidth = 0;
    this.spriteHeight = 0;

    this.processedImage = null;  // 透過処理済み画像

    this.image.onload = () => {
      this.spriteWidth = this.image.width / this.cols;
      this.spriteHeight = this.image.height / this.rows;
      console.log(`✅ Image loaded: ${this.image.width}x${this.image.height}`);
      console.log(`🧩 Sprite size: ${this.spriteWidth}x${this.spriteHeight}`);

      // 白背景透過処理
      this.processedImage = this.removeWhiteBackground(this.image);
      this.loaded = true;
    };

    this.image.onerror = () => {
      console.error("❌ Failed to load image:", imagePath);
    };

    this.image.src = imagePath;
  }

  /**
   * 白い背景 (#ffffff) を透明にする
   */
  removeWhiteBackground(img) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = img.width;
    offCanvas.height = img.height;
    const offCtx = offCanvas.getContext("2d");

    offCtx.drawImage(img, 0, 0);
    const imageData = offCtx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // 完全な白 (#ffffff) を透明に
      if (r === 255 && g === 255 && b === 255) {
        data[i + 3] = 0; // alpha = 0
      }
    }

    offCtx.putImageData(imageData, 0, 0);

    // 新しい Image オブジェクトに変換
    const resultImage = new Image();
    resultImage.src = offCanvas.toDataURL();
    return resultImage;
  }

  drawSprite(ctx, spriteIndex, x, y, width, height) {
    this.drawRotatedSprite(ctx, spriteIndex, x, y, width, height, 0);
  }

  drawRotatedSprite(ctx, spriteIndex, x, y, width, height, angleRad) {
    if (!this.loaded || !this.processedImage) {
      console.warn("⏳ Image not loaded yet");
      return;
    }

    const sx = (spriteIndex % this.cols) * this.spriteWidth;
    const sy = Math.floor(spriteIndex / this.cols) * this.spriteHeight;

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(angleRad);
    ctx.drawImage(
      this.processedImage,
      sx, sy, this.spriteWidth, this.spriteHeight,
      -width / 2, -height / 2, width, height
    );
    ctx.restore();
  }
}
