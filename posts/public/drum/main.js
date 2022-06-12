function playSound(e){

 const audio = document.querySelector(`audio[data-key="${e.keyCode}"]`);
 const key = document.querySelector(`.key[data-key="${e.keyCode}"]`);

 if(!audio) return; // if no audio file associated to key, break the function. 

 audio.currentTime = 0; // rewind audio file to start 
 audio.play();
 key.classList.add('playing'); // add the css class 'playing' to the key div to trigger css transition.
}

function removeTransition(e){
	if (e.propertyName !== 'transform') return; // skip this function if the propertyname is not transform
	this.classList.remove('playing'); // if the propertyName === transform, remove the .playing class from the div
}

const keys = document.querySelectorAll('.key');
keys.forEach(key => key.addEventListener('transitionend', removeTransition));

document.addEventListener('keydown', playSound);
