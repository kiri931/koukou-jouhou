let tccModule = null;

document.getElementById("runBtn").addEventListener("click", async () => {
    const code = document.getElementById("code").value;
    const output = document.getElementById("output");
    output.textContent = "実行中...\n";

    if (!tccModule) {
        output.textContent += "tcc.js をロード中...\n";
        tccModule = await TCC(); // tcc.js が提供する WASM 初期化
    }

    try {
        // C → WASM にコンパイル
        const wasmBytes = tccModule.compile(code);

        // WASM 実行
        const result = await WebAssembly.instantiate(wasmBytes, {
            env: {
                putchar: (c) => {
                    output.textContent += String.fromCharCode(c);
                }
            }
        });

        result.instance.exports.main();
    } catch (err) {
        output.textContent += "\n[エラー]\n" + err;
    }
});
