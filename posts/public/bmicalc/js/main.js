function main(){

	let metricTab = document.getElementById('metric-tab');
	let metricTabContent = document.getElementById('metric-tab-content')
	let imperialTab = document.getElementById('imperial-tab');
	let imperialTabContent = document.getElementById('imperial-tab-content');

	let lengthInput = document.querySelectorAll('.length');
	let weightInput = document.querySelectorAll('.weight');

	let bmiOutput = document.getElementById('bmi');
	let progressBar = document.getElementById('progressbar');
	let status = document.getElementById('status');

	let lengthValue = 0;
	let weightValue = 0;
	let bmiValue = 0;
	bmiOutput.textContent = 0;

	metricTab.addEventListener('click', event =>{
		metricTabContent.classList.add('active', 'show');
		metricTabContent.classList.remove('fade');
		imperialTabContent.classList.remove('active', 'show');
		resetInput();
	});

	imperialTab.addEventListener('click', event =>{
		imperialTabContent.classList.add('active', 'show');
		imperialTabContent.classList.remove('fade');
		metricTabContent.classList.remove('active', 'show');
		resetInput();
	});

	lengthInput.forEach((lengthInput) =>{
		lengthInput.addEventListener('input', event =>{
			weightInput.forEach((weightInput) =>{
				weightInput.addEventListener('input', event =>{
					lengthValue = lengthInput.value;
					weightValue = weightInput.value; 

					if (weightInput.id === 'weightMetric'){
						bmiValue = calcMetric();
						output();

					} else if (weightInput.id === 'weightImperial'){
						bmiValue = calcImperial();
						output();
					}
				})
			})

			lengthValue = lengthInput.value;

			if (lengthValue == '' || lengthValue == 0 || weightValue == '' || weightValue == 0){
				bmiOutput.textContent = '0'
				status.style.visibility = 'hidden';
				progressBar.style.width = '0%';
				return;
			}

			if (lengthInput.id === 'lengthMetric'){
				bmiValue = calcMetric();
				output();

			} else if (lengthInput.id === 'lengthImperial'){
				bmiValue = calcImperial();
				output();
			}
			
		})	
	})	


	function calcMetric(){
		return weightValue / Math.pow((lengthValue / 100), 2);
	}

	function calcImperial(){
		return (weightValue / Math.pow(lengthValue, 2) * 703);
	}

	function resetInput(){
		let inputField = document.querySelectorAll('.inputField');
		
		inputField.forEach((inputField) =>{
			inputField.reset();
		})

		lengthValue = 0;
		weightValue = 0;
		bmiOutput.textContent = 0;
		progressBar.style.width = '0%';
		status.style.visibility = 'hidden';
	}
			
	function output(){

		bmiOutput.textContent = Math.round(bmiValue * 100) / 100;
		status.style.visibility = 'visible';

		if (bmiValue < 18.5){
			status.textContent = 'Underweight';
			progressBar.style.width = '25%';
			progressBar.classList.add('bg-warning');
			progressBar.classList.remove('bg-success');
			progressBar.classList.remove('bg-danger');
		} else if (bmiValue >= 18.5 && bmiValue <= 24.9){
			status.textContent = 'Normal weight';
			progressBar.style.width = '50%';
			progressBar.classList.add('bg-success');
			progressBar.classList.remove('bg-warning');
			progressBar.classList.remove('bg-danger');
		} else if (bmiValue > 24.9 && bmiValue <= 29.9){
			status.textContent = 'Overweight';
			progressBar.style.width = '75%';
			progressBar.classList.add('bg-danger');
			progressBar.classList.remove('bg-success');
			progressBar.classList.remove('bg-warning');
		} else if (bmiValue >= 30){
			status.textContent = 'Obesity';
			progressBar.style.width = '100%';
			progressBar.classList.add('bg-danger');
			progressBar.classList.remove('bg-success');
			progressBar.classList.remove('bg-warning');
		}
	}
}

main();