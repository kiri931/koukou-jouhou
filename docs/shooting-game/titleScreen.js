export class TitleScreen {
  constructor(ctx, buttons) {
    this.ctx = ctx;
    this.buttons = buttons;
    this.selectedIndex = 0;
  }

  draw() {
    this.ctx.fillStyle = "white";
    this.ctx.font = "28px sans-serif";
    this.ctx.fillText("NEO STAR BATTLE", 80, 150);  // 位置は自由に調整

    this.ctx.font = "20px sans-serif";
    this.buttons.forEach((label, index) => {
      this.ctx.fillStyle = index === this.selectedIndex ? "yellow" : "white";
      const prefix = index === this.selectedIndex ? "> " : "  ";
      this.ctx.fillText(`${prefix}${label}`, 130, 250 + index * 40);
    });
  }

  handleKeyDown(e) {
    if (e.code === "ArrowUp") {
      this.selectedIndex = (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length;
    } else if (e.code === "ArrowDown") {
      this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
    } else if (e.code === "Enter") {
      return this.buttons[this.selectedIndex];
    }
    return null;
  }
}
