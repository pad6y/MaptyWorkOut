'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._setDescription();
    this.calcPace();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this._setDescription();
    this.calcSpeed();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycle1);
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btn = document.querySelector('.btn');

class App {
  #map;
  #mapEvent;
  #mapZoomLvl = 15;
  #workouts = [];

  constructor() {
    // Get users position on app load
    this._getPosition();

    // Get saved workouts from local localStorage
    this._getLocalStorage();

    // Attach event handlers on app load
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    btn.addEventListener('click', this._resetApp.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get current position');
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLvl);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handle click on map
    this.#map.on('click', this._showForm.bind(this));

    //Load markers if workouts array has data
    if (this.#workouts.length > 0) {
      this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
      btn.classList.remove('btn--hidden');
    }
  }

  _showForm(mapEvt) {
    this.#mapEvent = mapEvt;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Clear inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    //Hide input form
    form.style.display = 'none';
    form.classList.add('hidden');

    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validateInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    const { lat, lng } = this.#mapEvent.latlng;
    // Get data from form
    const coords = [lat, lng];
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    let workout;
    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence) ||
        // distance <= 0 ||
        // duration <= 0
        !validateInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running(coords, distance, duration, cadence);
    }

    // If workout cycling, create running object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validateInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling(coords, distance, duration, elevation);
    }

    // Add new Object to workout array
    this.#workouts.push(workout);
    btn.classList.remove('btn--hidden');
    // Render workout on map as marker
    // Display Marker
    this._renderWorkoutMarker(workout);

    // Render workout to list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workout
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    const buttons = `<button class="btn btn_edit">Edit</button>
    <button class="btn btn_del">Del</button>`;

    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
          </div>
          ${buttons}
      </li>
    `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(2)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
          </div>
          ${buttons}
      </li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    if (!this.#map) return;
    // console.log(e.target.matches('.btn_edit'));
    // console.log(e.target.closest('.workout').dataset.id);
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLvl, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // console.log(this.#workouts);
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    if (!localStorage.getItem('workouts')) return;

    //reassign prototypes back to objects taken from localstorage
    this.#workouts = JSON.parse(localStorage.getItem('workouts')).map(
      workout => {
        if (workout.type === 'running')
          return Object.assign(new Running(), workout);
        if (workout.type === 'cycling')
          return Object.assign(new Cycling(), workout);
      }
    );

    console.log(this.#workouts);
    // Render workouts
    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }

  _editWorkout(e) {
    if (!e.target.matches('.btn_edit')) return;
    e.preventDefault();

    form.classList.remove('hidden');

    const checkTypePopulate = (el, value) => {
      if (el.closest('.form__row').classList.contains('form__row--hidden'))
        this._toggleElevationField();

      el.value = value;
    };

    const workoutid = e.target.closest('.workout').dataset.id;
    this.#workouts.forEach((workout, index) => {
      if (workout.id !== workoutid) return;
      //populate fields
      inputType.value = this.#workouts[index].type;
      inputDistance.value = this.#workouts[index].distance;
      inputDuration.value = this.#workouts[index].duration;

      //check type before populate and toggle fields
      if (this.#workouts[index].type === 'running') {
        checkTypePopulate(inputCadence, this.#workouts[index].cadence);
      }

      if (this.#workouts[index].type === 'cycling') {
        checkTypePopulate(inputElevation, this.#workouts[index].elevationGain);
      }

      // Disable type field and focus on distance input field
      inputDistance.focus();
      inputType.setAttribute('disabled', true);

      this._updateWorkout(index);
    });
  }

  _updateWorkout(index) {
    form.addEventListener(
      'submit',
      e => {
        e.preventDefault();
        e.stopPropagation();

        // pre populate fields
        this.#workouts[index].type = inputType.value;
        this.#workouts[index].distance = +inputDistance.value;
        this.#workouts[index].duration = +inputDuration.value;

        if (this.#workouts[index].type === 'running')
          this.#workouts[index].cadence = +inputCadence.value;

        if (this.#workouts[index].type === 'cycling')
          this.#workouts[index].elevationGain = +inputElevation.value;

        form.classList.add('hidden');

        // update local storage and reload
        this._setLocalStorage();
        location.reload();
      },
      true
    );
  }

  _deleteWorkout(e) {
    if (!e.target.matches('.btn_del')) return;

    const workoutId = e.target.closest('.workout').dataset.id;

    this.#workouts = this.#workouts.filter(workout => workout.id !== workoutId);
    this._setLocalStorage();
    location.reload();
    // console.log(this.#workouts);
  }

  _resetApp() {
    localStorage.removeItem('workouts');
    this.#workouts = [];
    btn.classList.add('btn--hidden');
    location.reload();
  }
}

const app = new App();
