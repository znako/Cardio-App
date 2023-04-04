'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');
const btnDeleteAll = document.querySelector('.btn__delete--all');
const btnSort = document.querySelector('.workout__btn--sort');

class Workout {
  date = new Date();
  //   id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration, id = 0) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;

    this.id = id || (Date.now() + '').slice(-10);
  }

  _setDesciption() {
    this.descpription = `${
      this.type === 'running' ? 'Пробежка' : 'Велотренировка'
    } ${new Intl.DateTimeFormat('ru-Ru').format(this.date)}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, temp, id = 0) {
    super(coords, distance, duration, id);
    this.temp = temp;
    this.calculatePace();
    this._setDesciption();
  }

  calculatePace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, climb, id = 0) {
    super(coords, distance, duration, id);
    this.climb = climb;
    this.calculateSpeed();
    this._setDesciption();
  }
  calculateSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #isSorted = false;

  constructor() {
    this._getPosition();

    // Получение данных из local storage
    this._getLocalStorageData();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleClimbField.bind(this));

    containerWorkouts.addEventListener(
      'click',
      this._clickOnWorkout.bind(this)
    );

    btnDeleteAll.addEventListener('click', this._reset);

    btnSort.addEventListener('click', this._sort.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Невозможно получить ваше местоположение');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);

    // Обработка клика на карте
    this.#map.on('click', this._showForm.bind(this));

    // Отображение на карте из local storage
    this.#workouts.forEach(workout => {
      this._displayWorkout(workout);
    });
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    form.classList.add('hidden');
  }
  _toggleClimbField() {
    inputClimb.closest('.form__row').classList.toggle('form__row--hidden');
    inputTemp.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const areNumbers = (...numbers) =>
      numbers.every(num => Number.isFinite(num));
    const arePositive = (...numbers) => numbers.every(num => num > 0);

    e.preventDefault();

    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    let workout;
    // Получить данные из формы
    const workoutType = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // Создать соответствующий объект тренировки
    if (workoutType === 'running') {
      const temp = +inputTemp.value;
      // Валидация данных
      if (
        !areNumbers(distance, duration, temp) ||
        !arePositive(distance, duration, temp)
      )
        return alert('Введите положительное число!');

      workout = new Running(coords, distance, duration, temp);
    }
    if (workoutType === 'cycling') {
      const climb = +inputClimb.value;
      // Валидация данных
      if (
        !areNumbers(distance, duration, climb) ||
        !arePositive(distance, duration)
      )
        return alert('Введите положительно е число!');
      workout = new Cycling(coords, distance, duration, climb);
    }

    // Добавить объект в массив
    this.#workouts.push(workout);
    // Отобразить на карте
    this._displayWorkout(workout);
    // Отобразить в списке
    this._displayWorkoutInSidebar(workout);
    // Спрятать форму и Очистка полей ввода данных
    this._hideForm();
    inputDistance.value =
      inputDuration.value =
      inputTemp.value =
      inputClimb.value =
        '';

    // Добавить в local storage
    this._addToLocalStorage();
    btnSort.style.opacity = 1;
  }

  _displayWorkout(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚵‍♂️'} ${workout.descpription}`
      )
      .openPopup();
  }

  _displayWorkoutInSidebar(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${
            workout.descpription
          } <span class="workout__btn--delete">❌ </span> </h2> 
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚵‍♂️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">км</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">мин</span>
          </div>
    `;
    if (workout.type === 'running') {
      html += `
            <div class="workout__details">
                <span class="workout__icon">📏⏱</span>
                <span class="workout__value">${workout.pace.toFixed(2)}</span>
                <span class="workout__unit">мин/км</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">👟⏱</span>
                <span class="workout__value">${workout.temp}</span>
                <span class="workout__unit">шаг/мин</span>
            </div>
          </li>
        `;
    }
    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details">
                <span class="workout__icon">📏⏱</span>
                <span class="workout__value">${workout.speed.toFixed(2)}</span>
                <span class="workout__unit">км/ч</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🏔</span>
                <span class="workout__value">${workout.climb}</span>
                <span class="workout__unit">м</span>
            </div>
          </li>
          `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _clickOnWorkout(e) {
    const workoutElement = e.target.closest('.workout');

    if (!workoutElement) return;

    if (e.target.classList[0] === 'workout__btn--delete') {
      this._deleteWorkout(workoutElement);
      return location.reload();
    }
    this._moveToWorkout(workoutElement);
  }

  _moveToWorkout(workoutElement) {
    const workout = this.#workouts.find(
      workout => workout.id === workoutElement.dataset.id
    );
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _deleteWorkout(clickedWorkout) {
    const data = JSON.parse(localStorage.getItem('workouts'));

    const filteredData = data.filter(
      workout => workout.id !== clickedWorkout.dataset.id
    );

    localStorage.setItem('workouts', JSON.stringify(filteredData));
  }

  _addToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data.map(workout => {
      // привязка к классу
      if (workout.type === 'running') {
        const newWorkout = new Running(
          workout.coords,
          workout.distance,
          workout.duration,
          workout.temp,
          workout.id
        );
        return newWorkout;
      }
      if (workout.type === 'cycling') {
        const newWorkout = new Cycling(
          workout.coords,
          workout.distance,
          workout.duration,
          workout.climb,
          workout.id
        );
        return newWorkout;
      }
    });

    this.#workouts.forEach(workout => {
      this._displayWorkoutInSidebar(workout);
    });

    btnSort.style.opacity = 1;
  }

  _sort() {
    this.#isSorted = !this.#isSorted;

    const sortedWorkouts = this.#isSorted
      ? this.#workouts.slice().sort((y, x) => x.distance - y.distance)
      : this.#workouts;

    document
      .querySelectorAll('.workout')
      .forEach(workout => (workout.outerHTML = ''));

    sortedWorkouts.forEach(workout => this._displayWorkoutInSidebar(workout));
  }

  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
