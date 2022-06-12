let timerMinutes;
let timerSeconds;
let minutes = 24;
let seconds = 59;

let timerCount = 0;
let lastBreak = false;

let isTimerRunning = false;

const timer = document.getElementById('timer');
const timerNumber = document.getElementById('timerNumber');
const timerControls = document.getElementById('timerControls');
const startBtn = document.getElementById('stBtn');
const resetBtn = document.getElementById('resetBtn');
const clockSeconds = document.getElementById('clockSeconds');
const clockMinutes= document.getElementById('clockMinutes');
const audio = document.getElementById('audio');

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', reset);


function startTimer(){
	if (!isTimerRunning){
		// Start Task clicked

		startBtn.textContent = 'Start Break'
		isTimerRunning = true;
		timerCount++;
		timerNumber.textContent = timerCount;
		clockSeconds.textContent = '00';
		clockMinutes.textContent = '25';
		
		clearTimers()

		minutes = 24;
		seconds = 60;

		counter(minutes, seconds);
		timer.classList.remove('break');

	} else if (isTimerRunning) {
		// Start Break clicked

		startBtn.textContent = 'Start Task';
		isTimerRunning = false;

		clearTimers()

		if (timerCount < 4){
			clockSeconds.textContent = '00';
			clockMinutes.textContent = '5';

			minutes = 4;
			seconds = 60;

		} else {
			// last break timer is started
			timerControls.removeChild(startBtn);
			lastBreak = true;
			clockSeconds.textContent = '00';
			clockMinutes.textContent = '15';

			minutes = 24;
			seconds = 60;
		}
		
		counter(minutes, seconds);
		timer.classList.add('break');
	}
}	

function counter(minutes, seconds){

	timerSeconds = setInterval( () =>{
		seconds--;

		if (seconds === -1){
			seconds = 59;
		}

		//console.log(minutes + ':' + seconds);
		clockSeconds.textContent = seconds;
		clockMinutes.textContent = minutes;

		if (lastBreak === true && minutes === 0 && seconds === 0 ){
			// Pomodoro Stopped
			clearTimers()
			playSound();
			
		} else if (minutes === 0 && seconds === 0){
			// current timer ended');
			playSound();
			startTimer();
		}

	}, 1000);

	timerMinutes = setInterval( () =>{
		minutes--;
		clockMinutes.textContent = minutes;
	}, 60000);
}

function clearTimers(){
	clearInterval(timerSeconds);
	clearInterval(timerMinutes);
}

function playSound(){
	audio.play();
}

function reset(){
	// reset button clicked
	clearInterval(timerSeconds);
	clearInterval(timerMinutes);
	timerControls.prepend(startBtn);
	timer.classList.remove('break')

	isTimerRunning = false;
	minutes = 24;
	seconds = 59;
	timerCount = 0;
	startBtn.textContent = 'Start Task';
	clockSeconds.textContent = '00';
	clockMinutes.textContent = '25';
	timerNumber.textContent = timerCount;
}