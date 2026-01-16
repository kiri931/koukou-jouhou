window.addEventListener("DOMContentLoaded", async () => {
    const div = document.querySelector(".gen-table");
    if (!div) return;

    // --- 数字を解析 ---
    const numbers = div.textContent.trim().split(/\s+/).map(Number);
    const numLarge = numbers[0];          // 大問の数
    const smallCounts = numbers.slice(1); // 各大問の小問数

    if (smallCounts.length !== numLarge) {
        console.error("大問数と小問数が一致しません");
        return;
    }

    // ======== ▼ 問題テーブル生成 ========
    const tableQ = document.createElement("table");
    tableQ.border = "1";

    for (let L = 1; L <= numLarge; L++) {
        const count = smallCounts[L - 1];
        const problems = [];
        for (let S = 1; S <= count; S++) {
            problems.push(`${L}.${S}`);
        }

        for (let i = 0; i < problems.length; i += 2) {
            const tr = document.createElement("tr");

            const td1 = document.createElement("td");
            td1.textContent = problems[i];
            tr.appendChild(td1);

            const td2 = document.createElement("td");
            td2.textContent = problems[i + 1] ?? "";
            tr.appendChild(td2);

            tableQ.appendChild(tr);
        }

    }



    document.getElementById("output").appendChild(tableQ);

    // =====================================================================
    // ▼ 答えテーブル(ans-output)生成処理
    // =====================================================================
    let answers = {};
    try {
        const res = await fetch("answers.json");
        answers = await res.json();
    } catch (e) {
        console.error("answers.json の読み込み失敗", e);
        return;
    }

    const tableA = document.createElement("table");
    tableA.border = "1";

    for (let L = 1; L <= numLarge; L++) {

        const count = smallCounts[L - 1];
        const ansArray = answers[String(L)] ?? [];
        const rows = [];

        for (let S = 1; S <= count; S++) {
            rows.push({
                no: `${L}.${S}`,
                ans: ansArray[S - 1] ?? ""
            });
        }

        // 2列で入れる
        for (let i = 0; i < rows.length; i += 2) {
            const tr = document.createElement("tr");

            const td1 = document.createElement("td");
            td1.textContent = rows[i].no;
            tr.appendChild(td1);

            const td2 = document.createElement("td");
            td2.textContent = rows[i].ans;
            tr.appendChild(td2);

            const td3 = document.createElement("td");
            td3.textContent = rows[i + 1]?.no ?? "";
            tr.appendChild(td3);

            const td4 = document.createElement("td");
            td4.textContent = rows[i + 1]?.ans ?? "";
            tr.appendChild(td4);

            tableA.appendChild(tr);
        }


    }


    document.getElementById("ans-output").appendChild(tableA);
});
