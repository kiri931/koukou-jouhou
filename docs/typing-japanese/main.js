let problems = [];
let current = "";
let inputText = "";
let correctCount = 0;
let wrongCount = 0;
let log = [];
let startTime = 0;
let duration = 60;
let timerInterval;

const problemElement = document.getElementById("problem");
const inputArea = document.getElementById("inputArea");
const timerElement = document.getElementById("timer");
const statsElement = document.getElementById("stats");

document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("download").addEventListener("click", downloadLog);
document.getElementById("loadFile").addEventListener("change", loadLogFile);

let currentIndex = 0;
let userInput = "";

function startGame() {
    duration = parseInt(document.getElementById("duration").value) || 60;
    const difficulty = document.getElementById("difficulty").value;
  
    fetch(`problems/${difficulty}.json`)
      .then(res => res.json())
      .then(data => {
        problems = shuffleArray(data).slice(0, 50); // 🔁 ランダムに50問だけ抽出
        initGame();
      });
  }
  

function initGame() {
  document.getElementById("home").style.display = "none";
  document.getElementById("game").style.display = "block";

  correctCount = 0;
  wrongCount = 0;
  currentIndex = 0;
  userInput = "";
  log = [];

  startTime = Date.now();
  nextProblem();
  timerInterval = setInterval(updateTimer, 100);
}

function nextProblem() {
  if (currentIndex >= problems.length) {
    finishGame();
    return;
  }

  current = problems[currentIndex++];
  userInput = "";
  problemElement.textContent = current.question;
  inputArea.textContent = "";
}

  
  
  function updateTimer() {
    const timeLeft = duration - Math.floor((Date.now() - startTime) / 1000);
    timerElement.textContent = `残り時間: ${timeLeft}秒`;
    if (timeLeft <= 0) finishGame();
  }
  
  function finishGame() {
    clearInterval(timerInterval);
    document.getElementById("game").style.display = "none";
    document.getElementById("result").style.display = "block";
  
    const accuracy = ((correctCount / (correctCount + wrongCount)) * 100 || 0).toFixed(2);
    statsElement.innerHTML = `
      正解数: ${correctCount}<br>
      ミス数: ${wrongCount}<br>
      正確率: ${accuracy}%
    `;
  }
  
  function downloadLog() {
    const name = document.getElementById("userName").value.trim();
    const data = {
      name,
      correctCount,
      wrongCount,
      accuracy: ((correctCount / (correctCount + wrongCount)) * 100 || 0).toFixed(2),
      log
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typing_result_${name || "noname"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  
  function loadLogFile(event) {
    const file = event.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = JSON.parse(e.target.result);
      alert(`記録読み込み成功\n正解: ${data.correctCount}\nミス: ${data.wrongCount}\n正確率: ${data.accuracy}%`);
    };
    reader.readAsText(file);
  }document.addEventListener("keydown", (e) => {
    if (!current || !document.getElementById("game").style.display.includes('block')) return;
    const key = e.key;
  
    if (key.length !== 1) return;
  
    userInput += key;
  
    const isCorrectSoFar = current.answers.some(ans => ans.startsWith(userInput));
    log.push({
      time: Date.now() - startTime,
      key,
      expected: current.answers[0][userInput.length - 1],
      correct: isCorrectSoFar
    });
  
    if (!isCorrectSoFar) {
      wrongCount++;
      userInput = userInput.slice(0, -1);
      return;
    }
  
    inputArea.textContent = userInput;
  
    if (current.answers.includes(userInput)) {
      correctCount++;
      nextProblem();
    }
  });
  
  function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  

  document.getElementById("loadProblemFile").addEventListener("change", (event) => {
    duration = parseInt(document.getElementById("duration").value) || 60;
    const file = event.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        problems = shuffleArray(JSON.parse(e.target.result)).slice(0, 50); // ← JSONとして読み込み
        initGame(); // ← 通常通りゲームを始める
      } catch (err) {
        alert("JSONの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
  });
  